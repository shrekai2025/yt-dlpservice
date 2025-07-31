import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Logger } from '~/lib/utils/logger'
import { getCompressionConfig } from './compression-presets'
import {
  getAudioFileInfo,
  formatFileSize,
  bytesToMB,
  calculateCompressionRatio,
  formatCompressionRatio,
  buildFFmpegCompressionCommand,
  validateAudioFile,
  generateTempFilePath,
  cleanupTempFile,
  checkFFmpegAvailable
} from './audio-utils'
import type {
  CompressionPreset,
  CompressionOptions,
  CompressionResult,
  FFmpegCompressionParams
} from '~/types/compression'

const execAsync = promisify(exec)

/**
 * 音频压缩服务
 */
export class AudioCompressor {
  private static instance: AudioCompressor
  private ffmpegAvailable: boolean | null = null

  private constructor() {}

  public static getInstance(): AudioCompressor {
    if (!AudioCompressor.instance) {
      AudioCompressor.instance = new AudioCompressor()
    }
    return AudioCompressor.instance
  }

  /**
   * 检查 FFmpeg 可用性
   */
  private async ensureFFmpegAvailable(): Promise<void> {
    if (this.ffmpegAvailable === null) {
      this.ffmpegAvailable = await checkFFmpegAvailable()
    }
    
    if (!this.ffmpegAvailable) {
      throw new Error('FFmpeg 不可用，无法进行音频压缩')
    }
  }

