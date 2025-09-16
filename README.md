# YT-DLP Service

基于 **yt-dlp** 和 **语音识别API** 的在线视频内容提取工具。支持从 YouTube、哔哩哔哩等平台下载视频，自动提取音频并转换为文字。

## ✨ 功能特点

- 🎥 **多平台支持**: YouTube、哔哩哔哩、小宇宙 (可扩展其他平台)
- 🎵 **音频提取**: 自动从视频中提取高质量音频
- 📝 **语音转文字**: 支持Google Speech-to-Text、豆包语音API和通义听悟API
- 🕷️ **智能元数据爬取**: 自动获取平台特定数据（播放量、点赞数、评论等）
- 💬 **评论数据提取**: 获取第一页评论及回复，支持结构化存储
- 📊 **任务管理**: Web 管理界面，实时查看任务状态
- 🔄 **异步处理**: 后台异步任务队列，支持并发处理
- 💾 **数据持久化**: SQLite 数据库存储任务记录和转录结果
- 🍪 **YouTube Cookie支持**: 通过手动设置Cookie，解决需要登录才能访问的视频
- 🚀 **易于部署**: 提供Docker和服务器部署脚本
- 🔧 **配置灵活**: 支持环境变量配置，音频质量参数可调
- 🎛️ **多服务商**: 支持Google Speech-to-Text、豆包语音和通义听悟三种语音识别服务

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
- **Puppeteer** - 自动化浏览器，用于cookie获取
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

### 系统要求

- **Ubuntu 20.04+** 或 **macOS 10.15+**
- **Node.js 18.0.0+**
- **Python 3.8+**
- **FFmpeg**
- **Google Chrome** (推荐)

### 自动安装 (推荐)

使用项目提供的跨平台安装脚本：

```bash
# 克隆项目
git clone https://github.com/your-username/yt-dlpservice.git
cd yt-dlpservice

# 运行安装脚本 (自动识别系统类型)
chmod +x deploy/install.sh
./deploy/install.sh
```

安装脚本会自动：
- 🔍 检测操作系统类型 (Ubuntu/macOS)
- 📦 **智能检查并安装** (已安装的包会跳过，未安装的包会自动安装)
- 🎯 配置环境变量
- 🚀 安装所有必要的软件包
- 🌏 **自动配置国内镜像源** (NPM、pip、Homebrew)
- 🔄 **智能重试机制** (官方源失败时自动切换到国内镜像)
- ✅ **版本检查** (自动检查版本是否满足要求，过低时自动更新)

### 本地开发

#### Ubuntu/Linux 系统

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

#### macOS 系统

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

**macOS 特殊注意事项：**
- 确保已安装 Homebrew (`brew install ffmpeg node python`)
- 如果遇到 Chrome 权限问题，需要在"系统偏好设置 > 安全性与隐私"中允许终端访问
- Puppeteer 会自动使用系统安装的 Chrome，无需额外配置

**🌏 国内镜像源支持：**
- 脚本会自动配置 NPM、pip 使用国内镜像源
- Homebrew 安装失败时会自动切换到清华大学镜像源
- 所有软件包下载都会优先使用国内镜像，大幅提升安装速度

### 环境变量配置

#### 🔐 **重要说明**
- `.env` - 配置模板（会被Git跟踪，**不要在此文件中填写真实密钥**）
- `.env.local` - 本地开发配置（被.gitignore保护，**在此文件中填写真实密钥**）

#### **配置步骤**
1. **本地开发**：
   ```bash
   cp .env .env.local
   # 在 .env.local 中填写真实密钥
   ```

2. **生产部署**：
   ```bash
   # 直接创建 .env.local 或使用环境变量
   ```

