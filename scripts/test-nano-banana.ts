/**
 * 测试 Nano Banana 模型
 *
 * 使用方法:
 * npx tsx scripts/test-nano-banana.ts
 */

import { PrismaClient } from '@prisma/client'
import { createAdapter } from '../src/lib/ai-generation/adapters/adapter-factory'
import type { GenerationRequest } from '../src/lib/ai-generation/adapters/types'

const prisma = new PrismaClient()

async function testNanoBanana() {
  console.log('🧪 测试 Nano Banana 模型\n')

  // 1. 获取模型配置
  console.log('📋 获取模型配置...')
  const model = await prisma.aIModel.findUnique({
    where: { slug: 'kie-nano-banana' },
    include: { provider: true },
  })

  if (!model) {
    console.error('❌ 未找到 kie-nano-banana 模型')
    process.exit(1)
  }

  console.log(`✓ 模型: ${model.name}`)
  console.log(`✓ 供应商: ${model.provider.name}`)
  console.log(`✓ 适配器: ${model.adapterName}\n`)

  // 2. 创建适配器
  console.log('🔧 创建适配器...')
  const adapter = createAdapter({
    modelSlug: model.slug,
    adapterName: model.adapterName,
    apiKey: model.provider.apiKey,
    apiEndpoint: model.provider.apiEndpoint,
  })
  console.log('✓ 适配器创建成功\n')

  // 3. 准备测试请求
  const request: GenerationRequest = {
    prompt:
      'A surreal painting of a giant banana floating in space, stars and galaxies in the background, vibrant colors, digital art',
    numberOfOutputs: 1,
    parameters: {
      output_format: 'png',
      image_size: '1:1',
    },
  }

  console.log('📤 发送生成请求...')
  console.log(`提示词: ${request.prompt}`)
  console.log(`参数: ${JSON.stringify(request.parameters, null, 2)}\n`)

  // 4. 调度任务
  const dispatchResponse = await adapter.dispatch(request)

  if (dispatchResponse.status === 'ERROR') {
    console.error('❌ 任务创建失败:', dispatchResponse.message)
    if (dispatchResponse.error) {
      console.error('错误详情:', dispatchResponse.error)
    }
    process.exit(1)
  }

  console.log('✓ 任务已创建')
  console.log(`✓ 任务ID: ${dispatchResponse.providerTaskId}\n`)

  // 5. 轮询任务状态
  const taskId = dispatchResponse.providerTaskId!
  let attempts = 0
  const maxAttempts = 60 // 最多等待 5 分钟

  console.log('⏳ 等待任务完成...\n')

  while (attempts < maxAttempts) {
    attempts++

    const statusResponse = await adapter.checkTaskStatus(taskId)

    console.log(
      `[${attempts}/${maxAttempts}] 状态: ${statusResponse.status}${
        statusResponse.message ? ` - ${statusResponse.message}` : ''
      }`
    )

    if (statusResponse.status === 'SUCCESS') {
      console.log('\n✅ 生成成功!')
      console.log('结果:')
      statusResponse.results?.forEach((result, index) => {
        console.log(`  ${index + 1}. [${result.type}] ${result.url}`)
      })
      break
    }

    if (statusResponse.status === 'ERROR') {
      console.error('\n❌ 生成失败:', statusResponse.message)
      if (statusResponse.error) {
        console.error('错误详情:', statusResponse.error)
      }
      process.exit(1)
    }

    // 等待 5 秒后再次检查
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  if (attempts >= maxAttempts) {
    console.error('\n❌ 任务超时')
    process.exit(1)
  }
}

// 运行测试
testNanoBanana()
  .catch((error) => {
    console.error('\n❌ 测试失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

