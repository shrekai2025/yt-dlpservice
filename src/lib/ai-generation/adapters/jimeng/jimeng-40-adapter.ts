/**
 * Jimeng40Adapter - 即梦AI 4.0 图像生成
 *
 * 对应模型: jimeng-4.0
 * 功能: 文生图、图生图、图像编辑、多图组合
 * 供应商: 火山引擎即梦AI
 * API文档: https://www.volcengine.com/docs/85621/1537648
 *
 * 特性:
 * - 支持单次输入最多10张图像
 * - 支持复合编辑
 * - 自动适配最优比例尺寸
 * - 一次性输出最多15张图像
 * - 支持4K超高清输出
 * - 异步任务模式（提交任务+轮询结果）
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
interface JimengSubmitTaskResponse {
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
interface JimengQueryTaskResponse {
  code: number
  message: string
  request_id: string
  status: number
  time_elapsed: string
  data?: {
    binary_data_base64: string[] | null
    image_urls: string[]
    status: 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired'
  }
}

export class Jimeng40Adapter extends BaseAdapter {
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

    // 尝试解析JSON格式
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

    // 尝试解析冒号分隔格式
    if (apiKey.includes(':')) {
      const [accessKeyId, secretAccessKey] = apiKey.split(':')
      if (accessKeyId && secretAccessKey) {
        return {
          accessKeyId,
          secretAccessKey,
        }
      }
    }

    this.log('error', 'Invalid API key format')
    return null
  }

  /**
   * 创建HTTP客户端（覆盖基类方法以支持动态签名）
   */
  protected createHttpClient() {
    const client = super.createHttpClient()

    // 拦截请求，动态添加签名
    client.interceptors.request.use((config) => {
      const credentials = this.getVolcengineCredentials()
      if (credentials) {
        try {
          // 获取请求体
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

          // 添加签名头
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
   * 调度生成请求（提交异步任务）
   */
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    try {
      const credentials = this.getVolcengineCredentials()

      // Debug logging
      this.log('info', 'Provider config:', {
        slug: this.config.provider.slug,
        hasApiKey: !!this.config.provider.apiKey,
        hasApiKeyId: !!this.config.provider.apiKeyId,
        hasApiKeySecret: !!this.config.provider.apiKeySecret,
        apiKeyFormat: this.config.provider.apiKey?.substring(0, 20),
      })
      this.log('info', 'Retrieved credentials:', {
        hasCredentials: !!credentials,
        accessKeyId: credentials?.accessKeyId?.substring(0, 10),
      })

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

      // 构建请求参数
      const payload: Record<string, unknown> = {
        req_key: 'jimeng_t2i_v40',
        prompt: request.prompt,
      }

      // 输入图片
      if (request.inputImages && request.inputImages.length > 0) {
        payload.image_urls = request.inputImages.slice(0, 10) // 最多10张
      }

      // 可选参数
      const params = request.parameters || {}

      if (params.size !== undefined) {
        payload.size = params.size
      }
      if (params.width !== undefined && params.height !== undefined) {
        payload.width = params.width
        payload.height = params.height
      }
      if (params.scale !== undefined) {
        payload.scale = params.scale
      }
      if (params.force_single !== undefined) {
        payload.force_single = params.force_single
      }
      if (params.min_ratio !== undefined) {
        payload.min_ratio = params.min_ratio
      }
      if (params.max_ratio !== undefined) {
        payload.max_ratio = params.max_ratio
      }

      this.log('info', 'Submitting Jimeng 4.0 task', {
        prompt: request.prompt.substring(0, 100),
        inputImages: request.inputImages?.length || 0,
      })

      // 提交任务
      const endpoint = this.getApiEndpoint() || 'https://visual.volcengineapi.com'
      const submitResponse = await this.httpClient.post<JimengSubmitTaskResponse>(
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

      // 检查提交是否成功
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
      this.log('info', `Task submitted successfully: ${taskId}`)

      // 返回PROCESSING状态，需要轮询
      return {
        status: 'PROCESSING',
        providerTaskId: taskId,
        message: 'Task submitted, polling required',
      }
    } catch (error: unknown) {
      this.log('error', 'Jimeng 4.0 dispatch failed', error)

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { status?: number; data?: JimengSubmitTaskResponse }
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

      // 构建查询请求
      // req_json用于配置水印和返回URL
      const reqJson = {
        return_url: true,
        logo_info: {
          add_logo: false,
        },
      }

      const payload = {
        req_key: 'jimeng_t2i_v40',
        task_id: taskId,
        req_json: JSON.stringify(reqJson),
      }

      this.log('info', `Checking task status: ${taskId}`)

      const endpoint = this.getApiEndpoint() || 'https://visual.volcengineapi.com'
      const queryResponse = await this.httpClient.post<JimengQueryTaskResponse>(
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

      // 检查查询请求是否成功
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

      // 根据任务状态返回
      switch (taskStatus) {
        case 'done':
          // 任务完成
          const imageUrls = queryData.data.image_urls || []
          const base64Images = queryData.data.binary_data_base64 || []

          if (imageUrls.length === 0 && base64Images.length === 0) {
            return {
              status: 'ERROR',
              message: 'Task completed but no images returned',
              error: {
                code: 'NO_RESULTS',
                message: 'Task completed but no images returned',
                isRetryable: false,
              },
            }
          }

          // 构建结果
          const results: GenerationResult[] = []

          // 优先使用URL
          for (const url of imageUrls) {
            results.push({
              type: 'image',
              url,
            })
          }

          // 如果没有URL，使用base64
          if (results.length === 0) {
            for (const base64 of base64Images) {
              results.push({
                type: 'image',
                url: `data:image/jpeg;base64,${base64}`,
              })
            }
          }

          this.log('info', `Task completed: ${results.length} images generated`)

          return {
            status: 'SUCCESS',
            results,
            message: 'Generation completed',
          }

        case 'in_queue':
        case 'generating':
          // 仍在处理中
          return {
            status: 'PROCESSING',
            progress: taskStatus === 'in_queue' ? 0.1 : 0.5,
            message: taskStatus === 'in_queue' ? 'Task in queue' : 'Generating',
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
    } catch (error: unknown) {
      this.log('error', 'Status check failed', error)

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
