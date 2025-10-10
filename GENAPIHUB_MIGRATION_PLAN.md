# GenAPIHub 迁移到 yt-dlpservice 执行方案

> **项目**: 将 GenAPIHub (Python/FastAPI) 功能迁移到 yt-dlpservice (TypeScript/Next.js)
>
> **日期**: 2025-10-06
>
> **目标**: 使用 Next.js 技术栈重构 AI 内容生成 API 聚合网关

---

## 📊 技术栈映射分析

### GenAPIHub (Python) → yt-dlpservice (TypeScript)

| 原技术栈 (Python) | 目标技术栈 (TypeScript) |
|------------------|----------------------|
| FastAPI | Next.js 15 App Router + tRPC |
| SQLAlchemy ORM | Prisma ORM |
| SQLite | SQLite (保持一致) |
| Pydantic | Zod |
| requests/httpx | axios/fetch |
| boto3 (S3) | @aws-sdk/client-s3 或保留 @volcengine/tos-sdk |
| Celery + Redis | Node.js async/await + 内存队列 |
| Jinja2 模板 | React Server Components |
| passlib (密钥哈希) | crypto (Node.js 内置) |

---

## 🎯 六大迁移板块

### **板块 1: 数据库模型设计** (Database Schema)

**目标**: 将 GenAPIHub 的三张表迁移到 Prisma Schema

#### 1.1 新增 Prisma Models

在 `prisma/schema.prisma` 中新增:

```prisma
// AI 生成服务供应商配置表
model ApiProvider {
  id               String   @id @default(cuid())
  name             String   // 供应商名称 (如 "FLUX Pro", "Kling Video")
  modelIdentifier  String   @unique // 模型唯一标识符
  adapterName      String   // 适配器名称 (FluxAdapter, KlingAdapter)
  type             String   // 类型: image, video
  provider         String?  // 第三方平台 (Replicate, Pollo)

  apiEndpoint      String   // API 端点
  apiFlavor        String   // API 风格 (openai, custom)
  encryptedAuthKey String?  // 加密的认证密钥

  isActive         Boolean  @default(true)
  callCount        Int      @default(0)

  uploadToS3       Boolean  @default(false)
  s3PathPrefix     String?
  modelVersion     String?  // Replicate 模型版本

  requests         GenerationRequest[]

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@map("api_providers")
}

// API 密钥管理表
model ApiKey {
  id           String   @id @default(cuid())
  name         String   // 密钥描述
  keyPrefix    String   @unique // 密钥前6位
  hashedKey    String   // SHA256 哈希值
  isActive     Boolean  @default(true)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("api_keys")
}

// 生成请求状态枚举
enum GenerationStatus {
  PENDING
  PROCESSING
  SUCCESS
  FAILED
}

// 生成任务请求日志表
model GenerationRequest {
  id              String            @id @default(cuid())
  providerId      String
  provider        ApiProvider       @relation(fields: [providerId], references: [id])

  modelIdentifier String
  status          GenerationStatus  @default(PENDING)

  // 请求参数
  prompt          String
  inputImages     String?           // JSON 数组
  numberOfOutputs Int               @default(1)
  parameters      String?           // JSON 对象

  // 响应数据
  results         String?           // JSON 数组
  errorMessage    String?

  // 异步任务 ID
  taskId          String?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  completedAt     DateTime?

  @@index([status])
  @@index([createdAt])
  @@map("generation_requests")
}
```

#### 1.2 数据库迁移命令

```bash
npm run db:push
```

---

### **板块 2: 适配器系统重构** (Adapter Layer)

**目标**: 将 Python 适配器重写为 TypeScript 类

#### 2.1 目录结构

```
src/lib/adapters/
├── base-adapter.ts           # 抽象基类
├── types.ts                  # 类型定义
├── adapter-factory.ts        # 适配器工厂
├── utils/
│   ├── image-utils.ts        # 图片处理 (URL→Base64)
│   ├── parameter-mapper.ts   # 参数映射工具
│   └── retry-handler.ts      # 重试机制
└── providers/
    ├── flux-adapter.ts       # FLUX 图片生成
    ├── tuzi-adapter.ts       # Tuzi 服务
    ├── kling-adapter.ts      # Kling 视频生成
    ├── replicate-adapter.ts  # Replicate 平台
    └── pollo-adapter.ts      # Pollo 平台
```

