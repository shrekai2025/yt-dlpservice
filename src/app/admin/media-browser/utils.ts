import type { MediaFile } from './types'

/**
 * Get thumbnail URL for a media file
 */
export function getThumbnailUrl(file: MediaFile, bustCache = false): string | null {
  if (file.type === 'AUDIO') return null

  // Prioritize thumbnail path (check for non-empty string)
  if (file.thumbnailPath && file.thumbnailPath.trim()) {
    const baseUrl = file.thumbnailPath.startsWith('http')
      ? file.thumbnailPath
      : `/api/serve-file?path=${encodeURIComponent(file.thumbnailPath)}`

    // Always add cache busting parameter using current timestamp
    // This ensures updated thumbnails are always loaded
    return `${baseUrl}&v=${Date.now()}`
  }

  // Fallback to local path for images (check for non-empty string)
  if (file.type === 'IMAGE' && file.localPath && file.localPath.trim()) {
    return `/api/serve-file?path=${encodeURIComponent(file.localPath)}`
  }

  // Fallback to source URL (check for non-empty string)
  if (file.sourceUrl && file.sourceUrl.trim()) {
    return file.sourceUrl
  }

  return null
}

/**
 * Check if a file is a GIF
 */
export function isGif(file: MediaFile): boolean {
  if (file.type !== 'IMAGE') return false

  const fileName = file.name.toLowerCase()
  const hasGifExtension = fileName.endsWith('.gif')
  const hasGifMimeType = file.mimeType?.toLowerCase().includes('gif')

  return hasGifExtension || hasGifMimeType || false
}

/**
 * Get GIF URL (original file URL for animated playback)
 */
export function getGifUrl(file: MediaFile): string | null {
  if (!isGif(file)) return null

  // Use local path for GIFs (check for non-empty string)
  if (file.localPath && file.localPath.trim()) {
    return `/api/serve-file?path=${encodeURIComponent(file.localPath)}`
  }

  // Fallback to source URL (check for non-empty string)
  if (file.sourceUrl && file.sourceUrl.trim()) {
    return file.sourceUrl
  }

  return null
}

/**
 * Format file size in KB
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  return `${Math.round(bytes / 1024)}KB`
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '-'

  if (seconds < 60) {
    return `${Math.round(seconds)}秒`
  }

  const minutes = Math.round(seconds / 60)
  return `${minutes}分钟`
}

/**
 * Save state to localStorage
 */
export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
  } catch (error) {
    console.warn(`Failed to save to localStorage: ${key}`, error)
  }
}

/**
 * Load state from localStorage
 */
export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof window !== 'undefined') {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : defaultValue
    }
  } catch (error) {
    console.warn(`Failed to load from localStorage: ${key}`, error)
  }
  return defaultValue
}

/**
 * Calculate columns for grid layout based on container width
 */
export function calculateGridColumns(containerWidth: number, columnWidth: number): number {
  const gap = 16
  const padding = 48
  const availableWidth = containerWidth - padding
  const columns = Math.max(1, Math.floor((availableWidth + gap) / (columnWidth + gap)))
  return columns
}
