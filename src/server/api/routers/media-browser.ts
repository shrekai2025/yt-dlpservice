/**
 * Media Browser tRPC Router
 *
 * 媒体文件管理 API
 */

import { z } from 'zod'
import { createTRPCRouter, userProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { generateThumbnail, thumbnailQueue, deleteThumbnail } from '~/lib/services/thumbnail-generator'
import { exportUserMedia } from '~/lib/services/media-exporter'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import axios from 'axios'

// ============================================
// 辅助函数
// ============================================

/**
 * 检测 MIME 类型并返回媒体类型
 */
function detectMediaType(mimeType: string): 'IMAGE' | 'VIDEO' | 'AUDIO' {
  if (!mimeType) {
    throw new Error('无法获取文件类型，请检查 URL 是否正确')
  }

  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'

  throw new Error(`不支持的文件类型: ${mimeType}。仅支持图片、视频、音频文件`)
}

/**
 * 从 URL 获取文件元数据（不下载完整文件）
 */
async function getUrlMetadata(url: string) {
  try {
    const response = await axios.head(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })
    const contentType = response.headers['content-type'] as string
    const contentLength = response.headers['content-length']
      ? parseInt(response.headers['content-length'] as string, 10)
      : null

    return {
      mimeType: contentType,
      fileSize: contentLength,
    }
  } catch (error) {
    // HEAD 请求失败，尝试 GET 请求（只获取少量数据）
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        responseType: 'arraybuffer',
        maxContentLength: 1024, // 只获取 1KB
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      })

      const contentType = response.headers['content-type'] as string
      return {
        mimeType: contentType,
        fileSize: null,
      }
    } catch (getError) {
      // 如果两种方法都失败，根据 URL 扩展名猜测类型
      const urlLower = url.toLowerCase()
      if (urlLower.includes('format=jpg') || urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
        return { mimeType: 'image/jpeg', fileSize: null }
      }
      if (urlLower.includes('format=png') || urlLower.includes('.png')) {
        return { mimeType: 'image/png', fileSize: null }
      }
      if (urlLower.includes('format=webp') || urlLower.includes('.webp')) {
        return { mimeType: 'image/webp', fileSize: null }
      }
      if (urlLower.includes('format=gif') || urlLower.includes('.gif')) {
        return { mimeType: 'image/gif', fileSize: null }
      }
      if (urlLower.includes('.mp4')) {
        return { mimeType: 'video/mp4', fileSize: null }
      }
      if (urlLower.includes('.mp3')) {
        return { mimeType: 'audio/mpeg', fileSize: null }
      }

      throw new Error('无法获取文件类型，请检查 URL 是否可访问')
    }
  }
}

/**
 * 保存本地文件
 */
async function saveLocalFile(
  fileData: string,
  fileName: string,
  userId: string
): Promise<{ localPath: string; fileSize: number }> {
  const uploadDir = path.join(process.cwd(), 'data', 'media-uploads', userId)
  await fs.mkdir(uploadDir, { recursive: true })

  const buffer = Buffer.from(fileData, 'base64')
  const uniqueId = crypto.randomBytes(8).toString('hex')
  const localPath = path.join(uploadDir, `${uniqueId}_${fileName}`)

  await fs.writeFile(localPath, buffer)

  return {
    localPath: path.relative(process.cwd(), localPath),
    fileSize: buffer.length,
  }
}

// ============================================
// Router
// ============================================