#### **配置示例（.env.local）**
```bash
# 数据库配置
DATABASE_URL="file:./dev.db"

# 语音服务提供商选择 (tingwu/doubao/doubao-small/google)
VOICE_SERVICE_PROVIDER="google"

# 豆包语音API配置（实时版）
DOUBAO_APP_KEY="your_doubao_app_key"
DOUBAO_ACCESS_KEY="your_doubao_access_key"

# 豆包录音文件识别API配置（小模型版）
DOUBAO_SMALL_APP_ID="your_app_id"
DOUBAO_SMALL_TOKEN="your_token"
DOUBAO_SMALL_CLUSTER="your_cluster"

# 火山引擎TOS对象存储配置（使用豆包小模型时必填）
TOS_ACCESS_KEY_ID="your_tos_access_key_id"
TOS_SECRET_ACCESS_KEY="your_tos_secret_access_key"
DOUBAO_ENDPOINT="https://openspeech.bytedance.com"

# Google Speech-to-Text API配置 (使用Google时必填)
GOOGLE_STT_PROJECT_ID="your-gcp-project-id"
GOOGLE_STT_CREDENTIALS_PATH="./data/google-credentials.json"
GOOGLE_STT_LOCATION="global"

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

### Google Speech-to-Text API配置

1. **创建Google Cloud项目**
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建新项目或选择现有项目
   - 记录项目ID

2. **启用Speech-to-Text API**
   - 在API库中搜索"Cloud Speech-to-Text API"
   - 点击启用API

3. **创建服务账户**
   - 访问"IAM和管理 > 服务账户"
   - 创建新的服务账户
   - 角色选择："Cloud Speech服务代理"或"项目 > 编辑者"
   - 下载JSON密钥文件

4. **配置环境变量**
   ```bash
   VOICE_SERVICE_PROVIDER="google"
   GOOGLE_STT_PROJECT_ID="your-gcp-project-id"
   GOOGLE_STT_CREDENTIALS_PATH="./data/google-credentials.json"
   GOOGLE_STT_LOCATION="global"
   ```

5. **部署密钥文件**
   - 将下载的JSON密钥文件重命名为 `google-credentials.json`
   - 放置在项目的 `data/` 目录下
   - 确保文件路径与 `GOOGLE_STT_CREDENTIALS_PATH` 配置一致

6. **在管理界面测试**
   - 访问 `http://localhost:3000/admin/tools`
   - 上传音频文件测试Google STT功能
   - 检查诊断信息确保配置正确

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

### YouTube Cookie管理
- 🍪 **手动设置**: 支持通过Web界面或CLI工具手动设置Cookie，以访问需要登录的YouTube视频。
- 📊 **状态监控**: 实时显示Cookie配置状态。
- 🔧 **服务器友好**: 专为无GUI的服务器环境设计，无需浏览器即可完成配置。

#### 在无 GUI 的 Ubuntu 24.04.2 LTS 上登录 YouTube（Puppeteer Chromium + Xvfb + 远程调试）

用途：在服务器上创建一个“真实登录”的持久浏览器 Profile，显著提升登录态时长。无需安装完整桌面环境。

1) 安装依赖（24.04 使用 t64 包名）

```bash
sudo add-apt-repository -y universe || true
sudo apt update
sudo apt install -y \
  xvfb xauth \
  libnss3 libatk-bridge2.0-0 libxkbcommon0 libgtk-3-0 \
  libdrm2 libxdamage1 libgbm1 libasound2t64

# （可选）字体，减少渲染异常
sudo apt install -y fonts-liberation fonts-noto-color-emoji
```

2) 找到 Puppeteer 自带 Chromium 路径

```bash
cd ~/yt-dlpservice
node -e "console.log(require('puppeteer').executablePath())"
# 复制输出路径为 CHROME_BIN 并允许执行
export CHROME_BIN="/绝对路径/puppeteer/chromium"
chmod +x "$CHROME_BIN"
```

3) 创建持久化用户目录（保存登录态）

```bash
mkdir -p /home/ubuntu/chrome-profile
```

4) 启动 Xvfb 与 Chromium（推荐用 tmux 后台保持）

```bash
tmux new -s chrome
Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp &
export DISPLAY=:99

"$CHROME_BIN" \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9222 \
  --user-data-dir=/home/ubuntu/chrome-profile \
  --no-first-run --no-default-browser-check \
  --disable-dev-shm-usage --disable-gpu --no-sandbox \
  --lang=zh-CN --window-size=1280,900

# 保持前台运行；希望后台：按 Ctrl-b 然后 d 脱离 tmux
# 查看/恢复会话：tmux ls / tmux attach -t chrome
```

5) 本机做端口转发并登录

```bash
# 在你的本地电脑执行（保持此窗口打开）
ssh -N -L 9222:localhost:9222 ubuntu@你的服务器IP

# 本机 Chrome 打开：chrome://inspect/#devices  → Configure… 添加 localhost:9222
# 在 Remote Target 里点击 inspect 打开远程页面，在该页面里访问 https://www.youtube.com 完成登录（含2FA）
```

