const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function test() {
  try {
    console.log('查找一个 episode...')

    const episode = await prisma.studioEpisode.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!episode) {
      console.log('❌ 没有找到 episode')
      return
    }

    console.log('✓ 找到 episode:', episode.id)
    console.log('当前 systemPrompt:', episode.systemPrompt)

    console.log('\n更新 systemPrompt...')
    const updated = await prisma.studioEpisode.update({
      where: { id: episode.id },
      data: {
        systemPrompt: '测试 System Prompt - ' + new Date().toISOString()
      }
    })

    console.log('✓ 更新成功!')
    console.log('新的 systemPrompt:', updated.systemPrompt)

  } catch (error) {
    console.error('❌ 错误:', error)
  } finally {
    await prisma.$disconnect()
  }
}

test()
