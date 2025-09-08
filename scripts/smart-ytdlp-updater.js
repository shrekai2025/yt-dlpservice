#!/usr/bin/env node

/**
 * 智能 YT-DLP 更新器
 * 
 * 功能特性：
 * 1. 任务感知 - 检测正在执行的任务，避免更新冲突
 * 2. 智能重试 - 如果有任务执行，等待并重试
 * 3. 时间窗口 - 在指定时间窗口内完成更新
 * 4. 强制更新 - 超过最大时间后强制更新
 * 5. 服务管理 - 更新后自动重启服务
 * 6. 状态记录 - 完整的更新日志和状态跟踪
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { TaskStatusChecker } from './task-status-checker.js'

const execAsync = promisify(exec)

// 配置参数
const CONFIG = {
  // 时间配置
  MAX_WAIT_HOURS: 6,           // 最大等待时间（小时）
  RETRY_INTERVAL_MINUTES: 30,  // 重试间隔（分钟）
  FORCE_UPDATE_HOURS: 72,      // 强制更新间隔（小时）
  
  // 更新窗口时间
  UPDATE_WINDOW_START: 3,      // 开始时间（小时）
  UPDATE_WINDOW_END: 9,        // 结束时间（小时）
  
  // 日志配置
  LOG_FILE: 'logs/ytdlp-updater.log',
  STATUS_FILE: 'logs/ytdlp-update-status.json',
  
  // 服务配置
  SERVICE_NAME: 'yt-dlpservice',
  PM2_ECOSYSTEM: 'ecosystem.config.cjs'
}

// 日志颜色
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

class SmartYtdlpUpdater {
  constructor() {
    this.taskChecker = new TaskStatusChecker()
    this.logFile = CONFIG.LOG_FILE
    this.statusFile = CONFIG.STATUS_FILE
    this.startTime = new Date()
  }

  /**
   * 主更新流程
   */
  async run() {
    try {
      await this.log('INFO', '🚀 智能YT-DLP更新器启动', colors.blue)
      await this.log('INFO', `更新窗口: ${CONFIG.UPDATE_WINDOW_START}:00 - ${CONFIG.UPDATE_WINDOW_END}:00`, colors.blue)
      
      // 检查是否在更新窗口内
      if (!this.isInUpdateWindow() && !this.shouldForceUpdate()) {
        await this.log('WARN', '⏰ 当前不在更新窗口内，退出', colors.yellow)
        return false
      }

      // 检查是否需要强制更新
      const forceUpdate = this.shouldForceUpdate()
      if (forceUpdate) {
        await this.log('WARN', '⚠️ 检测到长时间未更新，将强制执行更新', colors.yellow)
      }

      // 智能等待逻辑
      const canUpdate = await this.waitForSafeUpdate(forceUpdate)
      
      if (!canUpdate && !forceUpdate) {
        await this.log('WARN', '⏭️ 在允许时间内无法找到安全更新窗口，跳过本次更新', colors.yellow)
        await this.updateStatus('skipped', '在允许时间内无法找到安全更新窗口')
        return false
      }

      // 执行更新
      await this.log('INFO', '🔄 开始执行YT-DLP更新...', colors.green)
      const updateResult = await this.performUpdate()

      if (updateResult.success) {
        await this.log('INFO', '✅ YT-DLP更新成功', colors.green)
        
        // 重启服务
        const restartResult = await this.restartService()
        
        if (restartResult.success) {
          await this.log('INFO', '🎉 服务重启成功，更新流程完成', colors.green)
          await this.updateStatus('success', 'YT-DLP更新和服务重启完成', updateResult)
          return true
        } else {
          await this.log('ERROR', '❌ 服务重启失败', colors.red)
          await this.updateStatus('partial', 'YT-DLP更新成功但服务重启失败', updateResult)
          return false
        }
      } else {
        await this.log('ERROR', '❌ YT-DLP更新失败', colors.red)
        await this.updateStatus('failed', 'YT-DLP更新失败', updateResult)
        return false
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      await this.log('ERROR', `💥 更新流程异常: ${errorMsg}`, colors.red)
      await this.updateStatus('error', `更新流程异常: ${errorMsg}`)
      throw error
    }
  }

  /**
   * 智能等待安全更新窗口
   */
  async waitForSafeUpdate(forceUpdate = false) {
    const maxWaitTime = CONFIG.MAX_WAIT_HOURS * 60 * 60 * 1000
    const retryInterval = CONFIG.RETRY_INTERVAL_MINUTES * 60 * 1000
    const endTime = this.startTime.getTime() + maxWaitTime

    let attempt = 1

    while (Date.now() < endTime) {
      await this.log('INFO', `🔍 第 ${attempt} 次检查任务状态...`, colors.cyan)
      
      const taskStatus = await this.taskChecker.checkTaskStatus()
      
      if (!taskStatus.hasActiveTasks) {
        await this.log('INFO', '✅ 系统空闲，可以安全更新', colors.green)
        return true
      } else {
        await this.log('WARN', `⚠️ 检测到活跃任务，${taskStatus.summary}`, colors.yellow)
        
        if (forceUpdate) {
          await this.log('WARN', '🔥 强制更新模式，忽略活跃任务继续更新', colors.yellow)
          return true
        }

        const remainingTime = Math.round((endTime - Date.now()) / 60000)
        await this.log('INFO', `⏳ 等待 ${CONFIG.RETRY_INTERVAL_MINUTES} 分钟后重试（剩余 ${remainingTime} 分钟）`, colors.blue)
        
        // 等待重试间隔
        await this.sleep(retryInterval)
        attempt++
      }
    }

    await this.log('WARN', '⏰ 已超过最大等待时间', colors.yellow)
    return false
  }

  /**
   * 执行YT-DLP更新
   */
  async performUpdate() {
    try {
      await this.log('INFO', '📦 开始更新YT-DLP...', colors.blue)
      
      // 获取当前版本
      const currentVersion = await this.getCurrentVersion()
      await this.log('INFO', `当前版本: ${currentVersion}`, colors.blue)

      // 执行更新脚本
      const updateScriptPath = path.join(process.cwd(), 'scripts', 'update-ytdlp.sh')
      const updateCommand = `bash "${updateScriptPath}" --restart-service`
      
      await this.log('INFO', `执行更新命令: ${updateCommand}`, colors.blue)
      
      const { stdout, stderr } = await execAsync(updateCommand, {
        cwd: process.cwd(),
        timeout: 10 * 60 * 1000, // 10分钟超时
        encoding: 'utf8'
      })

      // 检查新版本
      const newVersion = await this.getCurrentVersion()
      const versionChanged = currentVersion !== newVersion

      await this.log('INFO', `更新后版本: ${newVersion}`, colors.blue)

      if (versionChanged) {
        await this.log('INFO', `✅ 版本已更新: ${currentVersion} → ${newVersion}`, colors.green)
      } else {
        await this.log('INFO', '📝 版本未发生变化，可能已是最新版本', colors.blue)
      }

      return {
        success: true,
        currentVersion,
        newVersion,
        versionChanged,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      await this.log('ERROR', `YT-DLP更新失败: ${errorMsg}`, colors.red)
      
      if (error && typeof error === 'object' && 'stdout' in error) {
        await this.log('DEBUG', `stdout: ${error.stdout}`, colors.blue)
      }
      if (error && typeof error === 'object' && 'stderr' in error) {
        await this.log('DEBUG', `stderr: ${error.stderr}`, colors.red)
      }

      return {
        success: false,
        error: errorMsg,
        stdout: (error && typeof error === 'object' && 'stdout' in error) ? error.stdout : '',
        stderr: (error && typeof error === 'object' && 'stderr' in error) ? error.stderr : ''
      }
    }
  }

  /**
   * 重启服务
   */
  async restartService() {
    try {
      await this.log('INFO', '🔄 重启服务...', colors.blue)

      // 尝试使用PM2重启
      try {
        const { stdout } = await execAsync(`pm2 restart ${CONFIG.SERVICE_NAME}`)
        await this.log('INFO', '✅ PM2服务重启成功', colors.green)
        return {
          success: true,
          method: 'pm2',
          output: stdout.trim()
        }
      } catch (pm2Error) {
        const pm2ErrorMsg = pm2Error instanceof Error ? pm2Error.message : String(pm2Error)
        await this.log('WARN', `PM2重启失败，尝试其他方法: ${pm2ErrorMsg}`, colors.yellow)
      }

      // 尝试使用systemd重启
      try {
        const { stdout } = await execAsync(`sudo systemctl restart ${CONFIG.SERVICE_NAME}`)
        await this.log('INFO', '✅ systemd服务重启成功', colors.green)
        return {
          success: true,
          method: 'systemd',
          output: stdout.trim()
        }
      } catch (systemdError) {
        const systemdErrorMsg = systemdError instanceof Error ? systemdError.message : String(systemdError)
        await this.log('WARN', `systemd重启失败: ${systemdErrorMsg}`, colors.yellow)
      }

      throw new Error('所有服务重启方法都失败了')

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      await this.log('ERROR', `服务重启失败: ${errorMsg}`, colors.red)
      return {
        success: false,
        error: errorMsg
      }
    }
  }

  /**
   * 获取当前YT-DLP版本
   */
  async getCurrentVersion() {
    try {
      let version = 'unknown'
      
      // 尝试不同的命令获取版本
      const commands = [
        'yt-dlp --version',
        'python3 -m yt_dlp --version',
        '/usr/local/bin/yt-dlp --version'
      ]

      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(cmd)
          version = stdout.trim()
          if (version && version !== 'unknown') {
            break
          }
        } catch (error) {
          // 继续尝试下一个命令
        }
      }

      return version
    } catch (error) {
      return 'unknown'
    }
  }

  /**
   * 检查是否在更新窗口内
   */
  isInUpdateWindow() {
    const now = new Date()
    const hour = now.getHours()
    return hour >= CONFIG.UPDATE_WINDOW_START && hour < CONFIG.UPDATE_WINDOW_END
  }

  /**
   * 检查是否应该强制更新
   */
  shouldForceUpdate() {
    try {
      const statusPath = path.resolve(CONFIG.STATUS_FILE)
      // 使用同步的fs而不是fs/promises
      const fs_sync = require('fs')
      const statusData = JSON.parse(fs_sync.readFileSync(statusPath, 'utf8'))
      
      if (statusData.lastSuccessfulUpdate) {
        const lastUpdate = new Date(statusData.lastSuccessfulUpdate)
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
        return hoursSinceUpdate > CONFIG.FORCE_UPDATE_HOURS
      }
    } catch (error) {
      // 如果无法读取状态文件，认为需要更新
      return true
    }
    
    return false
  }

  /**
   * 更新状态文件
   */
  async updateStatus(status, message, details = {}) {
    try {
      const statusData = {
        lastUpdate: new Date().toISOString(),
        status,
        message,
        details,
        ...(status === 'success' && { lastSuccessfulUpdate: new Date().toISOString() })
      }

      await fs.mkdir(path.dirname(CONFIG.STATUS_FILE), { recursive: true })
      await fs.writeFile(CONFIG.STATUS_FILE, JSON.stringify(statusData, null, 2))
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      await this.log('ERROR', `更新状态文件失败: ${errorMsg}`, colors.red)
    }
  }

  /**
   * 日志记录
   */
  async log(level, message, color = colors.reset) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level}] ${message}`
    
    // 控制台输出
    console.log(`${color}${logEntry}${colors.reset}`)
    
    // 文件输出
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true })
      await fs.appendFile(this.logFile, logEntry + '\n')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`日志写入失败: ${errorMsg}`)
    }
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2)
  const updater = new SmartYtdlpUpdater()

  try {
    // 处理命令行参数
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
智能YT-DLP更新器

用法: node smart-ytdlp-updater.js [选项]

选项:
  --help, -h        显示帮助信息
  --force           强制执行更新，忽略任务检查
  --check-only      仅检查任务状态，不执行更新
  --status          显示更新状态
  --test            测试模式，不实际执行更新

配置:
  更新窗口: ${CONFIG.UPDATE_WINDOW_START}:00 - ${CONFIG.UPDATE_WINDOW_END}:00
  最大等待: ${CONFIG.MAX_WAIT_HOURS} 小时
  重试间隔: ${CONFIG.RETRY_INTERVAL_MINUTES} 分钟
  强制更新: ${CONFIG.FORCE_UPDATE_HOURS} 小时
      `)
      return
    }

    if (args.includes('--status')) {
      try {
        const statusData = JSON.parse(await fs.readFile(CONFIG.STATUS_FILE, 'utf8'))
        console.log('更新状态:', JSON.stringify(statusData, null, 2))
      } catch (error) {
        console.log('无法读取状态文件')
      }
      return
    }

    if (args.includes('--check-only')) {
      const checker = new TaskStatusChecker()
      const result = await checker.checkTaskStatus()
      console.log('任务检查结果:', JSON.stringify(result, null, 2))
      return
    }

    if (args.includes('--test')) {
      console.log('🧪 测试模式：将进行所有检查但不执行实际更新')
      // 在这里可以添加测试逻辑
      return
    }

    // 执行更新
    const success = await updater.run()
    process.exit(success ? 0 : 1)

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('❌ 更新器执行失败:', errorMsg)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { SmartYtdlpUpdater }
