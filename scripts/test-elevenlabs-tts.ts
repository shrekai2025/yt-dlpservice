/**
 * ElevenLabs TTS 集成测试脚本
 *
 * 使用方法：
 * 1. 确保已配置 API Key（.env.local 或数据库）
 * 2. 运行：npx tsx scripts/test-elevenlabs-tts.ts
 */

import { PrismaClient } from '@prisma/client'
import { createAdapter } from '../src/lib/ai-generation/adapters/adapter-factory'
import type { ModelConfig, GenerationRequest } from '../src/lib/ai-generation/adapters/types'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing ElevenLabs TTS Integration...\n')

  // 1. 查找模型
  console.log('📋 Step 1: Finding ElevenLabs TTS model...')
  const model = await prisma.aIModel.findUnique({
    where: { slug: 'elevenlabs-tts-v3' },
    include: {
      provider: {
        include: {
          platform: true,
        },
      },
    },
  })

  if (!model) {
    console.error('❌ Model not found! Please run: npx tsx prisma/seed-elevenlabs.ts')
    process.exit(1)
  }

  console.log('✓ Model found:', model.name)
  console.log('  Provider:', model.provider.name)
  console.log('  Adapter:', model.adapterName)
  console.log()

  // 2. 构建配置
  console.log('⚙️  Step 2: Building adapter configuration...')
  const config: ModelConfig = {
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

  console.log('✓ Configuration ready')
  console.log()

  // 3. 创建适配器
  console.log('🔧 Step 3: Creating adapter...')
  const adapter = createAdapter(config)
  console.log('✓ Adapter created:', adapter.constructor.name)
  console.log()

  // 4. 准备测试请求
  console.log('📝 Step 4: Preparing test request...')
  const testRequest: GenerationRequest = {
    prompt: 'Hello! This is a test of the ElevenLabs text-to-speech integration. Welcome to our AI generation platform!',
    parameters: {
      voice_id: 'UgBBYS2sOqTuMpoF3BR0', // Mark
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true,
    },
  }

  console.log('✓ Test text:', testRequest.prompt)
  console.log('  Character count:', testRequest.prompt.length)
  console.log('  Voice ID:', testRequest.parameters?.voice_id)
  console.log()

  // 5. 执行生成
  console.log('🚀 Step 5: Dispatching TTS request...')
  console.log('  (This may take a few seconds...)')
  console.log()

  const startTime = Date.now()
  const response = await adapter.dispatch(testRequest)
  const duration = Date.now() - startTime

  console.log('⏱️  Duration:', duration, 'ms')
  console.log()

  // 6. 检查结果
  console.log('📊 Step 6: Analyzing response...')
  console.log('  Status:', response.status)

  if (response.status === 'SUCCESS' && response.results) {
    console.log('✅ SUCCESS!')
    console.log()
    console.log('  Generated audio files:')
    for (const result of response.results) {
      console.log('    - Type:', result.type)
      console.log('      URL:', result.url)
      console.log('      Metadata:', JSON.stringify(result.metadata, null, 2))
    }
    console.log()
    console.log('✨ You can now access the audio file at:', response.results[0]?.url)
  } else if (response.status === 'ERROR') {
    console.error('❌ ERROR!')
    console.error('  Message:', response.message)
    if (response.error) {
      console.error('  Error code:', response.error.code)
      console.error('  Error message:', response.error.message)
      console.error('  Retryable:', response.error.isRetryable)
    }
  } else if (response.status === 'PROCESSING') {
    console.warn('⚠️  PROCESSING')
    console.warn('  Provider Task ID:', response.providerTaskId)
    console.warn('  Note: ElevenLabs TTS should be synchronous. This is unexpected.')
  }

  console.log()
  console.log('🏁 Test completed!')
}

main()
  .catch((error) => {
    console.error('❌ Test failed with error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
