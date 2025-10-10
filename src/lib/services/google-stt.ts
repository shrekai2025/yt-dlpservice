import * as fs from 'fs/promises'
import axios, { type AxiosRequestConfig } from 'axios'
import { Logger } from '~/lib/utils/logger'
import { ConfigManager } from '~/lib/utils/config'
import { env } from '~/env.js'
import { validateAudioFile, getAudioFileInfo } from '~/lib/services/audio-utils'
// 定义服务状态和诊断结果类型
interface ServiceStatus {
  available: boolean
  message: string
}

interface DiagnosisResult {
  success: boolean
  message: string
  details: {
    configCheck: boolean
    credentialsCheck: boolean
    authCheck: boolean
    apiConnectivity: boolean
    suggestions: string[]
  }
}

interface GoogleCredentials {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

// V1配置接口（已废弃）
interface V1RecognitionConfig {
  encoding: string
  sampleRateHertz: number
  audioChannelCount: number
  languageCode: string
  alternativeLanguageCodes: string[]
  enableAutomaticPunctuation: boolean
  model: string
}

// V2配置接口
interface V2RecognitionConfig {
  model: string
  languageCodes: string[]
  autoDecodingConfig?: Record<string, never>  // 空对象表示自动检测编码，Google V2 API会自动处理
  features?: {
    enableAutomaticPunctuation?: boolean
    maxAlternatives?: number
  }
}

// 兼容性别名
type RecognitionConfig = V2RecognitionConfig

// V2音频输入接口
interface V2RecognitionAudio {
  content?: string  // Base64编码的音频数据（同步识别）
  uri?: string      // GCS URI（异步识别）
}

// 兼容性别名
type RecognitionAudio = V2RecognitionAudio

// V2同步识别请求
interface V2RecognizeRequest {
  recognizer: string
  config: V2RecognitionConfig
  content: string  // 直接传入Base64音频数据
}

// 兼容性别名
type SyncRecognitionRequest = V2RecognizeRequest

// V2批量识别文件元数据
interface V2BatchRecognizeFileMetadata {
  uri: string
}

// V2批量识别请求
interface V2BatchRecognizeRequest {
  recognizer: string
  config: V2RecognitionConfig
  files: V2BatchRecognizeFileMetadata[]
  recognitionOutputConfig: {
    inlineResponseConfig?: Record<string, never>
    gcsOutputConfig?: {
      uri: string
    }
  }
  processingStrategy?: string
}

// 兼容性别名
type LongRunningRecognitionRequest = V2BatchRecognizeRequest

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  alternatives: SpeechRecognitionAlternative[]
  languageCode?: string
}

// V2同步识别响应
interface V2RecognizeResponse {
  results: SpeechRecognitionResult[]
  totalBilledTime?: string
  requestId?: string
  metadata?: {
    totalBilledDuration?: string
  }
}

// V2批量识别结果
interface V2BatchRecognizeResults {
  results: SpeechRecognitionResult[]
  totalBilledTime?: string
  requestId?: string
}

// V2批量识别响应
interface V2BatchRecognizeResponse {
  results: { [audioUri: string]: {
    uri?: string
    transcript?: V2BatchRecognizeResults
  }}
  totalBilledTime?: string
  requestId?: string
}

// 兼容性别名
type SyncRecognitionResponse = V2RecognizeResponse

// V2操作接口
interface V2Operation {
  name: string
  done: boolean
  error?: {
    code: number
    message: string
    details?: any[]
  }
  response?: V2BatchRecognizeResponse
  metadata?: {
    progressPercent?: number
    startTime?: string
    lastUpdateTime?: string
  }
}

// 兼容性别名
type Operation = V2Operation

/**
 * Google Speech-to-Text 服务类（V2 API）
 * 
 * 功能特性：
 * - 智能同步/异步选择（10MB和60秒为界限）
 * - JWT认证（服务账户密钥）
 * - V2 API支持（recognizers:recognize / recognizers:batchRecognize）
 * - 多语言自动检测（chirp模型）
 * - 区域端点自动选择
 */
class GoogleSpeechService {
  private static instance: GoogleSpeechService
  private projectId: string = ''
  private location: string = 'asia-southeast1'
  private bucketName: string = ''
  private credentials: GoogleCredentials | null = null
  private accessToken: string | null = null
  private tokenExpiration: number = 0
  private currentLanguageCode: string = 'cmn-Hans-CN' // 当前使用的语言代码

  // V2 API区域端点配置
  private readonly V2_REGION_ENDPOINTS = {
    'asia-southeast1': 'https://asia-southeast1-speech.googleapis.com', // 中文支持
    'asia-northeast1': 'https://asia-northeast1-speech.googleapis.com', // 英日文支持
    'us-central1': 'https://us-central1-speech.googleapis.com',         // 全球支持
    'global': 'https://speech.googleapis.com'                          // 全球端点
  }
  
  // 区域-语言-模型映射
  private readonly REGION_LANGUAGE_MAP = {
    'asia-southeast1': {
      languages: ['cmn-Hans-CN', 'cmn-Hant-TW', 'yue-Hant-HK'],
      model: 'chirp_2', // V2 API chirp_2 模型支持中文
      description: '中文专用区域'
    },
    'asia-northeast1': {
      languages: ['en-US', 'ja-JP'],
      model: 'chirp_2', // V2 API chirp_2 模型支持英语和日语
      description: '英日文专用区域'
    },
    'us-central1': {
      languages: ['en-US', 'es-ES', 'fr-FR', 'de-DE'], // 更多语言
      model: 'chirp_2', // V2 API chirp_2 模型支持多语言
      description: '多语言支持区域'
    }
  }

  private constructor() {
    Logger.info('开始初始化Google Speech-to-Text服务...')
  }

  /**
   * 获取代理配置
   */
  private async getProxyConfig(): Promise<any> {
    // 使用 env.js 的转换后的值而不是 ConfigManager 的原始字符串
    const proxyEnabled = env.GOOGLE_API_PROXY_ENABLED // 这是布尔值
    const proxyHost = env.GOOGLE_API_PROXY_HOST       // 这可能是 undefined
    const proxyPort = env.GOOGLE_API_PROXY_PORT       // 这可能是 undefined
    
    // 添加详细的调试日志
    Logger.debug(`🔍 代理配置调试信息:`)
    Logger.debug(`  - env.GOOGLE_API_PROXY_ENABLED (布尔值): ${proxyEnabled} (类型: ${typeof proxyEnabled})`)
    Logger.debug(`  - env.GOOGLE_API_PROXY_HOST: ${proxyHost} (类型: ${typeof proxyHost})`)
    Logger.debug(`  - env.GOOGLE_API_PROXY_PORT: ${proxyPort} (类型: ${typeof proxyPort})`)
    Logger.debug(`  - process.env.GOOGLE_API_PROXY_ENABLED: ${process.env.GOOGLE_API_PROXY_ENABLED}`)
    Logger.debug(`  - process.env.GOOGLE_API_PROXY_HOST: ${process.env.GOOGLE_API_PROXY_HOST}`)
    Logger.debug(`  - process.env.GOOGLE_API_PROXY_PORT: ${process.env.GOOGLE_API_PROXY_PORT}`)
    
    if (!proxyEnabled) {
      Logger.debug(`🚫 代理已禁用，返回 false (GOOGLE_API_PROXY_ENABLED = ${proxyEnabled})`)
      return false
    }

    // 如果代理主机或端口为空，则不使用代理
    if (!proxyHost || !proxyPort) {
      Logger.debug(`🚫 代理主机或端口为空，返回 false`)
      return false
    }

    Logger.debug(`✅ 返回代理配置: ${proxyHost}:${proxyPort}`)
    return {
      host: proxyHost,
      port: proxyPort,
      protocol: 'http'
    }
  }

