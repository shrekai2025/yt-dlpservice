#!/bin/bash

# Ubuntu服务器系统诊断脚本
# 用于检查yt-dlpservice项目所需的所有依赖是否正确安装和配置

echo "🔍 yt-dlpservice 系统诊断报告"
echo "=================================="
echo ""

# 检查操作系统信息
echo "📋 系统信息:"
echo "  - OS: $(lsb_release -d | cut -f2)"
echo "  - 内核: $(uname -r)"
echo "  - 架构: $(uname -m)"
echo ""

# 检查 Node.js
echo "📦 Node.js 检查:"
if command -v node &> /dev/null; then
    echo "  ✅ Node.js: $(node --version)"
    echo "  ✅ npm: $(npm --version)"
else
    echo "  ❌ Node.js 未安装"
fi
echo ""

# 检查 FFmpeg
echo "🎵 FFmpeg 检查:"
if command -v ffmpeg &> /dev/null; then
    echo "  ✅ FFmpeg: $(ffmpeg -version | head -1)"
    echo "  ✅ ffprobe: $(ffprobe -version | head -1)"
    
    # 测试FFmpeg功能
    echo "  🧪 测试FFmpeg音频处理能力..."
    if ffmpeg -f lavfi -i "sine=frequency=1000:duration=1" -ac 1 -ar 16000 -b:a 32k -f mp3 /tmp/test_audio.mp3 -y &>/dev/null; then
        echo "  ✅ FFmpeg音频处理测试通过"
        rm -f /tmp/test_audio.mp3
    else
        echo "  ❌ FFmpeg音频处理测试失败"
    fi
else
    echo "  ❌ FFmpeg 未安装"
    echo "  💡 安装命令: sudo apt install ffmpeg"
fi
echo ""

# 检查 yt-dlp
echo "📹 yt-dlp 检查:"
if command -v yt-dlp &> /dev/null; then
    echo "  ✅ yt-dlp: $(yt-dlp --version)"
else
    echo "  ❌ yt-dlp 未安装"
    echo "  💡 安装命令: sudo pip3 install --user yt-dlp"
fi
echo ""

# 检查 Chromium/Chrome
echo "🌐 浏览器检查:"
if command -v chromium-browser &> /dev/null; then
    echo "  ✅ Chromium: $(chromium-browser --version)"
elif command -v google-chrome &> /dev/null; then
    echo "  ✅ Chrome: $(google-chrome --version)"
elif command -v chromium &> /dev/null; then
    echo "  ✅ Chromium: $(chromium --version)"
else
    echo "  ❌ 未找到 Chromium 或 Chrome"
    echo "  💡 安装命令: sudo apt install chromium-browser"
fi
echo ""

# 检查 Python
echo "🐍 Python 检查:"
if command -v python3 &> /dev/null; then
    echo "  ✅ Python3: $(python3 --version)"
    if command -v pip3 &> /dev/null; then
        echo "  ✅ pip3: $(pip3 --version)"
    else
        echo "  ❌ pip3 未安装"
    fi
else
    echo "  ❌ Python3 未安装"
fi
echo ""

# 检查项目目录和权限
echo "📁 项目检查:"
if [ -f "package.json" ]; then
    echo "  ✅ 项目根目录正确"
    echo "  📦 项目名称: $(node -p "require('./package.json').name")"
    echo "  🏷️ 项目版本: $(node -p "require('./package.json').version")"
else
    echo "  ❌ 未在项目根目录或package.json不存在"
fi

# 检查关键目录
for dir in "temp" "logs" "data"; do
    if [ -d "$dir" ]; then
        echo "  ✅ $dir/ 目录存在"
        echo "    权限: $(ls -ld $dir | awk '{print $1, $3, $4}')"
    else
        echo "  ⚠️ $dir/ 目录不存在"
    fi
done
echo ""

# 检查环境变量
echo "⚙️ 环境变量检查:"
if [ -f ".env" ]; then
    echo "  ✅ .env 文件存在"
else
    echo "  ⚠️ .env 文件不存在"
fi

if [ -f ".env.production" ]; then
    echo "  ✅ .env.production 文件存在"
else
    echo "  ⚠️ .env.production 文件不存在"
fi
echo ""

# 检查网络连接
echo "🌐 网络连接检查:"
if ping -c 1 google.com &> /dev/null; then
    echo "  ✅ 互联网连接正常"
else
    echo "  ❌ 互联网连接异常"
fi

if curl -s --head https://www.xiaoyuzhoufm.com &> /dev/null; then
    echo "  ✅ 小宇宙网站可访问"
else
    echo "  ❌ 小宇宙网站无法访问"
fi
echo ""

# 检查端口占用
echo "🔌 端口检查:"
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "  ⚠️ 端口3000已被占用"
    echo "    $(netstat -tlnp 2>/dev/null | grep ":3000 ")"
else
    echo "  ✅ 端口3000可用"
fi
echo ""

# 系统资源检查
echo "💻 系统资源:"
echo "  - 内存: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
echo "  - 磁盘: $(df -h . | tail -1 | awk '{print $3 "/" $2 " (" $5 " 已用)"}')"
echo "  - 负载: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# 总结
echo "📊 诊断总结:"
echo "=================================="

# 检查关键依赖
missing_deps=()
if ! command -v node &> /dev/null; then missing_deps+=("Node.js"); fi
if ! command -v ffmpeg &> /dev/null; then missing_deps+=("FFmpeg"); fi
if ! command -v yt-dlp &> /dev/null; then missing_deps+=("yt-dlp"); fi
if ! command -v chromium-browser &> /dev/null && ! command -v google-chrome &> /dev/null && ! command -v chromium &> /dev/null; then
    missing_deps+=("Chromium/Chrome")
fi

if [ ${#missing_deps[@]} -eq 0 ]; then
    echo "✅ 所有关键依赖已安装"
    echo "🚀 系统准备就绪，可以运行 yt-dlpservice"
else
    echo "❌ 缺少以下依赖: ${missing_deps[*]}"
    echo "💡 运行安装脚本: ./deploy/install-dependencies.sh"
fi

echo ""
echo "🔧 如果仍有问题，请检查日志文件或联系技术支持"
echo "" 