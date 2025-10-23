# AI生成代码结构完整映射

## 项目概览

这是一个完整的AI内容生成系统，支持多个AI供应商（Provider）和模型（Model）的集成。系统采用适配器模式（Adapter Pattern），每个供应商都有对应的适配器实现。

---

## 1. 核心架构

### 目录结构

```
src/lib/ai-generation/
├── adapters/                          # 适配器实现
│   ├── base-adapter.ts               # 基础适配器抽象类
│   ├── adapter-factory.ts            # 适配器工厂
│   ├── types.ts                      # 类型定义
│   ├── utils/                        # 工具函数
│   │   ├── parameter-mapper.ts       # 参数映射
│   │   ├── retry-handler.ts          # 重试处理
│   │   └── image-utils.ts            # 图像处理
│   ├── kie/                          # Kie.ai 供应商（34个适配器）
│   ├── tuzi/                         # TuZi 供应商
│   ├── replicate/                    # Replicate 供应商
│   ├── openai/                       # OpenAI 供应商
│   ├── pollo/                        # Pollo 供应商
│   └── elevenlabs/                   # ElevenLabs TTS供应商
├── services/                         # 业务服务
│   ├── model-service.ts             # 模型与供应商管理
│   ├── task-manager.ts              # 任务创建与更新
│   ├── task-poller.ts               # 异步任务轮询
│   ├── result-storage-service.ts    # 结果存储（S3）
│   ├── health-check-service.ts      # 供应商健康检查
│   ├── error-log-service.ts         # 错误日志
│   └── system-alert-service.ts      # 系统告警
├── config/                           # 配置文件
│   ├── model-parameters.ts          # 模型参数配置
│   └── pricing-info.ts              # 模型定价配置
└── validation/                       # 验证规则
    └── parameter-schemas.ts         # 参数验证Schema
```

---

## 2. AI生成独立功能

### 代码位置
- **主页面**: `/src/app/admin/ai-generation/page.tsx`
- **任务历史**: `/src/app/admin/ai-generation/tasks/page.tsx`
- **任务详情**: `/src/app/admin/ai-generation/tasks/[id]/page.tsx`
- **供应商管理**: `/src/app/admin/ai-generation/providers/page.tsx`

### 实现方式

#### 1. 生成流程

```typescript
// 用户界面 (React组件)
用户选择供应商 → 选择模型 → 输入提示词 → 配置参数 → 提交生成

// 后端处理 (tRPC API)
POST /trpc/aiGeneration.generate
  ↓
创建任务记录 (AIGenerationTask)
  ↓
获取模型配置
  ↓
通过适配器工厂创建适配器实例
  ↓
调用适配器的 dispatch() 方法
  ↓
根据响应类型处理：
  - 同步返回结果 → 保存结果
  - 异步返回taskId → 启动轮询
```

#### 2. 核心流程代码

文件: `/src/server/api/routers/ai-generation.ts`

```typescript
generate: publicProcedure
  .input(
    z.object({
      modelId: z.string(),
      prompt: z.string(),
      inputImages: z.array(z.string()).optional(),
      numberOfOutputs: z.number().int().positive().optional(),
      parameters: z.record(z.unknown()).optional(),
    })
  )
  .mutation(async ({ input }) => {
    // 1. 获取模型信息
    const model = await modelService.getModel(input.modelId)
    
    // 2. 创建任务记录
    const task = await taskManager.createTask({
      modelId: input.modelId,
      prompt: input.prompt,
      inputImages: input.inputImages,
      numberOfOutputs: input.numberOfOutputs,
      parameters: input.parameters,
    })
    
    // 3. 验证参数
    const validatedParams = safeValidateModelParameters(
      model.slug,
      input.parameters || {}
    )
    
    // 4. 创建适配器
    const config = toModelConfig(model)
    const adapter = createAdapter(config)
    
    // 5. 调度生成请求
    const response = await adapter.dispatch({
      prompt: input.prompt,
      inputImages: input.inputImages,
      numberOfOutputs: input.numberOfOutputs,
      parameters: validatedParams,
    })
    
    // 6. 处理响应
    if (response.status === 'SUCCESS') {
      // 同步完成
      const results = await resultStorageService.processResults(...)
      await taskManager.updateTask(task.id, {
        status: 'SUCCESS',
        results: JSON.stringify(results),
      })
    } else if (response.status === 'PROCESSING') {
      // 异步处理 - 启动轮询
      await taskManager.updateTask(task.id, {
        status: 'PROCESSING',
        providerTaskId: response.providerTaskId,
      })
      
      // 后台轮询（不阻塞）
      pollAsyncTask(task.id, response.providerTaskId, ...)
    }
    
    return task
  })
```

