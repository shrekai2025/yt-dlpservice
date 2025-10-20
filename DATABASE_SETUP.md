# 数据库配置说明

## ⚠️ 重要提示

**数据库路径**: `data/app.db`

**必须使用绝对路径**: `file:/Users/uniteyoo/Documents/yt-dlpservice/data/app.db`

## 问题说明

由于 Next.js 的工作目录可能不一致，相对路径 `file:./data/app.db` 会导致"Unable to open the database file"错误。

**解决方案**：在所有环境文件中使用绝对路径。

## 环境配置

所有 `.env*` 文件都应该包含：

```bash
DATABASE_URL="file:/Users/uniteyoo/Documents/yt-dlpservice/data/app.db"
```

已配置的文件：
- `.env`
- `.env.local`
- `.env.production`

## 数据初始化

运行完整的数据初始化脚本：

```bash
./scripts/seed-all.sh
```

或手动运行各个脚本：

```bash
# 设置环境变量
export DATABASE_URL="file:/Users/uniteyoo/Documents/yt-dlpservice/data/app.db"

# 1. 创建用户
npx tsx prisma/seed-user.ts

# 2. 创建AI供应商和模型
npx tsx prisma/seed-ai-generation.ts

# 3. 导入现有媒体文件
npx tsx scripts/import-existing-media.ts
```

## 常用操作

### 查看数据统计

```bash
sqlite3 data/app.db "SELECT COUNT(*) FROM users;"
sqlite3 data/app.db "SELECT COUNT(*) FROM media_files;"
sqlite3 data/app.db "SELECT COUNT(*) FROM ai_providers;"
sqlite3 data/app.db "SELECT COUNT(*) FROM ai_models;"
```

### 测试数据库连接

```bash
DATABASE_URL="file:/Users/uniteyoo/Documents/yt-dlpservice/data/app.db" \
  npx tsx scripts/test-db-connection.ts
```

## 故障排查

### 错误：Unable to open the database file

**原因**：环境变量使用了相对路径

**解决**：
1. 检查所有 `.env*` 文件，确保使用绝对路径
2. 清除缓存：`rm -rf .next`
3. 重新生成 Prisma Client：`npx prisma generate`
4. 重启开发服务器

### 供应商管理为空

运行数据初始化脚本：
```bash
./scripts/seed-all.sh
```

## 管理员账号

- 用户名: `adminyt`
- 密码: `a2885828`

## 当前数据

- 用户: 1
- 媒体文件: 57 (34视频 + 14图片 + 9音频)
- AI供应商: 5
- AI模型: 39

更新日期: 2025-10-19