  /**
   * 上传文件到Google Cloud Storage
   */
  private async uploadToCloudStorage(audioPath: string): Promise<string> {
    try {
      const fileName = `audio-${Date.now()}-${Math.random().toString(36).substring(2)}.mp3`
      const gcsUri = `gs://${this.bucketName}/${fileName}`
      
      Logger.info(`📤 开始上传文件到Cloud Storage: ${fileName}`)
      
      // 读取音频文件
      const fileBuffer = await fs.readFile(audioPath)
      Logger.debug(`📊 文件大小: ${Math.round(fileBuffer.length / 1024 / 1024 * 100) / 100}MB`)
      
      const accessToken = await this.getAccessToken()
      const proxyConfig = await this.getProxyConfig()
      
      // 构建上传请求配置
      const uploadConfig: any = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'audio/mpeg',
          'Content-Length': fileBuffer.length.toString()
        },
        timeout: 300000, // 5分钟超时
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
      
      if (proxyConfig) {
        uploadConfig.proxy = proxyConfig
        Logger.debug(`🌐 使用代理上传: ${proxyConfig.host}:${proxyConfig.port}`)
      }
      
      // 上传到Google Cloud Storage (使用简单上传API)
      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${this.bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`
      
      Logger.debug(`📤 上传URL: ${uploadUrl}`)
      Logger.debug(`📤 存储桶: ${this.bucketName}`)
      Logger.debug(`📤 文件名: ${fileName}`)
      
      const startTime = Date.now()
      
      // 按照Google文档，使用POST方法进行媒体上传
      Logger.debug(`🚀 使用POST方法上传媒体文件`)
      await axios.post(uploadUrl, fileBuffer, uploadConfig)
      
      Logger.info(`🌐 文件上传到区域: ${this.location}`)
      
      const uploadDuration = Date.now() - startTime
      
      Logger.info(`✅ 文件上传成功: ${gcsUri}`)
      Logger.info(`⏱️ 上传耗时: ${uploadDuration}ms`)
      Logger.info(`📁 完整GCS URL: ${gcsUri}`)
      Logger.info(`🔗 可访问LINK: https://storage.googleapis.com/${this.bucketName}/${fileName}`)
      
      return gcsUri
      
    } catch (error: any) {
      Logger.error(`❌ Cloud Storage上传失败: ${error.message}`)
      if (error.response) {
        Logger.error(`  - HTTP状态: ${error.response.status}`)
        Logger.error(`  - 响应数据: ${JSON.stringify(error.response.data, null, 2)}`)
      }
      throw new Error(`Cloud Storage上传失败: ${error.message}`)
    }
  }