#### 3. 参数配置

文件: `/src/lib/ai-generation/config/model-parameters.ts`

每个模型定义其支持的参数：

```typescript
export const MODEL_PARAMETERS: Record<string, ParameterField[]> = {
  'kie-4o-image': [
    {
      key: 'size',
      label: '图片尺寸',
      type: 'select',
      defaultValue: '1024x1024',
      options: [
        { label: '1024x1024', value: '1024x1024' },
        { label: '1792x1024', value: '1792x1024' },
        { label: '1024x1792', value: '1024x1792' },
      ],
    },
    {
      key: 'isEnhance',
      label: '提示词增强',
      type: 'boolean',
      defaultValue: false,
    },
  ],
  // ... 其他模型
}
```

#### 4. 定价信息

文件: `/src/lib/ai-generation/config/pricing-info.ts`

```typescript
export const MODEL_PRICING_INFO: Record<string, string | ((params: Record<string, unknown>) => string)> = {
  'kie-4o-image': (params) => {
    const outputs = params.numberOfOutputs as number || 1
    let credits = 0
    if (outputs === 1) credits = 6
    else if (outputs === 2) credits = 7
    else if (outputs >= 4) credits = 8
    const cost = (credits * 0.005).toFixed(3)
    return `${credits} Credits ≈ $${cost}`
  },
  // ... 其他模型
}
```

---

## 3. Studio脚本制作中的AI生成功能

### 代码位置
- **Studio主页**: `/src/app/admin/ai-generation/studio/page.tsx`
- **项目详情**: `/src/app/admin/ai-generation/studio/[slug]/page.tsx`
- **集详情**: `/src/app/admin/ai-generation/studio/[slug]/[episodeId]/page.tsx`
- **镜头AI面板**: `/src/components/studio/ShotAIGenerationPanel.tsx`
- **任务历史**: `/src/components/studio/ShotTaskHistory.tsx`

### 实现方式

#### 1. Studio工作流架构

```
StudioProject (项目)
  ↓
StudioEpisode (集)
  ↓
StudioShot (镜头)
  ├─ StudioShotCharacter (镜头中的角色)
  ├─ StudioFrame (帧/生成任务)
  │  └─ AIGenerationTask (关联AI任务)
  └─ StudioSetting (场景设置)
```

#### 2. 镜头AI生成面板

文件: `/src/components/studio/ShotAIGenerationPanel.tsx`

关键功能：
- 选择输出类型（IMAGE/VIDEO/AUDIO）
- 选择供应商和模型
- 输入提示词
- 上传参考图片
- 配置模型参数
- 查看生成历史

```typescript
// 获取供应商和模型
const { data: providersData } = api.aiGeneration.listProviders.useQuery()
const { data: modelsData } = api.aiGeneration.listModels.useQuery()

// 生成mutation
const generateMutation = api.aiGeneration.generate.useMutation({
  onSuccess: () => {
    toast.success('任务已创建')
    onTaskCreated?.()
  },
  onError: (error) => {
    toast.error(`生成失败: ${error.message}`)
  },
})

// 关键参数
interface ShotAIGenerationPanelProps {
  shotId: string                              // 绑定的镜头
  onTaskCreated?: () => void                  // 任务创建回调
  sceneDescriptions?: Array<{                 // 场景描述
    characterName: string
    description: string
  }> | null
}
```

#### 3. 数据库关联

文件: `/prisma/schema.prisma`

```prisma
model StudioShot {
  id                String             @id @default(cuid())
  episodeId         String
  shotNumber        Int
  title             String?
  description       String?
  duration          Float?             // 持续时间（秒）
  
  // AI生成关联
  aiGenerationTasks AIGenerationTask[] @relation("ShotAITasks")
  frames            StudioFrame[]      @relation("ShotFrames")
  characters        StudioShotCharacter[]
  
  @@map("studio_shots")
}

model AIGenerationTask {
  id                String         @id @default(cuid())
  shotId            String?        // 关联的镜头
  modelId           String
  prompt            String
  
  // ... 其他字段
  
  shot              StudioShot?    @relation(fields: [shotId], references: [id], onDelete: SetNull)
  studioFrames      StudioFrame[]  // 一个任务可生成多个帧
  
  @@map("ai_generation_tasks")
}

model StudioFrame {
  id                String         @id @default(cuid())
  shotId            String
  frameNumber       Int
  
  // AI生成
  generatedImageUrl String?        // 从AI任务生成的图像
  aiGenerationTaskId String?       // 关联的AI任务
  aiGenerationTask  AIGenerationTask? @relation(fields: [aiGenerationTaskId])
  
  @@map("studio_frames")
}
```

