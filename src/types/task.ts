import type { Task, TaskStatus, Config } from '@prisma/client'

// 导出Prisma生成的类型
export type { Task, TaskStatus, Config }

// 创建任务的输入类型
export interface CreateTaskInput {
  url: string
  platform: string
  title?: string
}

// 更新任务的输入类型
export interface UpdateTaskInput {
  id: string
  status?: TaskStatus
  title?: string
  videoPath?: string
  audioPath?: string
  transcription?: string
  tingwuTaskId?: string
  retryCount?: number
  completedAt?: Date
  errorMessage?: string
}

// 任务查询参数
export interface TaskQueryOptions {
  status?: TaskStatus
  platform?: string
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'updatedAt'
  orderDirection?: 'asc' | 'desc'
}

// 配置项类型
export interface ConfigInput {
  key: string
  value: string
  description?: string
}

// 平台类型
export type Platform = 'youtube' | 'bilibili' | 'other'

// 视频信息类型
export interface VideoInfo {
  title: string
  description?: string
  duration: number
  uploader?: string
  uploadDate?: string
  viewCount?: number
  thumbnail?: string
  formats?: Array<{
    formatId: string
    ext: string
    quality?: string | number
    filesize?: number
    url?: string
  }>
  originalData?: any
} 