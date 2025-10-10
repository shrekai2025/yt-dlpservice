/**
 * 测试 GenAPIHub 数据库模型
 *
 * 验证新创建的 ApiProvider, ApiKey, GenerationRequest 模型是否正常工作
 */

import { db } from '~/server/db'
import crypto from 'crypto'

async function testGenAPIHubModels() {
  console.log('🧪 开始测试 GenAPIHub 数据库模型...\n')

  try {
    // ============================================
    // 测试 1: 创建 API Provider
    // ============================================
    console.log('📝 测试 1: 创建 API Provider')

    const provider = await db.apiProvider.create({
      data: {
        name: 'FLUX Pro (测试)',
        modelIdentifier: 'flux-kontext-pro-test',
        adapterName: 'FluxAdapter',
        type: 'image',
        provider: 'BFL',
        apiEndpoint: 'https://api.bfl.ml/v1/flux-pro-1.1',
        apiFlavor: 'custom',
        encryptedAuthKey: 'test-key-12345',
        isActive: true,
        uploadToS3: false,
        s3PathPrefix: 'flux'
      }
    })

    console.log(`✅ Provider 创建成功: ${provider.id}`)
    console.log(`   - 名称: ${provider.name}`)
    console.log(`   - 模型标识: ${provider.modelIdentifier}`)
    console.log(`   - 类型: ${provider.type}`)
    console.log(`   - 适配器: ${provider.adapterName}\n`)

    // ============================================
    // 测试 2: 创建 API Key
    // ============================================
    console.log('🔑 测试 2: 创建 API Key')

    const rawApiKey = 'test_api_key_' + crypto.randomBytes(16).toString('hex')
    const keyPrefix = rawApiKey.substring(0, 6)
    const hashedKey = crypto.createHash('sha256').update(rawApiKey).digest('hex')

    const apiKey = await db.apiKey.create({
      data: {
        name: '测试密钥',
        keyPrefix,
        hashedKey,
        isActive: true
      }
    })

    console.log(`✅ API Key 创建成功: ${apiKey.id}`)
    console.log(`   - 名称: ${apiKey.name}`)
    console.log(`   - 前缀: ${apiKey.keyPrefix}`)
    console.log(`   - 原始密钥: ${rawApiKey}`)
    console.log(`   - 哈希: ${hashedKey.substring(0, 16)}...\n`)

    // ============================================
    // 测试 3: 创建 Generation Request
    // ============================================
    console.log('📦 测试 3: 创建 Generation Request')

    const request = await db.generationRequest.create({
      data: {
        providerId: provider.id,
        modelIdentifier: provider.modelIdentifier,
        status: 'PENDING',
        prompt: '一只可爱的小猫在草地上玩耍',
        inputImages: JSON.stringify([]),
        numberOfOutputs: 1,
        parameters: JSON.stringify({
          size_or_ratio: '1024x1024',
          style: 'realistic'
        })
      }
    })

    console.log(`✅ Generation Request 创建成功: ${request.id}`)
    console.log(`   - Provider: ${request.providerId}`)
    console.log(`   - 状态: ${request.status}`)
    console.log(`   - 提示词: ${request.prompt}`)
    console.log(`   - 创建时间: ${request.createdAt.toISOString()}\n`)

    // ============================================
    // 测试 4: 查询和关联
    // ============================================
    console.log('🔍 测试 4: 查询和关联')

    const requestWithProvider = await db.generationRequest.findUnique({
      where: { id: request.id },
      include: { provider: true }
    })

    console.log(`✅ 关联查询成功:`)
    console.log(`   - Request ID: ${requestWithProvider?.id}`)
    console.log(`   - Provider 名称: ${requestWithProvider?.provider.name}`)
    console.log(`   - Provider 类型: ${requestWithProvider?.provider.type}\n`)

    // ============================================
    // 测试 5: 更新状态
    // ============================================
    console.log('🔄 测试 5: 更新 Request 状态')

    const updatedRequest = await db.generationRequest.update({
      where: { id: request.id },
      data: {
        status: 'SUCCESS',
        results: JSON.stringify([{
          type: 'image',
          url: 'https://example.com/generated-image.png',
          metadata: {}
        }]),
        completedAt: new Date()
      }
    })

    console.log(`✅ 状态更新成功:`)
    console.log(`   - 新状态: ${updatedRequest.status}`)
    console.log(`   - 完成时间: ${updatedRequest.completedAt?.toISOString()}\n`)

    // ============================================
    // 测试 6: 列表查询
    // ============================================
    console.log('📋 测试 6: 列表查询')

    const activeProviders = await db.apiProvider.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ 找到 ${activeProviders.length} 个激活的 Provider`)
    activeProviders.forEach(p => {
      console.log(`   - ${p.name} (${p.type})`)
    })
    console.log()

    const recentRequests = await db.generationRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { provider: true }
    })

    console.log(`✅ 找到 ${recentRequests.length} 条最近的请求`)
    console.log()

    // ============================================
    // 测试 7: 清理测试数据
    // ============================================
    console.log('🧹 测试 7: 清理测试数据')

    await db.generationRequest.delete({ where: { id: request.id } })
    console.log(`✅ 删除 Generation Request: ${request.id}`)

    await db.apiKey.delete({ where: { id: apiKey.id } })
    console.log(`✅ 删除 API Key: ${apiKey.id}`)

    await db.apiProvider.delete({ where: { id: provider.id } })
    console.log(`✅ 删除 API Provider: ${provider.id}`)

    console.log()
    console.log('🎉 所有测试通过!')
    console.log('✨ GenAPIHub 数据库模型工作正常\n')

  } catch (error) {
    console.error('❌ 测试失败:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

// 运行测试
testGenAPIHubModels()
  .then(() => {
    console.log('✅ 测试脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 测试脚本失败:', error)
    process.exit(1)
  })