#### 4. Studio API路由

文件: `/src/server/api/routers/studio.ts`

主要操作：
- `listProjects`: 获取用户项目
- `createProject`: 创建新项目
- `listEpisodes`: 获取项目集列表
- `createEpisode`: 创建新集
- `listShots`: 获取集的镜头
- `createShot`: 创建新镜头
- `listFrames`: 获取镜头的帧
- `createFrame`: 创建新帧
- 与AI生成集成的任务管理

---

## 4. AI供应商接入方式

### 4.1 添加新供应商的完整步骤

#### Step 1: 数据库配置

```sql
-- 1. 添加平台（可选）
INSERT INTO ai_platforms (id, name, slug, description, website)
VALUES ('platform-id', 'Platform Name', 'platform-slug', 'Description', 'https://...');

-- 2. 添加供应商
INSERT INTO ai_providers (id, name, slug, description, platformId, apiEndpoint, apiKey, uploadToS3, isActive, sortOrder)
VALUES ('provider-id', 'Provider Name', 'provider-slug', 'Description', 'platform-id', 'https://api.provider.com', NULL, 0, 1, 10);

-- 3. 添加模型
INSERT INTO ai_models (id, name, slug, description, providerId, outputType, adapterName, inputCapabilities, outputCapabilities, isActive, sortOrder)
VALUES ('model-id', 'Model Name', 'model-slug', 'Description', 'provider-id', 'IMAGE', 'CustomAdapter', '["text-input"]', '["image-output"]', 1, 1);
```

#### Step 2: 创建适配器（如果是新供应商API）

文件: `/src/lib/ai-generation/adapters/{provider}/{provider}-adapter.ts`

```typescript
import { BaseAdapter } from '../base-adapter'
import type { GenerationRequest, GenerationResult, AdapterResponse } from '../types'

export class CustomAdapter extends BaseAdapter {
  /**
   * 必须实现：调度生成请求
   * 返回同步结果或异步任务ID
   */
  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      return {
        status: 'ERROR',
        message: 'Missing API key',
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required',
          isRetryable: false,
        },
      }
    }

    try {
      // 构建请求
      const payload = {
        prompt: request.prompt,
        ...request.parameters,
      }

      // 调用供应商API
      const response = await this.httpClient.post('/v1/generate', payload, {
        baseURL: this.getApiEndpoint(),
      })

      // 同步完成
      if (response.data.status === 'completed') {
        return {
          status: 'SUCCESS',
          results: [{
            type: 'image',
            url: response.data.imageUrl,
          }],
        }
      }

      // 异步处理（需要轮询）
      return {
        status: 'PROCESSING',
        providerTaskId: response.data.taskId,
        message: 'Task submitted, polling required',
      }
    } catch (error) {
      this.log('error', 'Dispatch failed', error)
      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: {
          code: 'DISPATCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }

  /**
   * 可选实现：检查异步任务状态
   * 如果 dispatch 返回 PROCESSING，需要实现此方法
   */
  async checkTaskStatus(taskId: string): Promise<AdapterResponse> {
    try {
      const response = await this.httpClient.get(`/v1/tasks/${taskId}`, {
        baseURL: this.getApiEndpoint(),
      })

      if (response.data.status === 'completed') {
        return {
          status: 'SUCCESS',
          results: [{
            type: 'image',
            url: response.data.imageUrl,
          }],
          progress: 1,
        }
      }

      if (response.data.status === 'failed') {
        return {
          status: 'ERROR',
          message: response.data.error,
          error: {
            code: 'GENERATION_FAILED',
            message: response.data.error,
            isRetryable: false,
          },
        }
      }

      // 仍在处理中
      return {
        status: 'PROCESSING',
        progress: response.data.progress || 0.5,
        message: 'Still processing',
      }
    } catch (error) {
      this.log('error', 'Status check failed', error)
      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: true,
        },
      }
    }
  }
}
```

#### Step 3: 注册适配器

文件: `/src/lib/ai-generation/adapters/adapter-factory.ts`

