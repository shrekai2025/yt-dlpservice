# AI生成系统实现细节指南

## 快速导航

这份文档提供AI生成系统的核心实现细节，帮助开发者快速理解和扩展系统。

---

## 1. 项目文件映射

### 核心业务文件

| 文件路径 | 功能描述 | 关键代码 |
|---------|---------|---------|
| `/src/lib/ai-generation/adapters/base-adapter.ts` | 适配器基类 | `dispatch()`, `checkTaskStatus()` |
| `/src/lib/ai-generation/adapters/adapter-factory.ts` | 适配器工厂与注册表 | `createAdapter()`, `ADAPTER_REGISTRY` |
| `/src/lib/ai-generation/services/model-service.ts` | 模型与供应商管理 | 数据库查询服务 |
| `/src/lib/ai-generation/services/task-manager.ts` | 任务生命周期管理 | 创建、更新、成本计算 |
| `/src/lib/ai-generation/services/task-poller.ts` | 异步任务轮询 | 后台长轮询处理 |
| `/src/lib/ai-generation/services/result-storage-service.ts` | 结果存储（S3） | 上传和URL管理 |
| `/src/server/api/routers/ai-generation.ts` | tRPC API路由 | 公开接口定义 |
| `/src/app/api/external/ai-generation/route.ts` | REST API（外部）| API密钥验证 |

### 配置文件

| 文件路径 | 功能描述 |
|---------|---------|
| `/src/lib/ai-generation/config/model-parameters.ts` | 每个模型的UI参数配置 |
| `/src/lib/ai-generation/config/pricing-info.ts` | 模型定价信息 |
| `/src/lib/ai-generation/validation/parameter-schemas.ts` | 参数验证Schema |

### 前端页面

| 文件路径 | 功能描述 |
|---------|---------|
| `/src/app/admin/ai-generation/page.tsx` | 主生成页面 |
| `/src/app/admin/ai-generation/providers/page.tsx` | 供应商管理 |
| `/src/app/admin/ai-generation/tasks/page.tsx` | 任务历史列表 |
| `/src/app/admin/ai-generation/tasks/[id]/page.tsx` | 任务详情页 |
| `/src/components/studio/ShotAIGenerationPanel.tsx` | Studio中的生成面板 |

---

## 2. 核心概念

### 2.1 适配器模式（Adapter Pattern）

每个AI供应商（Provider）都对应一个适配器实现，实现统一接口：

```typescript
// 统一接口
interface AdapterResponse {
  status: 'SUCCESS' | 'PROCESSING' | 'ERROR'
  results?: GenerationResult[]
  providerTaskId?: string  // 异步任务ID
  progress?: number
  error?: ErrorInfo
}

// 适配器实现
export class CustomAdapter extends BaseAdapter {
  // 必须实现
  async dispatch(request: GenerationRequest): Promise<AdapterResponse>
  
  // 可选实现（异步任务需要）
  async checkTaskStatus(taskId: string): Promise<AdapterResponse>
}
```

优势：
- 统一的接口，便于维护
- 支持同步和异步任务
- 易于添加新的供应商

### 2.2 任务生命周期

```
PENDING → PROCESSING → SUCCESS/FAILED

PENDING:
  - 任务刚创建
  - 等待发送到供应商

PROCESSING:
  - 任务已发送到供应商
  - 正在进行轮询
  - 可能需要等待很长时间

SUCCESS:
  - 生成完成
  - 结果已保存

FAILED:
  - 生成失败
  - 包含错误信息
```

### 2.3 成本计算

每个模型可定义成本计算函数：

```typescript
// 固定成本
'kie-nano-banana': '4 Credits/张 ≈ $0.020'

// 动态成本
'kie-4o-image': (params) => {
  const outputs = params.numberOfOutputs || 1
  let credits = outputs === 1 ? 6 : outputs === 2 ? 7 : 8
  return `${credits} Credits ≈ $${(credits * 0.005).toFixed(3)}`
}
```

成本在任务创建时计算并保存到数据库。

---

## 3. 实现新适配器的完整示例

### 3.1 创建适配器类