  /**
   * 压缩音频文件
   */
  async compressAudio(options: CompressionOptions): Promise<CompressionResult> {
    const startTime = Date.now()
    
    try {
      Logger.info(`🗜️ 开始音频压缩: ${options.inputPath}`)
      Logger.info(`📋 压缩预设: ${options.preset}`)
      
      // 检查 FFmpeg 可用性
      await this.ensureFFmpegAvailable()
      
      // 验证输入文件
      if (!(await validateAudioFile(options.inputPath))) {
        throw new Error('输入文件无效或不存在')
      }
      
      // 获取原始文件信息
      const originalInfo = await getAudioFileInfo(options.inputPath)
      const originalSizeMB = bytesToMB(originalInfo.size)
      
      Logger.info(`📊 原始文件信息:`)
      Logger.info(`  - 大小: ${formatFileSize(originalInfo.size)} (${originalSizeMB.toFixed(2)}MB)`)
      Logger.info(`  - 时长: ${originalInfo.duration ? `${originalInfo.duration.toFixed(1)}s` : '未知'}`)
      Logger.info(`  - 比特率: ${originalInfo.bitrate || '未知'}`)
      Logger.info(`  - 采样率: ${originalInfo.sampleRate || '未知'}Hz`)
      Logger.info(`  - 声道: ${originalInfo.channels || '未知'}`)
      
      // 检查是否需要跳过压缩
      const skipResult = this.shouldSkipCompression(options, originalSizeMB)
      if (skipResult.skip) {
        Logger.info(`⏭️ 跳过压缩: ${skipResult.reason}`)
        return {
          success: true,
          originalPath: options.inputPath,
          originalSize: originalInfo.size,
          duration: Date.now() - startTime,
          skipped: true,
          skipReason: skipResult.reason
        }
      }
      
      // 获取压缩配置
      const config = getCompressionConfig(options.preset)
      if (!config) {
        throw new Error(`无效的压缩预设: ${options.preset}`)
      }
      
      // 生成临时输出文件路径
      const tempOutputPath = generateTempFilePath(options.inputPath, `compressed_${options.preset}`)
      
      // 构建 FFmpeg 参数
      const ffmpegParams: FFmpegCompressionParams = {
        inputPath: options.inputPath,
        outputPath: tempOutputPath,
        audioBitrate: config.bitrate,
        audioSampleRate: config.sampleRate,
        audioChannels: config.channels,
        // 移除重复的 -f 参数，基本命令中已包含
        additionalParams: []
      }
      
      // 执行压缩
      const command = buildFFmpegCompressionCommand(ffmpegParams)
      Logger.info(`🔧 执行压缩命令: ${command}`)
      
      const { stderr } = await execAsync(command)
      if (stderr) {
        Logger.debug(`FFmpeg 输出: ${stderr}`)
      }
      
      // 验证压缩后的文件
      if (!(await validateAudioFile(tempOutputPath))) {
        throw new Error('压缩后的文件无效')
      }
      
      // 获取压缩后文件信息
      const compressedInfo = await getAudioFileInfo(tempOutputPath)
      const compressedSizeMB = bytesToMB(compressedInfo.size)
      const compressionRatio = calculateCompressionRatio(originalInfo.size, compressedInfo.size)
      
      Logger.info(`✅ 压缩完成:`)
      Logger.info(`  - 压缩后大小: ${formatFileSize(compressedInfo.size)} (${compressedSizeMB.toFixed(2)}MB)`)
      Logger.info(`  - 压缩比例: ${formatCompressionRatio(compressionRatio)}`)
      Logger.info(`  - 耗时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
      
      // 替换原文件
      await fs.rename(tempOutputPath, options.outputPath)
      
      return {
        success: true,
        originalPath: options.inputPath,
        compressedPath: options.outputPath,
        originalSize: originalInfo.size,
        compressedSize: compressedInfo.size,
        compressionRatio,
        duration: Date.now() - startTime
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime
      Logger.error(`❌ 音频压缩失败: ${error.message}`)
      Logger.error(`⏱️ 失败耗时: ${(duration / 1000).toFixed(1)}s`)
      
      // 添加详细的调试信息
      Logger.error(`🔍 压缩失败详情:`)
      Logger.error(`  - 输入文件: ${options.inputPath}`)
      Logger.error(`  - 压缩预设: ${options.preset}`)
      Logger.error(`  - 错误类型: ${error.constructor.name}`)
      Logger.error(`  - 错误代码: ${error.code || '未知'}`)
      
      // 检查文件是否存在
      try {
        const fs = require('fs')
        const exists = fs.existsSync(options.inputPath)
        Logger.error(`  - 输入文件存在: ${exists}`)
        if (exists) {
          const stats = fs.statSync(options.inputPath)
          Logger.error(`  - 文件大小: ${stats.size} bytes`)
        }
      } catch (fsError) {
        Logger.error(`  - 文件检查失败: ${fsError}`)
      }
      
      // 清理可能的临时文件
      const tempPath = generateTempFilePath(options.inputPath, `compressed_${options.preset}`)
      await cleanupTempFile(tempPath).catch(() => {})
      
      return {
        success: false,
        originalPath: options.inputPath,
        originalSize: 0,
        duration,
        error: error.message
      }
    }
  }

  /**
   * 判断是否应该跳过压缩
   */
  private shouldSkipCompression(options: CompressionOptions, fileSizeMB: number): {
    skip: boolean
    reason?: string
  } {
    // 如果预设为 none，跳过压缩
    if (options.preset === 'none') {
      return { skip: true, reason: '压缩预设为 none' }
    }
    
    // 如果文件已经小于阈值且设置了跳过选项
    if (options.skipIfSmaller && options.maxSizeMB && fileSizeMB <= options.maxSizeMB) {
      return { 
        skip: true, 
        reason: `文件大小 (${fileSizeMB.toFixed(2)}MB) 已小于目标大小 (${options.maxSizeMB}MB)` 
      }
    }
    
    return { skip: false }
  }

  /**
   * 批量压缩音频文件
   */
  async compressBatch(files: CompressionOptions[]): Promise<CompressionResult[]> {
    Logger.info(`🗂️ 开始批量压缩 ${files.length} 个文件`)
    
    const results: CompressionResult[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      
      Logger.info(`📁 处理文件 ${i + 1}/${files.length}: ${path.basename(file.inputPath)}`)
      
      try {
        const result = await this.compressAudio(file)
        results.push(result)
      } catch (error: any) {
        Logger.error(`批量压缩失败: ${file.inputPath}, 错误: ${error.message}`)
        results.push({
          success: false,
          originalPath: file.inputPath,
          originalSize: 0,
          duration: 0,
          error: error.message
        })
      }
    }
    
    // 统计结果
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const skipped = results.filter(r => r.skipped).length
    
    Logger.info(`📊 批量压缩完成: 成功 ${successful}, 失败 ${failed}, 跳过 ${skipped}`)
    
    return results
  }

  /**
   * 获取压缩统计信息
   */
  getCompressionStats(results: CompressionResult[]): {
    totalFiles: number
    successful: number
    failed: number
    skipped: number
    totalOriginalSize: number
    totalCompressedSize: number
    totalSavings: number
    averageCompressionRatio: number
  } {
    const successful = results.filter(r => r.success && !r.skipped)
    const failed = results.filter(r => !r.success)
    const skipped = results.filter(r => r.skipped)
    
    const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0)
    const totalCompressedSize = successful.reduce((sum, r) => sum + (r.compressedSize || 0), 0)
    const totalSavings = totalOriginalSize - totalCompressedSize
    
    const averageCompressionRatio = successful.length > 0
      ? successful.reduce((sum, r) => sum + (r.compressionRatio || 0), 0) / successful.length
      : 0
    
    return {
      totalFiles: results.length,
      successful: successful.length,
      failed: failed.length,
      skipped: skipped.length,
      totalOriginalSize,
      totalCompressedSize,
      totalSavings,
      averageCompressionRatio
    }
  }
}

export const audioCompressor = AudioCompressor.getInstance() 