```typescript
import { CustomAdapter } from './custom-provider/custom-adapter'

// 添加到注册表
const ADAPTER_REGISTRY: Record<string, new (config: ModelConfig) => BaseAdapter> = {
  // ... 其他适配器
  CustomAdapter,
}
```

#### Step 4: 配置模型参数

文件: `/src/lib/ai-generation/config/model-parameters.ts`

```typescript
export const MODEL_PARAMETERS: Record<string, ParameterField[]> = {
  'custom-model-slug': [
    {
      key: 'size',
      label: '输出尺寸',
      type: 'select',
      defaultValue: '1024x1024',
      options: [
        { label: '512x512', value: '512x512' },
        { label: '1024x1024', value: '1024x1024' },
        { label: '2048x2048', value: '2048x2048' },
      ],
    },
    {
      key: 'quality',
      label: '质量等级',
      type: 'select',
      defaultValue: 'high',
      options: [
        { label: '标准', value: 'standard' },
        { label: '高质量', value: 'high' },
        { label: '超高质量', value: 'ultra' },
      ],
    },
  ],
}
```

#### Step 5: 配置参数验证

文件: `/src/lib/ai-generation/validation/parameter-schemas.ts`

```typescript
import { z } from 'zod'

export const CustomModelParametersSchema = z.object({
  size: z.enum(['512x512', '1024x1024', '2048x2048']).default('1024x1024'),
  quality: z.enum(['standard', 'high', 'ultra']).default('high'),
})
```

#### Step 6: 配置定价信息

文件: `/src/lib/ai-generation/config/pricing-info.ts`

```typescript
export const MODEL_PRICING_INFO: Record<string, string | ((params: Record<string, unknown>) => string)> = {
  'custom-model-slug': (params) => {
    const quality = params.quality as string || 'high'
    let cost = 0.01
    if (quality === 'ultra') cost = 0.03
    return `约 $${cost.toFixed(2)}`
  },
}
```

---

## 5. AI模型配置和管理

### 5.1 模型配置信息

文件: `/src/lib/ai-generation/config/model-parameters.ts`

包含所有模型的参数配置（硬编码），用于前端动态渲染参数表单：

```typescript
export type ParameterFieldType = 'string' | 'number' | 'boolean' | 'select' | 'textarea'

export interface ParameterField {
  key: string                           // 参数键
  label: string                         // UI标签
  type: ParameterFieldType              // 字段类型
  defaultValue?: unknown                // 默认值
  options?: ParameterFieldOption[]       // select选项
  helperText?: string                   // 帮助文本
  placeholder?: string                  // 占位符
  min?: number                          // 最小值
  max?: number                          // 最大值
  step?: number                         // 步长
}
```

### 5.2 模型验证规则

文件: `/src/lib/ai-generation/validation/parameter-schemas.ts`

使用Zod定义每个模型的参数验证规则：

```typescript
const BaseParametersSchema = z.object({}).passthrough() // 允许任意字段

export const Kie4oImageParametersSchema = z.object({
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
  style: z.enum(['natural', 'vivid']).default('vivid'),
  quality: z.enum(['standard', 'hd']).default('standard'),
})
```

### 5.3 模型定价配置

文件: `/src/lib/ai-generation/config/pricing-info.ts`

每个模型可定义固定价格或动态计算函数：

```typescript
export const MODEL_PRICING_INFO: Record<string, string | ((params: Record<string, unknown>) => string)> = {
  // 固定价格
  'kie-nano-banana': '4 Credits/张 ≈ $0.020',
  
  // 动态计算
  'kie-4o-image': (params) => {
    const outputs = params.numberOfOutputs as number || 1
    let credits = 0
    if (outputs === 1) credits = 6
    else if (outputs === 2) credits = 7
    else if (outputs >= 4) credits = 8
    const cost = (credits * 0.005).toFixed(3)
    return `${credits} Credits ≈ $${cost}`
  },
}
```

### 5.4 模型数据库结构

