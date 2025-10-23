/**
 * 测试即梦AI适配器
 *
 * 使用方法（3种配置方式任选其一）:
 *
 * 方式1（推荐）: 分别设置环境变量
 * export AI_PROVIDER_JIMENG_ACCESS_KEY_ID="your_access_key_id"
 * export AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY="your_secret_access_key"
 *
 * 方式2: 使用冒号分隔的格式
 * export AI_PROVIDER_JIMENG_API_KEY="accessKeyId:secretAccessKey"
 *
 * 方式3: 使用JSON格式
 * export AI_PROVIDER_JIMENG_API_KEY='{"accessKeyId":"xxx","secretAccessKey":"xxx"}'
 *
 * 运行: npx tsx test-jimeng-adapter.ts
 */

import { JimengTextToImageAdapter } from './src/lib/ai-generation/adapters/jimeng/jimeng-text-to-image-adapter'
import type { ModelConfig } from './src/lib/ai-generation/adapters/types'

async function testJimengAdapter() {
  console.log('=== 测试即梦AI适配器 ===\n')

  // 检查凭证配置
  const accessKeyId = process.env.AI_PROVIDER_JIMENG_ACCESS_KEY_ID
  const secretAccessKey = process.env.AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY
  const apiKey = process.env.AI_PROVIDER_JIMENG_API_KEY

  if (!accessKeyId && !secretAccessKey && !apiKey) {
    console.error('❌ 错误: 未设置火山引擎凭证')
    console.log('\n请选择以下任一方式配置：')
    console.log('\n方式1（推荐）: 分别设置环境变量')
    console.log('  export AI_PROVIDER_JIMENG_ACCESS_KEY_ID="your_access_key_id"')
    console.log('  export AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY="your_secret_access_key"')
    console.log('\n方式2: 使用冒号分隔的格式')
    console.log('  export AI_PROVIDER_JIMENG_API_KEY="accessKeyId:secretAccessKey"')
    console.log('\n方式3: 使用JSON格式')
    console.log('  export AI_PROVIDER_JIMENG_API_KEY=\'{"accessKeyId":"xxx","secretAccessKey":"xxx"}\'')
    process.exit(1)
  }

  if (accessKeyId && secretAccessKey) {
    console.log('✓ 凭证配置方式: 环境变量（分别配置）')
    console.log('  AI_PROVIDER_JIMENG_ACCESS_KEY_ID: ' + accessKeyId.substring(0, 8) + '...')
    console.log('  AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY: ' + secretAccessKey.substring(0, 8) + '...')
  } else if (apiKey) {
    if (apiKey.startsWith('{')) {
      console.log('✓ 凭证配置方式: 环境变量（JSON格式）')
    } else {
      console.log('✓ 凭证配置方式: 环境变量（冒号分隔格式）')
    }
    console.log('  AI_PROVIDER_JIMENG_API_KEY: ' + apiKey.substring(0, 20) + '...')
  }

  // 创建模型配置
  const config: ModelConfig = {
    id: 'jimeng_text_to_image_v21',
    slug: 'jimeng-text-to-image-v21',
    name: '即梦AI - 文生图2.1',
    provider: {
      id: 'jimeng_ai_provider_001',
      slug: 'jimeng',
      name: '即梦AI (火山引擎)',
      apiKey: apiKey, // 可以是undefined，适配器会自动从环境变量读取
      apiEndpoint: 'https://visual.volcengineapi.com',
    },
    outputType: 'IMAGE',
    adapterName: 'JimengTextToImageAdapter',
  }

  console.log('\n--- 配置信息 ---')
  console.log('Provider:', config.provider.name)
  console.log('Model:', config.name)
  console.log('Endpoint:', config.provider.apiEndpoint)

  // 创建适配器实例
  const adapter = new JimengTextToImageAdapter(config)
  console.log('\n✓ 适配器实例已创建')

  // 测试生成请求
  console.log('\n--- 测试请求 ---')
  const testPrompt = '一只可爱的小猫在草地上玩耍'
  console.log('Prompt:', testPrompt)
  console.log('参数: 512x512, 开启超分, 开启提示词扩写')

  try {
    console.log('\n⏳ 正在发送生成请求...')

    const result = await adapter.dispatch({
      prompt: testPrompt,
      numberOfOutputs: 1,
      parameters: {
        width: 512,
        height: 512,
        use_sr: true,
        use_pre_llm: true,
        seed: -1,
        add_logo: false,
      },
    })

    console.log('\n--- 生成结果 ---')
    console.log('状态:', result.status)
    console.log('消息:', result.message || '无')

    if (result.status === 'SUCCESS') {
      console.log('\n✅ 生成成功!')
      console.log('图片数量:', result.results?.length || 0)

      if (result.results && result.results.length > 0) {
        result.results.forEach((r, i) => {
          console.log(`\n图片 ${i + 1}:`)
          console.log('  类型:', r.type)
          console.log('  URL:', r.url.substring(0, 100) + '...')
          if (r.metadata) {
            console.log('  元数据:')
            if (r.metadata.llm_result) {
              console.log('    扩写后提示词:', r.metadata.llm_result)
            }
            if (r.metadata.rephraser_result) {
              console.log('    重写后提示词:', r.metadata.rephraser_result)
            }
          }
        })
      }
    } else if (result.status === 'ERROR') {
      console.log('\n❌ 生成失败')
      if (result.error) {
        console.log('错误代码:', result.error.code)
        console.log('错误信息:', result.error.message)
        console.log('可重试:', result.error.isRetryable)
        if (result.error.details) {
          console.log('详细信息:', JSON.stringify(result.error.details, null, 2))
        }
      }
    } else if (result.status === 'PROCESSING') {
      console.log('\n⏳ 任务正在处理中')
      console.log('Provider Task ID:', result.providerTaskId)
      console.log('进度:', result.progress ? `${(result.progress * 100).toFixed(0)}%` : '未知')
    }

  } catch (error) {
    console.error('\n❌ 测试失败')
    console.error('错误:', error)
    if (error instanceof Error) {
      console.error('堆栈:', error.stack)
    }
    process.exit(1)
  }

  console.log('\n=== 测试完成 ===')
}

// 运行测试
testJimengAdapter().catch(console.error)
