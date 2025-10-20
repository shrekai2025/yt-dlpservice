# 快速开始指南

## 本地开发

### 1. 环境变量配置

确保 `.env` 和 `.env.local` 包含：

```bash
# 本地开发 - 使用绝对路径
DATABASE_URL="file:/Users/uniteyoo/Documents/yt-dlpservice/data/app.db"

# 管理员账号
ADMIN_USERNAME="adminyt"
ADMIN_PASSWORD="a2885828"
```

### 2. 初始化数据

```bash
# 一键初始化所有数据
./scripts/seed-all.sh
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 远程服务器部署

### 快速部署（推荐）

**1. 准备环境变量**

在服务器上创建 `.env.production`：

```bash
DATABASE_URL="file:./data/app.db"
ADMIN_USERNAME="your_username"
ADMIN_PASSWORD="your_strong_password"
NODE_ENV="production"
```

**2. 运行部署脚本**

```bash
# 上传代码到服务器后
cd /path/to/app
./scripts/deploy-server.sh

# 启动服务
npm start
# 或使用 PM2
pm2 start npm --name "yt-dlpservice" -- start
```

### 手动部署

```bash
# 1. 安装依赖
npm ci --only=production

# 2. 创建数据目录
mkdir -p data

# 3. 设置数据库路径（使用相对路径）
export DATABASE_URL="file:./data/app.db"

# 4. 运行迁移
npx prisma migrate deploy

# 5. 初始化数据
npx tsx prisma/seed-user.ts
npx tsx prisma/seed-ai-generation.ts

# 6. 构建
npm run build

# 7. 启动
npm start
```

## 重要说明

### 关于数据库路径

系统支持两种路径配置方式：

**1. 相对路径（推荐用于部署）**
```bash
DATABASE_URL="file:./data/app.db"
```
- ✅ 灵活，适用于任何部署位置
- ✅ 无需修改配置文件
- ⚠️ 本地开发时可能需要绝对路径（Next.js 工作目录问题）

**2. 绝对路径（推荐用于本地开发）**
```bash
DATABASE_URL="file:/Users/uniteyoo/Documents/yt-dlpservice/data/app.db"
```
- ✅ 确保路径准确，避免连接问题
- ❌ 部署时需要修改路径

### 最佳实践

**本地开发**：
- 使用绝对路径避免 Next.js 工作目录问题
- `.env.local` 使用绝对路径

**生产部署**：
- 使用相对路径，灵活性更好
- `.env.production` 使用相对路径

## 常见问题

### Q: Unable to open the database file

**A:** 检查环境变量：
```bash
# 本地开发
cat .env.local | grep DATABASE_URL

# 生产环境
cat .env.production | grep DATABASE_URL
```

确保使用正确的路径格式，然后：
```bash
rm -rf .next
npx prisma generate
npm run dev  # 或 npm start
```

### Q: 供应商管理为空

**A:** 运行初始化脚本：
```bash
export DATABASE_URL="file:./data/app.db"  # 或绝对路径
npx tsx prisma/seed-ai-generation.ts
```

### Q: 媒体浏览器看不到文件

**A:** 导入现有文件：
```bash
export DATABASE_URL="file:./data/app.db"  # 或绝对路径
npx tsx scripts/import-existing-media.ts
```

## 数据备份

```bash
# 备份数据库
cp data/app.db data/app.db.backup.$(date +%Y%m%d)

# 备份媒体文件
tar -czf media-backup-$(date +%Y%m%d).tar.gz data/media-uploads/
```

## 查看数据

```bash
# 数据统计
sqlite3 data/app.db "
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM media_files) as media_files,
  (SELECT COUNT(*) FROM ai_providers) as ai_providers,
  (SELECT COUNT(*) FROM ai_models) as ai_models;
"

# 或使用测试脚本
export DATABASE_URL="file:./data/app.db"
npx tsx scripts/test-db-connection.ts
```

## 更多信息

- 详细部署指南：[DEPLOYMENT.md](DEPLOYMENT.md)
- 数据库配置：[DATABASE_SETUP.md](DATABASE_SETUP.md)
- 项目 README：[README.md](README.md)