  /**
   * 删除Cloud Storage中的文件
   */
  private async deleteFromCloudStorage(gcsUri: string): Promise<void> {
    try {
      const fileName = gcsUri.replace(`gs://${this.bucketName}/`, '')
      Logger.debug(`🗑️ 清理Cloud Storage文件: ${fileName}`)
      
      const accessToken = await this.getAccessToken()
      const proxyConfig = await this.getProxyConfig()
      
      const deleteConfig: any = {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 30000
      }
      
      if (proxyConfig) {
        deleteConfig.proxy = proxyConfig
      }
      
      const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${this.bucketName}/o/${encodeURIComponent(fileName)}`
      await axios.delete(deleteUrl, deleteConfig)
      
      Logger.debug(`✅ Cloud Storage文件已删除: ${fileName}`)
      
    } catch (error: any) {
      Logger.warn(`⚠️ Cloud Storage文件删除失败: ${error.message}`)
      // 删除失败不影响主流程，只记录警告
    }
  }

  public static getInstance(): GoogleSpeechService {
    if (!GoogleSpeechService.instance) {
      GoogleSpeechService.instance = new GoogleSpeechService()
    }
    return GoogleSpeechService.instance
  }

  /**
   * 初始化服务配置
   */
  private async initialize(): Promise<void> {
    if (this.projectId) {
      Logger.debug('Google Speech服务已初始化')
      return
    }

    try {
      // 加载配置
      const projectId = await ConfigManager.get('GOOGLE_STT_PROJECT_ID')
      const credentialsPath = await ConfigManager.get('GOOGLE_STT_CREDENTIALS_PATH')
      const location = await ConfigManager.get('GOOGLE_STT_LOCATION')
      const bucketName = await ConfigManager.get('GOOGLE_STT_BUCKET_NAME')

      this.location = location || 'global'
      this.bucketName = bucketName || ''

      Logger.info(`Google STT配置状态:`)
      Logger.info(`  - 项目ID: ${projectId ? `${projectId.substring(0, 8)}...` : '未配置'}`)
      Logger.info(`  - 凭据文件: ${credentialsPath || '未配置'}`)
      Logger.info(`  - 位置: ${this.location}`)
      Logger.info(`  - 存储桶: ${this.bucketName || '未配置'}`)

      if (!projectId || !credentialsPath) {
        Logger.error('❌ Google Speech-to-Text API配置不完整，服务不可用！')
        Logger.error('请配置 GOOGLE_STT_PROJECT_ID 和 GOOGLE_STT_CREDENTIALS_PATH')
        return
      }

      if (!this.bucketName) {
        Logger.warn('⚠️ Google Cloud Storage存储桶未配置，大文件(>=10MB)将无法处理')
        Logger.warn('请配置 GOOGLE_STT_BUCKET_NAME 以支持大文件转录')
      }

      // 加载服务账户凭据
      await this.loadCredentials(credentialsPath)
      this.projectId = projectId

      if (this.credentials) {
        Logger.info('✅ Google Speech-to-Text API配置完成')
        
        // 测试网络连接
        Logger.debug('🌐 测试Google API网络连通性...')
        try {
          const testStart = Date.now()
          const proxyConfig = await this.getProxyConfig()
          const testRequestConfig: any = {
            timeout: 5000,
            validateStatus: () => true // 接受任何状态码
          }

          if (proxyConfig) {
            testRequestConfig.proxy = proxyConfig
          }

          const response = await axios.get('https://www.googleapis.com', testRequestConfig)
          const connectTime = Date.now() - testStart
          Logger.debug(`✅ Google API网络连通正常，延迟: ${connectTime}ms`)
          Logger.debug(`  - 状态码: ${response.status}`)
        } catch (networkError: any) {
          Logger.warn(`⚠️ Google API网络连接测试失败: ${networkError.message}`)
          Logger.warn(`  - 这可能会影响后续的认证和API调用`)
          if (networkError.code === 'ENOTFOUND') {
            Logger.warn(`  - DNS解析失败，请检查网络连接`)
          } else if (networkError.code === 'ECONNREFUSED') {
            Logger.warn(`  - 连接被拒绝，可能是网络防火墙问题`)
          } else if (networkError.code === 'ETIMEDOUT') {
            Logger.warn(`  - 连接超时，网络延迟较高`)
          }
        }
      }

    } catch (error: any) {
      Logger.error(`Google Speech服务初始化失败: ${error.message}`)
      throw new Error(`Google Speech服务初始化失败: ${error.message}`)
    }
  }

  /**
   * 加载Google服务账户凭据
   */
  private async loadCredentials(credentialsPath: string): Promise<void> {
    try {
      Logger.debug(`📁 尝试读取凭据文件: ${credentialsPath}`)
      
      // 检查文件是否存在
      try {
        await fs.access(credentialsPath)
        Logger.debug(`✅ 凭据文件存在`)
      } catch (accessError) {
        throw new Error(`凭据文件不存在: ${credentialsPath}`)
      }
      
      const credentialsContent = await fs.readFile(credentialsPath, 'utf-8')
      Logger.debug(`📄 凭据文件读取成功，内容长度: ${credentialsContent.length}字符`)
      
      // 解析JSON
      let parsedCredentials: any
      try {
        parsedCredentials = JSON.parse(credentialsContent)
        Logger.debug(`✅ JSON解析成功`)
      } catch (parseError) {
        throw new Error(`凭据文件JSON格式错误: ${parseError}`)
      }
      
      this.credentials = parsedCredentials as GoogleCredentials
      
      Logger.debug(`✅ Google服务账户凭据加载成功: ${this.credentials.client_email}`)
      Logger.debug(`📋 凭据信息:`)
      Logger.debug(`  - 类型: ${this.credentials.type}`)
      Logger.debug(`  - 项目ID: ${this.credentials.project_id}`)
      Logger.debug(`  - 客户端邮箱: ${this.credentials.client_email}`)
      Logger.debug(`  - 客户端ID: ${this.credentials.client_id}`)
      Logger.debug(`  - 私钥ID: ${this.credentials.private_key_id}`)
      Logger.debug(`  - 认证URI: ${this.credentials.auth_uri}`)
      Logger.debug(`  - Token URI: ${this.credentials.token_uri}`)
      
      // 验证必要字段
      const requiredFields = ['private_key', 'client_email', 'project_id', 'token_uri']
      const missingFields = requiredFields.filter(field => !this.credentials![field as keyof GoogleCredentials])
      
      if (missingFields.length > 0) {
        throw new Error(`服务账户凭据缺少必要字段: ${missingFields.join(', ')}`)
      }
      
      // 验证私钥格式
      if (!this.credentials.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('私钥格式不正确')
      }
      
      Logger.debug(`✅ 凭据验证通过`)

    } catch (error: any) {
      Logger.error(`❌ 加载Google凭据失败: ${error.message}`)
      if (error.code === 'ENOENT') {
        Logger.error(`  - 文件路径: ${credentialsPath}`)
        Logger.error(`  - 请确保凭据文件存在且路径正确`)
      }
      throw new Error(`加载Google凭据失败: ${error.message}`)
    }
  }

  /**
   * 获取Google Access Token (JWT认证)
   */
  private async getAccessToken(): Promise<string> {
    // 如果token还未过期，直接返回
    if (this.accessToken && Date.now() < this.tokenExpiration) {
      return this.accessToken
    }

    return await this.refreshAccessToken()
  }

  /**
   * 刷新Access Token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.credentials) {
      throw new Error('Google凭据未加载')
    }

    try {
      Logger.debug('🔐 开始获取Google Access Token...')
      Logger.debug(`🔑 使用服务账户: ${this.credentials.client_email}`)
      Logger.debug(`📋 项目ID: ${this.credentials.project_id}`)

      // 生成JWT
      Logger.debug('🔧 生成JWT Token...')
      const jwt = await this.generateJWT()
      Logger.debug(`✅ JWT生成成功，长度: ${jwt.length}字符`)

      // 请求access token
      Logger.debug('📡 发送OAuth请求到Google...')
      const startTime = Date.now()
      
      const proxyConfig = await this.getProxyConfig()
      const requestConfig: any = {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      }

      if (proxyConfig) {
        requestConfig.proxy = proxyConfig
        Logger.debug(`🌐 使用代理: ${proxyConfig.host}:${proxyConfig.port}`)
      }

      const response = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }, requestConfig)

      const requestDuration = Date.now() - startTime
      Logger.debug(`📡 OAuth请求完成，耗时: ${requestDuration}ms`)

      const { access_token, expires_in } = response.data
      
      this.accessToken = access_token
      this.tokenExpiration = Date.now() + (expires_in * 1000) - 60000 // 提前1分钟过期

      Logger.debug(`✅ Google Access Token获取成功`)
      Logger.debug(`  - Token长度: ${access_token.length}字符`)
      Logger.debug(`  - 有效期: ${expires_in}秒`)
      Logger.debug(`  - 过期时间: ${new Date(this.tokenExpiration).toLocaleString()}`)
      
      return access_token

    } catch (error: any) {
      Logger.error(`❌ 获取Google Access Token失败: ${error.message}`)
      
      // 详细错误信息
      if (error.code) {
        Logger.error(`  - 错误代码: ${error.code}`)
      }
      if (error.response) {
        Logger.error(`  - HTTP状态: ${error.response.status}`)
        Logger.error(`  - 响应数据:`, error.response.data)
      }
      if (error.request) {
        Logger.error(`  - 请求配置:`, {
          url: error.request.responseURL || error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        })
      }
      
      throw new Error(`Google认证失败: ${error.message}`)
    }
  }

  /**
   * 生成JWT Token
   */
  private async generateJWT(): Promise<string> {
    if (!this.credentials) {
      throw new Error('Google凭据未加载')
    }

    try {
      Logger.debug('🔧 开始生成JWT Token...')
      
      const now = Math.floor(Date.now() / 1000)
      const header = {
        alg: 'RS256',
        typ: 'JWT'
      }

      const payload = {
        iss: this.credentials.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600, // 1小时过期
        iat: now
      }

      Logger.debug(`📋 JWT Payload:`)
      Logger.debug(`  - 签发者: ${payload.iss}`)
      Logger.debug(`  - 权限范围: ${payload.scope}`)
      Logger.debug(`  - 目标受众: ${payload.aud}`)
      Logger.debug(`  - 签发时间: ${new Date(payload.iat * 1000).toISOString()}`)
      Logger.debug(`  - 过期时间: ${new Date(payload.exp * 1000).toISOString()}`)

      // 使用Node.js内置crypto模块生成JWT
      const crypto = require('crypto')
      
      Logger.debug('🔧 编码JWT头部和载荷...')
      const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64url')
      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
      
      const signatureInput = `${headerBase64}.${payloadBase64}`
      Logger.debug(`📝 待签名字符串长度: ${signatureInput.length}字符`)
      
      // 清理private key格式
      Logger.debug('🔑 处理私钥格式...')
      const privateKey = this.credentials.private_key.replace(/\\n/g, '\n')
      Logger.debug(`🔑 私钥长度: ${privateKey.length}字符`)
      
      // 验证私钥格式
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('私钥格式不正确，缺少BEGIN标记')
      }
      if (!privateKey.includes('-----END PRIVATE KEY-----')) {
        throw new Error('私钥格式不正确，缺少END标记')
      }
      
      Logger.debug('🔏 生成RSA-SHA256签名...')
      const signature = crypto.sign('RSA-SHA256', Buffer.from(signatureInput), {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      })
      
      const signatureBase64 = signature.toString('base64url')
      Logger.debug(`✅ 签名生成成功，长度: ${signatureBase64.length}字符`)
      
      const jwt = `${signatureInput}.${signatureBase64}`
      Logger.debug(`✅ JWT生成完成，总长度: ${jwt.length}字符`)
      
      return jwt
      
    } catch (error: any) {
      Logger.error(`❌ JWT生成失败: ${error.message}`)
      if (error.stack) {
        Logger.error(`  - 堆栈信息: ${error.stack}`)
      }
      throw new Error(`JWT生成失败: ${error.message}`)
    }
  }

  /**
   * 判断是否使用同步识别（10MB和60秒为界限）
   */
  private async shouldUseSyncRecognition(audioPath: string): Promise<boolean> {
    const SYNC_THRESHOLD_BYTES = 10 * 1024 * 1024 // 10MB
    const SYNC_THRESHOLD_SECONDS = 60 // 60秒

    try {
      // 获取音频文件信息
      const audioInfo = await getAudioFileInfo(audioPath)
      const fileSizeMB = Math.round(audioInfo.size / 1024 / 1024 * 100) / 100
      const durationSeconds = audioInfo.duration || 0

      Logger.debug(`🎵 音频文件信息: 大小=${fileSizeMB}MB, 时长=${durationSeconds.toFixed(1)}秒`)

      // 检查文件大小限制
      if (audioInfo.size > SYNC_THRESHOLD_BYTES) {
        Logger.info(`📏 文件大小${fileSizeMB}MB超过10MB限制，使用异步识别`)
        return false
      }

      // 检查时长限制（Google V2同步API限制60秒）
      if (durationSeconds > SYNC_THRESHOLD_SECONDS) {
        Logger.info(`⏱️ 音频时长${durationSeconds.toFixed(1)}秒超过60秒限制，使用异步识别`)
        return false
      }

      // 检查是否配置了Cloud Storage（异步识别需要）
      if (!this.bucketName) {
        Logger.warn(`⚠️ 未配置Cloud Storage存储桶，强制使用同步识别`)
        Logger.warn(`📋 请配置 GOOGLE_STT_BUCKET_NAME 环境变量以支持异步转录`)
        
        // 如果文件超过限制但没有配置存储桶，抛出错误
        if (audioInfo.size > SYNC_THRESHOLD_BYTES || durationSeconds > SYNC_THRESHOLD_SECONDS) {
          throw new Error(`音频文件超过同步识别限制(${fileSizeMB}MB/${durationSeconds.toFixed(1)}s)，需要配置Google Cloud Storage支持异步识别`)
        }
      }

      Logger.info(`🎯 音频文件: ${fileSizeMB}MB/${durationSeconds.toFixed(1)}s, 选择同步识别`)
      return true

    } catch (error: any) {
      Logger.warn(`⚠️ 无法获取音频文件信息，默认使用同步识别: ${error.message}`)
      return true
    }
  }

  /**
   * V2 API同步语音识别（小文件，<10MB）
   */
  private async syncRecognize(audioPath: string): Promise<string> {
    try {
      Logger.info(`🎤 开始Google V2同步语音识别: ${audioPath}`)

      const accessToken = await this.getAccessToken()
      const endpoints = this.getV2Endpoints()
      
      // 读取并编码音频文件
      const audioBuffer = await fs.readFile(audioPath)
      const base64Audio = audioBuffer.toString('base64')
      Logger.info(`📦 音频编码完成，大小: ${Math.round(audioBuffer.length / 1024 / 1024 * 100) / 100}MB`)

      // 构建V2请求
      const request: V2RecognizeRequest = {
        recognizer: endpoints.recognizerPath,
        config: this.buildV2RecognitionConfig(false),
        content: base64Audio
      }

      Logger.info(`🚀 提交Google V2同步识别任务...`)
      Logger.debug(`  - Recognizer: ${request.recognizer}`)
      Logger.debug(`  - 模型: ${request.config.model}`)
      Logger.debug(`  - 支持语言: ${request.config.languageCodes.join(', ')}`)
      Logger.debug(`  - 端点: ${endpoints.syncEndpoint}`)

      const proxyConfig = await this.getProxyConfig()
      const requestConfig: any = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5分钟超时
      }
      
      if (proxyConfig) {
        requestConfig.proxy = proxyConfig
      }

      const startTime = Date.now()
      const response = await axios.post<V2RecognizeResponse>(
        endpoints.syncEndpoint,
        request,
        requestConfig
      )

      const duration = Date.now() - startTime
      Logger.info(`📦 Google V2同步识别响应接收完成，耗时: ${duration}ms`)

      // 解析结果
      const transcription = this.parseV2RecognitionResponse(response.data)
      Logger.info(`✅ Google V2同步语音识别成功 - 文本长度: ${transcription.length}字符`)
      
      return transcription

    } catch (error: any) {
      Logger.error(`❌ Google V2同步语音识别失败: ${error.message}`)
      if (error.response) {
        Logger.error(`  - HTTP状态: ${error.response.status}`)
        Logger.error(`  - 响应数据: ${JSON.stringify(error.response.data, null, 2)}`)
      }
      
      // 如果主区域失败，尝试fallback区域
      if (error.message.includes('model') || error.message.includes('language')) {
        Logger.warn(`⚠️ 主区域失败，尝试fallback区域: ${error.message}`)
        return await this.fallbackRecognition(audioPath, false)
      }
      
      throw new Error(`Google V2同步语音识别失败: ${error.message}`)
    }
  }

  /**
   * V2 API异步语音识别（大文件，>=10MB，使用batchRecognize）
   */
  private async longRunningRecognize(audioPath: string, progressCallback?: (progress: string) => void): Promise<string> {
    let gcsUri: string | null = null
    
    try {
      Logger.info(`🎤 开始Google V2异步语音识别: ${audioPath}`)

      // 上传文件到Cloud Storage
      gcsUri = await this.uploadToCloudStorage(audioPath)
      
      const accessToken = await this.getAccessToken()
      const endpoints = this.getV2Endpoints()
      
      // 构建V2批量识别请求
      const request: V2BatchRecognizeRequest = {
        recognizer: endpoints.recognizerPath,
        config: this.buildV2RecognitionConfig(true),
        files: [{
          uri: gcsUri
        }],
        recognitionOutputConfig: {
          inlineResponseConfig: {}  // 使用内嵌响应
        }
      }

      Logger.info(`🚀 提交Google V2批量识别任务...`)
      Logger.debug(`  - Recognizer: ${request.recognizer}`)
      Logger.debug(`  - 模型: ${request.config.model}`)
      Logger.debug(`  - 支持语言: ${request.config.languageCodes.join(', ')}`)
      Logger.debug(`  - Cloud Storage URI: ${gcsUri}`)
      Logger.debug(`  - 端点: ${endpoints.asyncEndpoint}`)
      
      // 详细的请求内容日志
      Logger.info(`📄 V2批量识别完整请求内容:`)
      Logger.info(JSON.stringify(request, null, 2))

      const proxyConfig = await this.getProxyConfig()
      const requestConfig: any = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5分钟超时
      }
      
      if (proxyConfig) {
        requestConfig.proxy = proxyConfig
      }

      const startTime = Date.now()
      const response = await axios.post<V2Operation>(
        endpoints.asyncEndpoint,
        request,
        requestConfig
      )

      const duration = Date.now() - startTime
      Logger.info(`📦 Google V2批量任务提交成功，耗时: ${duration}ms`)
      Logger.info(`  - 操作名称: ${response.data.name}`)
      
      // 详细的提交响应日志
      Logger.info(`📥 V2批量识别提交响应:`)
      Logger.info(JSON.stringify(response.data, null, 2))

      // 轮询等待结果
      const operationName = response.data.name
      const result = await this.pollV2LongRunningOperation(operationName, progressCallback)
      
      // 解析V2批量结果
      if (!result.response?.results) {
        throw new Error('V2批量识别操作完成，但没有返回识别结果')
      }
      
      const transcription = this.parseV2BatchRecognitionResponse(result.response, gcsUri)
      Logger.info(`✅ Google V2批量语音识别成功 - 文本长度: ${transcription.length}字符`)
      
      return transcription
      
    } catch (error: any) {
      Logger.error(`❌ Google V2批量语音识别失败: ${error.message}`)
      if (error.response) {
        Logger.error(`  - HTTP状态: ${error.response.status}`)
        Logger.error(`  - 响应数据: ${JSON.stringify(error.response.data, null, 2)}`)
      }
      
      // 如果主区域失败，尝试fallback区域
      if (error.message.includes('model') || error.message.includes('language')) {
        Logger.warn(`⚠️ 主区域失败，尝试fallback区域: ${error.message}`)
        try {
          return await this.fallbackRecognition(audioPath, true)
        } catch (fallbackError: any) {
          Logger.error(`❌ 所有区域都尝试失败: ${fallbackError.message}`)
          throw new Error(`Google V2批量语音识别失败: ${error.message}`)
        }
      }
      
      throw new Error(`Google V2批量语音识别失败: ${error.message}`)
    } finally {
      // 清理Cloud Storage文件
      if (gcsUri) {
        try {
          await this.deleteFromCloudStorage(gcsUri)
        } catch (cleanupError) {
          Logger.warn(`⚠️ 清理Cloud Storage文件失败: ${cleanupError}`)
        }
      }
    }
  }

  /**
   * 轮询长运行操作状态
   */
  private async pollLongRunningOperation(operationName: string): Promise<Operation> {
    const maxAttempts = 60 // 最大轮询次数
    const initialDelay = 5000 // 初始延迟5秒
    const maxDelay = 30000 // 最大延迟30秒
    
    Logger.info(`🔄 开始轮询异步操作状态: ${operationName}`)
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const operation = await this.queryOperation(operationName)
        
        if (operation.done) {
          if (operation.error) {
            Logger.error(`❌ 异步操作失败: ${JSON.stringify(operation.error)}`)
            throw new Error(`异步操作失败: ${operation.error.message || '未知错误'}`)
          }
          
          Logger.info(`✅ 异步操作完成，共轮询${attempt}次`)
          return operation
        }
        
        // 计算动态延迟时间（指数退避）
        const delay = Math.min(initialDelay * Math.pow(1.5, attempt - 1), maxDelay)
        Logger.debug(`⏳ 操作未完成，${delay}ms后进行第${attempt + 1}次查询...`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        
      } catch (error: any) {
        Logger.error(`❌ 查询操作状态失败(第${attempt}次): ${error.message}`)
        
        if (attempt === maxAttempts) {
          throw new Error(`轮询操作状态失败，已达到最大重试次数: ${error.message}`)
        }
        
        // 查询失败时等待较短时间再重试
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    throw new Error(`异步操作超时，已轮询${maxAttempts}次仍未完成`)
  }

  /**
   * V2 API轮询长运行操作状态
   */
  private async pollV2LongRunningOperation(operationName: string, progressCallback?: (progress: string) => void): Promise<V2Operation> {
    const maxAttempts = 60 // 最大轮询次数
    const initialDelay = 10000 // 初始延迟10秒（增加一倍）
    const maxDelay = 60000 // 最大延迟60秒（增加一倍）
    
    Logger.info(`🔄 开始V2轮询批量操作状态: ${operationName}`)
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const operation = await this.queryV2Operation(operationName)
        
        if (operation.done) {
          if (operation.error) {
            Logger.error(`❌ V2批量操作失败: ${JSON.stringify(operation.error)}`)
            throw new Error(`V2批量操作失败: ${operation.error.message || '未知错误'}`)
          }
          
          Logger.info(`✅ V2批量操作完成，共轮询${attempt}次`)
          
          // 详细的操作结果日志
          Logger.info(`📋 V2批量操作完整结果:`)
          Logger.info(JSON.stringify(operation, null, 2))
          
          return operation
        }
        
        // 计算动态延迟时间（指数退避）
        const delay = Math.min(initialDelay * Math.pow(1.5, attempt - 1), maxDelay)
        Logger.debug(`⏳ V2操作未完成，${delay}ms后进行第${attempt + 1}次查询...`)
        
        // 显示进度信息（如果有）
        if (operation.metadata?.progressPercent) {
          const progress = `${operation.metadata.progressPercent}%`
          Logger.info(`📊 处理进度: ${progress}`)
          
          // 调用进度回调
          if (progressCallback) {
            try {
              progressCallback(progress)
            } catch (callbackError) {
              Logger.warn(`⚠️ 进度回调执行失败: ${callbackError}`)
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
        
      } catch (error: any) {
        Logger.error(`❌ 查询V2操作状态失败(第${attempt}次): ${error.message}`)
        
        if (attempt === maxAttempts) {
          throw new Error(`轮询V2操作状态失败，已达到最大重试次数: ${error.message}`)
        }
        
        // 查询失败时等待较短时间再重试
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    throw new Error(`V2批量操作超时，已轮询${maxAttempts}次仍未完成`)
  }

  /**
   * 查询V2异步操作状态
   */
  private async queryV2Operation(operationName: string): Promise<V2Operation> {
    const accessToken = await this.getAccessToken()
    const proxyConfig = await this.getProxyConfig()
    const endpoints = this.getV2Endpoints()
    
    const requestConfig: any = {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
    }
    
    if (proxyConfig) {
      requestConfig.proxy = proxyConfig
    }

    // V2 API使用不同的端点格式
    const response = await axios.get<V2Operation>(
      `${endpoints.baseEndpoint}/v2/${operationName}`,
      requestConfig
    )

    return response.data
  }

  /**
   * 查询异步操作状态（兼容性方法）
   */
  private async queryOperation(operationName: string): Promise<Operation> {
    // 为了向后兼容，保留旧方法
    const accessToken = await this.getAccessToken()
    const proxyConfig = await this.getProxyConfig()
    
    const requestConfig: any = {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
    }
    
    if (proxyConfig) {
      requestConfig.proxy = proxyConfig
    }

    const response = await axios.get<Operation>(
      `https://speech.googleapis.com/v1/${operationName}`,
      requestConfig
    )

    return response.data
  }

