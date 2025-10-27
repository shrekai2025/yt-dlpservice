/**
 * 数字人任务服务
 * 管理数字人任务的完整生命周期
 */

import { db } from '~/server/db'
import { DigitalHumanStage } from '@prisma/client'
import { JimengDigitalHumanClient, type CredentialsSource } from './jimeng-client'
import { s3Uploader } from '~/lib/services/s3-uploader'
import * as fs from 'fs/promises'
import * as path from 'path'
import axios from 'axios'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

/**
 * 创建数字人任务的参数
 */
export interface CreateDigitalHumanTaskParams {
  userId: string
  shotId?: string  // 关联的镜头ID（可选）
  name: string
  imageUrl: string
  audioUrl: string
  prompt?: string
  seed?: number
  peFastMode?: boolean
  enableMultiSubject?: boolean
}

/**
 * 数字人任务服务
 */
export class DigitalHumanService {
  private client: JimengDigitalHumanClient | null = null
  private credentialsSource?: CredentialsSource

  /**
   * 构造函数
   * @param credentialsSource 凭证来源（数据库配置）
   */
  constructor(credentialsSource?: CredentialsSource) {
    this.credentialsSource = credentialsSource
  }

  /**
   * 获取或创建客户端实例（懒加载）
   */
  private getClient(): JimengDigitalHumanClient {
    if (!this.client) {
      try {
        this.client = new JimengDigitalHumanClient(this.credentialsSource)
      } catch (error) {
        // 如果创建客户端失败（例如没有凭证），抛出更友好的错误
        throw new Error(
          '数字人服务未配置。请联系管理员配置即梦API凭证。' +
          (error instanceof Error ? ` (${error.message})` : '')
        )
      }
    }
    return this.client
  }

  /**
   * 获取音频URL的时长
   */
  private async getAudioDuration(audioUrl: string): Promise<number | null> {
    let tempFilePath: string | null = null
    try {
      // 下载音频文件到临时目录
      const tempDir = os.tmpdir()
      const tempFileName = `audio_${Date.now()}.mp3`
      tempFilePath = path.join(tempDir, tempFileName)

      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      })

      await fs.writeFile(tempFilePath, response.data)

