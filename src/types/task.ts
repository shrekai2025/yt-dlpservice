// 平台类型
export type Platform = 'youtube' | 'bilibili' | 'xiaoyuzhou' | 'other'

// 任务状态类型
export type TaskStatus = 'PENDING' | 'EXTRACTING' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED'

// 下载类型
export type DownloadType = 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'

// 视频信息接口
export interface VideoInfo {
  id: string
  title: string
  duration: number
  thumbnail?: string
  uploader: string
  upload_date?: string
  view_count?: number
  like_count?: number
  description?: string
  formats: any[]
}

// 创建任务输入接口
export interface CreateTaskInput {
  url: string
  downloadType?: DownloadType // 新增下载类型参数，默认为 AUDIO_ONLY
  compressionPreset?: CompressionPreset // 音频压缩预设，默认为 none
}

// 压缩预设类型
export type CompressionPreset = 'none' | 'light' | 'standard' | 'heavy'

// 更新任务输入接口
export interface UpdateTaskInput {
  id: string
  status?: TaskStatus
  title?: string
  videoPath?: string
  audioPath?: string
  transcription?: string
  tingwuTaskId?: string
  errorMessage?: string
  retryCount?: number
  duration?: number
  fileSize?: number
  // 压缩相关字段
  compressionPreset?: CompressionPreset
  originalFileSize?: number
  compressedFileSize?: number
  compressionRatio?: number
  compressionDuration?: number
}

// 任务查询选项接口
export interface TaskQueryOptions {
  status?: TaskStatus
  platform?: Platform
  downloadType?: DownloadType // 新增按下载类型筛选
  limit?: number
  offset?: number
  orderBy?: 'createdAt' | 'updatedAt'
  orderDirection?: 'asc' | 'desc'
}

// 配置输入接口
export interface ConfigInput {
  key: string
  value: string
}

// 下载选项接口
export interface DownloadOptions {
  outputDir: string
  format?: string
  quality?: string
  downloadType: DownloadType // 指定下载类型
} 