  /**
   * 智能选择最佳区域和模型
   */
  private selectOptimalRegion(): {
    region: string,
    endpoint: string,
    languages: string[],
    model: string
  } {
    // 根据当前语言代码选择最佳区域
    let selectedRegion: string

    // 根据语言代码选择区域
    if (this.currentLanguageCode.startsWith('cmn-') || this.currentLanguageCode.startsWith('yue-')) {
      // 中文语言 -> asia-southeast1
      selectedRegion = 'asia-southeast1'
    } else if (this.currentLanguageCode === 'en-US' || this.currentLanguageCode === 'ja-JP') {
      // 英语或日语 -> asia-northeast1
      selectedRegion = 'asia-northeast1'
    } else {
      // 其他语言 -> us-central1
      selectedRegion = 'us-central1'
    }

    const config = this.REGION_LANGUAGE_MAP[selectedRegion]

    Logger.debug(`🌍 根据语言 ${this.currentLanguageCode} 选择区域: ${selectedRegion} (${config.description})`)
    Logger.debug(`💬 区域支持语言: ${config.languages.join(', ')}`)
    Logger.debug(`🤖 使用模型: ${config.model}`)

    return {
      region: selectedRegion,
      endpoint: this.V2_REGION_ENDPOINTS[selectedRegion],
      languages: config.languages,
      model: config.model
    }
  }