```prisma
model AIModel {
  id                 String             @id @default(cuid())
  name               String             // 模型名称
  slug               String             @unique // 唯一标识符
  description        String?
  providerId         String
  outputType         String             // IMAGE | VIDEO | AUDIO
  adapterName        String             // 适配器类名
  inputCapabilities  String?            // JSON: ["text-input", "image-input"]
  outputCapabilities String?            // JSON: ["image-output"]
  featureTags        String?            // JSON: ["high-quality", "fast"]
  functionTags       String?            // JSON: ["text-to-image", "image-editing"]
  usageCount         Int                @default(0) // 使用次数统计
  isActive           Boolean            @default(true)
  sortOrder          Int                @default(0)
  pricingInfo        String?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  
  tasks              AIGenerationTask[]
  studioFrames       StudioFrame[]
  provider           AIProvider         @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  @@index([slug])
  @@index([providerId])
  @@index([outputType])
  @@index([isActive])
}
```

---

## 6. API调用的封装逻辑

### 6.1 基础适配器（BaseAdapter）

文件: `/src/lib/ai-generation/adapters/base-adapter.ts`

提供通用功能：

```typescript
export abstract class BaseAdapter {
  protected config: ModelConfig
  protected httpClient: AxiosInstance

  constructor(config: ModelConfig) {
    this.config = config
    this.httpClient = this.createHttpClient()
  }

  /**
   * 创建HTTP客户端，带认证
   */
  protected createHttpClient(): AxiosInstance {
    const clientConfig: HttpClientConfig = {
      timeout: 120000, // 2分钟
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const apiKey = this.getApiKey()
    if (apiKey) {
      clientConfig.headers = {
        ...clientConfig.headers,
        ...this.getAuthHeaders(apiKey),
      }
    }

    return axios.create(clientConfig)
  }

  /**
   * 获取API Key
   * 优先级：数据库 > 环境变量
   */
  protected getApiKey(): string {
    // 数据库中的Key
    if (this.config.provider.apiKey) {
      return this.config.provider.apiKey
    }

    // 环境变量 fallback
    const envVarName = `AI_PROVIDER_${this.config.provider.slug.toUpperCase().replace(/-/g, '_')}_API_KEY`
    return process.env[envVarName] || ''
  }

  /**
   * 获取API端点
   */
  protected getApiEndpoint(): string {
    return this.config.provider.apiEndpoint || ''
  }

  /**
   * 获取认证头（子类可覆盖）
   */
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
    }
  }

  /**
   * 日志记录（自动上报错误到错误日志服务）
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown)

  /**
   * 子类必须实现：调度生成请求
   */
  abstract dispatch(request: GenerationRequest): Promise<AdapterResponse>

  /**
   * 子类可选实现：检查异步任务状态
   */
  async checkTaskStatus?(taskId: string): Promise<AdapterResponse>
}
```

### 6.2 适配器工厂（Adapter Factory）

文件: `/src/lib/ai-generation/adapters/adapter-factory.ts`

```typescript
/**
 * 根据模型配置创建对应的适配器实例
 */
export function createAdapter(config: ModelConfig): BaseAdapter {
  const AdapterClass = ADAPTER_REGISTRY[config.adapterName]

  if (!AdapterClass) {
    const availableAdapters = Object.keys(ADAPTER_REGISTRY).join(', ')
    throw new Error(
      `Unknown adapter: ${config.adapterName}. Available adapters: ${availableAdapters}`
    )
  }

  return new AdapterClass(config)
}
```

### 6.3 API调用流程

```
┌─────────────────────────────────────────────────────────┐
│ 用户请求                                               │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 1. 验证参数 (safeValidateModelParameters)              │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 2. 创建任务记录 (taskManager.createTask)                │
│    - 计算任务成本 (calculateTaskCost)                   │
│    - 保存到数据库                                      │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 获取模型配置 (toModelConfig)                         │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 4. 创建适配器 (createAdapter)                           │
│    - 实例化对应适配器类                                │
│    - 初始化HTTP客户端                                  │
│    - 配置认证信息                                      │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 5. 调度请求 (adapter.dispatch)                          │
│    - 构建请求载荷                                      │
│    - 调用供应商API                                     │
│    - 解析响应                                          │
└──────────────────┬──────────────────────────────────────┘
                   ↓
          ┌────────┴──────────┐
          ↓                   ↓
    ┌──────────────┐    ┌──────────────┐
    │ 同步完成     │    │ 异步处理     │
    │ SUCCESS      │    │ PROCESSING   │
    └──────┬───────┘    └──────┬───────┘
           ↓                   ↓
    ┌──────────────┐    ┌──────────────────┐
    │ 处理结果     │    │ 启动后台轮询     │
    │ (S3上传)     │    │ (pollAsyncTask)   │
    └──────┬───────┘    └──────┬───────────┘
           ↓                   ↓
    ┌──────────────┐    ┌──────────────────┐
    │ 更新任务为   │    │ 循环检查状态     │
    │ SUCCESS      │    │ (checkTaskStatus)│
    └──────────────┘    └──────┬───────────┘
                                ↓
                        ┌───────────────────┐
                        │ 状态更新完成      │
                        │ 返回结果          │
                        └───────────────────┘
```

