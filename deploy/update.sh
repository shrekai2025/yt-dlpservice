#!/bin/bash

# yt-dlpservice 更新部署脚本
# 用于在远程服务器上更新整个项目

set -e

echo "🚀 开始更新 yt-dlpservice..."

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 1. 更新代码（如果是 git 仓库）
if [ -d ".git" ]; then
    log_info "更新代码..."
    git pull origin main || git pull origin master || log_warning "Git 更新失败，继续执行..."
else
    log_warning "非 Git 仓库，跳过代码更新"
fi

# 2. 安装/更新 Node.js 依赖
log_info "更新 Node.js 依赖..."
npm install

# 3. 更新 yt-dlp
log_info "更新 yt-dlp..."
npm run update:ytdlp

# 4. 生成 Prisma 客户端
log_info "生成 Prisma 客户端..."
npm run db:generate

# 5. 推送数据库迁移（如果需要）
if [ "$1" = "--migrate" ]; then
    log_info "推送数据库迁移..."
    npm run db:push
fi

# 6. 构建项目
log_info "构建项目..."
npm run build

# 7. 重启服务
log_info "重启服务..."
if command -v pm2 &> /dev/null && pm2 list | grep -q yt-dlpservice; then
    log_info "使用 PM2 重启服务..."
    pm2 restart yt-dlpservice
    pm2 save
    log_success "PM2 服务重启完成"
elif systemctl is-active --quiet yt-dlpservice 2>/dev/null; then
    log_info "使用 systemd 重启服务..."
    sudo systemctl restart yt-dlpservice
    log_success "systemd 服务重启完成"
else
    log_warning "未检测到服务管理器，请手动重启服务"
    log_info "手动启动命令: npm start"
fi

# 8. 显示服务状态
log_info "检查服务状态..."
if command -v pm2 &> /dev/null && pm2 list | grep -q yt-dlpservice; then
    pm2 status yt-dlpservice
    log_info "查看日志: pm2 logs yt-dlpservice"
elif systemctl is-active --quiet yt-dlpservice 2>/dev/null; then
    sudo systemctl status yt-dlpservice --no-pager -l
    log_info "查看日志: sudo journalctl -u yt-dlpservice -f"
fi

log_success "🎉 yt-dlpservice 更新完成！"

# 显示版本信息
echo ""
log_info "当前版本信息："
if command -v yt-dlp &> /dev/null; then
    echo "  - yt-dlp: $(yt-dlp --version)"
elif python3 -m yt_dlp --version &> /dev/null; then
    echo "  - yt-dlp: $(python3 -m yt_dlp --version)"
fi
echo "  - Node.js: $(node --version)"
echo "  - npm: $(npm --version)"
echo ""

log_info "使用方法："
echo "  - 查看服务状态: pm2 status 或 sudo systemctl status yt-dlpservice"
echo "  - 查看日志: pm2 logs yt-dlpservice 或 sudo journalctl -u yt-dlpservice -f"
echo "  - 仅更新 yt-dlp: npm run update:ytdlp"
echo "  - 手动重启: pm2 restart yt-dlpservice 或 sudo systemctl restart yt-dlpservice"