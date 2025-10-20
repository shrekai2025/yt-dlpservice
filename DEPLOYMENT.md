# 部署指南

本文档说明如何将项目部署到远程服务器。

## 核心原理

系统的所有数据库连接都通过 `DATABASE_URL` 环境变量配置，无需修改代码。

### 数据库连接流程

```
.env / .env.production
    ↓
env.js (验证环境变量)
    ↓
PrismaClient (读取 DATABASE_URL)
    ↓
SQLite 数据库
```

所有使用数据库的代码都通过以下方式连接：
- **Server Components**: `import { db } from '~/server/db'`
- **tRPC Routers**: `ctx.db` (从 context 获取)
- **Seed Scripts**: `new PrismaClient()` (直接读取环境变量)

## 部署到远程服务器

### 方法一：使用相对路径（推荐）

相对路径在任何环境都能工作，不需要修改配置文件。

**1. 在服务器上配置环境变量**

创建 `.env.production`:

```bash
# 数据库 - 使用相对路径
DATABASE_URL="file:./data/app.db"

# 其他配置...
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password
```

**2. 部署步骤**

```bash
# 1. 上传代码到服务器
scp -r . user@server:/path/to/app

# 2. SSH 到服务器
ssh user@server

# 3. 进入项目目录
cd /path/to/app

# 4. 安装依赖
npm install

# 5. 创建数据目录
mkdir -p data

# 6. 运行数据库迁移
npx prisma migrate deploy

# 7. 初始化数据
export DATABASE_URL="file:./data/app.db"
npx tsx prisma/seed-user.ts
npx tsx prisma/seed-ai-generation.ts

# 8. 构建项目
npm run build

# 9. 启动服务
npm start
# 或使用 PM2
pm2 start npm --name "yt-dlpservice" -- start
```

### 方法二：使用绝对路径

如果你的部署环境有特殊要求（例如数据库需要在特定位置），可以使用绝对路径。

**1. 在服务器上配置环境变量**

创建 `.env.production`:

```bash
# 数据库 - 使用绝对路径
DATABASE_URL="file:/opt/yt-dlpservice/data/app.db"

# 其他配置...
```

**2. 确保路径存在**

```bash
mkdir -p /opt/yt-dlpservice/data
chmod 755 /opt/yt-dlpservice/data
```

**3. 运行迁移和初始化**

```bash
export DATABASE_URL="file:/opt/yt-dlpservice/data/app.db"
npx prisma migrate deploy
npx tsx prisma/seed-user.ts
npx tsx prisma/seed-ai-generation.ts
```

## Docker 部署

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建数据目录
RUN mkdir -p data

# 生成 Prisma Client
RUN npx prisma generate

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动脚本
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/app.db
      - ADMIN_USERNAME=adminyt
      - ADMIN_PASSWORD=your_password
    volumes:
      - ./data:/app/data
      - ./data/media-uploads:/app/data/media-uploads
    restart: unless-stopped
```

### 部署步骤

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动容器
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 初始化数据（首次部署）
docker-compose exec app npx tsx prisma/seed-user.ts
docker-compose exec app npx tsx prisma/seed-ai-generation.ts
```

## 使用部署脚本

我们提供了一键部署脚本。

### 本地开发环境

```bash
./scripts/deploy-local.sh
```

### 远程服务器

```bash
# 1. 上传部署脚本到服务器
scp scripts/deploy-server.sh user@server:/tmp/

# 2. SSH 到服务器
ssh user@server

# 3. 运行部署脚本
chmod +x /tmp/deploy-server.sh
/tmp/deploy-server.sh /path/to/app
```

## 环境变量说明

### 必需的环境变量

```bash
# 数据库
DATABASE_URL="file:./data/app.db"  # 或绝对路径

# 管理员账号
ADMIN_USERNAME="adminyt"
ADMIN_PASSWORD="your_password"

# Node 环境
NODE_ENV="production"
```

### 可选的环境变量

根据你使用的功能，可能需要配置：

- STT 服务（通义听悟、豆包、Google）
- 对象存储（TOS、S3）
- AI 生成服务的 API Keys

详见 `.env.example`

## 数据备份

### 自动备份脚本

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="./data/app.db"

mkdir -p $BACKUP_DIR

# 备份数据库
sqlite3 $DB_FILE ".backup $BACKUP_DIR/app_$DATE.db"

# 备份媒体文件
tar -czf $BACKUP_DIR/media_$DATE.tar.gz data/media-uploads/

# 清理30天前的备份
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "✅ Backup completed: $DATE"
```

### 添加到 crontab

```bash
# 每天凌晨2点备份
0 2 * * * /path/to/app/scripts/backup.sh >> /var/log/yt-dlpservice-backup.log 2>&1
```

## 故障排查

### 问题：Unable to open the database file

**检查事项**：
1. 数据库文件是否存在？`ls -lh data/app.db`
2. 权限是否正确？`chmod 666 data/app.db`
3. 环境变量是否正确？`echo $DATABASE_URL`

**解决方案**：

```bash
# 检查当前配置
cat .env.production | grep DATABASE_URL

# 如果使用相对路径，确保在项目根目录运行
pwd
ls data/app.db

# 如果使用绝对路径，确保路径正确
ls -lh /opt/yt-dlpservice/data/app.db

# 重新生成 Prisma Client
npx prisma generate

# 清除 Next.js 缓存
rm -rf .next

# 重启服务
pm2 restart yt-dlpservice
```

### 问题：供应商数据为空

运行初始化脚本：

```bash
export DATABASE_URL="file:./data/app.db"  # 或你的绝对路径
npx tsx prisma/seed-ai-generation.ts
```

### 问题：媒体文件看不到

导入现有媒体文件：

```bash
export DATABASE_URL="file:./data/app.db"
npx tsx scripts/import-existing-media.ts
```

## 性能优化

### 1. 使用 PM2 集群模式

```bash
pm2 start npm --name "yt-dlpservice" -i max -- start
```

### 2. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 启用 SQLite WAL 模式

```bash
sqlite3 data/app.db "PRAGMA journal_mode=WAL;"
```

## 安全建议

1. **更改默认密码**：修改 `ADMIN_PASSWORD`
2. **使用 HTTPS**：配置 SSL 证书
3. **限制文件访问**：设置正确的文件权限
4. **定期更新**：及时更新依赖包

## 监控

### 使用 PM2 监控

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs yt-dlpservice

# 查看资源使用
pm2 monit
```

### 日志管理

应用日志位置：
- PM2 日志：`~/.pm2/logs/`
- 应用日志：`logs/`

## 总结

✅ **数据库配置完全通过环境变量控制**
✅ **本地开发和生产环境使用相同的代码**
✅ **支持相对路径和绝对路径两种方式**
✅ **无需修改任何代码文件**

只需：
1. 设置正确的 `DATABASE_URL` 环境变量
2. 运行迁移：`npx prisma migrate deploy`
3. 初始化数据：运行 seed 脚本
4. 启动应用：`npm start`