### 6.4 异步任务轮询

文件: `/src/lib/ai-generation/services/task-poller.ts`

```typescript
export async function pollAsyncTask(
  taskId: string,
  providerTaskId: string,
  modelConfig: ModelConfig,
  db: PrismaClient,
  startedAt: number,
  options: PollingOptions = {}
) {
  const { pollIntervalMs, maxAttempts, maxDurationMs } = {
    pollIntervalMs: 5000,      // 5秒间隔
    maxAttempts: 180,          // 最多180次
    maxDurationMs: 1800000,    // 最多30分钟
    ...options,
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1. 检查超时
    const elapsed = Date.now() - startedAt
    if (elapsed > maxDurationMs) {
      await taskManager.updateTask(taskId, {
        status: 'FAILED',
        errorMessage: `Task timeout after ${Math.round(elapsed / 1000)}s`,
      })
      return
    }

    // 2. 检查任务是否被删除或状态改变
    const currentTask = await db.aIGenerationTask.findUnique({
      where: { id: taskId },
      select: { deletedAt: true, status: true },
    })

    if (!currentTask || currentTask.deletedAt) {
      console.log(`Task ${taskId} deleted, stop polling`)
      return
    }

    if (currentTask.status !== 'PROCESSING' && currentTask.status !== 'PENDING') {
      console.log(`Task status changed to ${currentTask.status}, stop polling`)
      return
    }

    try {
      // 3. 查询状态
      const adapter = createAdapter(modelConfig)
      const status = await adapter.checkTaskStatus(providerTaskId)

      if (!status) {
        await sleep(pollIntervalMs)
        continue
      }

      // 4. 处理结果
      if (status.status === 'SUCCESS') {
        await taskManager.updateTask(taskId, {
          status: 'SUCCESS',
          results: JSON.stringify(status.results || []),
          completedAt: new Date(),
          progress: 1,
        })
        await taskManager.incrementModelUsage(modelConfig.id)
        return
      }

      if (status.status === 'ERROR') {
        await taskManager.updateTask(taskId, {
          status: 'FAILED',
          errorMessage: status.message || 'Generation failed',
          progress: status.progress ?? null,
        })
        return
      }

      // 5. 更新进度
      await taskManager.updateTask(taskId, {
        progress: status.progress ?? null,
      })

    } catch (error) {
      // 错误日志和重试
      console.warn(`Polling error for task ${taskId} (attempt ${attempt})`, error)
      if (attempt >= 3) {
        await taskManager.updateTask(taskId, {
          status: 'FAILED',
          errorMessage: `Polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
        return
      }
    }

    await sleep(pollIntervalMs)
  }

  // 达到最大轮询次数
  await taskManager.updateTask(taskId, {
    status: 'FAILED',
    errorMessage: `Task did not complete after ${maxAttempts} polling attempts`,
  })
}
```

### 6.5 结果存储处理

文件: `/src/lib/ai-generation/services/result-storage-service.ts`

```typescript
export class ResultStorageService {
  /**
   * 处理生成结果
   * 根据配置决定是否上传到S3
   */
  async processResults(
    results: GenerationResult[],
    config: StorageConfig
  ): Promise<ProcessedResult[]> {
    if (!config.uploadToS3) {
      // 不上传S3，直接返回原始URL
      return results.map((r) => ({
        type: r.type,
        url: r.url,
      }))
    }

    // 上传到S3
    const processedResults: ProcessedResult[] = []

    for (const result of results) {
      try {
        const processed = await this.uploadResultToS3(result, config.s3PathPrefix)
        processedResults.push(processed)
      } catch (error) {
        // 上传失败，回退到原始URL
        console.error('[ResultStorageService] Upload failed, using original URL:', error)
        processedResults.push({
          type: result.type,
          url: result.url,
          originalUrl: result.url,
        })
      }
    }

    return processedResults
  }

