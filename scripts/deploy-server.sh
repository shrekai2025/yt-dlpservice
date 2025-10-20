#!/bin/bash

# 服务器部署脚本
# 使用方法: ./scripts/deploy-server.sh [app_directory]

set -e

APP_DIR=${1:-/opt/yt-dlpservice}
DB_PATH="$APP_DIR/data/app.db"

echo "🚀 开始部署到服务器..."
echo "应用目录: $APP_DIR"
echo "数据库路径: $DB_PATH"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误：请在项目根目录运行此脚本"
  exit 1
fi

# 1. 创建必要的目录
echo "📁 创建目录..."
mkdir -p "$APP_DIR/data"
mkdir -p "$APP_DIR/data/media-uploads"
mkdir -p "$APP_DIR/data/media-thumbnails"
mkdir -p "$APP_DIR/logs"

# 2. 检查环境变量
echo "🔍 检查环境变量..."
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:./data/app.db"
  echo "⚠️  DATABASE_URL 未设置，使用默认值: $DATABASE_URL"
fi

# 3. 安装依赖
echo "📦 安装依赖..."
npm ci --only=production

# 4. 运行数据库迁移
echo "🗄️  运行数据库迁移..."
npx prisma migrate deploy

# 5. 生成 Prisma Client
echo "⚙️  生成 Prisma Client..."
npx prisma generate

# 6. 初始化数据（如果数据库是空的）
echo "🌱 检查并初始化数据..."
USER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "📝 创建初始数据..."
  npx tsx prisma/seed-user.ts
  npx tsx prisma/seed-ai-generation.ts

  # 如果有媒体文件，导入它们
  if [ -d "$APP_DIR/data/media-uploads" ] && [ "$(ls -A $APP_DIR/data/media-uploads)" ]; then
    echo "📁 导入现有媒体文件..."
    npx tsx scripts/import-existing-media.ts
  fi
else
  echo "✅ 数据库已有数据，跳过初始化"
fi

# 7. 构建应用
echo "🏗️  构建应用..."
npm run build

# 8. 设置文件权限
echo "🔒 设置文件权限..."
chmod -R 755 "$APP_DIR"
chmod 666 "$DB_PATH" 2>/dev/null || true

echo ""
echo "✅ 部署完成！"
echo ""
echo "数据统计："
sqlite3 "$DB_PATH" "SELECT '用户: ' || COUNT(*) FROM users;"
sqlite3 "$DB_PATH" "SELECT '媒体文件: ' || COUNT(*) FROM media_files;"
sqlite3 "$DB_PATH" "SELECT 'AI供应商: ' || COUNT(*) FROM ai_providers;"
sqlite3 "$DB_PATH" "SELECT 'AI模型: ' || COUNT(*) FROM ai_models;"
echo ""
echo "启动命令："
echo "  npm start                    # 直接启动"
echo "  pm2 start npm -- start       # 使用 PM2"
echo "  pm2 start npm -i max -- start  # PM2 集群模式"
