#!/bin/bash

# AI Generation Module Setup Script
# 一键完成AI生成模块的初始化设置

set -e

echo "🚀 AI生成模块初始化脚本"
echo "=============================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 步骤1: 检查环境
echo -e "${BLUE}📋 步骤1: 检查环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未找到Node.js，请先安装Node.js${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js 已安装${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 未找到npm，请先安装npm${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm 已安装${NC}"
echo ""

# 步骤2: 安装依赖
echo -e "${BLUE}📦 步骤2: 检查依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}正在安装依赖...${NC}"
    npm install
else
    echo -e "${GREEN}✅ 依赖已安装${NC}"
fi
echo ""

# 步骤3: 应用数据库迁移
echo -e "${BLUE}🗄️  步骤3: 应用数据库迁移...${NC}"
echo -e "${YELLOW}这将重命名 encryptedApiKey → apiKey 并添加S3配置${NC}"
read -p "是否继续？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx prisma migrate deploy
    echo -e "${GREEN}✅ 数据库迁移完成${NC}"
else
    echo -e "${YELLOW}⏭️  跳过数据库迁移${NC}"
fi
echo ""

# 步骤4: 初始化模型数据
echo -e "${BLUE}🌱 步骤4: 初始化AI模型数据...${NC}"
read -p "是否运行seed脚本添加所有AI模型？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run db:seed
    echo -e "${GREEN}✅ 模型数据初始化完成${NC}"
else
    echo -e "${YELLOW}⏭️  跳过模型初始化${NC}"
fi
echo ""

# 步骤5: 配置API密钥
echo -e "${BLUE}🔑 步骤5: 配置API密钥${NC}"
echo -e "您可以选择以下方式之一配置API密钥："
echo ""
echo -e "  ${GREEN}方式A: 环境变量（推荐用于生产环境）${NC}"
echo -e "    编辑 .env 文件，添加:"
echo -e "    ${YELLOW}AI_PROVIDER_OPENAI_API_KEY=sk-xxx${NC}"
echo -e "    ${YELLOW}AI_PROVIDER_POLLO_API_KEY=xxx${NC}"
echo -e "    ${YELLOW}AI_PROVIDER_KIE_AI_API_KEY=xxx${NC}"
echo ""
echo -e "  ${GREEN}方式B: 管理页面（推荐用于开发环境）${NC}"
echo -e "    启动服务后访问: ${YELLOW}http://localhost:3000/admin/ai-generation/providers${NC}"
echo ""

read -p "是否现在打开 .env 文件配置？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f ".env" ]; then
        ${EDITOR:-nano} .env
        echo -e "${GREEN}✅ .env 文件已打开${NC}"
    else
        echo -e "${YELLOW}⚠️  .env 文件不存在，请先创建${NC}"
        cp .env.example .env 2>/dev/null || echo "# AI Provider API Keys" > .env
        ${EDITOR:-nano} .env
    fi
else
    echo -e "${YELLOW}⏭️  跳过环境变量配置${NC}"
fi
echo ""

# 步骤6: 启动服务
echo -e "${BLUE}🚀 步骤6: 启动开发服务器${NC}"
read -p "是否立即启动开发服务器？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}正在启动服务器...${NC}"
    echo -e "访问 ${YELLOW}http://localhost:3000/admin/ai-generation${NC} 开始使用"
    echo ""
    npm run dev
else
    echo -e "${YELLOW}⏭️  稍后手动启动: npm run dev${NC}"
fi
echo ""

# 完成
echo -e "${GREEN}=============================="
echo -e "✨ AI生成模块初始化完成！"
echo -e "==============================${NC}"
echo ""
echo -e "📚 后续步骤:"
echo -e "  1. 访问 ${YELLOW}http://localhost:3000/admin/ai-generation${NC}"
echo -e "  2. 在 ${YELLOW}http://localhost:3000/admin/ai-generation/providers${NC} 配置API密钥"
echo -e "  3. 测试各个AI模型"
echo ""
echo -e "📖 相关文档:"
echo -e "  - doc/QUICK_START_AI_GENERATION.md - 快速开始指南"
echo -e "  - doc/AI_GENERATION_FINAL_REPORT.md - 完整功能说明"
echo -e "  - doc/MIGRATION_TO_NEW_AI_GENERATION.md - 迁移指南"
echo ""
echo -e "${GREEN}祝使用愉快！🎉${NC}"

