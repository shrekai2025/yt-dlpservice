/**
 * 压缩预设类型
 */
export type CompressionPreset = 'none' | 'light' | 'standard' | 'heavy'

/**
 * 压缩预设配置接口
 */
export interface CompressionConfig {
  name: string
  description: string
  bitrate: string        // 比特率，如 '128k'
  sampleRate: number     // 采样率，如 44100
  channels: number       // 声道数，1=单声道，2=立体声
  format: string         // 输出格式，如 'mp3'
  expectedReduction: string  // 预期压缩比例，如 '30-50%'
}

/**
 * 压缩选项接口
 */
export interface CompressionOptions {
  preset: CompressionPreset
  inputPath: string
  outputPath: string
  maxSizeMB?: number     // 目标最大文件大小（MB）
  skipIfSmaller?: boolean // 如果文件已经小于阈值则跳过
}

/**
 * 压缩结果接口
 */
export interface CompressionResult {
  success: boolean
  originalPath: string
  compressedPath?: string
  originalSize: number    // 字节
  compressedSize?: number // 字节
  compressionRatio?: number // 压缩比例 (0-1)
  duration: number       // 压缩耗时（毫秒）
  error?: string
  skipped?: boolean      // 是否跳过压缩
  skipReason?: string    // 跳过原因
}

/**
 * 音频文件信息接口
 */
export interface AudioFileInfo {
  path: string
  size: number           // 字节
  duration?: number      // 秒
  bitrate?: string       // 比特率
  sampleRate?: number    // 采样率
  channels?: number      // 声道数
  format?: string        // 文件格式
}

/**
 * FFmpeg 压缩参数接口
 */
export interface FFmpegCompressionParams {
  inputPath: string
  outputPath: string
  audioBitrate: string   // -ab 参数
  audioSampleRate: number // -ar 参数
  audioChannels: number  // -ac 参数
  audioCodec?: string    // -acodec 参数，默认为 libmp3lame
  additionalParams?: string[] // 额外参数
} 