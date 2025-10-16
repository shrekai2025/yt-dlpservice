# 🎨 AI内容生成模块

## 概述

本项目现已集成强大的AI内容生成功能，支持多个主流AI供应商的图像和视频生成服务。

## ✨ 特性

### 🤖 支持的AI模型

#### 图像生成 (6个模型)
- **OpenAI DALL-E 3** - 高质量文生图，支持HD质量
- **Kie Flux Kontext** - 可控性强的图像生成
- **Kie Midjourney** - 艺术风格图像
- **Kie 4o Image** - GPT-4o驱动
- **TuZi Midjourney** - Midjourney平台
- **Replicate Flux Pro** - 专业级质量

#### 视频生成 (6个模型)
- **Pollo Veo 3** ⭐ - Google最新视频生成，支持文生视频和图生视频
- **Pollo Kling 1.5** ⭐ - 快速图生视频，支持镜头运动
- **Kie Sora** - OpenAI Sora（框架已就绪，待API开放）
- **Kie Midjourney Video** - Midjourney图生视频
- **TuZi Kling** - 可灵视频生成
- **Replicate Minimax** - 文生视频

### 🛡️ 核心功能

- ✅ **统一接口** - 所有模型使用相同的调用方式
- ✅ **参数验证** - 使用Zod schema严格验证所有参数
- ✅ **错误监控** - 完整的错误日志和系统告警
- ✅ **健康检查** - 自动检测供应商可用性
- ✅ **异步支持** - 智能轮询处理长时间生成任务
- ✅ **S3存储** - 可选自动上传到对象存储
- ✅ **外部API** - RESTful API支持外部调用
- ✅ **实时更新** - WebSocket实时推送任务状态
- ✅ **Toast通知** - 优雅的用户提示

## 🚀 快速开始

### 一键安装

```bash
npm run ai:setup
```

这将自动完成：
1. 检查环境依赖
2. 应用数据库迁移
3. 初始化AI模型数据
4. 引导配置API密钥
5. 启动开发服务器

### 手动安装

```bash
# 1. 应用数据库迁移
npx prisma migrate deploy

# 2. 初始化模型数据
npm run db:seed

# 3. 配置API密钥（在.env文件）
AI_PROVIDER_OPENAI_API_KEY=sk-xxx
AI_PROVIDER_POLLO_API_KEY=xxx
AI_PROVIDER_KIE_AI_API_KEY=xxx

# 4. 启动服务
npm run dev
```

## 📖 使用指南

### 管理界面

访问 `http://localhost:3000/admin/ai-generation`

功能：
- 选择AI模型
- 输入提示词
- 配置参数
- 查看生成结果
- 管理历史任务

### 外部API

#### 创建生成任务

```bash
curl -X POST http://localhost:3000/api/external/ai-generation \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model_slug": "openai-dalle-3",
    "prompt": "A beautiful landscape",
    "parameters": {
      "size": "1024x1024",
      "quality": "hd"
    }
  }'
```

#### 查询任务状态

```bash
curl http://localhost:3000/api/external/ai-generation/tasks/{task_id} \
  -H "X-API-Key: your-api-key"
```

#### 获取可用模型

```bash
curl http://localhost:3000/api/external/ai-generation/models \
  -H "X-API-Key: your-api-key"
```

### 编程调用

```typescript
import { api } from '~/lib/trpc/client'

// 创建生成任务
const result = await api.aiGeneration.generate.mutate({
  modelId: 'model-id',
  prompt: 'A serene Japanese garden',
  parameters: {
    size: '1024x1024',
    quality: 'hd'
  }
})

// 查询任务
const task = await api.aiGeneration.getTask.query({
  taskId: result.id
})
```

## 🔧 配置

### API密钥配置

**方式1: 环境变量**
```bash
# .env
AI_PROVIDER_OPENAI_API_KEY=sk-xxx
AI_PROVIDER_POLLO_API_KEY=xxx
AI_PROVIDER_KIE_AI_API_KEY=xxx
AI_PROVIDER_TUZI_API_KEY=xxx
AI_PROVIDER_REPLICATE_API_KEY=r8_xxx
```

**方式2: 管理页面**
1. 访问 `/admin/ai-generation/providers`
2. 点击供应商的"设置API Key"
3. 输入密钥并保存

### S3自动上传

在供应商管理页面：
1. 启用"上传到S3"开关
2. 设置路径前缀（如：`ai-generation/openai/`）
3. 确保已配置火山引擎S3环境变量

生成结果将自动上传到S3并返回CDN URL

## 📊 监控和日志

### 错误日志

查看位置：
- Prisma Studio: `ErrorLog` 表
- 管理界面：即将推出

日志级别：
- `WARN` - 警告信息
- `ERROR` - 错误信息
- `CRITICAL` - 严重错误

### 系统告警

查看位置：
- Prisma Studio: `SystemAlert` 表

告警类型：
- `ERROR_RATE_HIGH` - 错误率过高
- `TASK_TIMEOUT` - 任务超时
- `API_DOWN` - API不可用
- `QUOTA_EXHAUSTED` - 配额耗尽

### 健康检查

```typescript
import { healthCheckService } from '~/lib/ai-generation/services/health-check-service'

// 检查单个供应商
const health = await healthCheckService.checkProviderHealth('provider-id')

// 检查所有供应商
const allHealth = await healthCheckService.checkAllProviders()
```

## 📁 项目结构

```
src/lib/ai-generation/
├── adapters/              # AI供应商适配器
│   ├── base-adapter.ts    # 基础适配器
│   ├── openai/            # OpenAI适配器
│   ├── pollo/             # Pollo适配器
│   ├── kie/               # Kie.ai适配器
│   ├── tuzi/              # TuZi适配器
│   └── replicate/         # Replicate适配器
├── services/              # 核心服务
│   ├── model-service.ts           # 模型管理
│   ├── task-manager.ts            # 任务管理
│   ├── task-poller.ts             # 异步轮询
│   ├── error-log-service.ts       # 错误日志
│   ├── system-alert-service.ts    # 系统告警
│   ├── result-storage-service.ts  # 结果存储
│   └── health-check-service.ts    # 健康检查
├── validation/            # 参数验证
│   └── parameter-schemas.ts
└── config/               # 配置文件
    └── model-parameters.ts
```

## 🔗 相关文档

- [快速开始指南](./doc/QUICK_START_AI_GENERATION.md)
- [完整功能报告](./doc/AI_GENERATION_FINAL_REPORT.md)
- [迁移指南](./doc/MIGRATION_TO_NEW_AI_GENERATION.md)
- [Seed脚本说明](./doc/SEED_AI_GENERATION_MODELS.md)

## 🤝 贡献

欢迎贡献！可以：
- 添加新的AI供应商适配器
- 改进错误处理
- 优化用户界面
- 完善文档

## 📝 许可证

MIT

---

**享受AI创作的乐趣！** 🎨✨

