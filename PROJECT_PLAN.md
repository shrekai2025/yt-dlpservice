# YT-DLP Service 开发计划

基于 T3 技术栈的在线视频内容提取工具开发计划

## 项目概述

### 核心功能
- 接收视频URL（YouTube、B站等）
- 使用 yt-dlp 下载视频/音频
- 提取音频文件
- 调用通义听悟API进行语音转文字
- 提供管理界面和API接口

### 技术栈
- **前端**: Next.js 15 + TypeScript + Tailwind CSS v4 + tRPC + React Query
- **后端**: Next.js API Routes + tRPC + Node.js + Prisma + SQLite
- **外部工具**: yt-dlp, FFmpeg, 通义听悟API

## 架构设计

### 系统架构
```
用户界面 (Next.js + TypeScript)
    ↓ tRPC
API层 (tRPC Router)
    ↓
业务逻辑层 (Service Layer)
    ├── 任务管理服务 (快速创建任务)
    ├── 后台队列处理器 (Worker)
    │   ├── 视频下载服务 (yt-dlp)
    │   ├── 音频提取服务 (FFmpeg)
    │   └── 语音转文字服务 (通义API)
    └── 文件管理服务
    ↓
数据持久层 (Prisma + SQLite)
```

### 核心优化点
1. **异步任务队列**: API快速响应，后台Worker处理长耗时任务
2. **细化任务状态**: 提供详细的处理进度反馈
3. **统一配置管理**: 环境变量 + Zod校验
4. **文件清理机制**: 完善的临时文件管理

## 开发进度

### ✅ 阶段1: 项目基础搭建 [已完成]

**目标**: 建立T3项目基础结构和开发环境

**已完成内容**:
- [x] 创建项目开发计划
- [x] 使用 create-t3-app 创建项目基础
- [x] 配置 TypeScript、ESLint、Tailwind CSS
- [x] 设置项目目录结构（App Router）
- [x] 创建基础配置文件
- [x] 环境变量配置和验证
- [x] 基础页面和布局

**验收结果**:
- ✅ 项目能够成功启动
- ✅ 基础页面可访问（美观的首页界面）
- ✅ 开发工具配置正确（Tailwind CSS正常工作）
- ✅ 环境变量验证系统正常

---

### ✅ 阶段2: 数据库设计与配置系统 [已完成]

**目标**: 建立数据模型和配置管理

**已完成内容**:
- [x] 设计 Prisma Schema (Task表、Config表)
- [x] 创建数据库迁移和连接
- [x] 实现配置管理系统 (环境变量 + Zod)
- [x] 设置数据库连接工具
- [x] 创建TypeScript类型定义
- [x] 实现数据验证工具
- [x] 创建日志系统

**验收结果**:
- ✅ 数据库Schema设计完成 (Task、Config表，TaskStatus枚举)
- ✅ Prisma配置正确 (SQLite数据库，客户端生成成功)
- ✅ 配置管理系统工作正常 (环境变量优先级、缓存机制)
- ✅ TypeScript类型定义完整 (任务、配置、API相关类型)
- ✅ 数据验证工具完善 (Zod schema、URL验证、状态转换验证)
- ✅ 开发工具齐全 (数据库连接、日志系统)

**技术成果**:
- 完整的Prisma数据模型 (去除progress字段，分离videoPath/audioPath)
- 三层配置管理 (环境变量 > 数据库 > 默认值)
- 类型安全的数据操作接口
- 完善的验证机制

---

### 阶段3: 基础API框架 [已完成]
**目标**: 建立tRPC API基础结构

**开发内容**:
- [x] 配置 tRPC 服务端和客户端
- [x] 创建基础路由结构
- [x] 实现任务相关API (创建、查询、列表)
- [x] 添加请求验证 (Zod)
- [x] 实现配置相关API
- [x] 创建管理页面进行API测试

**完成的功能**:
- tRPC 服务端配置 (`src/server/api/trpc.ts`)
- API 路由器 (`src/server/api/root.ts`)
- 任务路由 (`src/server/api/routers/task.ts`): create, list, getById, update, delete, stats
- 配置路由 (`src/server/api/routers/config.ts`): get, getAll, set, delete, clearCache, warmupCache, testDatabase
- React Query客户端配置 (`src/components/providers/trpc-provider.tsx`)
- 管理面板UI (`src/app/admin/page.tsx`)
- 完整的错误处理和数据验证

**第3阶段后续优化** [已完成]:
- ✅ API端点迁移到App Router (`src/app/api/trpc/[trpc]/route.ts`)
- ✅ 任务状态流转验证 (防止非法状态切换)
- ✅ 数据库连接测试功能 (管理面板测试按钮)

**API设计**:
```typescript
// 任务路由
taskRouter = {
  create: (url: string) => Task     // 创建任务(仅入库)
  list: (pagination) => Task[]     // 任务列表
  getById: (id: string) => Task    // 任务详情
  delete: (id: string) => void     // 删除任务
}

// 配置路由  
configRouter = {
  get: (key: string) => Config     // 获取配置
  set: (key, value) => Config      // 设置配置
}
```