#### 2.2 核心接口定义 (`types.ts`)

```typescript
export interface UnifiedGenerationRequest {
  modelIdentifier: string
  prompt: string
  inputImages?: string[]
  numberOfOutputs?: number
  parameters?: Record<string, any>
  taskType?: 'generate' | 'edit'
}

export interface GenerationResult {
  type: 'image' | 'video'
  url: string
  metadata?: Record<string, any>
}

export interface AdapterResponse {
  status: 'SUCCESS' | 'PROCESSING' | 'FAILED'
  results?: GenerationResult[]
  taskId?: string
  message?: string
}

export interface ProviderConfig {
  id: string
  apiEndpoint: string
  encryptedAuthKey: string
  uploadToS3: boolean
  s3PathPrefix?: string
  [key: string]: any
}
```

#### 2.3 基类实现 (`base-adapter.ts`)

```typescript
import axios, { AxiosInstance } from 'axios'

export abstract class BaseAdapter {
  protected httpClient: AxiosInstance
  protected config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
    this.httpClient = this.initHttpClient()
  }

  protected abstract initHttpClient(): AxiosInstance

  abstract dispatch(
    request: UnifiedGenerationRequest
  ): Promise<AdapterResponse>

  // 后台轮询方法 (视频生成用)
  async pollTaskStatus?(
    taskId: string,
    requestId: string
  ): Promise<string | { error: string }>
}
```

#### 2.4 示例适配器 (`flux-adapter.ts`)

```typescript
export class FluxAdapter extends BaseAdapter {
  protected initHttpClient(): AxiosInstance {
    return axios.create({
      headers: {
        Authorization: `Bearer ${this.config.encryptedAuthKey}`,
        'Content-Type': 'application/json'
      }
    })
  }

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    const aspectRatio = this.adaptSizeToRatio(
      request.parameters?.size_or_ratio || '1024x1024'
    )

    const payload = {
      model: this.config.modelIdentifier,
      prompt: request.prompt,
      aspect_ratio: aspectRatio,
      output_format: 'png'
    }

    const response = await this.httpClient.post(
      this.config.apiEndpoint,
      payload
    )

    const imageUrl = response.data.data[0].url

    // 如果需要上传到 S3
    if (this.config.uploadToS3) {
      const s3Url = await this.uploadToS3(imageUrl)
      return {
        status: 'SUCCESS',
        results: [{ type: 'image', url: s3Url }]
      }
    }

    return {
      status: 'SUCCESS',
      results: [{ type: 'image', url: imageUrl }]
    }
  }

  private adaptSizeToRatio(input: string): string {
    // 尺寸映射逻辑
    const sizeToRatioMap: Record<string, string> = {
      '1024x1024': '1:1',
      '1792x1024': '16:9',
      '1024x1792': '9:16',
      '16:9': '16:9',
      '9:16': '9:16',
      '1:1': '1:1'
    }

    return sizeToRatioMap[input] || '1:1'
  }

  private async uploadToS3(imageUrl: string): Promise<string> {
    // S3 上传逻辑
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data)

    const { s3Uploader } = await import('~/lib/services/s3-uploader')
    return await s3Uploader.uploadBuffer(
      buffer,
      this.config.s3PathPrefix || 'generated'
    )
  }
}
```

---

### **板块 3: tRPC API 路由** (API Routes)

**目标**: 使用 tRPC 替代 FastAPI 端点

#### 3.1 新建 Router (`src/server/api/routers/generation.ts`)

