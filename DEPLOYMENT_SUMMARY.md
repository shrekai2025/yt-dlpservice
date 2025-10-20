# 部署总结 - 数据库配置

## ✅ 核心原理

**所有数据库连接都通过 `DATABASE_URL` 环境变量控制，无需修改任何代码。**

### 连接流程

```
环境变量文件 (.env, .env.local, .env.production)
    ↓
env.js (验证)
    ↓
PrismaClient (自动读取 DATABASE_URL)
    ↓
SQLite 数据库 (data/app.db)
```

## 🎯 回答你的问题

### Q1: 所有使用数据库的功能都正确读取环境变量了吗？

**是的！** ✅

所有数据库操作都通过以下方式统一管理：

1. **Server Components & API Routes**
   ```typescript
   import { db } from '~/server/db'  // 使用单例模式
   ```

2. **tRPC Routers**
   ```typescript
   // 通过 context 获取
   export const someRouter = createTRPCRouter({
     someQuery: userProcedure.query(async ({ ctx }) => {
       return ctx.db.user.findMany()  // ✅
     })
   })
   ```

3. **Seed Scripts**
   ```typescript
   import { PrismaClient } from '@prisma/client'
   const prisma = new PrismaClient()  // ✅ 自动读取 DATABASE_URL
   ```

4. **工具脚本**
   ```bash
   export DATABASE_URL="file:./data/app.db"
   npx tsx scripts/some-script.ts  # ✅
   ```

**验证方式**：
- ✅ 已检查 20+ 个使用数据库的文件
- ✅ 全部使用 PrismaClient 统一连接
- ✅ 没有硬编码的数据库路径

### Q2: 远程服务器部署需要改什么？

**只需要修改环境变量文件，不需要任何额外命令！**

#### 方案 A：使用相对路径（推荐）

**1. 创建 `.env.production`**
```bash
DATABASE_URL="file:./data/app.db"
ADMIN_USERNAME="your_username"
ADMIN_PASSWORD="your_password"
```

**2. 部署命令**
```bash
# 标准部署流程
npm ci --only=production
npx prisma migrate deploy
npx tsx prisma/seed-user.ts
npx tsx prisma/seed-ai-generation.ts
npm run build
npm start
```

**就这么简单！** ✅

#### 方案 B：使用绝对路径

如果你的服务器要求数据库在特定位置（如 `/var/lib/yt-dlpservice/db/app.db`）：

**1. 创建 `.env.production`**
```bash
DATABASE_URL="file:/var/lib/yt-dlpservice/db/app.db"
```

**2. 创建目录**
```bash
mkdir -p /var/lib/yt-dlpservice/db
```

**3. 运行部署**
```bash
# 同样的命令，Prisma 会自动使用新路径
npm ci --only=production
npx prisma migrate deploy
npx tsx prisma/seed-user.ts
npm run build
npm start
```

## 📋 部署检查清单

### 环境变量配置

- [ ] 创建 `.env.production` 文件
- [ ] 设置 `DATABASE_URL`（相对或绝对路径）
- [ ] 设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD`
- [ ] 设置 `NODE_ENV="production"`

### 数据库初始化

- [ ] 运行 `npx prisma migrate deploy`
- [ ] 运行 `npx tsx prisma/seed-user.ts`
- [ ] 运行 `npx tsx prisma/seed-ai-generation.ts`
- [ ] （可选）导入现有媒体：`npx tsx scripts/import-existing-media.ts`

### 应用部署

- [ ] `npm ci --only=production`
- [ ] `npm run build`
- [ ] `npm start` 或 `pm2 start npm -- start`

## 🔧 自动化部署

使用提供的脚本：

```bash
# 一键部署
./scripts/deploy-server.sh

# 或手动步骤
npm ci --only=production
npx prisma migrate deploy
./scripts/seed-all.sh  # 自动设置 DATABASE_URL 并初始化数据
npm run build
npm start
```

## 🚨 重要提示

### 本地开发 vs 生产环境

**本地开发**：
- 使用 `.env.local`
- **推荐绝对路径**（避免 Next.js 工作目录问题）
- 示例：`DATABASE_URL="file:/Users/you/project/data/app.db"`

**生产环境**：
- 使用 `.env.production`
- **推荐相对路径**（部署灵活）
- 示例：`DATABASE_URL="file:./data/app.db"`

### 环境变量优先级

```
.env.production.local  (最高)
.env.local
.env.production
.env                   (最低)
```

生产部署时，Next.js 会优先读取 `.env.production`。

## 📊 验证部署

部署后检查：

```bash
# 1. 检查数据库文件
ls -lh data/app.db

# 2. 查看数据统计
sqlite3 data/app.db "
SELECT '用户: ' || COUNT(*) FROM users
UNION ALL
SELECT '媒体: ' || COUNT(*) FROM media_files
UNION ALL
SELECT '供应商: ' || COUNT(*) FROM ai_providers;
"

# 3. 测试连接
export DATABASE_URL="file:./data/app.db"
npx tsx scripts/test-db-connection.ts
```

## 🎉 总结

✅ **数据库配置完全环境变量化**
✅ **代码零修改，直接部署**
✅ **支持相对路径和绝对路径**
✅ **提供自动化部署脚本**

**部署流程**：
1. 上传代码到服务器
2. 创建 `.env.production`（设置正确的 `DATABASE_URL`）
3. 运行 `./scripts/deploy-server.sh` 或手动执行部署命令
4. 启动服务

**就这么简单！** 🚀
