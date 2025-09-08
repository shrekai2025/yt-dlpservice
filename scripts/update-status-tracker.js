#!/usr/bin/env node

/**
 * 更新状态跟踪器
 * 
 * 功能：
 * 1. 记录更新历史
 * 2. 监控更新状态
 * 3. 生成更新报告
 * 4. 检查更新健康度
 * 5. 提供管理接口
 */

import * as fs from 'fs/promises'
import * as path from 'path'

// 配置
const CONFIG = {
  STATUS_FILE: 'logs/ytdlp-update-status.json',
  HISTORY_FILE: 'logs/ytdlp-update-history.json',
  LOG_FILE: 'logs/ytdlp-updater.log',
  MAX_HISTORY_ENTRIES: 100 // 最多保留的历史记录数
}

// 日志颜色
const colors = {
  reset: '\033[0m',
  red: '\033[31m',
  green: '\033[32m',
  yellow: '\033[33m',
  blue: '\033[34m',
  magenta: '\033[35m',
  cyan: '\033[36m'
}

class UpdateStatusTracker {
  constructor() {
    this.statusFile = CONFIG.STATUS_FILE
    this.historyFile = CONFIG.HISTORY_FILE
    this.logFile = CONFIG.LOG_FILE
  }

  /**
   * 记录更新状态
   */
  async recordUpdate(status, message, details = {}) {
    try {
      const timestamp = new Date().toISOString()
      const updateRecord = {
        timestamp,
        status,
        message,
        details,
        id: this.generateUpdateId()
      }

      // 更新状态文件
      await this.updateStatusFile(updateRecord)
      
      // 添加到历史记录
      await this.addToHistory(updateRecord)
      
      console.log(`${colors.blue}[${timestamp}] 记录更新状态: ${status}${colors.reset}`)
      
      return updateRecord

    } catch (error) {
      console.error(`${colors.red}记录更新状态失败: ${error.message}${colors.reset}`)
      throw error
    }
  }

