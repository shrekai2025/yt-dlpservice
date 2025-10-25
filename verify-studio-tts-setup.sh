#!/bin/bash

echo "🔍 检查Studio一键TTS功能状态..."

# 检查1: StudioCharacter表是否有voiceId字段
echo "📊 检查StudioCharacter表结构..."
voiceIdField=$(sqlite3 data/app.db "PRAGMA table_info(studio_characters);" | grep voiceId | wc -l)
if [ "$voiceIdField" -eq 1 ]; then
    echo "✅ StudioCharacter表有voiceId字段"
else
    echo "❌ StudioCharacter表缺少voiceId字段"
    echo "请运行: npx prisma db push"
fi

# 检查2: MediaActor表中的voiceId数据
echo ""
echo "🎭 检查演员表中的Voice ID..."
actorVoiceIds=$(sqlite3 data/app.db "SELECT COUNT(*) FROM media_actors WHERE voiceId IS NOT NULL AND voiceId != '';")
echo "有Voice ID的演员数量: $actorVoiceIds"

if [ "$actorVoiceIds" -gt 0 ]; then
    echo "📋 演员Voice ID详情:"
    sqlite3 data/app.db "SELECT name, voiceId FROM media_actors WHERE voiceId IS NOT NULL AND voiceId != '';" | while IFS='|' read -r name voiceId; do
        echo "  - $name: $voiceId"
    done
else
    echo "❌ 没有演员有Voice ID配置"
fi

# 检查3: StudioCharacter表中的voiceId数据
echo ""
echo "🎭 检查角色表中的Voice ID..."
characterVoiceIds=$(sqlite3 data/app.db "SELECT COUNT(*) FROM studio_characters WHERE voiceId IS NOT NULL AND voiceId != '';")
echo "有Voice ID的角色数量: $characterVoiceIds"

if [ "$characterVoiceIds" -gt 0 ]; then
    echo "📋 角色Voice ID详情（前5个）:"
    sqlite3 data/app.db "SELECT name, voiceId FROM studio_characters WHERE voiceId IS NOT NULL AND voiceId != '' LIMIT 5;" | while IFS='|' read -r name voiceId; do
        echo "  - $name: $voiceId"
    done
else
    echo "ℹ️ 暂时没有角色同步了Voice ID"
fi

# 检查4: ElevenLabs TTS模型配置
echo ""
echo "🤖 检查ElevenLabs TTS模型..."
ttsModel=$(sqlite3 data/app.db "SELECT COUNT(*) FROM ai_models WHERE slug = 'elevenlabs-tts-v3' AND isActive = 1;")
if [ "$ttsModel" -eq 1 ]; then
    echo "✅ ElevenLabs TTS模型已配置且启用"

    # 获取模型详情
    echo "📋 TTS模型详情:"
    sqlite3 data/app.db "
    SELECT
        am.name as provider_name,
        am.isActive as provider_active
    FROM ai_models aim
    JOIN ai_providers am ON aim.providerId = am.id
    WHERE aim.slug = 'elevenlabs-tts-v3';
    " | while IFS='|' read -r provider_name provider_active; do
        echo "  - 供应商: $provider_name"
        echo "  - 状态: $([ \"$provider_active\" = \"1\" ] && echo \"启用\" || echo \"禁用\")"
    done
else
    echo "❌ ElevenLabs TTS模型未配置或未启用"
    echo "请在AI生成 > 供应商中配置ElevenLabs TTS"
fi

# 检查5: Episode和Shot数据
echo ""
echo "🎬 检查Episode和Shot数据..."
episodes=$(sqlite3 data/app.db "SELECT COUNT(*) FROM studio_episodes;")
shots=$(sqlite3 data/app.db "SELECT COUNT(*) FROM studio_shots;")
shotCharacters=$(sqlite3 data/app.db "SELECT COUNT(*) FROM studio_shot_characters;")
dialogues=$(sqlite3 data/app.db "SELECT COUNT(*) FROM studio_shot_characters WHERE dialogue IS NOT NULL AND dialogue != '';")

echo "  - Episodes数量: $episodes"
echo "  - Shots数量: $shots"
echo "  - 镜头角色关系数量: $shotCharacters"
echo "  - 有台词的镜头角色数量: $dialogues"

if [ "$shots" -eq 0 ]; then
    echo "ℹ️ 当前没有镜头数据，需要先创建镜头才能测试TTS"
elif [ "$dialogues" -eq 0 ]; then
    echo "ℹ️ 当前没有角色台词，需要先为角色添加台词才能测试TTS"
else
    echo "✅ 有镜头和角色台词数据，可以测试TTS功能"
fi

# 检查6: AI生成任务
echo ""
echo "📝 检查AI生成任务..."
totalTasks=$(sqlite3 data/app.db "SELECT COUNT(*) FROM ai_generation_tasks;")
pendingTasks=$(sqlite3 data/app.db "SELECT COUNT(*) FROM ai_generation_tasks WHERE status = 'PENDING';")
processingTasks=$(sqlite3 data/app.db "SELECT COUNT(*) FROM ai_generation_tasks WHERE status = 'PROCESSING';")
completedTasks=$(sqlite3 data/app.db "SELECT COUNT(*) FROM ai_generation_tasks WHERE status = 'COMPLETED';")
failedTasks=$(sqlite3 data/app.db "SELECT COUNT(*) FROM ai_generation_tasks WHERE status = 'FAILED';")

echo "  - 总任务数: $totalTasks"
echo "  - 待处理: $pendingTasks"
echo "  - 处理中: $processingTasks"
echo "  - 已完成: $completedTasks"
echo "  - 失败: $failedTasks"

if [ "$totalTasks" -gt 0 ]; then
    echo "📋 最近的任务（前3个）:"
    sqlite3 data/app.db "
    SELECT
        t.id,
        t.status,
        CASE
            WHEN t.shotId IS NOT NULL THEN 'TTS任务'
            ELSE '其他任务'
        END as type,
        SUBSTR(t.prompt, 1, 50) || '...' as preview
    FROM ai_generation_tasks t
    ORDER BY t.createdAt DESC
    LIMIT 3;
    " | while IFS='|' read -r task_id status type preview; do
        statusEmoji="⏳"
        case $status in
            "PENDING") statusEmoji="⏳" ;;
            "PROCESSING") statusEmoji="🔄" ;;
            "COMPLETED") statusEmoji="✅" ;;
            "FAILED") statusEmoji="❌" ;;
        esac
        echo "  - $statusEmoji [$status] $type: $preview ($task_id)"
    done
fi

echo ""
echo "🔧 检查完成！"
echo "💡 使用建议:"
echo "  1. 如果演员没有Voice ID，请先在媒体浏览器中添加"
echo "  2. 如果角色没有Voice ID，请在Studio角色页关联演员"
echo "  3. 如果没有ElevenLabs模型，请在AI生成>供应商中配置"
echo "  4. 访问 http://localhost:3000/admin/ai-generation/studio 开始测试"