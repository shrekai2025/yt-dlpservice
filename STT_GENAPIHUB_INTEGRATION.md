# STT 服务融入 GenAPIHub 模式方案

> **目标**: 将现有的 Google STT、豆包小模型 STT 等语音识别服务统一到 GenAPIHub 适配器架构中
>
> **日期**: 2025-10-06

---

## 一、为什么 STT 服务适合 GenAPIHub 模式?

### 当前 STT 服务的特点

1. **多供应商**: Google STT, 豆包小模型, 通义听悟
2. **不同接口**: 各自独立的 API 调用方式
3. **异步处理**: 都支持长时间任务轮询
4. **参数差异**: 语言代码、音频格式、配置选项各不相同

### GenAPIHub 模式的优势

✅ **统一接口**: 所有 STT 服务使用相同的调用方式
✅ **参数适配**: 自动转换不同供应商的参数格式
✅ **易于扩展**: 新增 STT 供应商只需添加适配器
✅ **集中管理**: 统一的配置、日志、监控
✅ **灵活切换**: 可以轻松切换或对比不同供应商

---

## 二、STT 适配器架构设计

### 2.1 核心类型定义 (`src/lib/adapters/stt/types.ts`)

```typescript
/**
 * 统一的 STT 请求参数
 */
export interface UnifiedSTTRequest {
  // 模型标识符
  modelIdentifier: string  // 例: "google-stt-v2", "doubao-small", "tingwu"

  // 音频文件路径或 URL
  audioSource: string | Buffer
  audioSourceType: 'file' | 'url' | 'buffer'

  // 语言设置
  languageCode?: string  // 例: "cmn-Hans-CN", "en-US"

  // 可选参数
  parameters?: {
    // 是否启用标点符号
    enablePunctuation?: boolean
    // 是否启用数字转换
    enableNumberConversion?: boolean
    // 说话人识别
    enableSpeakerDiarization?: boolean
    // 音频压缩预设
    compressionPreset?: 'none' | 'light' | 'standard' | 'heavy'
    // 其他供应商特定参数
    [key: string]: any
  }
}

/**
 * 统一的 STT 响应
 */
export interface STTAdapterResponse {
  status: 'SUCCESS' | 'PROCESSING' | 'FAILED'
  transcription?: string
  taskId?: string
  message?: string
  metadata?: {
    duration?: number      // 音频时长(秒)
    confidence?: number    // 识别置信度(0-1)
    languageDetected?: string  // 检测到的语言
    processingTime?: number    // 处理时长(毫秒)
    provider?: string      // 实际使用的供应商
  }
}

/**
 * STT 供应商配置
 */
export interface STTProviderConfig {
  id: string
  modelIdentifier: string
  adapterName: string

  // API 配置
  apiEndpoint?: string
  credentials?: Record<string, string>

  // 文件上传配置
  uploadToCloud?: boolean
  cloudStorageConfig?: {
    type: 'gcs' | 'tos' | 's3'
    bucket: string
    region: string
    credentials: Record<string, string>
  }

  // 其他配置
  [key: string]: any
}
```

---

### 2.2 基类实现 (`src/lib/adapters/stt/base-stt-adapter.ts`)