```typescript
import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { AdapterFactory } from '~/lib/adapters/adapter-factory'

// 输入验证
const generateSchema = z.object({
  modelIdentifier: z.string(),
  prompt: z.string(),
  inputImages: z.array(z.string()).optional(),
  numberOfOutputs: z.number().default(1),
  parameters: z.record(z.any()).optional()
})

export const generationRouter = createTRPCRouter({
  // 提交生成任务
  generate: publicProcedure
    .input(generateSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. 查找供应商配置
      const provider = await ctx.db.apiProvider.findUnique({
        where: { modelIdentifier: input.modelIdentifier }
      })

      if (!provider || !provider.isActive) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '模型未找到或未激活'
        })
      }

      // 2. 创建适配器实例
      const adapter = AdapterFactory.create(
        provider.adapterName,
        provider
      )

      // 3. 调用适配器
      const response = await adapter.dispatch(input)

      // 4. 记录到数据库
      const request = await ctx.db.generationRequest.create({
        data: {
          providerId: provider.id,
          modelIdentifier: input.modelIdentifier,
          prompt: input.prompt,
          inputImages: JSON.stringify(input.inputImages || []),
          parameters: JSON.stringify(input.parameters || {}),
          status: response.status === 'SUCCESS' ? 'SUCCESS' :
                  response.status === 'PROCESSING' ? 'PROCESSING' : 'FAILED',
          results: response.results ? JSON.stringify(response.results) : null,
          taskId: response.taskId
        }
      })

      // 5. 如果是异步任务,启动后台轮询
      if (response.status === 'PROCESSING' && response.taskId) {
        setImmediate(() => {
          this.pollAsyncTask(
            adapter,
            response.taskId!,
            request.id
          ).catch(console.error)
        })
      }

      return {
        requestId: request.id,
        status: response.status,
        results: response.results,
        taskId: response.taskId
      }
    }),

  // 查询任务状态
  getStatus: publicProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.db.generationRequest.findUnique({
        where: { id: input.requestId },
        include: { provider: true }
      })

      if (!request) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '请求不存在' })
      }

      return {
        requestId: request.id,
        status: request.status,
        sourceModel: request.modelIdentifier,
        prompt: request.prompt,
        results: request.results ? JSON.parse(request.results) : null,
        error: request.errorMessage,
        createdAt: request.createdAt
      }
    }),

  // 获取模型列表
  listModels: publicProcedure
    .query(async ({ ctx }) => {
      const providers = await ctx.db.apiProvider.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })

      return providers.map(p => ({
        modelIdentifier: p.modelIdentifier,
        name: p.name,
        type: p.type,
        provider: p.provider,
        // 附加模型能力信息
        capabilities: MODEL_CAPABILITIES[p.modelIdentifier] || {}
      }))
    }),

  // 获取请求历史
  listHistory: publicProcedure
    .input(z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
      status: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED']).optional()
    }))
    .query(async ({ ctx, input }) => {
      const where = input.status ? { status: input.status } : {}

      const [requests, total] = await Promise.all([
        ctx.db.generationRequest.findMany({
          where,
          include: { provider: true },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset
        }),
        ctx.db.generationRequest.count({ where })
      ])

      return { data: requests, total }
    }),

  // 删除历史记录
  deleteHistory: publicProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.generationRequest.delete({
        where: { id: input.requestId }
      })

      return { success: true }
    })
})

// 模型能力配置
const MODEL_CAPABILITIES: Record<string, any> = {
  'flux-kontext-pro': {
    type: 'ratio',
    options: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    label: 'Aspect Ratio'
  },
  'kling-video-v1': {
    type: 'ratio',
    options: ['1:1', '16:9', '9:16', '3:4', '4:3'],
    label: '纵横比',
    supports_image_to_video: true,
    supports_text_to_video: false,
    duration_options: [5, 10],
    default_duration: 5
  }
}
```

#### 3.2 注册到主 Router

```typescript
// src/server/api/root.ts
import { generationRouter } from './routers/generation'

export const appRouter = createTRPCRouter({
  task: taskRouter,
  stt: sttRouter,
  generation: generationRouter, // 新增
})
```

---

### **板块 4: API 密钥认证中间件** (Authentication)

**目标**: 实现与 GenAPIHub 相同的 API Key 验证

#### 4.1 中间件实现 (`src/lib/middleware/api-key-auth.ts`)

