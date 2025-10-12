/**
 * Tuzi Midjourney Adapters
 *
 * Implements native Midjourney imagine/video requests via Tuzi API.
 * Logs完整响应以便确认返回结构，后续可进一步完善解析。
 */

import type { AxiosInstance } from 'axios'
import { BaseAdapter } from './base-adapter'
import type {
  UnifiedGenerationRequest,
  AdapterResponse,
  GenerationResult,
  TaskStatusResponse,
} from './types'
import {
  TuziMidjourneyImagineRequestSchema,
  TuziMidjourneyVideoRequestSchema,
} from './validation'
import type { z } from 'zod'

type MidjourneyResultType = 'image' | 'video'

interface NormalizedTaskResult {
  status: 'SUCCESS' | 'PROCESSING' | 'FAILED'
  outputs: string[]
  error?: string
}

abstract class TuziMidjourneyBaseAdapter extends BaseAdapter {
  protected abstract getResultType(): MidjourneyResultType

  protected getValidationSchema(): z.ZodSchema | null {
    return null
  }

  protected getHttpClient(): AxiosInstance {
    const client = super.getHttpClient()

    // Tuzi Midjourney 接口示例使用的是裸 key，不带 Bearer 前缀。
    if (this.sourceInfo.encryptedAuthKey) {
      client.defaults.headers['Authorization'] = this.sourceInfo.encryptedAuthKey
    }
    client.defaults.baseURL = this.sourceInfo.apiEndpoint.replace(/\/$/, '')
    client.defaults.headers['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
    client.defaults.timeout = 600000 // 10 分钟

    return client
  }

  protected getSubmitPath(): string {
    return ''
  }

  protected sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const cloned = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>

    const base64Array = cloned['base64Array']

    if (Array.isArray(base64Array)) {
      cloned['base64Array'] = base64Array.map((item: unknown) => {
        if (typeof item === 'string') {
          return { length: item.length }
        }
        return item
      })
    }

    return cloned
  }

  protected buildSubmitPayload(
    request: UnifiedGenerationRequest
  ): Record<string, unknown> {
    return { prompt: request.prompt }
  }

  protected extractTaskId(responseData: any): string | null {
    if (!responseData || typeof responseData !== 'object') {
      return null
    }

    const candidates = [
      responseData.taskId,
      responseData.task_id,
      responseData.result,
      responseData.data?.taskId,
      responseData.data?.task_id,
      responseData.data?.result,
    ]

    const taskId = candidates.find((value) => typeof value === 'string' && value.trim().length > 0)

    return taskId ? (taskId as string) : null
  }

  protected async fetchTaskResultRaw(taskId: string): Promise<any> {
    const fetchPath = `/mj/task/${taskId}/fetch`
    const response = await this.httpClient.get(fetchPath)

    this.logger.info(
      { taskId, rawResponse: response.data },
      'Tuzi Midjourney task fetch response'
    )

    return response.data
  }

  protected normalizeTaskResult(raw: any): NormalizedTaskResult {
    const status = this.resolveStatus(raw)
    const outputs = this.extractMediaOutputs(raw)
    const errorMessage = this.extractError(raw)

    if (status === 'FAILED') {
      return {
        status: 'FAILED',
        outputs: [],
        error: errorMessage || 'Midjourney 任务失败',
      }
    }

    if (outputs.length > 0 && (status === 'SUCCESS' || status === 'PROCESSING')) {
      // 有结果就优先返回 SUCCESS，后续根据真实结构再调整。
      return {
        status: 'SUCCESS',
        outputs,
      }
    }

    if (status === 'SUCCESS') {
      return {
        status: 'FAILED',
        outputs: [],
        error: errorMessage || '任务完成但未找到可用结果',
      }
    }

    return {
      status: 'PROCESSING',
      outputs: [],
      error: errorMessage,
    }
  }

  private resolveStatus(raw: any): 'SUCCESS' | 'PROCESSING' | 'FAILED' {
    const candidates: unknown[] = []

    const collect = (value: unknown) => {
      if (value !== undefined && value !== null) {
        candidates.push(value)
      }
    }

    collect(raw?.status)
    collect(raw?.state)
    collect(raw?.taskStatus)
    collect(raw?.task_status)
    collect(raw?.task_state)
    collect(raw?.progress?.status)
    collect(raw?.data?.status)
    collect(raw?.data?.state)
    collect(raw?.data?.task_status)
    collect(raw?.data?.taskStatus)
    collect(raw?.result?.status)
    collect(raw?.task?.status)
    collect(raw?.task?.state)
    collect(raw?.info?.status)

    const normalized = candidates
      .map((item) => (typeof item === 'string' ? item : String(item)))
      .map((item) => item.trim().toLowerCase())
      .find((item) => item.length > 0)

    if (normalized) {
      const successValues = ['success', 'succeeded', 'finished', 'completed', 'done', 'ok']
      const processingValues = [
        'pending',
        'processing',
        'running',
        'queued',
        'in_progress',
        'submitted',
        'waiting',
      ]
      const failedValues = ['failed', 'error', 'timeout', 'canceled', 'cancelled', 'rejected']

      if (successValues.includes(normalized)) {
        return 'SUCCESS'
      }
      if (failedValues.includes(normalized)) {
        return 'FAILED'
      }
      if (processingValues.includes(normalized)) {
        return 'PROCESSING'
      }
    }

    // 再看 code 字段
    const code = raw?.code ?? raw?.statusCode ?? raw?.status_code ?? raw?.retcode
    if (typeof code === 'number') {
      if (code === 1 || code === 0 || code === 200) {
        return 'SUCCESS'
      }
      if (code < 0) {
        return 'FAILED'
      }
    }

    return 'PROCESSING'
  }

