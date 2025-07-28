# YT-DLP Service

基于 **yt-dlp** 和 **通义听悟 API** 的在线视频内容提取工具。支持从 YouTube、哔哩哔哩等平台下载视频，自动提取音频并转换为文字。

## ✨ 功能特点

- 🎥 **多平台支持**: YouTube、哔哩哔哩 (可扩展其他平台)
- 🎵 **音频提取**: 自动从视频中提取高质量音频
- 📝 **语音转文字**: 集成通义听悟 API，支持自动语言识别
- 📊 **任务管理**: Web 管理界面，实时查看任务状态
- 🔄 **异步处理**: 后台异步任务队列，支持并发处理
- 💾 **数据持久化**: SQLite 数据库存储任务记录和转录结果
- 🚀 **易于部署**: 一键部署脚本，支持 PM2 进程管理
- 🔧 **配置灵活**: 支持环境变量配置，音频质量参数可调

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
- **通义听悟 API** - 语音转文字
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

访问 http://localhost:3000

### 服务器部署

详细部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

```bash
# 1. 安装系统依赖
chmod +x deploy/install.sh
./deploy/install.sh

# 2. 部署应用
chmod +x deploy/deploy.sh
./deploy/deploy.sh

# 3. 配置环境变量 (重要!)
nano .env
# 配置通义 API 密钥

# 4. 重启服务
pm2 restart yt-dlpservice
```

## 📖 API 文档

### 内部 API (tRPC)

#### 任务管理
- `task.create` - 创建新任务
- `task.list` - 获取任务列表
- `task.getById` - 获取任务详情
- `task.update` - 更新任务状态
- `task.delete` - 删除任务
- `task.process` - 手动处理任务
- `task.getVideoInfo` - 获取视频信息

#### 配置管理
- `config.get` - 获取配置值
- `config.set` - 设置配置值
- `config.testDatabase` - 测试数据库连接

### 外部 API (REST)

```bash
# 创建任务
POST /api/trpc/task.create
{
  "url": "https://www.youtube.com/watch?v=..."
}

# 获取任务列表
GET /api/trpc/task.list

# 获取任务详情
GET /api/trpc/task.getById?id=task_id
```

## 🔧 配置说明

### 环境变量

```env
# 数据库
DATABASE_URL="file:./data/app.db"

# 通义听悟 API (必需)
TINGWU_ACCESS_KEY_ID=your_access_key_id
TINGWU_ACCESS_KEY_SECRET=your_access_key_secret
TINGWU_REGION=cn-beijing

# 应用配置
MAX_CONCURRENT_TASKS=10          # 最大并发任务数
TEMP_DIR=/tmp/yt-dlpservice     # 临时文件目录
AUDIO_FORMAT=mp3                # 音频格式
AUDIO_BITRATE=128k              # 音频比特率

# 文件清理
MAX_FILE_AGE_HOURS=1            # 文件保存时间
CLEANUP_INTERVAL_HOURS=24       # 清理间隔
```

### 支持的平台

当前支持的视频平台 (配置文件: `src/config/platforms.json`):

- **YouTube**: youtube.com, youtu.be
- **哔哩哔哩**: bilibili.com, b23.tv

## 📱 界面预览

### 主页
- 项目介绍和功能概览
- 快速导航到管理面板

### 管理面板 (/admin)
- **任务创建**: URL 输入和任务创建
- **任务列表**: 状态查看、进度跟踪
- **配置管理**: 系统参数设置
- **视频预览**: URL 预览和信息获取
- **系统状态**: 下载器状态、数据库连接测试

## 🔍 任务流程

1. **URL 验证**: 检查输入的视频 URL 是否支持
2. **信息获取**: 使用 yt-dlp 获取视频基本信息
3. **视频下载**: 下载视频文件到临时目录
4. **音频提取**: 使用 FFmpeg 提取音频
5. **语音转文字**: 调用通义听悟 API 进行转录
6. **结果保存**: 将转录结果保存到数据库
7. **文件清理**: 清理临时文件

## 🛠️ 开发

### 项目结构

```
yt-dlpservice/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── server/              # 服务端代码
│   ├── lib/                 # 工具库和服务
│   ├── types/               # TypeScript 类型定义
│   ├── config/              # 配置文件
│   └── styles/              # 样式文件
├── prisma/                  # 数据库模式
├── deploy/                  # 部署脚本
├── public/                  # 静态资源
└── data/                    # SQLite 数据库
```

### 开发脚本

```bash
# 开发模式
npm run dev

# 类型检查
npm run typecheck

# 构建生产版本
npm run build

# 启动生产服务
npm run start

# 数据库操作
npx prisma studio          # 数据库可视化管理
npx prisma db push          # 推送数据库结构
npx prisma generate         # 生成 Prisma Client
```

## 📊 监控和日志

### PM2 监控
```bash
pm2 status                  # 服务状态
pm2 logs yt-dlpservice      # 实时日志
pm2 monit                   # 资源监控
```

### 日志文件
- `logs/app.log` - 应用日志
- `logs/out.log` - 输出日志  
- `logs/error.log` - 错误日志

## 🔒 安全注意事项

1. **API 密钥安全**: 请妥善保管通义 API 密钥
2. **访问控制**: 生产环境建议配置反向代理和认证
3. **文件权限**: 确保临时文件目录权限正确
4. **网络安全**: 配置防火墙，只开放必要端口
5. **定期更新**: 及时更新系统和依赖包

## 📈 性能优化

### 系统级优化
- 使用 SSD 存储提高 I/O 性能
- 配置足够的内存和 swap 空间
- 优化网络设置提高下载速度

### 应用级优化
- 调整并发任务数 (`MAX_CONCURRENT_TASKS`)
- 优化音频质量参数平衡质量和性能
- 配置合适的文件清理策略

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙋‍♂️ 支持

如有问题，请通过以下方式联系:

- 提交 GitHub Issue
- 查看 [部署文档](./DEPLOYMENT.md)
- 检查应用日志进行故障排除

---

**开发状态**: 当前版本支持 YouTube 和哔哩哔哩，通义听悟 API 集成正在开发中。
