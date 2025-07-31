import type { CompressionPreset, CompressionConfig } from '~/types/compression'

/**
 * 压缩预设配置映射
 */
export const COMPRESSION_PRESETS: Record<CompressionPreset, CompressionConfig | null> = {
  none: null, // 不压缩
  
  light: {
    name: '轻度压缩',
    description: '保持较高质量，适度减小文件大小',
    bitrate: '128k',
    sampleRate: 16000, // 统一使用16kHz，符合语音识别标准
    channels: 1, // 单声道
    format: 'mp3',
    expectedReduction: '30-50%'
  },
  
  standard: {
    name: '标准压缩',
    description: '平衡质量与大小，推荐用于语音转录',
    bitrate: '64k',
    sampleRate: 16000, // 统一使用16kHz，符合语音识别标准
    channels: 1, // 单声道
    format: 'mp3',
    expectedReduction: '50-70%'
  },
  
  heavy: {
    name: '高度压缩',
    description: '最小文件大小，适用于严重超标的文件',
    bitrate: '32k',
    sampleRate: 16000, // 16kHz，符合语音识别要求
    channels: 1, // 单声道
    format: 'mp3',
    expectedReduction: '70-85%'
  }
}

/**
 * 获取压缩预设配置
 */
export function getCompressionConfig(preset: CompressionPreset): CompressionConfig | null {
  return COMPRESSION_PRESETS[preset]
}

/**
 * 获取所有可用的压缩预设
 */
export function getAvailablePresets(): Array<{preset: CompressionPreset, config: CompressionConfig}> {
  return Object.entries(COMPRESSION_PRESETS)
    .filter(([, config]) => config !== null)
    .map(([preset, config]) => ({
      preset: preset as CompressionPreset,
      config: config!
    }))
}

/**
 * 根据文件大小推荐压缩预设
 */
export function recommendCompressionPreset(fileSizeMB: number, targetSizeMB: number = 80): CompressionPreset {
  const ratio = fileSizeMB / targetSizeMB
  
  if (ratio <= 1) {
    return 'none' // 文件大小已经符合要求
  } else if (ratio <= 1.5) {
    return 'light' // 轻微超标
  } else if (ratio <= 2.5) {
    return 'standard' // 中等超标
  } else {
    return 'heavy' // 严重超标
  }
}

/**
 * 计算预期压缩后的文件大小
 */
export function estimateCompressedSize(originalSizeMB: number, preset: CompressionPreset): number {
  const config = getCompressionConfig(preset)
  if (!config) return originalSizeMB
  
  // 根据预设的预期压缩比例计算
  const reductionRanges: Record<CompressionPreset, [number, number]> = {
    none: [0, 0],
    light: [0.3, 0.5],    // 30-50% 减少
    standard: [0.5, 0.7], // 50-70% 减少
    heavy: [0.7, 0.85]    // 70-85% 减少
  }
  
  const [minReduction, maxReduction] = reductionRanges[preset]
  const avgReduction = (minReduction + maxReduction) / 2
  
  return originalSizeMB * (1 - avgReduction)
}

/**
 * 验证压缩预设是否有效
 */
export function isValidCompressionPreset(preset: string): preset is CompressionPreset {
  return preset in COMPRESSION_PRESETS
}

/**
 * 获取压缩预设的显示信息
 */
export function getCompressionPresetDisplayInfo(preset: CompressionPreset): {
  label: string
  description: string
  badge?: string
} {
  const config = getCompressionConfig(preset)
  
  if (!config) {
    return {
      label: '不压缩',
      description: '保持原始文件，不进行任何压缩处理'
    }
  }
  
  return {
    label: config.name,
    description: `${config.description} (${config.expectedReduction})`,
    badge: config.expectedReduction
  }
} 