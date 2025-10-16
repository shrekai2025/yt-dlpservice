/**
 * Test Script - Kie Seedream V4 Adapter
 *
 * 测试 Seedream V4 文生图模型
 */

import { db } from '../src/server/db'
import { createAdapter } from '../src/lib/ai-generation/adapters/adapter-factory'
import type { ModelConfig } from '../src/lib/ai-generation/adapters/types'

async function main() {
  console.log('🧪 Testing Kie Seedream V4 Adapter...\n')

  try {
    // 1. 从数据库获取模型配置
    console.log('📊 Fetching model from database...')
    const model = await db.aIModel.findUnique({
      where: { slug: 'kie-seedream-v4' },
      include: { provider: true },
    })

    if (!model) {
      throw new Error('Model not found. Please run seed script first.')
    }

    console.log(`✓ Found model: ${model.name}`)
    console.log(`  Provider: ${model.provider.name}`)
    console.log(`  Adapter: ${model.adapterName}`)
    console.log(`  Output Type: ${model.outputType}\n`)

    // 2. 构建适配器配置
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
      outputType: model.outputType,
      adapterName: model.adapterName,
    }

    // 3. 创建适配器实例
    console.log('🔧 Creating adapter instance...')
    const adapter = createAdapter(config)
    console.log(`✓ Adapter created: ${adapter.constructor.name}\n`)

    // 4. 测试基本文生图（square_hd, 1K）
    console.log('🎨 Test 1: Basic text-to-image (square_hd, 1K)...')
    const request1 = {
      prompt: 'A beautiful sunset over mountains with vibrant colors',
      numberOfOutputs: 1,
      parameters: {
        image_size: 'square_hd',
        image_resolution: '1K',
      },
    }

    const response1 = await adapter.dispatch(request1)
    console.log('Response:', JSON.stringify(response1, null, 2))

    if (response1.status === 'PROCESSING' && response1.providerTaskId) {
      console.log(`\n⏳ Task created, polling for results...`)
      
      let attempts = 0
      const maxAttempts = 30
      
      while (attempts < maxAttempts) {
        attempts++
        console.log(`  Attempt ${attempts}/${maxAttempts}...`)
        
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const statusResponse = await adapter.checkTaskStatus!(response1.providerTaskId)
        
        if (statusResponse.status === 'SUCCESS') {
          console.log('\n✅ Test 1 SUCCESS!')
          console.log('Results:', JSON.stringify(statusResponse.results, null, 2))
          break
        } else if (statusResponse.status === 'ERROR') {
          console.log('\n❌ Test 1 FAILED!')
          console.log('Error:', statusResponse.message)
          break
        } else {
          console.log(`  Status: ${statusResponse.status}, Progress: ${statusResponse.progress || 'N/A'}`)
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('\n⏱️  Test 1 timed out')
      }
    }

    // 5. 测试不同尺寸和分辨率（landscape_16_9, 2K）
    console.log('\n\n🎨 Test 2: Landscape 16:9, 2K resolution...')
    const request2 = {
      prompt: 'A futuristic cityscape at night with neon lights',
      numberOfOutputs: 1,
      parameters: {
        image_size: 'landscape_16_9',
        image_resolution: '2K',
        seed: 42,
      },
    }

    const response2 = await adapter.dispatch(request2)
    console.log('Response:', JSON.stringify(response2, null, 2))

    if (response2.status === 'PROCESSING' && response2.providerTaskId) {
      console.log(`\n⏳ Task created, polling for results...`)
      
      let attempts = 0
      const maxAttempts = 30
      
      while (attempts < maxAttempts) {
        attempts++
        console.log(`  Attempt ${attempts}/${maxAttempts}...`)
        
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const statusResponse = await adapter.checkTaskStatus!(response2.providerTaskId)
        
        if (statusResponse.status === 'SUCCESS') {
          console.log('\n✅ Test 2 SUCCESS!')
          console.log('Results:', JSON.stringify(statusResponse.results, null, 2))
          break
        } else if (statusResponse.status === 'ERROR') {
          console.log('\n❌ Test 2 FAILED!')
          console.log('Error:', statusResponse.message)
          break
        } else {
          console.log(`  Status: ${statusResponse.status}, Progress: ${statusResponse.progress || 'N/A'}`)
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('\n⏱️  Test 2 timed out')
      }
    }

    // 6. 测试多图生成（max_images: 2）
    console.log('\n\n🎨 Test 3: Multiple images (max_images: 2)...')
    const request3 = {
      prompt: 'A cute cat playing with yarn',
      numberOfOutputs: 2,
      parameters: {
        image_size: 'square',
        image_resolution: '1K',
        max_images: 2,
      },
    }

    const response3 = await adapter.dispatch(request3)
    console.log('Response:', JSON.stringify(response3, null, 2))

    if (response3.status === 'PROCESSING' && response3.providerTaskId) {
      console.log(`\n⏳ Task created, polling for results...`)
      
      let attempts = 0
      const maxAttempts = 30
      
      while (attempts < maxAttempts) {
        attempts++
        console.log(`  Attempt ${attempts}/${maxAttempts}...`)
        
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        const statusResponse = await adapter.checkTaskStatus!(response3.providerTaskId)
        
        if (statusResponse.status === 'SUCCESS') {
          console.log('\n✅ Test 3 SUCCESS!')
          console.log('Results:', JSON.stringify(statusResponse.results, null, 2))
          console.log(`  Generated ${statusResponse.results?.length || 0} images`)
          break
        } else if (statusResponse.status === 'ERROR') {
          console.log('\n❌ Test 3 FAILED!')
          console.log('Error:', statusResponse.message)
          break
        } else {
          console.log(`  Status: ${statusResponse.status}, Progress: ${statusResponse.progress || 'N/A'}`)
        }
      }
      
      if (attempts >= maxAttempts) {
        console.log('\n⏱️  Test 3 timed out')
      }
    }

    console.log('\n\n✨ All tests completed!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()

