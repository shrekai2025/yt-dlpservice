/**
 * Prisma Seed Script - LLM Providers
 *
 * 初始化语言模型供应商数据
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding LLM Providers data...')

  // ==================== Tuzi 语言模型供应商 ====================
  console.log('Creating Tuzi LLM provider...')

  const tuziProvider = await prisma.lLMProvider.upsert({
    where: { slug: 'tuzi' },
    update: {},
    create: {
      name: 'Tuzi',
      slug: 'tuzi',
      description: '兔子API - 提供多种语言模型服务',
      isActive: true,
      sortOrder: 1,
    },
  })

  console.log('✓ Tuzi provider created')

  // ==================== 端点 ====================
  console.log('Creating endpoints...')

  const chatCompletionsEndpoint = await prisma.lLMEndpoint.upsert({
    where: {
      providerId_name: {
        providerId: tuziProvider.id,
        name: 'Chat Completions'
      }
    },
    update: {
      type: 'openai',
    },
    create: {
      providerId: tuziProvider.id,
      name: 'Chat Completions',
      url: 'https://api.tu-zi.com/v1/chat/completions',
      type: 'openai',
      description: 'OpenAI 兼容的聊天补全接口',
      isActive: true,
      sortOrder: 1,
    },
  })

  const messagesEndpoint = await prisma.lLMEndpoint.upsert({
    where: {
      providerId_name: {
        providerId: tuziProvider.id,
        name: 'Messages'
      }
    },
    update: {
      type: 'claude',
    },
    create: {
      providerId: tuziProvider.id,
      name: 'Messages',
      url: 'https://api.tu-zi.com/v1/messages',
      type: 'claude',
      description: 'Claude Messages API',
      isActive: true,
      sortOrder: 2,
    },
  })

  console.log('✓ Endpoints created')

  // ==================== 模型 ====================
  console.log('Creating models...')

  await prisma.lLMModel.upsert({
    where: {
      endpointId_slug: {
        endpointId: chatCompletionsEndpoint.id,
        slug: 'gemini-2-5-pro'
      }
    },
    update: {},
    create: {
      endpointId: chatCompletionsEndpoint.id,
      name: 'gemini-2.5-pro',
      slug: 'gemini-2-5-pro',
      description: 'Google Gemini 2.5 Pro 模型',
      isActive: true,
      sortOrder: 1,
    },
  })

  await prisma.lLMModel.upsert({
    where: {
      endpointId_slug: {
        endpointId: chatCompletionsEndpoint.id,
        slug: 'gpt-5'
      }
    },
    update: {},
    create: {
      endpointId: chatCompletionsEndpoint.id,
      name: 'gpt-5',
      slug: 'gpt-5',
      description: 'OpenAI GPT-5 模型',
      isActive: true,
      sortOrder: 2,
    },
  })

  // Messages endpoint 模型
  await prisma.lLMModel.upsert({
    where: {
      endpointId_slug: {
        endpointId: messagesEndpoint.id,
        slug: 'claude-sonnet-4-5-thinking-all'
      }
    },
    update: {},
    create: {
      endpointId: messagesEndpoint.id,
      name: 'claude-sonnet-4-5-thinking-all',
      slug: 'claude-sonnet-4-5-thinking-all',
      description: 'Claude Sonnet 4.5 Thinking All 模型',
      isActive: true,
      sortOrder: 1,
    },
  })

  console.log('✓ Models created')

  console.log('✨ LLM Providers seed completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding LLM providers:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
