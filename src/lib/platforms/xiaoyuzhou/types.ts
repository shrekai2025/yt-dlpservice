import type { ContentMetadata } from '~/lib/downloaders/types'

/**
 * 小宇宙特定的元数据
 */
export interface XiaoyuzhouMetadata extends ContentMetadata {
  platform: 'xiaoyuzhou'
  episodeId?: string
  showId?: string
  showTitle?: string
  episodeNumber?: number
  publishDate?: string
} 