6) 服务器验证登录是否可用

```bash
yt-dlp --cookies-from-browser "chromium:/home/ubuntu/chrome-profile/Default" \
  --dump-json "https://www.youtube.com/watch?v=dQw4w9WgXcQ" | head -c 200
# 若输出 JSON 片段而非 LOGIN_REQUIRED，则可用
```

7) 运行与检查

- 相关任务：
  - 初始化依赖与虚拟显示（Xvfb）
  - 启动 Chromium（远程调试 + 持久化 Profile）
  - 本地端口转发 → 在本机浏览器中完成一次登录
  - 验证 yt-dlp 读取浏览器 Cookies 的可用性
- 什么时候执行：
  - 首次部署后；登录态过期/风控要求重新验证时；服务器重启后需重新启动 Xvfb 与 Chromium（Profile 仍保留）
- 如何检查：
  - 端口：`ss -ltnp | grep 9222` 或 `curl http://localhost:9222/json/version`
  - 登录：`yt-dlp --cookies-from-browser "chromium:/home/ubuntu/chrome-profile/Default" --dump-json URL`
  - 应用日志：`pm2 logs yt-dlpservice --lines 50` 查看是否仍有 LOGIN_REQUIRED；管理页“查看返回数据”按钮核对 `extraMetadata`

> 提示：若你希望服务自动读取该登录态，可将下载命令切换为 `--cookies-from-browser "chromium:/home/ubuntu/chrome-profile/Default"`（可按需改造代码）。


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

#### Ubuntu/Linux 服务器

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

#### macOS 系统

```bash
# 克隆项目到本地
git clone https://github.com/your-username/yt-dlpservice.git
cd yt-dlpservice

# 运行安装脚本 (自动识别系统)
chmod +x deploy/install.sh
./deploy/install.sh

# 配置环境变量
cp .env.production .env
nano .env  # 编辑配置

# 运行部署脚本
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

**macOS 部署注意事项：**
- 安装脚本会自动检测 macOS 并使用 Homebrew 安装依赖
- PM2 开机自启需要手动配置，运行 `pm2 startup` 获取配置指令
- 确保 Chrome 浏览器已安装并配置正确的权限

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
带日志启动
pm2 start ecosystem.config.cjs && pm2 logs yt-dlpservice --lines 50

# 方法1：强制重置到远程分支（推荐）
git fetch origin
git reset --hard origin/main
git clean -fd


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

### 豆包API超时问题
如果遇到 `timeout of 30000ms exceeded` 或 `timeout of 90000ms exceeded` 等超时错误：

```bash
# 1. 检查网络连接
ping openspeech.bytedance.com

# 2. 检查API配置
curl -I https://openspeech.bytedance.com

# 3. 清理重启服务（应用最新优化）
pm2 restart yt-dlpservice

