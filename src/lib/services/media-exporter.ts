/**
 * Media Exporter Service
 *
 * 导出用户的所有媒体文件到ZIP包
 * 包含：清单、缩略图、本地文件
 */

import JSZip from 'jszip'
import fs from 'fs/promises'
import path from 'path'
import { createLogger } from '~/lib/logger'
import { db } from '~/server/db'
import type { MediaFile, MediaFolder, MediaTag } from '@prisma/client'

const logger = createLogger({ module: 'media-exporter' })

const EXPORT_DIR = 'data/exports' // 导出文件存储目录

interface MediaFileWithRelations extends MediaFile {
  folder: MediaFolder | null
  tags: MediaTag[]
}

interface ExportManifest {
  exportDate: string
  totalFiles: number
  files: Array<{
    id: string
    name: string
    type: string
    source: string
    sourceUrl: string | null
    localPath: string | null
    thumbnailPath: string | null
    folder: string | null
    tags: string[]
    fileSize: number | null
    mimeType: string | null
    width: number | null
    height: number | null
    duration: number | null
    createdAt: string
  }>
  folders: Array<{
    id: string
    name: string
    color: string | null
  }>
  tags: Array<{
    id: string
    name: string
    color: string
  }>
}

/**
 * 确保导出目录存在
 */
async function ensureExportDir(): Promise<string> {
  const exportPath = path.join(process.cwd(), EXPORT_DIR)
  await fs.mkdir(exportPath, { recursive: true })
  return exportPath
}

/**
 * 导出用户的所有媒体文件
 *
 * @returns ZIP文件的相对路径
 */
export async function exportUserMedia(userId: string): Promise<string> {
  logger.info({ userId }, 'Starting media export')

  try {
    // 查询用户的所有媒体文件
    const files = (await db.mediaFile.findMany({
      where: { userId },
      include: {
        folder: true,
        tags: true,
      },
      orderBy: { createdAt: 'desc' },
    })) as MediaFileWithRelations[]

    // 查询所有文件夹和标签
    const folders = await db.mediaFolder.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    })

    const tags = await db.mediaTag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    })

    logger.info(
      { fileCount: files.length, folderCount: folders.length, tagCount: tags.length },
      'Queried user media data'
    )

    // 创建 ZIP 实例
    const zip = new JSZip()

    // 1. 生成清单
    const manifest: ExportManifest = {
      exportDate: new Date().toISOString(),
      totalFiles: files.length,
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        source: file.source,
        sourceUrl: file.sourceUrl,
        localPath: file.localPath,
        thumbnailPath: file.thumbnailPath,
        folder: file.folder?.name || null,
        tags: file.tags.map((tag) => tag.name),
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        duration: file.duration,
        createdAt: file.createdAt.toISOString(),
      })),
      folders: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        color: folder.color,
      })),
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })),
    }

    zip.file('manifest.json', JSON.stringify(manifest, null, 2))
    logger.info('Manifest created')

    // 2. 添加缩略图
    const thumbnailsFolder = zip.folder('thumbnails')
    if (thumbnailsFolder) {
      for (const file of files) {
        if (file.thumbnailPath) {
          try {
            const thumbnailFullPath = path.join(process.cwd(), file.thumbnailPath)
            const thumbnailData = await fs.readFile(thumbnailFullPath)
            thumbnailsFolder.file(`${file.id}.jpg`, thumbnailData)
            logger.debug({ fileId: file.id, thumbnailPath: file.thumbnailPath }, 'Thumbnail added')
          } catch (error) {
            logger.warn(
              { error, fileId: file.id, thumbnailPath: file.thumbnailPath },
              'Failed to read thumbnail, skipping'
            )
          }
        }
      }
    }
    logger.info('Thumbnails added')

    // 3. 添加本地文件
    const localFilesFolder = zip.folder('local-files')
    if (localFilesFolder) {
      for (const file of files) {
        if (file.source === 'LOCAL' && file.localPath) {
          try {
            const localFullPath = path.join(process.cwd(), file.localPath)
            const localData = await fs.readFile(localFullPath)
            const fileName = path.basename(file.localPath)
            localFilesFolder.file(fileName, localData)
            logger.debug({ fileId: file.id, localPath: file.localPath }, 'Local file added')
          } catch (error) {
            logger.warn(
              { error, fileId: file.id, localPath: file.localPath },
              'Failed to read local file, skipping'
            )
          }
        }
      }
    }
    logger.info('Local files added')

    // 4. 生成 ZIP 文件
    const exportPath = await ensureExportDir()
    const timestamp = Date.now()
    const zipFileName = `media-export-${userId}-${timestamp}.zip`
    const zipFilePath = path.join(exportPath, zipFileName)

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    await fs.writeFile(zipFilePath, zipBuffer)

    const relativePath = path.relative(process.cwd(), zipFilePath)
    logger.info({ relativePath, fileCount: files.length }, 'Media export completed')

    return relativePath
  } catch (error) {
    logger.error({ error, userId }, 'Failed to export media')
    throw new Error(`Failed to export media: ${error}`)
  }
}

/**
 * 清理过期的导出文件（24小时以上）
 */
export async function cleanupOldExports(): Promise<void> {
  try {
    const exportPath = path.join(process.cwd(), EXPORT_DIR)
    const files = await fs.readdir(exportPath)

    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 小时

    for (const file of files) {
      if (!file.endsWith('.zip')) continue

      const filePath = path.join(exportPath, file)
      const stats = await fs.stat(filePath)
      const age = now - stats.mtimeMs

      if (age > maxAge) {
        await fs.unlink(filePath)
        logger.info({ file, age }, 'Old export file deleted')
      }
    }

    logger.info('Cleanup of old exports completed')
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup old exports')
  }
}