  /**
   * 获取当前状态
   */
  async getCurrentStatus() {
    try {
      const statusData = JSON.parse(await fs.readFile(this.statusFile, 'utf8'))
      return statusData
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          lastUpdate: null,
          status: 'unknown',
          message: '尚未记录任何更新',
          details: {}
        }
      }
      throw error
    }
  }

  /**
   * 获取更新历史
   */
  async getUpdateHistory(limit = 10) {
    try {
      const historyData = JSON.parse(await fs.readFile(this.historyFile, 'utf8'))
      return historyData.updates.slice(-limit).reverse() // 最新的在前
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []
      }
      throw error
    }
  }

  /**
   * 生成状态报告
   */
  async generateReport(detailed = false) {
    try {
      const status = await this.getCurrentStatus()
      const history = await this.getUpdateHistory(20)
      const stats = this.calculateStats(history)

      const report = {
        summary: {
          currentStatus: status.status,
          lastUpdate: status.lastUpdate,
          lastSuccessfulUpdate: status.lastSuccessfulUpdate || null,
          message: status.message
        },
        statistics: stats,
        recentHistory: history.slice(0, 5) // 最近5次更新
      }

      if (detailed) {
        report.fullHistory = history
        report.logAnalysis = await this.analyzeRecentLogs()
      }

      return report

    } catch (error) {
      console.error(`${colors.red}生成报告失败: ${error.message}${colors.reset}`)
      throw error
    }
  }

  /**
   * 检查更新健康度
   */
  async checkUpdateHealth() {
    try {
      const status = await this.getCurrentStatus()
      const history = await this.getUpdateHistory(10)
      
      const health = {
        status: 'healthy',
        issues: [],
        recommendations: [],
        score: 100
      }

      // 检查最近更新时间
      if (status.lastSuccessfulUpdate) {
        const lastUpdate = new Date(status.lastSuccessfulUpdate)
        const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceUpdate > 72) {
          health.issues.push(`超过72小时未成功更新 (${Math.round(hoursSinceUpdate)}小时)`)
          health.score -= 30
        } else if (hoursSinceUpdate > 48) {
          health.issues.push(`超过48小时未成功更新 (${Math.round(hoursSinceUpdate)}小时)`)
          health.score -= 15
        }
      } else {
        health.issues.push('从未记录成功更新')
        health.score -= 50
      }

      // 检查失败率
      const recentFailures = history.filter(h => h.status === 'failed').length
      const failureRate = recentFailures / Math.max(history.length, 1)
      
      if (failureRate > 0.5) {
        health.issues.push(`最近失败率过高: ${Math.round(failureRate * 100)}%`)
        health.score -= 25
      } else if (failureRate > 0.3) {
        health.issues.push(`最近失败率较高: ${Math.round(failureRate * 100)}%`)
        health.score -= 10
      }

      // 检查连续失败
      const consecutiveFailures = this.getConsecutiveFailures(history)
      if (consecutiveFailures >= 3) {
        health.issues.push(`连续失败 ${consecutiveFailures} 次`)
        health.score -= 20
      }

      // 设置健康状态
      if (health.score >= 80) {
        health.status = 'healthy'
      } else if (health.score >= 60) {
        health.status = 'warning'
      } else {
        health.status = 'critical'
      }

      // 生成建议
      if (health.issues.length > 0) {
        health.recommendations.push('检查yt-dlp更新日志以了解失败原因')
        health.recommendations.push('验证网络连接和包管理器状态')
        
        if (consecutiveFailures >= 2) {
          health.recommendations.push('考虑手动执行更新以排除问题')
        }
      }

      return health

    } catch (error) {
      return {
        status: 'error',
        issues: [`健康检查失败: ${error.message}`],
        recommendations: ['检查系统状态和日志文件'],
        score: 0
      }
    }
  }

  /**
   * 清理旧记录
   */
  async cleanupOldRecords() {
    try {
      const historyData = JSON.parse(await fs.readFile(this.historyFile, 'utf8'))
      
      if (historyData.updates.length > CONFIG.MAX_HISTORY_ENTRIES) {
        const keepCount = CONFIG.MAX_HISTORY_ENTRIES
        historyData.updates = historyData.updates.slice(-keepCount)
        
        await fs.writeFile(this.historyFile, JSON.stringify(historyData, null, 2))
        console.log(`${colors.blue}清理历史记录，保留最近 ${keepCount} 条${colors.reset}`)
      }

    } catch (error) {
      console.error(`${colors.yellow}清理历史记录失败: ${error.message}${colors.reset}`)
    }
  }

  /**
   * 更新状态文件
   */
  async updateStatusFile(record) {
    const statusData = {
      lastUpdate: record.timestamp,
      status: record.status,
      message: record.message,
      details: record.details,
      id: record.id
    }

    // 如果是成功更新，记录成功时间
    if (record.status === 'success') {
      statusData.lastSuccessfulUpdate = record.timestamp
    }

    await fs.mkdir(path.dirname(this.statusFile), { recursive: true })
    await fs.writeFile(this.statusFile, JSON.stringify(statusData, null, 2))
  }

  /**
   * 添加到历史记录
   */
  async addToHistory(record) {
    let historyData = { updates: [] }
    
    try {
      historyData = JSON.parse(await fs.readFile(this.historyFile, 'utf8'))
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }

    historyData.updates.push(record)

    await fs.mkdir(path.dirname(this.historyFile), { recursive: true })
    await fs.writeFile(this.historyFile, JSON.stringify(historyData, null, 2))
  }

  /**
   * 计算统计信息
   */
  calculateStats(history) {
    if (history.length === 0) {
      return {
        totalUpdates: 0,
        successRate: 0,
        averageInterval: 0,
        lastWeekUpdates: 0
      }
    }

    const successCount = history.filter(h => h.status === 'success').length
    const successRate = successCount / history.length

    // 计算平均更新间隔
    let averageInterval = 0
    if (history.length > 1) {
      const intervals = []
      for (let i = 1; i < history.length; i++) {
        const current = new Date(history[i].timestamp)
        const previous = new Date(history[i - 1].timestamp)
        intervals.push(current.getTime() - previous.getTime())
      }
      averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    }

    // 最近一周的更新次数
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    const lastWeekUpdates = history.filter(h => 
      new Date(h.timestamp).getTime() > oneWeekAgo
    ).length

    return {
      totalUpdates: history.length,
      successCount,
      failureCount: history.length - successCount,
      successRate: Math.round(successRate * 100),
      averageIntervalHours: Math.round(averageInterval / (1000 * 60 * 60)),
      lastWeekUpdates
    }
  }

  /**
   * 获取连续失败次数
   */
  getConsecutiveFailures(history) {
    let count = 0
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].status === 'failed') {
        count++
      } else {
        break
      }
    }
    return count
  }

  /**
   * 分析最近的日志
   */
  async analyzeRecentLogs() {
    try {
      const logContent = await fs.readFile(this.logFile, 'utf8')
      const lines = logContent.split('\n').slice(-100) // 最近100行
      
      const analysis = {
        errorCount: 0,
        warningCount: 0,
        commonErrors: [],
        lastActivity: null
      }

      const errorPatterns = [
        /ERROR/i,
        /failed/i,
        /timeout/i,
        /connection/i,
        /network/i
      ]

      const warningPatterns = [
        /WARN/i,
        /warning/i,
        /retry/i,
        /skip/i
      ]

      lines.forEach(line => {
        if (errorPatterns.some(pattern => pattern.test(line))) {
          analysis.errorCount++
        }
        if (warningPatterns.some(pattern => pattern.test(line))) {
          analysis.warningCount++
        }
      })

      // 获取最后活动时间
      const lastLine = lines.filter(line => line.trim()).pop()
      if (lastLine) {
        const timestampMatch = lastLine.match(/\[([^\]]+)\]/)
        if (timestampMatch) {
          analysis.lastActivity = timestampMatch[1]
        }
      }

      return analysis

    } catch (error) {
      return {
        error: `日志分析失败: ${error.message}`,
        errorCount: 0,
        warningCount: 0,
        commonErrors: [],
        lastActivity: null
      }
    }
  }

  /**
   * 生成更新ID
   */
  generateUpdateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  }

  /**
   * 格式化输出报告
   */
  formatReport(report) {
    const lines = []
    
    lines.push(`${colors.blue}${'='.repeat(60)}${colors.reset}`)
    lines.push(`${colors.blue}YT-DLP 更新状态报告${colors.reset}`)
    lines.push(`${colors.blue}${'='.repeat(60)}${colors.reset}`)
    
    // 当前状态
    const statusColor = report.summary.currentStatus === 'success' ? colors.green : 
                       report.summary.currentStatus === 'failed' ? colors.red : colors.yellow
    lines.push(`当前状态: ${statusColor}${report.summary.currentStatus}${colors.reset}`)
    lines.push(`最后更新: ${report.summary.lastUpdate || '未知'}`)
    lines.push(`最后成功: ${report.summary.lastSuccessfulUpdate || '从未成功'}`)
    lines.push(`状态信息: ${report.summary.message}`)
    
    lines.push('')
    
    // 统计信息
    lines.push(`${colors.cyan}统计信息:${colors.reset}`)
    lines.push(`  总更新次数: ${report.statistics.totalUpdates}`)
    lines.push(`  成功次数: ${report.statistics.successCount}`)
    lines.push(`  失败次数: ${report.statistics.failureCount}`)
    lines.push(`  成功率: ${report.statistics.successRate}%`)
    lines.push(`  平均间隔: ${report.statistics.averageIntervalHours} 小时`)
    lines.push(`  本周更新: ${report.statistics.lastWeekUpdates} 次`)
    
    lines.push('')
    
    // 最近历史
    if (report.recentHistory.length > 0) {
      lines.push(`${colors.cyan}最近更新:${colors.reset}`)
      report.recentHistory.forEach(entry => {
        const entryColor = entry.status === 'success' ? colors.green : 
                          entry.status === 'failed' ? colors.red : colors.yellow
        const date = new Date(entry.timestamp).toLocaleString()
        lines.push(`  ${date} - ${entryColor}${entry.status}${colors.reset}: ${entry.message}`)
      })
    }
    
    lines.push(`${colors.blue}${'='.repeat(60)}${colors.reset}`)
    
    return lines.join('\n')
  }
}

