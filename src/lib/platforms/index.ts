import { platformRegistry } from './base/platform-registry'
import { YouTubePlatform } from './youtube/youtube-platform'
import { BilibiliPlatform } from './bilibili/bilibili-platform'
import { XiaoyuzhouPlatform } from './xiaoyuzhou/xiaoyuzhou-platform'

// 导出接口和基类
export * from './base/platform-interface'
export * from './base/abstract-platform'
export * from './base/platform-registry'

// 导出具体平台
export { YouTubePlatform } from './youtube/youtube-platform'
export { BilibiliPlatform } from './bilibili/bilibili-platform'
export { XiaoyuzhouPlatform } from './xiaoyuzhou/xiaoyuzhou-platform'

/**
 * 初始化所有平台
 * 应在应用启动时调用
 */
export function initializePlatforms(ytDlpPath?: string): void {
  // 注册YouTube平台
  const youtubePlatform = new YouTubePlatform(ytDlpPath)
  platformRegistry.register(youtubePlatform)

  // 注册B站平台
  const bilibiliPlatform = new BilibiliPlatform(ytDlpPath)
  platformRegistry.register(bilibiliPlatform)

  // 注册小宇宙平台
  const xiaoyuzhouPlatform = new XiaoyuzhouPlatform(ytDlpPath)
  platformRegistry.register(xiaoyuzhouPlatform)
}

// 便捷访问
export { platformRegistry } 