/**
 * 完整数据库数据填充脚本
 * 递归扫描所有媒体文件并导入
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const prisma = new PrismaClient()

// 获取文件信息
function getFileInfo(filePath: string) {
  try {
    const stats = fs.statSync(filePath)
    return {
      size: stats.size,
      mtime: stats.mtime,
      exists: true,
    }
  } catch {
    return {
      size: 0,
      mtime: new Date(),
      exists: false,
    }
  }
}

// 从文件名推断媒体类型
function inferMediaType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'video'
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'image'
  if (['.mp3', '.wav', '.m4a', '.aac', '.ogg'].includes(ext)) return 'audio'
  return 'file'
}

// 递归扫描目录
function scanDirectory(dir: string, baseDir: string): string[] {
  const results: string[] = []

  try {
    const items = fs.readdirSync(dir)

    for (const item of items) {
      if (item.startsWith('.')) continue // 跳过隐藏文件

      const fullPath = path.join(dir, item)
      const stats = fs.statSync(fullPath)

      if (stats.isDirectory()) {
        results.push(...scanDirectory(fullPath, baseDir))
      } else if (stats.isFile()) {
        const ext = path.extname(item).toLowerCase()
        if (['.mp4', '.mov', '.avi', '.jpg', '.jpeg', '.png', '.gif', '.mp3', '.wav'].includes(ext)) {
          results.push(fullPath)
        }
      }
    }
  } catch (error) {
    console.error(`❌ 扫描目录失败: ${dir}`, error)
  }

  return results
}

async function seedData() {
  console.log('🌱 开始填充数据库（完整版）...')

  // 1. 检查用户
  console.log('\n📝 检查用户...')
  const user = await prisma.user.findUnique({
    where: { username: 'adminyt' }
  })

  if (!user) {
    console.log('❌ 未找到用户，请先运行 npm run db:seed')
    return
  }
  console.log(`✅ 找到用户: ${user.username} (ID: ${user.id})`)

  // 2. 填充AI供应商和模型数据
  console.log('\n🤖 填充AI供应商数据...')

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

  await prisma.aIModel.upsert({
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

  await prisma.aIModel.upsert({
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

  console.log(`✅ AI供应商和模型填充完成`)

  // 3. 递归扫描并填充媒体文件
  console.log('\n📂 扫描所有媒体文件...')
  const mediaUploadsDir = path.join(process.cwd(), 'data', 'media-uploads')

  if (!fs.existsSync(mediaUploadsDir)) {
    console.log('❌ 媒体上传目录不存在')
  } else {
    const allFiles = scanDirectory(mediaUploadsDir, mediaUploadsDir)
    console.log(`📊 找到 ${allFiles.length} 个媒体文件`)

    let importedCount = 0
    let skippedCount = 0

    for (const filePath of allFiles) {
      const fileInfo = getFileInfo(filePath)
      if (!fileInfo.exists) continue

      const filename = path.basename(filePath)
      const relativePath = path.relative(process.cwd(), filePath)
      const mediaType = inferMediaType(filename)

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
              fileSize: fileInfo.size,
              createdAt: fileInfo.mtime,
              updatedAt: fileInfo.mtime,
            },
          })
          importedCount++

          if (importedCount % 10 === 0) {
            console.log(`  📥 已导入 ${importedCount} 个文件...`)
          }
        } else {
          skippedCount++
        }
      } catch (error) {
        console.error(`❌ 导入失败: ${filename}`, error)
      }
    }

    console.log(`✅ 成功导入 ${importedCount} 个新文件`)
    console.log(`⏭️  跳过 ${skippedCount} 个已存在的文件`)
  }

  // 4. 创建默认文件夹
  console.log('\n📁 创建默认文件夹...')
  await prisma.mediaFolder.upsert({
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
  console.log(`✅ 默认文件夹已就绪`)

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

  await prisma.lLMEndpoint.upsert({
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

  await prisma.lLMModel.upsert({
    where: {
      endpointId_slug: {
        endpointId: (await prisma.lLMEndpoint.findFirst({
          where: { providerId: deepseekProvider.id }
        }))!.id,
        slug: 'deepseek-chat',
      },
    },
    update: {},
    create: {
      endpointId: (await prisma.lLMEndpoint.findFirst({
        where: { providerId: deepseekProvider.id }
      }))!.id,
      name: 'DeepSeek Chat',
      slug: 'deepseek-chat',
      description: 'DeepSeek对话模型',
      isActive: true,
      sortOrder: 0,
    },
  })

  console.log(`✅ LLM供应商填充完成`)

  // 6. 统计信息
  console.log('\n📊 数据库统计:')
  const stats = {
    users: await prisma.user.count(),
    aiProviders: await prisma.aIProvider.count(),
    aiModels: await prisma.aIModel.count(),
    mediaFiles: await prisma.mediaFile.count(),
    mediaFolders: await prisma.mediaFolder.count(),
    llmProviders: await prisma.lLMProvider.count(),
    llmEndpoints: await prisma.lLMEndpoint.count(),
    llmModels: await prisma.lLMModel.count(),
  }

  console.log(`  👤 用户: ${stats.users}`)
  console.log(`  🤖 AI供应商: ${stats.aiProviders}`)
  console.log(`  🎨 AI模型: ${stats.aiModels}`)
  console.log(`  📁 媒体文件夹: ${stats.mediaFolders}`)
  console.log(`  📄 媒体文件: ${stats.mediaFiles}`)
  console.log(`  🧠 LLM供应商: ${stats.llmProviders}`)
  console.log(`  🔗 LLM端点: ${stats.llmEndpoints}`)
  console.log(`  💬 LLM模型: ${stats.llmModels}`)

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
