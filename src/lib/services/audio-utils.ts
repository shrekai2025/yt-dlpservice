import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { Logger } from '~/lib/utils/logger'
import type { AudioFileInfo, FFmpegCompressionParams } from '~/types/compression'

const execAsync = promisify(exec)

/**
 * 获取音频文件信息
 */
export async function getAudioFileInfo(filePath: string): Promise<AudioFileInfo> {
  try {
    // 获取文件大小
    const stats = await fs.stat(filePath)
    const size = stats.size
    
    // 使用 FFprobe 获取音频信息
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
    const { stdout } = await execAsync(command)
    const info = JSON.parse(stdout)
    
    // 提取音频流信息
    const audioStream = info.streams?.find((stream: any) => stream.codec_type === 'audio')
    
    return {
      path: filePath,
      size,
      duration: parseFloat(info.format?.duration) || undefined,
      bitrate: info.format?.bit_rate ? `${Math.round(info.format.bit_rate / 1000)}k` : undefined,
      sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
      channels: audioStream?.channels || undefined,
      format: info.format?.format_name || path.extname(filePath).slice(1)
    }
  } catch (error) {
    Logger.warn(`获取音频文件信息失败: ${filePath}, 错误: ${error}`)
    
    // 如果 FFprobe 失败，至少返回基本信息
    const stats = await fs.stat(filePath)
    return {
      path: filePath,
      size: stats.size,
      format: path.extname(filePath).slice(1)
    }
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 字节转MB
 */
export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024)
}

/**
 * MB转字节
 */
export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024
}

/**
 * 计算压缩比例
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0
  return (originalSize - compressedSize) / originalSize
}

/**
 * 格式化压缩比例为百分比
 */
export function formatCompressionRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

/**
 * 构建 FFmpeg 压缩命令
 */
export function buildFFmpegCompressionCommand(params: FFmpegCompressionParams): string {
  const {
    inputPath,
    outputPath,
    audioBitrate,
    audioSampleRate,
    audioChannels,
    audioCodec = 'libmp3lame',
    additionalParams = []
  } = params
  
  const baseCommand = [
    'ffmpeg',
    '-i', `"${inputPath}"`,
    '-acodec', audioCodec,
    '-b:a', audioBitrate,  // 使用现代参数替代 -ab
    '-ar', audioSampleRate.toString(),
    '-ac', audioChannels.toString(),
    '-f', 'mp3',  // 明确指定输出格式
    '-map_metadata', '-1',  // 移除所有元数据，避免格式问题
    '-y', // 覆盖输出文件
    ...additionalParams,
    `"${outputPath}"`
  ]
  
  return baseCommand.join(' ')
}

/**
 * 验证音频文件是否有效，并检查格式兼容性
 */
export async function validateAudioFile(filePath: string): Promise<boolean> {
  try {
    const info = await getAudioFileInfo(filePath)
    
    // 基本检查：文件大小和时长
    const basicValid = info.size > 0 && (info.duration === undefined || info.duration > 0)
    if (!basicValid) {
      Logger.warn(`音频文件基本验证失败: ${filePath}`)
      return false
    }
    
    // 详细格式检查
    Logger.debug(`音频文件详细信息: ${filePath}`)
    Logger.debug(`  - 格式: ${info.format}`)
    Logger.debug(`  - 采样率: ${info.sampleRate}Hz`)
    Logger.debug(`  - 声道: ${info.channels}`)
    Logger.debug(`  - 比特率: ${info.bitrate}`)
    Logger.debug(`  - 时长: ${info.duration}s`)
    Logger.debug(`  - 大小: ${formatFileSize(info.size)}`)
    
    // 检查是否为MP3格式
    if (info.format && !info.format.toLowerCase().includes('mp3')) {
      Logger.warn(`音频文件格式不是MP3: ${info.format}`)
      return false
    }
    
    // 检查采样率（豆包API偏好16kHz）
    if (info.sampleRate && info.sampleRate !== 16000) {
      Logger.warn(`音频采样率不是16kHz: ${info.sampleRate}Hz，可能影响API兼容性`)
      // 不返回false，因为其他采样率也可能被接受
    }
    
    // 检查声道数（应该是单声道）
    if (info.channels && info.channels !== 1) {
      Logger.warn(`音频不是单声道: ${info.channels}声道，可能影响API兼容性`)
      // 不返回false，因为立体声也可能被接受
    }
    
    return true
  } catch (error) {
    Logger.warn(`音频文件验证失败: ${filePath}, 错误: ${error}`)
    return false
  }
}

/**
 * 生成临时文件路径
 */
export function generateTempFilePath(originalPath: string, suffix: string = 'compressed'): string {
  const dir = path.dirname(originalPath)
  const ext = path.extname(originalPath)
  const basename = path.basename(originalPath, ext)
  
  return path.join(dir, `${basename}_${suffix}_${Date.now()}${ext}`)
}

/**
 * 清理临时文件
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
    Logger.debug(`清理临时文件: ${filePath}`)
  } catch (error) {
    Logger.warn(`清理临时文件失败: ${filePath}, 错误: ${error}`)
  }
}

/**
 * 确保目录存在
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    Logger.error(`创建目录失败: ${dirPath}, 错误: ${error}`)
    throw error
  }
}

/**
 * 检查 FFmpeg 是否可用
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version')
    return true
  } catch (error) {
    Logger.error('FFmpeg 不可用，音频压缩功能将无法使用')
    return false
  }
}

/**
 * 获取文件的 MD5 哈希（用于缓存）
 */
export async function getFileHash(filePath: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`md5sum "${filePath}" 2>/dev/null || md5 -q "${filePath}"`)
    const hash = stdout.split(' ')[0]?.trim()
    return hash || 'unknown'
  } catch (error) {
    // 如果哈希计算失败，使用文件大小和修改时间作为简单标识
    const stats = await fs.stat(filePath)
    return `${stats.size}_${stats.mtime.getTime()}`
  }
} 