```typescript
import axios, { AxiosInstance } from 'axios'
import * as fs from 'fs/promises'
import { Logger } from '~/lib/utils/logger'

export abstract class BaseSTTAdapter {
  protected config: STTProviderConfig
  protected httpClient: AxiosInstance

  constructor(config: STTProviderConfig) {
    this.config = config
    this.httpClient = this.initHttpClient()
  }

  /**
   * 初始化 HTTP 客户端
   */
  protected abstract initHttpClient(): AxiosInstance

  /**
   * 主入口：语音转文字
   */
  abstract speechToText(
    request: UnifiedSTTRequest
  ): Promise<STTAdapterResponse>

  /**
   * 后台轮询方法（异步任务用）
   */
  async pollTaskStatus?(
    taskId: string,
    requestId: string
  ): Promise<string | { error: string }>

  /**
   * 验证音频文件
   */
  protected async validateAudioFile(audioPath: string): Promise<void> {
    try {
      const stats = await fs.stat(audioPath)
      const fileSizeMB = stats.size / 1024 / 1024

      Logger.debug(`📊 音频文件信息: ${fileSizeMB.toFixed(2)}MB`)

      // 检查文件是否存在
      if (stats.size === 0) {
        throw new Error('音频文件为空')
      }

      return
    } catch (error: any) {
      throw new Error(`音频文件验证失败: ${error.message}`)
    }
  }

  /**
   * 读取音频文件为 Buffer
   */
  protected async readAudioFile(audioPath: string): Promise<Buffer> {
    return await fs.readFile(audioPath)
  }

  /**
   * 检测是否使用同步识别（基于文件大小和时长）
   */
  protected async shouldUseSync(
    audioPath: string,
    syncThresholdMB: number = 10,
    syncThresholdSeconds: number = 60
  ): Promise<boolean> {
    try {
      const stats = await fs.stat(audioPath)
      const fileSizeMB = stats.size / 1024 / 1024

      // 如果文件大小超过阈值，使用异步
      if (fileSizeMB > syncThresholdMB) {
        Logger.info(`📏 文件大小${fileSizeMB.toFixed(2)}MB超过${syncThresholdMB}MB，使用异步识别`)
        return false
      }

      // TODO: 可以添加时长检测逻辑

      Logger.info(`🎯 文件大小${fileSizeMB.toFixed(2)}MB，使用同步识别`)
      return true
    } catch {
      return true // 默认使用同步
    }
  }
}
```

---

### 2.3 Google STT 适配器 (`src/lib/adapters/stt/providers/google-stt-adapter.ts`)

```typescript
import { BaseSTTAdapter } from '../base-stt-adapter'
import GoogleSpeechService from '~/lib/services/google-stt'
import { Logger } from '~/lib/utils/logger'

export class GoogleSTTAdapter extends BaseSTTAdapter {
  private googleService: typeof GoogleSpeechService

  constructor(config: STTProviderConfig) {
    super(config)
    this.googleService = GoogleSpeechService
  }

  protected initHttpClient() {
    return axios.create({
      timeout: 300000
    })
  }

  async speechToText(
    request: UnifiedSTTRequest
  ): Promise<STTAdapterResponse> {
    try {
      Logger.info(`🎤 开始 Google STT 识别`)

      // 处理音频源
      let audioPath: string
      if (request.audioSourceType === 'file') {
        audioPath = request.audioSource as string
      } else if (request.audioSourceType === 'buffer') {
        // 将 Buffer 写入临时文件
        const tempPath = `/tmp/audio-${Date.now()}.mp3`
        await fs.writeFile(tempPath, request.audioSource as Buffer)
        audioPath = tempPath
      } else {
        throw new Error('暂不支持 URL 音频源')
      }

      // 验证音频文件
      await this.validateAudioFile(audioPath)

      // 提取语言代码
      const languageCode = request.languageCode || 'cmn-Hans-CN'

      // 调用 Google STT 服务
      const startTime = Date.now()
      const transcription = await this.googleService.speechToText(
        audioPath,
        undefined,  // progressCallback
        languageCode
      )
      const processingTime = Date.now() - startTime

      return {
        status: 'SUCCESS',
        transcription,
        metadata: {
          processingTime,
          provider: 'Google Cloud Speech-to-Text V2',
          languageDetected: languageCode
        }
      }
    } catch (error: any) {
      Logger.error(`❌ Google STT 识别失败: ${error.message}`)
      return {
        status: 'FAILED',
        message: error.message
      }
    }
  }
}
```

---

### 2.4 豆包小模型适配器 (`src/lib/adapters/stt/providers/doubao-small-adapter.ts`)

