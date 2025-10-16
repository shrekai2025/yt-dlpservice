import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 检查是否已存在用户
  const existingUser = await prisma.user.findUnique({
    where: { username: 'adminyt' }
  })

  if (!existingUser) {
    await prisma.user.create({
      data: {
        username: 'adminyt',
        password: 'a2885828'
      }
    })
    console.log('✅ 初始管理员用户已创建：adminyt / a2885828')
  } else {
    console.log('ℹ️  初始用户已存在，跳过创建')
  }
}

main()
  .catch((e) => {
    console.error('❌ 种子脚本执行失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
