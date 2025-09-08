#!/usr/bin/env node

/**
 * 任务状态检查器 - 检测是否有正在执行的任务
 * 
 * 检测方法：
 * 1. 数据库状态检测 - 检查PENDING、EXTRACTING、TRANSCRIBING状态的任务
 * 2. 进程检测 - 检查yt-dlp和ffmpeg进程
 * 3. 文件系统检测 - 检查temp目录活跃文件
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)
const db = new PrismaClient()

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

function log(level, message, color = colors.reset) {
  const timestamp = new Date().toISOString()
  console.log(`${color}[${timestamp}] [${level}] ${message}${colors.reset}`)
}

class TaskStatusChecker {
  constructor() {
    this.tempDir = process.env.TEMP_DIR || 'temp'
  }

  /**
   * 主检查方法 - 综合所有检测方法
   */
  async checkTaskStatus() {
    try {
      log('INFO', '🔍 开始检查任务状态...', colors.blue)
      
      const checks = await Promise.all([
        this.checkDatabaseTasks(),
        this.checkRunningProcesses(),
        this.checkActiveFiles()
      ])

      const [dbResult, processResult, fileResult] = checks

      const result = {
        hasActiveTasks: dbResult.hasActiveTasks || processResult.hasActiveProcesses || fileResult.hasActiveFiles,
        details: {
          database: dbResult,
          processes: processResult,
          files: fileResult
        },
        summary: this.generateSummary(dbResult, processResult, fileResult)
      }

      this.logResults(result)
      return result

    } catch (error) {
      log('ERROR', `任务状态检查失败: ${error.message}`, colors.red)
      throw error
    } finally {
      await db.$disconnect()
    }
  }

  /**
   * 1. 数据库任务状态检查
   */
  async checkDatabaseTasks() {
    try {
      log('INFO', '📊 检查数据库中的任务状态...', colors.cyan)

      // 查找活跃任务
      const activeTasks = await db.task.findMany({
        where: {
          status: {
            in: ['PENDING', 'EXTRACTING', 'TRANSCRIBING']
          }
        },
        select: {
          id: true,
          status: true,
          platform: true,
          title: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      // 统计各状态任务数量
      const statusCounts = activeTasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1
        return acc
      }, {})

      // 检查超时任务（运行超过10分钟的）
      const now = new Date()
      const timeoutThreshold = 10 * 60 * 1000 // 10分钟
      const timeoutTasks = activeTasks.filter(task => {
        const taskAge = now.getTime() - new Date(task.updatedAt).getTime()
        return taskAge > timeoutThreshold && ['EXTRACTING', 'TRANSCRIBING'].includes(task.status)
      })

      const hasActiveTasks = activeTasks.length > 0

      if (hasActiveTasks) {
        log('INFO', `发现 ${activeTasks.length} 个活跃任务:`, colors.yellow)
        Object.entries(statusCounts).forEach(([status, count]) => {
          log('INFO', `  - ${status}: ${count} 个`, colors.yellow)
        })

        if (timeoutTasks.length > 0) {
          log('WARN', `发现 ${timeoutTasks.length} 个可能超时的任务`, colors.yellow)
        }
      } else {
        log('INFO', '✅ 数据库中无活跃任务', colors.green)
      }

      return {
        hasActiveTasks,
        totalActiveTasks: activeTasks.length,
        statusCounts,
        timeoutTasks: timeoutTasks.length,
        tasks: activeTasks.map(task => ({
          id: task.id,
          status: task.status,
          platform: task.platform,
          title: task.title?.substring(0, 50) + (task.title?.length > 50 ? '...' : ''),
          ageMinutes: Math.round((now.getTime() - new Date(task.updatedAt).getTime()) / 60000)
        }))
      }

    } catch (error) {
      log('ERROR', `数据库任务检查失败: ${error.message}`, colors.red)
      throw error
    }
  }

  /**
   * 2. 运行进程检查
   */
  async checkRunningProcesses() {
    try {
      log('INFO', '🔄 检查正在运行的进程...', colors.cyan)

      const processes = []
      
      // 检查 yt-dlp 进程
      try {
        const { stdout: ytdlpProcesses } = await execAsync('pgrep -f "yt-dlp" || true')
        if (ytdlpProcesses.trim()) {
          const pids = ytdlpProcesses.trim().split('\n').filter(pid => pid)
          processes.push({
            name: 'yt-dlp',
            count: pids.length,
            pids: pids
          })
          log('INFO', `发现 ${pids.length} 个 yt-dlp 进程: ${pids.join(', ')}`, colors.yellow)
        }
      } catch (error) {
        log('DEBUG', `yt-dlp进程检查失败: ${error.message}`)
      }

      // 检查 ffmpeg 进程
      try {
        const { stdout: ffmpegProcesses } = await execAsync('pgrep -f "ffmpeg" || true')
        if (ffmpegProcesses.trim()) {
          const pids = ffmpegProcesses.trim().split('\n').filter(pid => pid)
          processes.push({
            name: 'ffmpeg',
            count: pids.length,
            pids: pids
          })
          log('INFO', `发现 ${pids.length} 个 ffmpeg 进程: ${pids.join(', ')}`, colors.yellow)
        }
      } catch (error) {
        log('DEBUG', `ffmpeg进程检查失败: ${error.message}`)
      }

      // 检查 node 进程中的下载任务
      try {
        const { stdout: nodeProcesses } = await execAsync('pgrep -f "node.*yt-dlpservice" || true')
        if (nodeProcesses.trim()) {
          const pids = nodeProcesses.trim().split('\n').filter(pid => pid)
          processes.push({
            name: 'yt-dlpservice',
            count: pids.length,
            pids: pids
          })
        }
      } catch (error) {
        log('DEBUG', `node进程检查失败: ${error.message}`)
      }

      const hasActiveProcesses = processes.some(p => ['yt-dlp', 'ffmpeg'].includes(p.name))

      if (hasActiveProcesses) {
        log('INFO', '发现活跃的下载相关进程', colors.yellow)
      } else {
        log('INFO', '✅ 无活跃的下载进程', colors.green)
      }

      return {
        hasActiveProcesses,
        processes
      }

    } catch (error) {
      log('ERROR', `进程检查失败: ${error.message}`, colors.red)
      return {
        hasActiveProcesses: false,
        processes: [],
        error: error.message
      }
    }
  }

  /**
   * 3. 活跃文件检查
   */
  async checkActiveFiles() {
    try {
      log('INFO', '📁 检查临时目录中的活跃文件...', colors.cyan)

      const tempPath = path.resolve(this.tempDir)
      const now = Date.now()
      const recentThreshold = 5 * 60 * 1000 // 5分钟内修改的文件认为是活跃的

      let activeFiles = []
      let totalSize = 0

      try {
        const entries = await fs.readdir(tempPath, { withFileTypes: true })
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const dirPath = path.join(tempPath, entry.name)
            try {
              const files = await fs.readdir(dirPath)
              
              for (const file of files) {
                const filePath = path.join(dirPath, file)
                try {
                  const stats = await fs.stat(filePath)
                  const ageMs = now - stats.mtime.getTime()
                  
                  if (ageMs < recentThreshold) {
                    activeFiles.push({
                      path: filePath,
                      size: stats.size,
                      ageMinutes: Math.round(ageMs / 60000),
                      isRecent: true
                    })
                  }
                  
                  totalSize += stats.size
                } catch (statError) {
                  // 文件可能正在被删除，忽略错误
                }
              }
            } catch (readError) {
              // 目录可能正在被删除，忽略错误
            }
          }
        }
      } catch (error) {
        log('WARN', `无法读取临时目录 ${tempPath}: ${error.message}`, colors.yellow)
      }

      const hasActiveFiles = activeFiles.length > 0

      if (hasActiveFiles) {
        log('INFO', `发现 ${activeFiles.length} 个最近修改的文件`, colors.yellow)
        activeFiles.forEach(file => {
          log('INFO', `  - ${path.basename(file.path)} (${Math.round(file.size/1024/1024)}MB, ${file.ageMinutes}分钟前)`, colors.yellow)
        })
      } else {
        log('INFO', '✅ 无最近活跃的文件', colors.green)
      }

      return {
        hasActiveFiles,
        activeFileCount: activeFiles.length,
        totalTempSize: totalSize,
        activeFiles: activeFiles.map(f => ({
          name: path.basename(f.path),
          sizeMB: Math.round(f.size / 1024 / 1024),
          ageMinutes: f.ageMinutes
        }))
      }

    } catch (error) {
      log('ERROR', `文件检查失败: ${error.message}`, colors.red)
      return {
        hasActiveFiles: false,
        activeFileCount: 0,
        totalTempSize: 0,
        activeFiles: [],
        error: error.message
      }
    }
  }

  /**
   * 生成检查结果摘要
   */
  generateSummary(dbResult, processResult, fileResult) {
    const issues = []
    
    if (dbResult.hasActiveTasks) {
      issues.push(`数据库中有 ${dbResult.totalActiveTasks} 个活跃任务`)
    }
    
    if (processResult.hasActiveProcesses) {
      const processNames = processResult.processes
        .filter(p => ['yt-dlp', 'ffmpeg'].includes(p.name))
        .map(p => `${p.name}(${p.count})`)
      issues.push(`发现活跃进程: ${processNames.join(', ')}`)
    }
    
    if (fileResult.hasActiveFiles) {
      issues.push(`临时目录中有 ${fileResult.activeFileCount} 个最近修改的文件`)
    }

    if (issues.length === 0) {
      return '✅ 系统空闲，可以安全更新'
    } else {
      return `⚠️ 系统繁忙: ${issues.join('; ')}`
    }
  }

  /**
   * 输出检查结果
   */
  logResults(result) {
    log('INFO', '=' * 60, colors.blue)
    log('INFO', '📋 任务状态检查结果', colors.blue)
    log('INFO', '=' * 60, colors.blue)
    log('INFO', result.summary, result.hasActiveTasks ? colors.yellow : colors.green)
    log('INFO', '=' * 60, colors.blue)
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2)
  const checker = new TaskStatusChecker()

  try {
    const result = await checker.checkTaskStatus()
    
    // 根据命令行参数输出不同格式
    if (args.includes('--json')) {
      console.log(JSON.stringify(result, null, 2))
    } else if (args.includes('--simple')) {
      console.log(result.hasActiveTasks ? 'BUSY' : 'IDLE')
    } else if (args.includes('--exit-code')) {
      // 用退出码表示状态：0=空闲，1=繁忙
      process.exit(result.hasActiveTasks ? 1 : 0)
    }
    
  } catch (error) {
    log('ERROR', `检查失败: ${error.message}`, colors.red)
    process.exit(2)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('脚本执行失败:', error)
    process.exit(1)
  })
}

export { TaskStatusChecker }