```typescript
import crypto from 'crypto'
import { db } from '~/server/db'

export async function verifyApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false

  // 生成 SHA256 哈希
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')

  const keyPrefix = apiKey.substring(0, 6)

  // 查找密钥记录
  const record = await db.apiKey.findUnique({
    where: { keyPrefix }
  })

  return (
    record !== null &&
    record.isActive &&
    record.hashedKey === hashedKey
  )
}

export async function createApiKey(name: string): Promise<string> {
  // 生成 32 字符随机密钥
  const apiKey = crypto.randomBytes(24).toString('base64url')
  const keyPrefix = apiKey.substring(0, 6)
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')

  await db.apiKey.create({
    data: {
      name,
      keyPrefix,
      hashedKey,
      isActive: true
    }
  })

  return apiKey
}
```

#### 4.2 REST API 端点 (`src/app/api/external/generate/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '~/lib/middleware/api-key-auth'
import { db } from '~/server/db'
import { AdapterFactory } from '~/lib/adapters/adapter-factory'

export async function POST(req: NextRequest) {
  // 验证 API Key
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || !(await verifyApiKey(apiKey))) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    )
  }

  try {
    // 解析请求体
    const body = await req.json()
    const { model, prompt, input_images, n = 1, parameters } = body

    // 查找供应商
    const provider = await db.apiProvider.findUnique({
      where: { modelIdentifier: model }
    })

    if (!provider || !provider.isActive) {
      return NextResponse.json(
        { error: 'Model not found or inactive' },
        { status: 404 }
      )
    }

    // 创建适配器并调用
    const adapter = AdapterFactory.create(provider.adapterName, provider)
    const response = await adapter.dispatch({
      modelIdentifier: model,
      prompt,
      inputImages: input_images,
      numberOfOutputs: n,
      parameters
    })

    // 记录请求
    const request = await db.generationRequest.create({
      data: {
        providerId: provider.id,
        modelIdentifier: model,
        prompt,
        inputImages: JSON.stringify(input_images || []),
        parameters: JSON.stringify(parameters || {}),
        status: response.status === 'SUCCESS' ? 'SUCCESS' :
                response.status === 'PROCESSING' ? 'PROCESSING' : 'FAILED',
        results: response.results ? JSON.stringify(response.results) : null,
        taskId: response.taskId
      }
    })

    // 返回响应
    return NextResponse.json({
      request_id: request.id,
      status: response.status,
      source_model: model,
      created_at: request.createdAt,
      results: response.results,
      task_id: response.taskId,
      message: response.message
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
```

#### 4.3 状态查询端点 (`src/app/api/external/status/[requestId]/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '~/lib/middleware/api-key-auth'
import { db } from '~/server/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  // 验证 API Key
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || !(await verifyApiKey(apiKey))) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    )
  }

  const request = await db.generationRequest.findUnique({
    where: { id: params.requestId },
    include: { provider: true }
  })

  if (!request) {
    return NextResponse.json(
      { error: 'Request not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    request_id: request.id,
    status: request.status,
    source_model: request.modelIdentifier,
    created_at: request.createdAt,
    results: request.results ? JSON.parse(request.results) : null,
    error: request.errorMessage,
    prompt: request.prompt
  })
}
```

---

### **板块 5: 管理后台界面** (Admin Dashboard)

**目标**: 使用 React 替代 Jinja2 模板

#### 5.1 页面结构

```
src/app/admin/ai-generation/
├── page.tsx                    # 主页面
├── layout.tsx                  # 布局
└── components/
    ├── model-list.tsx          # 模型列表
    ├── model-form.tsx          # 模型配置表单
    ├── request-history.tsx     # 请求历史
    ├── api-key-manager.tsx     # API 密钥管理
    └── generation-form.tsx     # 生成表单
```

#### 5.2 主页面 (`page.tsx`)

```typescript
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { ModelList } from './components/model-list'
import { RequestHistory } from './components/request-history'
import { ApiKeyManager } from './components/api-key-manager'
import { GenerationForm } from './components/generation-form'

