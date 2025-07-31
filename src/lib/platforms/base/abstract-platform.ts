import { Logger } from '~/lib/utils/logger'
import { ConfigurationError } from '~/lib/utils/errors'
import type { IPlatform, ContentInfo, DownloadConfig, PlatformValidation, ContentType } from './platform-interface'

/**
 * 抽象平台基类
 * 提供通用的实现逻辑，子类可以覆盖或扩展
 */
export abstract class AbstractPlatform implements IPlatform {
  abstract name: string
  abstract supportedDomains: string[]
  abstract supportedContentTypes: ContentType[]
  abstract requiresAuth: boolean
  
  protected ytDlpPath: string = 'yt-dlp'

  constructor(ytDlpPath?: string) {
    if (ytDlpPath) {
      this.ytDlpPath = ytDlpPath
    }
  }

  /**
   * 默认URL验证逻辑
   * 基于域名匹配
   */
  validateUrl(url: string): PlatformValidation {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      
      // 检查是否匹配支持的域名
      for (const domain of this.supportedDomains) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return {
            isSupported: true,
            confidence: 1.0,
            reason: `匹配域名: ${domain}`
          }
        }
      }
      
      return {
        isSupported: false,
        confidence: 0,
        reason: `不支持的域名: ${hostname}`
      }
    } catch (error) {
      return {
        isSupported: false,
        confidence: 0,
        reason: `无效的URL: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 默认URL标准化
   * 子类应该覆盖此方法提供平台特定的逻辑
   */
  async normalizeUrl(url: string): Promise<string> {
    // 基础清理
    return url.trim()
  }

  /**
   * 构建输出模板
   */
  protected buildOutputTemplate(contentType: 'video' | 'audio' | 'podcast', suffix: string = ''): string {
    const typeMap = {
      'video': 'video',
      'audio': 'audio',
      'podcast': 'audio'
    }
    return `%(id)s_${typeMap[contentType]}${suffix}.%(ext)s`
  }

  /**
   * 检查是否为音频内容
   */
  protected isAudioContent(contentType: 'video' | 'audio' | 'podcast'): boolean {
    return contentType === 'audio' || contentType === 'podcast'
  }

  /**
   * 默认下载配置
   */
  async getDownloadConfig(url: string, downloadType: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'): Promise<DownloadConfig> {
    const contentInfo = await this.getContentInfo(url)
    
    // 如果是音频内容，强制使用音频下载
    if (this.isAudioContent(contentInfo.contentType)) {
              return {
          format: 'worstaudio/worst[acodec!=none]/bestaudio[abr<=128]/best[abr<=128]',  // 优先选择低质量音频
          outputTemplate: this.buildOutputTemplate(contentInfo.contentType),
          audioOnly: true,
          extractAudio: true,
          additionalArgs: [
            '--audio-format', 'mp3', 
            '--audio-quality', '9',  // 使用最低质量
            '--no-playlist',
            '--postprocessor-args', '"ffmpeg:-ar 16000 -ac 1 -b:a 32k"',  // 32k比特率
            '--retries', '10',
            '--fragment-retries', '10',
            '--retry-sleep', '1'
          ]
        }
    }

    // 视频内容根据下载类型决定
    switch (downloadType) {
      case 'AUDIO_ONLY':
        return {
          format: 'worstaudio/worst[acodec!=none]/bestaudio[abr<=128]/best[abr<=128]',  // 优先选择低质量音频
          outputTemplate: this.buildOutputTemplate('audio'),
          audioOnly: true,
          extractAudio: true,
          additionalArgs: [
            '--audio-format', 'mp3', 
            '--audio-quality', '9',  // 使用最低质量，保证音频能听清即可
            '--no-playlist',
            '--postprocessor-args', '"ffmpeg:-ar 16000 -ac 1 -b:a 32k"',  // 降低比特率到32k
            '--retries', '10',  // 增加重试次数
            '--fragment-retries', '10',  // 分片重试次数
            '--retry-sleep', '1'  // 重试间隔1秒
          ]
        }
      case 'VIDEO_ONLY':
        return {
          format: 'best[height<=720]',
          outputTemplate: this.buildOutputTemplate('video'),
          audioOnly: false,
          additionalArgs: ['--no-playlist']
        }
      case 'BOTH':
        return {
          format: 'best',
          outputTemplate: this.buildOutputTemplate('video'),
          audioOnly: false,
          additionalArgs: ['--no-playlist']
        }
      default:
        throw new ConfigurationError(`不支持的下载类型: ${downloadType}`)
    }
  }

  /**
   * 添加通用的yt-dlp参数
   */
  protected addCommonArgs(command: string): string {
    return command + ' --no-warnings --no-check-certificate'
  }

  /**
   * 默认的平台特定参数处理
   * 子类应覆盖此方法
   */
  async addPlatformSpecificArgs(command: string, url: string, useBrowserCookies: boolean = true): Promise<string> {
    return this.addCommonArgs(command)
  }

  /**
   * 记录平台操作日志
   */
  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, extra?: any): void {
    const fullMessage = `[${this.name}] ${message}`
    switch (level) {
      case 'info':
        if (extra !== undefined) {
          Logger.info(fullMessage, extra)
        } else {
          Logger.info(fullMessage)
        }
        break
      case 'warn':
        if (extra !== undefined) {
          Logger.warn(fullMessage, extra)
        } else {
          Logger.warn(fullMessage)
        }
        break
      case 'error':
        if (extra !== undefined) {
          Logger.error(fullMessage, extra)
        } else {
          Logger.error(fullMessage)
        }
        break
      case 'debug':
        if (extra !== undefined) {
          Logger.debug(fullMessage, extra)
        } else {
          Logger.debug(fullMessage)
        }
        break
    }
  }

  // 抽象方法，子类必须实现
  abstract getContentInfo(url: string): Promise<ContentInfo>

  /**
   * 构建yt-dlp命令
   * 提取自YouTube和Bilibili平台的通用方法
   */
  protected buildYtDlpCommand(args: string): string {
    if (this.ytDlpPath.includes('python3 -m')) {
      return `${this.ytDlpPath} ${args}`
    } else {
      return `${this.ytDlpPath} ${args}`
    }
  }
} 