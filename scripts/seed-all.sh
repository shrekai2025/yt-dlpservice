#!/bin/bash

# 完整数据初始化脚本
# 使用绝对路径确保数据库连接正常

set -e

DB_PATH="/Users/uniteyoo/Documents/yt-dlpservice/data/app.db"
export DATABASE_URL="file:$DB_PATH"

echo "🌱 开始数据初始化..."
echo "数据库路径: $DB_PATH"
echo ""

# 1. 创建用户
echo "📝 创建管理员用户..."
npx tsx prisma/seed-user.ts

# 2. 创建AI生成供应商和模型
echo ""
echo "🤖 创建AI生成供应商和模型..."
npx tsx prisma/seed-ai-generation.ts

# 3. 创建LLM供应商（可选）
if [ -f "prisma/seed-llm-providers.ts" ]; then
  echo ""
  echo "💬 创建LLM供应商..."
  npx tsx prisma/seed-llm-providers.ts
fi

# 4. 创建聊天供应商（可选）
if [ -f "prisma/seed-chat-providers.ts" ]; then
  echo ""
  echo "💬 创建聊天供应商..."
  npx tsx prisma/seed-chat-providers.ts
fi

# 5. 导入现有媒体文件
echo ""
echo "📁 导入现有媒体文件..."
npx tsx scripts/import-existing-media.ts

echo ""
echo "✅ 所有数据初始化完成！"
echo ""
echo "数据统计："
sqlite3 $DB_PATH "SELECT '用户: ' || COUNT(*) FROM users;"
sqlite3 $DB_PATH "SELECT '媒体文件: ' || COUNT(*) FROM media_files;"
sqlite3 $DB_PATH "SELECT 'AI供应商: ' || COUNT(*) FROM ai_providers;"
sqlite3 $DB_PATH "SELECT 'AI模型: ' || COUNT(*) FROM ai_models;"
