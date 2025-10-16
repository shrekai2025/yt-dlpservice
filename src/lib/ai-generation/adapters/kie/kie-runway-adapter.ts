/**
 * KieRunwayAdapter - Kie.ai Runway Video Generation
 *
 * 对应模型: kie-runway
 * 功能: 视频生成和扩展（Runway）
 *
 * API文档: https://api.kie.ai/api/v1/runway/generate
 * 定价:
 * - 5秒 720p: 12 credits ($0.06)
 * - 5秒 1080p: 30 credits ($0.15)
 * - 10秒 720p: 30 credits ($0.15)
 * 注意: 10秒不支持 1080p
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieRunwayGenerateResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieRunwayStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    parentTaskId?: string
    generateParam: {
      prompt: string
      imageUrl?: string
      expandPrompt?: boolean
    }
    state: 'wait' | 'queueing' | 'generating' | 'success' | 'fail'
    generateTime?: string
    videoInfo?: {
      videoId: string
      taskId: string
      videoUrl: string
      imageUrl: string
    }
    failCode?: number
    failMsg?: string
    expireFlag?: 0 | 1
  }
}

export class KieRunwayAdapter extends BaseAdapter {
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

      // 构建请求体
      const payload: Record<string, unknown> = {
        prompt: request.prompt,
        duration: request.parameters?.duration || 5,
        quality: request.parameters?.quality || '720p',
      }

      // 可选参数: imageUrl (图生视频)
      if (request.inputImages && request.inputImages.length > 0) {
        payload.imageUrl = request.inputImages[0]
      } else {
        // 文生视频需要 aspectRatio
        payload.aspectRatio = request.parameters?.aspectRatio || '16:9'
      }

      // 可选参数: waterMark
      if (request.parameters?.waterMark !== undefined) {
        payload.waterMark = request.parameters.waterMark
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Runway video generation task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieRunwayGenerateResponse>(
        '/api/v1/runway/generate',
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

      this.log('info', `Runway video generation task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Video generation in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Runway video generation dispatch failed', error)

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
      const response = await this.httpClient.get<KieRunwayStatusResponse>(
        '/api/v1/runway/record-detail',
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

      const { state, videoInfo, failCode, failMsg } = data

      // 等待中、排队中、生成中
      if (state === 'wait' || state === 'queueing' || state === 'generating') {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: `Video generation: ${state}`,
        }
      }

      // 成功
      if (state === 'success' && videoInfo) {
        const results: GenerationResult[] = [
          {
            type: 'video',
            url: videoInfo.videoUrl,
          },
        ]

        // 添加缩略图
        if (videoInfo.imageUrl) {
          results.push({
            type: 'image',
            url: videoInfo.imageUrl,
          })
        }

        return {
          status: 'SUCCESS',
          results,
          message: 'Video generation completed',
          providerTaskId: taskId,
        }
      }

      // 失败
      if (state === 'fail') {
        return {
          status: 'ERROR',
          message: failMsg || 'Video generation failed',
          providerTaskId: taskId,
          error: {
            code: failCode ? String(failCode) : 'GENERATION_FAILED',
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
      this.log('error', 'Failed to check Runway video task status', error)

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
