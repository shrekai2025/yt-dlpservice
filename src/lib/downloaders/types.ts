import type { PlatformExtraMetadata } from '~/types/task'

export interface ContentMetadata {
  title: string
  description?: string
  duration?: number  // 秒
  coverUrl?: string
  platform: 'youtube' | 'bilibili' | 'xiaoyuzhou' | 'applepodcasts' | string
  // 额外元数据（通过爬虫获取）
  extraMetadata?: PlatformExtraMetadata
  [key: string]: any  // 允许平台特定的额外字段
}

export interface ParsedContent {
  audioUrls?: string[]
  videoUrls?: string[]
  metadata: ContentMetadata
}

export interface PlatformExtractor {
  /**
   * 从页面中提取内容URL和元数据
   * @param page puppeteer Page实例
   * @param url 原始URL
   * @returns 解析结果
   */
  extractFromPage(page: any, url: string): Promise<ParsedContent>
}

export interface DownloadResult {
  videoPath?: string
  audioPath?: string
  metadata: ContentMetadata
}

export interface WebDownloaderOptions {
  outputDir: string
  timeout?: number  // 默认3分钟
  headless?: boolean  // 默认true
}

export type DownloadType = 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH' 