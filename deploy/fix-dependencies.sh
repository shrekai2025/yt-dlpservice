#!/bin/bash

# YT-DLP Service 依赖修复脚本
# 解决远程服务器编译时缺少依赖的问题

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

log_info "🔧 开始修复依赖问题..."

# 检查当前目录
if [ ! -f "package.json" ]; then
    log_error "未找到 package.json 文件，请在项目根目录运行此脚本"
    exit 1
fi

# 1. 清理现有文件
log_info "清理现有依赖文件..."
rm -rf node_modules
rm -f package-lock.json
rm -rf .next

# 2. 清理npm缓存
log_info "清理 NPM 缓存..."
npm cache clean --force

# 3. 验证 Node.js 版本
node_version=$(node --version)
log_info "当前 Node.js 版本: $node_version"

node_major_version=$(node --version | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$node_major_version" -lt 18 ]; then
    log_error "Node.js 版本过低，需要 18.0.0 或更高版本"
    log_error "请运行以下命令更新 Node.js:"
    echo "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "sudo apt install -y nodejs"
    exit 1
fi

# 4. 重新安装依赖
log_info "重新安装依赖..."
npm install

# 5. 验证关键依赖
log_info "验证关键依赖..."

check_dependency() {
    local dep_name=$1
    local require_name=${2:-$1}
    
    if node -e "require('$require_name'); console.log('✅ $dep_name 安装成功')" 2>/dev/null; then
        return 0
    else
        log_error "❌ $dep_name 安装失败"
        return 1
    fi
}

# 检查核心依赖
dependencies_ok=true

check_dependency "axios" || dependencies_ok=false
check_dependency "prisma" "@prisma/client" || dependencies_ok=false
check_dependency "tRPC" "@trpc/server" || dependencies_ok=false
check_dependency "Next.js" "next" || dependencies_ok=false
check_dependency "React" "react" || dependencies_ok=false
check_dependency "crypto-js" || dependencies_ok=false
check_dependency "puppeteer" || dependencies_ok=false
check_dependency "zod" || dependencies_ok=false

if [ "$dependencies_ok" = false ]; then
    log_error "有依赖安装失败，请检查错误信息"
    exit 1
fi

# 6. 生成 Prisma Client
log_info "生成 Prisma Client..."
npx prisma generate

# 7. 尝试构建
log_info "尝试构建项目..."
if npm run build; then
    log_info "✅ 构建成功！"
else
    log_error "❌ 构建失败，请检查错误信息"
    exit 1
fi

log_info "🎉 依赖修复完成！"
log_info "现在可以运行以下命令启动服务:"
echo "  npm run start    # 生产模式"
echo "  npm run dev      # 开发模式" 