# 4. 查看详细日志
pm2 logs yt-dlpservice --lines 50
```

**✅ 已优化的功能：**
- **动态超时**: 根据音频大小自动调整超时时间（60秒-3分钟）
- **智能轮询**: 最多等待10分钟，根据任务状态调整查询频率
- **重试机制**: 网络错误自动重试，连续超时智能处理
- **状态解析**: 精确识别任务状态，避免不必要的等待

**可能原因和解决方案：**
- **网络问题**: 检查服务器网络连接和DNS解析
- **音频文件过大**: 确保音频文件小于100MB
- **API密钥错误**: 在管理页面重新配置豆包API密钥
- **服务器负载**: 等待一段时间后重试
- **豆包服务异常**: 使用管理页面的API诊断工具检查

**📊 预期处理时间：**
- 小文件(< 10MB): 1-3分钟
- 中等文件(10-50MB): 3-6分钟  
- 大文件(50-100MB): 6-10分钟

### 其他常见问题
- **端口占用**: `sudo lsof -i :3000` 检查占用进程
- **权限问题**: `chmod +x deploy/*.sh` 给脚本执行权限
- **磁盘空间**: `df -h` 检查可用空间
- **服务状态**: `pm2 status` 查看PM2状态

> 💡 建议使用 `./deploy/deploy.sh` 脚本进行更新，可避免大部分手动操作错误


## 🧹 磁盘清理与维护

系统内置多层清理机制，帮助释放磁盘空间、避免硬盘被占满：

- 自动清理（随服务启动）
  - 任务处理器启动时会自动拉起清理服务，无需手动启停
  - 周期由 `CLEANUP_INTERVAL_HOURS` 控制（默认 24 小时）
  - 按 `MAX_FILE_AGE_HOURS`（默认 1 小时）删除过期临时文件
  - 对已完成任务，超过保留期会清除其视频/音频文件并清空数据库中的文件路径

- 任务完成后的延迟清理
  - 任务标记完成约 5 分钟后，对该任务输出目录执行一次延迟清理

- 管理页面手动清理
  - 进入 `管理台 → 实用工具 → 文件清理管理`
  - 可查看自动清理状态，手动“一键清理”，或启停自动清理（需要登录）

### 参数调优建议

```bash
# .env 或管理台可配置
MAX_FILE_AGE_HOURS="1"          # 文件保留时长，数值越小清得越快
CLEANUP_INTERVAL_HOURS="24"     # 自动清理周期，建议 12~24 小时
TEMP_DIR="/tmp/yt-dlpservice"   # 临时目录位置
```

- 若磁盘较小或任务量大，可将 `MAX_FILE_AGE_HOURS` 下调至 0.5~1 小时
- 若临时目录与持久数据同盘，建议更频繁的清理间隔（12 小时）

### 监控建议

- 使用 `df -h`、`du -sh /tmp/yt-dlpservice` 定期查看空间
- PM2 日志位于 `./logs/`，必要时手动轮转/清理
- 若需要兜底，可在运维侧加一条计划任务定期调用清理 API（可选）

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

## 📋 API 接口说明

### 任务响应数据结构

所有任务相关的API接口都会返回包含 `extraMetadata` 字段的完整任务信息：

```typescript
interface TaskResponse {
  id: string
  url: string
  platform: string
  title: string
  status: 'PENDING' | 'EXTRACTING' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED'
  downloadType: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'
  transcription?: string
  duration?: number
  fileSize?: number
  errorMessage?: string
  
  // 新增：额外元数据字段
  extraMetadata?: PlatformExtraMetadata | null
  
  createdAt: string
  updatedAt: string
}
```

### extraMetadata 字段结构

`extraMetadata` 包含平台特定的元数据信息：

```typescript
interface PlatformExtraMetadata {
  // 公共字段（所有平台）
  title: string                    // 内容标题
  author: string                   // 作者名称
  authorAvatar?: string           // 作者头像URL
  duration: number                // 内容时长（秒）
  publishDate?: string            // 发布时间
  description?: string            // 内容描述
  
  // 平台特定数据
  platformData?: BilibiliData | YouTubeData | XiaoyuzhouData
  
  // 评论数据
  comments?: Comment[]
}
```

#### 平台特定数据结构

**Bilibili数据：**
```typescript
interface BilibiliData {
  playCount: number      // 播放量
  likeCount: number      // 点赞数
  coinCount: number      // 硬币数
  shareCount: number     // 转发数
  favoriteCount: number  // 收藏数
  commentCount: number   // 评论数
}
```

**YouTube数据：**
```typescript
interface YouTubeData {
  viewCount: number      // 播放量
  likeCount: number      // 点赞数
}
```

**小宇宙数据：**
```typescript
interface XiaoyuzhouData {
  playCount: number      // 播放量
  commentCount: number   // 评论数
}
```

#### 评论数据结构

```typescript
interface Comment {
  author: string         // 评论者名称
  content: string        // 评论内容
  replies?: Comment[]    // 二级回复（可选）
}
```

5. **数据获取策略**

   - **yt-dlp优先**: 优先使用yt-dlp获取准确的核心元数据（如标题、时长、播放量、点赞数），并立即存入数据库。
   - **爬虫补充**: 异步使用Puppeteer爬虫补充yt-dlp无法获取的数据（如Bilibili的硬币数、转发数、收藏数以及各平台的评论）。
   - **数据合并**: 将爬虫数据合并到现有数据中，但不覆盖yt-dlp提供的更准确的核心字段。
   - **异步处理**: 元数据爬取在任务完成后异步进行，不阻塞主流程。
   - **容错处理**: 爬虫失败不影响任务的 `COMPLETED` 状态。
   - **评论限制**:
     - 一级评论最多100条。
     - 总评论数（含回复）最多300条。
     - 爬虫超时时间为120秒。

### 示例响应

```json
{
  "success": true,
  "data": {
    "id": "cuid123",
    "url": "https://www.bilibili.com/video/BV1234567890",
    "platform": "bilibili",
    "title": "精彩视频标题",
    "status": "COMPLETED",
    "downloadType": "AUDIO_ONLY",
    "transcription": "这是转录的文本内容...",
    "duration": 1800,
    "extraMetadata": {
      "title": "精彩视频标题",
      "author": "UP主名称",
      "authorAvatar": "https://example.com/avatar.jpg",
      "duration": 1800,
      "publishDate": "2024-01-15",
      "description": "视频描述内容...",
      "platformData": {
        "playCount": 10000,
        "likeCount": 500,
        "coinCount": 100,
        "shareCount": 50,
        "favoriteCount": 200,
        "commentCount": 80
      },
      "comments": [
        {
          "author": "观众A",
          "content": "很棒的内容！",
          "replies": [
            {
              "author": "UP主",
              "content": "谢谢支持！"
            }
          ]
        }
      ]
    },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:05:00.000Z"
  }
}
```

### 注意事项

- `extraMetadata` 字段可能为 `null`，当爬虫未执行或失败时
- 爬虫过程是异步的，新创建的任务可能暂时没有 `extraMetadata` 数据
- JSON解析采用安全机制，解析失败时返回 `null` 而不会导致API异常
- 不同平台的 `platformData` 结构不同，请根据 `platform` 字段判断数据类型

## 🔍 故障排除

### macOS 特定问题

#### 1. Homebrew 安装失败
```bash
# 如果 Homebrew 安装失败，可以尝试：
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装完成后，将 Homebrew 添加到 PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
source ~/.zprofile
```

#### 2. Chrome 权限问题
如果遇到 Chrome 无法启动或权限错误：
- 打开"系统偏好设置 > 安全性与隐私"
- 在"通用"标签页中，允许终端访问
- 如果 Chrome 被阻止，点击"仍要打开"

#### 3. Node.js 版本过低
```bash
# 使用 Homebrew 安装最新版本
brew install node

# 或者使用 nvm 管理 Node.js 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### 4. FFmpeg 安装失败
```bash
# 确保 Homebrew 是最新的
brew update

# 重新安装 FFmpeg
brew uninstall ffmpeg
brew install ffmpeg
```

#### 5. 镜像源配置问题
如果遇到镜像源配置问题，可以手动重置：

```bash
# 重置 NPM 镜像源
npm config set registry https://registry.npmjs.org/

# 重置 pip 镜像源
pip3 config unset global.index-url

# 重置 Homebrew 镜像源
git -C "$(brew --repo)" remote set-url origin https://github.com/Homebrew/brew.git
```

**💡 推荐：** 使用安装脚本的自动镜像源配置功能，无需手动配置。

### 常见问题

1. **语音识别失败**
   - 检查API密钥是否正确配置
   - 确认服务商账户余额充足
   - 验证网络连接和防火墙设置

2. **视频下载失败**
   - 确认 yt-dlp 已正确安装
   - 检查视频URL是否有效
   - 查看是否需要登录认证

3. **YouTube "Sign in to confirm you're not a bot" 错误**
   - 这通常是cookie失效导致的，系统会自动处理
   - 在管理界面点击"刷新Cookies"按钮手动刷新
   - 确保服务器可以访问YouTube（检查网络和防火墙）
   - 如果问题持续，可能是IP被限制，考虑使用代理

4. **浏览器启动失败**
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




————综合升级——————

# 在服务器 /home/ubuntu/yt-dlpservice 目录执行：

pm2 stop yt-dlpservice
git pull origin main
npm install
npm run build

# 4. 继续部署流程
npm run db:push
chmod +x scripts/*.sh scripts/*.js
mkdir -p logs

# 5. 启动服务
pm2 start ecosystem.config.cjs --env production
pm2 save

# 6. 验证部署
pm2 list
pm2 logs yt-dlpservice --lines 5



————该环境变量env————
nano .env.local
Ctrl + O
Ctrl + X
pm2 restart yt-dlpservice
pm2 logs yt-dlpservice --lines 30