  private async uploadResultToS3(
    result: GenerationResult,
    pathPrefix?: string
  ): Promise<ProcessedResult> {
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const fileExt = this.getFileExtension(result.url, result.type)
    
    const s3Key = pathPrefix
      ? `${pathPrefix}${timestamp}-${randomStr}.${fileExt}`
      : `ai-generation/${timestamp}-${randomStr}.${fileExt}`

    // 下载文件并上传到S3
    const s3Url = await s3Uploader.uploadFromUrl(result.url, s3Key)

    return {
      type: result.type,
      url: s3Url,
      originalUrl: result.url,
      s3Key,
    }
  }
}
```

---

## 7. 现有适配器列表

### 7.1 Kie.ai (34个适配器)
- KieImageAdapter (4o Image)
- KieFluxKontextAdapter (Flux Kontext)
- KieMidjourneyAdapter (Midjourney)
- KieSoraAdapter (Sora)
- KieSora2Adapter (Sora 2)
- KieSora2ImageToVideoAdapter (Sora 2 图生视)
- KieSora2ProAdapter (Sora 2 Pro)
- KieSora2ProImageToVideoAdapter (Sora 2 Pro 图生视)
- KieVeo3Adapter (VEO 3)
- KieVeo31Adapter (VEO 3.1)
- KieVeo31ExtendAdapter (VEO 3.1 Extend)
- KieNanoBananaAdapter (Nano Banana)
- KieNanoBananaEditAdapter (Nano Banana Edit)
- KieNanoBananaUpscaleAdapter (Nano Banana Upscale)
- KieSeedreamV4Adapter (Seedream V4)
- KieSeedreamV4EditAdapter (Seedream V4 Edit)
- KieQwenImageEditAdapter (Qwen 图像编辑)
- KieSoraWatermarkRemoverAdapter (Sora 水印移除)
- KieKlingV2MasterImageToVideoAdapter (Kling V2 Master 图生视)
- KieKlingV2MasterTextToVideoAdapter (Kling V2 Master 文生视)
- KieKlingV2StandardAdapter (Kling V2 Standard)
- KieKlingV2ProAdapter (Kling V2 Pro)
- KieKlingV25TurboProAdapter (Kling V2.5 Turbo Pro)
- KieKlingV25TurboTextToVideoProAdapter (Kling V2.5 Turbo Pro 文生视)
- KieWan22A14bTextToVideoTurboAdapter (Wan 2.2 A14b 文生视 Turbo)
- KieWan22A14bImageToVideoTurboAdapter (Wan 2.2 A14b 图生视 Turbo)
- KieWan25TextToVideoAdapter (Wan 2.5 文生视)
- KieWan25ImageToVideoAdapter (Wan 2.5 图生视)
- KieByteDanceV1ProTextToVideoAdapter (ByteDance V1 Pro 文生视)
- KieByteDanceV1ProImageToVideoAdapter (ByteDance V1 Pro 图生视)
- KieRunwayAdapter (Runway)
- KieRunwayExtendAdapter (Runway Extend)

### 7.2 其他供应商
- TuziKlingAdapter (TuZi Kling)
- TuziMidjourneyAdapter (TuZi Midjourney)
- ReplicateFluxAdapter (Replicate Flux)
- ReplicateMinimaxAdapter (Replicate Minimax)
- OpenAIDalleAdapter (OpenAI DALL-E)
- PolloVeo3Adapter (Pollo VEO 3)
- PolloKlingAdapter (Pollo Kling)
- ElevenLabsTTSAdapter (ElevenLabs TTS)

**总计**: 41个适配器

---

## 8. 关键服务

### 8.1 Model Service
- `listPlatforms()`: 获取所有平台
- `getPlatform(platformId)`: 获取平台详情
- `listProviders(filter)`: 列出供应商
- `getProvider(providerId)`: 获取供应商详情
- `getProviderBySlug(slug)`: 按slug获取供应商
- `listModels(filter)`: 列出模型
- `getModel(modelId)`: 获取模型详情
- `getModelBySlug(slug)`: 按slug获取模型
- `updateProviderApiKey(providerId, apiKey)`: 更新API Key
- `updateModelStatus(modelId, isActive)`: 更新模型状态

### 8.2 Task Manager
- `createTask(input)`: 创建任务（自动计算成本）
- `getTask(taskId)`: 获取任务详情
- `updateTask(taskId, updates)`: 更新任务
- `listTasks(filter)`: 列出任务
- `deleteTask(taskId)`: 软删除任务
- `incrementModelUsage(modelId)`: 增加使用次数

### 8.3 其他服务
- **HealthCheckService**: 检查供应商健康状态
- **ErrorLogService**: 记录错误日志
- **SystemAlertService**: 系统告警
- **ResultStorageService**: 结果存储和S3上传

---

## 9. 外部API接口

### 9.1 tRPC API (内部使用)

文件: `/src/server/api/routers/ai-generation.ts`

主要方法：
- `listPlatforms`: 获取平台列表
- `getPlatform`: 获取平台详情
- `listProviders`: 获取供应商列表
- `getProvider`: 获取供应商详情
- `listModels`: 获取模型列表
- `getModel`: 获取模型详情
- `generate`: 创建生成任务
- `getTask`: 获取任务详情
- `listTasks`: 列出任务
- `checkProviderHealth`: 检查供应商健康状态
- `updateProviderApiKey`: 更新API Key

### 9.2 REST API (外部使用)

文件: `/src/app/api/external/ai-generation/route.ts`

```
POST /api/external/ai-generation
Headers:
  - X-API-Key: {api-key}
  - Content-Type: application/json

