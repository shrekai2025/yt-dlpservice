/**
 * 更新现有媒体文件的时长信息
 * 用于修复已上传但缺少时长信息的视频和音频文件
 */

import { db } from '../src/server/db'
import { getMediaDuration } from '../src/lib/services/audio-utils'

async function updateMediaDurations() {
  console.log('开始更新媒体文件时长...')

  // 查找所有没有时长信息的视频和音频文件
  const files = await db.mediaFile.findMany({
    where: {
      OR: [
        { type: 'VIDEO' },
        { type: 'AUDIO' }
      ],
      duration: null,
      localPath: { not: null }
    }
  })

  console.log(`找到 ${files.length} 个需要更新的文件`)

  let successCount = 0
  let failCount = 0

  for (const file of files) {
    if (!file.localPath) continue

    try {
      console.log(`正在处理: ${file.name}`)
      const duration = await getMediaDuration(file.localPath)

      if (duration !== null) {
        await db.mediaFile.update({
          where: { id: file.id },
          data: { duration }
        })
        console.log(`✓ 已更新: ${file.name} - ${Math.round(duration)}秒`)
        successCount++
      } else {
        console.log(`✗ 无法获取时长: ${file.name}`)
        failCount++
      }
    } catch (error) {
      console.error(`✗ 处理失败: ${file.name}`, error)
      failCount++
    }
  }

  console.log('\n更新完成！')
  console.log(`成功: ${successCount} 个`)
  console.log(`失败: ${failCount} 个`)
}

updateMediaDurations()
  .then(() => {
    console.log('脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('脚本执行失败:', error)
    process.exit(1)
  })
