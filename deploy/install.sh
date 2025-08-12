#!/bin/bash

# YT-DLP Service 跨平台安装脚本
# 支持 Ubuntu 20.04+ 和 macOS 系统

set -e  # 遇到错误立即退出

# 颜色输出函数
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

log_system() {
    echo -e "${BLUE}[SYSTEM]${NC} $1"
}

# 清理所有可能的镜像源配置
cleanup_mirror_configs() {
    log_info "清理可能存在的镜像源配置..."
    
    # 清理 Git 全局配置中的镜像源
    if git config --global --get url."https://gitee.com/mirrors".insteadOf >/dev/null 2>&1; then
        git config --global --unset url."https://gitee.com/mirrors".insteadOf
        log_info "已清理 Git Gitee 镜像源配置"
    fi
    
    # 清理可能存在的 Homebrew 镜像源配置
    if [ -d "$HOME/.homebrew" ]; then
        log_info "检测到旧的 Homebrew 安装，正在清理..."
        rm -rf "$HOME/.homebrew"
    fi
    
    # 清理可能存在的 Homebrew 配置
    if [ -f "$HOME/.zprofile" ]; then
        # 备份原文件
        cp "$HOME/.zprofile" "$HOME/.zprofile.backup.$(date +%Y%m%d_%H%M%S)"
        
        # 移除包含 gitee 的行
        sed -i.bak '/gitee/d' "$HOME/.zprofile" 2>/dev/null || true
        sed -i.bak '/mirrors\.gitee/d' "$HOME/.zprofile" 2>/dev/null || true
        
        log_info "已清理 .zprofile 中的 Gitee 相关配置"
    fi
    
    # 清理可能存在的 Homebrew 环境变量
    unset HOMEBREW_BOTTLE_DOMAIN 2>/dev/null || true
    unset HOMEBREW_CORE_GIT_REMOTE 2>/dev/null || true
}

# 国内镜像源配置函数
setup_china_mirrors() {
    log_info "配置国内镜像源以加速下载..."
    
    # 配置 npm 使用淘宝镜像
    if command -v npm >/dev/null 2>&1; then
        if ! npm config get registry | grep -q "npmmirror.com"; then
            npm config set registry https://registry.npmmirror.com
            log_info "已配置 NPM 使用淘宝镜像"
        fi
    fi
    
    # 配置 pip 使用清华镜像
    if command -v pip3 >/dev/null 2>&1; then
        if ! pip3 config list | grep -q "index-url.*pypi.tuna.tsinghua.edu.cn"; then
            pip3 config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
            log_info "已配置 pip 使用清华镜像"
        fi
    fi
}

# 安装 Homebrew 函数（支持镜像源）
install_homebrew_with_mirror() {
    local max_retries=2
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        log_info "尝试安装 Homebrew (第 $((retry_count + 1)) 次)..."
        
        if [ $retry_count -eq 0 ]; then
            # 第一次尝试：官方源
            log_info "使用官方源安装 Homebrew..."
            if /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; then
                log_info "Homebrew 官方源安装成功！"
                return 0
            else
                log_warn "官方源安装失败，尝试使用国内镜像源..."
                retry_count=$((retry_count + 1))
            fi
        else
            # 第二次尝试：清华大学镜像源（更稳定）
            log_info "使用清华大学镜像源安装 Homebrew..."
            if /bin/bash -c "$(curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/install/master/install.sh)"; then
                log_info "Homebrew 清华镜像源安装成功！"
                return 0
            fi
            retry_count=$((retry_count + 1))
        fi
        
        if [ $retry_count -lt $max_retries ]; then
            log_warn "安装失败，等待 5 秒后重试..."
            sleep 5
        fi
    done
    
    log_error "所有安装方式都失败了，请检查网络连接或手动安装 Homebrew"
    return 1
}

# 配置 Homebrew 使用国内镜像源
configure_homebrew_mirrors() {
    log_info "配置 Homebrew 使用国内镜像源..."
    
    # 备份原始配置
    if [ -f "$HOME/.zprofile" ]; then
        cp "$HOME/.zprofile" "$HOME/.zprofile.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # 配置 Homebrew 使用清华大学镜像源（更稳定）
    if command -v brew >/dev/null 2>&1; then
        log_info "配置 Homebrew 使用清华大学镜像源..."
        
        # 配置 Homebrew 核心仓库镜像
        git -C "$(brew --repo)" remote set-url origin https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git
        
        # 配置 Homebrew Core 镜像
        if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-core" ]; then
            git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-core" remote set-url origin https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git
        fi
        
        # 配置 Homebrew Cask 镜像
        if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" ]; then
            git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" remote set-url origin https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-cask.git
        fi
        
        # 配置 Homebrew Bottles 镜像
        echo 'export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles' >> ~/.zprofile
        echo 'export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"' >> ~/.zprofile
        
        log_info "Homebrew 镜像源配置完成"
    fi
}

