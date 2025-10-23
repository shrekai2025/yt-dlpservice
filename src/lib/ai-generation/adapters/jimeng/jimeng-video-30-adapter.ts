/**
 * JimengVideo30Adapter - 即梦AI 视频生成3.0 1080P
 *
 * 对应模型: jimeng-video-30
 * 功能: 文生视频、图生视频（首帧）、图生视频（首尾帧）
 * 供应商: 火山引擎即梦AI
 *
 * 特性:
 * - 支持最高1080P高清渲染
 * - 支持5s、10s视频生成
 * - 自动识别生成模式（根据输入图片数量）
 * - 异步任务模式（提交任务+轮询结果）
 *
 * 生成模式:
 * - 文生视频：inputImages为空
 * - 图生视频-首帧：inputImages包含1张图片
 * - 图生视频-首尾帧：inputImages包含2张图片
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'
import { generateVolcengineSignature } from '../utils/volcengine-signer'

/**
 * 提交任务响应
 */
interface JimengVideoSubmitResponse {
  code: number
  message: string
  request_id: string
  status: number
  time_elapsed: string
  data?: {
    task_id: string
  }
}

/**
 * 查询任务响应
 */
interface JimengVideoQueryResponse {
  code: number
  message: string
  request_id: string
  status: number
  time_elapsed: string
  data?: {
    video_url: string
    aigc_meta_tagged: boolean
    status: 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired'
  }
}

export class JimengVideo30Adapter extends BaseAdapter {
  /**
   * 获取火山引擎凭证
   * 支持多种配置方式（按优先级）：
   * 1. 数据库 apiKeyId + apiKeySecret 字段（推荐）
   * 2. 环境变量: AI_PROVIDER_JIMENG_ACCESS_KEY_ID 和 AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY
   * 3. apiKey字段JSON格式: {"accessKeyId":"xxx","secretAccessKey":"xxx"}
   * 4. apiKey字段冒号分隔: accessKeyId:secretAccessKey
   */
  private getVolcengineCredentials(): { accessKeyId: string; secretAccessKey: string } | null {
    // 方式1: 优先使用数据库的专用字段（最直观、最推荐）
    const dbApiKeyId = this.config.provider.apiKeyId
    const dbApiKeySecret = this.config.provider.apiKeySecret

    if (dbApiKeyId && dbApiKeySecret) {
      return {
        accessKeyId: dbApiKeyId,
        secretAccessKey: dbApiKeySecret,
      }
    }

    // 方式2: 使用环境变量（分别配置）
    const envPrefix = `AI_PROVIDER_${this.config.provider.slug.toUpperCase().replace(/-/g, '_')}_`
    const envAccessKeyId = process.env[`${envPrefix}ACCESS_KEY_ID`]
    const envSecretAccessKey = process.env[`${envPrefix}SECRET_ACCESS_KEY`]

    if (envAccessKeyId && envSecretAccessKey) {
      return {
        accessKeyId: envAccessKeyId,
        secretAccessKey: envSecretAccessKey,
      }
    }

    // 方式3和4: 从apiKey字段解析（向后兼容）
    const apiKey = this.getApiKey()
    if (!apiKey) {
      return null
    }

    if (apiKey.startsWith('{')) {
      try {
        const parsed = JSON.parse(apiKey) as Record<string, string>
        if (parsed.accessKeyId && parsed.secretAccessKey) {
          return {
            accessKeyId: parsed.accessKeyId,
            secretAccessKey: parsed.secretAccessKey,
          }
        }
      } catch (error) {
        this.log('warn', 'Failed to parse API key as JSON', error)
      }
    }

    if (apiKey.includes(':')) {
      const [accessKeyId, secretAccessKey] = apiKey.split(':')
      if (accessKeyId && secretAccessKey) {
        return {
          accessKeyId,
          secretAccessKey,
        }
      }
    }

    return null
  }

  /**
   * 创建HTTP客户端
   */
  protected createHttpClient() {
    const client = super.createHttpClient()

    client.interceptors.request.use((config) => {
      const credentials = this.getVolcengineCredentials()
      if (credentials) {
        try {
          const body = typeof config.data === 'string'
            ? config.data
            : JSON.stringify(config.data || {})

          // 获取query参数 - 优先使用config.params，回退到URL解析
          let query: Record<string, string> = {}

          if (config.params) {
            // 从config.params获取（axios标准方式）
            query = config.params as Record<string, string>
          } else {
            // 从URL中提取query参数（回退方案）
            const url = new URL(config.url || '/', config.baseURL || 'https://visual.volcengineapi.com')
            url.searchParams.forEach((value, key) => {
              query[key] = value
            })
          }

          const signature = generateVolcengineSignature({
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            service: 'cv',
            region: 'cn-north-1',
            method: 'POST',
            path: '/',
            query,
            headers: {
              'Content-Type': 'application/json',
            },
            body,
          })

          config.headers = {
            ...config.headers,
            ...signature,
          }
        } catch (error) {
          this.log('error', 'Failed to sign request', error)
        }
      }
      return config
    })

    return client
  }

