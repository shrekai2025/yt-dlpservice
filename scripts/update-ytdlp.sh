#!/bin/bash

# YT-DLP 更新脚本
# 用于在远程服务器上更新 yt-dlp

set -e  # 遇到错误时退出

echo "🚀 开始更新 yt-dlp..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查当前版本
log_info "检查当前 yt-dlp 版本..."
if command -v yt-dlp &> /dev/null; then
    CURRENT_VERSION=$(yt-dlp --version 2>/dev/null || echo "未知")
    log_info "当前版本: $CURRENT_VERSION"
elif python3 -m yt_dlp --version &> /dev/null; then
    CURRENT_VERSION=$(python3 -m yt_dlp --version 2>/dev/null || echo "未知")
    log_info "当前版本 (Python模块): $CURRENT_VERSION"
else
    log_warning "未检测到 yt-dlp 安装"
    CURRENT_VERSION="未安装"
fi

# 更新策略：按优先级尝试不同方法
update_success=false

# 方法1: 尝试 pipx
if command -v pipx &> /dev/null; then
    log_info "尝试使用 pipx 更新..."
    if pipx list | grep -q yt-dlp; then
        if pipx upgrade yt-dlp; then
            log_success "pipx 更新成功"
            update_success=true
        else
            log_warning "pipx 更新失败，尝试重新安装..."
            pipx uninstall yt-dlp 2>/dev/null || true
            if pipx install yt-dlp; then
                log_success "pipx 重新安装成功"
                update_success=true
            fi
        fi
    else
        log_info "使用 pipx 安装 yt-dlp..."
        if pipx install yt-dlp; then
            log_success "pipx 安装成功"
            update_success=true
        fi
    fi
fi

# 方法2: 如果 pipx 失败，尝试系统级安装（带 --break-system-packages）
if [ "$update_success" = false ]; then
    log_info "尝试使用 pip 更新（系统级）..."
    if python3 -m pip install --upgrade yt-dlp --break-system-packages; then
        log_success "pip 系统级更新成功"
        update_success=true
    else
        log_warning "pip 系统级更新失败"
    fi
fi

# 方法3: 尝试 apt 包管理器
if [ "$update_success" = false ]; then
    log_info "尝试使用 apt 安装/更新..."
    if sudo apt update && sudo apt install -y yt-dlp; then
        log_success "apt 安装/更新成功"
        update_success=true
    else
        log_warning "apt 安装失败"
    fi
fi

# 检查更新结果
if [ "$update_success" = true ]; then
    log_success "yt-dlp 更新完成！"
    
    # 检查新版本
    if command -v yt-dlp &> /dev/null; then
        NEW_VERSION=$(yt-dlp --version 2>/dev/null || echo "未知")
        log_info "新版本: $NEW_VERSION"
    elif python3 -m yt_dlp --version &> /dev/null; then
        NEW_VERSION=$(python3 -m yt_dlp --version 2>/dev/null || echo "未知")
        log_info "新版本 (Python模块): $NEW_VERSION"
    fi
    
    # 测试功能
    log_info "测试 yt-dlp 功能..."
    TEST_URL="https://www.youtube.com/watch?v=fDDqHDSxvqs"
    
    if command -v yt-dlp &> /dev/null; then
        TEST_CMD="yt-dlp"
    else
        TEST_CMD="python3 -m yt_dlp"
    fi
    
    if $TEST_CMD --get-title "$TEST_URL" &> /dev/null; then
        log_success "功能测试通过"
    else
        log_warning "功能测试失败，但 yt-dlp 已更新"
    fi
    
else
    log_error "所有更新方法都失败了"
    log_info "请手动安装 yt-dlp："
    echo "  方法1: sudo apt install pipx && pipx install yt-dlp"
    echo "  方法2: python3 -m pip install --upgrade yt-dlp --break-system-packages"
    echo "  方法3: sudo apt install yt-dlp"
    exit 1
fi

# 重启服务（如果需要）
if [ "$1" = "--restart-service" ]; then
    log_info "重启服务..."
    
    if command -v pm2 &> /dev/null && pm2 list | grep -q yt-dlpservice; then
        log_info "使用 PM2 重启服务..."
        pm2 restart yt-dlpservice
        log_success "PM2 服务重启完成"
    elif systemctl is-active --quiet yt-dlpservice 2>/dev/null; then
        log_info "使用 systemd 重启服务..."
        sudo systemctl restart yt-dlpservice
        log_success "systemd 服务重启完成"
    else
        log_warning "未检测到服务管理器，请手动重启服务"
    fi
fi

log_success "yt-dlp 更新流程完成！"