**验收标准**:
- API接口能正常调用
- 数据验证工作正常
- 错误处理完善

---

### 阶段4: 核心服务层 - 视频下载 [已完成]
**目标**: 实现yt-dlp视频下载功能

**开发内容**:
- [x] 封装 yt-dlp 调用逻辑
- [x] 实现视频信息获取
- [x] 添加下载进度跟踪
- [x] 支持YouTube和B站平台
- [x] 集成到任务处理系统

**完成的功能**:
- `VideoDownloader` 服务类 (`src/lib/services/video-downloader.ts`)
  - `getVideoInfo()` - 获取视频信息（不下载）
  - `downloadVideo()` - 下载视频文件
  - `downloadAudio()` - 仅下载音频
  - `getSupportedPlatforms()` - 获取支持的平台
  - `checkAvailability()` - 检查yt-dlp可用性
  - `cleanupFiles()` - 清理临时文件
- `TaskProcessor` 服务类 (`src/lib/services/task-processor.ts`)
  - `processTask()` - 处理单个任务的完整流程
  - `processPendingTasks()` - 批量处理等待任务
  - `cleanupExpiredFiles()` - 清理过期文件
- 扩展的任务API (`src/server/api/routers/task.ts`)
  - `process` - 手动处理指定任务
  - `processPending` - 批量处理等待任务
  - `getVideoInfo` - 预览视频信息
  - `checkDownloader` - 检查下载器状态
- 增强的管理面板
  - 下载器状态显示
  - 视频信息预览功能
  - 任务处理控制按钮
  - 单个任务手动处理

**注意事项**: 
- YouTube需要身份验证才能访问，可能需要配置cookies
- 部分视频可能因地理限制无法访问
- yt-dlp路径硬编码为本地Python安装路径

**服务设计**:
```typescript
class VideoDownloader {
  async getVideoInfo(url: string): Promise<VideoInfo>
  async downloadVideo(url: string, taskId: string): Promise<string>
  async getSupportedPlatforms(): Promise<string[]>
}
```

**验收标准**:
- 能成功下载YouTube视频
- 能成功下载B站视频
- 错误处理完善
- 临时文件管理正确

---

### 阶段5: 核心服务层 - 音频处理
**目标**: 实现音频提取和格式转换

**开发内容**:
- [ ] 封装 FFmpeg 音频提取
- [ ] 支持多种音频格式输出
- [ ] 实现音频质量配置
- [ ] 添加音频文件验证

**服务设计**:
```typescript
class AudioExtractor {
  async extractAudio(videoPath: string, options?: AudioOptions): Promise<string>
  async validateAudioFile(audioPath: string): Promise<boolean>
  async getAudioInfo(audioPath: string): Promise<AudioInfo>
}
```

**验收标准**:
- 音频提取功能正常
- 支持配置音频质量
- 文件验证工作正常

---

### 阶段6: 通义API集成
**目标**: 集成通义听悟语音转文字API

**开发内容**:
- [ ] 集成通义听悟SDK
- [ ] 实现音频上传和转录
- [ ] 支持长音频处理
- [ ] 添加转录状态跟踪

**服务设计**:
```typescript
class TranscriptionService {
  async uploadAudio(audioPath: string): Promise<string>
  async startTranscription(audioUrl: string): Promise<string>
  async getTranscriptionResult(taskId: string): Promise<string>
  async pollTranscriptionStatus(taskId: string): Promise<TaskStatus>
}
```

**验收标准**:
- 音频上传成功
- 转录功能正常
- 支持自动语言识别
- 长音频处理正确

---

### 阶段7: 后台任务处理器
**目标**: 实现异步任务队列和Worker

**开发内容**:
- [ ] 创建任务处理器 (TaskProcessor)
- [ ] 实现数据库轮询机制
- [ ] 集成所有服务模块
- [ ] 添加任务状态更新

**核心逻辑**:
```typescript
class TaskProcessor {
  async processTask(taskId: string): Promise<void> {
    // 1. 更新状态: DOWNLOADING
    // 2. 下载视频
    // 3. 更新状态: EXTRACTING  
    // 4. 提取音频
    // 5. 更新状态: UPLOADING
    // 6. 上传到通义
    // 7. 更新状态: TRANSCRIBING
    // 8. 获取转录结果
    // 9. 更新状态: COMPLETED
    // 10. 清理临时文件
  }
}

class TaskWorker {
  async start(): Promise<void> // 启动工作进程
  async stop(): Promise<void>  // 停止工作进程
  private async pollTasks(): Promise<void> // 轮询任务
}
```

**验收标准**:
- 任务队列正常工作
- 状态更新及时准确
- 错误处理完善
- 文件清理正确

---

### 阶段8: 管理界面开发
**目标**: 创建Web管理界面

**开发内容**:
- [ ] 任务创建页面 (URL输入表单)
- [ ] 任务列表页面 (状态、进度显示)
- [ ] 任务详情页面 (结果查看)
- [ ] 实时状态更新 (React Query轮询)

**页面结构**:
```
/admin
  ├── page.tsx          # 任务管理主页
  ├── create/page.tsx   # 创建任务页面
  └── tasks/
      └── [id]/page.tsx # 任务详情页面
```