```typescript
import { BaseSTTAdapter } from '../base-stt-adapter'
import DoubaoSmallSTTService from '~/lib/services/doubao-small-stt'
import { Logger } from '~/lib/utils/logger'

export class DoubaoSmallAdapter extends BaseSTTAdapter {
  private doubaoService: typeof DoubaoSmallSTTService

  constructor(config: STTProviderConfig) {
    super(config)
    this.doubaoService = DoubaoSmallSTTService
  }

  protected initHttpClient() {
    return axios.create({
      timeout: 300000
    })
  }

  async speechToText(
    request: UnifiedSTTRequest
  ): Promise<STTAdapterResponse> {
    try {
      Logger.info(`🎤 开始豆包小模型 STT 识别`)

      // 处理音频源
      let audioPath: string
      if (request.audioSourceType === 'file') {
        audioPath = request.audioSource as string
      } else if (request.audioSourceType === 'buffer') {
        const tempPath = `/tmp/audio-${Date.now()}.mp3`
        await fs.writeFile(tempPath, request.audioSource as Buffer)
        audioPath = tempPath
      } else {
        throw new Error('暂不支持 URL 音频源')
      }

      // 验证音频文件
      await this.validateAudioFile(audioPath)

      // 调用豆包小模型服务
      const startTime = Date.now()
      const transcription = await this.doubaoService.speechToText(audioPath)
      const processingTime = Date.now() - startTime

      return {
        status: 'SUCCESS',
        transcription,
        metadata: {
          processingTime,
          provider: '豆包录音文件识别（小模型）',
          languageDetected: 'zh-CN'
        }
      }
    } catch (error: any) {
      Logger.error(`❌ 豆包小模型 STT 识别失败: ${error.message}`)
      return {
        status: 'FAILED',
        message: error.message
      }
    }
  }
}
```

---

### 2.5 适配器工厂 (`src/lib/adapters/stt/stt-adapter-factory.ts`)

```typescript
import { BaseSTTAdapter } from './base-stt-adapter'
import { GoogleSTTAdapter } from './providers/google-stt-adapter'
import { DoubaoSmallAdapter } from './providers/doubao-small-adapter'
import { STTProviderConfig } from './types'

export class STTAdapterFactory {
  private static adapters = new Map<string, typeof BaseSTTAdapter>([
    ['GoogleSTTAdapter', GoogleSTTAdapter],
    ['DoubaoSmallAdapter', DoubaoSmallAdapter],
    // 可以继续添加更多适配器
  ])

  static create(
    adapterName: string,
    config: STTProviderConfig
  ): BaseSTTAdapter {
    const AdapterClass = this.adapters.get(adapterName)
    if (!AdapterClass) {
      throw new Error(`STT Adapter ${adapterName} not found`)
    }
    return new AdapterClass(config) as BaseSTTAdapter
  }

  static register(name: string, adapter: typeof BaseSTTAdapter) {
    this.adapters.set(name, adapter)
  }

  static listAvailable(): string[] {
    return Array.from(this.adapters.keys())
  }
}
```

---

## 三、数据库模型扩展

### 3.1 在 Prisma Schema 中添加 STT 相关模型

```prisma
// STT 供应商配置表（复用 ApiProvider）
model ApiProvider {
  id               String   @id @default(cuid())
  name             String
  modelIdentifier  String   @unique
  adapterName      String
  type             String   // "image", "video", "stt"  <- 新增 stt 类型
  provider         String?

  apiEndpoint      String
  apiFlavor        String
  encryptedAuthKey String?

  isActive         Boolean  @default(true)
  callCount        Int      @default(0)

  // STT 专用字段
  uploadToCloud    Boolean  @default(false)
  cloudStorageType String?  // "gcs", "tos", "s3"
  cloudStorageConfig String? // JSON 格式存储云存储配置

  requests         GenerationRequest[]
  sttRequests      SttRequest[]  // 新增关联

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@map("api_providers")
}

// STT 请求记录表（可选，或复用 GenerationRequest）
model SttRequest {
  id              String            @id @default(cuid())
  providerId      String
  provider        ApiProvider       @relation(fields: [providerId], references: [id])

  modelIdentifier String
  status          GenerationStatus  @default(PENDING)

  // 请求参数
  audioSource     String            // 音频文件路径或 URL
  languageCode    String?           // 语言代码
  parameters      String?           // JSON 对象

  // 响应数据
  transcription   String?           // 转录文本
  errorMessage    String?

  // 元数据
  duration        Float?            // 音频时长(秒)
  fileSize        Int?              // 文件大小(字节)
  confidence      Float?            // 识别置信度
  processingTime  Int?              // 处理耗时(毫秒)

  // 异步任务 ID
  taskId          String?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  completedAt     DateTime?

  @@index([status])
  @@index([createdAt])
  @@map("stt_requests")
}
```

