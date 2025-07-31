import { TaskProcessor } from './services/task-processor'
import { Logger } from './utils/logger'
import { initializePlatforms } from './platforms'
import { contentDownloader } from './services/content-downloader'
import { GlobalInit } from './utils/global-init'

// 创建全局的TaskProcessor实例
export const taskProcessor = new TaskProcessor()

/**
 * 初始化应用服务
 */
export async function initializeApp(): Promise<void> {
  // 尝试获取应用初始化权限
  if (!GlobalInit.tryInitializeApp()) {
    // 如果没有获取到权限，等待其他实例完成初始化
    await GlobalInit.waitForApp()
    return
  }
  
  try {
    Logger.info('开始初始化应用服务')
    
    // 先初始化ContentDownloader并检测yt-dlp路径
    const ytDlpPath = await contentDownloader.getYtDlpPath()
    Logger.info(`✅ 获取到yt-dlp路径: ${ytDlpPath}`)
    
    // 使用检测到的路径初始化平台插件
    initializePlatforms(ytDlpPath)
    Logger.info('✅ 平台插件初始化完成')
    
    // 启动任务处理器（包含自动清理服务）
    await taskProcessor.start()
    
    Logger.info('应用服务初始化完成')
    GlobalInit.setAppInitialized()
  } catch (error) {
    GlobalInit.setAppInitializationFailed()
    Logger.error(`应用服务初始化失败: ${error}`)
    throw error
  }
}

// 移除自动初始化，改为按需初始化
// 应用初始化现在通过 tRPC 路由的第一次调用触发 