export default function AIGenerationPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI 内容生成管理</h1>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList>
          <TabsTrigger value="generate">生成内容</TabsTrigger>
          <TabsTrigger value="models">模型管理</TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
          <TabsTrigger value="keys">API密钥</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <GenerationForm />
        </TabsContent>

        <TabsContent value="models">
          <ModelList />
        </TabsContent>

        <TabsContent value="history">
          <RequestHistory />
        </TabsContent>

        <TabsContent value="keys">
          <ApiKeyManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

#### 5.3 生成表单组件 (`components/generation-form.tsx`)

```typescript
'use client'

import { useState } from 'react'
import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Select } from '~/components/ui/select'

export function GenerationForm() {
  const [prompt, setPrompt] = useState('')
  const [modelIdentifier, setModelIdentifier] = useState('')
  const [inputImages, setInputImages] = useState<string[]>([])

  const { data: models } = api.generation.listModels.useQuery()
  const generateMutation = api.generation.generate.useMutation()

  const handleSubmit = async () => {
    const result = await generateMutation.mutateAsync({
      modelIdentifier,
      prompt,
      inputImages: inputImages.filter(img => img.trim()),
      parameters: {}
    })

    alert(`任务已提交: ${result.requestId}`)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-2">选择模型</label>
        <select
          value={modelIdentifier}
          onChange={e => setModelIdentifier(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">请选择模型</option>
          {models?.map(m => (
            <option key={m.modelIdentifier} value={m.modelIdentifier}>
              {m.name} ({m.type})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2">提示词</label>
        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="输入生成内容的描述..."
          rows={4}
        />
      </div>

      <div>
        <label className="block mb-2">输入图片URL (可选, 每行一个)</label>
        <Textarea
          value={inputImages.join('\n')}
          onChange={e => setInputImages(e.target.value.split('\n'))}
          placeholder="https://example.com/image.jpg"
          rows={3}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!modelIdentifier || !prompt || generateMutation.isPending}
      >
        {generateMutation.isPending ? '提交中...' : '开始生成'}
      </Button>
    </div>
  )
}
```

#### 5.4 请求历史组件 (`components/request-history.tsx`)

```typescript
'use client'

import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'

export function RequestHistory() {
  const { data, refetch } = api.generation.listHistory.useQuery({
    limit: 20,
    offset: 0
  })

  const deleteMutation = api.generation.deleteHistory.useMutation({
    onSuccess: () => refetch()
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">请求历史</h2>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">时间</th>
            <th className="p-2 border">模型</th>
            <th className="p-2 border">提示词</th>
            <th className="p-2 border">状态</th>
            <th className="p-2 border">操作</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map(req => (
            <tr key={req.id}>
              <td className="p-2 border">
                {new Date(req.createdAt).toLocaleString()}
              </td>
              <td className="p-2 border">{req.modelIdentifier}</td>
              <td className="p-2 border">{req.prompt.substring(0, 50)}...</td>
              <td className="p-2 border">
                <span className={`px-2 py-1 rounded ${
                  req.status === 'SUCCESS' ? 'bg-green-100' :
                  req.status === 'FAILED' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  {req.status}
                </span>
              </td>
              <td className="p-2 border">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate({ requestId: req.id })}
                >
                  删除
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

### **板块 6: 工具函数与服务** (Utilities & Services)

#### 6.1 适配器工厂 (`src/lib/adapters/adapter-factory.ts`)

```typescript
import { BaseAdapter } from './base-adapter'
import { FluxAdapter } from './providers/flux-adapter'
import { KlingAdapter } from './providers/kling-adapter'
import { ReplicateAdapter } from './providers/replicate-adapter'
import { ProviderConfig } from './types'

export class AdapterFactory {
  private static adapters = new Map<string, typeof BaseAdapter>([
    ['FluxAdapter', FluxAdapter],
    ['KlingAdapter', KlingAdapter],
    ['ReplicateAdapter', ReplicateAdapter],
    // 添加更多适配器...
  ])

  static create(
    adapterName: string,
    config: ProviderConfig
  ): BaseAdapter {
    const AdapterClass = this.adapters.get(adapterName)
    if (!AdapterClass) {
      throw new Error(`Adapter ${adapterName} not found`)
    }
    return new AdapterClass(config) as BaseAdapter
  }

  static register(name: string, adapter: typeof BaseAdapter) {
    this.adapters.set(name, adapter)
  }
}
```