  private extractMediaOutputs(raw: any): string[] {
    const outputs = new Set<string>()

    const collect = (value: unknown) => {
      if (typeof value !== 'string') return
      const trimmed = value.trim()
      if (/^https?:\/\//i.test(trimmed)) {
        outputs.add(trimmed)
      }
      if (/^data:(image|video)\//i.test(trimmed)) {
        outputs.add(trimmed)
      }
    }

    const traverse = (value: unknown) => {
      if (!value) return

      if (typeof value === 'string') {
        collect(value)
      } else if (Array.isArray(value)) {
        value.forEach(traverse)
      } else if (typeof value === 'object') {
        Object.values(value).forEach(traverse)
      }
    }

    traverse(raw)

    return Array.from(outputs)
  }

  private extractError(raw: any): string | undefined {
    const candidates = [
      raw?.description,
      raw?.message,
      raw?.msg,
      raw?.error,
      raw?.errorMessage,
      raw?.status_msg,
      raw?.data?.message,
      raw?.data?.error,
      raw?.data?.status_msg,
    ]

    return candidates
      .map((item) => (typeof item === 'string' ? item.trim() : null))
      .find((item) => item && item.length > 0) || undefined
  }

  protected async checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const raw = await this.fetchTaskResultRaw(taskId)
      const normalized = this.normalizeTaskResult(raw)

      if (normalized.status === 'SUCCESS') {
        return {
          status: 'SUCCESS',
          output: normalized.outputs,
        }
      }

      if (normalized.status === 'FAILED') {
        return {
          status: 'FAILED',
          error: normalized.error || 'Midjourney 任务失败',
        }
      }

      return {
        status: 'PROCESSING',
      }
    } catch (error) {
      this.logger.error({ taskId, error }, 'Failed to fetch Midjourney task status')
      return {
        status: 'PROCESSING',
      }
    }
  }

  protected async handleSuccessOutputs(
    urls: string[]
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = []
    const resultType = this.getResultType()

    for (const url of urls) {
      try {
        let finalUrl = url

        if (/^https?:\/\//i.test(url)) {
          const contentType = resultType === 'video' ? 'video/mp4' : 'image/png'
          finalUrl = await this.downloadAndUploadToS3(url, contentType)
        } else if (this.sourceInfo.uploadToS3 && url.startsWith('data:image/')) {
          finalUrl = await this.uploadBase64ToS3(url, this.sourceInfo.s3PathPrefix || undefined)
        }

        results.push({
          type: resultType,
          url: finalUrl,
        })
      } catch (error) {
        this.logger.error({ url, error }, 'Failed to process Midjourney output URL')
      }
    }

    if (results.length === 0 && urls.length > 0) {
      // 如果全部上传失败，至少返回原始链接
      urls.forEach((url) => {
        results.push({
          type: resultType,
          url,
        })
      })
    }

    return results
  }
}

export class TuziMidjourneyImagineAdapter extends TuziMidjourneyBaseAdapter {
  protected getValidationSchema(): z.ZodSchema | null {
    return TuziMidjourneyImagineRequestSchema
  }

  protected getResultType(): MidjourneyResultType {
    return 'image'
  }

  protected getSubmitPath(): string {
    return '/mj/submit/imagine'
  }

