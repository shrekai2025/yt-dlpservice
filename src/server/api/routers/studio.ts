/**
 * Studio tRPC Router
 *
 * AI 短片制作工作流系统的 tRPC 接口
 */

import { z } from 'zod'
import { createTRPCRouter, userProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { audioExtenderService } from '~/lib/services/audio-extender'
import { createAdapter } from '~/lib/ai-generation/adapters/adapter-factory'
import { pollAsyncTask } from '~/lib/ai-generation/services/task-poller'
import { taskManager } from '~/lib/ai-generation/services/task-manager'
import { resultStorageService } from '~/lib/ai-generation/services/result-storage-service'
import type { ModelConfig } from '~/lib/ai-generation/adapters/types'

// ============================================
// 辅助函数
// ============================================

/**
 * 将数据库模型转换为适配器配置
 */
function toModelConfig(model: {
  id: string
  slug: string
  name: string
  adapterName: string
  outputType: string
  provider: {
    id: string
    slug: string
    name: string
    apiEndpoint: string | null
    apiKey: string | null
    apiKeyId: string | null
    apiKeySecret: string | null
    uploadToS3: boolean
    s3PathPrefix: string | null
  }
}): ModelConfig {
  return {
    id: model.id,
    slug: model.slug,
    name: model.name,
    provider: {
      id: model.provider.id,
      slug: model.provider.slug,
      name: model.provider.name,
      apiKey: model.provider.apiKey || undefined,
      apiKeyId: model.provider.apiKeyId || undefined,
      apiKeySecret: model.provider.apiKeySecret || undefined,
      apiEndpoint: model.provider.apiEndpoint || undefined,
    },
    outputType: model.outputType as 'IMAGE' | 'VIDEO' | 'AUDIO',
    adapterName: model.adapterName,
  }
}

// ============================================
// 项目管理
// ============================================

export const studioRouter = createTRPCRouter({
  // 列出用户的所有项目
  listProjects: userProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!

    const projects = await ctx.db.studioProject.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            episodes: true,
            characters: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return projects
  }),

  // 获取单个项目详情
  getProject: userProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const project = await ctx.db.studioProject.findFirst({
        where: {
          id: input.projectId,
          userId,
        },
        include: {
          episodes: {
            orderBy: { episodeNumber: 'desc' },
            take: 10,
          },
          characters: {
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
          _count: {
            select: {
              episodes: true,
              characters: true,
            },
          },
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      return project
    }),

  // 创建项目
  createProject: userProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        config: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 检查 slug 是否已存在
      const existing = await ctx.db.studioProject.findFirst({
        where: {
          userId,
          slug: input.slug,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '该标识符已被使用',
        })
      }

      const project = await ctx.db.studioProject.create({
        data: {
          userId,
          name: input.name,
          description: input.description,
          slug: input.slug,
          config: input.config,
        },
      })

      return project
    }),

  // 更新项目
  updateProject: userProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        config: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const { projectId, ...data } = input

      // 验证所有权
      const existing = await ctx.db.studioProject.findFirst({
        where: { id: projectId, userId },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      const project = await ctx.db.studioProject.update({
        where: { id: projectId },
        data,
      })

      return project
    }),

  // 删除项目
  deleteProject: userProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证所有权
      const existing = await ctx.db.studioProject.findFirst({
        where: { id: input.projectId, userId },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      await ctx.db.studioProject.delete({
        where: { id: input.projectId },
      })

      return { success: true }
    }),

  // ============================================
  // 集(Episode)管理
  // ============================================

  // 列出项目的所有集
  listEpisodes: userProcedure
    .input(
      z.object({
        projectId: z.string(),
        status: z.enum(['draft', 'in-progress', 'completed', 'archived']).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const { projectId, status, page, pageSize } = input

      // 验证项目所有权
      const project = await ctx.db.studioProject.findFirst({
        where: { id: projectId, userId },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      const where: any = { projectId }
      if (status) where.status = status

      const [episodes, total] = await Promise.all([
        ctx.db.studioEpisode.findMany({
          where,
          include: {
            _count: {
              select: {
                shots: true,
              },
            },
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { episodeNumber: 'desc' },
        }),
        ctx.db.studioEpisode.count({ where }),
      ])

      return {
        episodes,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      }
    }),

  // 获取单个集详情
  getEpisode: userProcedure
    .input(z.object({ episodeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const episode = await ctx.db.studioEpisode.findFirst({
        where: {
          id: input.episodeId,
          project: { userId },
        },
        include: {
          project: true,
          setting: true,
          shots: {
            include: {
              characters: {
                include: {
                  character: true,
                },
                orderBy: { sortOrder: 'asc' },
              },
              frames: {
                orderBy: [{ type: 'asc' }, { version: 'desc' }],
              },
              generationTasks: {
                select: {
                  id: true,
                  costUSD: true,
                  status: true,
                  createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
              },
            },
            orderBy: { shotNumber: 'asc' },
          },
        },
      })

      if (!episode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      return episode
    }),

  // 创建新集
  createEpisode: userProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证项目所有权
      const project = await ctx.db.studioProject.findFirst({
        where: { id: input.projectId, userId },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      // 获取下一个集号
      const lastEpisode = await ctx.db.studioEpisode.findFirst({
        where: { projectId: input.projectId },
        orderBy: { episodeNumber: 'desc' },
      })

      const nextNumber = (lastEpisode?.episodeNumber ?? 0) + 1

      // 创建集和默认设定
      const episode = await ctx.db.studioEpisode.create({
        data: {
          projectId: input.projectId,
          episodeNumber: nextNumber,
          title: input.title,
          setting: {
            create: {},
          },
        },
        include: {
          setting: true,
        },
      })

      return episode
    }),

  // 更新集
  updateEpisode: userProcedure
    .input(
      z.object({
        episodeId: z.string(),
        title: z.string().optional(),
        status: z.enum(['draft', 'in-progress', 'completed', 'archived']).optional(),
        rawInput: z.string().optional(),
        corePoint: z.string().optional(),
        objective: z.string().optional(),
        objectiveLLM: z.string().optional(),
        systemPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const { episodeId, ...data } = input

      // 验证所有权
      const existing = await ctx.db.studioEpisode.findFirst({
        where: {
          id: episodeId,
          project: { userId },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      const episode = await ctx.db.studioEpisode.update({
        where: { id: episodeId },
        data,
      })

      return episode
    }),

  // 归档集
  archiveEpisode: userProcedure
    .input(z.object({ episodeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const existing = await ctx.db.studioEpisode.findFirst({
        where: {
          id: input.episodeId,
          project: { userId },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      const episode = await ctx.db.studioEpisode.update({
        where: { id: input.episodeId },
        data: {
          status: 'archived',
          archivedAt: new Date(),
        },
      })

      return episode
    }),

  // 从归档恢复
  restoreEpisode: userProcedure
    .input(z.object({ episodeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const existing = await ctx.db.studioEpisode.findFirst({
        where: {
          id: input.episodeId,
          project: { userId },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      const episode = await ctx.db.studioEpisode.update({
        where: { id: input.episodeId },
        data: {
          status: 'draft',
          archivedAt: null,
        },
      })

      return episode
    }),

  // 删除集
  deleteEpisode: userProcedure
    .input(z.object({ episodeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const existing = await ctx.db.studioEpisode.findFirst({
        where: {
          id: input.episodeId,
          project: { userId },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      await ctx.db.studioEpisode.delete({
        where: { id: input.episodeId },
      })

      return { success: true }
    }),

  // ============================================
  // 背景设定管理
  // ============================================

  // 更新背景设定
  updateSetting: userProcedure
    .input(
      z.object({
        episodeId: z.string(),
        era: z.string().optional(),
        genre: z.string().optional(),
        visualStyle: z.string().optional(),
        referenceImages: z.string().optional(),
        stylePrompt: z.string().optional(),
        lightingPrompt: z.string().optional(),
        colorPrompt: z.string().optional(),
        customPrompts: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const { episodeId, ...data } = input

      // 验证所有权
      const episode = await ctx.db.studioEpisode.findFirst({
        where: {
          id: episodeId,
          project: { userId },
        },
      })

      if (!episode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      // Upsert setting
      const setting = await ctx.db.studioSetting.upsert({
        where: { episodeId },
        create: {
          episodeId,
          ...data,
        },
        update: data,
      })

      return setting
    }),

  // ============================================
  // 角色管理
  // ============================================

  // 列出项目角色
  listCharacters: userProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证项目所有权
      const project = await ctx.db.studioProject.findFirst({
        where: { id: input.projectId, userId },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      const characters = await ctx.db.studioCharacter.findMany({
        where: { projectId: input.projectId },
        include: {
          sourceActor: true,
          sourceEpisode: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })

      return characters
    }),

  // 创建角色
  createCharacter: userProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        appearancePrompt: z.string().optional(),
        referenceImage: z.string().optional(),
        metadata: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证项目所有权
      const project = await ctx.db.studioProject.findFirst({
        where: { id: input.projectId, userId },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      // 检查角色名是否已存在
      const existing = await ctx.db.studioCharacter.findFirst({
        where: {
          projectId: input.projectId,
          name: input.name,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '该角色名已存在',
        })
      }

      const character = await ctx.db.studioCharacter.create({
        data: input,
      })

      return character
    }),

  // 从演员表导入角色
  importCharacterFromActor: userProcedure
    .input(
      z.object({
        projectId: z.string(),
        actorId: z.string(),
        customName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证项目所有权
      const project = await ctx.db.studioProject.findFirst({
        where: { id: input.projectId, userId },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      // 验证演员所有权
      const actor = await ctx.db.mediaActor.findFirst({
        where: { id: input.actorId, userId },
      })

      if (!actor) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '演员不存在',
        })
      }

      const characterName = input.customName || actor.name

      // 检查角色名是否已存在
      const existing = await ctx.db.studioCharacter.findFirst({
        where: {
          projectId: input.projectId,
          name: characterName,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '该角色名已存在',
        })
      }

      const character = await ctx.db.studioCharacter.create({
        data: {
          projectId: input.projectId,
          name: characterName,
          description: actor.bio || undefined,
          sourceActorId: actor.id,
          appearancePrompt: actor.appearancePrompt || undefined,
          referenceImage: actor.avatarUrl || undefined,
          voiceId: actor.voiceId || undefined,
        },
        include: {
          sourceActor: true,
        },
      })

      return character
    }),

  // 刷新角色数据(从演员表同步)
  syncCharacterFromActor: userProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证角色所有权
      const character = await ctx.db.studioCharacter.findFirst({
        where: {
          id: input.characterId,
          project: { userId },
        },
        include: {
          sourceActor: true,
        },
      })

      if (!character) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '角色不存在',
        })
      }

      if (!character.sourceActorId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '该角色未关联演员表',
        })
      }

      const actor = character.sourceActor!

      const updated = await ctx.db.studioCharacter.update({
        where: { id: input.characterId },
        data: {
          description: actor.bio || undefined,
          appearancePrompt: actor.appearancePrompt || undefined,
          referenceImage: actor.avatarUrl || undefined,
          voiceId: actor.voiceId || undefined,
        },
        include: {
          sourceActor: true,
        },
      })

      return updated
    }),

  // 更新角色
  updateCharacter: userProcedure
    .input(
      z.object({
        characterId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        appearancePrompt: z.string().optional(),
        referenceImage: z.string().optional(),
        metadata: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const { characterId, ...data } = input

      // 验证所有权
      const existing = await ctx.db.studioCharacter.findFirst({
        where: {
          id: characterId,
          project: { userId },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '角色不存在',
        })
      }

      const character = await ctx.db.studioCharacter.update({
        where: { id: characterId },
        data,
      })

      return character
    }),

  // 删除角色
  deleteCharacter: userProcedure
    .input(z.object({ characterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const existing = await ctx.db.studioCharacter.findFirst({
        where: {
          id: input.characterId,
          project: { userId },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '角色不存在',
        })
      }

      await ctx.db.studioCharacter.delete({
        where: { id: input.characterId },
      })

      return { success: true }
    }),

  // ============================================
  // 镜头管理
  // ============================================

  // 创建镜头
  createShot: userProcedure
    .input(
      z.object({
        episodeId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证所有权
      const episode = await ctx.db.studioEpisode.findFirst({
        where: {
          id: input.episodeId,
          project: { userId },
        },
      })

      if (!episode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      // 获取下一个镜头号
      const lastShot = await ctx.db.studioShot.findFirst({
        where: { episodeId: input.episodeId },
        orderBy: { shotNumber: 'desc' },
      })

      const nextNumber = (lastShot?.shotNumber ?? 0) + 1

      const shot = await ctx.db.studioShot.create({
        data: {
          episodeId: input.episodeId,
          shotNumber: nextNumber,
          name: input.name,
          description: input.description,
        },
      })

      return shot
    }),

  // 更新镜头
  updateShot: userProcedure
    .input(
      z.object({
        shotId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        scenePrompt: z.string().optional(),
        actionPrompt: z.string().optional(),
        cameraPrompt: z.string().optional(),
        dialogue: z.string().optional(),
        duration: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const { shotId, ...data } = input

      // 验证所有权
      const existing = await ctx.db.studioShot.findFirst({
        where: {
          id: shotId,
          episode: {
            project: { userId },
          },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '镜头不存在',
        })
      }

      const shot = await ctx.db.studioShot.update({
        where: { id: shotId },
        data,
      })

      return shot
    }),

  // 删除镜头
  deleteShot: userProcedure
    .input(z.object({ shotId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const existing = await ctx.db.studioShot.findFirst({
        where: {
          id: input.shotId,
          episode: {
            project: { userId },
          },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '镜头不存在',
        })
      }

      await ctx.db.studioShot.delete({
        where: { id: input.shotId },
      })

      return { success: true }
    }),

  // 为镜头添加角色
  addCharacterToShot: userProcedure
    .input(
      z.object({
        shotId: z.string(),
        characterId: z.string(),
        dialogue: z.string().optional(),
        position: z.string().optional(),
        action: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证所有权
      const shot = await ctx.db.studioShot.findFirst({
        where: {
          id: input.shotId,
          episode: {
            project: { userId },
          },
        },
      })

      if (!shot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '镜头不存在',
        })
      }

      // 验证角色属于同一项目
      const character = await ctx.db.studioCharacter.findFirst({
        where: {
          id: input.characterId,
          project: { userId },
        },
        include: {
          project: true,
        },
      })

      if (!character) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '角色不存在',
        })
      }

      // 检查是否已添加
      const existing = await ctx.db.studioShotCharacter.findFirst({
        where: {
          shotId: input.shotId,
          characterId: input.characterId,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: '该角色已添加到此镜头',
        })
      }

      const shotCharacter = await ctx.db.studioShotCharacter.create({
        data: {
          shotId: input.shotId,
          characterId: input.characterId,
          dialogue: input.dialogue,
          position: input.position,
          action: input.action,
        },
        include: {
          character: true,
        },
      })

      return shotCharacter
    }),

  // 更新镜头角色
  updateShotCharacter: userProcedure
    .input(
      z.object({
        shotCharacterId: z.string(),
        dialogue: z.string().optional(),
        position: z.string().optional(),
        action: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const { shotCharacterId, ...data } = input

      // 验证所有权
      const existing = await ctx.db.studioShotCharacter.findFirst({
        where: {
          id: shotCharacterId,
          shot: {
            episode: {
              project: { userId },
            },
          },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '镜头角色不存在',
        })
      }

      const shotCharacter = await ctx.db.studioShotCharacter.update({
        where: { id: shotCharacterId },
        data,
      })

      return shotCharacter
    }),

  // 从镜头移除角色
  removeCharacterFromShot: userProcedure
    .input(z.object({ shotCharacterId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const existing = await ctx.db.studioShotCharacter.findFirst({
        where: {
          id: input.shotCharacterId,
          shot: {
            episode: {
              project: { userId },
            },
          },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '镜头角色不存在',
        })
      }

      await ctx.db.studioShotCharacter.delete({
        where: { id: input.shotCharacterId },
      })

      return { success: true }
    }),

  // ============================================
  // 帧/生成资产管理
  // ============================================

  // 生成帧(首帧或动画)
  generateFrame: userProcedure
    .input(
      z.object({
        shotId: z.string(),
        type: z.enum(['keyframe', 'animation']),
        modelId: z.string(),
        prompt: z.string(),
        inputImages: z.array(z.string()).optional(),
        parameters: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证所有权
      const shot = await ctx.db.studioShot.findFirst({
        where: {
          id: input.shotId,
          episode: {
            project: { userId },
          },
        },
        include: {
          frames: {
            where: { type: input.type },
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      })

      if (!shot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '镜头不存在',
        })
      }

      // 计算下一个版本号
      const latestVersion = shot.frames[0]?.version ?? 0
      const nextVersion = latestVersion + 1

      // 创建帧记录(pending状态)
      const frame = await ctx.db.studioFrame.create({
        data: {
          shotId: input.shotId,
          type: input.type,
          version: nextVersion,
          modelId: input.modelId,
          prompt: input.prompt,
          inputImages: input.inputImages ? JSON.stringify(input.inputImages) : null,
          parameters: input.parameters,
          status: 'pending',
        },
      })

      // 注意: 实际的AI生成任务需要异步调用aiGeneration.generate
      // 这里只返回frame记录,前端需要调用generate mutation

      return frame
    }),

  // 更新帧状态(供AI生成回调使用)
  updateFrameStatus: userProcedure
    .input(
      z.object({
        frameId: z.string(),
        status: z.enum(['pending', 'generating', 'completed', 'failed']),
        taskId: z.string().optional(),
        resultUrl: z.string().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!
      const { frameId, ...data } = input

      // 验证所有权
      const existing = await ctx.db.studioFrame.findFirst({
        where: {
          id: frameId,
          shot: {
            episode: {
              project: { userId },
            },
          },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '帧不存在',
        })
      }

      const frame = await ctx.db.studioFrame.update({
        where: { id: frameId },
        data,
      })

      return frame
    }),

  // 选择帧版本
  selectFrameVersion: userProcedure
    .input(z.object({ frameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证所有权
      const frame = await ctx.db.studioFrame.findFirst({
        where: {
          id: input.frameId,
          shot: {
            episode: {
              project: { userId },
            },
          },
        },
      })

      if (!frame) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '帧不存在',
        })
      }

      // 取消同类型其他版本的选中状态
      await ctx.db.studioFrame.updateMany({
        where: {
          shotId: frame.shotId,
          type: frame.type,
        },
        data: {
          isSelected: false,
        },
      })

      // 选中当前版本
      const updated = await ctx.db.studioFrame.update({
        where: { id: input.frameId },
        data: {
          isSelected: true,
        },
      })

      return updated
    }),

  // 删除帧
  deleteFrame: userProcedure
    .input(z.object({ frameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      const existing = await ctx.db.studioFrame.findFirst({
        where: {
          id: input.frameId,
          shot: {
            episode: {
              project: { userId },
            },
          },
        },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '帧不存在',
        })
      }

      await ctx.db.studioFrame.delete({
        where: { id: input.frameId },
      })

      return { success: true }
    }),

  // ============================================
  // 角色提取
  // ============================================

  // 从目标JSON中提取角色
  extractCharactersFromObjective: userProcedure
    .input(
      z.object({
        episodeId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证所有权并获取episode
      const episode = await ctx.db.studioEpisode.findFirst({
        where: {
          id: input.episodeId,
          project: { userId },
        },
        include: {
          project: true,
        },
      })

      if (!episode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      if (!episode.objective) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '尚未生成目标数据',
        })
      }

      // 提取JSON（从第一个{到最后一个}）
      const extractJsonFromString = (str: string): string => {
        const firstBrace = str.indexOf('{')
        const lastBrace = str.lastIndexOf('}')

        if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
          return str
        }

        return str.substring(firstBrace, lastBrace + 1)
      }

      try {
        const jsonStr = extractJsonFromString(episode.objective)
        const data = JSON.parse(jsonStr) as {
          characters?: Array<{
            name: string
            appearance: string
            environment: string
          }>
        }

        if (!data.characters || data.characters.length === 0) {
          return { characters: [], created: 0 }
        }

        // 将新格式的角色数据转换为内部格式
        const extractedCharacters = data.characters.map((char) => ({
          name: char.name,
          appearance: char.appearance,
          environment: char.environment,
        }))

        // 批量创建或更新角色
        let createdCount = 0
        let updatedCount = 0
        for (const char of extractedCharacters) {
          // 检查是否已存在
          const existing = await ctx.db.studioCharacter.findFirst({
            where: {
              projectId: episode.projectId,
              name: char.name,
            },
          })

          if (!existing) {
            // 创建新角色
            await ctx.db.studioCharacter.create({
              data: {
                projectId: episode.projectId,
                name: char.name,
                appearancePrompt: char.appearance,
                description: char.environment,
                sourceEpisodeId: input.episodeId,
              },
            })
            createdCount++
          } else {
            // 更新现有角色的外观和场景信息
            await ctx.db.studioCharacter.update({
              where: { id: existing.id },
              data: {
                appearancePrompt: char.appearance,
                description: char.environment,
                sourceEpisodeId: input.episodeId,
              },
            })
            updatedCount++
          }
        }

        return {
          characters: extractedCharacters,
          created: createdCount,
          updated: updatedCount,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `无法解析目标JSON: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }),

  // 关联角色到演员
  linkCharacterToActor: userProcedure
    .input(
      z.object({
        characterId: z.string(),
        actorId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证角色所有权
      const character = await ctx.db.studioCharacter.findFirst({
        where: {
          id: input.characterId,
          project: { userId },
        },
      })

      if (!character) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '角色不存在',
        })
      }

      // 如果提供了actorId，验证演员存在并获取voiceId
      let voiceId: string | undefined = undefined
      if (input.actorId) {
        const actor = await ctx.db.mediaActor.findUnique({
          where: { id: input.actorId },
        })

        if (!actor) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '演员不存在',
          })
        }

        // 同步voiceId
        voiceId = actor.voiceId || undefined
      }

      // 更新关联
      const updated = await ctx.db.studioCharacter.update({
        where: { id: input.characterId },
        data: {
          sourceActorId: input.actorId,
          voiceId: input.actorId ? voiceId : null, // 如果取消关联，清空voiceId
        },
        include: {
          sourceActor: true,
        },
      })

      return updated
    }),

  // ============================================
  // 镜头同步
  // ============================================

  // 从目标JSON同步镜头
  syncShotsFromObjective: userProcedure
    .input(
      z.object({
        episodeId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证所有权并获取episode
      const episode = await ctx.db.studioEpisode.findFirst({
        where: {
          id: input.episodeId,
          project: { userId },
        },
        include: {
          project: true,
          shots: true,
        },
      })

      if (!episode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      if (!episode.objective) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '尚未生成目标数据',
        })
      }

      // 提取JSON（从第一个{到最后一个}）
      const extractJsonFromString = (str: string): string => {
        const firstBrace = str.indexOf('{')
        const lastBrace = str.lastIndexOf('}')

        if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
          return str
        }

        return str.substring(firstBrace, lastBrace + 1)
      }

      // 去除台词中的引号（中英文引号）
      const removeQuotes = (text: string): string => {
        return text
          .replace(/^["'""''「『『]/, '')  // 去除开头的引号（包含各种中英文引号）
          .replace(/["'""''」』』]$/, '')  // 去除结尾的引号
          .trim()
      }

      try {
        const jsonStr = extractJsonFromString(episode.objective)
        const data = JSON.parse(jsonStr) as {
          shots?: Array<{
            shotNumber: number
            character?: string
            action?: string
            dialogue?: string
          }>
        }

        if (!data.shots || data.shots.length === 0) {
          return { shots: [], created: 0, updated: 0 }
        }

        // 获取项目的所有角色（用于匹配）
        const characters = await ctx.db.studioCharacter.findMany({
          where: { projectId: episode.projectId },
        })

        const characterMap = new Map(characters.map((c) => [c.name, c.id]))

        let createdCount = 0
        let updatedCount = 0

        // 同步每个镜头
        for (const shotData of data.shots) {
          // 查找现有镜头
          const existingShot = await ctx.db.studioShot.findFirst({
            where: {
              episodeId: input.episodeId,
              shotNumber: shotData.shotNumber,
            },
          })

          if (existingShot) {
            // 更新现有镜头（新结构中镜头本身不再存储场景和动作信息）
            await ctx.db.studioShot.update({
              where: { id: existingShot.id },
              data: {
                name: `镜头 ${shotData.shotNumber}`,
                dialogue: shotData.dialogue || undefined,
              },
            })
            updatedCount++

            // 如果有角色信息，添加或更新角色到镜头
            if (shotData.character && characterMap.has(shotData.character)) {
              const characterId = characterMap.get(shotData.character)!
              const cleanDialogue = shotData.dialogue ? removeQuotes(shotData.dialogue) : undefined

              // 检查是否已添加
              const existingChar = await ctx.db.studioShotCharacter.findFirst({
                where: {
                  shotId: existingShot.id,
                  characterId,
                },
              })

              if (existingChar) {
                // 更新台词和动作
                await ctx.db.studioShotCharacter.update({
                  where: { id: existingChar.id },
                  data: {
                    dialogue: cleanDialogue,
                    action: shotData.action || undefined, // 角色在此镜头的具体动作和表情
                  },
                })
              } else {
                // 创建新的角色关联，包含台词和动作
                await ctx.db.studioShotCharacter.create({
                  data: {
                    shotId: existingShot.id,
                    characterId,
                    dialogue: cleanDialogue,
                    action: shotData.action || undefined, // 角色在此镜头的具体动作和表情
                    sortOrder: 0,
                  },
                })
              }
            }
          } else {
            // 创建新镜头（新结构中镜头本身不再存储场景和动作信息）
            const newShot = await ctx.db.studioShot.create({
              data: {
                episodeId: input.episodeId,
                shotNumber: shotData.shotNumber,
                name: `镜头 ${shotData.shotNumber}`,
                dialogue: shotData.dialogue || undefined,
              },
            })
            createdCount++

            // 如果有角色信息，添加角色到镜头，包含台词和动作
            if (shotData.character && characterMap.has(shotData.character)) {
              const characterId = characterMap.get(shotData.character)!
              const cleanDialogue = shotData.dialogue ? removeQuotes(shotData.dialogue) : undefined

              await ctx.db.studioShotCharacter.create({
                data: {
                  shotId: newShot.id,
                  characterId,
                  dialogue: cleanDialogue,
                  action: shotData.action || undefined, // 角色在此镜头的具体动作和表情
                  sortOrder: 0,
                },
              })
            }
          }
        }

        return {
          shots: data.shots,
          created: createdCount,
          updated: updatedCount,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `无法解析目标JSON: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }),

  // ============================================
  // 镜头与AI生成关联
  // ============================================

  /**
   * 设置镜头首帧图片
   */
  setShotImage: userProcedure
    .input(
      z.object({
        shotId: z.string(),
        imageUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shot = await ctx.db.studioShot.findUnique({
        where: { id: input.shotId },
        include: {
          episode: {
            include: {
              project: true,
            },
          },
        },
      })

      if (!shot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '镜头不存在',
        })
      }

      // 验证用户权限
      if (shot.episode.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权限操作此镜头',
        })
      }

      // 更新镜头首帧
      const updatedShot = await ctx.db.studioShot.update({
        where: { id: input.shotId },
        data: {
          scenePrompt: input.imageUrl,
        },
      })

      return updatedShot
    }),

  /**
   * 设置镜头视频
   */
  setShotVideo: userProcedure
    .input(
      z.object({
        shotId: z.string(),
        videoUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shot = await ctx.db.studioShot.findUnique({
        where: { id: input.shotId },
        include: {
          episode: {
            include: {
              project: true,
            },
          },
        },
      })

      if (!shot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '镜头不存在',
        })
      }

      // 验证用户权限
      if (shot.episode.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权限操作此镜头',
        })
      }

      // 更新镜头视频
      const updatedShot = await ctx.db.studioShot.update({
        where: { id: input.shotId },
        data: {
          actionPrompt: input.videoUrl,
        },
      })

      return updatedShot
    }),

  /**
   * 设置镜头音频
   */
  setShotAudio: userProcedure
    .input(
      z.object({
        shotId: z.string(),
        audioUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shot = await ctx.db.studioShot.findUnique({
        where: { id: input.shotId },
        include: {
          episode: {
            include: {
              project: true,
            },
          },
        },
      })

      if (!shot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '镜头不存在',
        })
      }

      // 验证用户权限
      if (shot.episode.project.userId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '无权限操作此镜头',
        })
      }

      // 如果音频URL被清空或更改，删除扩展音频文件
      if (shot.extendedAudioUrl && (!input.audioUrl || input.audioUrl !== shot.cameraPrompt)) {
        await audioExtenderService.deleteExtendedAudio(shot.extendedAudioUrl)
      }

      // 更新镜头音频
      const updatedShot = await ctx.db.studioShot.update({
        where: { id: input.shotId },
        data: {
          cameraPrompt: input.audioUrl,
          // 清空扩展音频URL
          extendedAudioUrl: (!input.audioUrl || input.audioUrl !== shot.cameraPrompt) ? null : undefined,
        },
      })

      return updatedShot
    }),

  // ============================================
  // TTS 批量生成
  // ============================================

  // 一键生成所有镜头的TTS
  batchGenerateTTS: userProcedure
    .input(
      z.object({
        episodeId: z.string(),
        language: z.enum(['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de']).default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证所有权并获取episode及所有镜头
      const episode = await ctx.db.studioEpisode.findFirst({
        where: {
          id: input.episodeId,
          project: { userId },
        },
        include: {
          project: true,
          shots: {
            include: {
              characters: {
                include: {
                  character: true,
                },
              },
            },
            orderBy: { shotNumber: 'asc' },
          },
        },
      })

      if (!episode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      // 检查是否有镜头
      if (episode.shots.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '没有镜头可以生成TTS',
        })
      }

      // 收集所有需要生成的任务
      const tasksToCreate: Array<{
        shotId: string
        shotNumber: number
        characterName: string
        voiceId: string
        dialogue: string
      }> = []

      // 检查每个镜头的每个角色
      for (const shot of episode.shots) {
        for (const shotCharacter of shot.characters) {
          const dialogue = shotCharacter.dialogue?.trim()
          const voiceId = shotCharacter.character.voiceId

          // 跳过没有台词或没有voiceId的角色
          if (!dialogue) continue

          if (!voiceId) {
            // 如果有台词但没有voiceId，抛出错误
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `镜头 ${shot.shotNumber} 中的角色"${shotCharacter.character.name}"没有关联演员或演员没有Voice ID。请先为演员配置Voice ID。`,
            })
          }

          tasksToCreate.push({
            shotId: shot.id,
            shotNumber: shot.shotNumber,
            characterName: shotCharacter.character.name,
            voiceId,
            dialogue,
          })
        }
      }

      // 如果没有任何可生成的任务
      if (tasksToCreate.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '没有找到可以生成TTS的台词。请确保镜头中的角色有台词且已关联演员。',
        })
      }

      // 获取ElevenLabs TTS模型
      const ttsModel = await ctx.db.aIModel.findFirst({
        where: {
          slug: 'elevenlabs-tts-v3',
          isActive: true,
        },
        include: {
          provider: true,
        },
      })

      if (!ttsModel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ElevenLabs TTS 模型未配置。请在AI生成 > 供应商中配置。',
        })
      }

      // 创建并执行所有AI生成任务（带速率限制）
      const createdTasks = []
      const modelConfig = toModelConfig(ttsModel)

      // 速率限制：每秒1个请求，即1000ms延迟
      const RATE_LIMIT_DELAY_MS = 1000

      for (let i = 0; i < tasksToCreate.length; i++) {
        const task = tasksToCreate[i]!
        const parameters = {
          custom_voice_id: task.voiceId,
          language: input.language,
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        }

        const aiTask = await ctx.db.aIGenerationTask.create({
          data: {
            modelId: ttsModel.id,
            shotId: task.shotId,
            prompt: task.dialogue,
            parameters: JSON.stringify(parameters),
            status: 'PENDING',
            numberOfOutputs: 1,
          },
        })

        createdTasks.push({
          taskId: aiTask.id,
          shotNumber: task.shotNumber,
          characterName: task.characterName,
        })

        // 后台执行任务（带延迟，避免速率限制）
        // 第一个任务立即执行，后续任务延迟 index * RATE_LIMIT_DELAY_MS
        const delayMs = i * RATE_LIMIT_DELAY_MS
        void (async () => {
          // 等待指定的延迟时间
          if (delayMs > 0) {
            console.log(`[Studio TTS] Task ${aiTask.id} will start after ${delayMs}ms delay (position ${i + 1}/${tasksToCreate.length})`)
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }
          const startedAt = Date.now()
          try {
            // 更新状态为 PROCESSING
            await taskManager.updateTask(aiTask.id, {
              status: 'PROCESSING',
            })

            const adapter = createAdapter(modelConfig)

            console.log(`[Studio TTS] Processing task ${aiTask.id} for shot ${task.shotNumber} - ${task.characterName}`)

            const result = await adapter.dispatch({
              prompt: task.dialogue,
              inputImages: undefined,
              numberOfOutputs: 1,
              parameters,
            })

            console.log(`[Studio TTS] Task ${aiTask.id} result status: ${result.status}`)

            // 处理结果
            if (result.status === 'SUCCESS') {
              // 处理存储（可能上传到S3）
              const processedResults = await resultStorageService.processResults(
                result.results || [],
                {
                  uploadToS3: ttsModel.provider.uploadToS3,
                  s3PathPrefix: ttsModel.provider.s3PathPrefix || undefined,
                }
              )

              await taskManager.updateTask(aiTask.id, {
                status: 'SUCCESS',
                results: JSON.stringify(processedResults),
                completedAt: new Date(),
                responsePayload: JSON.stringify(result),
                durationMs: Date.now() - startedAt,
              })

              await taskManager.incrementModelUsage(ttsModel.id)
              console.log(`[Studio TTS] Task ${aiTask.id} completed successfully`)
            } else if (result.status === 'PROCESSING') {
              // 异步任务 - 启动轮询
              await taskManager.updateTask(aiTask.id, {
                status: 'PROCESSING',
                providerTaskId: result.providerTaskId || null,
                responsePayload: JSON.stringify(result),
                durationMs: Date.now() - startedAt,
              })

              if (result.providerTaskId) {
                void pollAsyncTask(
                  aiTask.id,
                  result.providerTaskId,
                  modelConfig,
                  ctx.db,
                  startedAt
                )
              }
              console.log(`[Studio TTS] Task ${aiTask.id} is async, polling started`)
            } else {
              // 错误
              await taskManager.updateTask(aiTask.id, {
                status: 'FAILED',
                errorMessage: result.message || 'Unknown error',
                responsePayload: JSON.stringify(result),
                durationMs: Date.now() - startedAt,
              })
              console.error(`[Studio TTS] Task ${aiTask.id} failed: ${result.message}`)
            }
          } catch (error) {
            console.error(`[Studio TTS] Error processing task ${aiTask.id}:`, error)
            await taskManager.updateTask(aiTask.id, {
              status: 'FAILED',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              responsePayload: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
              durationMs: Date.now() - startedAt,
            })
          }
        })()
      }

      // 计算预计完成时间
      const estimatedTimeSeconds = Math.ceil((createdTasks.length - 1) * (RATE_LIMIT_DELAY_MS / 1000))
      const timeMessage = estimatedTimeSeconds > 0
        ? `，预计需要约 ${estimatedTimeSeconds} 秒（每秒处理1个任务）`
        : ''

      return {
        success: true,
        tasksCreated: createdTasks.length,
        tasks: createdTasks,
        message: `成功创建 ${createdTasks.length} 个TTS生成任务，正在后台处理中${timeMessage}。`,
      }
    }),

  // ============================================
  // 音频扩展功能
  // ============================================

  // 批量扩展音频
  batchExtendAudio: userProcedure
    .input(
      z.object({
        episodeId: z.string(),
        prefixDuration: z.number().default(2),
        suffixDuration: z.number().default(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 验证所有权并获取episode及所有镜头（包含AI生成任务）
      const episode = await ctx.db.studioEpisode.findFirst({
        where: {
          id: input.episodeId,
          project: { userId },
        },
        include: {
          shots: {
            orderBy: { shotNumber: 'asc' },
            include: {
              generationTasks: {
                where: {
                  status: 'SUCCESS',
                  model: {
                    outputType: 'AUDIO',
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 1,
              },
            },
          },
        },
      })

      if (!episode) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '集不存在',
        })
      }

      // 筛选有音频且未扩展的镜头
      const shotsToExtend = episode.shots.filter(shot =>
        shot.generationTasks.length > 0 &&  // 有成功的音频生成任务
        !shot.extendedAudioUrl  // 没有扩展音频
      )

      if (shotsToExtend.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '没有需要扩展的音频文件。所有有音频的镜头都已扩展或没有音频文件。',
        })
      }

      const extensionResults = []
      let successCount = 0

      for (const shot of shotsToExtend) {
        try {
          // 从最新的成功任务中获取音频URL
          const latestTask = shot.generationTasks[0]
          if (!latestTask?.results) {
            extensionResults.push({
              shotId: shot.id,
              shotNumber: shot.shotNumber,
              success: false,
              error: '未找到音频结果',
            })
            continue
          }

          const results = JSON.parse(latestTask.results) as Array<{ type: string; url: string }>
          const audioResult = results.find(r => r.type === 'audio')

          if (!audioResult?.url) {
            extensionResults.push({
              shotId: shot.id,
              shotNumber: shot.shotNumber,
              success: false,
              error: '音频结果中未找到URL',
            })
            continue
          }

          const result = await audioExtenderService.extendAudio({
            inputUrl: audioResult.url,
            prefixDuration: input.prefixDuration,
            suffixDuration: input.suffixDuration,
          })

          if (result.success && result.outputUrl) {
            // 更新镜头的扩展音频URL，同时将扩展后的音频设置为主音频
            await ctx.db.studioShot.update({
              where: { id: shot.id },
              data: {
                extendedAudioUrl: result.outputUrl,
                cameraPrompt: result.outputUrl, // 将扩展后的音频设为主音频，自动显示在"选择音频"位置
              },
            })

            extensionResults.push({
              shotId: shot.id,
              shotNumber: shot.shotNumber,
              success: true,
              originalUrl: audioResult.url,
              extendedUrl: result.outputUrl,
            })
            successCount++
          } else {
            extensionResults.push({
              shotId: shot.id,
              shotNumber: shot.shotNumber,
              success: false,
              originalUrl: audioResult.url,
              error: result.error,
            })
          }
        } catch (error) {
          extensionResults.push({
            shotId: shot.id,
            shotNumber: shot.shotNumber,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return {
        success: successCount > 0,
        totalShots: shotsToExtend.length,
        successCount,
        results: extensionResults,
        message: `音频扩展完成：成功 ${successCount}/${shotsToExtend.length} 个镜头。每个镜头的音频前后各增加了 ${input.prefixDuration} 和 ${input.suffixDuration} 秒。`,
      }
    }),

  // 清理扩展音频
  cleanExtendedAudio: userProcedure
    .input(z.object({ episodeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId!

      // 获取所有扩展音频URL
      const shots = await ctx.db.studioShot.findMany({
        where: {
          episode: {
            id: input.episodeId,
            project: { userId },
          },
          extendedAudioUrl: {
            not: null,
          },
        },
        select: {
          id: true,
          shotNumber: true,
          extendedAudioUrl: true,
        },
      })

      if (shots.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          message: '没有找到扩展音频文件。',
        }
      }

      // 提取所有扩展音频URL
      const extendedAudioUrls = shots
        .map(shot => shot.extendedAudioUrl)
        .filter((url): url is string => !!url)

      // 删除文件
      const deletedCount = await audioExtenderService.deleteMultipleExtendedAudio(extendedAudioUrls)

      // 清理数据库中的extendedAudioUrl字段
      await ctx.db.studioShot.updateMany({
        where: {
          episodeId: input.episodeId,
          extendedAudioUrl: {
            not: null,
          },
        },
        data: {
          extendedAudioUrl: null,
        },
      })

      return {
        success: true,
        deletedCount,
        message: `已清理 ${deletedCount} 个扩展音频文件。`,
      }
    }),
})