---

## 四、tRPC API 路由

### 4.1 扩展 Generation Router (`src/server/api/routers/generation.ts`)

```typescript
import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { STTAdapterFactory } from '~/lib/adapters/stt/stt-adapter-factory'

// STT 请求验证
const sttRequestSchema = z.object({
  modelIdentifier: z.string(),
  audioPath: z.string(),
  languageCode: z.string().optional(),
  parameters: z.record(z.any()).optional()
})

export const generationRouter = createTRPCRouter({
  // ... 现有的图片/视频生成端点 ...

  // STT 语音识别端点
  transcribe: publicProcedure
    .input(sttRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. 查找 STT 供应商配置
      const provider = await ctx.db.apiProvider.findUnique({
        where: {
          modelIdentifier: input.modelIdentifier,
          type: 'stt'  // 确保是 STT 类型
        }
      })

      if (!provider || !provider.isActive) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'STT 模型未找到或未激活'
        })
      }

      // 2. 创建适配器实例
      const adapter = STTAdapterFactory.create(
        provider.adapterName,
        provider
      )

      // 3. 调用适配器
      const response = await adapter.speechToText({
        modelIdentifier: input.modelIdentifier,
        audioSource: input.audioPath,
        audioSourceType: 'file',
        languageCode: input.languageCode,
        parameters: input.parameters
      })

      // 4. 记录到数据库
      const request = await ctx.db.sttRequest.create({
        data: {
          providerId: provider.id,
          modelIdentifier: input.modelIdentifier,
          audioSource: input.audioPath,
          languageCode: input.languageCode,
          parameters: JSON.stringify(input.parameters || {}),
          status: response.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
          transcription: response.transcription,
          errorMessage: response.message,
          duration: response.metadata?.duration,
          processingTime: response.metadata?.processingTime,
          taskId: response.taskId
        }
      })

      // 5. 如果是异步任务，启动后台轮询
      if (response.status === 'PROCESSING' && response.taskId) {
        setImmediate(() => {
          // 启动后台轮询逻辑
        })
      }

      return {
        requestId: request.id,
        status: response.status,
        transcription: response.transcription,
        taskId: response.taskId,
        metadata: response.metadata
      }
    }),

  // 获取 STT 任务状态
  getSTTStatus: publicProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.db.sttRequest.findUnique({
        where: { id: input.requestId },
        include: { provider: true }
      })

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'STT 请求不存在'
        })
      }

      return {
        status: request.status,
        transcription: request.transcription,
        error: request.errorMessage,
        metadata: {
          duration: request.duration,
          processingTime: request.processingTime,
          provider: request.provider.name
        }
      }
    }),

  // 获取可用的 STT 模型列表
  listSTTModels: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.apiProvider.findMany({
        where: {
          isActive: true,
          type: 'stt'
        },
        orderBy: { name: 'asc' }
      })
    })
})
```

---

## 五、REST API 端点（外部调用）