  /**
   * 获取V2 API端点和recognizer路径（智能区域选择）
   */
  private getV2Endpoints(): {
    baseEndpoint: string,
    recognizerPath: string,
    syncEndpoint: string,
    asyncEndpoint: string,
    region: string,
    supportedLanguages: string[],
    model: string
  } {
    const optimal = this.selectOptimalRegion()
    const recognizerPath = `projects/${this.projectId}/locations/${optimal.region}/recognizers/_`
    
    return {
      baseEndpoint: optimal.endpoint,
      recognizerPath,
      syncEndpoint: `${optimal.endpoint}/v2/${recognizerPath}:recognize`,
      asyncEndpoint: `${optimal.endpoint}/v2/${recognizerPath}:batchRecognize`,
      region: optimal.region,
      supportedLanguages: optimal.languages,
      model: optimal.model
    }
  }

  /**
   * 构建V2识别配置（根据区域自动选择）
   */
  private buildV2RecognitionConfig(isLongRunning: boolean = false): V2RecognitionConfig {
    const endpoints = this.getV2Endpoints()

    Logger.debug(`🎵 使用Google V2自动音频编码检测`)
    Logger.debug(`🌐 使用语言代码: ${this.currentLanguageCode}`)

    // 使用当前设置的语言代码
    const languageCodes = [this.currentLanguageCode]

    // 使用根据区域和语言选择的模型
    const model = endpoints.model

    Logger.debug(`🌍 使用语言: ${languageCodes[0]}, 模型: ${model}, 区域: ${endpoints.region}`)

    return {
      model,  // 使用区域推荐的模型
      languageCodes,  // 使用指定的语言配置
      autoDecodingConfig: {},  // 空对象，让Google API自动检测音频编码格式
      features: {
        enableAutomaticPunctuation: true,
        maxAlternatives: 1
      }
    }
  }

