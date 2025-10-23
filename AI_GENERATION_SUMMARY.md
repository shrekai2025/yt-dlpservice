# AI生成系统 - 项目探索总结

## 项目概况

这是一个**完整的企业级AI内容生成系统**，集成了41个不同的AI模型适配器，支持：
- 文本到图像（Text-to-Image）
- 文本到视频（Text-to-Video）
- 图像编辑（Image Editing）
- 语音合成（Text-to-Speech）
- Studio脚本制作工作流

---

## 文档导航

本项目已生成**3份详细文档**：

### 1. AI_GENERATION_STRUCTURE.md（37KB）
**完整的代码结构和功能映射**

涵盖内容：
- 核心架构与目录结构
- AI生成独立功能实现
- Studio脚本制作中的AI功能
- AI供应商接入完整步骤
- 模型配置与管理
- API调用封装逻辑
- 现有41个适配器列表
- 数据库架构关系

**适合**：想要快速了解整个系统的架构和功能的开发者

### 2. AI_GENERATION_IMPLEMENTATION_GUIDE.md（21KB）
**深入实现细节与开发指南**

涵盖内容：
- 项目文件映射表
- 核心概念（适配器模式、任务生命周期、成本计算）
- 实现新适配器的完整示例（MyStudioAdapter）
- 错误处理最佳实践
- 异步任务轮询详解
- 结果存储和S3上传
- 参数验证和映射
- 前端集成示例
- 调试技巧和常见问题

**适合**：需要扩展系统或实现新功能的开发者

### 3. AI_GENERATION_SUMMARY.md（本文档）
**项目总结与快速参考**

---

## 关键发现

### 1. 架构设计
采用**适配器模式（Adapter Pattern）**，每个AI供应商对应一个适配器类：

```
┌─────────────────────────────┐
│   AI生成API (tRPC/REST)    │
├─────────────────────────────┤
│      任务管理服务层         │
│  (创建、更新、轮询、存储)    │
├─────────────────────────────┤
│      适配器工厂             │
│  (动态创建适配器实例)        │
├─────────────────────────────┤
│      41个模型适配器         │
│  (KIE × 34, TuZi × 2, ...)  │
└─────────────────────────────┘
```

**优势**：
- 统一接口，易于维护
- 支持同步和异步任务
- 添加新供应商只需3步

### 2. 集成的AI供应商

| 供应商 | 模型数 | 功能 |
|--------|--------|------|
| Kie.ai | 34 | 图像生成、视频生成、图像编辑 |
| TuZi | 2 | Kling、Midjourney |
| Replicate | 2 | Flux、Minimax |
| OpenAI | 1 | DALL-E |
| Pollo | 2 | VEO 3、Kling |
| ElevenLabs | 1 | TTS语音合成 |
| **总计** | **41** | - |

### 3. Studio脚本制作功能

完整的端到端工作流：
```
项目(Project) → 集(Episode) → 镜头(Shot) → 帧(Frame) → AI任务
                                  ↓
                            在镜头中选择AI模型
                            输入提示词或参考图
                            生成后关联到帧
```

### 4. 成本追踪
每个任务都计算成本，支持：
- 固定价格定义
- 动态成本计算函数
- 根据参数调整价格

### 5. 异步任务处理
内置后台轮询系统：
- 轮询间隔：5秒
- 最大轮询次数：180次
- 最大时长：30分钟
- 自动超时告警

---

## 快速开始指南

### 添加新的AI供应商（3步）

#### Step 1: 创建适配器类
```typescript
// src/lib/ai-generation/adapters/{provider}/{provider}-adapter.ts
export class CustomAdapter extends BaseAdapter {
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    // 实现生成逻辑
  }
  
  async checkTaskStatus(taskId: string): Promise<AdapterResponse> {
    // 实现异步任务状态检查
  }
}
```

#### Step 2: 注册适配器
```typescript
// src/lib/ai-generation/adapters/adapter-factory.ts
import { CustomAdapter } from './custom/{provider}-adapter'

const ADAPTER_REGISTRY = {
  CustomAdapter,  // 添加这一行
}
```

#### Step 3: 配置数据库
```sql
INSERT INTO ai_providers (...) VALUES (...);
INSERT INTO ai_models (...) VALUES (...);
```

然后配置参数、验证规则和定价信息。

**详见**：AI_GENERATION_IMPLEMENTATION_GUIDE.md 第3章

---

## 核心文件速查表

| 文件路径 | 用途 | 关键方法 |
|---------|------|---------|
| `/src/lib/ai-generation/adapters/base-adapter.ts` | 基类 | `dispatch()` |
| `/src/lib/ai-generation/adapters/adapter-factory.ts` | 工厂 | `createAdapter()` |
| `/src/lib/ai-generation/services/model-service.ts` | 模型管理 | `listModels()` |
| `/src/lib/ai-generation/services/task-manager.ts` | 任务管理 | `createTask()` |
| `/src/lib/ai-generation/services/task-poller.ts` | 轮询 | `pollAsyncTask()` |
| `/src/server/api/routers/ai-generation.ts` | API | `generate()` |
| `/src/app/admin/ai-generation/page.tsx` | 主页面 | 用户界面 |
| `/src/components/studio/ShotAIGenerationPanel.tsx` | Studio面板 | 镜头AI生成 |

---

## 数据库关键表

