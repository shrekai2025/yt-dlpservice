#!/bin/bash

# Ubuntu服务器依赖安装脚本
# 用于安装yt-dlpservice项目所需的所有系统依赖

set -e

echo "🚀 开始安装 yt-dlpservice 系统依赖..."

# 更新包列表
echo "📦 更新系统包列表..."
sudo apt update

# 安装基础依赖
echo "🔧 安装基础系统依赖..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    python3-pip

# 安装 FFmpeg（音频压缩必需）
echo "🎵 安装 FFmpeg（音频处理）..."
sudo apt install -y ffmpeg

# 验证 FFmpeg 安装
echo "✅ 验证 FFmpeg 安装..."
ffmpeg -version | head -1

# 安装 yt-dlp（视频下载）
echo "📹 安装 yt-dlp（视频下载工具）..."
sudo pip3 install yt-dlp

# 验证 yt-dlp 安装
echo "✅ 验证 yt-dlp 安装..."
yt-dlp --version

# 安装 Chrome/Chromium（Puppeteer需要）
echo "🌐 安装 Chromium（网页解析）..."
sudo apt install -y chromium-browser

# 验证 Chromium 安装
echo "✅ 验证 Chromium 安装..."
chromium-browser --version

# 安装 Node.js（如果还没有安装）
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 验证 Node.js 安装
echo "✅ 验证 Node.js 安装..."
node --version
npm --version

echo ""
echo "🎉 所有系统依赖安装完成！"
echo ""
echo "📋 已安装的组件："
echo "  - FFmpeg: $(ffmpeg -version | head -1)"
echo "  - yt-dlp: $(yt-dlp --version)"
echo "  - Chromium: $(chromium-browser --version)"
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo ""
echo "🔄 接下来请运行: npm install"
echo "" 