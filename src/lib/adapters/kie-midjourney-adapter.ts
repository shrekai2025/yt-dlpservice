/**
 * Kie Midjourney Adapter
 *
 * Supports Midjourney image generation via Kie.ai API
 */

import axios, { AxiosError } from 'axios'
import { BaseAdapter } from './base-adapter'
import type { AdapterResponse, UnifiedGenerationRequest, TaskStatusResponse } from './types'

interface KieApiResponse {
  code: number
  msg: string
  data?: {
    taskId?: string
  }
}

interface KieTaskStatusResponse {
  code: number
  msg: string
  data?: {
    taskId: string
    taskType: string
    successFlag: number // 0=generating, 1=success, 2=failed, 3=generation failed
    resultInfoJson?: {
      resultUrls?: Array<{
        resultUrl: string
      }>
    }
    errorCode?: number | null
    errorMessage?: string | null
    createTime?: string
    completeTime?: string
  }
}

export class KieMidjourneyAdapter extends BaseAdapter {
  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    const {
      prompt,
      input_images = [],
      parameters = {},
    } = request

    const {
      taskType = 'mj_txt2img',
      speed = 'relaxed',
      aspectRatio = '16:9',
      version = '7',
      variety = 0,
      stylization = 100,
      weirdness = 0,
      ow,
      waterMark,
      enableTranslation = false,
      videoBatchSize = 1,
      motion = 'high',
    } = parameters as Record<string, any>

    try {
      // Prepare fileUrls from input_images
      const fileUrls = input_images.length > 0 ? input_images : undefined

      // Build request body
      const requestBody: Record<string, any> = {
        prompt,
        taskType,
        enableTranslation,
      }

      // Add speed parameter (not required for video or omni reference tasks)
      if (!['mj_video', 'mj_video_hd', 'mj_omni_reference'].includes(taskType)) {
        requestBody.speed = speed
      }

      // Add file URLs for image-based tasks
      if (fileUrls && fileUrls.length > 0) {
        requestBody.fileUrls = fileUrls
      }

      // Add aspect ratio
      requestBody.aspectRatio = aspectRatio

      // Add version
      requestBody.version = version

      // Add optional parameters
      if (variety !== undefined && variety !== 0) {
        requestBody.variety = variety
      }
      if (stylization !== undefined && stylization !== 100) {
        requestBody.stylization = stylization
      }
      if (weirdness !== undefined && weirdness !== 0) {
        requestBody.weirdness = weirdness
      }
      if (ow !== undefined && taskType === 'mj_omni_reference') {
        requestBody.ow = ow
      }
      if (waterMark) {
        requestBody.waterMark = waterMark
      }

      // Add video-specific parameters
      if (taskType === 'mj_video' || taskType === 'mj_video_hd') {
        requestBody.videoBatchSize = videoBatchSize
        requestBody.motion = motion
      }

      this.logger.info(
        {
          endpoint: this.sourceInfo.apiEndpoint,
          taskType,
          prompt: prompt.substring(0, 100) + '...',
        },
        'Submitting Midjourney task'
      )

      // Submit generation task
      const response = await axios.post<KieApiResponse>(
        `${this.sourceInfo.apiEndpoint}/api/v1/mj/generate`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.sourceInfo.encryptedAuthKey}`,
          },
          timeout: 30000,
        }
      )

      if (response.data.code !== 200 || !response.data.data?.taskId) {
        throw new Error(response.data.msg || 'Failed to submit Midjourney task')
      }

      const taskId = response.data.data.taskId

      this.logger.info({ taskId }, 'Midjourney task submitted successfully')

      // Return PROCESSING status immediately (don't poll synchronously)
      return {
        status: 'PROCESSING',
        task_id: taskId,
        message: 'Midjourney generation task submitted',
        progress: 0,
      }
    } catch (error) {
      this.logger.error({ error }, 'Error submitting Midjourney task')

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<KieApiResponse>
        const errorMessage = axiosError.response?.data?.msg || axiosError.message
        const statusCode = axiosError.response?.status

        return {
          status: 'ERROR',
          message: `Kie Midjourney API error (${statusCode}): ${errorMessage}`,
          error: {
            code: `HTTP_${statusCode}`,
            message: errorMessage,
            isRetryable: statusCode === 429 || (statusCode !== undefined && statusCode >= 500),
          },
        }
      }

      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          isRetryable: false,
        },
      }
    }
  }

  /**
   * Check task status (called by polling mechanism)
   */
  protected async checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      this.logger.info({ taskId }, 'Checking Midjourney task status')

      const response = await axios.get<KieTaskStatusResponse>(
        `${this.sourceInfo.apiEndpoint}/api/v1/mj/record-info`,
        {
          params: { taskId },
          headers: {
            'Authorization': `Bearer ${this.sourceInfo.encryptedAuthKey}`,
          },
          timeout: 15000,
        }
      )

      const { code, msg, data } = response.data

      if (code !== 200 || !data) {
        throw new Error(msg || 'Failed to get task status')
      }

      const { successFlag, resultInfoJson, errorMessage } = data

      // Status mapping: 0=generating, 1=success, 2=failed, 3=generation failed
      if (successFlag === 1) {
        // Task completed successfully
        const resultUrls = resultInfoJson?.resultUrls || []
        const output = resultUrls.map((item) => item.resultUrl)

        this.logger.info(
          {
            taskId,
            resultCount: output.length,
          },
          'Midjourney task completed'
        )

        return {
          status: 'SUCCESS',
          output,
        }
      } else if (successFlag === 2 || successFlag === 3) {
        // Task failed
        this.logger.error(
          {
            taskId,
            errorMessage,
          },
          'Midjourney task failed'
        )

        return {
          status: 'FAILED',
          error: errorMessage || 'Midjourney generation failed',
        }
      } else {
        // Task still processing (successFlag === 0)
        return {
          status: 'PROCESSING',
          progress: 50, // No progress info from API, use fixed value
        }
      }
    } catch (error) {
      this.logger.error({ error, taskId }, 'Error checking Midjourney task status')

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<KieTaskStatusResponse>
        const errorMessage = axiosError.response?.data?.msg || axiosError.message

        return {
          status: 'FAILED',
          error: `Failed to check task status: ${errorMessage}`,
        }
      }

      return {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Get task details (public method for status checking)
   */
  async getTaskDetails(taskId: string): Promise<AdapterResponse> {
    const taskStatus = await this.checkTaskStatus(taskId)

    return {
      status: taskStatus.status === 'SUCCESS' ? 'SUCCESS' :
              taskStatus.status === 'PROCESSING' ? 'PROCESSING' : 'ERROR',
      results: taskStatus.output?.map((url) => ({
        type: 'image' as const,
        url,
      })),
      message: taskStatus.error,
      progress: taskStatus.progress ? taskStatus.progress / 100 : undefined,
    }
  }
}
