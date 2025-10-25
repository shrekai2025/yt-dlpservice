/**
 * 即梦数字人API客户端
 * 封装三个步骤的API调用：
 * 1. 主体识别 (Face Recognition)
 * 2. 主体检测 (Subject Detection)
 * 3. 视频生成 (Video Generation)
 */

import axios, { type AxiosInstance } from 'axios'
import { generateVolcengineSignature } from '@/lib/ai-generation/adapters/utils/volcengine-signer'

/**
 * 火山引擎凭证
 */
export interface VolcengineCredentials {
  accessKeyId: string
  secretAccessKey: string
}

/**
 * 凭证来源配置（用于从数据库传递）
 */
export interface CredentialsSource {
  apiKeyId?: string | null
  apiKeySecret?: string | null
  apiKey?: string | null
}

/**
 * 获取凭证的函数
 * 支持多种配置方式（按优先级）：
 * 1. 传入的 source 参数（数据库配置）
 * 2. 环境变量: AI_PROVIDER_JIMENG_ACCESS_KEY_ID 和 AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY
 */
export function getVolcengineCredentials(source?: CredentialsSource): VolcengineCredentials | null {
  // 方式1: 优先使用传入的数据库凭证
  if (source?.apiKeyId && source?.apiKeySecret) {
    return {
      accessKeyId: source.apiKeyId,
      secretAccessKey: source.apiKeySecret,
    }
  }

  // 方式2: 尝试从 apiKey 字段解析（JSON格式或冒号分隔）
  if (source?.apiKey) {
    const apiKey = source.apiKey

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
      } catch {
        // 忽略解析错误，继续尝试其他格式
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
  }

  // 方式3: 使用环境变量
  const accessKeyId = process.env.AI_PROVIDER_JIMENG_ACCESS_KEY_ID
  const secretAccessKey = process.env.AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    return null
  }

  return { accessKeyId, secretAccessKey }
}

/**
 * 基础响应类型
 */
interface BaseResponse {
  code: number
  message: string
  request_id: string
  status: number
  time_elapsed: string
}

/**
 * 提交任务响应
 */
interface SubmitTaskResponse extends BaseResponse {
  data?: {
    task_id: string
  }
}

/**
 * 主体识别结果
 */
export interface FaceRecognitionResult {
  status: 0 | 1 // 0: 不包含主体, 1: 包含主体
}

/**
 * 主体识别查询响应
 */
interface FaceRecognitionQueryResponse extends BaseResponse {
  data?: {
    resp_data: string // JSON字符串: {status: 0|1}
    status: 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired'
  }
}

/**
 * 主体检测结果
 */
export interface SubjectDetectionResult {
  status: 0 | 1 // 0: 不包含主体, 1: 包含主体
  maskUrls: string[] // mask图URL列表
}

/**
 * 主体检测响应
 */
interface SubjectDetectionResponse extends BaseResponse {
  data?: {
    resp_data: string // JSON字符串
  }
}

/**
 * 视频生成结果
 */
export interface VideoGenerationResult {
  videoUrl?: string
  aigcMetaTagged?: boolean
  status: 'processing' | 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired'
}

/**
 * 视频生成查询响应
 */
interface VideoGenerationQueryResponse extends BaseResponse {
  data?: {
    video_url?: string
    aigc_meta_tagged?: boolean
    status: 'processing' | 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired'
  }
}

/**
 * 即梦数字人API客户端
 */
export class JimengDigitalHumanClient {
  private readonly baseURL = 'https://visual.volcengineapi.com'
  private readonly httpClient: AxiosInstance
  private readonly credentials: VolcengineCredentials

  constructor(credentialsOrSource?: VolcengineCredentials | CredentialsSource) {
    let creds: VolcengineCredentials | null = null

    // 检查传入的是完整凭证还是凭证来源
    if (credentialsOrSource) {
      if ('accessKeyId' in credentialsOrSource && 'secretAccessKey' in credentialsOrSource) {
        // 传入的是完整凭证
        creds = credentialsOrSource as VolcengineCredentials
      } else {
        // 传入的是凭证来源（数据库配置），尝试解析
        creds = getVolcengineCredentials(credentialsOrSource as CredentialsSource)
      }
    } else {
      // 未传入任何参数，尝试从环境变量获取
      creds = getVolcengineCredentials()
    }

    if (!creds) {
      throw new Error(
        'Volcengine credentials are required for Digital Human API. ' +
        'Please configure via: 1) Database provider fields (apiKeyId + apiKeySecret), ' +
        '2) Environment variables (AI_PROVIDER_JIMENG_ACCESS_KEY_ID + AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY), ' +
        '3) Database apiKey field (JSON or colon-separated format)'
      )
    }

    this.credentials = creds
    this.httpClient = this.createHttpClient()
  }

