/**
 * KieKlingV25TurboI2VProAdapter - Kie.ai Kling v2.5 Turbo Image to Video Pro
 *
 * 对应模型: kie-kling-v2-5-turbo-i2v-pro
 * 功能: 图生视频（v2.5 Turbo Pro，快速生成，专业质量）
 *
 * API文档: https://api.kie.ai/api/v1/jobs/createTask
 * 定价: 5秒视频 42 credits ($0.21), 10秒视频 84 credits ($0.42)
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieCreateTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieTaskStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    model: string
    state: 'waiting' | 'queueing' | 'generating' | 'success' | 'fail'
    param: string
    resultJson: string | null
    failCode: string | null
    failMsg: string | null
    costTime: number | null
    completeTime: number | null
    createTime: number
  }
}

interface KieResultJson {
  resultUrls: string[]
}

export class KieKlingV25TurboI2VProAdapter extends BaseAdapter {
  /**
   * 调度生成请求
   */
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    try {
      const apiKey = this.getApiKey()
      if (!apiKey) {
        return {
          status: 'ERROR',
          message: 'Missing API key for Kie.ai',
          error: {
            code: 'MISSING_API_KEY',
            message: 'API key is required',
            isRetryable: false,
          },
        }
      }

      // 验证必填参数: prompt
      if (!request.prompt) {
        return {
          status: 'ERROR',
          message: 'Missing required parameter: prompt',
          error: {
            code: 'MISSING_PARAMETER',
            message: 'prompt is required',
            isRetryable: false,
          },
        }
      }

      // 验证必填参数: image_url
      if (!request.inputImages || request.inputImages.length === 0) {
        return {
          status: 'ERROR',
          message: 'Missing required parameter: image_url',
          error: {
            code: 'MISSING_PARAMETER',
            message: 'At least one input image is required for image-to-video',
            isRetryable: false,
          },
        }
      }

      // 构建 input 对象
      const input: Record<string, unknown> = {
        prompt: request.prompt,
        image_url: request.inputImages[0], // 使用第一张图片
      }

      // 可选参数: duration (必须是字符串 "5" 或 "10")
      if (request.parameters?.duration) {
        const duration = request.parameters.duration
        // 确保是字符串类型，且是有效值
        const durationStr = String(duration)
        if (durationStr === '5' || durationStr === '10') {
          input.duration = durationStr
        } else {
          // 如果不是有效值，使用默认值
          input.duration = '5'
          this.log('warn', `Invalid duration value: ${duration}, using default: 5`)
        }
      }

      // 可选参数: negative_prompt
      if (request.parameters?.negative_prompt) {
        input.negative_prompt = request.parameters.negative_prompt
      }

      // 可选参数: cfg_scale (0-1)
      if (request.parameters?.cfg_scale !== undefined) {
        const cfgScale = Number(request.parameters.cfg_scale)
        if (!isNaN(cfgScale)) {
          input.cfg_scale = cfgScale
        }
      }

      // 构建完整请求体
      const payload: Record<string, unknown> = {
        model: 'kling/v2-5-turbo-image-to-video-pro',
        input,
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Kling v2.5 Turbo I2V Pro task', payload)

      // 发送请求
      const apiEndpoint = this.getApiEndpoint() || 'https://api.kie.ai'
      const fullUrl = `${apiEndpoint}/api/v1/jobs/createTask`

      const response = await this.post<KieCreateTaskResponse>(
        fullUrl,
        payload,
        {
          headers: this.getAuthHeaders(apiKey),
        }
      )

      const { code, msg, data } = response

      if (code !== 200 || !data?.taskId) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to create task',
          error: {
            code: 'TASK_CREATION_FAILED',
            message: msg,
            isRetryable: true,
          },
        }
      }

      this.log('info', `Kling v2.5 Turbo I2V Pro task created: ${data.taskId}`)

      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Video generation in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Kling v2.5 Turbo I2V Pro dispatch failed', error)

      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: {
          code: 'DISPATCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }

  /**
   * 检查任务状态
   */
  async checkTaskStatus(taskId: string): Promise<AdapterResponse> {
    try {
      const apiKey = this.getApiKey()
      const apiEndpoint = this.getApiEndpoint() || 'https://api.kie.ai'
      const fullUrl = `${apiEndpoint}/api/v1/jobs/recordInfo?taskId=${taskId}`

      const response = await this.get<KieTaskStatusResponse>(
        fullUrl,
        {
          headers: this.getAuthHeaders(apiKey),
        }
      )

      const { code, msg, data } = response

      if (code !== 200 || !data) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to fetch task status',
          providerTaskId: taskId,
        }
      }

      const { state, resultJson, failCode, failMsg } = data

      // 处理等待/排队/生成中状态
      if (state === 'waiting' || state === 'queueing' || state === 'generating') {
        const stateMessages = {
          waiting: 'Waiting for video generation...',
          queueing: 'Task in queue...',
          generating: 'Generating video...',
        }
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: stateMessages[state] || 'Processing...',
        }
      }

      // 处理成功状态
      if (state === 'success' && resultJson) {
        let parsedResult: KieResultJson
        try {
          parsedResult = JSON.parse(resultJson) as KieResultJson
        } catch {
          return {
            status: 'ERROR',
            message: 'Failed to parse result JSON',
            providerTaskId: taskId,
          }
        }

        if (parsedResult.resultUrls && parsedResult.resultUrls.length > 0) {
          const results: GenerationResult[] = parsedResult.resultUrls.map((url) => ({
            type: 'video',
            url,
          }))

          return {
            status: 'SUCCESS',
            results,
            message: 'Video generation completed',
          }
        }
      }

      // 处理失败状态
      if (state === 'fail') {
        return {
          status: 'ERROR',
          message: failMsg || 'Video generation failed',
          providerTaskId: taskId,
          error: {
            code: failCode || 'GENERATION_FAILED',
            message: failMsg || 'Unknown error',
            isRetryable: false,
          },
        }
      }

      // 未知状态
      return {
        status: 'ERROR',
        message: `Unknown task state: ${state}`,
        providerTaskId: taskId,
      }
    } catch (error: unknown) {
      this.log('error', 'Failed to check Kling v2.5 Turbo I2V Pro task status', error)

      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        providerTaskId: taskId,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }
}
