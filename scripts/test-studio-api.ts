/**
 * Studio API 测试脚本
 */

import { db } from '~/server/db'

async function testStudioAPI() {
  console.log('🧪 开始测试 Studio API...\n')

  try {
    // 1. 测试数据库连接
    console.log('1️⃣ 测试数据库连接...')
    const userCount = await db.user.count()
    console.log(`✅ 数据库连接成功,用户数: ${userCount}\n`)

    // 获取第一个用户用于测试
    const testUser = await db.user.findFirst()
    if (!testUser) {
      console.log('❌ 没有找到测试用户,请先创建用户')
      return
    }
    console.log(`📝 使用测试用户: ${testUser.username} (${testUser.id})\n`)

    // 2. 测试创建项目
    console.log('2️⃣ 测试创建项目...')
    const project = await db.studioProject.create({
      data: {
        userId: testUser.id,
        name: '英语对话教学',
        slug: 'english-dialog',
        description: '用于生成英语对话教学短片的工作流',
      },
    })
    console.log(`✅ 项目创建成功: ${project.name} (${project.id})\n`)

    // 3. 测试创建集
    console.log('3️⃣ 测试创建集...')
    const episode = await db.studioEpisode.create({
      data: {
        projectId: project.id,
        episodeNumber: 1,
        title: '第一集: 咖啡厅对话',
        setting: {
          create: {
            era: '现代',
            genre: '日常对话',
            visualStyle: '温馨自然风格',
            stylePrompt: 'warm, natural lighting, casual modern setting',
          },
        },
      },
      include: {
        setting: true,
      },
    })
    console.log(`✅ 集创建成功: ${episode.title} (${episode.id})`)
    console.log(`   设定: ${episode.setting?.visualStyle}\n`)

    // 4. 测试创建角色
    console.log('4️⃣ 测试创建角色...')
    const character = await db.studioCharacter.create({
      data: {
        projectId: project.id,
        name: 'Alice',
        description: '一位友好的英语老师',
        appearancePrompt: 'friendly female teacher, 30s, professional casual clothing',
      },
    })
    console.log(`✅ 角色创建成功: ${character.name}\n`)

    // 5. 测试创建镜头
    console.log('5️⃣ 测试创建镜头...')
    const shot = await db.studioShot.create({
      data: {
        episodeId: episode.id,
        shotNumber: 1,
        name: '开场镜头',
        scenePrompt: 'cozy coffee shop interior, morning light',
        cameraPrompt: 'medium shot, slight zoom in',
      },
    })
    console.log(`✅ 镜头创建成功: 镜头 #${shot.shotNumber} - ${shot.name}\n`)

    // 6. 测试镜头-角色关联
    console.log('6️⃣ 测试镜头-角色关联...')
    const shotCharacter = await db.studioShotCharacter.create({
      data: {
        shotId: shot.id,
        characterId: character.id,
        dialogue: 'Hello! Welcome to our English conversation lesson.',
        position: 'center frame',
      },
    })
    console.log(`✅ 角色添加到镜头成功\n`)

    // 7. 测试查询完整数据
    console.log('7️⃣ 测试查询完整集数据...')
    const fullEpisode = await db.studioEpisode.findUnique({
      where: { id: episode.id },
      include: {
        setting: true,
        shots: {
          include: {
            characters: {
              include: {
                character: true,
              },
            },
          },
        },
      },
    })
    console.log(`✅ 查询成功:`)
    console.log(`   集: ${fullEpisode?.title}`)
    console.log(`   镜头数: ${fullEpisode?.shots.length}`)
    console.log(`   第一个镜头的角色数: ${fullEpisode?.shots[0]?.characters.length}\n`)

    // 8. 清理测试数据
    console.log('8️⃣ 清理测试数据...')
    await db.studioProject.delete({
      where: { id: project.id },
    })
    console.log(`✅ 测试数据已清理\n`)

    console.log('🎉 所有测试通过!')
  } catch (error) {
    console.error('❌ 测试失败:', error)
    throw error
  }
}

testStudioAPI()
  .then(() => {
    console.log('\n✨ 测试完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 测试错误:', error)
    process.exit(1)
  })
