/**
 * KieByteDanceV1ProTextToVideoAdapter - Kie.ai ByteDance V1 Pro Text to Video
 *
 * 对应模型: kie-bytedance-v1-pro-text-to-video
 * 功能: 文生视频（ByteDance Seedance V1 Pro）
 *
 * API文档: https://api.kie.ai/api/v1/jobs/createTask
 * 定价: 480p: 2.8 credits/秒 ($0.014), 720p: 6 credits/秒 ($0.03), 1080p: 14 credits/秒 ($0.07)
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieByteDanceTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieByteDanceStatusResponse {
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

interface KieByteDanceResultJson {
  resultUrls: string[]
}

export class KieByteDanceV1ProTextToVideoAdapter extends BaseAdapter {
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

      // 验证 prompt 参数
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

      // 构建 input 参数对象
      const input: Record<string, unknown> = {
        prompt: request.prompt,
      }

      // 可选参数: aspect_ratio (21:9, 16:9, 4:3, 1:1, 3:4, 9:16)
      if (request.parameters?.aspect_ratio) {
        input.aspect_ratio = request.parameters.aspect_ratio
      }

      // 可选参数: resolution (480p, 720p, 1080p)
      if (request.parameters?.resolution) {
        input.resolution = request.parameters.resolution
      }

      // 可选参数: duration (5, 10)
      if (request.parameters?.duration) {
        input.duration = request.parameters.duration
      }

      // 可选参数: camera_fixed
      if (request.parameters?.camera_fixed !== undefined) {
        input.camera_fixed = Boolean(request.parameters.camera_fixed)
      }

      // 可选参数: seed (-1 表示随机)
      if (request.parameters?.seed !== undefined) {
        const seed = Number(request.parameters.seed)
        if (!isNaN(seed) && seed >= -1 && seed <= 2147483647) {
          input.seed = seed
        }
      }

      // 可选参数: enable_safety_checker
      if (request.parameters?.enable_safety_checker !== undefined) {
        input.enable_safety_checker = Boolean(request.parameters.enable_safety_checker)
      }

      // 构建完整的请求体
      const payload: Record<string, unknown> = {
        model: 'bytedance/v1-pro-text-to-video',
        input,
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie ByteDance V1 Pro Text to Video task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieByteDanceTaskResponse>(
        '/api/v1/jobs/createTask',
        payload,
        {
          baseURL: this.getApiEndpoint() || 'https://api.kie.ai',
        }
      )

      const { code, msg, data } = response.data

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

      this.log('info', `ByteDance V1 Pro Text to Video task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Video generation in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie ByteDance V1 Pro Text to Video dispatch failed', error)

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
      const response = await this.httpClient.get<KieByteDanceStatusResponse>(
        '/api/v1/jobs/recordInfo',
        {
          baseURL: this.getApiEndpoint() || 'https://api.kie.ai',
          params: { taskId },
        }
      )

      const { code, msg, data } = response.data

      if (code !== 200 || !data) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to fetch task status',
          providerTaskId: taskId,
        }
      }

      const { state, resultJson, failCode, failMsg } = data

      // 等待中、排队中、生成中
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

      // 成功
      if (state === 'success' && resultJson) {
        let parsedResult: KieByteDanceResultJson
        try {
          parsedResult = JSON.parse(resultJson) as KieByteDanceResultJson
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

      // 失败
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
      this.log('error', 'Failed to check ByteDance V1 Pro Text to Video task status', error)

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
