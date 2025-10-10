/**
 * Image Utilities
 *
 * Helper functions for image processing
 */

import axios from 'axios'
import crypto from 'crypto'

/**
 * Download image from URL to buffer
 */
export async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    })
    return Buffer.from(response.data)
  } catch (error) {
    console.error(`Failed to download image from ${url}:`, error)
    throw new Error(`Failed to download image: ${error}`)
  }
}

/**
 * Convert base64 string to buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64Data, 'base64')
}

/**
 * Convert buffer to base64 string
 */
export function bufferToBase64(buffer: Buffer, mimeType = 'image/png'): string {
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

/**
 * Generate unique filename with extension
 */
export function generateUniqueFilename(extension = 'png'): string {
  const timestamp = Date.now()
  const randomStr = crypto.randomBytes(8).toString('hex')
  return `${timestamp}_${randomStr}.${extension}`
}

/**
 * Detect image format from buffer
 */
export function detectImageFormat(buffer: Buffer): string {
  // Check magic numbers
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'jpg'
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png'
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'gif'
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'webp'
  }
  return 'png' // Default
}

/**
 * Get MIME type from extension
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  }
  return mimeTypes[extension.toLowerCase()] || 'image/png'
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
