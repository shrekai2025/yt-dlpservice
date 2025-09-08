// 平台类型
export type Platform = 'youtube' | 'bilibili' | 'xiaoyuzhou' | 'applepodcasts' | 'other'

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
  // 额外元数据字段
  extraMetadata?: PlatformExtraMetadata
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

// 评论接口
export interface Comment {
  author: string
  content: string
  replies?: Comment[] // 二级回复
}

// 平台特定数据接口
export interface BilibiliData {
  playCount: number
  likeCount: number
  coinCount: number
  shareCount: number
  favoriteCount: number
  commentCount: number
}

export interface YouTubeData {
  viewCount: number
  likeCount: number
}

export interface XiaoyuzhouData {
  playCount: number
  commentCount: number
}

export interface ApplePodcastsData {
  rating?: number              // 播客评分 (1-5星)
  ratingCount?: number         // 评分人数
  reviewCount?: number         // 评论数量
  subscriberCount?: number     // 订阅数（如果可获取）
  genre?: string              // 播客分类/类型
  explicit?: boolean          // 是否包含敏感内容
}

// 平台额外元数据接口
export interface PlatformExtraMetadata {
  // 公共字段
  title: string
  author: string
  authorAvatar?: string
  duration: number // 秒
  publishDate?: string
  description?: string
  // 统一的观看量字段（各平台归一化）
  viewCount?: number
  
  // 平台特定字段
  platformData?: BilibiliData | YouTubeData | XiaoyuzhouData | ApplePodcastsData
  
  // 评论数据
  comments?: Comment[]
}

// 下载选项接口
export interface DownloadOptions {
  outputDir: string
  format?: string
  quality?: string
  downloadType: DownloadType // 指定下载类型
} 