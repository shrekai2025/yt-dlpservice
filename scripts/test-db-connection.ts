/**
 * 测试数据库连接
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('测试数据库连接...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL)

    const userCount = await prisma.user.count()
    console.log('✅ 用户数量:', userCount)

    const mediaCount = await prisma.mediaFile.count()
    console.log('✅ 媒体文件数量:', mediaCount)

    const mediaByType = await prisma.mediaFile.groupBy({
      by: ['type'],
      _count: true,
    })

    console.log('✅ 媒体文件分类:')
    mediaByType.forEach(item => {
      console.log(`   - ${item.type}: ${item._count}`)
    })

    console.log('\n✅ 数据库连接正常！')
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
