# YT-DLP Service

基于 **yt-dlp** 和 **语音识别API** 的在线视频内容提取工具。支持从 YouTube、哔哩哔哩等平台下载视频，自动提取音频并转换为文字。

## ✨ 功能特点

- 🎥 **多平台支持**: YouTube、哔哩哔哩 (可扩展其他平台)
- 🎵 **音频提取**: 自动从视频中提取高质量音频
- 📝 **语音转文字**: 支持豆包语音API和通义听悟API，支持自动语言识别
- 📊 **任务管理**: Web 管理界面，实时查看任务状态
- 🔄 **异步处理**: 后台异步任务队列，支持并发处理
- 💾 **数据持久化**: SQLite 数据库存储任务记录和转录结果
- 🚀 **易于部署**: 一键部署脚本，支持 PM2 进程管理
- 🔧 **配置灵活**: 支持环境变量配置，音频质量参数可调
- 🎛️ **多服务商**: 支持豆包语音和通义听悟两种语音识别服务

## 🏗️ 技术架构

### 前端
- **Next.js 15** (App Router)
- **TypeScript** - 类型安全
- **Tailwind CSS v4** - 现代化 UI
- **tRPC** - 端到端类型安全 API
- **React Query** - 状态管理和缓存

### 后端
- **Next.js API Routes** - 服务端 API
- **Prisma** - ORM 和数据库管理
- **SQLite** - 轻量级数据库
- **Zod** - 参数验证

### 核心服务
- **yt-dlp** - 视频下载
- **FFmpeg** - 音频处理
- **豆包语音API** - 火山引擎语音识别服务
- **通义听悟API** - 阿里云语音转文字服务
- **PM2** - 进程管理

## 🎯 使用场景

- 📚 **内容创作**: 从视频中提取文字内容用于文案创作
- 📖 **学习笔记**: 将教学视频转换为文字便于复习
- 📺 **视频摘要**: 快速获取视频内容概要
- 🔍 **内容分析**: 对视频内容进行文本分析
- 💼 **会议记录**: 将录制的会议视频转换为文字记录

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-username/yt-dlpservice.git
cd yt-dlpservice

# 安装依赖
npm install

# 配置环境变量
cp .env.production .env
# 编辑 .env 文件，配置数据库和 API 密钥

# 初始化数据库
npx prisma db push

# 启动开发服务器
npm run dev
```

### 环境变量配置

创建 `.env` 文件并配置以下变量：

```bash
# 数据库配置
DATABASE_URL="file:./dev.db"

# 语音服务提供商选择 (doubao 或 tingwu)
VOICE_SERVICE_PROVIDER="doubao"

# 豆包语音API配置 (使用豆包时必填)
DOUBAO_ACCESS_KEY_ID="your_doubao_access_key_id"
DOUBAO_ACCESS_KEY_SECRET="your_doubao_access_key_secret"
DOUBAO_REGION="cn-beijing"
DOUBAO_ENDPOINT="https://openspeech.bytedance.com"

# 通义听悟API配置 (使用通义时必填)
TINGWU_ACCESS_KEY_ID="your_tingwu_access_key_id"
TINGWU_ACCESS_KEY_SECRET="your_tingwu_access_key_secret"
TINGWU_REGION="cn-beijing"

# 应用配置
MAX_CONCURRENT_TASKS="10"
TEMP_DIR="/tmp/yt-dlpservice"
AUDIO_FORMAT="mp3"
AUDIO_BITRATE="128k"

# 文件清理配置
MAX_FILE_AGE_HOURS="1"
CLEANUP_INTERVAL_HOURS="24"

# Puppeteer 配置
PUPPETEER_HEADLESS="false"
PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"
BROWSER_DATA_DIR="./data/browser_data"
```

## 🔧 语音服务配置

### 豆包语音API配置

1. **注册火山引擎账号**
   - 访问 [火山引擎控制台](https://console.volcengine.com/)
   - 注册并完成实名认证

2. **开通语音识别服务**
   - 在控制台中搜索"语音识别"
   - 开通语音识别服务
   - 获取 Access Key ID 和 Access Key Secret

3. **配置环境变量**
   ```bash
   VOICE_SERVICE_PROVIDER="doubao"
   DOUBAO_ACCESS_KEY_ID="your_access_key_id"
   DOUBAO_ACCESS_KEY_SECRET="your_access_key_secret"
   DOUBAO_REGION="cn-beijing"
   ```

4. **在管理界面配置**
   - 访问 `http://localhost:3000/admin`
   - 在"配置管理"中设置豆包语音相关配置
   - 点击"测试语音服务连接"验证配置

### 通义听悟API配置

