/**
 * JimengTextToImageV31Adapter - 即梦AI 文生图3.1
 *
 * 对应模型: jimeng-text-to-image-v31
 * 功能: 文生图3.1（画面效果呈现升级，在画面美感塑造、风格精准多样及画面细节丰富度方面提升显著）
 * 供应商: 火山引擎即梦AI
 * API文档: https://www.volcengine.com/docs/visual/文生图3.1
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'
import { generateVolcengineSignature } from '../utils/volcengine-signer'

/**
 * 即梦AI API响应接口 - 提交任务
 */
interface SubmitTaskResponse {
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
 * 即梦AI API响应接口 - 查询任务
 */
interface QueryTaskResponse {
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

export class JimengTextToImageV31Adapter extends BaseAdapter {
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

    this.log('error', 'Invalid API key format. Supported formats: 1) Database fields: apiKeyId + apiKeySecret, 2) Env vars: AI_PROVIDER_JIMENG_ACCESS_KEY_ID + AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY, 3) JSON: {"accessKeyId":"xxx","secretAccessKey":"xxx"}, 4) Colon-separated: accessKeyId:secretAccessKey')
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

          // 从config.params获取query参数
          const query: Record<string, string> = config.params || {}

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
   * 调度生成请求（提交任务）
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
            message: 'Volcengine Access Key ID and Secret Access Key are required. Configure via: 1) Env vars: AI_PROVIDER_JIMENG_ACCESS_KEY_ID + AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY, 2) Database apiKey field (JSON or colon-separated format)',
            isRetryable: false,
          },
        }
      }

      // 构建请求参数
      const payload: Record<string, unknown> = {
        req_key: 'jimeng_t2i_v31',
        prompt: request.prompt,
      }

      // 可选参数
      const params = request.parameters || {}

      // 开启文本扩写（默认true）
      if (params.use_pre_llm !== undefined) {
        payload.use_pre_llm = params.use_pre_llm
      }

      // 随机种子（默认-1表示随机）
      if (params.seed !== undefined) {
        payload.seed = params.seed
      }

      // 图像尺寸（需同时传width和height才会生效）
      if (params.width !== undefined && params.height !== undefined) {
        payload.width = params.width
        payload.height = params.height
      }

      this.log('info', 'Creating Jimeng AI T2I v3.1 task', {
        prompt: request.prompt.substring(0, 100),
        width: payload.width,
        height: payload.height,
      })

      // 提交任务
      const endpoint = this.getApiEndpoint() || 'https://visual.volcengineapi.com'
      const submitResponse = await this.httpClient.post<SubmitTaskResponse>(
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

      // 检查业务错误码
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
            message: 'API returned no task_id',
            isRetryable: false,
          },
        }
      }

      const taskId = submitData.data.task_id
      this.log('info', `Jimeng T2I v3.1 task submitted: ${taskId}`)

      // 返回异步任务ID
      return {
        status: 'PROCESSING',
        providerTaskId: taskId,
        message: 'Task submitted successfully',
      }
    } catch (error: unknown) {
      this.log('error', 'Jimeng T2I v3.1 dispatch failed', error)

      // 处理axios错误
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { status?: number; data?: SubmitTaskResponse }
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
   * 查询任务结果
   */
  async query(taskId: string): Promise<AdapterResponse> {
    try {
      const credentials = this.getVolcengineCredentials()
      if (!credentials) {
        return {
          status: 'ERROR',
          message: 'Missing or invalid Volcengine credentials',
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Volcengine credentials are required',
            isRetryable: false,
          },
        }
      }

      this.log('info', `Querying Jimeng T2I v3.1 task: ${taskId}`)

      // 查询任务结果
      const endpoint = this.getApiEndpoint() || 'https://visual.volcengineapi.com'
      const queryResponse = await this.httpClient.post<QueryTaskResponse>(
        '/',
        {
          req_key: 'jimeng_t2i_v31',
          task_id: taskId,
          req_json: JSON.stringify({
            return_url: true,
          }),
        },
        {
          baseURL: endpoint,
          params: {
            Action: 'CVSync2AsyncGetResult',
            Version: '2022-08-31',
          },
        }
      )

      const queryData = queryResponse.data

      // 检查业务错误码
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
          message: 'No data in response',
          error: {
            code: 'NO_DATA',
            message: 'API returned no data',
            isRetryable: false,
          },
        }
      }

      const taskStatus = queryData.data.status

      // 处理不同的任务状态
      if (taskStatus === 'in_queue' || taskStatus === 'generating') {
        return {
          status: 'PROCESSING',
          providerTaskId: taskId,
          message: `Task is ${taskStatus}`,
        }
      }

      if (taskStatus === 'not_found') {
        return {
          status: 'ERROR',
          message: 'Task not found',
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Task not found, possibly invalid task_id or task has expired',
            isRetryable: false,
          },
        }
      }

      if (taskStatus === 'expired') {
        return {
          status: 'ERROR',
          message: 'Task expired',
          error: {
            code: 'TASK_EXPIRED',
            message: 'Task has expired (12 hours), please resubmit',
            isRetryable: false,
          },
        }
      }

      if (taskStatus === 'done') {
        // 任务完成，提取结果
        const imageUrls = queryData.data.image_urls || []
        const base64Images = queryData.data.binary_data_base64 || []

        if (imageUrls.length === 0 && base64Images.length === 0) {
          return {
            status: 'ERROR',
            message: 'No images generated',
            error: {
              code: 'NO_RESULTS',
              message: 'API returned no images',
              isRetryable: false,
            },
          }
        }

        // 构建结果
        const results: GenerationResult[] = []

        // 优先使用URL（链接有效期为24小时）
        for (const url of imageUrls) {
          results.push({
            type: 'image',
            url,
          })
        }

        // 如果没有URL，使用base64
        if (results.length === 0 && base64Images) {
          for (const base64 of base64Images) {
            results.push({
              type: 'image',
              url: `data:image/png;base64,${base64}`,
            })
          }
        }

        this.log('info', `Jimeng T2I v3.1 generation completed: ${results.length} images`)

        return {
          status: 'SUCCESS',
          results,
          message: 'Generation completed',
        }
      }

      // 未知状态
      return {
        status: 'ERROR',
        message: `Unknown task status: ${taskStatus}`,
        error: {
          code: 'UNKNOWN_STATUS',
          message: `Unknown task status: ${taskStatus}`,
          isRetryable: false,
        },
      }
    } catch (error: unknown) {
      this.log('error', 'Jimeng T2I v3.1 query failed', error)

      // 处理axios错误
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { status?: number; data?: QueryTaskResponse }
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
          code: 'QUERY_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }

  /**
   * 判断错误码是否可重试
   * 根据API文档的错误码表
   */
  private isRetryableError(code: number): boolean {
    const retryableCodes = [
      50511, // Post Img Risk Not Pass（输出图片后审核未通过）- 可重试
      50429, // QPS超限
      50430, // 并发超限
    ]
    return retryableCodes.includes(code)
  }
}
