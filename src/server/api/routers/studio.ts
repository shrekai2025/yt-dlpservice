/**
 * Studio tRPC Router
 *
 * AI 短片制作工作流系统的 tRPC 接口
 */

import { z } from 'zod'
import { createTRPCRouter, userProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'

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

      // 如果提供了actorId，验证演员存在
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
      }

      // 更新关联
      const updated = await ctx.db.studioCharacter.update({
        where: { id: input.characterId },
        data: {
          sourceActorId: input.actorId,
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

      // 更新镜头音频
      const updatedShot = await ctx.db.studioShot.update({
        where: { id: input.shotId },
        data: {
          cameraPrompt: input.audioUrl,
        },
      })

      return updatedShot
    }),
})