Request Body:
{
  "model_slug": "kie-4o-image",
  "prompt": "A beautiful sunset",
  "input_images": ["https://..."],        // 可选
  "number_of_outputs": 1,                 // 可选
  "parameters": {                         // 可选
    "size": "1024x1024",
    "style": "vivid"
  }
}

Response:
{
  "taskId": "clxxxxxx",
  "status": "PENDING|PROCESSING|SUCCESS|FAILED",
  "results": [
    {
      "type": "image",
      "url": "https://..."
    }
  ],
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

---

## 10. 数据库架构

### 主要表关系

```
┌──────────────────┐
│  AIPlatform      │
│  (平台)          │
└────────┬─────────┘
         │ 1:N
         ↓
┌──────────────────┐
│  AIProvider      │
│  (供应商)        │
│  - apiEndpoint   │
│  - apiKey        │
│  - uploadToS3    │
│  - s3PathPrefix  │
└────────┬─────────┘
         │ 1:N
         ↓
┌──────────────────┐
│  AIModel         │
│  (模型)          │
│  - outputType    │
│  - adapterName   │
│  - parameters    │
└────────┬─────────┘
         │ 1:N
         ↓
┌──────────────────┐
│  AIGenerationTask│
│  (生成任务)      │
│  - status        │
│  - progress      │
│  - results       │
│  - costUSD       │
└────────┬─────────┘
         │ 1:N
         ↓
┌──────────────────┐
│  StudioFrame     │
│  (镜头帧)        │
└──────────────────┘
```

---

## 11. 完整工作流示例

### 独立AI生成流程

```
1. 用户访问 /admin/ai-generation
2. 选择输出类型 (IMAGE)
3. 选择供应商 (Kie.ai)
4. 选择模型 (4o Image)
5. 输入提示词 "A cat in space"
6. 调整参数 (size: 1024x1024, style: vivid)
7. 点击生成

后端处理:
1. 验证参数
2. 创建任务记录（计算成本）
3. 创建KieImageAdapter实例
4. 调用dispatch()
5. 返回PROCESSING（需要轮询）
6. 启动后台轮询（pollAsyncTask）
7. 每5秒检查一次状态
8. 状态完成后保存结果
9. 返回结果URL

前端显示:
- 任务进度
- 完成后显示生成的图像
- 保存到历史记录
```

### Studio中的AI生成流程

```
1. 用户创建Studio项目
2. 创建集（Episode）
3. 创建镜头（Shot）
4. 在镜头中点击"AI生成"
5. ShotAIGenerationPanel打开
6. 选择模型并生成图像
7. 生成的图像关联到StudioFrame
8. 用户可在集编辑页面看到生成的镜头
9. 继续调整或导出视频
```

---

## 12. 常见集成任务

### 添加新的AI供应商
1. 创建适配器类 ✓
2. 在数据库添加供应商记录 ✓
3. 在数据库添加模型记录 ✓
4. 在adapter-factory注册适配器 ✓
5. 配置参数和验证规则 ✓
6. 设置API Key（环境变量或管理后台） ✓

### 修改现有模型参数
1. 在model-parameters.ts更新参数定义
2. 在parameter-schemas.ts更新验证规则
3. 在pricing-info.ts更新定价信息
4. 更新数据库中的inputCapabilities/outputCapabilities

### 实现新的功能
1. 图像编辑：实现inputImages处理
2. 视频生成：支持VIDEO输出类型
3. 音频生成：支持AUDIO输出类型
4. 批量生成：支持numberOfOutputs > 1

