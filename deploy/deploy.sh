#!/bin/bash

# YT-DLP Service 项目部署脚本
# 在服务器上运行此脚本来部署或更新应用

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置变量
APP_NAME="yt-dlpservice"
APP_DIR="$HOME/$APP_NAME"
REPO_URL="https://github.com/shrekai2025/yt-dlpservice.git"
BRANCH="main"

# 检查是否已安装依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    commands=("node" "npm" "python3" "ffmpeg" "yt-dlp" "pm2" "git")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log_error "未找到命令: $cmd"
            log_error "请先运行 deploy/install.sh 安装系统依赖"
            exit 1
        fi
    done
    
    log_info "✅ 所有依赖检查通过"
}

# 克隆或更新代码
deploy_code() {
    if [ -d "$APP_DIR/.git" ]; then
        log_info "更新现有代码..."
        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/$BRANCH
        git clean -fd
    else
        log_info "克隆新代码..."
        if [ -d "$APP_DIR" ]; then
            rm -rf "$APP_DIR"
        fi
        git clone -b $BRANCH "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    log_info "当前代码版本: $(git rev-parse --short HEAD)"
}

# 安装依赖
install_dependencies() {
    log_info "安装 Node.js 依赖..."
    cd "$APP_DIR"
    
    # 清理可能的残留文件
    if [ -d "node_modules" ]; then
        log_info "清理现有 node_modules..."
        rm -rf node_modules
    fi
    
    if [ -f "package-lock.json" ]; then
        log_info "清理现有 package-lock.json..."
        rm -f package-lock.json
    fi
    
    # 清理npm缓存
    npm cache clean --force
    
    # 重新安装依赖
    log_info "重新安装所有依赖..."
    npm install
    
    # 验证关键依赖
    log_info "验证关键依赖安装..."
    node -e "require('axios'); console.log('✅ axios 安装成功')" || log_error "❌ axios 安装失败"
    node -e "require('@prisma/client'); console.log('✅ prisma 安装成功')" || log_error "❌ prisma 安装失败"
    node -e "require('@trpc/server'); console.log('✅ tRPC 安装成功')" || log_error "❌ tRPC 安装失败"
}

# 配置环境变量
setup_environment() {
    cd "$APP_DIR"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_info "复制环境配置模板..."
            cp .env.example .env
            log_warn "⚠️  请编辑 .env 文件，配置语音API密钥等信息"
            log_warn "   nano .env"
        else
            log_info "创建默认环境配置文件..."
            cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
DATABASE_URL="file:./data/app.db"

# 语音服务配置
VOICE_SERVICE_PROVIDER=doubao

# 豆包语音API配置
DOUBAO_APP_KEY=your_doubao_app_key_here
DOUBAO_ACCESS_KEY=your_doubao_access_key_here
DOUBAO_ENDPOINT=openspeech.bytedance.com

# 通义听悟API配置（备用）
TINGWU_ACCESS_KEY_ID=your_access_key_id_here
TINGWU_ACCESS_KEY_SECRET=your_access_key_secret_here
TINGWU_REGION=cn-beijing

# 任务配置
MAX_CONCURRENT_TASKS=10
TEMP_DIR=/tmp/yt-dlpservice
AUDIO_FORMAT=mp3
AUDIO_BITRATE=128k
MAX_FILE_AGE_HOURS=1
CLEANUP_INTERVAL_HOURS=24

# Puppeteer配置
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu
BROWSER_DATA_DIR=./data/browser_data
EOF
            log_warn "⚠️  已创建默认 .env 文件，请编辑配置语音API密钥"
            log_warn "   nano .env"
        fi
    else
        log_info "环境配置文件已存在"
    fi
}

# 构建应用
build_app() {
    log_info "构建应用..."
    cd "$APP_DIR"
    npm run build
}

# 初始化/更新数据库
setup_database() {
    log_info "更新数据库结构..."
    cd "$APP_DIR"
    
    # 确保数据目录存在
    mkdir -p data
    
    # 生成 Prisma Client
    log_info "生成 Prisma 客户端..."
    npx prisma generate
    
    # 推送数据库结构更新
    log_info "同步数据库结构..."
    npx prisma db push
    
    log_info "✅ 数据库更新完成"
}

# 更新 yt-dlp 路径配置
update_ytdlp_path() {
    log_info "更新 yt-dlp 路径配置..."
    
    # 检查 yt-dlp 路径
    YTDLP_PATH=$(which yt-dlp 2>/dev/null || echo "$HOME/.local/bin/yt-dlp")
    
    if [ ! -f "$YTDLP_PATH" ]; then
        log_error "未找到 yt-dlp，请确保已正确安装"
        exit 1
    fi
    
    log_info "yt-dlp 路径: $YTDLP_PATH"
    
    # 更新代码中的路径配置 (如果需要)
    if [ -f "$APP_DIR/src/lib/services/video-downloader.ts" ]; then
        # 这里可以添加自动更新路径的逻辑，或者提醒用户手动更新
        log_warn "请确保 src/lib/services/video-downloader.ts 中的 ytDlpPath 配置正确"
        log_warn "当前 yt-dlp 路径: $YTDLP_PATH"
    fi
}

# 启动或重启服务
manage_service() {
    cd "$APP_DIR"
    
    # 检查是否已有运行的实例
    if pm2 describe $APP_NAME > /dev/null 2>&1; then
        log_info "重启现有服务..."
        pm2 restart $APP_NAME
    else
        log_info "启动新服务..."
        pm2 start ecosystem.config.js --env production
    fi
    
    # 保存 PM2 配置
    pm2 save
    
    # 显示服务状态
    pm2 status
    pm2 logs $APP_NAME --lines 10
}

# 主函数
main() {
    log_info "🚀 开始部署 YT-DLP Service..."
    
    check_dependencies
    deploy_code
    install_dependencies
    setup_environment
    build_app
    setup_database
    update_ytdlp_path
    manage_service
    
    log_info "✅ 部署完成！"
    log_info "应用访问地址: http://your-server-ip:3000"
    log_info "管理面板地址: http://your-server-ip:3000/admin"
    echo ""
    log_info "常用命令:"
    echo "  查看服务状态: pm2 status"
    echo "  查看服务日志: pm2 logs $APP_NAME"
    echo "  重启服务: pm2 restart $APP_NAME"
    echo "  停止服务: pm2 stop $APP_NAME"
    echo "  删除服务: pm2 delete $APP_NAME"
    echo ""
    log_info "数据库管理:"
    echo "  更新数据库结构: npx prisma db push"
    echo "  重新生成客户端: npx prisma generate"
    echo "  查看数据库: npx prisma studio"
    echo ""
    log_warn "请确保:"
    echo "  1. 编辑 .env 文件配置语音API密钥（豆包或通义）"
    echo "  2. 确认防火墙允许 3000 端口访问"
    echo "  3. 服务器有足够的磁盘空间用于临时文件"
    echo "  4. 每次更新代码后都要运行数据库同步命令"
}

# 执行主函数
main "$@" 