# 系统检测函数
detect_system() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [[ -f /etc/os-release ]]; then
            . /etc/os-release
            if [[ "$ID" == "ubuntu" ]]; then
                echo "ubuntu"
                return
            fi
        fi
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

# 获取系统信息
SYSTEM_TYPE=$(detect_system)
SYSTEM_NAME=""

case $SYSTEM_TYPE in
    "ubuntu")
        SYSTEM_NAME="Ubuntu"
        ;;
    "macos")
        SYSTEM_NAME="macOS"
        ;;
    "linux")
        SYSTEM_NAME="Linux"
        ;;
    *)
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
        ;;
esac

echo "🚀 开始安装 YT-DLP Service..."
log_system "检测到系统: $SYSTEM_NAME"

# 检查是否为 root 用户 (仅Linux系统)
if [[ "$SYSTEM_TYPE" == "linux"* && $EUID -eq 0 ]]; then
   log_error "请不要使用 root 用户运行此脚本"
   exit 1
fi

# 清理可能存在的镜像源配置
cleanup_mirror_configs

# 辅助函数：检查并安装包
install_package_if_missing() {
    local package_name="$1"
    local brew_package_name="$2"
    
    if ! command -v "$package_name" >/dev/null 2>&1; then
        log_info "$package_name 未安装，正在安装..."
        brew install "$brew_package_name"
    else
        log_info "$package_name 已安装"
    fi
}

# 配置国内镜像源
setup_china_mirrors

# Ubuntu系统安装函数
install_ubuntu() {
    log_info "使用 Ubuntu 安装方式..."
    
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
    log_info "检查并安装 Google Chrome 浏览器..."
    if ! command -v google-chrome >/dev/null 2>&1; then
        log_info "Google Chrome 未安装，正在安装..."
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
    log_info "检查并安装 Node.js 20.x..."
    if ! command -v node >/dev/null 2>&1; then
        log_info "Node.js 未安装，正在安装..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    else
        log_info "Node.js 已安装，检查版本..."
        node_version=$(node --version 2>/dev/null || echo "未知版本")
        log_info "当前 Node.js 版本: $node_version"
        
        # 检查版本是否满足要求
        if [[ "$node_version" =~ ^v([0-9]+)\. ]]; then
            major_version="${BASH_REMATCH[1]}"
            if [ "$major_version" -lt 18 ]; then
                log_warn "Node.js 版本过低 ($node_version)，需要 18.0.0 或更高版本"
                log_info "正在更新 Node.js..."
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                sudo apt install -y nodejs
            else
                log_info "Node.js 版本满足要求 ($node_version)"
            fi
        else
            log_warn "无法解析 Node.js 版本，尝试更新..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt install -y nodejs
        fi
    fi

    # 安装 Python 3 和 pip
    log_info "检查并安装 Python 3 和 pip..."
    if ! command -v python3 >/dev/null 2>&1; then
        log_info "Python 3 未安装，正在安装..."
        sudo apt install -y python3 python3-pip python3-venv
    else
        log_info "Python 3 已安装，检查版本..."
        python_version=$(python3 --version 2>/dev/null || echo "未知版本")
        log_info "当前 Python 版本: $python_version"
    fi

    # 安装 FFmpeg
    log_info "检查并安装 FFmpeg..."
    if ! command -v ffmpeg >/dev/null 2>&1; then
        log_info "FFmpeg 未安装，正在安装..."
        sudo apt install -y ffmpeg
    else
        log_info "FFmpeg 已安装，检查版本..."
        ffmpeg_version=$(ffmpeg -version 2>/dev/null | head -n 1 || echo "未知版本")
        log_info "当前 FFmpeg 版本: $ffmpeg_version"
    fi

    # 安装 SQLite3
    log_info "检查并安装 SQLite3..."
    if ! command -v sqlite3 >/dev/null 2>&1; then
        log_info "SQLite3 未安装，正在安装..."
        sudo apt install -y sqlite3
    else
        log_info "SQLite3 已安装，检查版本..."
        sqlite_version=$(sqlite3 --version 2>/dev/null || echo "未知版本")
        log_info "当前 SQLite3 版本: $sqlite_version"
    fi

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
}