```typescript
// src/lib/ai-generation/adapters/mystudio/mystudio-adapter.ts

import { BaseAdapter } from '../base-adapter'
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types'

// 供应商API响应类型
interface MyStudioTaskResponse {
  code: number
  msg: string
  data?: {
    taskId: string
    imageUrl?: string
  }
}

interface MyStudioStatusResponse {
  code: number
  msg: string
  data?: {
    taskId: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    imageUrl?: string
    progress?: number
    errorMessage?: string
  }
}

export class MyStudioAdapter extends BaseAdapter {
  /**
   * 自定义认证头（如果需要）
   */
  protected getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      'X-API-Key': apiKey,
      'X-API-Version': '1.0',
    }
  }

  /**
   * 调度生成请求
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
      const payload: Record<string, unknown> = {
        prompt: request.prompt,
      }

      // 参数映射
      if (request.parameters) {
        if (request.parameters.size) {
          payload.size = request.parameters.size
        }
        if (request.parameters.style) {
          payload.style = request.parameters.style
        }
      }

      // 输入图片
      if (request.inputImages && request.inputImages.length > 0) {
        payload.inputImage = request.inputImages[0]
      }

      this.log('info', 'Creating MyStudio task', { prompt: request.prompt })

      // 调用API
      const response = await this.httpClient.post<MyStudioTaskResponse>(
        '/v1/image/generate',
        payload,
        {
          baseURL: this.getApiEndpoint(),
        }
      )

      const { code, msg, data } = response.data

      // 错误处理
      if (code !== 200 || !data?.taskId) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to create task',
          error: {
            code: 'TASK_CREATION_FAILED',
            message: msg,
            isRetryable: code === 429 || code === 503, // 速率限制或服务不可用时重试
          },
        }
      }

      // 同步返回（如果立即生成完成）
      if (data.imageUrl) {
        return {
          status: 'SUCCESS',
          results: [
            {
              type: 'image',
              url: data.imageUrl,
            },
          ],
        }
      }

      // 异步处理（需要轮询）
      this.log('info', `Task created: ${data.taskId}`)
      return {
        status: 'PROCESSING',
        providerTaskId: data.taskId,
        message: 'Task submitted, polling required',
      }
    } catch (error: unknown) {
      this.log('error', 'MyStudio dispatch failed', error)

      const isNetworkError = error instanceof Error && error.message.includes('timeout')

      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: {
          code: 'DISPATCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          isRetryable: isNetworkError, // 网络错误可重试
        },
      }
    }
  }

  /**
   * 检查异步任务状态
   */
  async checkTaskStatus(taskId: string): Promise<AdapterResponse> {
    try {
      const response = await this.httpClient.get<MyStudioStatusResponse>(
        `/v1/image/status/${taskId}`,
        {
          baseURL: this.getApiEndpoint(),
        }
      )

      const { code, msg, data } = response.data

      if (code !== 200 || !data) {
        return {
          status: 'ERROR',
          message: msg || 'Failed to check status',
          error: {
            code: 'STATUS_CHECK_FAILED',
            message: msg,
            isRetryable: true,
          },
        }
      }

      // 生成完成
      if (data.status === 'completed') {
        return {
          status: 'SUCCESS',
          results: data.imageUrl
            ? [
                {
                  type: 'image',
                  url: data.imageUrl,
                },
              ]
            : [],
          progress: 1,
        }
      }

      // 生成失败
      if (data.status === 'failed') {
        return {
          status: 'ERROR',
          message: data.errorMessage || 'Generation failed',
          error: {
            code: 'GENERATION_FAILED',
            message: data.errorMessage || 'Generation failed',
            isRetryable: false,
          },
        }
      }

      // 仍在处理中
      return {
        status: 'PROCESSING',
        progress: data.progress || 0.5,
        message: 'Still processing',
      }
    } catch (error: unknown) {
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

### 3.2 注册适配器

```typescript
// src/lib/ai-generation/adapters/adapter-factory.ts

// 在导入部分添加
import { MyStudioAdapter } from './mystudio/mystudio-adapter'

// 在ADAPTER_REGISTRY中添加
const ADAPTER_REGISTRY: Record<string, new (config: ModelConfig) => BaseAdapter> = {
  // ... 其他适配器
  MyStudioAdapter,
}
```

### 3.3 配置参数

```typescript
// src/lib/ai-generation/config/model-parameters.ts

export const MODEL_PARAMETERS: Record<string, ParameterField[]> = {
  // ... 其他模型
  'mystudio-image': [
    {
      key: 'size',
      label: '输出尺寸',
      type: 'select',
      defaultValue: '1024x1024',
      options: [
        { label: '512x512', value: '512x512' },
        { label: '1024x1024', value: '1024x1024' },
        { label: '1536x1536', value: '1536x1536' },
      ],
      helperText: 'MyStudio支持的输出尺寸',
    },
    {
      key: 'style',
      label: '艺术风格',
      type: 'select',
      defaultValue: 'realistic',
      options: [
        { label: '写实', value: 'realistic' },
        { label: '油画', value: 'painting' },
        { label: '卡通', value: 'cartoon' },
      ],
    },
  ],
}
```

### 3.4 配置验证规则

```typescript
// src/lib/ai-generation/validation/parameter-schemas.ts