  /**
   * Fallback识别机制（多区域尝试）
   */
  private async fallbackRecognition(audioPath: string, isLongRunning: boolean = false): Promise<string> {
    const fallbackRegions = ['asia-northeast1', 'us-central1'] // 备选区域
    
    for (const region of fallbackRegions) {
      try {
        Logger.info(`🔄 尝试fallback区域: ${region}`)
        
        // 临时更改区域配置
        const originalLocation = this.location
        this.location = region
        
        const result = isLongRunning 
          ? await this.longRunningRecognize(audioPath)
          : await this.syncRecognize(audioPath)
          
        // 恢复原始配置
        this.location = originalLocation
        
        Logger.info(`✅ Fallback区域 ${region} 识别成功`)
        return result
        
      } catch (fallbackError: any) {
        Logger.warn(`⚠️ Fallback区域 ${region} 也失败: ${fallbackError.message}`)
        // 恢复原始配置
        this.location = 'asia-southeast1'
        continue
      }
    }
    
    throw new Error('所有区域都尝试失败，无法完成语音识别')
  }

  /**
   * 构建识别配置（兼容性方法）- 已废弃，请直接使用buildV2RecognitionConfig
   */
  private buildRecognitionConfig(isLongRunning: boolean = false): RecognitionConfig {
    return this.buildV2RecognitionConfig(isLongRunning)
  }


  /**
   * 解析V2同步识别响应结果
   */
  private parseV2RecognitionResponse(response: V2RecognizeResponse): string {
    try {
      Logger.debug('📝 开始解析Google V2识别响应...')
      
      if (!response || !response.results || response.results.length === 0) {
        Logger.warn('⚠️ V2响应结果为空或无识别结果')
        return ''
      }

      let transcription = ''
      
      response.results.forEach((result, index) => {
        if (result.alternatives && result.alternatives.length > 0) {
          const alternative = result.alternatives[0]
          if (alternative && alternative.transcript) {
            transcription += alternative.transcript
            Logger.debug(`📄 V2片段 ${index + 1}: ${alternative.transcript}`)
            
            // 记录检测到的语言
            if (result.languageCode) {
              Logger.debug(`🌍 检测到语言: ${result.languageCode}`)
            }
          }
        }
      })

      Logger.info(`📝 Google V2转录结果解析完成: ${transcription.length}字符`)
      
      if (transcription.length === 0) {
        Logger.warn('⚠️ 解析后的V2转录结果为空')
      }

      return transcription

    } catch (error: any) {
      Logger.error(`❌ 解析Google V2响应失败: ${error.message}`)
      throw new Error(`解析V2识别响应失败: ${error.message}`)
    }
  }