### 5.1 创建 STT API 路由 (`src/app/api/external/stt/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '~/lib/middleware/api-key-auth'
import { db } from '~/server/db'
import { STTAdapterFactory } from '~/lib/adapters/stt/stt-adapter-factory'
import formidable from 'formidable'
import * as fs from 'fs/promises'

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
    // 解析 multipart/form-data（文件上传）
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const modelIdentifier = formData.get('model') as string
    const languageCode = formData.get('language') as string | undefined

    if (!audioFile || !modelIdentifier) {
      return NextResponse.json(
        { error: 'Missing audio file or model identifier' },
        { status: 400 }
      )
    }

    // 保存临时文件
    const tempPath = `/tmp/audio-${Date.now()}.mp3`
    const buffer = Buffer.from(await audioFile.arrayBuffer())
    await fs.writeFile(tempPath, buffer)

    // 查找供应商
    const provider = await db.apiProvider.findUnique({
      where: {
        modelIdentifier,
        type: 'stt'
      }
    })

    if (!provider || !provider.isActive) {
      return NextResponse.json(
        { error: 'STT model not found or inactive' },
        { status: 404 }
      )
    }

    // 创建适配器并调用
    const adapter = STTAdapterFactory.create(provider.adapterName, provider)
    const response = await adapter.speechToText({
      modelIdentifier,
      audioSource: tempPath,
      audioSourceType: 'file',
      languageCode
    })

    // 清理临时文件
    await fs.unlink(tempPath).catch(() => {})

    // 记录请求
    const request = await db.sttRequest.create({
      data: {
        providerId: provider.id,
        modelIdentifier,
        audioSource: audioFile.name,
        languageCode,
        status: response.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        transcription: response.transcription,
        errorMessage: response.message,
        processingTime: response.metadata?.processingTime
      }
    })

    // 返回响应
    return NextResponse.json({
      request_id: request.id,
      status: response.status,
      transcription: response.transcription,
      metadata: response.metadata
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
```

---

## 六、管理界面集成

### 6.1 在现有管理页面中添加 STT 标签

```typescript
// src/app/admin/ai-generation/page.tsx

export default function AIGenerationPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI 服务管理</h1>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">图片/视频生成</TabsTrigger>
          <TabsTrigger value="stt">语音识别(STT)</TabsTrigger>  {/* 新增 */}
          <TabsTrigger value="models">模型管理</TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
          <TabsTrigger value="keys">API密钥</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <GenerationForm />
        </TabsContent>

        <TabsContent value="stt">
          <STTForm />  {/* 新增 STT 表单 */}
        </TabsContent>

        {/* ... 其他 tabs ... */}
      </Tabs>
    </div>
  )
}
```

### 6.2 STT 表单组件 (`components/stt-form.tsx`)

```typescript
'use client'

import { useState } from 'react'
import { api } from '~/trpc/react'
import { Button } from '~/components/ui/button'