import { z } from 'zod'

export const MyStudioImageParametersSchema = z.object({
  size: z
    .enum(['512x512', '1024x1024', '1536x1536'])
    .default('1024x1024'),
  style: z
    .enum(['realistic', 'painting', 'cartoon'])
    .default('realistic'),
})
```

### 3.5 配置定价

```typescript
// src/lib/ai-generation/config/pricing-info.ts

export const MODEL_PRICING_INFO: Record<string, string | ((params: Record<string, unknown>) => string)> = {
  // ... 其他模型
  'mystudio-image': (params) => {
    const size = params.size as string || '1024x1024'
    
    const pricingMap: Record<string, number> = {
      '512x512': 0.01,
      '1024x1024': 0.02,
      '1536x1536': 0.05,
    }

    const cost = pricingMap[size] || 0.02
    return `约 $${cost.toFixed(2)}`
  },
}
```

### 3.6 数据库配置

```sql
-- 1. 添加供应商
INSERT INTO ai_providers (
  id, name, slug, description, platformId,
  apiEndpoint, apiKey, uploadToS3, isActive, sortOrder,
  createdAt, updatedAt
)
VALUES (
  'clxxxxxxxxxxxxxx',
  'MyStudio',
  'mystudio',
  'MyStudio AI Image Generation',
  NULL,
  'https://api.mystudio.com',
  NULL,
  0,
  1,
  50,
  datetime('now'),
  datetime('now')
);

-- 2. 添加模型
INSERT INTO ai_models (
  id, name, slug, description, providerId, outputType,
  adapterName, inputCapabilities, outputCapabilities,
  featureTags, functionTags, isActive, sortOrder,
  createdAt, updatedAt
)
VALUES (
  'clxxxxxxxxxxxxxx',
  'MyStudio Image Generation',
  'mystudio-image',
  'High-quality text-to-image generation',
  'clxxxxxxxxxxxxxx',
  'IMAGE',
  'MyStudioAdapter',
  '["text-input"]',
  '["image-output"]',
  '["high-quality", "fast"]',
  '["text-to-image"]',
  1,
  1,
  datetime('now'),
  datetime('now')
);
```

---

## 4. 错误处理最佳实践

### 4.1 错误分类

```typescript
// 可重试的错误（网络相关）
const RETRYABLE_ERRORS = [
  'TIMEOUT',
  'NETWORK_ERROR',
  'RATE_LIMIT',
  'SERVICE_UNAVAILABLE',
]

// 不可重试的错误（配置或逻辑错误）
const NON_RETRYABLE_ERRORS = [
  'INVALID_PROMPT',
  'MISSING_API_KEY',
  'INVALID_MODEL',
  'UNSUPPORTED_FORMAT',
]
```

### 4.2 重试策略

```typescript
// 在adapter中指定isRetryable标志
return {
  status: 'ERROR',
  message: 'Request timeout',
  error: {
    code: 'TIMEOUT',
    message: 'Request timeout',
    isRetryable: true,  // 可重试
  },
}
```

### 4.3 日志记录

```typescript
// 自动上报到错误日志服务
this.log('error', 'Generation failed', {
  taskId: taskId,
  promptLength: request.prompt.length,
  parameters: request.parameters,
})
```

---

## 5. 异步任务轮询详解

### 5.1 轮询配置

```typescript
export interface PollingOptions {
  pollIntervalMs?: number    // 轮询间隔（毫秒）
  maxAttempts?: number       // 最大尝试次数
  maxDurationMs?: number     // 最大轮询时长（毫秒）
}

// 默认配置
const DEFAULT_POLLING_OPTIONS: Required<PollingOptions> = {
  pollIntervalMs: 5000,      // 每5秒轮询一次
  maxAttempts: 180,          // 最多180次 = 15分钟
  maxDurationMs: 1800000,    // 最多30分钟
}
```

### 5.2 轮询流程

```
启动轮询
  ↓
[循环] 最多180次
  ↓
检查是否超时（30分钟）
  ↓
检查任务是否被删除
  ↓
检查任务状态是否改变
  ↓
调用adapter.checkTaskStatus()
  ↓
根据状态处理：
  - SUCCESS: 保存结果，终止轮询
  - ERROR: 记录错误，终止轮询
  - PROCESSING: 更新进度，继续轮询
  ↓
