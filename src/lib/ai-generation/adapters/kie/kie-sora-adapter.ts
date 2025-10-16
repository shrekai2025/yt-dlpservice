/**
 * KieSoraAdapter - Kie.ai Sora Video Generation
 *
 * 对应模型: kie-sora
 * 功能: 文生视频（基于Sora模型）
 *
 * 注意：Sora API目前可能需要特殊访问权限
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieSoraTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieSoraStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    model?: string
    state?: 'waiting' | 'generating' | 'success' | 'fail'
    status?: 'GENERATING' | 'SUCCESS' | 'CREATE_TASK_FAILED' | 'GENERATE_FAILED'
    response?: {
      resultUrls: string[]
    }
    resultJson?: string
    errorMessage?: string
    failMsg?: string
    progress?: string
  }
}

export class KieSoraAdapter extends BaseAdapter {
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

      // 构建请求参数
      const payload: Record<string, unknown> = {
        prompt: request.prompt,
      }

      // 可选参数
      if (request.parameters?.duration) {
        // Sora supports various durations, typically up to 60 seconds
        payload.duration = request.parameters.duration
      }

      if (request.parameters?.aspect_ratio) {
        payload.aspectRatio = request.parameters.aspect_ratio
      }

      if (request.parameters?.resolution) {
        payload.resolution = request.parameters.resolution
      }

      if (request.parameters?.style) {
        payload.style = request.parameters.style
      }

      // 输入图片（用于扩展视频）
      if (request.inputImages && request.inputImages.length > 0) {
        payload.imageUrl = request.inputImages[0]
      }

      this.log('info', 'Creating Kie Sora task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieSoraTaskResponse>(
        '/api/v1/sora/submit-task',
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

      this.log('info', `Sora task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Video generation in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Sora dispatch failed', error)

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
      // 尝试使用统一的 jobs API
      const response = await this.httpClient.get<KieSoraStatusResponse>(
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

      // 支持两种 API 响应格式
      // 格式1: { state: 'waiting'|'generating'|'success'|'fail', resultJson: '...' }
      // 格式2: { status: 'GENERATING'|'SUCCESS'|..., response: { resultUrls: [...] } }
      
      const taskState = data.state || (data.status === 'GENERATING' ? 'generating' : data.status === 'SUCCESS' ? 'success' : undefined)
      const { response: taskResponse, resultJson, errorMessage, failMsg, progress } = data

      // 处理中
      if (taskState === 'waiting' || taskState === 'generating' || data.status === 'GENERATING') {
        const progressNum = progress ? parseFloat(progress) / 100 : 0
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          progress: progressNum,
          message: taskState === 'generating' || data.status === 'GENERATING' ? `Generating... ${progress || '0'}%` : 'Task is waiting',
        }
      }

      // 成功 - 格式1 (resultJson)
      if (taskState === 'success' && resultJson) {
        try {
          const result = JSON.parse(resultJson) as { resultUrls?: string[] }
          const resultUrls = result.resultUrls || []

          if (resultUrls.length > 0) {
            const results: GenerationResult[] = resultUrls.map((url: string) => ({
              type: 'video',
              url,
            }))

            return {
              status: 'SUCCESS',
              results,
              message: 'Video generation completed',
            }
          }
        } catch (parseError) {
          this.log('error', 'Failed to parse resultJson', parseError)
        }
      }

      // 成功 - 格式2 (response.resultUrls)
      if (data.status === 'SUCCESS' && taskResponse?.resultUrls?.length) {
        const results: GenerationResult[] = taskResponse.resultUrls.map((url) => ({
          type: 'video',
          url,
        }))

        return {
          status: 'SUCCESS',
          results,
          message: 'Video generation completed',
        }
      }

      // 失败
      if (taskState === 'fail' || data.status === 'CREATE_TASK_FAILED' || data.status === 'GENERATE_FAILED') {
        return {
          status: 'ERROR',
          message: failMsg || errorMessage || 'Generation failed',
          providerTaskId: taskId,
          error: {
            code: 'GENERATION_FAILED',
            message: failMsg || errorMessage || 'Unknown error',
            isRetryable: false,
          },
        }
      }

      // 未知状态
      return {
        status: 'ERROR',
        message: `Unknown task state: ${taskState || data.status}`,
        providerTaskId: taskId,
        error: {
          code: 'UNKNOWN_STATE',
          message: `Unexpected task state: ${taskState || data.status}`,
          isRetryable: false,
        },
      }
    } catch (error: unknown) {
      this.log('error', 'Failed to check Sora task status', error)

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

