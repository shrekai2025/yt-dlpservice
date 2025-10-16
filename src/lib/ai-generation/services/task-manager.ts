/**
 * Task Manager Service
 *
 * 管理 AI 生成任务的创建、查询、更新和删除
 */

import { db } from '~/server/db'
import type { AITaskStatus } from '@prisma/client'

export interface CreateTaskInput {
  modelId: string
  prompt: string
  inputImages?: string[]
  numberOfOutputs?: number
  parameters?: Record<string, unknown>
}

export interface UpdateTaskInput {
  status?: AITaskStatus
  progress?: number | null
  results?: string | null
  errorMessage?: string | null
  providerTaskId?: string | null
  responsePayload?: string | null
  durationMs?: number | null
  completedAt?: Date | null
}

export interface ListTasksFilter {
  status?: AITaskStatus
  modelId?: string
  limit?: number
  offset?: number
}

export class TaskManager {
  /**
   * 创建新任务
   */
  async createTask(input: CreateTaskInput) {
    const task = await db.aIGenerationTask.create({
      data: {
        modelId: input.modelId,
        prompt: input.prompt,
        inputImages: input.inputImages ? JSON.stringify(input.inputImages) : null,
        numberOfOutputs: input.numberOfOutputs || 1,
        parameters: input.parameters ? JSON.stringify(input.parameters) : null,
        status: 'PENDING',
      },
      include: {
        model: {
          include: {
            provider: true,
          },
        },
      },
    })

    return task
  }

  /**
   * 获取任务详情
   */
  async getTask(taskId: string) {
    const task = await db.aIGenerationTask.findUnique({
      where: {
        id: taskId,
        deletedAt: null,
      },
      include: {
        model: {
          include: {
            provider: {
              include: {
                platform: true,
              },
            },
          },
        },
      },
    })

    return task
  }

  /**
   * 更新任务状态
   */
  async updateTask(taskId: string, updates: UpdateTaskInput) {
    const task = await db.aIGenerationTask.update({
      where: {
        id: taskId,
      },
      data: updates,
    })

    return task
  }

  /**
   * 列出任务
   */
  async listTasks(filter: ListTasksFilter = {}) {
    const where: {
      status?: AITaskStatus
      modelId?: string
      deletedAt: null
    } = {
      deletedAt: null,
    }

    if (filter.status) {
      where.status = filter.status
    }

    if (filter.modelId) {
      where.modelId = filter.modelId
    }

    const limit = filter.limit || 20
    const offset = filter.offset || 0

    const [tasks, total] = await Promise.all([
      db.aIGenerationTask.findMany({
        where,
        include: {
          model: {
            include: {
              provider: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      db.aIGenerationTask.count({ where }),
    ])

    return {
      tasks,
      total,
      limit,
      offset,
      hasMore: offset + tasks.length < total,
    }
  }

  /**
   * 软删除任务
   */
  async deleteTask(taskId: string) {
    await db.aIGenerationTask.update({
      where: {
        id: taskId,
      },
      data: {
        deletedAt: new Date(),
      },
    })
  }

  /**
   * 增加模型使用次数
   */
  async incrementModelUsage(modelId: string) {
    await db.aIModel.update({
      where: {
        id: modelId,
      },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    })
  }
}

export const taskManager = new TaskManager()
