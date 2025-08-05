import axios from 'axios'
import { Logger } from '~/lib/utils/logger'

/**
 * URL标准化服务
 * 处理各种B站URL格式，统一转换为标准桌面端URL
 */
export class UrlNormalizer {
  private static instance: UrlNormalizer
  
  private constructor() {}
  
  static getInstance(): UrlNormalizer {
    if (!UrlNormalizer.instance) {
      UrlNormalizer.instance = new UrlNormalizer()
    }
    return UrlNormalizer.instance
  }
  
  /**
   * 标准化URL - 主入口方法
   */
  async normalizeUrl(inputUrl: string): Promise<string> {
    // 首先检查是否是B站URL，如果不是则直接返回原始URL
    if (!this.isBilibiliUrl(inputUrl)) {
      Logger.info(`⏭️ 非B站URL，跳过标准化: ${inputUrl}`);
      return inputUrl;
    }

    try {
      Logger.info(`🔗 开始标准化B站URL: ${inputUrl}`);
      
      // 1. 基础URL清理
      let cleanUrl = this.cleanUrl(inputUrl);
      Logger.info(`🧹 基础清理后: ${cleanUrl}`);
      
      // 2. 检测并处理短链接
      if (this.isShortUrl(cleanUrl)) {
        cleanUrl = await this.resolveShortUrl(cleanUrl);
        Logger.info(`🔄 短链接解析后: ${cleanUrl}`);
      }
      
      // 3. 提取BV号并构造标准URL
      const bvId = this.extractBvId(cleanUrl);
      if (!bvId) {
        throw new Error('无法从URL中提取BV号');
      }
      
      const standardUrl = this.buildStandardUrl(bvId, cleanUrl);
      Logger.info(`✅ 标准化完成: ${standardUrl}`);
      
      return standardUrl;
      
    } catch (error) {
      Logger.error(`URL标准化失败: ${error instanceof Error ? error.message : String(error)}`);
      // 如果标准化失败，返回原始URL作为兜底
      return inputUrl;
    }
  }
  
  /**
   * 基础URL清理
   */
  private cleanUrl(url: string): string {
    // 移除开头的 @ 符号（如果有）
    let cleaned = url.replace(/^@/, '')
    
    // 确保有协议
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned
    }
    
    // 处理常见的URL格式问题
    cleaned = cleaned.replace(/\s+/g, '') // 移除空格
    
    return cleaned
  }
  
  /**
   * 检测是否为短链接
   */
  private isShortUrl(url: string): boolean {
    return url.includes('b23.tv')
  }
  
  /**
   * 解析短链接重定向
   */
  private async resolveShortUrl(shortUrl: string): Promise<string> {
    try {
      Logger.info(`🔍 正在解析短链接: ${shortUrl}`)
      
      // 使用GET请求，因为它比HEAD更能保证触发重定向
      const response = await axios.get(shortUrl, {
        maxRedirects: 5,
        timeout: 10000,
        // 我们只关心最终的URL，所以可以设置一个小的响应体大小限制
        maxContentLength: 1024, // 只读取最多1KB内容
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      
      const finalUrl = response.request.res.responseUrl || shortUrl
      
      if (finalUrl === shortUrl) {
        Logger.warn(`⚠️ 短链接解析后URL未改变，可能解析失败: ${finalUrl}`)
      } else {
        Logger.info(`✅ 短链接解析成功: ${finalUrl}`)
      }
      
      return finalUrl
      
    } catch (error) {
      // 即便有网络错误（比如maxContentLength超出），我们仍然可能从请求历史中拿到最终URL
      if (axios.isAxiosError(error) && error.request?.res?.responseUrl) {
        const finalUrl = error.request.res.responseUrl;
        Logger.info(`✅ 从请求错误中成功恢复最终URL: ${finalUrl}`);
        return finalUrl;
      }
      Logger.warn(`短链接解析失败，使用原URL: ${error instanceof Error ? error.message : String(error)}`)
      return shortUrl
    }
  }
  
  /**
   * 从URL中提取BV号
   */
  private extractBvId(url: string): string | null {
    // 支持多种BV号提取模式
    const patterns = [
      /\/video\/(BV[a-zA-Z0-9]+)/,  // 标准格式: /video/BVxxxxx
      /\/(BV[a-zA-Z0-9]+)/,         // 路径中的BV号: /BVxxxxx
      /BV([a-zA-Z0-9]+)/            // 通用匹配: BVxxxxx
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        // 确保返回完整的BV号，但不重复BV前缀
        let bvId = match[1] || match[0]
        if (!bvId.startsWith('BV')) {
          bvId = `BV${bvId}`
        }
        Logger.debug(`📝 提取到BV号: ${bvId}`)
        return bvId
      }
    }
    
    Logger.warn(`⚠️ 无法从URL提取BV号: ${url}`)
    return null
  }
  
  /**
   * 构造标准桌面端URL
   */
  private buildStandardUrl(bvId: string, originalUrl: string): string {
    // 提取分P参数（如果有）
    const pMatch = originalUrl.match(/[?&]p=(\d+)/)
    const pParam = pMatch ? `?p=${pMatch[1]}` : ''
    
    const standardUrl = `https://www.bilibili.com/video/${bvId}${pParam}`
    return standardUrl
  }
  
  /**
   * 检测是否为B站URL
   */
  isBilibiliUrl(url: string): boolean {
    const bilibiliDomains = [
      'bilibili.com',
      'm.bilibili.com', 
      'www.bilibili.com',
      'b23.tv'
    ]
    
    return bilibiliDomains.some(domain => url.includes(domain))
  }
}

// 导出单例实例
export const urlNormalizer = UrlNormalizer.getInstance() 