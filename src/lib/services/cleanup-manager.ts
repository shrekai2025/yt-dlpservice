import * as fs from 'fs/promises'
import * as path from 'path'
import { ConfigManager } from '~/lib/utils/config'
import { Logger } from '~/lib/utils/logger'
import { db } from '~/server/db'

export class CleanupManager {
  private static instance: CleanupManager
  private cleanupIntervalId: NodeJS.Timeout | null = null
  private isCleanupRunning = false

  private constructor() {}

  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager()
    }
    return CleanupManager.instance
  }

  /**
   * 启动自动清理服务
   */
  async startAutoCleanup(): Promise<void> {
    try {
      Logger.info('启动自动文件清理服务')
      
      // 获取配置
      const config = await ConfigManager.getTyped()
      const intervalMs = config.cleanupIntervalHours * 60 * 60 * 1000

      // 立即执行一次清理
      await this.performCleanup()

      // 设置定时清理
      this.cleanupIntervalId = setInterval(async () => {
        try {
          await this.performCleanup()
        } catch (error) {
          Logger.error(`定时清理失败: ${error}`)
        }
      }, intervalMs)

      Logger.info(`自动清理已启动，间隔: ${config.cleanupIntervalHours}小时`)
    } catch (error) {
      Logger.error(`启动自动清理失败: ${error}`)
    }
  }

  /**
   * 停止自动清理服务
   */
  stopAutoCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
      Logger.info('自动文件清理服务已停止')
    }
  }

  /**
   * 执行手动清理
   */
  async manualCleanup(): Promise<{
    success: boolean
    message: string
    details: {
      tempFiles: number
      completedTasks: number
      totalSizeCleared: number
    }
  }> {
    try {
      if (this.isCleanupRunning) {
        return {
          success: false,
          message: '清理任务正在进行中，请稍后再试',
          details: { tempFiles: 0, completedTasks: 0, totalSizeCleared: 0 }
        }
      }

      this.isCleanupRunning = true
      Logger.info('开始手动文件清理')

      const result = await this.performCleanup(true)
      
      return {
        success: true,
        message: '手动清理完成',
        details: result
      }
    } catch (error) {
      Logger.error(`手动清理失败: ${error}`)
      return {
        success: false,
        message: `清理失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { tempFiles: 0, completedTasks: 0, totalSizeCleared: 0 }
      }
    } finally {
      this.isCleanupRunning = false
    }
  }

  /**
   * 执行清理操作
   */
  private async performCleanup(isManual: boolean = false): Promise<{
    tempFiles: number
    completedTasks: number
    totalSizeCleared: number
  }> {
    const config = await ConfigManager.getTyped()
    const cutoffTime = Date.now() - (config.maxFileAgeHours * 60 * 60 * 1000)
    
    let tempFilesCount = 0
    let completedTasksCount = 0
    let totalSizeCleared = 0

    // 1. 清理临时文件目录
    const tempDirs = [
      config.tempDir,
      // 只清理配置的临时目录，不再硬编码特定路径
    ]

    for (const tempDir of tempDirs) {
      try {
        const result = await this.cleanupDirectory(tempDir, cutoffTime, isManual)
        tempFilesCount += result.filesCount
        totalSizeCleared += result.sizeCleared
      } catch (error) {
        Logger.warn(`清理目录 ${tempDir} 失败: ${error}`)
      }
    }

    // 2. 清理已完成任务的文件（如果是手动清理或超过保留期）
    const taskCleanupAge = isManual ? 0 : config.maxFileAgeHours * 2 // 已完成任务保留更长时间
    completedTasksCount = await this.cleanupCompletedTasks(taskCleanupAge)

    // 3. 清理豆包测试临时文件
    const doubaoTempCount = await this.cleanupDoubaoTempFiles(cutoffTime)
    tempFilesCount += doubaoTempCount

    const logLevel = isManual ? 'info' : 'debug'
    Logger[logLevel](`文件清理完成 - 临时文件: ${tempFilesCount}, 已完成任务: ${completedTasksCount}, 总大小: ${this.formatBytes(totalSizeCleared)}`)

    return {
      tempFiles: tempFilesCount,
      completedTasks: completedTasksCount,
      totalSizeCleared
    }
  }

  /**
   * 清理指定目录
   */
  private async cleanupDirectory(
    directory: string, 
    cutoffTime: number, 
    isManual: boolean = false
  ): Promise<{ filesCount: number; sizeCleared: number }> {
    let filesCount = 0
    let sizeCleared = 0

    try {
      // 检查目录是否存在
      try {
        await fs.access(directory)
      } catch {
        return { filesCount: 0, sizeCleared: 0 }
      }

      const items = await fs.readdir(directory, { withFileTypes: true })

      for (const item of items) {
        const itemPath = path.join(directory, item.name)

        try {
          if (item.isDirectory()) {
            // 跳过受保护的目录
            if (this.isProtectedFile(itemPath)) {
              Logger.debug(`跳过受保护目录: ${itemPath}`)
              continue
            }

            // 递归清理子目录
            try {
              const subResult = await this.cleanupDirectory(itemPath, cutoffTime, isManual)
              filesCount += subResult.filesCount
              sizeCleared += subResult.sizeCleared

              // 检查目录是否为空，如果是则删除
              try {
                const subItems = await fs.readdir(itemPath)
                if (subItems.length === 0) {
                  await fs.rmdir(itemPath)
                  Logger.debug(`删除空目录: ${itemPath}`)
                }
              } catch (error) {
                Logger.debug(`检查空目录失败: ${itemPath}`)
              }
            } catch (error: any) {
              if (error.code === 'EACCES' || error.code === 'EPERM') {
                Logger.debug(`跳过无权限目录: ${itemPath}`)
              } else {
                Logger.warn(`读取目录失败 ${itemPath}: ${error}`)
              }
            }
          } else if (item.isFile()) {
            const stat = await fs.stat(itemPath)
            
            // 检查文件是否过期
            if (isManual || stat.mtime.getTime() < cutoffTime) {
              // 特殊文件保护
              if (this.isProtectedFile(itemPath)) {
                Logger.debug(`跳过受保护文件: ${itemPath}`)
                continue
              }

              try {
                const fileSize = stat.size
                await fs.unlink(itemPath)
                filesCount++
                sizeCleared += fileSize
                Logger.debug(`清理过期文件: ${itemPath} (${this.formatBytes(fileSize)})`)
              } catch (error: any) {
                if (error.code === 'EACCES' || error.code === 'EPERM') {
                  Logger.debug(`跳过无权限文件: ${itemPath}`)
                } else {
                  Logger.warn(`清理文件失败 ${itemPath}: ${error}`)
                }
              }
            }
          }
        } catch (error) {
          Logger.warn(`清理项目失败 ${itemPath}: ${error}`)
        }
      }
    } catch (error) {
      Logger.warn(`读取目录失败 ${directory}: ${error}`)
    }

    return { filesCount, sizeCleared }
  }

  /**
   * 清理已完成任务的文件
   */
  private async cleanupCompletedTasks(maxAgeHours: number): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000))
      
      // 查找需要清理的已完成任务
      const tasksToClean = await db.task.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            lt: cutoffDate
          },
          OR: [
            { videoPath: { not: null } },
            { audioPath: { not: null } }
          ]
        }
      })

      let cleanedCount = 0

      for (const task of tasksToClean) {
        try {
          // 删除视频文件
          if (task.videoPath) {
            try {
              await fs.unlink(task.videoPath)
              Logger.debug(`清理任务视频文件: ${task.videoPath}`)
            } catch (error) {
              Logger.debug(`视频文件可能已被删除: ${task.videoPath}`)
            }
          }

          // 删除音频文件
          if (task.audioPath) {
            try {
              await fs.unlink(task.audioPath)
              Logger.debug(`清理任务音频文件: ${task.audioPath}`)
            } catch (error) {
              Logger.debug(`音频文件可能已被删除: ${task.audioPath}`)
            }
          }

          // 更新数据库，清除文件路径
          await db.task.update({
            where: { id: task.id },
            data: {
              videoPath: null,
              audioPath: null
            }
          })

          cleanedCount++
        } catch (error) {
          Logger.warn(`清理任务 ${task.id} 的文件失败: ${error}`)
        }
      }

      return cleanedCount
    } catch (error) {
      Logger.error(`清理已完成任务失败: ${error}`)
      return 0
    }
  }

  /**
   * 清理豆包测试临时文件
   */
  private async cleanupDoubaoTempFiles(cutoffTime: number): Promise<number> {
    try {
      const tempDir = '/tmp'
      const items = await fs.readdir(tempDir)
      let count = 0

      for (const item of items) {
        if (item.startsWith('doubao_test_') && item.endsWith('.mp3')) {
          const filePath = path.join(tempDir, item)
          try {
            const stat = await fs.stat(filePath)
            if (stat.mtime.getTime() < cutoffTime) {
              await fs.unlink(filePath)
              count++
              Logger.debug(`清理豆包测试文件: ${filePath}`)
            }
          } catch (error) {
            Logger.debug(`清理豆包测试文件失败: ${filePath}`)
          }
        }
      }

      return count
    } catch (error) {
      Logger.warn(`清理豆包测试文件失败: ${error}`)
      return 0
    }
  }

  /**
   * 检查是否为受保护的文件或目录
   */
  private isProtectedFile(filePath: string): boolean {
    const protectedPatterns = [
      /\.gitkeep$/,
      /\.keep$/,
      /package\.json$/,
      /\.env/,
      /\.db$/,
      /\.log$/,
      /node_modules/,
      /\.git/,
      /\.next/,
      /dist/,
      /build/,
      // 系统相关目录和文件
      /systemd-private-/,
      /snap-private-/,
      /tat_agent/,
      /\.lock$/,
      /\.sh$/,
      // GPU和硬件相关
      /gpu/i,
      /nvenc/i,
      /stargate/,
    ]

    return protectedPatterns.some(pattern => pattern.test(filePath))
  }

  /**
   * 格式化文件大小
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 获取清理状态
   */
  getStatus(): {
    autoCleanupEnabled: boolean
    isRunning: boolean
  } {
    return {
      autoCleanupEnabled: this.cleanupIntervalId !== null,
      isRunning: this.isCleanupRunning
    }
  }
}

// 导出单例实例
export const cleanupManager = CleanupManager.getInstance() 