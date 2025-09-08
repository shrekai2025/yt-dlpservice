import type { ContentMetadata } from '~/lib/downloaders/types'

/**
 * Apple播客特定的元数据
 */
export interface ApplePodcastsMetadata extends ContentMetadata {
  platform: 'applepodcasts'
  episodeId?: string        // 单集ID (如: 1000725270034)
  podcastId?: string        // 播客ID (如: id842818711)
  showTitle?: string        // 播客名称
  episodeNumber?: number    // 集数编号
  seasonNumber?: number     // 季数编号
  publishDate?: string      // 发布日期
  region?: string          // 地区代码 (如: "hk", "us")
  language?: string        // 语言代码 (如: "en-GB")
  audioFormat?: string     // 音频格式 (m4a/mp3)
}