# macOS系统安装函数
install_macos() {
    log_info "使用 macOS 安装方式..."
    
    # 检查是否安装了 Homebrew
    if ! command -v brew >/dev/null 2>&1; then
        log_info "开始安装 Homebrew..."
        if install_homebrew_with_mirror; then
            log_info "Homebrew 安装成功！"
        else
            log_error "Homebrew 安装失败，请手动安装后重新运行脚本"
            exit 1
        fi
        
        # 将 Homebrew 添加到 PATH
        if [[ -f /opt/homebrew/bin/brew ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f /usr/local/bin/brew ]]; then
            echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/usr/local/bin/brew shellenv)"
        fi
        
        # 配置 Homebrew 使用国内镜像源
        configure_homebrew_mirrors
        
        log_info "Homebrew 安装和配置完成"
    else
        log_info "Homebrew 已安装，更新到最新版本..."
        brew update
    fi

    # 安装基础依赖
    log_info "检查并安装基础依赖..."
    install_package_if_missing "curl" "curl"
    install_package_if_missing "git" "git"
    install_package_if_missing "wget" "wget"

    # 安装 Node.js
    log_info "检查并安装 Node.js..."
    if ! command -v node >/dev/null 2>&1; then
        log_info "Node.js 未安装，正在安装..."
        brew install node
    else
        log_info "Node.js 已安装，检查版本..."
        node_version=$(node --version 2>/dev/null || echo "未知版本")
        log_info "当前 Node.js 版本: $node_version"
        
        # 检查版本是否满足要求
        if [[ "$node_version" =~ ^v([0-9]+)\. ]]; then
            major_version="${BASH_REMATCH[1]}"
            if [ "$major_version" -lt 18 ]; then
                log_warn "Node.js 版本过低 ($node_version)，需要 18.0.0 或更高版本"
                log_info "正在更新 Node.js..."
                brew upgrade node
            else
                log_info "Node.js 版本满足要求 ($node_version)"
            fi
        else
            log_warn "无法解析 Node.js 版本，尝试更新..."
            brew upgrade node
        fi
    fi

    # 安装 Python 3
    log_info "检查并安装 Python 3..."
    if ! command -v python3 >/dev/null 2>&1; then
        log_info "Python 3 未安装，正在安装..."
        brew install python
    else
        log_info "Python 3 已安装，检查版本..."
        python_version=$(python3 --version 2>/dev/null || echo "未知版本")
        log_info "当前 Python 版本: $python_version"
    fi

    # 安装 FFmpeg
    log_info "检查并安装 FFmpeg..."
    if ! command -v ffmpeg >/dev/null 2>&1; then
        log_info "FFmpeg 未安装，正在安装..."
        brew install ffmpeg
    else
        log_info "FFmpeg 已安装，检查版本..."
        ffmpeg_version=$(ffmpeg -version 2>/dev/null | head -n 1 || echo "未知版本")
        log_info "当前 FFmpeg 版本: $ffmpeg_version"
    fi

    # 安装 SQLite3
    log_info "检查并安装 SQLite3..."
    if ! command -v sqlite3 >/dev/null 2>&1; then
        log_info "SQLite3 未安装，正在安装..."
        brew install sqlite
    else
        log_info "SQLite3 已安装，检查版本..."
        sqlite_version=$(sqlite3 --version 2>/dev/null || echo "未知版本")
        log_info "当前 SQLite3 版本: $sqlite_version"
    fi

    # 检查 Chrome 浏览器
    log_info "检查 Chrome 浏览器..."
    if [[ -d "/Applications/Google Chrome.app" ]]; then
        chrome_version=$(/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version 2>/dev/null || echo "未知版本")
        log_info "Google Chrome 已安装: $chrome_version"
    else
        log_warn "未检测到 Google Chrome，请手动安装或从官网下载"
        log_info "下载地址: https://www.google.com/chrome/"
    fi

    # 配置 macOS 特定的环境变量
    log_info "配置 macOS 环境变量..."
    if [[ -d "/Applications/Google Chrome.app" ]]; then
        echo 'export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"' >> ~/.zprofile
        echo 'export PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"' >> ~/.zprofile
    fi
    echo 'export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true' >> ~/.zprofile
    
    # 重新加载配置
    source ~/.zprofile || true
}

