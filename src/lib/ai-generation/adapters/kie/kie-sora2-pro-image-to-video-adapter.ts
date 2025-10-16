/**
 * KieSora2ProImageToVideoAdapter - Kie.ai Sora 2 Pro Image To Video Generation
 *
 * 对应模型: kie-sora2-pro-image-to-video
 * 功能: 图生视频（基于Sora 2 Pro模型，支持更多参数）
 *
 * API文档: https://api.kie.ai/api/v1/jobs/createTask
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieSora2ProImageToVideoTaskResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

interface KieSora2ProImageToVideoStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    model: string
    state: 'waiting' | 'generating' | 'success' | 'fail'
    param: string
    resultJson: string | null
    failCode: string | null
    failMsg: string | null
    costTime: number | null
    completeTime: number | null
    createTime: number
  }
}

interface KieSora2ProImageToVideoResultJson {
  resultUrls: string[]
}

export class KieSora2ProImageToVideoAdapter extends BaseAdapter {
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

      // 验证输入图片
      if (!request.inputImages || request.inputImages.length === 0) {
        return {
          status: 'ERROR',
          message: 'Input image is required for Sora 2 Pro Image to Video',
          error: {
            code: 'MISSING_INPUT_IMAGE',
            message: 'At least one input image is required',
            isRetryable: false,
          },
        }
      }

      // 构建 input 参数对象
      const input: Record<string, unknown> = {
        prompt: request.prompt,
        image_urls: request.inputImages,
      }

      // 可选参数: aspect_ratio
      if (request.parameters?.aspect_ratio) {
        input.aspect_ratio = request.parameters.aspect_ratio
      }

      // 可选参数: n_frames (视频时长)
      if (request.parameters?.n_frames) {
        input.n_frames = String(request.parameters.n_frames)
      }

      // 可选参数: size (质量)
      if (request.parameters?.size) {
        input.size = request.parameters.size
      }

      // 可选参数: remove_watermark
      if (request.parameters?.remove_watermark !== undefined) {
        input.remove_watermark = request.parameters.remove_watermark
      }

      // 构建完整的请求体
      const payload: Record<string, unknown> = {
        model: 'sora-2-pro-image-to-video',
        input,
      }

      // 可选参数: callBackUrl
      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Sora 2 Pro Image to Video task', payload)

      // 创建任务
      const response = await this.httpClient.post<KieSora2ProImageToVideoTaskResponse>(
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

      this.log('info', `Sora 2 Pro Image to Video task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Video generation in progress',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Sora 2 Pro Image to Video dispatch failed', error)

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
      const response = await this.httpClient.get<KieSora2ProImageToVideoStatusResponse>(
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

      // 等待中或生成中
      if (state === 'waiting' || state === 'generating') {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: state === 'generating' ? 'Generating video...' : 'Waiting for generation...',
        }
      }

      // 成功
      if (state === 'success' && resultJson) {
        let parsedResult: KieSora2ProImageToVideoResultJson
        try {
          parsedResult = JSON.parse(resultJson) as KieSora2ProImageToVideoResultJson
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
          message: failMsg || 'Generation failed',
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
      this.log('error', 'Failed to check Sora 2 Pro Image to Video task status', error)

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