  /**
   * 创建HTTP客户端，自动添加签名
   */
  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // 拦截请求，动态添加签名
    client.interceptors.request.use((config) => {
      try {
        const body = typeof config.data === 'string'
          ? config.data
          : JSON.stringify(config.data || {})

        // 从config.params获取query参数
        const query: Record<string, string> = config.params || {}

        const signature = generateVolcengineSignature({
          accessKeyId: this.credentials.accessKeyId,
          secretAccessKey: this.credentials.secretAccessKey,
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
        Object.assign(config.headers, signature)
      } catch (error) {
        console.error('[DigitalHuman Client] Failed to sign request:', error)
      }
      return config
    })

    return client
  }

  /**
   * 步骤1: 提交主体识别任务
   */
  async submitFaceRecognition(imageUrl: string): Promise<string> {
    const response = await this.httpClient.post<SubmitTaskResponse>(
      '/',
      {
        req_key: 'jimeng_realman_avatar_picture_create_role_omni_v15',
        image_url: imageUrl,
      },
      {
        params: {
          Action: 'CVSubmitTask',
          Version: '2022-08-31',
        },
      }
    )

    const data = response.data
    if (data.code !== 10000 || !data.data?.task_id) {
      throw new Error(data.message || 'Failed to submit face recognition task')
    }

    return data.data.task_id
  }

  /**
   * 步骤1: 查询主体识别结果
   */
  async queryFaceRecognition(taskId: string): Promise<FaceRecognitionResult | null> {
    const response = await this.httpClient.post<FaceRecognitionQueryResponse>(
      '/',
      {
        req_key: 'jimeng_realman_avatar_picture_create_role_omni_v15',
        task_id: taskId,
      },
      {
        params: {
          Action: 'CVGetResult',
          Version: '2022-08-31',
        },
      }
    )

    const data = response.data
    if (data.code !== 10000) {
      throw new Error(data.message || 'Failed to query face recognition task')
    }

    if (!data.data) {
      throw new Error('No data in response')
    }

    const taskStatus = data.data.status

    // 如果任务还在处理中，返回null
    if (taskStatus === 'in_queue' || taskStatus === 'generating') {
      return null
    }

    // 如果任务完成
    if (taskStatus === 'done') {
      const respData = JSON.parse(data.data.resp_data)
      return {
        status: respData.status,
      }
    }

    // 任务未找到或过期
    if (taskStatus === 'not_found') {
      throw new Error('Task not found')
    }
    if (taskStatus === 'expired') {
      throw new Error('Task expired')
    }

    throw new Error(`Unknown task status: ${taskStatus}`)
  }

  /**
   * 步骤2: 主体检测（同步接口）
   */
  async detectSubjects(imageUrl: string): Promise<SubjectDetectionResult> {
    const response = await this.httpClient.post<SubjectDetectionResponse>(
      '/',
      {
        req_key: 'jimeng_realman_avatar_object_detection',
        image_url: imageUrl,
      },
      {
        params: {
          Action: 'CVProcess',
          Version: '2022-08-31',
        },
      }
    )

    const data = response.data
    if (data.code !== 10000) {
      throw new Error(data.message || 'Failed to detect subjects')
    }

    if (!data.data?.resp_data) {
      throw new Error('No data in response')
    }

    const respData = JSON.parse(data.data.resp_data)

    return {
      status: respData.status,
      maskUrls: respData.object_detection_result?.mask?.url || [],
    }
  }

  /**
   * 步骤3: 提交视频生成任务
   */
  async submitVideoGeneration(params: {
    imageUrl: string
    audioUrl: string
    maskUrls?: string[]
    prompt?: string
    seed?: number
    peFastMode?: boolean
  }): Promise<string> {
    const payload: Record<string, unknown> = {
      req_key: 'jimeng_realman_avatar_picture_omni_v15',
      image_url: params.imageUrl,
      audio_url: params.audioUrl,
    }

    if (params.maskUrls && params.maskUrls.length > 0) {
      payload.mask_url = params.maskUrls
    }
    if (params.prompt) {
      payload.prompt = params.prompt
    }
    if (params.seed !== undefined) {
      payload.seed = params.seed
    }
    if (params.peFastMode !== undefined) {
      payload.pe_fast_mode = params.peFastMode
    }

    const response = await this.httpClient.post<SubmitTaskResponse>(
      '/',
      payload,
      {
        params: {
          Action: 'CVSubmitTask',
          Version: '2022-08-31',
        },
      }
    )

    const data = response.data
    if (data.code !== 10000 || !data.data?.task_id) {
      throw new Error(data.message || 'Failed to submit video generation task')
    }

    return data.data.task_id
  }

  /**
   * 步骤3: 查询视频生成结果
   */
  async queryVideoGeneration(taskId: string): Promise<VideoGenerationResult | null> {
    const response = await this.httpClient.post<VideoGenerationQueryResponse>(
      '/',
      {
        req_key: 'jimeng_realman_avatar_picture_omni_v15',
        task_id: taskId,
      },
      {
        params: {
          Action: 'CVGetResult',
          Version: '2022-08-31',
        },
      }
    )

    const data = response.data
    if (data.code !== 10000) {
      throw new Error(data.message || 'Failed to query video generation task')
    }

    if (!data.data) {
      throw new Error('No data in response')
    }

    const taskStatus = data.data.status

    // 如果任务还在处理中，返回null表示继续轮询
    if (taskStatus === 'processing' || taskStatus === 'in_queue' || taskStatus === 'generating') {
      return {
        status: taskStatus,
      }
    }

    // 如果任务完成
    if (taskStatus === 'done') {
      return {
        videoUrl: data.data.video_url,
        aigcMetaTagged: data.data.aigc_meta_tagged,
        status: taskStatus,
      }
    }

    // 任务未找到或过期
    if (taskStatus === 'not_found') {
      throw new Error('Task not found')
    }
    if (taskStatus === 'expired') {
      throw new Error('Task expired')
    }

    throw new Error(`Unknown task status: ${taskStatus}`)
  }
}