  /**
   * 解析V2批量识别响应结果
   */
  private parseV2BatchRecognitionResponse(response: V2BatchRecognizeResponse, audioUri: string): string {
    try {
      Logger.debug('📝 开始解析Google V2批量识别响应...')
      
      // 详细的响应结构日志
      Logger.info(`📋 V2批量识别完整响应结构:`)
      Logger.info(JSON.stringify(response, null, 2))
      Logger.info(`🎯 查找音频URI: ${audioUri}`)
      
      if (!response || !response.results) {
        Logger.warn('⚠️ V2批量响应结果为空')
        return ''
      }
      
      // 打印所有可用的音频URI键
      const availableUris = Object.keys(response.results)
      Logger.info(`🔑 响应中可用的音频URI键: ${availableUris.join(', ')}`)

      // 查找对应音频文件的结果
      const fileResult = response.results[audioUri]
      if (!fileResult) {
        Logger.warn(`⚠️ 未找到音频文件 ${audioUri} 的识别结果`)
        Logger.warn(`未找到的URI: ${audioUri}`)
        Logger.warn(`可用的URI: ${availableUris.join(', ')}`)
        return ''
      }
      
      // 打印找到的文件结果结构
      Logger.info(`📁 找到文件结果结构:`)
      Logger.info(JSON.stringify(fileResult, null, 2))

      // 内嵌响应模式
      if (fileResult.transcript?.results) {
        let transcription = ''
        
        fileResult.transcript.results.forEach((result, index) => {
          if (result.alternatives && result.alternatives.length > 0) {
            const alternative = result.alternatives[0]
            if (alternative && alternative.transcript) {
              transcription += alternative.transcript
              Logger.debug(`📄 V2批量片段 ${index + 1}: ${alternative.transcript}`)
              
              // 记录检测到的语言
              if (result.languageCode) {
                Logger.debug(`🌍 检测到语言: ${result.languageCode}`)
              }
            }
          }
        })

        Logger.info(`📝 Google V2批量转录结果解析完成: ${transcription.length}字符`)
        
        if (transcription.length === 0) {
          Logger.warn('⚠️ 解析后的V2批量转录结果为空')
        }

        return transcription
      }

      // GCS输出模式（未实现）
      if (fileResult.uri) {
        Logger.warn('⚠️ 检测到GCS输出模式，但未实现该功能')
        throw new Error('不支持GCS输出模式，请使用内嵌响应模式')
      }

      Logger.warn('⚠️ V2批量响应格式未知')
      return ''

    } catch (error: any) {
      Logger.error(`❌ 解析Google V2批量响应失败: ${error.message}`)
      throw new Error(`解析V2批量识别响应失败: ${error.message}`)
    }
  }

  /**
   * 解析识别响应结果（兼容性方法）
   */
  private parseRecognitionResponse(response: SyncRecognitionResponse | { results: SpeechRecognitionResult[] }): string {
    try {
      Logger.debug('📝 开始解析Google Speech识别响应...')
      
      if (!response || !response.results || response.results.length === 0) {
        Logger.warn('⚠️ 响应结果为空或无识别结果')
        return ''
      }

      let transcription = ''
      
      response.results.forEach((result, index) => {
        if (result.alternatives && result.alternatives.length > 0) {
          const alternative = result.alternatives[0]
          if (alternative && alternative.transcript) {
            transcription += alternative.transcript
            Logger.debug(`📄 片段 ${index + 1}: ${alternative.transcript}`)
          }
        }
      })

      Logger.info(`📝 Google Speech转录结果解析完成: ${transcription.length}字符`)
      
      if (transcription.length === 0) {
        Logger.warn('⚠️ 解析后的转录结果为空')
      }

      return transcription

    } catch (error: any) {
      Logger.error(`❌ 解析Google Speech响应失败: ${error.message}`)
      throw new Error(`解析识别响应失败: ${error.message}`)
    }
  }

  // 旧的轮询方法已删除，使用V2 API方法

