/**
 * 修复脚本：为缺少宽高信息的媒体文件（图片和视频）提取宽高
 * 使用 ffprobe 提取媒体元数据并更新数据库
 */

import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

interface MediaInfo {
  width: number
  height: number
}

/**
 * 使用 ffprobe 获取媒体文件宽高（支持图片和视频）
 */
async function getMediaDimensions(filePath: string): Promise<MediaInfo | null> {
  try {
    const fullPath = path.join(process.cwd(), filePath)
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${fullPath}"`
    )

    const [width, height] = stdout.trim().split(',').map(Number)

    if (width && height) {
      return { width, height }
    }

    return null
  } catch (error) {
    console.error(`Failed to get dimensions for ${filePath}:`, error)
    return null
  }
}

/**
 * 修复所有缺少宽高信息的媒体文件
 */
async function fixMediaDimensions() {
  try {
    // 查询所有缺少宽高的媒体文件（图片和视频）
    const mediaWithoutDimensions = await prisma.mediaFile.findMany({
      where: {
        type: {
          in: ['VIDEO', 'IMAGE']
        },
        OR: [
          { width: null },
          { height: null }
        ],
        localPath: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        type: true,
        localPath: true
      }
    })

    console.log(`Found ${mediaWithoutDimensions.length} media files without dimensions`)

    let successCount = 0
    let failCount = 0

    // 逐个处理媒体文件
    for (const media of mediaWithoutDimensions) {
      if (!media.localPath) {
        console.log(`Skipping ${media.name}: no local path`)
        failCount++
        continue
      }

      console.log(`Processing [${media.type}]: ${media.name}`)

      const dimensions = await getMediaDimensions(media.localPath)

      if (dimensions) {
        // 更新数据库
        await prisma.mediaFile.update({
          where: { id: media.id },
          data: {
            width: dimensions.width,
            height: dimensions.height
          }
        })

        console.log(`✓ Updated ${media.name}: ${dimensions.width}x${dimensions.height}`)
        successCount++
      } else {
        console.log(`✗ Failed to get dimensions for ${media.name}`)
        failCount++
      }
    }

    console.log(`\nCompleted!`)
    console.log(`Success: ${successCount}`)
    console.log(`Failed: ${failCount}`)

  } catch (error) {
    console.error('Error fixing video dimensions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行修复脚本
fixMediaDimensions()
