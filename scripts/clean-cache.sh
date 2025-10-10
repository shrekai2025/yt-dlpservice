#!/bin/bash

# Next.js 开发缓存清理脚本
# 用于解决开发时的 Internal Server Error 和缓存问题

echo "🧹 开始清理 Next.js 缓存..."

# 1. 停止所有 Next.js 相关进程
echo "⏹️  停止开发服务器..."
pkill -f "next-server" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
sleep 1

# 2. 清理缓存目录
echo "🗑️  清理缓存目录..."

# 清理 .next 构建缓存
if [ -d ".next" ]; then
    # 尝试普通删除
    rm -rf .next 2>/dev/null || {
        echo "⚠️  需要权限清理 .next，请手动运行: sudo rm -rf .next"
    }
fi

# 清理 node_modules 缓存
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
fi

# 清理 Turbopack 缓存
if [ -d ".turbo" ]; then
    rm -rf .turbo
fi

echo "✅ 缓存清理完成"
echo ""
echo "🚀 重启开发服务器..."
npm run dev
