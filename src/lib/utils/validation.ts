import { z } from 'zod'
import { urlNormalizer } from '../services/url-normalizer'
import platformsConfig from '../../config/platforms.json'
import type { TaskStatus } from '~/types/task'

type Platform = keyof typeof platformsConfig

// URL 验证模式
export const urlSchema = z.string().url('请提供有效的URL')

// 任务状态枚举
const taskStatusEnum = z.enum(['PENDING', 'EXTRACTING', 'TRANSCRIBING', 'COMPLETED', 'FAILED'])

// 下载类型枚举
const downloadTypeEnum = z.enum(['AUDIO_ONLY', 'VIDEO_ONLY', 'BOTH'])

// 创建任务验证
export const createTaskSchema = z.object({
  url: urlSchema,
  downloadType: downloadTypeEnum.default('AUDIO_ONLY')
})

// 更新任务验证
export const updateTaskSchema = z.object({
  status: taskStatusEnum.optional(),
  errorMessage: z.string().optional(),
  transcription: z.string().optional()
})

// 任务查询验证
export const taskQuerySchema = z.object({
  status: taskStatusEnum.optional(),
  platform: z.enum(['youtube', 'bilibili', 'other']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
})

// 配置输入验证
export const configInputSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1)
})

// 获取视频信息验证
export const getVideoInfoSchema = z.object({
  url: urlSchema
})

/**
 * 验证视频URL并返回平台信息
 * 现在支持URL标准化处理
 */
export async function validateVideoUrl(url: string): Promise<{ isValid: boolean; platform?: Platform; error?: string; normalizedUrl?: string }> {
  try {
    const cleanUrl = url.replace(/^@/, '').trim()
    
    // 首先尝试标准化URL（特别是B站短链接）
    const normalizedUrl = await urlNormalizer.normalizeUrl(cleanUrl)
    
    const urlObj = new URL(normalizedUrl)
    const hostname = urlObj.hostname.toLowerCase()
    
    // 检查每个平台的域名
    for (const [platformKey, platformConfig] of Object.entries(platformsConfig)) {
      const domains = platformConfig.domains as string[]
      
      // 检查域名匹配
      const domainMatch = domains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      )
      
      if (domainMatch) {
        // 域名匹配即视为有效
        return {
          isValid: true,
          platform: platformKey as Platform,
          normalizedUrl
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
export async function getPlatformFromUrl(url: string): Promise<Platform | null> {
  const result = await validateVideoUrl(url)
  return result.isValid ? result.platform! : null
}

/**
 * 验证任务状态转换是否有效
 */
export function isValidStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
  const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
    PENDING: ['EXTRACTING', 'FAILED'],
    EXTRACTING: ['TRANSCRIBING', 'COMPLETED', 'FAILED'],
    TRANSCRIBING: ['COMPLETED', 'FAILED'],
    COMPLETED: [],
    FAILED: []
  }
  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false
}

/**
 * 获取下载类型的显示名称
 */
export function getDownloadTypeDisplayName(downloadType: string): string {
  const displayNames: Record<string, string> = {
    'AUDIO_ONLY': '仅音频',
    'VIDEO_ONLY': '仅视频', 
    'BOTH': '视频+音频'
  }
  return displayNames[downloadType] || downloadType // 如果找不到，返回原始值
} 