**组件设计**:
```typescript
- TaskForm: 任务创建表单
- TaskList: 任务列表展示
- TaskCard: 单个任务卡片
- StatusBadge: 状态指示器
- ProgressBar: 进度条
```

**验收标准**:
- 界面美观易用
- 状态更新实时
- 响应式设计
- 错误提示完善

---

### 阶段9: API接口开发
**目标**: 提供REST API供外部调用

**开发内容**:
- [ ] 创建REST API路由
- [ ] 实现外部接口规范
- [ ] 添加API文档
- [ ] 接口测试

**API规范**:
```
POST /api/tasks        # 创建任务
GET  /api/tasks        # 任务列表
GET  /api/tasks/:id    # 任务详情
DELETE /api/tasks/:id  # 删除任务
```

**验收标准**:
- API接口工作正常
- 文档清晰完整
- 错误码规范统一

---

### 阶段10: 配置优化与部署准备
**目标**: 完善配置管理和部署相关设置

**开发内容**:
- [ ] 完善环境变量配置
- [ ] 创建启动检查机制
- [ ] 编写部署脚本
- [ ] 添加PM2配置

**配置文件**:
```bash
# .env.example
DATABASE_URL="file:./data/app.db"
TINGWU_ACCESS_KEY_ID=""
TINGWU_ACCESS_KEY_SECRET=""
TINGWU_REGION="cn-beijing"

# 应用配置
MAX_CONCURRENT_TASKS="10"
TEMP_DIR="/tmp/yt-dlpservice"
AUDIO_FORMAT="mp3"
AUDIO_BITRATE="128k"

# 文件清理
MAX_FILE_AGE_HOURS="1"
CLEANUP_INTERVAL_HOURS="24"
```

**验收标准**:
- 配置验证完善
- 启动检查正确
- 部署脚本可用

---

### 阶段11: 文件清理机制 (低优先级)
**目标**: 实现完善的临时文件管理

**开发内容**:
- [ ] 增强文件清理逻辑
- [ ] 创建定时清理脚本
- [ ] 添加磁盘空间监控
- [ ] 实现清理日志

**清理机制**:
```typescript
class FileManager {
  async cleanupTask(taskId: string): Promise<void>
  async scheduleCleanup(): Promise<void>
  async forceCleanup(): Promise<void>
  async getDiskUsage(): Promise<DiskInfo>
}
```

**验收标准**:
- 文件清理可靠
- 定时任务正常
- 磁盘监控有效

---

## 开发注意事项

### AI开发友好原则
1. **小步迭代**: 每个阶段功能单一，开发量适中
2. **充分解耦**: 模块间依赖清晰，便于单独开发测试
3. **渐进增强**: 基础功能优先，高级特性后续添加
4. **快速验证**: 每个阶段都有明确的验收标准

### 技术要点
1. **类型安全**: 全程使用TypeScript，配合Zod验证
2. **错误处理**: 每个模块都要有完善的错误处理
3. **日志记录**: 关键操作需要记录日志便于调试
4. **测试验证**: 开发过程中及时测试验证功能

### 部署考虑
1. **环境隔离**: 开发、测试、生产环境分离
2. **依赖管理**: 确保外部依赖(yt-dlp, ffmpeg)正确安装
3. **资源控制**: 合理控制并发任务数和资源使用
4. **监控告警**: 添加基础的运行状态监控

## 项目文件结构

```
yt-dlpservice/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # REST API Routes
│   │   ├── admin/             # 管理页面
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/            # React组件
│   │   ├── ui/               # 基础UI组件
│   │   ├── TaskForm.tsx      # 任务创建表单
│   │   ├── TaskList.tsx      # 任务列表
│   │   └── TaskDetail.tsx    # 任务详情
│   ├── lib/                  # 核心业务逻辑
│   │   ├── services/         # 业务服务
│   │   │   ├── video-downloader.ts
│   │   │   ├── audio-extractor.ts
│   │   │   ├── transcription.ts
│   │   │   ├── task-processor.ts
│   │   │   └── file-manager.ts
│   │   ├── utils/            # 工具函数
│   │   │   ├── config.ts
│   │   │   ├── logger.ts
│   │   │   └── validation.ts
│   │   ├── db.ts             # 数据库连接
│   │   └── trpc.ts           # tRPC配置
│   ├── server/               # tRPC后端
│   │   ├── api/              # API路由
│   │   │   ├── routers/
│   │   │   │   ├── task.ts
│   │   │   │   └── config.ts
│   │   │   ├── root.ts
│   │   │   └── trpc.ts
│   │   └── db.ts
│   └── types/                # TypeScript类型
│       ├── task.ts
│       └── api.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   ├── worker.ts             # 后台任务处理器
│   ├── cleanup.ts            # 清理脚本
│   └── setup.sh              # 环境设置
├── .env.example
├── .env.local
├── ecosystem.config.js       # PM2配置
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

此开发计划专为AI辅助开发设计，每个阶段都有明确的目标和验收标准，确保开发过程可控、可验证。 