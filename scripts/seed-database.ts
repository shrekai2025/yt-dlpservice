/**
 * 数据库数据填充脚本
 * 用于恢复供应商数据和媒体文件记录
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

// 获取文件大小
function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath)
    return stats.size
  } catch {
    return 0
  }
}

// 获取文件修改时间
function getFileModifiedTime(filePath: string): Date {
  try {
    const stats = fs.statSync(filePath)
    return stats.mtime
  } catch {
    return new Date()
  }
}

// 从文件名推断媒体类型
function inferMediaType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) return 'video'
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image'
  if (['.mp3', '.wav', '.m4a', '.aac'].includes(ext)) return 'audio'
  return 'file'
}

async function seedData() {
  console.log('🌱 开始填充数据库...')

  // 1. 创建或获取管理员用户
  console.log('\n📝 检查用户...')
  let user = await prisma.user.findUnique({
    where: { username: 'adminyt' }
  })

  if (!user) {
    // 创建用户（密码已经通过seed-user.ts设置）
    console.log('❌ 未找到用户，请先运行 npm run db:seed')
    return
  }
  console.log(`✅ 找到用户: ${user.username}`)

  // 2. 填充AI供应商和模型数据
  console.log('\n🤖 填充AI供应商数据...')

  // 创建即梦平台
  const jimengPlatform = await prisma.aIPlatform.upsert({
    where: { slug: 'jimeng' },
    update: {},
    create: {
      name: '即梦AI',
      slug: 'jimeng',
      description: '火山引擎即梦AI - 图像和视频生成',
      website: 'https://www.volcengine.com/product/jimeng',
    },
  })
  console.log(`✅ 创建平台: ${jimengPlatform.name}`)

  // 创建即梦供应商
  const jimengProvider = await prisma.aIProvider.upsert({
    where: { slug: 'jimeng' },
    update: {},
    create: {
      name: '即梦AI',
      slug: 'jimeng',
      description: '火山引擎即梦AI服务',
      platformId: jimengPlatform.id,
      apiEndpoint: 'https://visual.volcengineapi.com',
      uploadToS3: false,
      isActive: true,
      sortOrder: 0,
    },
  })
  console.log(`✅ 创建供应商: ${jimengProvider.name}`)

  // 创建即梦模型
  const jimeng40Model = await prisma.aIModel.upsert({
    where: { slug: 'jimeng-4.0' },
    update: {},
    create: {
      name: '即梦 4.0',
      slug: 'jimeng-4.0',
      description: '即梦4.0图像生成模型',
      providerId: jimengProvider.id,
      outputType: 'image',
      adapterName: 'jimeng-40-adapter',
      inputCapabilities: 'text,image',
      outputCapabilities: 'image',
      featureTags: '文生图,图生图,图像编辑',
      isActive: true,
      sortOrder: 0,
    },
  })
  console.log(`✅ 创建模型: ${jimeng40Model.name}`)

  const jimengVideo30Model = await prisma.aIModel.upsert({
    where: { slug: 'jimeng-video-3.0' },
    update: {},
    create: {
      name: '即梦视频 3.0',
      slug: 'jimeng-video-3.0',
      description: '即梦3.0视频生成模型',
      providerId: jimengProvider.id,
      outputType: 'video',
      adapterName: 'jimeng-video-30-adapter',
      inputCapabilities: 'text,image',
      outputCapabilities: 'video',
      featureTags: '文生视频,图生视频',
      isActive: true,
      sortOrder: 1,
    },
  })
  console.log(`✅ 创建模型: ${jimengVideo30Model.name}`)

  // 3. 扫描并填充媒体文件
  console.log('\n📂 扫描媒体文件...')
  const mediaUploadsDir = path.join(process.cwd(), 'data', 'media-uploads')

  if (!fs.existsSync(mediaUploadsDir)) {
    console.log('❌ 媒体上传目录不存在')
    return
  }

  const files = fs.readdirSync(mediaUploadsDir)
  const mediaFiles = files.filter(f => {
    const ext = path.extname(f).toLowerCase()
    return ['.mp4', '.mov', '.avi', '.jpg', '.jpeg', '.png', '.mp3', '.wav'].includes(ext)
  })

  console.log(`📊 找到 ${mediaFiles.length} 个媒体文件`)

  let importedCount = 0
  for (const filename of mediaFiles) {
    const filePath = path.join(mediaUploadsDir, filename)
    const fileSize = getFileSize(filePath)
    const modifiedTime = getFileModifiedTime(filePath)
    const mediaType = inferMediaType(filename)
    const relativePath = `data/media-uploads/${filename}`

    try {
      // 检查是否已存在
      const existing = await prisma.mediaFile.findFirst({
        where: {
          userId: user.id,
          localPath: relativePath,
        },
      })

      if (!existing) {
        await prisma.mediaFile.create({
          data: {
            userId: user.id,
            name: filename,
            type: mediaType,
            source: 'upload',
            localPath: relativePath,
            fileSize,
            createdAt: modifiedTime,
            updatedAt: modifiedTime,
          },
        })
        importedCount++
      }
    } catch (error) {
      console.error(`❌ 导入失败: ${filename}`, error)
    }
  }

  console.log(`✅ 成功导入 ${importedCount} 个媒体文件`)

  // 4. 创建默认的媒体文件夹
  console.log('\n📁 创建默认文件夹...')
  const defaultFolder = await prisma.mediaFolder.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: '默认',
      },
    },
    update: {},
    create: {
      userId: user.id,
      name: '默认',
      color: '#3b82f6',
      icon: 'folder',
      sortOrder: 0,
    },
  })
  console.log(`✅ 创建文件夹: ${defaultFolder.name}`)

  // 5. 创建LLM供应商
  console.log('\n🧠 填充LLM供应商...')
  const deepseekProvider = await prisma.lLMProvider.upsert({
    where: { slug: 'deepseek' },
    update: {},
    create: {
      name: 'DeepSeek',
      slug: 'deepseek',
      description: 'DeepSeek AI模型服务',
      isActive: true,
      sortOrder: 0,
    },
  })
  console.log(`✅ 创建LLM供应商: ${deepseekProvider.name}`)

  const deepseekEndpoint = await prisma.lLMEndpoint.upsert({
    where: {
      providerId_name: {
        providerId: deepseekProvider.id,
        name: 'DeepSeek API',
      },
    },
    update: {},
    create: {
      providerId: deepseekProvider.id,
      name: 'DeepSeek API',
      url: 'https://api.deepseek.com',
      type: 'openai',
      description: 'DeepSeek官方API',
      isActive: true,
      sortOrder: 0,
    },
  })
  console.log(`✅ 创建LLM端点: ${deepseekEndpoint.name}`)

  console.log('\n🎉 数据填充完成！')
}

// 执行
seedData()
  .catch((error) => {
    console.error('❌ 错误:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
