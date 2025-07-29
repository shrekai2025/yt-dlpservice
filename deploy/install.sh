#!/bin/bash

# YT-DLP Service Ubuntu 服务器安装脚本
# 适用于 Ubuntu 20.04+ 系统

set -e  # 遇到错误立即退出

echo "🚀 开始安装 YT-DLP Service..."

# 颜色输出函数
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
if [[ $EUID -eq 0 ]]; then
   log_error "请不要使用 root 用户运行此脚本"
   exit 1
fi

# 更新系统包
log_info "更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装基础依赖
log_info "安装基础依赖..."
sudo apt install -y curl wget git build-essential software-properties-common

# 安装 Puppeteer 依赖（Chromium 浏览器依赖）
log_info "安装 Puppeteer/Chromium 依赖..."
sudo apt install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

# 安装 Google Chrome 浏览器
log_info "安装 Google Chrome 浏览器..."
if ! command -v google-chrome >/dev/null 2>&1; then
    # 下载 Chrome 的 GPG 密钥
    log_info "添加 Google Chrome 软件源..."
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    
    # 添加 Chrome 软件源
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    
    # 更新软件包列表并安装 Chrome
    sudo apt update
    sudo apt install -y google-chrome-stable
    
    # 验证安装
    if command -v google-chrome >/dev/null 2>&1; then
        chrome_version=$(google-chrome --version 2>/dev/null || echo "未知版本")
        log_info "Google Chrome 安装成功: $chrome_version"
    else
        log_warn "Google Chrome 安装可能失败，将在应用运行时尝试自动安装"
    fi
else
    chrome_version=$(google-chrome --version 2>/dev/null || echo "未知版本")
    log_info "Google Chrome 已安装: $chrome_version"
fi

# 安装 Node.js 20.x (LTS)
log_info "安装 Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证 Node.js 安装
node_version=$(node --version)
npm_version=$(npm --version)
log_info "Node.js 版本: $node_version"
log_info "NPM 版本: $npm_version"

# 检查Node.js版本是否满足要求 (>=18.0.0)
node_major_version=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$node_major_version" -lt 18 ]; then
    log_error "Node.js 版本过低，需要 18.0.0 或更高版本"
    exit 1
fi

# 更新npm到最新版本
log_info "更新 NPM 到最新版本..."
sudo npm install -g npm@latest

# 安装 Python 3 和 pip
log_info "安装 Python 3 和 pip..."
sudo apt install -y python3 python3-pip python3-venv

# 验证 Python 安装
python_version=$(python3 --version)
log_info "Python 版本: $python_version"

# 安装 FFmpeg
log_info "安装 FFmpeg..."
sudo apt install -y ffmpeg

# 验证 FFmpeg 安装
ffmpeg_version=$(ffmpeg -version | head -n 1)
log_info "FFmpeg 版本: $ffmpeg_version"

# 安装 yt-dlp
log_info "安装 yt-dlp..."
python3 -m pip install --user --upgrade yt-dlp

# 验证 yt-dlp 安装
ytdlp_path=$(which yt-dlp || echo "$HOME/.local/bin/yt-dlp")
if [ -f "$ytdlp_path" ]; then
    ytdlp_version=$($ytdlp_path --version)
    log_info "yt-dlp 版本: $ytdlp_version"
    log_info "yt-dlp 路径: $ytdlp_path"
else
    log_error "yt-dlp 安装失败"
    exit 1
fi

# 将用户的本地 bin 目录添加到 PATH
if ! grep -q '$HOME/.local/bin' ~/.bashrc; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    log_info "已将 ~/.local/bin 添加到 PATH"
fi

# 重新加载 bashrc
source ~/.bashrc || true

# 安装 PM2 (全局)
log_info "安装 PM2 进程管理器..."
sudo npm install -g pm2

# 验证 PM2 安装
pm2_version=$(pm2 --version)
log_info "PM2 版本: $pm2_version"

# 设置 PM2 开机自启
log_info "配置 PM2 开机自启..."
pm2 startup | grep -E '^sudo.*systemctl' | sh || log_warn "PM2 startup 配置可能需要手动执行"

# 创建应用目录
APP_DIR="$HOME/yt-dlpservice"
log_info "创建应用目录: $APP_DIR"
mkdir -p "$APP_DIR"

# 创建临时文件目录
TEMP_DIR="/tmp/yt-dlpservice"
log_info "创建临时文件目录: $TEMP_DIR"
mkdir -p "$TEMP_DIR"
chmod 755 "$TEMP_DIR"

# 创建数据目录
DATA_DIR="$APP_DIR/data"
log_info "创建数据目录: $DATA_DIR"
mkdir -p "$DATA_DIR"

# 创建浏览器数据目录
BROWSER_DIR="$APP_DIR/data/browser_data"
log_info "创建浏览器数据目录: $BROWSER_DIR"
mkdir -p "$BROWSER_DIR"
chmod 755 "$BROWSER_DIR"

# 创建日志目录
LOG_DIR="$APP_DIR/logs"
log_info "创建日志目录: $LOG_DIR"
mkdir -p "$LOG_DIR"

# 安装 SQLite3 (如果没有)
log_info "安装 SQLite3..."
sudo apt install -y sqlite3

# 验证 SQLite3 安装
sqlite_version=$(sqlite3 --version)
log_info "SQLite3 版本: $sqlite_version"

# 配置防火墙 (如果启用了 ufw)
if command -v ufw >/dev/null 2>&1; then
    log_info "配置防火墙规则..."
    sudo ufw allow 3000/tcp  # Next.js 默认端口
    sudo ufw allow ssh
    log_info "已允许端口 3000 (HTTP) 和 SSH"
fi

# 配置 Chromium 无沙盒模式 (生产环境)
log_info "配置 Chromium 环境..."
echo 'export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false' >> ~/.bashrc
echo 'export PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"' >> ~/.bashrc

# 输出环境信息摘要
log_info "=== 安装完成 ==="
echo ""
log_info "系统环境信息:"
echo "  - 操作系统: $(lsb_release -d | cut -f2)"
echo "  - Node.js: $node_version"
echo "  - NPM: $npm_version"
echo "  - Python: $python_version"
echo "  - FFmpeg: 已安装"
echo "  - yt-dlp: $ytdlp_version (路径: $ytdlp_path)"
echo "  - PM2: $pm2_version"
echo "  - SQLite3: $sqlite_version"
echo "  - Google Chrome: $chrome_version"
echo "  - Puppeteer/Chrome 依赖: 已安装"
echo ""
log_info "应用目录: $APP_DIR"
log_info "临时目录: $TEMP_DIR"
log_info "数据目录: $DATA_DIR"
log_info "浏览器数据目录: $BROWSER_DIR"
log_info "日志目录: $LOG_DIR"
echo ""
log_info "下一步操作:"
echo "  1. 将项目代码克隆到: $APP_DIR"
echo "  2. 复制并配置 .env 文件"
echo "  3. 运行 npm install"
echo "  4. 运行 npm run build"
echo "  5. 使用 PM2 启动应用"
echo ""
log_warn "请注意: 需要重新登录或运行 'source ~/.bashrc' 来使 PATH 更新生效"

# 输出 yt-dlp 路径到文件，供后续脚本使用
echo "$ytdlp_path" > /tmp/ytdlp_path.txt
log_info "yt-dlp 路径已保存到 /tmp/ytdlp_path.txt"

log_info "✅ 安装脚本执行完成！" 