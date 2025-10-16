/**
 * KieWan25TextToVideoAdapter - Kie.ai Wan 2.5 Text to Video
 *
 * 对应模型: kie-wan-2-5-text-to-video
 * 功能: 文生视频（Wan 2.5 版本，支持 720p 和 1080p）
 *
 * API文档: https://api.kie.ai/api/v1/jobs/createTask
 * 定价: 720p: 12 credits/秒 ($0.06), 1080p: 20 credits/秒 ($0.10)
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieWanTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieWanStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    model: string
    state: 'waiting' | 'success' | 'fail'
    param: string
    resultJson: string | null
    failCode: string | null
    failMsg: string | null
    costTime: number | null
    completeTime: number | null
    createTime: number
  }
}

interface KieWanResultJson {
  resultUrls: string[]
}

export class KieWan25TextToVideoAdapter extends BaseAdapter {
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

      // 可选参数: aspect_ratio (16:9, 9:16, 1:1)
      if (request.parameters?.aspect_ratio) {
        input.aspect_ratio = request.parameters.aspect_ratio
      }

      // 可选参数: resolution (720p, 1080p)
      if (request.parameters?.resolution) {
        input.resolution = request.parameters.resolution
      }

      // 可选参数: negative_prompt (最多500字符)
      if (request.parameters?.negative_prompt) {
        input.negative_prompt = request.parameters.negative_prompt
      }

      // 可选参数: enable_prompt_expansion
      if (request.parameters?.enable_prompt_expansion !== undefined) {
        input.enable_prompt_expansion = Boolean(request.parameters.enable_prompt_expansion)
      }

      // 可选参数: seed
      if (request.parameters?.seed !== undefined) {
        const seed = Number(request.parameters.seed)
        if (!isNaN(seed)) {
          input.seed = seed
        }
      }

      // 构建完整的请求体
      const payload: Record<string, unknown> = {
        model: 'wan/2-5-text-to-video',
        input,
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Wan 2.5 Text to Video task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieWanTaskResponse>(
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

      this.log('info', `Wan 2.5 Text to Video task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Video generation in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Wan 2.5 Text to Video dispatch failed', error)

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
      const response = await this.httpClient.get<KieWanStatusResponse>(
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

      // 等待中
      if (state === 'waiting') {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: 'Waiting for video generation...',
        }
      }

      // 成功
      if (state === 'success' && resultJson) {
        let parsedResult: KieWanResultJson
        try {
          parsedResult = JSON.parse(resultJson) as KieWanResultJson
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
      this.log('error', 'Failed to check Wan 2.5 Text to Video task status', error)

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