  /**
   * 查询异步操作状态
   */
  private async _oldQueryOperation_DELETE_ME(operationName: string): Promise<Operation> {
    const accessToken = await this.getAccessToken()

    const response = await axios.get<Operation>(
      `https://speech.googleapis.com/v1/${operationName}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
        // 移除硬编码的代理配置，统一使用 getProxyConfig() 方法
      }
    )

    return response.data
  }

  /**
   * 解析识别响应结果
   */
  private _oldParseRecognitionResponse_DELETE_ME(response: SyncRecognitionResponse | { results: SpeechRecognitionResult[] }): string {
    if (!response.results || response.results.length === 0) {
      Logger.warn('Google Speech返回空结果')
      return ''
    }

    // 合并所有results中的最佳转录结果
    const transcription = response.results
      .map(result => {
        const alternative = result.alternatives?.[0]
        if (alternative && alternative.transcript) {
          // 记录置信度信息
          if (alternative.confidence) {
            Logger.debug(`转录片段置信度: ${(alternative.confidence * 100).toFixed(1)}%`)
          }
          return alternative.transcript
        }
        return ''
      })
      .filter(text => text.length > 0)
      .join(' ')
      .trim()

    Logger.info(`📝 Google Speech转录结果解析完成: ${transcription.length}字符`)
    
    if (transcription.length === 0) {
      Logger.warn('⚠️ 解析后的转录结果为空')
    }

    return transcription
  }

  /**
   * 清理 Google STT 转录结果中的中文空格
   */
  private cleanupTranscription(transcription: string): string {
    try {
      // 检查是否启用清理功能
      if (!env.GOOGLE_STT_CLEANUP_ENABLED) {
        Logger.debug('🚫 Google STT 转录清理功能已禁用')
        return transcription
      }

      // 检测是否包含中文字符
      const containsChinese = /[\u4e00-\u9fff]/.test(transcription)
      
      if (!containsChinese) {
        Logger.debug('🌐 未检测到中文字符，跳过清理')
        return transcription
      }
      
      Logger.debug('🧹 检测到中文字符，开始清理转录结果中的空格')
      
      // 简单粗暴：删掉所有空格（按照用户要求）
      const cleaned = transcription.replace(/\s+/g, '')
      
      Logger.info(`🧹 转录结果清理完成: 原始长度${transcription.length} → 清理后长度${cleaned.length}`)
      Logger.debug(`📝 清理前: "${transcription.substring(0, 100)}${transcription.length > 100 ? '...' : ''}"`)
      Logger.debug(`📝 清理后: "${cleaned.substring(0, 100)}${cleaned.length > 100 ? '...' : ''}"`)
      
      return cleaned
      
    } catch (error: any) {
      Logger.error(`❌ 转录结果清理失败: ${error.message}`)
      Logger.warn(`⚠️ 返回原始转录结果`)
      return transcription
    }
  }

  /**
   * 主入口：语音转文字
   */
  public async speechToText(audioPath: string, progressCallback?: (progress: string) => void, languageCode?: string): Promise<string> {
    try {
      Logger.info(`🎤 开始Google Speech语音识别: ${audioPath}`)

      // 设置语言代码（如果提供）
      if (languageCode) {
        this.currentLanguageCode = languageCode
        Logger.info(`🌐 使用指定语言: ${languageCode}`)
      } else {
        this.currentLanguageCode = 'cmn-Hans-CN'  // 默认简体中文
        Logger.info(`🌐 使用默认语言: cmn-Hans-CN`)
      }

      // 初始化服务
      await this.initialize()

      if (!this.projectId || !this.credentials) {
        throw new Error('Google Speech服务未正确初始化')
      }

      // 验证音频文件
      const isValid = await validateAudioFile(audioPath)
      if (!isValid) {
        throw new Error('音频文件验证失败')
      }

      // 获取音频信息
      const audioInfo = await getAudioFileInfo(audioPath)
      Logger.info(`📊 音频文件信息:`)
      Logger.info(`  - 时长: ${audioInfo.duration ? `${audioInfo.duration}秒` : '未知'}`)
      Logger.info(`  - 大小: ${Math.round(audioInfo.size / 1024 / 1024 * 100) / 100}MB`)
      Logger.info(`  - 格式: ${audioInfo.format}`)

      // 智能选择同步或异步识别（基于文件大小和时长）
      const useSync = await this.shouldUseSyncRecognition(audioPath)

      let transcription: string
      if (useSync) {
        transcription = await this.syncRecognize(audioPath)
      } else {
        transcription = await this.longRunningRecognize(audioPath, progressCallback)
      }

      if (!transcription || transcription.trim().length === 0) {
        Logger.error(`❌ Google Speech识别结果为空`)
        throw new Error('语音识别结果为空')
      }

      // 清理转录结果中的中文空格
      const cleanedTranscription = this.cleanupTranscription(transcription)

      Logger.info(`✅ Google Speech语音识别成功 - 文本长度: ${cleanedTranscription.length}字符`)
      return cleanedTranscription

    } catch (error: any) {
      Logger.error(`❌ Google Speech语音转录失败: ${error.message}`)
      Logger.error(`🔧 错误详情: ${error.stack || 'No stack trace'}`)
      throw error
    }
  }

  /**
   * 检查服务状态
   */
  public async checkServiceStatus(): Promise<ServiceStatus> {
    try {
      await this.initialize()
      
      if (!this.projectId) {
        return { 
          available: false, 
          message: 'Google Speech项目ID未配置' 
        }
      }

      if (!this.credentials) {
        return { 
          available: false, 
          message: 'Google Speech凭据文件未加载' 
        }
      }

      // 尝试获取访问令牌
      const token = await this.getAccessToken()
      if (!token) {
        return { 
          available: false, 
          message: 'Google Speech认证失败' 
        }
      }

      return { 
        available: true, 
        message: 'Google Speech服务配置正确' 
      }

    } catch (error: any) {
      return { 
        available: false, 
        message: `Google Speech服务不可用: ${error.message}` 
      }
    }
  }

  /**
   * 诊断Google Speech服务
   */
  public async diagnoseService(): Promise<DiagnosisResult> {
    const details = {
      configCheck: false,
      credentialsCheck: false,
      authCheck: false,
      apiConnectivity: false,
      suggestions: [] as string[]
    }

    let success = false

    try {
      Logger.info(`🔧 开始Google Speech诊断...`)

      // 1. 配置检查
      try {
        const projectId = await ConfigManager.get('GOOGLE_STT_PROJECT_ID')
        const credentialsPath = await ConfigManager.get('GOOGLE_STT_CREDENTIALS_PATH')

        if (!projectId) {
          details.suggestions.push('请配置 GOOGLE_STT_PROJECT_ID')
        }
        if (!credentialsPath) {
          details.suggestions.push('请配置 GOOGLE_STT_CREDENTIALS_PATH')
        }

        details.configCheck = !!(projectId && credentialsPath)
        Logger.info(`✅ 配置检查: ${details.configCheck ? '通过' : '失败'}`)

      } catch (error: any) {
        Logger.error(`💥 配置检查失败: ${error.message}`)
        details.suggestions.push('检查环境变量配置')
      }

      // 2. 凭据文件检查
      if (details.configCheck) {
        try {
          const credentialsPath = await ConfigManager.get('GOOGLE_STT_CREDENTIALS_PATH')
          await this.loadCredentials(credentialsPath!)
          details.credentialsCheck = true
          Logger.info(`✅ 凭据文件检查: 通过`)

        } catch (error: any) {
          Logger.error(`💥 凭据文件检查失败: ${error.message}`)
          details.suggestions.push('检查Google服务账户凭据文件是否存在且格式正确')
        }
      }

      // 3. 认证检查
      if (details.credentialsCheck) {
        try {
          const token = await this.getAccessToken()
          details.authCheck = !!token
          Logger.info(`✅ 认证检查: ${details.authCheck ? '通过' : '失败'}`)

        } catch (error: any) {
          Logger.error(`💥 认证检查失败: ${error.message}`)
          details.suggestions.push('检查Google Cloud项目权限和服务账户配置')
        }
      }

      // 4. API连通性检查
      if (details.authCheck) {
        try {
          const accessToken = await this.getAccessToken()
          
          // 测试V2 API连通性
          const endpoints = this.getV2Endpoints()
          const proxyConfig = await this.getProxyConfig()
          
          const requestConfig: any = {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            timeout: 15000
          }
          
          if (proxyConfig) {
            requestConfig.proxy = proxyConfig
          }
          
          // 测试V2 API端点
          await axios.get(
            `${endpoints.baseEndpoint}/v2/projects/${this.projectId}/locations/${this.location}/recognizers`,
            requestConfig
          )

          details.apiConnectivity = true
          Logger.info(`✅ V2 API连通性检查: 通过`)
          Logger.info(`  - 端点: ${endpoints.baseEndpoint}`)
          Logger.info(`  - 项目: ${this.projectId}`)

        } catch (error: any) {
          Logger.error(`💥 V2 API连通性检查失败: ${error.message}`)
          details.suggestions.push('检查网络连接、代理设置和Google Cloud Speech-to-Text V2 API是否已启用')
          details.suggestions.push('确认asia-southeast1区域支持chirp模型')
        }
      }

      success = details.configCheck && details.credentialsCheck && details.authCheck && details.apiConnectivity

      const resultMessage = success ? '✅ Google Speech V2诊断全部通过' : '⚠️ 发现问题，请查看详细信息'
      
      Logger.info(`🎯 Google Speech V2诊断完成: ${success ? '成功' : '失败'}`)

      return {
        success,
        message: resultMessage,
        details
      }

    } catch (error: any) {
      Logger.error(`💀 Google Speech诊断过程出错: ${error.message}`)
      
      return {
        success: false,
        message: `Google Speech V2诊断失败: ${error.message}`,
        details
      }
    }
  }
}

export default GoogleSpeechService
