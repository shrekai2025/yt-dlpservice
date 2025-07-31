import { AbstractPlatform } from '../base/abstract-platform'
import { browserManager } from '~/lib/services/browser-manager'
import { urlNormalizer } from '~/lib/services/url-normalizer'
import type { ContentInfo, DownloadConfig, PlatformValidation, ContentType } from '../base/platform-interface'
import { ContentInfoError, ConfigurationError } from '~/lib/utils/errors'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * B站平台实现
 */
export class BilibiliPlatform extends AbstractPlatform {
  name = 'bilibili'
  supportedDomains = ['bilibili.com', 'www.bilibili.com', 'm.bilibili.com', 'b23.tv']
  supportedContentTypes: ContentType[] = ['video']
  requiresAuth = false // 可选认证

  constructor(ytDlpPath?: string) {
    super(ytDlpPath)
  }

  /**
   * B站URL验证逻辑
   */
  validateUrl(url: string): PlatformValidation {
    try {
      // 使用现有的isBilibiliUrl逻辑
      if (urlNormalizer.isBilibiliUrl(url)) {
        const urlObj = new URL(url)
        
        // 检查是否包含BV号
        if (url.includes('BV') || url.includes('/video/')) {
          return {
            isSupported: true,
            confidence: 1.0,
            reason: 'B站视频URL，包含BV号'
          }
        }
        
        // 短链接
        if (urlObj.hostname.includes('b23.tv')) {
          return {
            isSupported: true,
            confidence: 0.9,
            reason: 'B站短链接，需要解析'
          }
        }
        
        // B站域名但格式不确定
        return {
          isSupported: true,
          confidence: 0.7,
          reason: 'B站域名，可能包含视频内容'
        }
      }
      
      return {
        isSupported: false,
        confidence: 0,
        reason: '不是B站URL'
      }
    } catch (error) {
      return {
        isSupported: false,
        confidence: 0,
        reason: `URL解析错误: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * B站URL标准化
   */
  async normalizeUrl(url: string): Promise<string> {
    try {
      this.log('info', `标准化B站URL: ${url}`)
      const normalizedUrl = await urlNormalizer.normalizeUrl(url)
      this.log('info', `标准化完成: ${normalizedUrl}`)
      return normalizedUrl
    } catch (error) {
      this.log('warn', `URL标准化失败，使用原始URL: ${error}`)
      return url.trim()
    }
  }

  /**
   * 获取B站视频信息
   */
  async getContentInfo(url: string): Promise<ContentInfo> {
    this.log('info', `获取B站视频信息: ${url}`)
    
    try {
      // 先标准化URL
      const normalizedUrl = await this.normalizeUrl(url)
      
      const command = this.buildYtDlpCommand('--no-warnings --dump-json --no-check-certificate --quiet')
      const { stdout } = await execAsync(`${command} "${normalizedUrl}"`)
      
      // 清理输出，提取JSON部分
      let cleanedOutput = stdout.trim()
      
      // 如果输出包含多行，尝试找到JSON行
      if (cleanedOutput.includes('\n')) {
        const lines = cleanedOutput.split('\n')
        // 查找以 { 开头的行（JSON对象）
        const jsonLine = lines.find(line => line.trim().startsWith('{'))
        if (jsonLine) {
          cleanedOutput = jsonLine.trim()
        }
      }
      
      // 检查是否为有效JSON格式
      if (!cleanedOutput.startsWith('{') || !cleanedOutput.endsWith('}')) {
        this.log('error', `yt-dlp输出格式异常: ${cleanedOutput.substring(0, 200)}...`)
        throw new Error(`yt-dlp输出格式异常，可能是网络错误或视频不可访问`)
      }
      
      const videoInfo = JSON.parse(cleanedOutput)
      
      return {
        id: videoInfo.id || '',
        title: videoInfo.title || '',
        duration: videoInfo.duration || 0,
        contentType: 'video',
        platform: this.name,
        thumbnail: videoInfo.thumbnail || '',
        uploader: videoInfo.uploader || '',
        upload_date: videoInfo.upload_date || '',
        view_count: videoInfo.view_count || 0,
        like_count: videoInfo.like_count || 0,
        description: videoInfo.description || '',
        formats: videoInfo.formats || []
      }
    } catch (error: any) {
      this.log('error', `获取B站视频信息失败: ${error.message}`)
      throw new ContentInfoError(`获取B站视频信息失败: ${error.message}`, error)
    }
  }

  /**
   * 添加B站特定的yt-dlp参数
   */
  async addPlatformSpecificArgs(command: string, url: string, useBrowserCookies: boolean = true): Promise<string> {
    let enhancedCommand = this.addCommonArgs(command)
    
    // 添加B站专用请求头
    const bilibiliHeaders = [
      'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer: https://www.bilibili.com/'
    ]
    
    for (const header of bilibiliHeaders) {
      enhancedCommand += ` --add-header "${header}"`
    }
    
    // 添加B站专用的extractor参数
    enhancedCommand += ' --extractor-args "bilibili:video_info_prefer_api_over_html=true"'
    
    // 添加B站Cookie支持
    if (useBrowserCookies) {
      try {
        const cookiesFile = await browserManager.getCookiesForYtDlp()
        if (cookiesFile) {
          enhancedCommand += ` --cookies "${cookiesFile}"`
          this.log('info', '✅ 已添加B站浏览器Cookie支持')
        }
      } catch (error) {
        this.log('warn', '获取B站浏览器cookies失败，使用默认方式')
      }
    }
    
    this.log('info', '🎯 已添加B站专用请求头和选项')
    return enhancedCommand
  }

  /**
   * B站音频下载的特殊配置
   */
  async getDownloadConfig(url: string, downloadType: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'): Promise<DownloadConfig> {
    const contentInfo = await this.getContentInfo(url)
    
    switch (downloadType) {
      case 'AUDIO_ONLY':
        return {
          format: 'bestaudio/best',
          outputTemplate: this.buildOutputTemplate('audio'),
          audioOnly: true,
          extractAudio: true,
          additionalArgs: [
            '--audio-format', 'mp3',
            '--audio-quality', '5',
            '--no-playlist',  // 只下载单个视频，不下载整个播放列表
            '--postprocessor-args', '"ffmpeg:-ar 16000 -ac 1 -ab 64k"'  // 16kHz单声道64k比特率，符合豆包API要求
          ]
        }
      case 'VIDEO_ONLY':
        return {
          format: 'best[height<=720]',
          outputTemplate: this.buildOutputTemplate('video'),
          audioOnly: false,
          additionalArgs: [
            '--no-playlist'  // 只下载单个视频，不下载整个播放列表
          ]
        }
      case 'BOTH':
        return {
          format: 'best',
          outputTemplate: this.buildOutputTemplate('video'),
          audioOnly: false,
          additionalArgs: [
            '--no-playlist'  // 只下载单个视频，不下载整个播放列表
          ]
        }
      default:
        throw new ConfigurationError(`不支持的下载类型: ${downloadType}`)
    }
  }


} 