  /**
   * 根据输入图片数量判断生成模式和req_key
   */
  private getReqKey(inputImages?: string[]): string {
    const imageCount = inputImages?.length || 0

    if (imageCount === 0) {
      // 文生视频
      return 'jimeng_t2v_v30_1080p'
    } else if (imageCount === 1) {
      // 图生视频-首帧
      return 'jimeng_i2v_first_v30_1080'
    } else if (imageCount === 2) {
      // 图生视频-首尾帧
      return 'jimeng_i2v_first_tail_v30_1080'
    } else {
      throw new Error(`Invalid input images count: ${imageCount}. Expected 0, 1, or 2.`)
    }
  }

  /**
   * 获取生成模式描述
   */
  private getModeName(inputImages?: string[]): string {
    const imageCount = inputImages?.length || 0
    if (imageCount === 0) return 'text-to-video'
    if (imageCount === 1) return 'image-to-video (first frame)'
    if (imageCount === 2) return 'image-to-video (first & tail frames)'
    return 'unknown'
  }

  /**
   * 调度生成请求（提交异步任务）
   */
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    try {
      const credentials = this.getVolcengineCredentials()
      if (!credentials) {
        return {
          status: 'ERROR',
          message: 'Missing or invalid Volcengine credentials',
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Volcengine Access Key ID and Secret Access Key are required',
            isRetryable: false,
          },
        }
      }

      // 判断生成模式
      const reqKey = this.getReqKey(request.inputImages)
      const modeName = this.getModeName(request.inputImages)

      // 构建请求参数
      const payload: Record<string, unknown> = {
        req_key: reqKey,
        prompt: request.prompt,
      }

      // 输入图片（如果有）
      if (request.inputImages && request.inputImages.length > 0) {
        payload.image_urls = request.inputImages
      }

      // 可选参数
      const params = request.parameters || {}

      if (params.seed !== undefined) {
        payload.seed = params.seed
      }
      if (params.frames !== undefined) {
        payload.frames = params.frames
      }
      // aspect_ratio仅文生视频支持
      if (reqKey === 'jimeng_t2v_v30_1080p' && params.aspect_ratio !== undefined) {
        payload.aspect_ratio = params.aspect_ratio
      }

      this.log('info', `Submitting Jimeng Video 3.0 task (${modeName})`, {
        prompt: request.prompt.substring(0, 100),
        inputImages: request.inputImages?.length || 0,
        frames: params.frames || 121,
      })

      // 提交任务
      const endpoint = this.getApiEndpoint() || 'https://visual.volcengineapi.com'
      const submitResponse = await this.httpClient.post<JimengVideoSubmitResponse>(
        '/',
        payload,
        {
          baseURL: endpoint,
          params: {
            Action: 'CVSync2AsyncSubmitTask',
            Version: '2022-08-31',
          },
        }
      )

      const submitData = submitResponse.data

      if (submitData.code !== 10000 || submitData.status !== 10000) {
        const isRetryable = this.isRetryableError(submitData.code)
        return {
          status: 'ERROR',
          message: submitData.message || 'Failed to submit task',
          error: {
            code: String(submitData.code),
            message: submitData.message,
            isRetryable,
            details: submitData,
          },
        }
      }

      if (!submitData.data?.task_id) {
        return {
          status: 'ERROR',
          message: 'No task_id returned',
          error: {
            code: 'NO_TASK_ID',
            message: 'Task submission succeeded but no task_id returned',
            isRetryable: false,
          },
        }
      }

      const taskId = submitData.data.task_id
      this.log('info', `Video task submitted successfully: ${taskId}`)