// 命令行接口
async function main() {
  const args = process.argv.slice(2)
  const tracker = new UpdateStatusTracker()

  try {
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
更新状态跟踪器

用法: node update-status-tracker.js [选项]

选项:
  --help, -h        显示帮助信息
  --status          显示当前更新状态
  --history [N]     显示更新历史 (默认显示10条)
  --report          生成详细报告
  --health          检查更新健康度
  --cleanup         清理旧的历史记录
  --record STATUS MSG [DETAILS]  手动记录更新状态

示例:
  node update-status-tracker.js --status
  node update-status-tracker.js --history 20
  node update-status-tracker.js --record success "手动更新完成"
      `)
      return
    }

    if (args.includes('--status')) {
      const status = await tracker.getCurrentStatus()
      console.log('当前更新状态:')
      console.log(JSON.stringify(status, null, 2))
      return
    }

    if (args.includes('--history')) {
      const limitIndex = args.indexOf('--history') + 1
      const limit = limitIndex < args.length ? parseInt(args[limitIndex]) || 10 : 10
      const history = await tracker.getUpdateHistory(limit)
      
      console.log(`最近 ${limit} 次更新历史:`)
      history.forEach((entry, index) => {
        const date = new Date(entry.timestamp).toLocaleString()
        console.log(`${index + 1}. ${date} - ${entry.status}: ${entry.message}`)
      })
      return
    }

    if (args.includes('--report')) {
      const report = await tracker.generateReport(true)
      console.log(tracker.formatReport(report))
      return
    }

    if (args.includes('--health')) {
      const health = await tracker.checkUpdateHealth()
      
      const healthColor = health.status === 'healthy' ? colors.green :
                         health.status === 'warning' ? colors.yellow : colors.red
      
      console.log(`${colors.blue}更新健康度检查${colors.reset}`)
      console.log(`状态: ${healthColor}${health.status}${colors.reset} (分数: ${health.score}/100)`)
      
      if (health.issues.length > 0) {
        console.log(`\n${colors.red}发现的问题:${colors.reset}`)
        health.issues.forEach(issue => console.log(`  ❌ ${issue}`))
      }
      
      if (health.recommendations.length > 0) {
        console.log(`\n${colors.yellow}建议:${colors.reset}`)
        health.recommendations.forEach(rec => console.log(`  💡 ${rec}`))
      }
      
      return
    }

    if (args.includes('--cleanup')) {
      await tracker.cleanupOldRecords()
      console.log('历史记录清理完成')
      return
    }

    if (args.includes('--record')) {
      const recordIndex = args.indexOf('--record')
      const status = args[recordIndex + 1]
      const message = args[recordIndex + 2]
      const details = args[recordIndex + 3] ? JSON.parse(args[recordIndex + 3]) : {}
      
      if (!status || !message) {
        console.error('缺少必需参数: --record STATUS MESSAGE')
        process.exit(1)
      }
      
      await tracker.recordUpdate(status, message, details)
      console.log('更新状态已记录')
      return
    }

    // 默认显示状态
    const report = await tracker.generateReport()
    console.log(tracker.formatReport(report))

  } catch (error) {
    console.error(`${colors.red}操作失败: ${error.message}${colors.reset}`)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { UpdateStatusTracker }