      // 使用 ffprobe 获取时长
      const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tempFilePath}"`
      const { stdout } = await execAsync(command)

      const duration = parseFloat(stdout.trim())
      return isNaN(duration) ? null : duration
    } catch (error) {
      console.warn(`获取音频时长失败: ${audioUrl}`, error)
      return null
    } finally {
      // 清理临时文件
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath)
        } catch (e) {
          // 忽略删除失败
        }
      }
    }
  }

  /**
   * 创建并启动数字人任务
   */
  async createTask(params: CreateDigitalHumanTaskParams) {
    // 获取音频时长
    const duration = await this.getAudioDuration(params.audioUrl)

    // 创建任务记录
    const task = await db.digitalHumanTask.create({
      data: {
        userId: params.userId,
        shotId: params.shotId,
        name: params.name,
        imageUrl: params.imageUrl,
        audioUrl: params.audioUrl,
        duration,
        prompt: params.prompt,
        seed: params.seed,
        peFastMode: params.peFastMode ?? false,
        enableMultiSubject: params.enableMultiSubject ?? false,
        stage: DigitalHumanStage.UPLOADING_ASSETS, // 初始状态改为上传素材
      },
    })

    // 启动处理流程
    this.processTask(task.id).catch((error) => {
      console.error(`Failed to process digital human task ${task.id}:`, error)
    })

    return task
  }

  /**
   * 处理数字人任务
   */
  private async processTask(taskId: string) {
    const task = await db.digitalHumanTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    try {
      // 步骤0: 检查并上传素材到S3
      console.log(`[DigitalHuman ${taskId}] Checking and uploading assets...`)
      const { imageUrl, audioUrl } = await this.uploadAssetsIfNeeded(taskId, task.imageUrl, task.audioUrl)

      // 步骤1: 提交主体识别
      console.log(`[DigitalHuman ${taskId}] Submitting face recognition...`)
      const faceTaskId = await this.getClient().submitFaceRecognition(imageUrl)

      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          faceRecognitionTaskId: faceTaskId,
          stage: DigitalHumanStage.FACE_RECOGNITION_PROCESSING,
        },
      })

      // 轮询主体识别结果
      console.log(`[DigitalHuman ${taskId}] Polling face recognition result...`)
      const faceResult = await this.pollFaceRecognition(faceTaskId)

      if (faceResult.status === 0) {
        throw new Error('图片中未检测到人物或类人主体')
      }

      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          stage: DigitalHumanStage.FACE_RECOGNITION_COMPLETED,
        },
      })

      console.log(`[DigitalHuman ${taskId}] Face recognition completed`)

      // 根据是否启用多主体模式决定下一步
      if (task.enableMultiSubject) {
        // 多主体模式: 执行步骤2主体检测
        console.log(`[DigitalHuman ${taskId}] Detecting subjects...`)
        const detectionResult = await this.getClient().detectSubjects(task.imageUrl)

        await db.digitalHumanTask.update({
          where: { id: taskId },
          data: {
            maskUrls: JSON.stringify(detectionResult.maskUrls),
            stage: DigitalHumanStage.AWAITING_SUBJECT_SELECTION,
          },
        })

        console.log(
          `[DigitalHuman ${taskId}] Subject detection completed, waiting for user selection (${detectionResult.maskUrls.length} subjects found)`
        )

        // 等待用户选择，不继续执行
      } else {
        // 单主体模式: 直接进入视频生成
        await this.startVideoGeneration(taskId)
      }
    } catch (error) {
      console.error(`[DigitalHuman ${taskId}] Error:`, error)

      // 提取更友好的错误信息
      let errorMessage = 'Unknown error'
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } }
        if (axiosError.response?.status === 429) {
          errorMessage = 'API 调用频率限制，请稍后再试'
        } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          errorMessage = 'API 凭证无效或权限不足'
        } else if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
          const data = axiosError.response.data as { message?: string }
          errorMessage = data.message || `HTTP ${axiosError.response.status} 错误`
        } else if (axiosError.response?.status) {
          errorMessage = `HTTP ${axiosError.response.status} 错误`
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          stage: DigitalHumanStage.FAILED,
          errorMessage,
        },
      })

      throw error
    }
  }

  /**
   * 轮询主体识别结果
   */
  private async pollFaceRecognition(taskId: string, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getClient().queryFaceRecognition(taskId)

      if (result) {
        return result
      }

      // 等待5秒后重试
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }

    throw new Error('Face recognition polling timeout')
  }

  /**
   * 轮询视频生成结果
   */
  private async pollVideoGeneration(taskId: string, maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getClient().queryVideoGeneration(taskId)

      if (result && result.status === 'done') {
        return result
      }

      // 等待20秒后重试
      await new Promise((resolve) => setTimeout(resolve, 20000))
    }

    throw new Error('Video generation polling timeout')
  }

  /**
   * 用户选择主体后，继续视频生成
   */
  async selectSubjectAndContinue(taskId: string, maskIndex: number) {
    const task = await db.digitalHumanTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.stage !== DigitalHumanStage.AWAITING_SUBJECT_SELECTION) {
      throw new Error(`Task ${taskId} is not awaiting subject selection`)
    }

    // 更新选择的mask索引
    await db.digitalHumanTask.update({
      where: { id: taskId },
      data: {
        selectedMaskIndex: maskIndex,
      },
    })

    // 继续视频生成
    await this.startVideoGeneration(taskId, maskIndex)

    return task
  }

  /**
   * 启动视频生成
   */
  private async startVideoGeneration(taskId: string, maskIndex?: number) {
    const task = await db.digitalHumanTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    try {
      // 准备mask URLs
      let maskUrls: string[] | undefined

      if (task.enableMultiSubject && maskIndex !== undefined && task.maskUrls) {
        const allMaskUrls = JSON.parse(task.maskUrls) as string[]
        const selectedMask = allMaskUrls[maskIndex]
        if (selectedMask) {
          maskUrls = [selectedMask]
        }
      }

      // 提交视频生成任务
      console.log(`[DigitalHuman ${taskId}] Submitting video generation...`)
      const videoTaskId = await this.getClient().submitVideoGeneration({
        imageUrl: task.imageUrl,
        audioUrl: task.audioUrl,
        maskUrls,
        prompt: task.prompt ?? undefined,
        seed: task.seed ?? undefined,
        peFastMode: task.peFastMode,
      })

      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          videoGenerationTaskId: videoTaskId,
          stage: DigitalHumanStage.VIDEO_GENERATION_SUBMITTED,
        },
      })

      // 轮询视频生成结果
      console.log(`[DigitalHuman ${taskId}] Polling video generation result...`)
      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          stage: DigitalHumanStage.VIDEO_GENERATION_PROCESSING,
        },
      })

      const videoResult = await this.pollVideoGeneration(videoTaskId)

      // 更新任务完成状态
      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          resultVideoUrl: videoResult.videoUrl,
          aigcMetaTagged: videoResult.aigcMetaTagged,
          stage: DigitalHumanStage.VIDEO_GENERATION_COMPLETED,
        },
      })

      console.log(`[DigitalHuman ${taskId}] Video generation completed`)
    } catch (error) {
      console.error(`[DigitalHuman ${taskId}] Video generation error:`, error)

      // 提取更友好的错误信息
      let errorMessage = 'Unknown error'
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } }
        if (axiosError.response?.status === 429) {
          errorMessage = 'API 调用频率限制，请稍后再试'
        } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          errorMessage = 'API 凭证无效或权限不足'
        } else if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
          const data = axiosError.response.data as { message?: string }
          errorMessage = data.message || `HTTP ${axiosError.response.status} 错误`
        } else if (axiosError.response?.status) {
          errorMessage = `HTTP ${axiosError.response.status} 错误`
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          stage: DigitalHumanStage.FAILED,
          errorMessage,
        },
      })

      throw error
    }
  }

  /**
   * 获取任务详情
   */
  async getTask(taskId: string) {
    const task = await db.digitalHumanTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // 解析maskUrls
    let maskUrls: string[] | null = null
    if (task.maskUrls) {
      try {
        maskUrls = JSON.parse(task.maskUrls)
      } catch {
        // 忽略解析错误
      }
    }

    return {
      ...task,
      maskUrls,
    }
  }

  /**
   * 获取用户的所有任务
   */
  async getUserTasks(userId: string) {
    const tasks = await db.digitalHumanTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return tasks.map((task) => {
      let maskUrls: string[] | null = null
      if (task.maskUrls) {
        try {
          maskUrls = JSON.parse(task.maskUrls)
        } catch {
          // 忽略解析错误
        }
      }

      return {
        ...task,
        maskUrls,
      }
    })
  }

  /**
   * 检查URL是否需要上传到S3
   */
  private isPublicUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://')
  }

  /**
   * 检查并上传素材到S3
   */
  private async uploadAssetsIfNeeded(
    taskId: string,
    imageUrl: string,
    audioUrl: string
  ): Promise<{ imageUrl: string; audioUrl: string }> {
    try {
      // 获取任务信息以获得shotId
      const task = await db.digitalHumanTask.findUnique({
        where: { id: taskId },
        select: { shotId: true },
      })

      let finalImageUrl = imageUrl
      let finalAudioUrl = audioUrl
      let audioWasUploaded = false

      // 检查并上传图片
      if (!this.isPublicUrl(imageUrl)) {
        console.log(`[DigitalHuman ${taskId}] Image URL is not public, uploading to S3...`)
        const imagePath = path.join(process.cwd(), 'public', imageUrl)
        finalImageUrl = await s3Uploader.uploadFile(imagePath, `digital-human/${taskId}`)
        console.log(`[DigitalHuman ${taskId}] Image uploaded: ${finalImageUrl}`)
      }

      // 检查并上传音频
      if (!this.isPublicUrl(audioUrl)) {
        console.log(`[DigitalHuman ${taskId}] Audio URL is not public, uploading to S3...`)
        const audioPath = path.join(process.cwd(), 'public', audioUrl)
        finalAudioUrl = await s3Uploader.uploadFile(audioPath, `digital-human/${taskId}`)
        console.log(`[DigitalHuman ${taskId}] Audio uploaded: ${finalAudioUrl}`)
        audioWasUploaded = true
      }

      // 更新数据库中的URL
      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          imageUrl: finalImageUrl,
          audioUrl: finalAudioUrl,
          stage: DigitalHumanStage.FACE_RECOGNITION_SUBMITTED,
        },
      })

      // 如果音频被上传了，并且任务关联了镜头，则更新镜头的音频URL
      if (audioWasUploaded && task?.shotId) {
        console.log(`[DigitalHuman ${taskId}] Updating shot audio URL to S3 URL...`)
        await db.studioShot.update({
          where: { id: task.shotId },
          data: {
            cameraPrompt: finalAudioUrl, // 更新镜头的音频URL为S3 URL
          },
        })
        console.log(`[DigitalHuman ${taskId}] Shot audio URL updated successfully`)
      }

      return { imageUrl: finalImageUrl, audioUrl: finalAudioUrl }
    } catch (error) {
      console.error(`[DigitalHuman ${taskId}] Upload failed:`, error)

      // 标记为上传失败
      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          stage: DigitalHumanStage.UPLOAD_FAILED,
          errorMessage: error instanceof Error ? error.message : '上传素材失败',
        },
      })

      throw error
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string) {
    await db.digitalHumanTask.delete({
      where: { id: taskId },
    })
  }

  /**
   * 重试/恢复失败的任务
   * 根据任务当前的stage和已有的taskId，尝试继续处理
   */
  async retryTask(taskId: string) {
    const task = await db.digitalHumanTask.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // 重置错误状态
    await db.digitalHumanTask.update({
      where: { id: taskId },
      data: {
        errorMessage: null,
      },
    })

    try {
      // 根据任务的stage和已有的taskId判断从哪里恢复
      if (task.videoGenerationTaskId) {
        // 如果已经有视频生成任务ID，直接轮询视频生成结果
        console.log(`[DigitalHuman ${taskId}] Retrying video generation polling...`)

        await db.digitalHumanTask.update({
          where: { id: taskId },
          data: {
            stage: DigitalHumanStage.VIDEO_GENERATION_PROCESSING,
          },
        })

        const videoResult = await this.pollVideoGeneration(task.videoGenerationTaskId)

        await db.digitalHumanTask.update({
          where: { id: taskId },
          data: {
            resultVideoUrl: videoResult.videoUrl,
            aigcMetaTagged: videoResult.aigcMetaTagged,
            stage: DigitalHumanStage.VIDEO_GENERATION_COMPLETED,
          },
        })

        console.log(`[DigitalHuman ${taskId}] Video generation recovered successfully`)
        return task
      } else if (task.faceRecognitionTaskId) {
        // 如果有主体识别任务ID但没有视频生成ID，从主体识别结果开始恢复
        console.log(`[DigitalHuman ${taskId}] Retrying from face recognition...`)

        await db.digitalHumanTask.update({
          where: { id: taskId },
          data: {
            stage: DigitalHumanStage.FACE_RECOGNITION_PROCESSING,
          },
        })

        const faceResult = await this.pollFaceRecognition(task.faceRecognitionTaskId)

        if (faceResult.status === 0) {
          throw new Error('图片中未检测到人物或类人主体')
        }

        await db.digitalHumanTask.update({
          where: { id: taskId },
          data: {
            stage: DigitalHumanStage.FACE_RECOGNITION_COMPLETED,
          },
        })

        // 根据是否启用多主体模式继续
        if (task.enableMultiSubject) {
          // 如果已经检测过主体，直接等待用户选择
          if (task.maskUrls) {
            await db.digitalHumanTask.update({
              where: { id: taskId },
              data: {
                stage: DigitalHumanStage.AWAITING_SUBJECT_SELECTION,
              },
            })
            console.log(`[DigitalHuman ${taskId}] Waiting for user subject selection`)
          } else {
            // 重新检测主体
            const detectionResult = await this.getClient().detectSubjects(task.imageUrl)

            await db.digitalHumanTask.update({
              where: { id: taskId },
              data: {
                maskUrls: JSON.stringify(detectionResult.maskUrls),
                stage: DigitalHumanStage.AWAITING_SUBJECT_SELECTION,
              },
            })
            console.log(`[DigitalHuman ${taskId}] Subject detection completed`)
          }
        } else {
          // 单主体模式，直接进入视频生成
          await this.startVideoGeneration(taskId)
        }

        return task
      } else {
        // 没有任何任务ID，从头开始
        console.log(`[DigitalHuman ${taskId}] Retrying from beginning...`)
        this.processTask(taskId).catch((error) => {
          console.error(`Failed to retry digital human task ${taskId}:`, error)
        })
        return task
      }
    } catch (error) {
      console.error(`[DigitalHuman ${taskId}] Retry failed:`, error)

      // 提取更友好的错误信息
      let errorMessage = 'Unknown error'
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } }
        if (axiosError.response?.status === 429) {
          errorMessage = 'API 调用频率限制，请稍后再试'
        } else if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          errorMessage = 'API 凭证无效或权限不足'
        } else if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
          const data = axiosError.response.data as { message?: string }
          errorMessage = data.message || `HTTP ${axiosError.response.status} 错误`
        } else if (axiosError.response?.status) {
          errorMessage = `HTTP ${axiosError.response.status} 错误`
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      await db.digitalHumanTask.update({
        where: { id: taskId },
        data: {
          stage: DigitalHumanStage.FAILED,
          errorMessage,
        },
      })

      throw error
    }
  }
}