等待5秒后重试
```

### 5.3 超时处理

```typescript
// 检查是否超过最大轮询时长
const elapsed = Date.now() - startedAt
if (elapsed > maxDurationMs) {
  await taskManager.updateTask(taskId, {
    status: 'FAILED',
    errorMessage: `Task timeout after ${Math.round(elapsed / 1000)}s`,
  })
  
  // 发送告警
  await systemAlertService.alertTaskTimeout(
    taskId,
    elapsed,
    { modelConfig: modelConfig.name }
  )
  return
}
```

---

## 6. 结果存储和S3上传

### 6.1 自动上传到S3

```typescript
// 在provider中配置uploadToS3
{
  id: 'provider-id',
  uploadToS3: true,
  s3PathPrefix: 'ai-generation/mystudio/',
}

// 处理结果时自动上传
const processedResults = await resultStorageService.processResults(
  results,
  {
    uploadToS3: provider.uploadToS3,
    s3PathPrefix: provider.s3PathPrefix,
  }
)
```

### 6.2 上传流程

```
原始结果URL（来自供应商）
  ↓
下载文件（如果配置了uploadToS3）
  ↓
上传到S3（使用唯一的s3Key）
  ↓
返回S3 URL
  ↓
保存到数据库

如果上传失败：
  ↓
回退到原始URL
  ↓
记录错误日志
  ↓
继续执行（不中断任务）
```

---

## 7. 参数验证和映射

### 7.1 验证流程

```typescript
// safeValidateModelParameters 会：
// 1. 根据model slug查找对应的Schema
// 2. 验证参数（Zod验证）
// 3. 应用默认值
// 4. 返回验证后的参数或错误

const validatedParams = safeValidateModelParameters(
  'kie-4o-image',
  {
    size: '1024x1024',
    style: 'vivid',
    unknownParam: 'will-be-ignored',
  }
)
```

### 7.2 参数映射

有些适配器可能需要将用户参数映射到供应商API所需的格式：

```typescript
// 例如：用户输入 "1024x1024"，但API需要 "1:1"
private mapSizeToKieFormat(userInput?: string): string {
  const sizeMap: Record<string, string> = {
    '512x512': '1:1',
    '1024x1024': '1:1',
    '1024x768': '4:3',
    '768x1024': '3:4',
  }
  return sizeMap[userInput || '1024x1024'] || '1:1'
}
```

---

## 8. 前端集成示例

### 8.1 使用AI生成API

```typescript
// React组件中使用tRPC

import { api } from '~/components/providers/trpc-provider'

export function MyComponent() {
  // 获取模型列表
  const { data: models } = api.aiGeneration.listModels.useQuery({
    outputType: 'IMAGE',
    isActive: true,
  })

  // 创建生成任务
  const generateMutation = api.aiGeneration.generate.useMutation({
    onSuccess: (data) => {
      console.log('Task created:', data.id)
    },
    onError: (error) => {
      console.error('Generation failed:', error.message)
    },
  })

  const handleGenerate = () => {
    generateMutation.mutate({
      modelId: 'model-id',
      prompt: 'A beautiful sunset',
      numberOfOutputs: 1,
      parameters: {
        size: '1024x1024',
        style: 'vivid',
      },
    })
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generateMutation.isPending}
    >
      {generateMutation.isPending ? '生成中...' : '生成'}
    </button>
  )
}
```

### 8.2 轮询任务状态

```typescript
// 获取任务详情（自动轮询）
const { data: task, isLoading } = api.aiGeneration.getTask.useQuery(
  { taskId: 'task-id' },
  {
    // 每5秒检查一次
    refetchInterval: 5000,
    // 任务完成或失败后停止轮询
    refetchIntervalInBackground: false,
  }
)

// 显示进度
<div>
  {task?.status === 'PROCESSING' && (
    <div>
      进度: {Math.round((task.progress || 0) * 100)}%
    </div>
  )}
  {task?.status === 'SUCCESS' && (
    <img src={JSON.parse(task.results)[0].url} />
  )}
  {task?.status === 'FAILED' && (
    <div className="error">{task.errorMessage}</div>
  )}
</div>
```

---

## 9. 调试技巧

### 9.1 查看适配器日志

```bash
# 查看服务器日志（如果使用PM2）
pm2 logs yt-dlpservice

# 查看特定任务的日志
grep "taskId" /path/to/logs/app.log
```

### 9.2 检查数据库中的任务

```sql
-- 查看最近的任务
SELECT id, modelId, status, progress, errorMessage
FROM ai_generation_tasks
ORDER BY createdAt DESC
LIMIT 10;

