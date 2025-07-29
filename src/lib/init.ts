import { TaskProcessor } from './services/task-processor'
import { Logger } from './utils/logger'

const taskProcessor = new TaskProcessor()

/**
 * 初始化应用服务
 */
export async function initializeApp(): Promise<void> {
  try {
    Logger.info('开始初始化应用服务')
    
    // 启动任务处理器（包含自动清理服务）
    await taskProcessor.start()
    
    Logger.info('应用服务初始化完成')
  } catch (error) {
    Logger.error(`应用服务初始化失败: ${error}`)
    throw error
  }
}

// 在模块加载时自动初始化
if (typeof window === 'undefined') { // 仅在服务端运行
  initializeApp().catch(error => {
    Logger.error(`自动初始化失败: ${error}`)
  })
} 