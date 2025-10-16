#!/usr/bin/env tsx
/**
 * S3转存功能测试脚本
 *
 * 使用方法:
 *   npx tsx scripts/test-s3-transfer.ts
 */

import { s3Uploader } from '../src/lib/services/s3-uploader'
import { s3TransferService } from '../src/lib/services/s3-transfer'
import * as fs from 'fs/promises'
import * as path from 'path'

async function testS3Configuration() {
  console.log('\n========================================')
  console.log('测试1: S3配置检查')
  console.log('========================================\n')

  const isConfigured = s3Uploader.isConfigured()
  console.log(`S3配置状态: ${isConfigured ? '✅ 已配置' : '❌ 未配置'}`)

  if (!isConfigured) {
    console.log('\n⚠️  请配置以下环境变量:')
    console.log('  AWS_ACCESS_KEY_ID')
    console.log('  AWS_SECRET_ACCESS_KEY')
    console.log('  AWS_REGION')
    console.log('  AWS_S3_BUCKET')
    return false
  }

  return true
}

async function testUploadFile() {
  console.log('\n========================================')
  console.log('测试2: 上传测试文件')
  console.log('========================================\n')

  try {
    // 创建一个测试文件
    const testDir = '/tmp/s3-test'
    await fs.mkdir(testDir, { recursive: true })
    const testFilePath = path.join(testDir, 'test-video.txt')

    // 写入测试内容
    const testContent = `S3转存测试文件
创建时间: ${new Date().toISOString()}
这是一个模拟视频文件的测试文本文件。
`
    await fs.writeFile(testFilePath, testContent)
    console.log(`✅ 创建测试文件: ${testFilePath}`)

    // 上传到S3
    console.log('\n开始上传到S3...')
    const s3Url = await s3Uploader.uploadFile(
      testFilePath,
      'test-uploads',
      `test-${Date.now()}`
    )

    console.log(`✅ 上传成功!`)
    console.log(`S3 URL: ${s3Url}`)

    // 清理测试文件
    await fs.unlink(testFilePath)
    console.log(`✅ 已清理测试文件`)

    return true
  } catch (error) {
    console.error(`❌ 上传失败: ${error}`)
    return false
  }
}

async function testS3TransferService() {
  console.log('\n========================================')
  console.log('测试3: S3转存服务')
  console.log('========================================\n')

  try {
    // 创建模拟任务
    console.log('这个测试需要真实的任务ID')
    console.log('请手动创建一个任务，然后使用以下代码:')
    console.log('\n```typescript')
    console.log('import { s3TransferService } from \'~/lib/services/s3-transfer\'')
    console.log('')
    console.log('// 转存指定任务的文件')
    console.log('await s3TransferService.transferToS3(')
    console.log('  \'your-task-id\',')
    console.log('  \'/path/to/your/video/or/audio/file.mp4\'')
    console.log(')')
    console.log('```')

    return true
  } catch (error) {
    console.error(`❌ 测试失败: ${error}`)
    return false
  }
}

async function main() {
  console.log('🚀 S3转存功能测试\n')

  // 测试1: S3配置
  const configured = await testS3Configuration()
  if (!configured) {
    console.log('\n❌ S3未配置，跳过后续测试')
    return
  }

  // 测试2: 上传文件
  await testUploadFile()

  // 测试3: S3转存服务
  await testS3TransferService()

  console.log('\n========================================')
  console.log('测试完成')
  console.log('========================================\n')

  console.log('📋 使用说明:')
  console.log('1. 创建任务时添加 transferToS3: true')
  console.log('2. 任务完成后会自动转存到S3')
  console.log('3. 查询任务可以看到s3Url、s3TransferStatus等字段')
  console.log('')
  console.log('示例API调用:')
  console.log('```bash')
  console.log('curl -X POST http://localhost:3000/api/external/tasks \\')
  console.log('  -H "Content-Type: application/json" \\')
  console.log('  -H "X-API-Key: your_api_key" \\')
  console.log('  -d \'{')
  console.log('    "url": "https://twitter.com/user/status/123",')
  console.log('    "downloadType": "VIDEO_ONLY",')
  console.log('    "transferToS3": true')
  console.log('  }\'')
  console.log('```')
}

main().catch(console.error)
