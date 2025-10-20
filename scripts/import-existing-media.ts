/**
 * 导入现有媒体文件到数据库
 * 为 data/media-uploads 中的所有文件创建数据库记录
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

// 获取视频时长
async function getVideoDuration(filePath: string): Promise<number | null> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    )
    return parseFloat(stdout.trim())
  } catch (error) {
    console.warn(`无法获取视频时长: ${filePath}`)
    return null
  }
}

// 检测文件类型
function detectMediaType(fileName: string): 'IMAGE' | 'VIDEO' | 'AUDIO' {
  const ext = path.extname(fileName).toLowerCase()

  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
    return 'IMAGE'
  }
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'].includes(ext)) {
    return 'VIDEO'
  }
  if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)) {
    return 'AUDIO'
  }

  // 默认为视频
  return 'VIDEO'
}

// 获取 MIME 类型
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()

  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
  }

  return mimeTypes[ext] || 'application/octet-stream'
}

async function importMediaFiles() {
  try {
    // 获取管理员用户
    const user = await prisma.user.findFirst()
    if (!user) {
      console.error('❌ 没有找到用户，请先运行 seed-user.ts')
      process.exit(1)
    }

    console.log(`✅ 使用用户: ${user.username} (${user.id})`)

    // 扫描 media-uploads 目录
    const uploadDir = path.join(process.cwd(), 'data', 'media-uploads')
    const entries = await fs.readdir(uploadDir, { withFileTypes: true })

    let imported = 0
    let skipped = 0
    let errors = 0

    for (const entry of entries) {
      try {
        if (entry.name === '.gitkeep') continue

        const fullPath = path.join(uploadDir, entry.name)

        if (entry.isDirectory()) {
          // 处理子目录中的文件
          const subEntries = await fs.readdir(fullPath, { withFileTypes: true })
          for (const subEntry of subEntries) {
            if (subEntry.isFile()) {
              const subFilePath = path.join(fullPath, subEntry.name)
              await importSingleFile(user.id, subFilePath, entry.name)
              imported++
            }
          }
        } else if (entry.isFile()) {
          // 处理根目录中的文件
          await importSingleFile(user.id, fullPath, null)
          imported++
        }
      } catch (error) {
        console.error(`❌ 导入失败: ${entry.name}`, error)
        errors++
      }
    }

    console.log(`\n✅ 导入完成！`)
    console.log(`   - 成功导入: ${imported} 个文件`)
    console.log(`   - 跳过: ${skipped} 个文件`)
    console.log(`   - 错误: ${errors} 个文件`)
  } catch (error) {
    console.error('❌ 导入过程出错:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function importSingleFile(
  userId: string,
  fullPath: string,
  folderName: string | null
) {
  const relativePath = path.relative(process.cwd(), fullPath)
  const fileName = path.basename(fullPath)
  const stats = await fs.stat(fullPath)

  // 检查是否已存在
  const existing = await prisma.mediaFile.findFirst({
    where: {
      userId,
      localPath: relativePath,
    },
  })

  if (existing) {
    console.log(`⏭️  跳过已存在: ${fileName}`)
    return
  }

  const type = detectMediaType(fileName)
  const mimeType = getMimeType(fileName)
  let duration: number | null = null

  // 获取视频/音频时长
  if (type === 'VIDEO' || type === 'AUDIO') {
    duration = await getVideoDuration(fullPath)
  }

  // 查找或创建文件夹
  let folderId: string | null = null
  if (folderName) {
    let folder = await prisma.mediaFolder.findFirst({
      where: {
        userId,
        name: folderName,
      },
    })

    if (!folder) {
      folder = await prisma.mediaFolder.create({
        data: {
          userId,
          name: folderName,
        },
      })
    }

    folderId = folder.id
  }

  // 创建媒体文件记录
  await prisma.mediaFile.create({
    data: {
      userId,
      name: fileName,
      type,
      source: 'LOCAL',
      localPath: relativePath,
      mimeType,
      fileSize: stats.size,
      duration,
      folderId,
    },
  })

  console.log(`✅ 已导入: ${fileName} (${type})`)
}

// 运行导入
importMediaFiles()
