/**
 * JimengTextToImageAdapter - 即梦AI 文生图2.1
 *
 * 对应模型: jimeng-text-to-image-v21
 * 功能: 文生图（高质量）
 * 供应商: 火山引擎即梦AI
 * API文档: https://www.volcengine.com/docs/85621/1537648
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'
import { generateVolcengineSignature } from '../utils/volcengine-signer'

/**
 * 即梦AI API响应接口
 */
interface JimengResponse {
  code: number
  message: string
  request_id: string
  status: number
  time_elapsed: string
  data?: {
    algorithm_base_resp: {
      status_code: number
      status_message: string
    }
    binary_data_base64: string[]
    image_urls: string[]
    llm_result?: string
    rephraser_result?: string
  }
}

export class JimengTextToImageAdapter extends BaseAdapter {
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
   * 获取认证头（使用火山引擎签名）
   */
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    const credentials = this.getVolcengineCredentials()

    if (!credentials) {
      return {
        'Content-Type': 'application/json',
      }
    }

    try {
      const signature = generateVolcengineSignature({
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        service: 'cv',
        region: 'cn-north-1',
        method: 'POST',
        path: '/',
        query: {
          Action: 'CVProcess',
          Version: '2022-08-31',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      })

      return {
        ...signature,
        'Content-Type': 'application/json',
      }
    } catch (error) {
      this.log('error', 'Failed to generate Volcengine signature', error)
      return {
        'Content-Type': 'application/json',
      }
    }
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

          const signature = generateVolcengineSignature({
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            service: 'cv',
            region: 'cn-north-1',
            method: 'POST',
            path: '/',
            query: {
              Action: 'CVProcess',
              Version: '2022-08-31',
            },
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
   * 调度生成请求
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
        req_key: 'jimeng_high_aes_general_v21_L',
        prompt: request.prompt,
        return_url: true,
      }

      // 可选参数
      const params = request.parameters || {}

      // 种子（随机种子）
      if (params.seed !== undefined) {
        payload.seed = params.seed
      }

      // 图像尺寸
      if (params.width) {
        payload.width = params.width
      }
      if (params.height) {
        payload.height = params.height
      }

      // 文本扩写
      if (params.use_pre_llm !== undefined) {
        payload.use_pre_llm = params.use_pre_llm
      }

      // 超分
      if (params.use_sr !== undefined) {
        payload.use_sr = params.use_sr
      }

      // 水印配置
      if (params.add_logo !== undefined) {
        payload.logo_info = {
          add_logo: params.add_logo,
          position: params.logo_position || 0,
          language: params.logo_language || 0,
          opacity: params.logo_opacity || 1,
          logo_text_content: params.logo_text_content || '',
        }
      }

      // AIGC隐式标识
      if (params.producer_id) {
        payload.aigc_meta = {
          content_producer: params.content_producer || '',
          producer_id: params.producer_id,
          content_propagator: params.content_propagator || '',
          propagate_id: params.propagate_id || '',
        }
      }

      this.log('info', 'Creating Jimeng AI text-to-image task', {
        prompt: request.prompt.substring(0, 100),
        width: payload.width,
        height: payload.height,
      })

      // 调用即梦AI API
      const endpoint = this.getApiEndpoint() || 'https://visual.volcengineapi.com'
      const response = await this.httpClient.post<JimengResponse>(
        '/',
        payload,
        {
          baseURL: endpoint,
          params: {
            Action: 'CVProcess',
            Version: '2022-08-31',
          },
        }
      )

      const data = response.data

      // 检查业务错误码
      if (data.code !== 10000 || data.status !== 10000) {
        // 判断是否可重试
        const isRetryable = this.isRetryableError(data.code)

        return {
          status: 'ERROR',
          message: data.message || 'Generation failed',
          error: {
            code: String(data.code),
            message: data.message,
            isRetryable,
            details: data,
          },
        }
      }

      // 检查算法响应
      if (
        !data.data ||
        data.data.algorithm_base_resp.status_code !== 0
      ) {
        return {
          status: 'ERROR',
          message: data.data?.algorithm_base_resp.status_message || 'Algorithm error',
          error: {
            code: 'ALGORITHM_ERROR',
            message: data.data?.algorithm_base_resp.status_message || 'Algorithm error',
            isRetryable: false,
          },
        }
      }

      // 处理成功响应
      const imageUrls = data.data.image_urls || []
      const base64Images = data.data.binary_data_base64 || []

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

      // 优先使用URL
      for (const url of imageUrls) {
        results.push({
          type: 'image',
          url,
          metadata: {
            llm_result: data.data.llm_result,
            rephraser_result: data.data.rephraser_result,
          },
        })
      }

      // 如果没有URL，使用base64
      if (results.length === 0) {
        for (const base64 of base64Images) {
          results.push({
            type: 'image',
            url: `data:image/jpeg;base64,${base64}`,
            metadata: {
              llm_result: data.data.llm_result,
              rephraser_result: data.data.rephraser_result,
            },
          })
        }
      }

      this.log('info', `Jimeng AI generation completed: ${results.length} images`)

      return {
        status: 'SUCCESS',
        results,
        message: 'Generation completed',
      }
    } catch (error: unknown) {
      this.log('error', 'Jimeng AI dispatch failed', error)

      // 处理axios错误
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: { status?: number; data?: JimengResponse }
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