```prisma
// 平台层
model AIPlatform {
  id          String
  name        String
  providers   AIProvider[]  // 1:N
}

// 供应商层
model AIProvider {
  id          String
  slug        String
  apiKey      String?
  apiEndpoint String?
  models      AIModel[]  // 1:N
}

// 模型层
model AIModel {
  id              String
  slug            String
  adapterName     String
  outputType      String  // IMAGE|VIDEO|AUDIO
  inputCapabilities String?
  outputCapabilities String?
  tasks           AIGenerationTask[]  // 1:N
}

// 任务层
model AIGenerationTask {
  id              String
  modelId         String
  prompt          String
  status          String  // PENDING|PROCESSING|SUCCESS|FAILED
  progress        Float?
  results         String? // JSON: [{ type, url }]
  providerTaskId  String?
  costUSD         Float?
  shotId          String? // Studio关联
  studioFrames    StudioFrame[]
}
```

---

## API接口

### 内部tRPC API
```typescript
// 创建生成任务
api.aiGeneration.generate.useMutation({
  modelId: string
  prompt: string
  inputImages?: string[]
  numberOfOutputs?: number
  parameters?: Record<string, unknown>
})

// 获取任务状态
api.aiGeneration.getTask.useQuery({ taskId: string })

// 列出模型
api.aiGeneration.listModels.useQuery({
  outputType?: 'IMAGE' | 'VIDEO' | 'AUDIO'
  isActive?: boolean
})
```

### 外部REST API
```bash
POST /api/external/ai-generation
Headers: X-API-Key: {api-key}
Body: {
  "model_slug": "kie-4o-image",
  "prompt": "A beautiful sunset",
  "parameters": { "size": "1024x1024" }
}
```

---

## 任务生命周期

```
PENDING
  ↓ (任务创建)
  
PROCESSING
  ↓ (如果返回providerTaskId)
  ├─ 后台轮询 (每5秒)
  ├─ 更新进度
  └─ 检查状态
  
SUCCESS (or FAILED)
  ↓
保存结果到数据库
上传到S3（如果配置）
返回给用户
```

---

## 性能特性

1. **缓存策略**
   - 模型列表缓存：60秒
   - 供应商列表缓存：60秒
   - 避免重复查询

2. **异步处理**
   - 长轮询不阻塞用户请求
   - 自动超时处理
   - 错误日志自动上报

3. **成本计算**
   - 任务创建时自动计算
   - 支持动态定价函数
   - 保存到数据库以供分析

4. **S3存储**
   - 可选自动上传
   - 失败自动回退
   - 支持自定义路径前缀

---

## 常见集成场景

### 场景1: 添加新的AI供应商
时间：30分钟
步骤：
1. 创建适配器类（15分钟）
2. 注册到工厂（5分钟）
3. 数据库配置（5分钟）
4. 参数和定价配置（5分钟）

**参考文档**：AI_GENERATION_IMPLEMENTATION_GUIDE.md 第3章

### 场景2: Studio中使用AI生成
时间：已集成
组件：`ShotAIGenerationPanel.tsx`
用法：自动关联到镜头ID，生成结果保存到StudioFrame

### 场景3: 批量生成
时间：需要自定义
方法：
1. 使用外部REST API
2. 传入api-key
3. 轮询任务状态
4. 收集结果

---

## 问题排查

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 适配器不可用 | 未注册 | 检查adapter-factory.ts |
| 任务卡在PROCESSING | checkTaskStatus未实现 | 实现状态检查方法 |
| API Key不生效 | 环境变量格式错误 | 使用AI_PROVIDER_{SLUG}_API_KEY |
| S3上传失败 | 权限或网络问题 | 检查S3配置，回退原始URL |
| 参数验证失败 | Schema不匹配 | 更新parameter-schemas.ts |

**详见**：AI_GENERATION_IMPLEMENTATION_GUIDE.md 第10章

---

## 下一步阅读

### 如果你想...

**了解系统整体架构**
→ 阅读 AI_GENERATION_STRUCTURE.md 第1-5章

**实现新的供应商**
→ 阅读 AI_GENERATION_IMPLEMENTATION_GUIDE.md 第3章

**理解异步任务处理**
→ 阅读 AI_GENERATION_STRUCTURE.md 第6.4章 或 AI_GENERATION_IMPLEMENTATION_GUIDE.md 第5章

**集成到自己的项目**
→ 阅读 AI_GENERATION_IMPLEMENTATION_GUIDE.md 第8章

**调试问题**
→ 阅读 AI_GENERATION_IMPLEMENTATION_GUIDE.md 第9-10章

---

## 技术栈

- **后端框架**：Next.js 13+ (App Router)
- **API**：tRPC + REST
- **ORM**：Prisma
- **数据库**：SQLite
- **HTTP客户端**：Axios
- **验证**：Zod
- **存储**：AWS S3
- **前端**：React 18+

---

## 文件统计

- **总适配器数**：41个
- **总文件数**：100+个TypeScript文件
- **代码行数**：~15,000+行
- **支持的输出类型**：IMAGE, VIDEO, AUDIO

---

## 最后备注

本项目是一个**生产级别的AI集成系统**，已在实际项目中使用。代码质量高，架构清晰，易于扩展。

所有新增适配器都应遵循现有的模式和约定，以保持代码的一致性和可维护性。

---

**文档生成日期**: 2025-10-23
**版本**: 1.0
**状态**: 完整