1. **注册阿里云账号**
   - 访问 [阿里云控制台](https://ecs.console.aliyun.com/)
   - 注册并完成实名认证

2. **开通通义听悟服务**
   - 在控制台中搜索"通义听悟"
   - 开通服务并获取API密钥

3. **配置环境变量**
   ```bash
   VOICE_SERVICE_PROVIDER="tingwu"
   TINGWU_ACCESS_KEY_ID="your_access_key_id"
   TINGWU_ACCESS_KEY_SECRET="your_access_key_secret"
   TINGWU_REGION="cn-beijing"
   ```

## 📊 管理界面功能

访问 `http://localhost:3000/admin` 使用管理界面：

### 任务管理
- ✅ 创建下载任务（支持音频、视频、混合模式）
- ✅ 查看任务状态和进度
- ✅ 批量处理待处理任务
- ✅ 删除任务记录

### 语音服务配置
- ✅ 切换语音服务提供商（豆包/通义）
- ✅ 配置API密钥和参数
- ✅ 测试服务连接状态
- ✅ 实时配置更新

### 浏览器管理
- ✅ 启动/关闭专用浏览器
- ✅ 管理登录状态和Cookies
- ✅ 查看浏览器运行状态

### 系统配置
- ✅ 动态配置系统参数
- ✅ 查看所有配置项
- ✅ 实时配置生效

## 🐳 Docker 部署

```bash
# 构建镜像
docker build -t yt-dlpservice .

# 运行容器
docker run -d \
  --name yt-dlpservice \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/temp:/tmp/yt-dlpservice \
  -e DATABASE_URL="file:./data/production.db" \
  -e VOICE_SERVICE_PROVIDER="doubao" \
  -e DOUBAO_ACCESS_KEY_ID="your_key" \
  -e DOUBAO_ACCESS_KEY_SECRET="your_secret" \
  yt-dlpservice
```

或使用 docker-compose：

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 🔄 服务器部署

### 使用部署脚本

```bash
# 克隆项目到服务器
git clone https://github.com/your-username/yt-dlpservice.git
cd yt-dlpservice

# 运行安装脚本
chmod +x deploy/install.sh
./deploy/install.sh

# 配置环境变量
cp .env.production .env
nano .env  # 编辑配置

# 运行部署脚本
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### PM2 进程管理

```bash
# 启动服务
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status

# 查看日志
pm2 logs yt-dlpservice

# 重启服务
pm2 restart yt-dlpservice

# 停止服务
pm2 stop yt-dlpservice
```


## 🔄 服务更新

### 标准更新流程
```bash
# 1. 停止服务
pm2 stop yt-dlpservice

# 2. 拉取最新代码
git pull origin main

# 3. 安装/更新依赖（如有新增）
npm install

# 4. 更新数据库结构（重要！）
npx prisma db push
npx prisma generate

# 5. 重新构建应用
npm run build

# 6. 重启服务
pm2 restart yt-dlpservice
```

### 强制重装依赖（解决依赖冲突时）
```bash
rm -rf node_modules package-lock.json
npm install
```

### 使用部署脚本更新（推荐）
```bash
# 自动处理完整更新流程，包括数据库更新
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

> **⚠️ 重要提醒**: 更新后务必执行数据库更新命令，否则可能导致应用启动失败或功能异常。


检查端口占用
sudo lsof -i :3000
sudo netstat -tlnp | grep :3000
sudo ss -tlnp | grep :3000
检查pm2
pm2 list
pm2 status
pm2 logs
停止所有PM2进程
pm2 stop all

pm2 logs yt-dlpservice --lines 10

## 🔧 常见问题排查

### routesManifest.dataRoutes 错误
如果遇到 `[TypeError: routesManifest.dataRoutes is not iterable]` 错误：

```bash
# 快速修复方案
pm2 stop yt-dlpservice
rm -rf .next node_modules package-lock.json
npm install
npx prisma generate
npx prisma db push  
npm run build
pm2 restart yt-dlpservice
```

### 其他常见问题
- **端口占用**: `sudo lsof -i :3000` 检查占用进程
- **权限问题**: `chmod +x deploy/*.sh` 给脚本执行权限
- **磁盘空间**: `df -h` 检查可用空间
- **服务状态**: `pm2 status` 查看PM2状态

> 💡 建议使用 `./deploy/deploy.sh` 脚本进行更新，可避免大部分手动操作错误


## 📝 API 接口

### 创建任务
```typescript
POST /api/trpc/task.create
{
  "url": "https://www.youtube.com/watch?v=example",
  "downloadType": "AUDIO_ONLY" // AUDIO_ONLY | VIDEO_ONLY | BOTH
}
```

### 查询任务
```typescript
GET /api/trpc/task.getAll
```

### 配置语音服务
```typescript
POST /api/trpc/config.setVoiceProvider
{
  "provider": "doubao" // doubao | tingwu
}
```

### 测试语音服务
```typescript
POST /api/trpc/config.testVoiceService
{
  "provider": "doubao"
}
```

## 🔍 故障排除

### 常见问题

1. **语音识别失败**
   - 检查API密钥是否正确配置
   - 确认服务商账户余额充足
   - 验证网络连接和防火墙设置

2. **视频下载失败**
   - 确认 yt-dlp 已正确安装
   - 检查视频URL是否有效
   - 查看是否需要登录认证

3. **浏览器启动失败**
   - 检查系统是否安装 Chrome/Chromium
   - 确认 Puppeteer 配置正确
   - 查看系统权限设置

### 日志查看

```bash
# 开发环境
npm run dev

# 生产环境 (PM2)
pm2 logs yt-dlpservice

# Docker 环境
docker-compose logs -f
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - 强大的视频下载工具
- [Next.js](https://nextjs.org/) - React 开发框架
- [Prisma](https://www.prisma.io/) - 现代数据库工具包
- [tRPC](https://trpc.io/) - 端到端类型安全 API
- [火山引擎](https://www.volcengine.com/) - 豆包语音识别服务
- [阿里云](https://www.aliyun.com/) - 通义听悟语音服务

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看 [故障排除](#🔍-故障排除) 部分
2. 搜索已有的 [Issues](https://github.com/your-username/yt-dlpservice/issues)
3. 创建新的 Issue 描述问题
4. 加入讨论群组获取帮助

---

**注意**: 请确保遵守相关平台的服务条款，合理使用本工具。
