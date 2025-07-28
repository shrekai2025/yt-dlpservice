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
REPO_URL="https://github.com/your-username/yt-dlpservice.git"  # 替换为您的仓库地址
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
    npm ci --production=false
}

# 配置环境变量
setup_environment() {
    cd "$APP_DIR"
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.production" ]; then
            log_info "复制生产环境配置模板..."
            cp .env.production .env
            log_warn "⚠️  请编辑 .env 文件，配置通义 API 密钥等信息"
            log_warn "   nano .env"
        else
            log_error "未找到环境配置模板文件"
            exit 1
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

# 初始化数据库
setup_database() {
    log_info "初始化数据库..."
    cd "$APP_DIR"
    
    # 确保数据目录存在
    mkdir -p data
    
    # 生成 Prisma Client
    npx prisma generate
    
    # 推送数据库结构
    npx prisma db push
    
    log_info "✅ 数据库初始化完成"
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
    log_warn "请确保:"
    echo "  1. 编辑 .env 文件配置通义 API 密钥"
    echo "  2. 确认防火墙允许 3000 端口访问"
    echo "  3. 服务器有足够的磁盘空间用于临时文件"
}

# 执行主函数
main "$@" 