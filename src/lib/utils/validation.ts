import { z } from 'zod'
import type { TaskStatus, Platform, DownloadType } from '~/types/task'
import platformsConfig from '../../config/platforms.json'

// URL验证
export const urlSchema = z.string().url('请输入有效的URL')

// 下载类型验证
export const downloadTypeSchema = z.enum(['AUDIO_ONLY', 'VIDEO_ONLY', 'BOTH']).default('AUDIO_ONLY')

// 任务创建验证
export const createTaskSchema = z.object({
  url: urlSchema,
  downloadType: downloadTypeSchema.optional()
})

// 任务更新验证
export const updateTaskSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  status: z.enum(['PENDING', 'EXTRACTING', 'TRANSCRIBING', 'COMPLETED', 'FAILED']).optional(),
  title: z.string().optional(),
  videoPath: z.string().optional(),
  audioPath: z.string().optional(),
  transcription: z.string().optional(),
  tingwuTaskId: z.string().optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().int().min(0).optional(),
  duration: z.number().int().min(0).optional(),
  fileSize: z.number().int().min(0).optional()
})

// 任务查询验证
export const taskQuerySchema = z.object({
  status: z.enum(['PENDING', 'EXTRACTING', 'TRANSCRIBING', 'COMPLETED', 'FAILED']).optional(),
  platform: z.enum(['youtube', 'bilibili', 'other']).optional(),
  downloadType: downloadTypeSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc')
})

// 配置验证
export const configSchema = z.object({
  key: z.string().min(1, '配置键不能为空'),
  value: z.string()
})

// ID验证
export const idSchema = z.object({
  id: z.string().min(1, 'ID不能为空')
})

// 获取视频信息验证
export const getVideoInfoSchema = z.object({
  url: urlSchema
})

/**
 * 验证视频URL并返回平台信息
 */
export function validateVideoUrl(url: string): { isValid: boolean; platform?: Platform; error?: string } {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // 检查每个平台的域名
    for (const [platformKey, platformConfig] of Object.entries(platformsConfig)) {
      const domains = platformConfig.domains as string[]
      const urlPatterns = platformConfig.urlPatterns as string[]
      
      // 检查域名匹配
      const domainMatch = domains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      )
      
      if (domainMatch) {
        // 检查URL模式匹配
        const patternMatch = urlPatterns.some(pattern => {
          const regex = new RegExp(pattern)
          return regex.test(url)
        })
        
        if (patternMatch) {
          return {
            isValid: true,
            platform: platformKey as Platform
          }
        }
      }
    }
    
    return {
      isValid: false,
      error: '不支持的视频平台或URL格式'
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'URL格式无效'
    }
  }
}

/**
 * 获取支持的平台列表
 */
export function getSupportedPlatforms(): Array<{ key: Platform; name: string; domains: string[] }> {
  return Object.entries(platformsConfig).map(([key, config]) => ({
    key: key as Platform,
    name: config.name,
    domains: config.domains
  }))
}

/**
 * 从URL获取平台类型
 */
export function getPlatformFromUrl(url: string): Platform | null {
  const result = validateVideoUrl(url)
  return result.isValid ? result.platform! : null
}

/**
 * 验证任务状态转换是否有效
 */
export function isValidStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    PENDING: ['EXTRACTING', 'FAILED'],
    EXTRACTING: ['TRANSCRIBING', 'COMPLETED', 'FAILED'], // 提取完成后转录或直接完成（视频转音频未实现时）
    TRANSCRIBING: ['COMPLETED', 'FAILED'],
    COMPLETED: [], // 完成状态不能转换到其他状态
    FAILED: ['PENDING', 'EXTRACTING'] // 失败状态可以重试
  }

  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}

/**
 * 获取下载类型的显示名称
 */
export function getDownloadTypeDisplayName(downloadType: DownloadType): string {
  const displayNames: Record<DownloadType, string> = {
    'AUDIO_ONLY': '仅音频',
    'VIDEO_ONLY': '仅视频', 
    'BOTH': '视频+音频'
  }
  return displayNames[downloadType]
} 