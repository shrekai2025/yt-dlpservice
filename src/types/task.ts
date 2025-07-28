// 平台类型
export type Platform = 'youtube' | 'bilibili' | 'other'

// 任务状态类型
export type TaskStatus = 'PENDING' | 'DOWNLOADING' | 'EXTRACTING' | 'UPLOADING' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED'

// 下载类型
export type DownloadType = 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'

// 视频信息接口
export interface VideoInfo {
  title: string
  duration: number
  uploader: string
  formats: Array<{
    format_id: string
    ext: string
    resolution?: string
    filesize?: number
  }>
  originalData: any
}

// 创建任务输入接口
export interface CreateTaskInput {
  url: string
  downloadType?: DownloadType // 新增下载类型参数，默认为 AUDIO_ONLY
}

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