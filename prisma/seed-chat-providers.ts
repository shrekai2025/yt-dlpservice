/**
 * 初始化对话功能的LLM供应商
 * 为Gemini、DeepSeek、Grok创建供应商和端点配置
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 初始化对话功能的LLM供应商...\n')

  // ==================== 1. Gemini ====================
  console.log('1️⃣ 创建 Gemini 供应商...')
  const gemini = await prisma.lLMProvider.upsert({
    where: { slug: 'gemini' },
    update: {
      name: 'Google Gemini',
      description: '支持联网搜索的 Google Gemini AI',
      isActive: true,
      sortOrder: 1,
    },
    create: {
      name: 'Google Gemini',
      slug: 'gemini',
      description: '支持联网搜索的 Google Gemini AI',
      apiKey: null, // 需要在后台配置或通过环境变量
      isActive: true,
      sortOrder: 1,
    },
  })
  console.log('   ✅ Gemini 供应商已创建')

  // Gemini 端点
  const geminiEndpoint = await prisma.lLMEndpoint.upsert({
    where: {
      providerId_name: {
        providerId: gemini.id,
        name: 'Google Gemini API',
      },
    },
    update: {
      url: 'https://generativelanguage.googleapis.com/v1beta',
      description: 'Google Gemini 官方 API',
      isActive: true,
      sortOrder: 1,
    },
    create: {
      providerId: gemini.id,
      name: 'Google Gemini API',
      url: 'https://generativelanguage.googleapis.com/v1beta',
      description: 'Google Gemini 官方 API',
      isActive: true,
      sortOrder: 1,
    },
  })

  // Gemini 模型
  const geminiModels = [
    { name: 'Gemini 2.5 Pro', slug: 'gemini-2.5-pro', sortOrder: 1 },
    { name: 'Gemini 2.5 Flash', slug: 'gemini-2.5-flash', sortOrder: 2 },
    { name: 'Gemini 2.5 Flash Lite', slug: 'gemini-2.5-flash-lite', sortOrder: 3 },
    { name: 'Gemini 2.0 Flash', slug: 'gemini-2.0-flash', sortOrder: 4 },
    { name: 'Gemini 1.5 Pro', slug: 'gemini-1.5-pro', sortOrder: 5 },
    { name: 'Gemini 1.5 Flash', slug: 'gemini-1.5-flash', sortOrder: 6 },
  ]

  for (const model of geminiModels) {
    await prisma.lLMModel.upsert({
      where: {
        endpointId_slug: {
          endpointId: geminiEndpoint.id,
          slug: model.slug,
        },
      },
      update: {
        name: model.name,
        description: `Google ${model.name} 模型`,
        isActive: true,
        sortOrder: model.sortOrder,
      },
      create: {
        endpointId: geminiEndpoint.id,
        name: model.name,
        slug: model.slug,
        description: `Google ${model.name} 模型`,
        isActive: true,
        sortOrder: model.sortOrder,
      },
    })
  }
  console.log(`   ✅ 已创建 ${geminiModels.length} 个 Gemini 模型\n`)

  // ==================== 2. DeepSeek ====================
  console.log('2️⃣ 创建 DeepSeek 供应商...')
  const deepseek = await prisma.lLMProvider.upsert({
    where: { slug: 'deepseek' },
    update: {
      name: 'DeepSeek',
      description: 'DeepSeek AI 大语言模型',
      isActive: true,
      sortOrder: 2,
    },
    create: {
      name: 'DeepSeek',
      slug: 'deepseek',
      description: 'DeepSeek AI 大语言模型',
      apiKey: null,
      isActive: true,
      sortOrder: 2,
    },
  })
  console.log('   ✅ DeepSeek 供应商已创建')

  // DeepSeek 端点
  const deepseekEndpoint = await prisma.lLMEndpoint.upsert({
    where: {
      providerId_name: {
        providerId: deepseek.id,
        name: 'DeepSeek API',
      },
    },
    update: {
      url: 'https://api.deepseek.com/v1',
      description: 'DeepSeek 官方 API (OpenAI兼容)',
      isActive: true,
      sortOrder: 1,
    },
    create: {
      providerId: deepseek.id,
      name: 'DeepSeek API',
      url: 'https://api.deepseek.com/v1',
      description: 'DeepSeek 官方 API (OpenAI兼容)',
      isActive: true,
      sortOrder: 1,
    },
  })

  // DeepSeek 模型
  const deepseekModels = [
    { name: 'DeepSeek Chat', slug: 'deepseek-chat', sortOrder: 1 },
    { name: 'DeepSeek Coder', slug: 'deepseek-coder', sortOrder: 2 },
  ]

  for (const model of deepseekModels) {
    await prisma.lLMModel.upsert({
      where: {
        endpointId_slug: {
          endpointId: deepseekEndpoint.id,
          slug: model.slug,
        },
      },
      update: {
        name: model.name,
        description: `DeepSeek ${model.name} 模型`,
        isActive: true,
        sortOrder: model.sortOrder,
      },
      create: {
        endpointId: deepseekEndpoint.id,
        name: model.name,
        slug: model.slug,
        description: `DeepSeek ${model.name} 模型`,
        isActive: true,
        sortOrder: model.sortOrder,
      },
    })
  }
  console.log(`   ✅ 已创建 ${deepseekModels.length} 个 DeepSeek 模型\n`)

  // ==================== 3. Grok ====================
  console.log('3️⃣ 创建 Grok 供应商...')
  const grok = await prisma.lLMProvider.upsert({
    where: { slug: 'grok' },
    update: {
      name: 'Grok (xAI)',
      description: 'xAI Grok 大语言模型 (需要通过代理访问)',
      isActive: true,
      sortOrder: 3,
    },
    create: {
      name: 'Grok (xAI)',
      slug: 'grok',
      description: 'xAI Grok 大语言模型 (需要通过代理访问)',
      apiKey: null,
      isActive: true,
      sortOrder: 3,
    },
  })
  console.log('   ✅ Grok 供应商已创建')

  // Grok 端点（需要配置baseURL）
  const grokEndpoint = await prisma.lLMEndpoint.upsert({
    where: {
      providerId_name: {
        providerId: grok.id,
        name: 'Grok API (Badger)',
      },
    },
    update: {
      url: 'https://api.example.com/v1', // 需要替换为实际的代理地址
      description: 'Grok API (通过 Badger 或其他代理)',
      isActive: true,
      sortOrder: 1,
    },
    create: {
      providerId: grok.id,
      name: 'Grok API (Badger)',
      url: 'https://api.example.com/v1', // 需要替换为实际的代理地址
      description: 'Grok API (通过 Badger 或其他代理)',
      isActive: true,
      sortOrder: 1,
    },
  })

  // Grok 模型
  const grokModels = [
    { name: 'Grok 4', slug: 'grok-4', sortOrder: 1 },
    { name: 'Grok 2 Latest', slug: 'grok-2-latest', sortOrder: 2 },
    { name: 'Grok 2 Mini', slug: 'grok-2-mini', sortOrder: 3 },
  ]

  for (const model of grokModels) {
    await prisma.lLMModel.upsert({
      where: {
        endpointId_slug: {
          endpointId: grokEndpoint.id,
          slug: model.slug,
        },
      },
      update: {
        name: model.name,
        description: `xAI ${model.name} 模型`,
        isActive: true,
        sortOrder: model.sortOrder,
      },
      create: {
        endpointId: grokEndpoint.id,
        name: model.name,
        slug: model.slug,
        description: `xAI ${model.name} 模型`,
        isActive: true,
        sortOrder: model.sortOrder,
      },
    })
  }
  console.log(`   ✅ 已创建 ${grokModels.length} 个 Grok 模型\n`)

  console.log('✨ 对话功能的LLM供应商初始化完成！\n')
  console.log('📝 下一步操作：')
  console.log('   1. 在 /admin/ai-generation/providers 页面配置 API Keys')
  console.log('   2. 或者设置环境变量：')
  console.log('      - LLM_PROVIDER_GEMINI_API_KEY=your_key')
  console.log('      - LLM_PROVIDER_DEEPSEEK_API_KEY=your_key')
  console.log('      - LLM_PROVIDER_GROK_API_KEY=your_key')
  console.log('      - LLM_PROVIDER_GROK_BASE_URL=your_proxy_url (Grok必需)')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
