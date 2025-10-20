/**
 * KieMidjourneyAdapter - Kie.ai Midjourney Image & Video Generation
 *
 * 对应模型: kie-midjourney-image, kie-midjourney-video
 * 功能: 文生图、图生图、图生视频
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

interface KieMjTaskResponse {
  code: number
  msg: string
  data?: {
    taskId: string
  }
}

interface KieMjStatusResponse {
  code: number
  msg: string
  data?: {
    taskId: string
    taskType: string
    paramJson: string
    completeTime: string
    resultInfoJson?: {
      resultUrls?: Array<{
        resultUrl: string
      }>
    }
    successFlag: number
    createTime: string
    errorCode: number | null
    errorMessage: string | null
  }
}

export class KieMidjourneyAdapter extends BaseAdapter {
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

      // 任务类型 (必需参数,默认为文生图)
      // 根据是否有输入图片自动判断
      const defaultTaskType = request.inputImages && request.inputImages.length > 0 
        ? 'mj_img2img'  // 有输入图片,默认为图生图
        : 'mj_txt2img'  // 无输入图片,默认为文生图
      
      payload.taskType = request.parameters?.taskType || defaultTaskType

      // 判断任务类型
      const isVideoTask = payload.taskType === 'mj_video' || payload.taskType === 'mj_video_hd'

      // 输出比例 (图像和视频都需要)
      if (request.parameters?.aspectRatio) {
        payload.aspectRatio = request.parameters.aspectRatio
      }

      // === 图像任务专用参数 ===
      if (!isVideoTask) {
        // 生成速度
        if (request.parameters?.speed) {
          payload.speed = request.parameters.speed
        }

        // MJ 版本
        if (request.parameters?.version) {
          payload.version = request.parameters.version
        }

        // 多样性
        if (request.parameters?.variety !== undefined) {
          payload.variety = request.parameters.variety
        }

        // 风格化
        if (request.parameters?.stylization !== undefined) {
          payload.stylization = request.parameters.stylization
        }

        // 怪异度
        if (request.parameters?.weirdness !== undefined) {
          payload.weirdness = request.parameters.weirdness
        }

        // Omni 强度
        if (request.parameters?.ow !== undefined) {
          payload.ow = request.parameters.ow
        }
      }

      // === 视频任务专用参数 ===
      if (isVideoTask) {
        if (request.parameters?.videoBatchSize !== undefined) {
          payload.videoBatchSize = request.parameters.videoBatchSize
        }

        if (request.parameters?.motion) {
          payload.motion = request.parameters.motion
        }
      }

      // 输入图片 - 使用 fileUrls (推荐) 或 fileUrl (向后兼容)
      if (request.inputImages && request.inputImages.length > 0) {
        payload.fileUrls = request.inputImages
        // 向后兼容,同时提供 fileUrl
        payload.fileUrl = request.inputImages[0]
      }

      // 其他参数
      if (request.parameters?.waterMark) {
        payload.waterMark = request.parameters.waterMark
      }

      if (request.parameters?.enableTranslation !== undefined) {
        payload.enableTranslation = request.parameters.enableTranslation
      }

      if (request.parameters?.callBackUrl) {
        payload.callBackUrl = request.parameters.callBackUrl
      }

      this.log('info', 'Creating Kie Midjourney task', payload)
      console.log('[KieMidjourneyAdapter] Full payload being sent to API:', JSON.stringify(payload, null, 2))

      // 创建任务
      const response = await this.httpClient.post<KieMjTaskResponse>(
        '/api/v1/mj/generate',
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

      this.log('info', `Task created: ${data.taskId}`)

      // 返回异步任务
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Task submitted, polling required',
      }
    } catch (error: unknown) {
      this.log('error', 'Kie Midjourney dispatch failed', error)

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
      const response = await this.httpClient.get<KieMjStatusResponse>(
        '/api/v1/mj/record-info',
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

      const { successFlag, resultInfoJson, errorMessage } = data

      // 成功
      if (successFlag === 1 && resultInfoJson) {
        const results: GenerationResult[] = []

        // 图像/视频结果
        if (resultInfoJson.resultUrls && resultInfoJson.resultUrls.length > 0) {
          resultInfoJson.resultUrls.forEach((item) => {
            // 根据 URL 后缀判断类型
            const url = item.resultUrl
            const isVideo = url.toLowerCase().match(/\.(mp4|mov|avi|webm)$/)
            
            results.push({
              type: isVideo ? 'video' : 'image',
              url,
            })
          })
        }

        if (results.length > 0) {
          return {
            status: 'SUCCESS',
            results,
            message: 'Generation completed',
          }
        }
      }

      // 处理中
      if (successFlag === 0 && !errorMessage) {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: 'Task is still processing',
        }
      }

      // 失败
      return {
        status: 'ERROR',
        message: errorMessage || 'Generation failed',
        providerTaskId: taskId,
        error: {
          code: 'GENERATION_FAILED',
          message: errorMessage || 'Unknown error',
          isRetryable: false,
        },
      }
    } catch (error: unknown) {
      this.log('error', 'Failed to check task status', error)

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