export function STTForm() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [modelIdentifier, setModelIdentifier] = useState('')
  const [languageCode, setLanguageCode] = useState('cmn-Hans-CN')

  const { data: sttModels } = api.generation.listSTTModels.useQuery()
  const transcribeMutation = api.generation.transcribe.useMutation()

  const handleSubmit = async () => {
    if (!audioFile) {
      alert('请选择音频文件')
      return
    }

    // 上传文件到临时目录
    const formData = new FormData()
    formData.append('audio', audioFile)

    // 这里简化处理，实际应该先上传文件
    const tempPath = `/tmp/${audioFile.name}`

    const result = await transcribeMutation.mutateAsync({
      modelIdentifier,
      audioPath: tempPath,
      languageCode
    })

    alert(`转录完成: ${result.transcription}`)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-2">选择 STT 模型</label>
        <select
          value={modelIdentifier}
          onChange={e => setModelIdentifier(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">请选择模型</option>
          {sttModels?.map(m => (
            <option key={m.modelIdentifier} value={m.modelIdentifier}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2">语言代码</label>
        <select
          value={languageCode}
          onChange={e => setLanguageCode(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="cmn-Hans-CN">简体中文</option>
          <option value="en-US">英语(美国)</option>
          <option value="ja-JP">日语</option>
        </select>
      </div>

      <div>
        <label className="block mb-2">音频文件</label>
        <input
          type="file"
          accept="audio/*"
          onChange={e => setAudioFile(e.target.files?.[0] || null)}
          className="w-full p-2 border rounded"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!modelIdentifier || !audioFile || transcribeMutation.isPending}
      >
        {transcribeMutation.isPending ? '识别中...' : '开始识别'}
      </Button>

      {transcribeMutation.data && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">识别结果:</h3>
          <p>{transcribeMutation.data.transcription}</p>
        </div>
      )}
    </div>
  )
}
```

---

## 七、与现有 SttJob 表的整合

### 7.1 复用还是新建?

**方案 A: 复用现有 SttJob 表**
- ✅ 保持向后兼容
- ✅ 不需要数据迁移
- ❌ 表结构可能不完全匹配 GenAPIHub 模式

**方案 B: 新建 SttRequest 表**
- ✅ 完全符合 GenAPIHub 架构
- ✅ 与 GenerationRequest 对称
- ❌ 需要数据迁移

**推荐方案**: 新建 `SttRequest` 表，但保留 `SttJob` 表用于现有的独立 API

### 7.2 适配器与现有服务的关系

```
现有服务 (保留):
  - Google STT Service (google-stt.ts)
  - 豆包小模型 Service (doubao-small-stt.ts)
  ↓ 被包装
适配器层 (新增):
  - GoogleSTTAdapter
  - DoubaoSmallAdapter
  ↓ 统一调用
GenAPIHub 路由:
  - /api/external/stt
  - tRPC generation.transcribe
```

---

## 八、实施步骤

### 阶段 1: 基础设施 (1天)
- [ ] 创建 STT 适配器目录结构
- [ ] 定义类型接口 `types.ts`
- [ ] 实现基类 `base-stt-adapter.ts`
- [ ] 扩展 Prisma Schema (添加 `SttRequest` 表或扩展 `ApiProvider`)

### 阶段 2: 适配器实现 (2-3天)
- [ ] 实现 `GoogleSTTAdapter`
- [ ] 实现 `DoubaoSmallAdapter`
- [ ] 实现适配器工厂 `STTAdapterFactory`
- [ ] 单元测试适配器

### 阶段 3: API 层 (1-2天)
- [ ] 扩展 tRPC `generationRouter`
- [ ] 创建 REST API `/api/external/stt`
- [ ] 测试 API 调用

### 阶段 4: 前端界面 (1天)
- [ ] 在管理页面添加 STT 标签
- [ ] 实现 STT 表单组件
- [ ] 实现历史记录查看

### 阶段 5: 测试与优化 (1天)
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 文档更新

---

## 九、优势总结

### 对比现有实现

| 特性 | 现有实现 | GenAPIHub 模式 |
|------|----------|----------------|
| **供应商切换** | 修改代码逻辑 | 配置模型标识符 |
| **新增供应商** | 复制粘贴代码 | 实现一个适配器 |
| **参数统一** | 各自定义 | 统一接口 |
| **日志监控** | 分散在各服务 | 集中管理 |
| **API 调用** | 不同端点 | 统一端点 |
| **前端集成** | 需要适配不同接口 | 统一表单 |

### 关键收益

1. **易于扩展**: 新增 AWS Transcribe、Azure Speech 等只需添加适配器
2. **统一体验**: 图片、视频、STT 使用相同的调用方式
3. **灵活配置**: 可以动态启用/禁用供应商
4. **成本优化**: 方便对比不同供应商的效果和价格
5. **代码复用**: 适配器模式减少重复代码

---

## 十、示例：添加新的 STT 供应商

假设要添加 **AWS Transcribe**:

```typescript
// src/lib/adapters/stt/providers/aws-transcribe-adapter.ts
export class AWSTranscribeAdapter extends BaseSTTAdapter {
  protected initHttpClient() {
    return axios.create({
      timeout: 300000
    })
  }

  async speechToText(request: UnifiedSTTRequest): Promise<STTAdapterResponse> {
    // 1. 上传音频到 S3
    // 2. 调用 AWS Transcribe API
    // 3. 轮询任务状态
    // 4. 返回转录结果
  }
}

// 注册到工厂
STTAdapterFactory.register('AWSTranscribeAdapter', AWSTranscribeAdapter)
```

就这么简单!

---

**最后更新**: 2025-10-06
