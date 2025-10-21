/**
 * ElevenLabsTTSAdapter - ElevenLabs Text-to-Speech (Eleven v3 Alpha)
 *
 * 对应模型: elevenlabs-tts-v3
 * 功能: 文本转语音（高情感表达）
 * 文档: https://elevenlabs.io/docs
 */

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'
import * as fs from 'fs/promises'
import * as path from 'path'
import { nanoid } from 'nanoid'

interface ElevenLabsVoiceSettings {
  stability?: number
  similarity_boost?: number
  style?: number
  use_speaker_boost?: boolean
}

interface ElevenLabsErrorResponse {
  detail?: {
    status?: string
    message?: string
  }
  error?: string
}

export class ElevenLabsTTSAdapter extends BaseAdapter {
  /**
   * 覆盖认证头 - ElevenLabs 使用 xi-api-key 而非 Bearer token
   */
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    }
  }

  /**
   * 调度生成请求
   */
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    try {
      const apiKey = this.getApiKey()
      if (!apiKey) {
        return {
          status: 'ERROR',
          message: 'Missing API key for ElevenLabs',
          error: {
            code: 'MISSING_API_KEY',
            message: 'ElevenLabs API key is required. Please configure it in the provider settings or environment variable.',
            isRetryable: false,
          },
        }
      }

      // 验证字符限制 (Eleven v3 限制为 3,000 字符)
      const text = request.prompt
      const characterLimit = 3000
      if (text.length > characterLimit) {
        return {
          status: 'ERROR',
          message: `Text exceeds character limit of ${characterLimit}`,
          error: {
            code: 'CHARACTER_LIMIT_EXCEEDED',
            message: `Input text has ${text.length} characters, but Eleven v3 only supports up to ${characterLimit} characters. Please shorten your text.`,
            isRetryable: false,
          },
        }
      }

      // 获取语音ID（优先使用自定义，否则使用预制语音）
      const customVoiceId = request.parameters?.custom_voice_id as string | undefined
      const voiceId = customVoiceId || (request.parameters?.voice_id as string) || 'UgBBYS2sOqTuMpoF3BR0' // 默认 Mark

      // 构建语音设置
      const voiceSettings: ElevenLabsVoiceSettings = {
        stability: typeof request.parameters?.stability === 'number'
          ? request.parameters.stability
          : 0.5,
        similarity_boost: typeof request.parameters?.similarity_boost === 'number'
          ? request.parameters.similarity_boost
          : 0.75,
        style: typeof request.parameters?.style === 'number'
          ? request.parameters.style
          : 0.5,
        use_speaker_boost: typeof request.parameters?.use_speaker_boost === 'boolean'
          ? request.parameters.use_speaker_boost
          : true,
      }

      // 构建请求 payload
      const payload = {
        text,
        model_id: 'eleven_v3', // 固定使用 v3 模型
        voice_settings: voiceSettings,
        output_format: 'mp3_44100_128', // 默认 MP3 44.1kHz 128kbps
      }

      this.log('info', `Creating ElevenLabs TTS audio with voice: ${voiceId}`, {
        textLength: text.length,
        voiceSettings,
      })

      // 调用 ElevenLabs API
      const apiEndpoint = this.getApiEndpoint() || 'https://api.elevenlabs.io'
      const response = await this.httpClient.post(
        `/v1/text-to-speech/${voiceId}`,
        payload,
        {
          baseURL: apiEndpoint,
          responseType: 'arraybuffer', // 接收二进制音频数据
          timeout: 120000, // 2 分钟超时
        }
      )

      // 检查响应类型
      const contentType = response.headers['content-type'] as string | undefined

      // 如果返回的是 JSON (错误响应)
      if (contentType?.includes('application/json')) {
        const errorData = JSON.parse(
          Buffer.from(response.data as ArrayBuffer).toString('utf-8')
        ) as ElevenLabsErrorResponse

        const errorMessage = errorData.detail?.message || errorData.error || 'Unknown error from ElevenLabs'
        const errorStatus = errorData.detail?.status || 'API_ERROR'

        // 特殊处理 401 认证错误
        if (errorStatus === 'missing_permissions' || errorStatus === 'unauthorized') {
          return {
            status: 'ERROR',
            message: `ElevenLabs API Key 认证失败: ${errorMessage}. 请检查 API Key 是否有效以及是否有足够的配额。`,
            error: {
              code: 'AUTHENTICATION_ERROR',
              message: `API Key 认证失败。请确保: 1) API Key 格式正确 (以 sk_ 开头), 2) API Key 未过期, 3) 账户有足够的字符配额。详情: ${errorMessage}`,
              isRetryable: false,
            },
          }
        }

        return {
          status: 'ERROR',
          message: errorMessage,
          error: {
            code: errorStatus,
            message: errorMessage,
            isRetryable: errorStatus !== 'quota_exceeded',
          },
        }
      }

      // 如果返回的是音频数据
      if (contentType?.includes('audio/mpeg') || contentType?.includes('audio/mp3')) {
        // 保存音频文件到本地
        const audioBuffer = Buffer.from(response.data as ArrayBuffer)
        const fileName = `elevenlabs-tts-${nanoid()}.mp3`
        const outputDir = path.join(process.cwd(), 'public', 'ai-generated', 'audio')
        const outputPath = path.join(outputDir, fileName)

        // 确保目录存在
        await fs.mkdir(outputDir, { recursive: true })

        // 写入文件
        await fs.writeFile(outputPath, audioBuffer)

        this.log('info', `ElevenLabs TTS audio saved to: ${outputPath}`)

        // 构建可访问的 URL
        const publicUrl = `/ai-generated/audio/${fileName}`

        const results: GenerationResult[] = [
          {
            type: 'audio',
            url: publicUrl,
            metadata: {
              voiceId,
              modelId: 'eleven_v3',
              characterCount: text.length,
              voiceSettings,
              format: 'mp3',
              sampleRate: '44100',
              bitrate: '128',
              localPath: outputPath,
            },
          },
        ]

        return {
          status: 'SUCCESS',
          results,
          message: 'TTS generation completed successfully',
        }
      }

      // 未知响应类型
      return {
        status: 'ERROR',
        message: `Unexpected response content-type: ${contentType}`,
        error: {
          code: 'UNEXPECTED_RESPONSE',
          message: `Expected audio/mpeg but received ${contentType}`,
          isRetryable: false,
        },
      }
    } catch (error: unknown) {
      this.log('error', 'ElevenLabs TTS dispatch failed', error)

      // 处理 axios 错误
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: {
            status?: number
            data?: ElevenLabsErrorResponse | ArrayBuffer
            headers?: Record<string, string>
          }
        }

        if (axiosError.response) {
          const status = axiosError.response.status
          const data = axiosError.response.data

          // 尝试解析错误信息
          let errorMessage = 'Unknown error from ElevenLabs API'
          let errorCode = 'API_ERROR'

          if (data) {
            if (data instanceof ArrayBuffer) {
              try {
                const jsonData = JSON.parse(
                  Buffer.from(data).toString('utf-8')
                ) as ElevenLabsErrorResponse
                errorMessage = jsonData.detail?.message || jsonData.error || errorMessage
                errorCode = jsonData.detail?.status || errorCode
              } catch {
                // 无法解析为 JSON，使用默认错误信息
              }
            } else if (typeof data === 'object') {
              const errData = data as ElevenLabsErrorResponse
              errorMessage = errData.detail?.message || errData.error || errorMessage
              errorCode = errData.detail?.status || errorCode
            }
          }

          // 特殊处理不同的 HTTP 状态码
          if (status === 401) {
            return {
              status: 'ERROR',
              message: `ElevenLabs API Key 认证失败 (HTTP 401)。请检查 API Key 是否正确配置。`,
              error: {
                code: 'AUTHENTICATION_ERROR',
                message: `API Key 认证失败。请确保: 1) API Key 格式正确 (以 sk_ 或 xi-api-key 格式), 2) API Key 未过期, 3) 账户状态正常。HTTP 状态码: ${status}. 详情: ${errorMessage}`,
                isRetryable: false,
                details: { httpStatus: status, errorCode, errorMessage },
              },
            }
          }

          if (status === 402 || errorCode === 'quota_exceeded') {
            return {
              status: 'ERROR',
              message: `ElevenLabs 账户配额不足。请充值或升级您的计划。`,
              error: {
                code: 'QUOTA_EXCEEDED',
                message: `账户字符配额已用完。请访问 https://elevenlabs.io/app/settings/billing 充值。详情: ${errorMessage}`,
                isRetryable: false,
                details: { httpStatus: status },
              },
            }
          }

          if (status === 429) {
            return {
              status: 'ERROR',
              message: `请求过于频繁，已达到速率限制。请稍后再试。`,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `API 调用速率超限。请等待一段时间后重试。详情: ${errorMessage}`,
                isRetryable: true,
                details: { httpStatus: status },
              },
            }
          }

          // 根据状态码判断是否可重试
          const isRetryable = status ? status >= 500 : false

          return {
            status: 'ERROR',
            message: errorMessage,
            error: {
              code: errorCode,
              message: `HTTP ${status}: ${errorMessage}`,
              isRetryable,
              details: { httpStatus: status },
            },
          }
        }
      }

      // 通用错误处理
      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: {
          code: 'DISPATCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }
}
