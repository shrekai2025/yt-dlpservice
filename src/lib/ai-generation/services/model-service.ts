/**
 * Model Service
 *
 * 管理供应商和模型的查询
 */

import { db } from '~/server/db'
import type { AIOutputType } from '@prisma/client'

export interface ListProvidersFilter {
  isActive?: boolean
  platformId?: string
}

export interface ListModelsFilter {
  providerId?: string
  outputType?: AIOutputType
  isActive?: boolean
}

export class ModelService {
  /**
   * 获取所有平台
   */
  async listPlatforms() {
    const platforms = await db.aIPlatform.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    return platforms
  }

  /**
   * 获取平台详情
   */
  async getPlatform(platformId: string) {
    const platform = await db.aIPlatform.findUnique({
      where: {
        id: platformId,
      },
      include: {
        providers: true,
      },
    })

    return platform
  }

  /**
   * 列出供应商
   */
  async listProviders(filter: ListProvidersFilter = {}) {
    const where: {
      isActive?: boolean
      platformId?: string
    } = {}

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive
    }

    if (filter.platformId) {
      where.platformId = filter.platformId
    }

    const providers = await db.aIProvider.findMany({
      where,
      include: {
        platform: true,
        models: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    })

    return providers
  }

  /**
   * 获取供应商详情
   */
  async getProvider(providerId: string) {
    const provider = await db.aIProvider.findUnique({
      where: {
        id: providerId,
      },
      include: {
        platform: true,
        models: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    })

    return provider
  }

  /**
   * 根据 slug 获取供应商
   */
  async getProviderBySlug(slug: string) {
    const provider = await db.aIProvider.findUnique({
      where: {
        slug,
      },
      include: {
        platform: true,
        models: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    })

    return provider
  }

  /**
   * 列出模型
   */
  async listModels(filter: ListModelsFilter = {}) {
    const where: {
      providerId?: string
      outputType?: AIOutputType
      isActive?: boolean
    } = {}

    if (filter.providerId) {
      where.providerId = filter.providerId
    }

    if (filter.outputType) {
      where.outputType = filter.outputType
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive
    }

    const models = await db.aIModel.findMany({
      where,
      include: {
        provider: {
          include: {
            platform: true,
          },
        },
      },
      orderBy: [
        {
          provider: {
            sortOrder: 'asc',
          },
        },
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    })

    return models
  }

  /**
   * 获取模型详情
   */
  async getModel(modelId: string) {
    const model = await db.aIModel.findUnique({
      where: {
        id: modelId,
      },
      include: {
        provider: {
          include: {
            platform: true,
          },
        },
      },
    })

    return model
  }

  /**
   * 根据 slug 获取模型
   */
  async getModelBySlug(slug: string) {
    const model = await db.aIModel.findUnique({
      where: {
        slug,
      },
      include: {
        provider: {
          include: {
            platform: true,
          },
        },
      },
    })

    return model
  }

  /**
   * 更新供应商 API Key
   */
  async updateProviderApiKey(providerId: string, apiKey: string) {
    const provider = await db.aIProvider.update({
      where: {
        id: providerId,
      },
      data: {
        apiKey,
      },
    })

    return provider
  }

  /**
   * 更新供应商双密钥配置（如火山引擎的AccessKeyID + SecretAccessKey）
   */
  async updateProviderDualKeys(providerId: string, apiKeyId: string, apiKeySecret: string) {
    const provider = await db.aIProvider.update({
      where: {
        id: providerId,
      },
      data: {
        apiKeyId,
        apiKeySecret,
      },
    })

    return provider
  }

  /**
   * 更新模型状态
   */
  async updateModelStatus(modelId: string, isActive: boolean) {
    const model = await db.aIModel.update({
      where: {
        id: modelId,
      },
      data: {
        isActive,
      },
    })

    return model
  }
}

export const modelService = new ModelService()
