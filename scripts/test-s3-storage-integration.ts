/**
 * 测试S3转存功能与存储管理的集成
 * 验证通过s3-transfer上传的文件是否会显示在storage列表中
 */

import { db } from '../src/server/db'

async function testStorageIntegration() {
  console.log('🔍 检查S3转存文件与Storage记录的关联...\n')

  // 查找已完成S3转存的任务
  const tasksWithS3 = await db.task.findMany({
    where: {
      s3TransferStatus: 'completed',
      s3Url: { not: null }
    },
    select: {
      id: true,
      title: true,
      platform: true,
      s3Url: true,
      s3TransferredAt: true
    },
    orderBy: { s3TransferredAt: 'desc' },
    take: 10
  })

  console.log(`✅ 找到 ${tasksWithS3.length} 个已完成S3转存的任务\n`)

  if (tasksWithS3.length === 0) {
    console.log('💡 提示: 创建一个任务并启用S3转存以测试此功能')
    return
  }

  // 检查这些任务的S3 URL是否存在于storage_files表中
  for (const task of tasksWithS3) {
    const storageRecord = await db.storageFile.findFirst({
      where: {
        s3Url: task.s3Url!
      }
    })

    if (storageRecord) {
      console.log(`✅ Task ${task.id.slice(0, 8)} - 已关联到Storage记录`)
      console.log(`   标题: ${task.title}`)
      console.log(`   平台: ${task.platform}`)
      console.log(`   Storage文件名: ${storageRecord.fileName}`)
      console.log(`   文件大小: ${(storageRecord.fileSize / 1024 / 1024).toFixed(2)} MB`)
      console.log(`   S3 URL: ${storageRecord.s3Url}\n`)
    } else {
      console.log(`❌ Task ${task.id.slice(0, 8)} - 未找到Storage记录`)
      console.log(`   标题: ${task.title}`)
      console.log(`   S3 URL: ${task.s3Url}\n`)
    }
  }

  // 统计storage文件总数
  const totalStorageFiles = await db.storageFile.count()
  console.log(`\n📊 Storage管理中的文件总数: ${totalStorageFiles}`)

  // 按pathPrefix分组统计
  const filesByPrefix = await db.$queryRaw<Array<{ pathPrefix: string, count: number }>>`
    SELECT pathPrefix, COUNT(*) as count
    FROM storage_files
    GROUP BY pathPrefix
    ORDER BY count DESC
  `

  console.log('\n📁 按路径前缀分组:')
  for (const group of filesByPrefix) {
    console.log(`   ${group.pathPrefix}: ${group.count} 个文件`)
  }
}

testStorageIntegration()
  .then(() => {
    console.log('\n✅ 测试完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  })
