/**
 * ElevenLabs 集成调试脚本
 */

import { PrismaClient } from '@prisma/client'
import { createAdapter } from '../src/lib/ai-generation/adapters/adapter-factory'
import { getModelParameters } from '../src/lib/ai-generation/config/model-parameters'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 ElevenLabs TTS 集成调试\n')

  // 1. 检查数据库
  console.log('📊 检查数据库记录...')
  const model = await prisma.aIModel.findUnique({
    where: { slug: 'elevenlabs-tts-v3' },
    include: {
      provider: {
        include: { platform: true },
      },
    },
  })

  if (!model) {
    console.error('❌ 模型未找到！请运行: npx tsx prisma/seed-elevenlabs.ts')
    process.exit(1)
  }

  console.log('✓ Platform:', model.provider.platform?.name)
  console.log('✓ Provider:', model.provider.name)
  console.log('✓ Model:', model.name)
  console.log('✓ Adapter:', model.adapterName)
  console.log('✓ Output Type:', model.outputType)
  console.log()

  // 2. 检查参数配置
  console.log('⚙️  检查参数配置...')
  const params = getModelParameters('elevenlabs-tts-v3')
  console.log('✓ 参数数量:', params.length)
  params.forEach((p) => {
    console.log(`  - ${p.key} (${p.type}): ${p.label}`)
  })
  console.log()

  // 3. 创建适配器实例
  console.log('🔧 创建适配器实例...')
  const config = {
    id: model.id,
    slug: model.slug,
    name: model.name,
    provider: {
      id: model.provider.id,
      slug: model.provider.slug,
      name: model.provider.name,
      apiKey: model.provider.apiKey || undefined,
      apiEndpoint: model.provider.apiEndpoint || undefined,
    },
    outputType: model.outputType as 'IMAGE' | 'VIDEO' | 'AUDIO',
    adapterName: model.adapterName,
  }

  const adapter = createAdapter(config)
  console.log('✓ 适配器类型:', adapter.constructor.name)
  console.log('✓ dispatch 方法:', typeof adapter.dispatch === 'function' ? '存在' : '不存在')
  console.log()

  // 4. 检查环境变量
  console.log('🔑 检查 API Key 配置...')
  const envKey = process.env.AI_PROVIDER_ELEVENLABS_TTS_API_KEY
  const dbKey = model.provider.apiKey

  if (dbKey) {
    console.log('✓ 数据库 API Key: 已配置 (优先使用)')
  } else if (envKey) {
    console.log('✓ 环境变量 API Key: 已配置')
  } else {
    console.log('⚠️  API Key: 未配置')
    console.log('   请在 .env.local 中设置:')
    console.log('   AI_PROVIDER_ELEVENLABS_TTS_API_KEY="sk_your_api_key"')
  }
  console.log()

  // 5. 检查输出目录
  console.log('📁 检查输出目录...')
  const outputDir = './public/ai-generated/audio'
  const fs = await import('fs/promises')
  try {
    await fs.access(outputDir)
    console.log('✓ 输出目录存在:', outputDir)
  } catch {
    console.log('⚠️  输出目录不存在，将在生成时自动创建:', outputDir)
  }
  console.log()

  // 总结
  console.log('✅ 集成调试完成！')
  console.log()
  console.log('📝 下一步:')
  console.log('1. 配置 API Key (如果还没有)')
  console.log('2. 运行测试: npx tsx scripts/test-elevenlabs-tts.ts')
  console.log('3. 或在 /admin/ai-generation 页面使用 TTS 功能')
}

main()
  .catch((e) => {
    console.error('❌ 调试失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