-- 查看失败的任务
SELECT * FROM ai_generation_tasks
WHERE status = 'FAILED'
ORDER BY createdAt DESC;
```

### 9.3 测试适配器

```typescript
// src/lib/ai-generation/adapters/test-adapter.ts
import { createAdapter } from './adapter-factory'
import type { ModelConfig } from './types'

async function testAdapter() {
  const config: ModelConfig = {
    id: 'test-model',
    slug: 'test-slug',
    name: 'Test Model',
    provider: {
      id: 'test-provider',
      slug: 'test-provider',
      name: 'Test Provider',
      apiKey: process.env.TEST_API_KEY,
      apiEndpoint: 'https://api.example.com',
    },
    outputType: 'IMAGE',
    adapterName: 'MyStudioAdapter',
  }

  const adapter = createAdapter(config)

  const response = await adapter.dispatch({
    prompt: 'A test image',
    parameters: { size: '1024x1024' },
  })

  console.log(response)
}
```

---

## 10. 常见问题解决

### Q1: 新适配器不显示在下拉列表中

**原因**: 
1. 适配器未注册到ADAPTER_REGISTRY
2. 数据库中的adapterName与实际类名不匹配
3. 模型的isActive为false

**解决方案**:
```typescript
// 确保在adapter-factory.ts中注册
const ADAPTER_REGISTRY: Record<string, ...> = {
  MyStudioAdapter,  // 必须包含
}

// 检查数据库
SELECT adapterName FROM ai_models WHERE id = 'model-id';
// 应该返回 'MyStudioAdapter'

// 检查模型状态
SELECT isActive FROM ai_models WHERE id = 'model-id';
// 应该返回 1
```

### Q2: 任务一直处于PROCESSING状态

**原因**:
1. checkTaskStatus方法未实现
2. 轮询超时
3. 适配器返回的taskId格式不正确

**解决方案**:
```typescript
// 检查是否实现了checkTaskStatus
if (typeof adapter.checkTaskStatus !== 'function') {
  // 适配器不支持异步轮询
}

// 检查任务日志
SELECT * FROM ai_generation_tasks WHERE id = 'task-id';
// 查看durationMs和progress字段
```

### Q3: API Key设置后不生效

**原因**:
1. 环境变量名格式错误
2. 数据库中的Key为空
3. 服务未重启

**解决方案**:
```bash
# 环境变量格式必须为：AI_PROVIDER_{SLUG}_API_KEY
# 例如：AI_PROVIDER_MYSTUDIO_API_KEY

# 重启服务
pm2 restart yt-dlpservice

# 验证环境变量是否生效
env | grep AI_PROVIDER
```

---

## 11. 性能优化

### 11.1 缓存策略

```typescript
// 供应商和模型列表很少变化，使用较长的缓存
const { data: models } = api.aiGeneration.listModels.useQuery(
  { outputType: 'IMAGE' },
  {
    staleTime: 60000,           // 1分钟内不重新获取
    refetchOnWindowFocus: false, // 切换窗口时不重新获取
  }
)
```

### 11.2 异步任务优化

```typescript
// 不要一直轮询，使用refetchInterval
const { data: task } = api.aiGeneration.getTask.useQuery(
  { taskId: 'task-id' },
  {
    refetchInterval: 5000,           // 每5秒轮询一次
    refetchIntervalInBackground: false, // 失去焦点时停止轮询
  }
)
```

### 11.3 结果处理优化

```typescript
// 批量处理多个结果
const results = await Promise.all(
  generationResults.map((result) =>
    resultStorageService.processResults([result], config)
  )
)
```

---

## 12. 安全考虑

### 12.1 API Key管理

```typescript
// API Key不应该在前端暴露
// 所有API Key操作都应该在服务器端

// 安全的方式：环境变量
export const getApiKey = () => process.env.AI_PROVIDER_KEY

// 或从加密的数据库字段读取
const provider = await db.aIProvider.findUnique({
  where: { id: providerId },
  select: { apiKey: true }, // 读取但不记录日志
})
```

### 12.2 参数验证

```typescript
// 总是验证用户输入
const validatedParams = safeValidateModelParameters(
  modelSlug,
  userInputParams
)

// 防止prompt注入
const prompt = request.prompt.trim().slice(0, 10000)
```

### 12.3 速率限制

```typescript
// 考虑添加速率限制
const RATE_LIMIT = {
  perUser: 100,    // 每个用户每天100个请求
  perMinute: 10,   // 每分钟最多10个请求
}
```