export const mediaBrowserRouter = createTRPCRouter({
  // ============================================
  // 媒体文件操作
  // ============================================

  /**
   * 查询媒体文件列表
   */
  listFiles: userProcedure
    .input(
      z.object({
        page: z.number().min(1).optional(),
        pageSize: z.number().min(1).max(100).default(50),
        folderId: z.string().nullable().optional(),
        actorId: z.string().optional(),
        tagId: z.string().optional(),
        type: z.enum(['IMAGE', 'VIDEO', 'AUDIO']).optional(),
        source: z.enum(['LOCAL', 'URL']).optional(),
        search: z.string().optional(),
        starred: z.boolean().optional(),
        cursor: z.number().optional(), // For infinite query
      })
    )
    .query(async ({ ctx, input }) => {
      // Use cursor if provided (infinite query), otherwise use page
      const page = input.cursor ?? input.page ?? 1
      const { pageSize, folderId, actorId, tagId, type, source, search, starred } = input
      const userId = ctx.userId!

      const where: any = { userId }

      // 支持查询未归属文件（folderId 为 null）
      if (folderId !== undefined) {
        where.folderId = folderId
      }
      if (actorId) where.actorId = actorId
      if (type) where.type = type
      if (source) where.source = source
      if (search) where.name = { contains: search }
      if (starred !== undefined) where.starred = starred
      if (tagId) {
        where.tags = {
          some: { id: tagId },
        }
      }

      const [files, total] = await Promise.all([
        ctx.db.mediaFile.findMany({
          where,
          include: {
            folder: true,
            actor: true,
            tags: true,
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        ctx.db.mediaFile.count({ where }),
      ])

      return {
        files,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }
    }),

  /**
   * 获取单个媒体文件详情
   */
  getFile: userProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const file = await ctx.db.mediaFile.findFirst({
      where: { id: input.id, userId: ctx.userId! },
      include: {
        folder: true,
        actor: true,
        tags: true,
      },
    })

    if (!file) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
    }

    return file
  }),

  /**
   * 下载URL并保存为本地文件
   */
  downloadAndSaveUrl: userProcedure
    .input(
      z.object({
        url: z.string().url(),
        folderId: z.string().optional(),
        actorId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      try {
        // 下载文件
        const response = await axios.get(input.url, {
          responseType: 'arraybuffer',
          timeout: 60000, // 60秒超时
        })

        const contentType = response.headers['content-type'] as string
        const type = detectMediaType(contentType)

        // 提取文件名
        const urlPath = new URL(input.url).pathname
        const fileName = path.basename(urlPath) || `media_${Date.now()}`

        // 保存文件到本地
        const uploadDir = path.join(process.cwd(), 'data', 'media-uploads', userId)
        await fs.mkdir(uploadDir, { recursive: true })

        const uniqueId = crypto.randomBytes(8).toString('hex')
        const localPath = path.join(uploadDir, `${uniqueId}_${fileName}`)
        await fs.writeFile(localPath, Buffer.from(response.data))

        const stats = await fs.stat(localPath)
        const fileSize = stats.size
        const relativePath = path.relative(process.cwd(), localPath)

        // 获取媒体时长（视频和音频）
        let duration: number | null = null
        if (type === 'VIDEO' || type === 'AUDIO') {
          const { getMediaDuration } = await import('~/lib/services/audio-utils')
          duration = await getMediaDuration(relativePath)
        }

        // 创建媒体文件记录
        const file = await ctx.db.mediaFile.create({
          data: {
            userId,
            name: fileName,
            type,
            source: 'LOCAL',
            localPath: relativePath,
            originalPath: input.url, // 保存原始URL
            mimeType: contentType,
            fileSize,
            duration,
            folderId: input.folderId,
            actorId: input.actorId,
          },
        })

        // 异步生成缩略图
        if (type === 'IMAGE' || type === 'VIDEO') {
          thumbnailQueue.add({
            id: file.id,
            options: {
              userId,
              fileId: file.id,
              localPath: relativePath,
              type: type.toLowerCase() as 'image' | 'video',
            },
            onComplete: async (result) => {
              if (result.thumbnailPath) {
                await ctx.db.mediaFile.update({
                  where: { id: file.id },
                  data: {
                    thumbnailPath: result.thumbnailPath,
                    width: result.width,
                    height: result.height,
                  },
                })
              }
            },
          })
        }

        return { success: true, fileId: file.id, fileName }
      } catch (error) {
        console.error('[downloadAndSaveUrl] Failed:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `下载文件失败: ${errorMessage}`,
        })
      }
    }),

  /**
   * 批量添加 URL
   */
  addUrls: userProcedure
    .input(
      z.object({
        urls: z.array(z.string().url()),
        folderId: z.string().optional(),
        actorId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const results = []

      for (const url of input.urls) {
        try {
          // 检查是否已存在相同的 URL
          const existingFile = await ctx.db.mediaFile.findFirst({
            where: {
              userId,
              sourceUrl: url,
              source: 'URL',
            },
          })

          if (existingFile) {
            results.push({
              success: false,
              url,
              error: '该 URL 已存在',
              isDuplicate: true
            })
            continue
          }

          // 获取 URL 元数据
          const { mimeType, fileSize } = await getUrlMetadata(url)
          const type = detectMediaType(mimeType)

          // 提取文件名
          const urlPath = new URL(url).pathname
          const fileName = path.basename(urlPath) || `media_${Date.now()}`

          // 创建媒体文件记录
          const file = await ctx.db.mediaFile.create({
            data: {
              userId,
              name: fileName,
              type,
              source: 'URL',
              sourceUrl: url,
              mimeType,
              fileSize,
              folderId: input.folderId,
              actorId: input.actorId,
            },
          })

          // 异步生成缩略图（不阻塞）
          if (type === 'IMAGE' || type === 'VIDEO') {
            console.log('[addUrls] Adding thumbnail job for:', { fileId: file.id, url, type })
            thumbnailQueue.add({
              id: file.id,
              options: {
                userId,
                fileId: file.id,
                sourceUrl: url,
                type: type.toLowerCase() as 'image' | 'video',
              },
              onComplete: async (result) => {
                console.log('[addUrls] Thumbnail generation completed:', { fileId: file.id, result })
                if (result.thumbnailPath) {
                  await ctx.db.mediaFile.update({
                    where: { id: file.id },
                    data: {
                      thumbnailPath: result.thumbnailPath,
                      width: result.width,
                      height: result.height,
                    },
                  })
                  console.log('[addUrls] Thumbnail path updated in database:', { fileId: file.id, thumbnailPath })
                }
              },
            })
          }

          results.push({ success: true, url, fileId: file.id })
        } catch (error) {
          console.error('[addUrls] Failed to add URL:', url, error)
          const errorMessage = error instanceof Error ? error.message : String(error)
          results.push({ success: false, url, error: errorMessage })
        }
      }

      console.log('[addUrls] Results:', results)
      return { results }
    }),

  /**
   * 上传本地文件
   */
  uploadLocal: userProcedure
    .input(
      z.object({
        fileData: z.string(), // base64
        fileName: z.string(),
        mimeType: z.string(),
        folderId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      try {
        const type = detectMediaType(input.mimeType)

        // 计算文件大小（从 base64）
        const buffer = Buffer.from(input.fileData, 'base64')
        const fileSize = buffer.length

        // 检查是否已存在相同的文件（基于文件名和文件大小）
        const existingFile = await ctx.db.mediaFile.findFirst({
          where: {
            userId,
            name: input.fileName,
            fileSize,
            source: 'LOCAL',
          },
        })

        if (existingFile) {
          return {
            success: false,
            error: '该文件已存在',
            isDuplicate: true,
          }
        }

        // 保存文件
        const { localPath, fileSize: savedFileSize } = await saveLocalFile(input.fileData, input.fileName, userId)

        // 获取媒体时长（视频和音频）
        let duration: number | null = null
        if (type === 'VIDEO' || type === 'AUDIO') {
          const { getMediaDuration } = await import('~/lib/services/audio-utils')
          duration = await getMediaDuration(localPath)
        }

        // 创建媒体文件记录
        const file = await ctx.db.mediaFile.create({
          data: {
            userId,
            name: input.fileName,
            type,
            source: 'LOCAL',
            localPath,
            mimeType: input.mimeType,
            fileSize: savedFileSize,
            duration,
            folderId: input.folderId,
          },
        })

        // 异步生成缩略图
        if (type === 'IMAGE' || type === 'VIDEO') {
          thumbnailQueue.add({
            id: file.id,
            options: {
              userId,
              fileId: file.id,
              localPath,
              type: type.toLowerCase() as 'image' | 'video',
            },
            onComplete: async (result) => {
              if (result.thumbnailPath) {
                await ctx.db.mediaFile.update({
                  where: { id: file.id },
                  data: {
                    thumbnailPath: result.thumbnailPath,
                    width: result.width,
                    height: result.height,
                  },
                })
              }
            },
          })
        }

        return { success: true, file }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `上传失败: ${error}`,
        })
      }
    }),

  /**
   * 添加本地文件引用（不复制文件，只存储路径）
   */
  addLocalReference: userProcedure
    .input(
      z.object({
        filePath: z.string(), // 绝对路径
        fileName: z.string(),
        mimeType: z.string(),
        folderId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      try {
        // 验证文件是否存在
        try {
          await fs.access(input.filePath)
        } catch {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '文件不存在或无法访问',
          })
        }

        const type = detectMediaType(input.mimeType)

        // 获取文件信息
        const stats = await fs.stat(input.filePath)
        const fileSize = stats.size

        // 检查是否已存在相同的文件引用
        const existingFile = await ctx.db.mediaFile.findFirst({
          where: {
            userId,
            originalPath: input.filePath,
            source: 'LOCAL_REF',
          },
        })

        if (existingFile) {
          return {
            success: false,
            error: '该文件已添加',
            isDuplicate: true,
          }
        }

        // 获取媒体时长（视频和音频）
        let duration: number | null = null
        if (type === 'VIDEO' || type === 'AUDIO') {
          const { getMediaDuration } = await import('~/lib/services/audio-utils')
          duration = await getMediaDuration(input.filePath)
        }

        // 创建媒体文件记录
        const file = await ctx.db.mediaFile.create({
          data: {
            userId,
            name: input.fileName,
            type,
            source: 'LOCAL_REF',
            originalPath: input.filePath,
            mimeType: input.mimeType,
            fileSize,
            duration,
            folderId: input.folderId,
          },
        })

        // 异步生成缩略图（从原始路径读取）
        if (type === 'IMAGE' || type === 'VIDEO') {
          thumbnailQueue.add({
            id: file.id,
            options: {
              userId,
              fileId: file.id,
              localPath: input.filePath,
              type: type.toLowerCase() as 'image' | 'video',
            },
            onComplete: async (result) => {
              if (result.thumbnailPath) {
                await ctx.db.mediaFile.update({
                  where: { id: file.id },
                  data: {
                    thumbnailPath: result.thumbnailPath,
                    width: result.width,
                    height: result.height,
                  },
                })
              }
            },
          })
        }

        return { success: true, file }
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `添加文件引用失败: ${error}`,
        })
      }
    }),

  /**
   * 更新媒体文件
   */
  updateFile: userProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        remark: z.string().nullable().optional(),
        folderId: z.string().nullable().optional(),
        starred: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.mediaFile.findFirst({
        where: { id: input.id, userId: ctx.userId! },
      })

      if (!file) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
      }

      // 只包含提供的字段
      const updateData: any = {}
      if (input.name !== undefined) updateData.name = input.name
      if (input.remark !== undefined) updateData.remark = input.remark
      if (input.folderId !== undefined) updateData.folderId = input.folderId
      if (input.starred !== undefined) updateData.starred = input.starred

      const updated = await ctx.db.mediaFile.update({
        where: { id: input.id },
        data: updateData,
        include: {
          folder: true,
          actor: true,
          tags: true,
        },
      })

      return updated
    }),

  /**
   * 移动文件到文件夹（拖拽功能）
   */
  moveFileToFolder: userProcedure
    .input(
      z.object({
        fileId: z.string(),
        folderId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.mediaFile.findFirst({
        where: { id: input.fileId, userId: ctx.userId! },
      })

      if (!file) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
      }

      // 如果 folderId 不为 null，验证文件夹是否存在且属于当前用户
      if (input.folderId) {
        const folder = await ctx.db.mediaFolder.findFirst({
          where: { id: input.folderId, userId: ctx.userId! },
        })

        if (!folder) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '目标文件夹不存在' })
        }
      }

      const updated = await ctx.db.mediaFile.update({
        where: { id: input.fileId },
        data: {
          folderId: input.folderId,
        },
        include: {
          folder: true,
          actor: true,
          tags: true,
        },
      })

      return updated
    }),

  /**
   * 删除媒体文件
   */
  deleteFile: userProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const file = await ctx.db.mediaFile.findFirst({
      where: { id: input.id, userId: ctx.userId! },
    })

    if (!file) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
    }

    // 删除本地文件
    if (file.localPath) {
      try {
        await fs.unlink(path.join(process.cwd(), file.localPath))
      } catch (error) {
        console.warn('Failed to delete local file:', error)
      }
    }

    // 删除缩略图
    if (file.thumbnailPath) {
      await deleteThumbnail(file.thumbnailPath)
    }

    // 删除数据库记录
    await ctx.db.mediaFile.delete({ where: { id: input.id } })

    return { success: true }
  }),

  /**
   * 手动生成缩略图
   */
  generateThumbnail: userProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.mediaFile.findFirst({
        where: { id: input.id, userId: ctx.userId! },
      })

      if (!file) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
      }

      if (file.type === 'AUDIO') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '音频文件无法生成缩略图' })
      }

      const thumbnailPath = await generateThumbnail({
        userId: ctx.userId!,
        fileId: file.id,
        sourceUrl: file.sourceUrl || undefined,
        localPath: file.localPath || undefined,
        type: file.type.toLowerCase() as 'image' | 'video',
      })

      if (thumbnailPath) {
        await ctx.db.mediaFile.update({
          where: { id: file.id },
          data: { thumbnailPath },
        })
      }

      return { success: !!thumbnailPath, thumbnailPath }
    }),

  // ============================================
  // 文件夹操作
  // ============================================

  /**
   * 查询所有文件夹
   */
  listFolders: userProcedure.query(async ({ ctx }) => {
    const folders = await ctx.db.mediaFolder.findMany({
      where: { userId: ctx.userId! },
      include: {
        _count: {
          select: { files: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return folders
  }),

  /**
   * 创建文件夹
   */
  createFolder: userProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.db.mediaFolder.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          color: input.color,
          icon: input.icon,
        },
      })

      return folder
    }),

  /**
   * 更新文件夹
   */
  updateFolder: userProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.db.mediaFolder.findFirst({
        where: { id: input.id, userId: ctx.userId! },
      })

      if (!folder) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件夹不存在' })
      }

      const updated = await ctx.db.mediaFolder.update({
        where: { id: input.id },
        data: {
          name: input.name,
          color: input.color,
          icon: input.icon,
        },
      })

      return updated
    }),

  /**
   * 删除文件夹
   */
  deleteFolder: userProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.db.mediaFolder.findFirst({
        where: { id: input.id, userId: ctx.userId! },
      })

      if (!folder) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件夹不存在' })
      }

      await ctx.db.mediaFolder.delete({ where: { id: input.id } })

      return { success: true }
    }),

  // ============================================
  // 标签操作
  // ============================================

  /**
   * 查询所有标签
   */
  listTags: userProcedure.query(async ({ ctx }) => {
    const tags = await ctx.db.mediaTag.findMany({
      where: { userId: ctx.userId! },
      include: {
        _count: {
          select: { files: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return tags
  }),

  /**
   * 创建标签
   */
  createTag: userProcedure
    .input(
      z.object({
        name: z.string().min(1).max(30),
        color: z.string().default('#gray'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.db.mediaTag.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          color: input.color,
        },
      })

      return tag
    }),

  /**
   * 为文件添加标签
   */
  addTagsToFile: userProcedure
    .input(
      z.object({
        fileId: z.string(),
        tagIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.mediaFile.findFirst({
        where: { id: input.fileId, userId: ctx.userId! },
      })

      if (!file) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
      }

      await ctx.db.mediaFile.update({
        where: { id: input.fileId },
        data: {
          tags: {
            connect: input.tagIds.map((id) => ({ id })),
          },
        },
      })

      return { success: true }
    }),

  /**
   * 从文件移除标签
   */
  removeTagsFromFile: userProcedure
    .input(
      z.object({
        fileId: z.string(),
        tagIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.mediaFile.findFirst({
        where: { id: input.fileId, userId: ctx.userId! },
      })

      if (!file) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
      }

      await ctx.db.mediaFile.update({
        where: { id: input.fileId },
        data: {
          tags: {
            disconnect: input.tagIds.map((id) => ({ id })),
          },
        },
      })

      return { success: true }
    }),

  /**
   * 删除标签
   */
  deleteTag: userProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const tag = await ctx.db.mediaTag.findFirst({
      where: { id: input.id, userId: ctx.userId! },
    })

    if (!tag) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '标签不存在' })
    }

    await ctx.db.mediaTag.delete({ where: { id: input.id } })

    return { success: true }
  }),

  // ============================================
  // 演员操作
  // ============================================

  /**
   * 查询所有演员
   */
  listActors: userProcedure.query(async ({ ctx }) => {
    const actors = await ctx.db.mediaActor.findMany({
      where: { userId: ctx.userId! },
      include: {
        _count: {
          select: { files: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return actors
  }),

  /**
   * 创建演员
   */
  createActor: userProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        avatarUrl: z.string().optional(),
        referenceImageUrl: z.string().optional(),
        bio: z.string().optional(),
        voiceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await ctx.db.mediaActor.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          avatarUrl: input.avatarUrl,
          referenceImageUrl: input.referenceImageUrl,
          bio: input.bio,
          voiceId: input.voiceId,
        },
      })

      return actor
    }),

  /**
   * 更新演员
   */
  updateActor: userProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        avatarUrl: z.string().optional(),
        referenceImageUrl: z.string().optional(),
        bio: z.string().optional(),
        voiceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const actor = await ctx.db.mediaActor.findFirst({
        where: { id: input.id, userId: ctx.userId! },
      })

      if (!actor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '演员不存在' })
      }

      const updated = await ctx.db.mediaActor.update({
        where: { id: input.id },
        data: {
          name: input.name,
          avatarUrl: input.avatarUrl,
          referenceImageUrl: input.referenceImageUrl,
          bio: input.bio,
          voiceId: input.voiceId,
        },
      })

      return updated
    }),

  /**
   * 删除演员
   */
  deleteActor: userProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const actor = await ctx.db.mediaActor.findFirst({
        where: { id: input.id, userId: ctx.userId! },
      })

      if (!actor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '演员不存在' })
      }

      await ctx.db.mediaActor.delete({ where: { id: input.id } })

      return { success: true }
    }),

  /**
   * 移动文件到演员（拖拽功能）
   */
  moveFileToActor: userProcedure
    .input(
      z.object({
        fileId: z.string(),
        actorId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.mediaFile.findFirst({
        where: { id: input.fileId, userId: ctx.userId! },
      })

      if (!file) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
      }

      // 如果 actorId 不为 null，验证演员是否存在且属于当前用户
      if (input.actorId) {
        const actor = await ctx.db.mediaActor.findFirst({
          where: { id: input.actorId, userId: ctx.userId! },
        })

        if (!actor) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '目标演员不存在' })
        }
      }

      const updated = await ctx.db.mediaFile.update({
        where: { id: input.fileId },
        data: {
          actorId: input.actorId,
        },
        include: {
          folder: true,
          actor: true,
          tags: true,
        },
      })

      return updated
    }),

  /**
   * 重新生成缩略图
   */
  regenerateThumbnail: userProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const file = await ctx.db.mediaFile.findFirst({
        where: { id: input.fileId, userId },
      })

      if (!file) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
      }

      if (file.type === 'AUDIO') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '音频文件不支持缩略图' })
      }

      // 删除旧的缩略图
      if (file.thumbnailPath) {
        await deleteThumbnail(file.thumbnailPath)
        await ctx.db.mediaFile.update({
          where: { id: file.id },
          data: { thumbnailPath: null },
        })
      }

      // 添加到缩略图生成队列
      thumbnailQueue.add({
        id: file.id,
        options: {
          userId,
          fileId: file.id,
          sourceUrl: file.sourceUrl || undefined,
          localPath: file.localPath || file.originalPath || undefined,
          type: file.type.toLowerCase() as 'image' | 'video',
        },
        onComplete: async (result) => {
          console.log('[regenerateThumbnail] Thumbnail generated:', { fileId: file.id, result })
          if (result.thumbnailPath) {
            await ctx.db.mediaFile.update({
              where: { id: file.id },
              data: {
                thumbnailPath: result.thumbnailPath,
                width: result.width,
                height: result.height,
              },
            })
          }
        },
      })

      return { success: true, message: '缩略图重新生成任务已添加' }
    }),

  /**
   * 转存远程URL文件到本地
   */
  convertUrlToLocal: userProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const file = await ctx.db.mediaFile.findFirst({
        where: { id: input.fileId, userId },
      })

      if (!file) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文件不存在' })
      }

      if (file.source !== 'URL') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '只能转存远程URL文件' })
      }

      if (!file.sourceUrl) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '文件缺少远程URL' })
      }

      try {
        // 下载远程文件
        console.log('[convertUrlToLocal] Downloading file from:', file.sourceUrl)
        const response = await axios.get(file.sourceUrl, {
          responseType: 'arraybuffer',
          timeout: 60000, // 60秒超时
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        })

        const buffer = Buffer.from(response.data as ArrayBuffer)

        // 准备保存文件
        const uploadDir = path.join(process.cwd(), 'data', 'media-uploads', userId)
        await fs.mkdir(uploadDir, { recursive: true })

        const uniqueId = crypto.randomBytes(8).toString('hex')
        const localPath = path.join(uploadDir, `${uniqueId}_${file.name}`)

        // 保存文件
        await fs.writeFile(localPath, buffer)
        const relativePath = path.relative(process.cwd(), localPath)

        console.log('[convertUrlToLocal] File saved to:', relativePath)

        // 获取媒体时长（视频和音频）
        let duration: number | null = file.duration
        if ((file.type === 'VIDEO' || file.type === 'AUDIO') && !duration) {
          const { getMediaDuration } = await import('~/lib/services/audio-utils')
          duration = await getMediaDuration(relativePath)
        }

        // 更新数据库记录
        const updated = await ctx.db.mediaFile.update({
          where: { id: file.id },
          data: {
            source: 'LOCAL',
            localPath: relativePath,
            fileSize: buffer.length,
            duration,
          },
          include: {
            folder: true,
            actor: true,
            tags: true,
          },
        })

        // 重新生成缩略图（从本地文件）
        if (file.type === 'IMAGE' || file.type === 'VIDEO') {
          // 删除旧的基于URL的缩略图
          if (file.thumbnailPath) {
            await deleteThumbnail(file.thumbnailPath)
          }

          thumbnailQueue.add({
            id: file.id,
            options: {
              userId,
              fileId: file.id,
              localPath: relativePath,
              type: file.type.toLowerCase() as 'image' | 'video',
            },
            onComplete: async (result) => {
              console.log('[convertUrlToLocal] Thumbnail regenerated:', { fileId: file.id, result })
              if (result.thumbnailPath) {
                await ctx.db.mediaFile.update({
                  where: { id: file.id },
                  data: {
                    thumbnailPath: result.thumbnailPath,
                    width: result.width,
                    height: result.height,
                  },
                })
              }
            },
          })
        }

        console.log('[convertUrlToLocal] Conversion completed:', { fileId: file.id, localPath: relativePath })
        return { success: true, file: updated }
      } catch (error) {
        console.error('[convertUrlToLocal] Failed:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `转存失败: ${errorMessage}`,
        })
      }
    }),

  // ============================================
  // 导出操作
  // ============================================

  /**
   * 导出所有媒体文件
   */
  exportMedia: userProcedure.mutation(async ({ ctx }) => {
    const zipPath = await exportUserMedia(ctx.userId!)

    return {
      success: true,
      downloadPath: `/${zipPath}`, // 前端可以通过这个路径下载
    }
  }),
})