#### 6.2 参数映射工具 (`src/lib/adapters/utils/parameter-mapper.ts`)

```typescript
export const MODEL_CAPABILITIES: Record<string, any> = {
  'flux-kontext-pro': {
    type: 'ratio',
    options: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
    label: 'Aspect Ratio'
  },
  'kling-video-v1': {
    type: 'ratio',
    options: ['1:1', '16:9', '9:16', '3:4', '4:3'],
    label: '纵横比',
    supportsImageToVideo: true,
    supportsTextToVideo: false,
    durationOptions: [5, 10],
    defaultDuration: 5,
    modelName: 'kling-v2-master',
    mode: 'pro'
  },
  'gpt-image-1-vip': {
    type: 'size',
    options: ['1024x1024', '1792x1024', '1024x1792'],
    label: 'Size'
  }
}

function parseToRatio(value: string): number | null {
  try {
    if (value.includes('x')) {
      const [w, h] = value.split('x').map(Number)
      return w / h
    } else if (value.includes(':')) {
      const [w, h] = value.split(':').map(Number)
      return w / h
    }
  } catch {
    return null
  }
  return null
}

export function findBestMatch(
  modelIdentifier: string,
  userInput: string
): string | null {
  if (!userInput || !MODEL_CAPABILITIES[modelIdentifier]) {
    return null
  }

  const modelConfig = MODEL_CAPABILITIES[modelIdentifier]
  const supportedOptions = modelConfig.options

  // 直接匹配
  if (supportedOptions.includes(userInput)) {
    return userInput
  }

  // 解析用户输入比例
  const userRatio = parseToRatio(userInput)
  if (!userRatio) return null

  // 寻找最接近的比例
  let bestMatch: string | null = null
  let minDiff = Infinity

  for (const option of supportedOptions) {
    const optionRatio = parseToRatio(option)
    if (optionRatio) {
      const diff = Math.abs(userRatio - optionRatio)
      if (diff < minDiff) {
        minDiff = diff
        bestMatch = option
      }
    }
  }

  return bestMatch
}
```

#### 6.3 图片处理工具 (`src/lib/adapters/utils/image-utils.ts`)

```typescript
import axios from 'axios'

export async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000
  })
  return Buffer.from(response.data)
}

export function imageToBase64(buffer: Buffer, mimeType = 'image/png'): string {
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

export async function urlToBase64(imageUrl: string): Promise<string> {
  try {
    const buffer = await downloadImage(imageUrl)

    // 检测 MIME 类型
    const mimeType = imageUrl.toLowerCase().endsWith('.jpg') ||
                     imageUrl.toLowerCase().endsWith('.jpeg')
      ? 'image/jpeg'
      : 'image/png'

    return imageToBase64(buffer, mimeType)
  } catch (error) {
    throw new Error(`Failed to convert image URL to Base64: ${error}`)
  }
}
```

#### 6.4 S3 上传服务 (`src/lib/services/s3-uploader.ts`)

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { env } from '~/env'

class S3Uploader {
  private client: S3Client

  constructor() {
    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
      }
    })
  }

  async uploadBuffer(
    buffer: Buffer,
    prefix: string,
    contentType = 'image/png'
  ): Promise<string> {
    const key = `${prefix}/${Date.now()}-${Math.random().toString(36).substring(7)}.png`

    await this.client.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
      })
    )

    return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`
  }

  async uploadFile(
    file: File,
    prefix: string
  ): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer())
    return this.uploadBuffer(buffer, prefix, file.type)
  }
}

export const s3Uploader = new S3Uploader()
```

#### 6.5 重试处理器 (`src/lib/adapters/utils/retry-handler.ts`)

