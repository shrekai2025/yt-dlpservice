#!/bin/bash

# 清理所有镜像源配置的脚本
# 用于解决 Gitee 镜像源认证问题

set -e

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

echo "🧹 开始清理镜像源配置..."

# 1. 清理 Git 全局配置
log_info "清理 Git 全局配置..."
if git config --global --get url."https://gitee.com/mirrors".insteadOf >/dev/null 2>&1; then
    git config --global --unset url."https://gitee.com/mirrors".insteadOf
    log_info "已清理 Git Gitee 镜像源配置"
fi

# 2. 清理 Homebrew 相关配置
log_info "清理 Homebrew 配置..."

# 清理可能存在的旧 Homebrew 安装
if [ -d "$HOME/.homebrew" ]; then
    log_info "检测到旧的 Homebrew 安装，正在清理..."
    rm -rf "$HOME/.homebrew"
fi

# 清理 .zprofile 中的镜像源配置
if [ -f "$HOME/.zprofile" ]; then
    # 备份原文件
    backup_file="$HOME/.zprofile.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$HOME/.zprofile" "$backup_file"
    log_info "已备份 .zprofile 到: $backup_file"
    
    # 移除包含镜像源的行
    sed -i.bak '/gitee/d' "$HOME/.zprofile" 2>/dev/null || true
    sed -i.bak '/mirrors\.gitee/d' "$HOME/.zprofile" 2>/dev/null || true
    sed -i.bak '/HOMEBREW_BOTTLE_DOMAIN/d' "$HOME/.zprofile" 2>/dev/null || true
    sed -i.bak '/HOMEBREW_CORE_GIT_REMOTE/d' "$HOME/.zprofile" 2>/dev/null || true
    
    log_info "已清理 .zprofile 中的镜像源配置"
fi

# 3. 清理 .bashrc 中的镜像源配置
if [ -f "$HOME/.bashrc" ]; then
    # 备份原文件
    backup_file="$HOME/.bashrc.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$HOME/.bashrc" "$backup_file"
    log_info "已备份 .bashrc 到: $backup_file"
    
    # 移除包含镜像源的行
    sed -i.bak '/gitee/d' "$HOME/.bashrc" 2>/dev/null || true
    sed -i.bak '/mirrors\.gitee/d' "$HOME/.bashrc" 2>/dev/null || true
    sed -i.bak '/HOMEBREW_BOTTLE_DOMAIN/d' "$HOME/.bashrc" 2>/dev/null || true
    sed -i.bak '/HOMEBREW_CORE_GIT_REMOTE/d' "$HOME/.bashrc" 2>/dev/null || true
    
    log_info "已清理 .bashrc 中的镜像源配置"
fi

# 4. 清理环境变量
log_info "清理环境变量..."
unset HOMEBREW_BOTTLE_DOMAIN 2>/dev/null || true
unset HOMEBREW_CORE_GIT_REMOTE 2>/dev/null || true

# 5. 清理 Homebrew 仓库配置（如果已安装）
if command -v brew >/dev/null 2>&1; then
    log_info "清理 Homebrew 仓库配置..."
    
    # 重置 Homebrew 核心仓库到官方源
    if [ -d "$(brew --repo)" ]; then
        git -C "$(brew --repo)" remote set-url origin https://github.com/Homebrew/brew.git 2>/dev/null || true
    fi
    
    # 重置 Homebrew Core 到官方源
    if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-core" ]; then
        git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-core" remote set-url origin https://github.com/Homebrew/homebrew-core.git 2>/dev/null || true
    fi
    
    # 重置 Homebrew Cask 到官方源
    if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" ]; then
        git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" remote set-url origin https://github.com/Homebrew/homebrew-cask.git 2>/dev/null || true
    fi
    
    log_info "已重置 Homebrew 仓库到官方源"
fi

# 6. 清理 npm 配置
log_info "清理 npm 配置..."
npm config delete registry 2>/dev/null || true
log_info "已重置 npm 到官方源"

# 7. 清理 pip 配置
log_info "清理 pip 配置..."
pip3 config unset global.index-url 2>/dev/null || true
log_info "已重置 pip 到官方源"

echo ""
log_info "✅ 镜像源配置清理完成！"
echo ""
log_info "下一步操作："
echo "  1. 重新运行安装脚本: ./deploy/install.sh"
echo "  2. 或者手动安装 Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
echo ""
log_warn "注意：所有配置文件已备份，如需恢复请查看备份文件"
