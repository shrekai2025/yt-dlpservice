import { z } from 'zod'
import { TaskStatus } from '@prisma/client'
import platformsConfig from '../../config/platforms.json'

// URL验证schema
export const urlSchema = z.string().url('请输入有效的URL地址')

// 任务创建验证schema
export const createTaskSchema = z.object({
  url: urlSchema,
  platform: z.string().min(1, '平台类型不能为空'),
  title: z.string().optional(),
})

// 任务更新验证schema
export const updateTaskSchema = z.object({
  id: z.string().min(1, '任务ID不能为空'),
  status: z.nativeEnum(TaskStatus).optional(),
  title: z.string().optional(),
  videoPath: z.string().optional(),
  audioPath: z.string().optional(),
  transcription: z.string().optional(),
  tingwuTaskId: z.string().optional(),
  retryCount: z.number().int().min(0).optional(),
  completedAt: z.date().optional(),
  errorMessage: z.string().optional(),
})

// 配置验证schema
export const configSchema = z.object({
  key: z.string().min(1, '配置键不能为空'),
  value: z.string().min(1, '配置值不能为空'),
  description: z.string().optional(),
})

// 分页参数验证schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

// 任务查询参数验证schema
export const taskQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  platform: z.string().optional(),
  orderBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
}).merge(paginationSchema)

// 验证视频URL是否来自支持的平台
export function validateVideoUrl(url: string): { isValid: boolean; platform?: string; error?: string } {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()
    const pathname = parsedUrl.pathname
    
    // 遍历所有支持的平台
    for (const [platformKey, config] of Object.entries(platformsConfig)) {
      // 检查域名是否精确匹配
      const isValidDomain = config.domains.some(domain => 
        hostname === domain.toLowerCase()
      )
      
      if (isValidDomain) {
        // 进一步检查URL路径模式（可选）
        const hasValidPattern = config.urlPatterns.some(pattern => {
          const regex = new RegExp(pattern)
          return regex.test(pathname) || regex.test(url)
        })
        
        if (hasValidPattern) {
          return { isValid: true, platform: platformKey }
        }
      }
    }
    
    // 如果没有匹配到任何平台
    return { 
      isValid: false, 
      error: `暂不支持该视频平台，目前支持：${Object.values(platformsConfig).map(p => p.name).join('、')}` 
    }
  } catch (error) {
    return { isValid: false, error: '无效的URL格式' }
  }
}

// 获取支持的平台列表
export function getSupportedPlatforms(): Array<{key: string, name: string, domains: string[]}> {
  return Object.entries(platformsConfig).map(([key, config]) => ({
    key,
    name: config.name,
    domains: config.domains,
  }))
}

// 根据URL获取平台信息
export function getPlatformFromUrl(url: string): string | null {
  const result = validateVideoUrl(url)
  return result.isValid ? result.platform! : null
}

// 验证文件路径
export function validateFilePath(path: string): boolean {
  // 简单的文件路径验证
  return path.length > 0 && !path.includes('..')
}

// 验证任务状态转换
export function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.PENDING]: [TaskStatus.DOWNLOADING, TaskStatus.FAILED],
    [TaskStatus.DOWNLOADING]: [TaskStatus.EXTRACTING, TaskStatus.FAILED],
    [TaskStatus.EXTRACTING]: [TaskStatus.UPLOADING, TaskStatus.FAILED],
    [TaskStatus.UPLOADING]: [TaskStatus.TRANSCRIBING, TaskStatus.FAILED],
    [TaskStatus.TRANSCRIBING]: [TaskStatus.COMPLETED, TaskStatus.FAILED],
    [TaskStatus.COMPLETED]: [], // 已完成的任务不能再转换状态
    [TaskStatus.FAILED]: [TaskStatus.PENDING], // 失败的任务可以重新开始
  }

  return validTransitions[from]?.includes(to) ?? false
} 