# 通用安装函数
install_common() {
    # 验证 Node.js 安装
    log_info "验证 Node.js 安装..."
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js 未安装或安装失败"
        exit 1
    fi
    
    node_version=$(node --version)
    npm_version=$(npm --version)
    log_info "Node.js 版本: $node_version"
    log_info "NPM 版本: $npm_version"

    # 检查Node.js版本是否满足要求 (>=18.0.0)
    if [[ "$node_version" =~ ^v([0-9]+)\. ]]; then
        node_major_version="${BASH_REMATCH[1]}"
        if [ "$node_major_version" -lt 18 ]; then
            log_error "Node.js 版本过低，需要 18.0.0 或更高版本"
            exit 1
        fi
    else
        log_error "无法解析 Node.js 版本: $node_version"
        exit 1
    fi

    # 更新npm到最新版本
    log_info "更新 NPM 到最新版本..."
    npm install -g npm@latest

    # 验证 Python 安装
    log_info "验证 Python 安装..."
    if ! command -v python3 >/dev/null 2>&1; then
        log_error "Python 3 未安装或安装失败"
        exit 1
    fi
    
    python_version=$(python3 --version)
    log_info "Python 版本: $python_version"

    # 验证 FFmpeg 安装
    log_info "验证 FFmpeg 安装..."
    if ! command -v ffmpeg >/dev/null 2>&1; then
        log_error "FFmpeg 未安装或安装失败"
        exit 1
    fi
    
    ffmpeg_version=$(ffmpeg -version | head -n 1)
    log_info "FFmpeg 版本: $ffmpeg_version"

    # 安装 yt-dlp
    log_info "检查并安装 yt-dlp..."
    if ! command -v yt-dlp >/dev/null 2>&1; then
        log_info "yt-dlp 未安装，正在安装..."
        python3 -m pip install --user --upgrade yt-dlp
        
        # 安装完成后，将用户本地 bin 目录添加到 PATH
        if [[ "$SYSTEM_TYPE" == "macos" ]]; then
            # 获取 Python 用户安装目录
            PYTHON_USER_BIN=$(python3 -m site --user-base)/bin
            if [[ -d "$PYTHON_USER_BIN" ]]; then
                if ! grep -q "$PYTHON_USER_BIN" ~/.zprofile; then
                    echo "export PATH=\"$PYTHON_USER_BIN:\$PATH\"" >> ~/.zprofile
                    log_info "已将 $PYTHON_USER_BIN 添加到 PATH"
                fi
                # 立即添加到当前会话的 PATH
                export PATH="$PYTHON_USER_BIN:$PATH"
            fi
        else
            # Linux 系统
            if ! grep -q '$HOME/.local/bin' ~/.bashrc; then
                echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
                log_info "已将 ~/.local/bin 添加到 PATH"
            fi
            # 立即添加到当前会话的 PATH
            export PATH="$HOME/.local/bin:$PATH"
        fi
    else
        log_info "yt-dlp 已安装，检查版本..."
        ytdlp_version=$(yt-dlp --version 2>/dev/null || echo "未知版本")
        log_info "当前 yt-dlp 版本: $ytdlp_version"
        
        # 更新到最新版本
        log_info "更新 yt-dlp 到最新版本..."
        python3 -m pip install --user --upgrade yt-dlp
    fi

    # 验证 yt-dlp 安装
    log_info "验证 yt-dlp 安装..."
    
    # 尝试多个可能的路径
    ytdlp_path=""
    possible_paths=(
        "$(which yt-dlp 2>/dev/null)"
        "$HOME/.local/bin/yt-dlp"
        "$(python3 -m site --user-base)/bin/yt-dlp"
        "/usr/local/bin/yt-dlp"
        "/usr/bin/yt-dlp"
    )
    
    for path in "${possible_paths[@]}"; do
        if [[ -n "$path" && -f "$path" ]]; then
            ytdlp_path="$path"
            break
        fi
    done
    
    if [[ -n "$ytdlp_path" && -f "$ytdlp_path" ]]; then
        ytdlp_version=$("$ytdlp_path" --version 2>/dev/null || echo "未知版本")
        log_info "yt-dlp 版本: $ytdlp_version"
        log_info "yt-dlp 路径: $ytdlp_path"
    else
        log_error "yt-dlp 安装失败或无法找到"
        log_info "尝试手动安装 yt-dlp..."
        
        # 手动安装并设置 PATH
        python3 -m pip install --user --upgrade yt-dlp
        
        # 获取 Python 用户安装目录
        PYTHON_USER_BIN=$(python3 -m site --user-base)/bin
        if [[ -d "$PYTHON_USER_BIN" ]]; then
            export PATH="$PYTHON_USER_BIN:$PATH"
            if [[ -f "$PYTHON_USER_BIN/yt-dlp" ]]; then
                ytdlp_path="$PYTHON_USER_BIN/yt-dlp"
                ytdlp_version=$("$ytdlp_path" --version 2>/dev/null || echo "未知版本")
                log_info "yt-dlp 手动安装成功: $ytdlp_version"
                log_info "yt-dlp 路径: $ytdlp_path"
            else
                log_error "yt-dlp 手动安装仍然失败"
                exit 1
            fi
        else
            log_error "无法找到 Python 用户安装目录"
            exit 1
        fi
    fi

    # 重新加载配置文件以应用 PATH 更改
    if [[ "$SYSTEM_TYPE" == "macos" ]]; then
        source ~/.zprofile || true
    else
        source ~/.bashrc || true
    fi

    # 安装 PM2 (全局)
    log_info "检查并安装 PM2..."
    if ! command -v pm2 >/dev/null 2>&1; then
        log_info "PM2 未安装，正在安装..."
        npm install -g pm2
    else
        log_info "PM2 已安装，检查版本..."
        pm2_version=$(pm2 --version 2>/dev/null || echo "未知版本")
        log_info "当前 PM2 版本: $pm2_version"
        
        # 更新到最新版本
        log_info "更新 PM2 到最新版本..."
        npm install -g pm2@latest
    fi

    # 验证 PM2 安装
    pm2_version=$(pm2 --version)
    log_info "PM2 版本: $pm2_version"

    # 设置 PM2 开机自启 (仅Linux)
    if [[ "$SYSTEM_TYPE" == "linux"* ]]; then
        log_info "配置 PM2 开机自启..."
        pm2 startup | grep -E '^sudo.*systemctl' | sh || log_warn "PM2 startup 配置可能需要手动执行"
    else
        log_warn "macOS 系统需要手动配置 PM2 开机自启"
        log_info "可以使用 'pm2 startup' 命令生成配置指令"
    fi

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

    # 验证 SQLite3 安装
    log_info "验证 SQLite3 安装..."
    if ! command -v sqlite3 >/dev/null 2>&1; then
        log_error "SQLite3 未安装或安装失败"
        exit 1
    fi
    
    sqlite_version=$(sqlite3 --version)
    log_info "SQLite3 版本: $sqlite_version"

    # 输出环境信息摘要
    log_info "=== 安装完成 ==="
    echo ""
    log_info "系统环境信息:"
    echo "  - 操作系统: $SYSTEM_NAME"
    echo "  - Node.js: $node_version"
    echo "  - NPM: $npm_version"
    echo "  - Python: $python_version"
    echo "  - FFmpeg: 已安装"
    echo "  - yt-dlp: $ytdlp_version (路径: $ytdlp_path)"
    echo "  - PM2: $pm2_version"
    echo "  - SQLite3: $sqlite_version"
    
    if [[ "$SYSTEM_TYPE" == "macos" ]]; then
        if [[ -d "/Applications/Google Chrome.app" ]]; then
            echo "  - Google Chrome: $chrome_version"
        else
            echo "  - Google Chrome: 需要手动安装"
        fi
        echo "  - Puppeteer: 将使用系统Chrome"
    else
        echo "  - Google Chrome: $chrome_version"
        echo "  - Puppeteer/Chrome 依赖: 已安装"
    fi
    
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
    
    if [[ "$SYSTEM_TYPE" == "macos" ]]; then
        log_warn "请注意: 需要重新登录或运行 'source ~/.zprofile' 来使 PATH 更新生效"
    else
        log_warn "请注意: 需要重新登录或运行 'source ~/.bashrc' 来使 PATH 更新生效"
    fi

    # 输出 yt-dlp 路径到文件，供后续脚本使用
    echo "$ytdlp_path" > /tmp/ytdlp_path.txt
    log_info "yt-dlp 路径已保存到 /tmp/ytdlp_path.txt"

    log_info "✅ 安装脚本执行完成！"
}

# 主安装流程
main() {
    case $SYSTEM_TYPE in
        "ubuntu")
            install_ubuntu
            ;;
        "macos")
            install_macos
            ;;
        *)
            log_error "不支持的操作系统: $SYSTEM_TYPE"
            exit 1
            ;;
    esac
    
    install_common
}

# 执行主安装流程
main 