```typescript
export interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  exponentialBackoff?: boolean
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        const delay = exponentialBackoff
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay

        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
```

---

## 🚀 实施步骤建议

### **阶段 1: 基础设施 (1-2天)**

- [ ] 设计并创建 Prisma Schema (3个新模型)
- [ ] 运行数据库迁移 `npm run db:push`
- [ ] 创建目录结构 `src/lib/adapters/`
- [ ] 设置类型定义文件 `types.ts`
- [ ] 配置环境变量 (S3, API Keys)

### **阶段 2: 适配器系统 (3-5天)**

- [ ] 实现基类 `BaseAdapter`
- [ ] 实现适配器工厂 `AdapterFactory`
- [ ] 移植工具函数:
  - [ ] 图片处理 `image-utils.ts`
  - [ ] 参数映射 `parameter-mapper.ts`
  - [ ] 重试机制 `retry-handler.ts`
- [ ] 实现核心适配器:
  - [ ] FluxAdapter (图片生成)
  - [ ] KlingAdapter (视频生成 + 异步轮询)
  - [ ] TuziAdapter (基础服务)
- [ ] 单元测试适配器功能

### **阶段 3: API 层 (2-3天)**

- [ ] 创建 tRPC Router `generation.ts`
- [ ] 实现所有端点:
  - [ ] `generate` - 生成任务
  - [ ] `getStatus` - 查询状态
  - [ ] `listModels` - 模型列表
  - [ ] `listHistory` - 历史记录
  - [ ] `deleteHistory` - 删除记录
- [ ] 实现 API 密钥认证中间件
- [ ] 创建 REST API 端点 (`/api/external/*`)
- [ ] 测试所有 API 功能

### **阶段 4: 前端界面 (2-3天)**

- [ ] 创建页面结构 `src/app/admin/ai-generation/`
- [ ] 实现核心组件:
  - [ ] 生成表单 `generation-form.tsx`
  - [ ] 模型列表 `model-list.tsx`
  - [ ] 请求历史 `request-history.tsx`
  - [ ] API密钥管理 `api-key-manager.tsx`
- [ ] 集成 tRPC 查询和 mutation
- [ ] 样式优化和响应式设计

### **阶段 5: 集成与测试 (1-2天)**

- [ ] 端到端测试流程
- [ ] 性能优化 (数据库查询, 并发处理)
- [ ] 错误处理完善
- [ ] 编写 API 文档
- [ ] 编写使用说明

---

## 📦 依赖包安装

需要安装的新依赖:

```bash
npm install @aws-sdk/client-s3
```

---

## 🔒 环境变量配置

在 `.env` 中添加:

```env
# AWS S3 配置 (如使用 S3 存储)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# 各供应商 API 密钥
FLUX_API_KEY=your_flux_key
KLING_API_KEY=your_kling_key
REPLICATE_API_TOKEN=your_replicate_token
```

---

## 📝 技术要点总结

### 优势
1. ✅ **类型安全**: TypeScript + Zod 全链路类型检查
2. ✅ **现代化**: 使用 Next.js 15 + tRPC + Prisma 最新技术栈
3. ✅ **可维护性**: 适配器模式便于扩展新供应商
4. ✅ **性能**: React Server Components + 异步处理
5. ✅ **开发体验**: tRPC 提供端到端类型推断

### 注意事项
1. ⚠️ **异步任务**: Node.js 没有 Celery,使用 `setImmediate` + 内存队列
2. ⚠️ **密钥安全**: 确保加密存储敏感信息
3. ⚠️ **错误处理**: 完善的重试机制和日志记录
4. ⚠️ **并发控制**: 视频生成等高并发场景需要队列管理

---

## 🎯 预期成果

完成后将实现:
- ✨ 统一的 AI 内容生成 API 网关
- ✨ 支持图片和视频生成
- ✨ 多供应商适配器系统
- ✨ 完整的管理后台界面
- ✨ API 密钥认证和权限管理
- ✨ 请求日志和历史查询
- ✨ 与现有 yt-dlpservice 无缝集成

---

**最后更新**: 2025-10-06