  protected buildSubmitPayload(request: UnifiedGenerationRequest): Record<string, unknown> {
    const validated = this.validateRequest(request)
    const parameters = validated.parameters || {}

    const payload: Record<string, unknown> = {
      prompt: validated.prompt,
      botType: parameters.botType ?? 'MID_JOURNEY',
      notifyHook: parameters.notifyHook,
      noStorage: parameters.noStorage ?? false,
      accountFilter: parameters.accountFilter,
      state: parameters.state,
    }

    if (parameters.base64Array) {
      payload['base64Array'] = parameters.base64Array
    }

    // 如果参数里没提供 base64Array，尝试从 input_images 中抽取 data URI。
    if (
      !payload['base64Array'] &&
      validated.input_images &&
      validated.input_images.length > 0
    ) {
      const pureBase64 = validated.input_images
        .map((image) => {
          const match = image.match(/^data:image\/\w+;base64,(.*)$/)
          if (match && match[1]) {
            return match[1]
          }
          return null
        })
        .filter((item): item is string => Boolean(item))

      if (pureBase64.length > 0) {
        payload['base64Array'] = pureBase64
      }
    }

    // 清理 undefined
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key]
      }
    })

    return payload
  }

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    try {
      const payload = this.buildSubmitPayload(request)

      this.logger.info(
        { payload: this.sanitizePayload(payload) },
        'Submitting Tuzi Midjourney imagine task'
      )

      const response = await this.httpClient.post(this.getSubmitPath(), payload)

      this.logger.info(
        { response: response.data },
        'Tuzi Midjourney imagine submit response'
      )

      const taskId = this.extractTaskId(response.data)

      if (!taskId) {
        return {
          status: 'ERROR',
          message: '未获取到 Midjourney imagine 任务 ID',
        }
      }

      const pollResult = await this.pollTaskUntilComplete(taskId, {
        maxDuration: 900, // 15 分钟
        pollInterval: 20000,
      })

      if (pollResult.status === 'SUCCESS' && pollResult.output && pollResult.output.length > 0) {
        const results = await this.handleSuccessOutputs(pollResult.output)

        if (results.length === 0) {
          return {
            status: 'ERROR',
            message: '任务成功但未能处理任何结果链接',
          }
        }

        return {
          status: 'SUCCESS',
          results,
        }
      }

      if (pollResult.status === 'PROCESSING') {
        return {
          status: 'PROCESSING',
          task_id: taskId,
          message: 'Midjourney imagine 任务正在执行中',
        }
      }

      return {
        status: 'ERROR',
        message: pollResult.error || 'Midjourney imagine 任务失败',
      }
    } catch (error) {
      return this.handleError(error, 'Tuzi Midjourney imagine')
    }
  }
}

export class TuziMidjourneyVideoAdapter extends TuziMidjourneyBaseAdapter {
  protected getValidationSchema(): z.ZodSchema | null {
    return TuziMidjourneyVideoRequestSchema
  }

  protected getResultType(): MidjourneyResultType {
    return 'video'
  }

  protected getSubmitPath(): string {
    return '/mj/submit/video'
  }

  protected buildSubmitPayload(request: UnifiedGenerationRequest): Record<string, unknown> {
    const validated = this.validateRequest(request)
    const parameters = validated.parameters || {}

    const payload: Record<string, unknown> = {
      prompt: validated.prompt,
      videoType: parameters.videoType ?? 'vid_1.1_i2v_720',
      motion: parameters.motion ?? 'low',
      image: parameters.image ?? validated.input_images?.[0],
      endImage: parameters.endImage,
      loop: parameters.loop ?? false,
      batchSize: parameters.batchSize ?? 4,
      action: parameters.action,
      index: parameters.index,
      taskId: parameters.taskId,
      state: parameters.state,
      notifyHook: parameters.notifyHook,
      noStorage: parameters.noStorage ?? false,
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key]
      }
    })

    return payload
  }

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    try {
      const payload = this.buildSubmitPayload(request)

      this.logger.info(
        { payload: this.sanitizePayload(payload) },
        'Submitting Tuzi Midjourney video task'
      )

      const response = await this.httpClient.post(this.getSubmitPath(), payload)

      this.logger.info(
        { response: response.data },
        'Tuzi Midjourney video submit response'
      )

      const taskId = this.extractTaskId(response.data)

      if (!taskId) {
        return {
          status: 'ERROR',
          message: '未获取到 Midjourney video 任务 ID',
        }
      }

      const pollResult = await this.pollTaskUntilComplete(taskId, {
        maxDuration: 1200, // 20 分钟
        pollInterval: 30000,
      })

      if (pollResult.status === 'SUCCESS' && pollResult.output && pollResult.output.length > 0) {
        const results = await this.handleSuccessOutputs(pollResult.output)

        if (results.length === 0) {
          return {
            status: 'ERROR',
            message: '任务成功但未能处理任何视频链接',
          }
        }

        return {
          status: 'SUCCESS',
          results,
        }
      }

      if (pollResult.status === 'PROCESSING') {
        return {
          status: 'PROCESSING',
          task_id: taskId,
          message: 'Midjourney video 任务正在执行中',
        }
      }

      return {
        status: 'ERROR',
        message: pollResult.error || 'Midjourney video 任务失败',
      }
    } catch (error) {
      return this.handleError(error, 'Tuzi Midjourney video')
    }
  }
}