      return {
        status: 'PROCESSING',
        providerTaskId: taskId,
        message: `${modeName}|${reqKey}`,  // 在message中编码req_key供后续查询使用
      }
    } catch (error: unknown) {
      this.log('error', 'Jimeng Video 3.0 dispatch failed', error)

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { status?: number; data?: JimengVideoSubmitResponse }
        }

        if (axiosError.response?.data) {
          const errorData = axiosError.response.data
          const isRetryable = this.isRetryableError(errorData.code)

          return {
            status: 'ERROR',
            message: errorData.message || 'API request failed',
            error: {
              code: String(errorData.code),
              message: errorData.message,
              isRetryable,
              details: errorData,
            },
          }
        }
      }

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
   * 检查异步任务状态
   */
  async checkTaskStatus(taskId: string): Promise<AdapterResponse> {
    try {
      const credentials = this.getVolcengineCredentials()
      if (!credentials) {
        return {
          status: 'ERROR',
          message: 'Missing credentials',
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Cannot check task status without credentials',
            isRetryable: false,
          },
        }
      }

      // 尝试所有三种req_key，因为我们可能不知道原始任务使用的是哪一个
      // 按使用频率顺序尝试：文生视频 > 首帧 > 首尾帧
      const reqKeys = [
        'jimeng_t2v_v30_1080p',
        'jimeng_i2v_first_v30_1080',
        'jimeng_i2v_first_tail_v30_1080',
      ]

      for (const reqKey of reqKeys) {
        const reqJson = {
          aigc_meta: {
            content_producer: '',
            producer_id: taskId,
            content_propagator: '',
            propagate_id: '',
          },
        }

        const payload = {
          req_key: reqKey,
          task_id: taskId,
          req_json: JSON.stringify(reqJson),
        }

        try {
          this.log('info', `Checking video task status: ${taskId} (${reqKey})`)

          const endpoint = this.getApiEndpoint() || 'https://visual.volcengineapi.com'
          const queryResponse = await this.httpClient.post<JimengVideoQueryResponse>(
            '/',
            payload,
            {
              baseURL: endpoint,
              params: {
                Action: 'CVSync2AsyncGetResult',
                Version: '2022-08-31',
              },
            }
          )

          const queryData = queryResponse.data

          // 如果查询成功且不是not_found，说明找到了正确的req_key
          if (queryData.code === 10000 && queryData.data?.status !== 'not_found') {
            return this.processQueryResult(queryData)
          }
        } catch (error) {
          // 尝试下一个req_key
          continue
        }
      }

      // 所有req_key都失败了
      return {
        status: 'ERROR',
        message: 'Task not found with any req_key',
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'Failed to query task with all available req_keys',
          isRetryable: false,
        },
      }
    } catch (error: unknown) {
      this.log('error', 'Video status check failed', error)

      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }

  /**
   * 处理查询结果
   */
  private processQueryResult(queryData: JimengVideoQueryResponse): AdapterResponse {
    if (queryData.code !== 10000 || queryData.status !== 10000) {
      const isRetryable = this.isRetryableError(queryData.code)
      return {
        status: 'ERROR',
        message: queryData.message || 'Failed to query task',
        error: {
          code: String(queryData.code),
          message: queryData.message,
          isRetryable,
          details: queryData,
        },
      }
    }

    if (!queryData.data) {
      return {
        status: 'ERROR',
        message: 'No data in query response',
        error: {
          code: 'NO_DATA',
          message: 'Query succeeded but no data returned',
          isRetryable: true,
        },
      }
    }

    const taskStatus = queryData.data.status

    switch (taskStatus) {
      case 'done':
        const videoUrl = queryData.data.video_url

        if (!videoUrl) {
          return {
            status: 'ERROR',
            message: 'Task completed but no video URL returned',
            error: {
              code: 'NO_RESULTS',
              message: 'Task completed but no video URL returned',
              isRetryable: false,
            },
          }
        }

        const results: GenerationResult[] = [{
          type: 'video',
          url: videoUrl,
          metadata: {
            aigc_meta_tagged: queryData.data.aigc_meta_tagged,
          },
        }]

        this.log('info', `Video generation completed: ${videoUrl}`)

        return {
          status: 'SUCCESS',
          results,
          message: 'Video generation completed',
        }

      case 'in_queue':
      case 'generating':
        return {
          status: 'PROCESSING',
          progress: taskStatus === 'in_queue' ? 0.1 : 0.5,
          message: taskStatus === 'in_queue' ? 'Task in queue' : 'Generating video',
        }

      case 'not_found':
        return {
          status: 'ERROR',
          message: 'Task not found',
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Task not found or expired',
            isRetryable: false,
          },
        }

      case 'expired':
        return {
          status: 'ERROR',
          message: 'Task expired',
          error: {
            code: 'TASK_EXPIRED',
            message: 'Task has expired (12 hours limit)',
            isRetryable: false,
          },
        }

      default:
        return {
          status: 'ERROR',
          message: `Unknown task status: ${taskStatus}`,
          error: {
            code: 'UNKNOWN_STATUS',
            message: `Unknown task status: ${taskStatus}`,
            isRetryable: true,
          },
        }
    }
  }

  /**
   * 判断错误码是否可重试
   */
  private isRetryableError(code: number): boolean {
    const retryableCodes = [
      50511, // 输出图片后审核未通过（可重试）
      50429, // QPS超限
      50430, // 并发超限
      50500, // 内部错误
      50501, // 内部算法错误
    ]
    return retryableCodes.includes(code)
  }
}
