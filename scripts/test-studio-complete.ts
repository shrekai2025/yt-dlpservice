/**
 * Studio 完整功能测试
 * 测试从项目创建到镜头生成的完整流程
 */

import { db } from '~/server/db'

async function testCompleteWorkflow() {
  console.log('🎬 开始测试 Studio 完整工作流...\n')

  try {
    // 获取测试用户
    const testUser = await db.user.findFirst()
    if (!testUser) {
      throw new Error('没有找到测试用户')
    }
    console.log(`👤 测试用户: ${testUser.username}\n`)

    // 1. 创建项目
    console.log('📁 步骤 1: 创建项目')
    const project = await db.studioProject.create({
      data: {
        userId: testUser.id,
        name: '英语对话教学',
        slug: 'english-dialog',
        description: '用于生成英语对话教学短片的工作流',
      },
    })
    console.log(`   ✅ 项目创建: ${project.name} (${project.slug})\n`)

    // 2. 创建媒体演员(用于测试导入功能)
    console.log('🎭 步骤 2: 创建媒体演员')
    const actor = await db.mediaActor.create({
      data: {
        userId: testUser.id,
        name: 'Sarah Johnson',
        bio: 'Professional English teacher with 10 years experience',
        appearancePrompt: 'friendly female teacher, 35 years old, professional casual attire, warm smile',
        tags: JSON.stringify(['teacher', 'female', '30-40']),
        avatarUrl: 'https://example.com/avatar/sarah.jpg',
      },
    })
    console.log(`   ✅ 演员创建: ${actor.name}\n`)

    // 3. 从演员表导入角色
    console.log('👥 步骤 3: 从演员表导入角色')
    const character1 = await db.studioCharacter.create({
      data: {
        projectId: project.id,
        name: 'Sarah',
        description: actor.bio || '',
        sourceActorId: actor.id,
        appearancePrompt: actor.appearancePrompt || '',
        referenceImage: actor.avatarUrl || '',
      },
    })
    console.log(`   ✅ 角色导入: ${character1.name} (来自演员表)\n`)

    // 4. 手动创建另一个角色
    console.log('👤 步骤 4: 手动创建角色')
    const character2 = await db.studioCharacter.create({
      data: {
        projectId: project.id,
        name: 'Tom',
        description: 'A beginner English learner',
        appearancePrompt: 'young male student, 20s, casual clothes, curious expression',
      },
    })
    console.log(`   ✅ 角色创建: ${character2.name}\n`)

    // 5. 创建第一集
    console.log('📺 步骤 5: 创建第一集')
    const episode1 = await db.studioEpisode.create({
      data: {
        projectId: project.id,
        episodeNumber: 1,
        title: 'Lesson 1: Coffee Shop Conversation',
        rawInput: JSON.stringify({
          topic: 'ordering coffee',
          vocabulary: ['latte', 'cappuccino', 'espresso'],
        }),
        objective: 'Teach students how to order coffee in English',
        objectiveLLM: JSON.stringify({
          provider: 'openai',
          model: 'gpt-4',
        }),
        setting: {
          create: {
            era: 'Modern',
            genre: 'Daily Conversation',
            visualStyle: 'Warm and cozy coffee shop atmosphere',
            stylePrompt: 'warm lighting, cozy interior, natural colors, casual atmosphere',
            lightingPrompt: 'soft natural lighting from windows, warm ambient lights',
            colorPrompt: 'warm browns, creams, natural wood tones',
          },
        },
      },
      include: {
        setting: true,
      },
    })
    console.log(`   ✅ 集创建: ${episode1.title}`)
    console.log(`   📝 目标: ${episode1.objective}`)
    console.log(`   🎨 风格: ${episode1.setting?.visualStyle}\n`)

    // 6. 创建镜头 1
    console.log('🎬 步骤 6: 创建第一个镜头')
    const shot1 = await db.studioShot.create({
      data: {
        episodeId: episode1.id,
        shotNumber: 1,
        name: 'Opening Scene',
        description: 'Sarah welcomes the viewers',
        scenePrompt: 'cozy coffee shop interior, morning light streaming through windows',
        actionPrompt: 'teacher smiling at camera, welcoming gesture',
        cameraPrompt: 'medium shot, slight zoom in, eye level',
        dialogue: 'Hello everyone! Welcome to our coffee shop English lesson.',
        duration: 5.0,
      },
    })
    console.log(`   ✅ 镜头创建: #${shot1.shotNumber} - ${shot1.name}\n`)

    // 7. 为镜头添加角色
    console.log('🎭 步骤 7: 为镜头添加角色')
    await db.studioShotCharacter.create({
      data: {
        shotId: shot1.id,
        characterId: character1.id,
        dialogue: shot1.dialogue || '',
        position: 'center frame, behind counter',
        action: 'welcoming gesture with hands',
      },
    })
    console.log(`   ✅ 角色添加到镜头: ${character1.name}\n`)

    // 8. 创建镜头 2 (对话场景)
    console.log('🎬 步骤 8: 创建第二个镜头(对话)')
    const shot2 = await db.studioShot.create({
      data: {
        episodeId: episode1.id,
        shotNumber: 2,
        name: 'Coffee Ordering Scene',
        description: 'Tom orders coffee from Sarah',
        scenePrompt: 'same coffee shop, counter view',
        cameraPrompt: 'two shot, medium close-up, slight angle',
        duration: 8.0,
      },
    })
    console.log(`   ✅ 镜头创建: #${shot2.shotNumber} - ${shot2.name}\n`)

    // 9. 为镜头 2 添加两个角色
    console.log('👥 步骤 9: 为镜头 2 添加角色对话')
    await db.studioShotCharacter.createMany({
      data: [
        {
          shotId: shot2.id,
          characterId: character2.id,
          dialogue: "Hi! Can I have a latte, please?",
          position: 'left side, customer',
          action: 'pointing at menu',
          sortOrder: 1,
        },
        {
          shotId: shot2.id,
          characterId: character1.id,
          dialogue: 'Of course! Would you like that hot or iced?',
          position: 'right side, barista',
          action: 'preparing order, smiling',
          sortOrder: 2,
        },
      ],
    })
    console.log(`   ✅ 两个角色对话添加完成\n`)

    // 10. 获取 AI 模型用于生成测试
    console.log('🤖 步骤 10: 查找可用的 AI 模型')
    const imageModel = await db.aIModel.findFirst({
      where: {
        outputType: 'IMAGE',
        isActive: true,
      },
    })

    if (imageModel) {
      console.log(`   ✅ 找到图像模型: ${imageModel.name}\n`)

      // 11. 创建首帧生成记录
      console.log('🎨 步骤 11: 创建首帧生成记录')

      // 构建完整 prompt (合并全局设定)
      const setting = episode1.setting
      const promptParts = []

      if (setting?.stylePrompt) promptParts.push(setting.stylePrompt)
      if (setting?.lightingPrompt) promptParts.push(setting.lightingPrompt)
      if (character1.appearancePrompt) promptParts.push(character1.appearancePrompt)
      if (shot1.scenePrompt) promptParts.push(shot1.scenePrompt)
      if (shot1.actionPrompt) promptParts.push(shot1.actionPrompt)
      if (shot1.cameraPrompt) promptParts.push(shot1.cameraPrompt)

      const fullPrompt = promptParts.join(', ')

      const frame1 = await db.studioFrame.create({
        data: {
          shotId: shot1.id,
          type: 'keyframe',
          version: 1,
          modelId: imageModel.id,
          prompt: fullPrompt,
          status: 'pending',
          isSelected: true,
        },
      })
      console.log(`   ✅ 首帧记录创建 (version ${frame1.version})`)
      console.log(`   📝 Prompt: ${fullPrompt.substring(0, 100)}...\n`)
    } else {
      console.log(`   ⚠️  未找到可用的图像模型,跳过帧生成测试\n`)
    }

    // 12. 查询完整的集数据
    console.log('📊 步骤 12: 查询完整数据结构')
    const fullEpisode = await db.studioEpisode.findUnique({
      where: { id: episode1.id },
      include: {
        project: true,
        setting: true,
        shots: {
          include: {
            characters: {
              include: {
                character: {
                  include: {
                    sourceActor: true,
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
            frames: {
              orderBy: { version: 'desc' },
            },
          },
          orderBy: { shotNumber: 'asc' },
        },
      },
    })

    console.log('   📈 数据统计:')
    console.log(`      - 项目: ${fullEpisode?.project.name}`)
    console.log(`      - 集: ${fullEpisode?.title}`)
    console.log(`      - 镜头数: ${fullEpisode?.shots.length}`)
    fullEpisode?.shots.forEach((shot, idx) => {
      console.log(`      - 镜头 #${shot.shotNumber}: ${shot.characters.length} 个角色, ${shot.frames.length} 个帧`)
    })
    console.log('')

    // 13. 测试归档功能
    console.log('📦 步骤 13: 测试归档功能')
    await db.studioEpisode.update({
      where: { id: episode1.id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    })
    console.log(`   ✅ 集已归档\n`)

    // 14. 测试恢复功能
    console.log('♻️  步骤 14: 测试恢复功能')
    await db.studioEpisode.update({
      where: { id: episode1.id },
      data: {
        status: 'completed',
        archivedAt: null,
      },
    })
    console.log(`   ✅ 集已恢复\n`)

    // 15. 清理测试数据
    console.log('🧹 步骤 15: 清理测试数据')
    await db.mediaActor.delete({ where: { id: actor.id } })
    await db.studioProject.delete({ where: { id: project.id } })
    console.log(`   ✅ 清理完成\n`)

    console.log('═'.repeat(60))
    console.log('🎉 所有测试通过!')
    console.log('═'.repeat(60))
    console.log('\n✅ 测试覆盖:')
    console.log('   - 项目创建')
    console.log('   - 演员表集成')
    console.log('   - 角色导入和创建')
    console.log('   - 集创建和设定')
    console.log('   - 镜头创建')
    console.log('   - 角色对话管理')
    console.log('   - Prompt 合并逻辑')
    console.log('   - 帧生成记录')
    console.log('   - 数据关联查询')
    console.log('   - 归档/恢复功能')
    console.log('')

  } catch (error) {
    console.error('❌ 测试失败:', error)
    throw error
  }
}

testCompleteWorkflow()
  .then(() => {
    console.log('✨ 测试完成\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 测试错误:', error)
    process.exit(1)
  })
