# AI生成模块优化建议
## 全面分析与改进方案

**日期:** 2025-10-07
**范围:** AI生成adapter系统完整优化建议
**优先级分级:** P0(必须) > P1(高) > P2(中) > P3(低)

---

## 📊 当前状态评估

### 代码质量指标
- **Adapters数量:** 6个 (2图像 + 4视频)
- **总代码量:** ~2,600行 TypeScript
- **Console日志:** 159处 (过多)
- **重复代码:** ~200行 (S3上传、轮询等)
- **类型覆盖率:** 100% (strict mode)
- **构建状态:** ✅ 通过
- **测试覆盖率:** 0% (未实现)

### 架构优势
✅ 清晰的抽象层次 (BaseAdapter)
✅ 工厂模式便于扩展
✅ TypeScript类型安全
✅ 一致的接口设计
✅ S3集成灵活配置

### 主要问题
❌ 缺乏统一的错误处理
❌ 日志系统过于简单
❌ 重复代码多
❌ 缺乏监控和指标
❌ 轮询阻塞式等待
❌ 无重试机制
❌ 缺乏测试

---

## 🎯 优化建议总览

### 按优先级分类

| 优先级 | 类别 | 数量 | 实施成本 | 预期收益 |
|-------|------|------|---------|---------|
| P0 | 生产就绪 | 5项 | 高 | 高 |
| P1 | 架构优化 | 8项 | 中 | 高 |
| P2 | 代码质量 | 7项 | 中 | 中 |
| P3 | 增强功能 | 6项 | 低 | 中 |

**总计: 26项优化建议**

---

## 🔥 P0: 生产就绪 (必须实施)

### 1. 实施API密钥加密存储
**当前问题:** API密钥以明文或简单加密存储在数据库

**风险:**
- 数据库泄漏直接暴露所有API密钥
- 不符合安全最佳实践
- 可能违反合规要求

**解决方案:**
```typescript
// lib/security/encryption.ts
import crypto from 'crypto'

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly key: Buffer

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable must be set')
    }
    this.key = Buffer.from(encryptionKey, 'base64')
  }

  encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const tag = cipher.getAuthTag()

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    }
  }

  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    )

    decipher.setAuthTag(Buffer.from(tag, 'hex'))

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }
}

// 使用
const encryption = new EncryptionService()
const { encrypted, iv, tag } = encryption.encrypt(apiKey)
// 存储: encrypted, iv, tag 三个字段
```

**实施步骤:**
1. 生成并安全存储加密密钥
2. 迁移现有API密钥到加密格式
3. 更新adapter在运行时解密
4. 实施密钥轮换策略

**成本:** 2-3天
**收益:** 安全性大幅提升

---

### 2. 实现异步轮询服务
**当前问题:** 轮询直接在HTTP请求中阻塞等待，可能导致超时

**风险:**
- 视频生成通常需要5-20分钟
- Next.js API route有默认60s超时
- 客户端连接可能中断
- 服务器资源浪费

**解决方案:**
```typescript
// lib/services/polling-service.ts
import { db } from '@/server/db'

interface PollTask {
  taskId: string
  adapterName: string
  requestId: string
  startTime: Date
  maxPollingTime: number
  pollingInterval: number
}

export class PollingService {
  private tasks = new Map<string, PollTask>()
  private intervalId: NodeJS.Timeout | null = null

  start() {
    // 每30秒检查一次所有待轮询任务
    this.intervalId = setInterval(() => this.pollAllTasks(), 30000)
    console.log('[PollingService] Started')
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('[PollingService] Stopped')
  }

  addTask(task: PollTask) {
    this.tasks.set(task.taskId, task)
    console.log(`[PollingService] Added task ${task.taskId}`)
  }

  private async pollAllTasks() {
    const now = Date.now()

    for (const [taskId, task] of this.tasks.entries()) {
      const elapsed = now - task.startTime.getTime()

      if (elapsed > task.maxPollingTime * 1000) {
        // 超时
        await this.handleTimeout(taskId)
        this.tasks.delete(taskId)
        continue
      }

      // 检查状态
      await this.pollTask(taskId, task)
    }
  }

  private async pollTask(taskId: string, task: PollTask) {
    try {
      const adapter = createAdapter({
        adapterName: task.adapterName,
        // ... 从数据库加载配置
      })

      // 调用adapter的状态检查方法
      const status = await adapter.checkStatus(taskId)

      if (status.status === 'SUCCESS') {
        await this.handleSuccess(taskId, task, status.results)
        this.tasks.delete(taskId)
      } else if (status.status === 'FAILED') {
        await this.handleFailure(taskId, task, status.error)
        this.tasks.delete(taskId)
      }
      // PROCESSING - 继续轮询
    } catch (error) {
      console.error(`[PollingService] Error polling ${taskId}:`, error)
    }
  }

  private async handleSuccess(taskId: string, task: PollTask, results: any) {
    await db.generationRequest.update({
      where: { id: task.requestId },
      data: {
        status: 'SUCCESS',
        results: JSON.stringify(results),
        completedAt: new Date(),
      }
    })

    // 触发webhook通知
    await this.sendWebhook(task.requestId, 'SUCCESS', results)
  }

  private async handleFailure(taskId: string, task: PollTask, error: string) {
    await db.generationRequest.update({
      where: { id: task.requestId },
      data: {
        status: 'FAILED',
        error: error,
        completedAt: new Date(),
      }
    })

    await this.sendWebhook(task.requestId, 'FAILED', { error })
  }

  private async handleTimeout(taskId: string) {
    // 类似handleFailure
  }

  private async sendWebhook(requestId: string, status: string, data: any) {
    // 发送webhook通知到客户端
  }
}

// 全局单例
export const pollingService = new PollingService()
```

**API更改:**
```typescript
// 原来: 阻塞等待
const result = await adapter.dispatch(request) // 等待5-20分钟
return { status: result.status, results: result.results }

// 改为: 立即返回，后台轮询
const taskId = await adapter.submitTask(request) // 立即返回
pollingService.addTask({
  taskId,
  adapterName: 'KlingAdapter',
  requestId: generationRequest.id,
  startTime: new Date(),
  maxPollingTime: 1200,
  pollingInterval: 60,
})

return {
  status: 'PROCESSING',
  taskId,
  statusUrl: `/api/generation/${generationRequest.id}/status`
}
```

**成本:** 3-5天
**收益:**
- 解决超时问题
- 提升用户体验
- 支持长时间任务
- 减少服务器资源占用

---

### 3. 添加速率限制和配额管理
**当前问题:** 无速率限制，可能被滥用或超出供应商配额

**风险:**
- API成本失控
- 供应商账号被封禁
- 服务被恶意使用

**解决方案:**
```typescript
// lib/services/rate-limiter.ts
import { Redis } from 'ioredis'

export class RateLimiter {
  private redis: Redis

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL)
  }

  async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = Date.now()
    const windowStart = now - windowSeconds * 1000

    // 使用Redis sorted set记录请求时间
    await this.redis.zremrangebyscore(key, 0, windowStart)
    const count = await this.redis.zcard(key)

    if (count >= maxRequests) {
      const oldestRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES')
      const resetAt = new Date(parseInt(oldestRequest[1]) + windowSeconds * 1000)

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      }
    }

    await this.redis.zadd(key, now, `${now}`)
    await this.redis.expire(key, windowSeconds)

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetAt: new Date(now + windowSeconds * 1000),
    }
  }
}

// 使用
const rateLimiter = new RateLimiter()

// 按用户限制
const userLimit = await rateLimiter.checkLimit(
  `user:${userId}:generation`,
  10, // 每10分钟10次
  600
)

// 按API Key限制
const apiKeyLimit = await rateLimiter.checkLimit(
  `apikey:${apiKeyId}:generation`,
  100, // 每小时100次
  3600
)

// 按供应商限制（防止超配额）
const providerLimit = await rateLimiter.checkLimit(
  `provider:${providerId}:generation`,
  1000, // 每天1000次
  86400
)

if (!userLimit.allowed) {
  return {
    status: 'ERROR',
    message: `Rate limit exceeded. Reset at ${userLimit.resetAt.toISOString()}`,
    code: 'RATE_LIMIT_EXCEEDED',
  }
}
```

**成本:** 2-3天
**收益:**
- 控制成本
- 防止滥用
- 保护供应商账号

---

### 4. 实现错误监控和告警
**当前问题:** 错误仅记录到console，无主动告警

**风险:**
- 生产问题无法及时发现
- API故障影响用户
- 调试困难

**解决方案:**
```typescript
// lib/monitoring/error-tracker.ts
import * as Sentry from '@sentry/nextjs'

export class ErrorTracker {
  static captureAdapterError(
    adapterName: string,
    error: Error,
    context: Record<string, any>
  ) {
    Sentry.withScope((scope) => {
      scope.setTag('adapter', adapterName)
      scope.setContext('adapter_context', context)

      // 错误分级
      if (context.statusCode === 401 || context.statusCode === 403) {
        scope.setLevel('critical') // 认证错误 - 高优先级
      } else if (context.statusCode === 429) {
        scope.setLevel('warning') // 限流 - 中优先级
      } else if (context.statusCode >= 500) {
        scope.setLevel('error') // 服务器错误 - 高优先级
      }

      Sentry.captureException(error)
    })

    // 同时记录到应用日志
    console.error(`[${adapterName}] Error:`, {
      error: error.message,
      stack: error.stack,
      context,
    })
  }

  static captureMetric(name: string, value: number, tags?: Record<string, string>) {
    // 发送到时序数据库 (如Prometheus/CloudWatch)
    Sentry.metrics.gauge(name, value, { tags })
  }
}

// 在adapter中使用
try {
  const response = await this.httpClient.post(url, payload)
  return response.data
} catch (error) {
  ErrorTracker.captureAdapterError(
    this.sourceInfo.adapterName,
    error as Error,
    {
      url,
      payload,
      statusCode: (error as any).response?.status,
      providerId: this.sourceInfo.id,
    }
  )
  throw error
}
```

**集成Sentry/Datadog配置:**
```typescript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig({
  // Next.js config
}, {
  // Sentry配置
  silent: true,
  org: 'your-org',
  project: 'ai-generation',
})

// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Prisma({ client: db }),
  ],
})
```

**成本:** 1-2天
**收益:**
- 实时错误告警
- 问题快速定位
- 性能监控

---

### 5. 添加健康检查和监控端点
**当前问题:** 无法检查系统健康状态

**解决方案:**
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    s3: await checkS3(),
    adapters: await checkAdapters(),
  }

  const isHealthy = Object.values(checks).every(c => c.status === 'ok')

  return Response.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: isHealthy ? 200 : 503
  })
}

async function checkAdapters() {
  const providers = await db.apiProvider.findMany({
    where: { isActive: true }
  })

  const results = await Promise.allSettled(
    providers.map(async (provider) => {
      const adapter = createAdapter(provider as any)
      // 简单的健康检查调用
      return adapter.healthCheck()
    })
  )

  const healthy = results.filter(r => r.status === 'fulfilled').length

  return {
    status: healthy === providers.length ? 'ok' : 'degraded',
    total: providers.length,
    healthy,
  }
}
```

**成本:** 1天
**收益:**
- 监控集成
- 自动告警
- 负载均衡健康检查

---

## 🔵 P1: 架构优化 (强烈建议)

### 6. 统一日志系统
**当前问题:** 159处console.log，生产环境日志混乱

**解决方案:**
```typescript
// lib/utils/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  }),
})

// 创建子logger
export function createLogger(context: string) {
  return logger.child({ context })
}

// base-adapter.ts 中使用
export abstract class BaseAdapter {
  protected logger: ReturnType<typeof createLogger>

  constructor(sourceInfo: ProviderConfig) {
    this.sourceInfo = sourceInfo
    this.logger = createLogger(sourceInfo.adapterName)
    this.httpClient = this.getHttpClient()
  }

  protected getHttpClient(): AxiosInstance {
    client.interceptors.request.use((config) => {
      this.logger.debug({
        msg: 'HTTP Request',
        method: config.method,
        url: config.url,
      })
      return config
    })

    client.interceptors.response.use(
      (response) => {
        this.logger.info({
          msg: 'HTTP Response',
          status: response.status,
          duration: response.config.metadata?.duration,
        })
        return response
      },
      (error) => {
        this.logger.error({
          msg: 'HTTP Error',
          status: error.response?.status,
          error: error.message,
        })
        return Promise.reject(error)
      }
    )
  }
}
```

**收益:**
- 结构化日志
- 可配置日志级别
- 生产环境性能优化
- 便于日志聚合分析

**成本:** 1-2天

---

### 7. 抽取S3上传逻辑到BaseAdapter
**当前问题:** S3上传代码重复6次

**解决方案:**
```typescript
// base-adapter.ts
export abstract class BaseAdapter {
  protected async downloadAndUploadToS3(
    mediaUrl: string,
    mimeType: string = 'image/png',
    timeout: number = 60000
  ): Promise<string> {
    // 检查S3配置
    if (!this.sourceInfo.uploadToS3) {
      this.logger.debug('S3 upload disabled, returning direct URL')
      return mediaUrl
    }

    this.logger.info({ msg: 'Downloading media', url: mediaUrl })

    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      timeout,
    })

    const buffer = Buffer.from(response.data)
    const s3Prefix = this.sourceInfo.s3PathPrefix ||
                     this.sourceInfo.adapterName.toLowerCase().replace('adapter', '')

    this.logger.info({ msg: 'Uploading to S3', prefix: s3Prefix })

    const s3Url = await s3Uploader.uploadBuffer(buffer, s3Prefix, mimeType)

    if (!s3Url) {
      throw new Error('S3 upload failed: uploader returned null')
    }

    this.logger.info({ msg: 'S3 upload complete', url: s3Url })
    return s3Url
  }
}

// 子类直接使用
const finalUrl = await this.downloadAndUploadToS3(videoUrl, 'video/mp4')
```

**收益:**
- 减少~120行重复代码
- 统一行为
- 更容易维护

**成本:** 0.5天

---

### 8. 抽取轮询逻辑到BaseAdapter
**当前问题:** 3个视频adapter有相似的轮询代码

**解决方案:**
```typescript
// base-adapter.ts
interface PollConfig<T> {
  checkStatus: (taskId: string) => Promise<PollResult<T>>
  interval: number // milliseconds
  timeout: number // seconds
  taskName?: string
}

interface PollResult<T> {
  status: 'SUCCESS' | 'FAILED' | 'PROCESSING'
  data?: T
  error?: string
}

export abstract class BaseAdapter {
  protected async pollUntilComplete<T>(
    taskId: string,
    config: PollConfig<T>
  ): Promise<T> {
    const startTime = Date.now()
    const maxEndTime = startTime + config.timeout * 1000

    this.logger.info({
      msg: 'Starting polling',
      taskId,
      task: config.taskName,
      timeout: config.timeout,
    })

    while (Date.now() < maxEndTime) {
      try {
        const result = await config.checkStatus(taskId)

        if (result.status === 'SUCCESS') {
          this.logger.info({ msg: 'Task completed', taskId })
          if (!result.data) {
            throw new Error('Task completed but no data returned')
          }
          return result.data
        } else if (result.status === 'FAILED') {
          throw new Error(result.error || 'Task failed')
        }

        // Still processing
        await new Promise(resolve => setTimeout(resolve, config.interval))
      } catch (error) {
        this.logger.error({ msg: 'Polling error', taskId, error })
        // 可以实现重试逻辑
        await new Promise(resolve => setTimeout(resolve, config.interval))
      }
    }

    throw new Error(`Task polling timeout after ${config.timeout}s`)
  }
}

// 子类使用
const videoUrls = await this.pollUntilComplete(taskId, {
  checkStatus: (id) => this.checkKlingStatus(id),
  interval: 60000,
  timeout: 1200,
  taskName: 'video generation',
})
```

**收益:**
- 减少~150行重复代码
- 统一超时/重试逻辑
- 更容易添加重试策略

**成本:** 1天

---

### 9. 实现重试机制
**当前问题:** 网络临时故障直接导致失败

**解决方案:**
```typescript
// base-adapter.ts
protected async withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    delayMs?: number
    backoffMultiplier?: number
    shouldRetry?: (error: any) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = (error) => {
      // 默认只重试网络错误和5xx错误
      if (axios.isAxiosError(error)) {
        return !error.response || error.response.status >= 500
      }
      return false
    },
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt < maxRetries && shouldRetry(error)) {
        const delay = delayMs * Math.pow(backoffMultiplier, attempt)
        this.logger.warn({
          msg: 'Retrying after error',
          attempt: attempt + 1,
          maxRetries,
          delayMs: delay,
          error: (error as Error).message,
        })
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }

  throw lastError
}

// 使用
const response = await this.withRetry(
  () => this.httpClient.post(apiEndpoint, payload),
  { maxRetries: 3, delayMs: 2000 }
)
```

**收益:**
- 提高可靠性
- 处理临时故障
- 用户体验改善

**成本:** 0.5天

---

### 10. 标准化错误处理
**当前问题:** 每个adapter错误处理不一致

**解决方案:**
```typescript
// lib/errors/adapter-errors.ts
export class AdapterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AdapterError'
  }
}

export class AuthenticationError extends AdapterError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, false, context)
    this.name = 'AuthenticationError'
  }
}

export class RateLimitError extends AdapterError {
  constructor(message: string, retryAfter?: number, context?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, { ...context, retryAfter })
    this.name = 'RateLimitError'
  }
}

export class ProviderError extends AdapterError {
  constructor(message: string, statusCode: number, context?: Record<string, any>) {
    super(message, 'PROVIDER_ERROR', statusCode, statusCode >= 500, context)
    this.name = 'ProviderError'
  }
}

// base-adapter.ts
protected handleError(error: unknown): AdapterResponse {
  // 已知错误类型
  if (error instanceof AdapterError) {
    return {
      status: 'ERROR',
      message: error.message,
      code: error.code,
      retryable: error.retryable,
    }
  }

  // Axios错误
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const data = error.response?.data

    if (status === 401 || status === 403) {
      throw new AuthenticationError(
        'Invalid API key or insufficient permissions',
        { status, data }
      )
    }

    if (status === 429) {
      const retryAfter = error.response?.headers['retry-after']
      throw new RateLimitError(
        'Rate limit exceeded',
        retryAfter ? parseInt(retryAfter) : undefined,
        { status, data }
      )
    }

    if (status && status >= 500) {
      throw new ProviderError(
        'Provider API error',
        status,
        { data }
      )
    }
  }

  // 未知错误
  return {
    status: 'ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  }
}
```

**收益:**
- 一致的错误格式
- 更好的错误分类
- 支持重试决策

**成本:** 1天

---

### 11. 参数验证增强
**当前问题:** 缺乏运行时参数验证

**解决方案:**
```typescript
// types.ts 扩展
import { z } from 'zod'

export const FluxRequestSchema = UnifiedGenerationRequestSchema.extend({
  parameters: z.object({
    size_or_ratio: z.string().optional(),
    seed: z.number().optional(),
  }).optional(),
})

export const KlingRequestSchema = UnifiedGenerationRequestSchema.extend({
  parameters: z.object({
    size_or_ratio: z.string().optional(),
    duration: z.number().int().min(5).max(10).optional(),
    seed: z.number().optional(),
  }).optional(),
})

// flux-adapter.ts
async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
  // 验证请求
  const validation = FluxRequestSchema.safeParse(request)
  if (!validation.success) {
    return {
      status: 'ERROR',
      message: `Invalid request: ${validation.error.message}`,
      code: 'VALIDATION_ERROR',
    }
  }

  const validRequest = validation.data
  // 使用验证后的请求
}
```

**收益:**
- 类型安全
- 清晰的错误消息
- 防止无效请求

**成本:** 1天

---

### 12. 添加性能监控
**当前问题:** 无法监控adapter性能

**解决方案:**
```typescript
// base-adapter.ts
protected async measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  const startMemory = process.memoryUsage().heapUsed

  try {
    const result = await fn()
    const duration = Date.now() - startTime
    const memoryUsed = process.memoryUsage().heapUsed - startMemory

    this.logger.info({
      msg: 'Operation completed',
      operation,
      duration,
      memoryUsed: Math.round(memoryUsed / 1024 / 1024), // MB
    })

    // 发送指标到监控系统
    ErrorTracker.captureMetric(`adapter.${operation}.duration`, duration, {
      adapter: this.sourceInfo.adapterName,
      operation,
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    this.logger.error({
      msg: 'Operation failed',
      operation,
      duration,
      error: (error as Error).message,
    })

    throw error
  }
}

// 使用
const response = await this.measurePerformance(
  'api_call',
  () => this.httpClient.post(apiEndpoint, payload)
)

const finalUrl = await this.measurePerformance(
  's3_upload',
  () => this.downloadAndUploadToS3(imageUrl)
)
```

**收益:**
- 性能瓶颈识别
- 优化目标明确
- 成本分析

**成本:** 0.5天

---

### 13. 实现请求缓存
**当前问题:** 相同请求重复调用API

**解决方案:**
```typescript
// lib/cache/request-cache.ts
import { Redis } from 'ioredis'
import crypto from 'crypto'

export class RequestCache {
  private redis: Redis

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL)
  }

  private getCacheKey(request: UnifiedGenerationRequest, providerId: string): string {
    const canonical = JSON.stringify({
      provider: providerId,
      prompt: request.prompt,
      parameters: request.parameters,
      inputImages: request.input_images,
    })
    return `cache:generation:${crypto.createHash('sha256').update(canonical).digest('hex')}`
  }

  async get(request: UnifiedGenerationRequest, providerId: string): Promise<AdapterResponse | null> {
    const key = this.getCacheKey(request, providerId)
    const cached = await this.redis.get(key)

    if (cached) {
      return JSON.parse(cached)
    }

    return null
  }

  async set(
    request: UnifiedGenerationRequest,
    providerId: string,
    response: AdapterResponse,
    ttl: number = 3600 // 1小时
  ): Promise<void> {
    const key = this.getCacheKey(request, providerId)
    await this.redis.setex(key, ttl, JSON.stringify(response))
  }
}

// base-adapter.ts
async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
  // 检查缓存
  const cached = await requestCache.get(request, this.sourceInfo.id)
  if (cached) {
    this.logger.info('Cache hit')
    return cached
  }

  // 执行请求
  const response = await this.doDispatch(request)

  // 只缓存成功的结果
  if (response.status === 'SUCCESS') {
    await requestCache.set(request, this.sourceInfo.id, response)
  }

  return response
}
```

**收益:**
- 减少API调用
- 降低成本
- 提升响应速度

**成本:** 1-2天

---

## 🟡 P2: 代码质量 (建议实施)

### 14. 添加单元测试
**当前问题:** 测试覆盖率0%

**解决方案:**
```typescript
// __tests__/adapters/flux-adapter.test.ts
import { FluxAdapter } from '@/lib/adapters/flux-adapter'
import { mockProviderConfig, mockRequest } from './test-utils'

describe('FluxAdapter', () => {
  let adapter: FluxAdapter

  beforeEach(() => {
    adapter = new FluxAdapter(mockProviderConfig)
  })

  describe('adaptSizeToAspectRatio', () => {
    it('should convert 1024x1024 to 1:1', () => {
      const result = adapter['adaptSizeToAspectRatio']('1024x1024')
      expect(result).toBe('1:1')
    })

    it('should convert 1920x1080 to 16:9', () => {
      const result = adapter['adaptSizeToAspectRatio']('1920x1080')
      expect(result).toBe('16:9')
    })

    it('should handle unknown sizes with fallback', () => {
      const result = adapter['adaptSizeToAspectRatio']('999x999')
      expect(result).toBe('1:1')
    })
  })

  describe('dispatch', () => {
    it('should return error when no results', async () => {
      // Mock API返回空结果
      jest.spyOn(adapter['httpClient'], 'post').mockResolvedValue({
        data: { data: [] }
      })

      const result = await adapter.dispatch(mockRequest)

      expect(result.status).toBe('ERROR')
      expect(result.message).toContain('No image URL found')
    })
  })
})
```

**目标覆盖率:** 80%以上

**成本:** 5-7天
**收益:**
- 防止回归
- 重构信心
- 文档作用

---

### 15. 添加集成测试
**当前问题:** 无真实API测试

**解决方案:**
```typescript
// __tests__/integration/flux-adapter.integration.test.ts
describe('FluxAdapter Integration', () => {
  it('should generate image successfully', async () => {
    const adapter = new FluxAdapter({
      // 使用真实或测试环境配置
      apiEndpoint: process.env.FLUX_TEST_ENDPOINT!,
      encryptedAuthKey: process.env.FLUX_TEST_KEY!,
      // ...
    })

    const result = await adapter.dispatch({
      prompt: 'A test image',
      parameters: { size_or_ratio: '1024x1024' },
      input_images: [],
      number_of_outputs: 1,
    })

    expect(result.status).toBe('SUCCESS')
    expect(result.results).toHaveLength(1)
    expect(result.results![0].url).toMatch(/^https?:\/\//)
  }, 60000) // 60s timeout
})
```

**成本:** 2-3天

---

### 16. 代码规范增强
**当前问题:** ESLint警告较多

**解决方案:**
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error"
  }
}
```

**成本:** 1天

---

### 17. API文档自动生成
**当前问题:** API文档手动维护

**解决方案:**
```typescript
// 使用OpenAPI/Swagger
import { createSwaggerSpec } from 'next-swagger-doc'

export const getApiDocs = () => {
  return createSwaggerSpec({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'AI Generation API',
        version: '1.0.0',
      },
    },
    apis: ['./app/api/**/*.ts'],
  })
}

// app/api/external/generation/route.ts
/**
 * @swagger
 * /api/external/generation:
 *   post:
 *     summary: Create generation request
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerationRequest'
 *     responses:
 *       200:
 *         description: Success
 */
export async function POST(request: Request) {
  // ...
}
```

**成本:** 2天

---

### 18. 添加性能基准测试
**当前问题:** 无性能baseline

**解决方案:**
```typescript
// __tests__/benchmarks/adapter.bench.ts
import { bench, describe } from 'vitest'

describe('Adapter Performance', () => {
  bench('FluxAdapter: aspect ratio conversion', () => {
    adapter.adaptSizeToAspectRatio('1920x1080')
  })

  bench('S3 upload: 1MB image', async () => {
    await adapter.downloadAndUploadToS3(testImageUrl)
  })
})
```

**成本:** 1天

---

### 19. 类型定义增强
**当前问题:** 部分类型过于宽泛

**解决方案:**
```typescript
// types.ts 增强
export type AspectRatio = '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '9:21'
export type VideoDuration = 5 | 8 | 10

export interface FluxGenerationParameters {
  size_or_ratio?: AspectRatio | `${number}x${number}`
  seed?: number
  output_format?: 'png' | 'jpg'
  safety_tolerance?: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export interface KlingGenerationParameters {
  size_or_ratio?: AspectRatio
  duration?: VideoDuration
  seed?: number
}

// 更严格的类型
export interface FluxGenerationRequest extends UnifiedGenerationRequest {
  parameters?: FluxGenerationParameters
}
```

**收益:**
- 更好的IDE支持
- 编译时错误检测
- 文档作用

**成本:** 1天

---

### 20. 移除未使用的代码
**当前问题:** 一些未使用的imports和变量

**解决方案:**
```bash
# 使用工具自动检测
npx ts-prune
npx depcheck

# ESLint规则
"@typescript-eslint/no-unused-vars": "error"
```

**成本:** 0.5天

---

## 🟢 P3: 增强功能 (可选)

### 21. Webhook支持
**解决方案:**
```typescript
// lib/webhook/webhook-sender.ts
export class WebhookSender {
  async send(url: string, data: any, signature: string) {
    await axios.post(url, data, {
      headers: {
        'X-Webhook-Signature': signature,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })
  }

  generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }
}
```

**成本:** 2天

---

### 22. 批量生成支持
**解决方案:**
```typescript
interface BatchGenerationRequest {
  requests: UnifiedGenerationRequest[]
  batchId: string
}

async function processBatch(batch: BatchGenerationRequest) {
  const results = await Promise.allSettled(
    batch.requests.map(req => adapter.dispatch(req))
  )
  return results
}
```

**成本:** 2-3天

---

### 23. 图像预处理pipeline
**解决方案:**
```typescript
// lib/image/preprocessor.ts
export class ImagePreprocessor {
  async resize(buffer: Buffer, maxWidth: number, maxHeight: number): Promise<Buffer> {
    // 使用sharp
  }

  async compress(buffer: Buffer, quality: number): Promise<Buffer> {
    // 压缩
  }

  async convert(buffer: Buffer, format: 'png' | 'jpg' | 'webp'): Promise<Buffer> {
    // 格式转换
  }
}
```

**成本:** 2天

---

### 24. 成本追踪
**解决方案:**
```typescript
// 记录每次调用的成本
await db.generationCost.create({
  data: {
    providerId: provider.id,
    requestId: request.id,
    estimatedCost: calculateCost(provider, request),
    currency: 'USD',
  }
})

// 成本报表API
export async function GET() {
  const costs = await db.generationCost.groupBy({
    by: ['providerId'],
    _sum: { estimatedCost: true },
    where: {
      createdAt: { gte: startOfMonth }
    }
  })
  return Response.json(costs)
}
```

**成本:** 1-2天

---

### 25. A/B测试框架
**解决方案:**
```typescript
// 测试不同providers的质量
const experiment = await abTest.getVariant(userId, 'image-generation-provider')

const provider = experiment === 'A'
  ? providers.flux
  : providers.tuziOpenAI

// 记录结果用于分析
await abTest.track(userId, 'image-generation-provider', {
  variant: experiment,
  quality: userRating,
  cost: actualCost,
})
```

**成本:** 3天

---

### 26. 多区域部署支持
**解决方案:**
```typescript
// 根据用户地区选择最近的provider
const region = getUserRegion(request)
const provider = await getProviderByRegion(region, 'flux')

// 配置多区域S3
const s3Config = {
  'us-east-1': { bucket: 'bucket-us', endpoint: '...' },
  'eu-west-1': { bucket: 'bucket-eu', endpoint: '...' },
  'ap-southeast-1': { bucket: 'bucket-asia', endpoint: '...' },
}
```

**成本:** 3-5天

---

## 📊 优化实施路线图

### Phase 1: 生产就绪 (P0) - 2周
**目标:** 安全、稳定、可监控

1. Week 1:
   - API密钥加密 (2-3天)
   - 异步轮询服务 (3-5天)

2. Week 2:
   - 速率限制 (2-3天)
   - 错误监控 (1-2天)
   - 健康检查 (1天)

**完成标准:**
- ✅ 通过安全审计
- ✅ 可处理长时间任务
- ✅ 有完整的监控告警

---

### Phase 2: 架构优化 (P1) - 2周
**目标:** 代码质量、可维护性

1. Week 3:
   - 统一日志 (1-2天)
   - 抽取S3逻辑 (0.5天)
   - 抽取轮询逻辑 (1天)
   - 重试机制 (0.5天)
   - 标准化错误 (1天)

2. Week 4:
   - 参数验证 (1天)
   - 性能监控 (0.5天)
   - 请求缓存 (1-2天)

**完成标准:**
- ✅ 代码重复率<5%
- ✅ 有结构化日志
- ✅ 所有adapter有重试

---

### Phase 3: 代码质量 (P2) - 2-3周
**目标:** 测试、文档

1. Week 5-6:
   - 单元测试 (5-7天)
   - 集成测试 (2-3天)

2. Week 7:
   - 代码规范 (1天)
   - API文档 (2天)
   - 性能基准 (1天)
   - 类型增强 (1天)
   - 清理代码 (0.5天)

**完成标准:**
- ✅ 测试覆盖率>80%
- ✅ 自动化API文档
- ✅ 性能基准建立

---

### Phase 4: 增强功能 (P3) - 按需
**目标:** 高级特性

- Webhook (2天)
- 批量生成 (2-3天)
- 图像预处理 (2天)
- 成本追踪 (1-2天)
- A/B测试 (3天)
- 多区域部署 (3-5天)

---

## 💰 投资回报分析

### 成本估算

| Phase | 工作量 | 开发成本 | 运维成本/月 |
|-------|-------|---------|------------|
| P0 | 80小时 | $8,000 | $200 (监控) |
| P1 | 60小时 | $6,000 | $100 (Redis) |
| P2 | 80小时 | $8,000 | $50 (CI/CD) |
| P3 | 60小时 | $6,000 | $100 (额外基础设施) |
| **总计** | **280小时** | **$28,000** | **$450/月** |

*假设: $100/小时开发成本*

### 收益估算

| 收益类型 | 年度价值 |
|---------|---------|
| 减少API重复调用 (缓存) | $12,000 |
| 防止配额超支 (速率限制) | $5,000 |
| 减少support工单 (监控) | $8,000 |
| 提升开发效率 (代码质量) | $15,000 |
| 防止安全事故 (加密) | $10,000 |
| **总计年度收益** | **$50,000** |

### ROI计算
```
投资: $28,000 (一次性) + $450/月 × 12 = $33,400
收益: $50,000/年
净收益: $16,600/年
ROI: 49.7%
回报周期: 8个月
```

---

## 🎯 快速开始建议

### 如果只有1周时间
**优先实施:**
1. 错误监控 (P0) - 最重要
2. 统一日志 (P1) - 立即见效
3. 抽取S3/轮询逻辑 (P1) - 减少技术债

### 如果只有1个月时间
**实施Phase 1 + Phase 2前半部分:**
- 完整的P0
- P1中的日志、代码抽取、重试、错误处理

### 如果有3个月时间
**完整实施Phase 1-3**

---

## 📋 检查清单

### 实施前
- [ ] 评审优化建议优先级
- [ ] 确认资源和时间表
- [ ] 设置开发/测试环境
- [ ] 准备监控工具账号

### 实施中
- [ ] 每周代码评审
- [ ] 持续集成测试
- [ ] 文档同步更新
- [ ] 性能基准对比

### 实施后
- [ ] 生产环境验证
- [ ] 性能指标收集
- [ ] 用户反馈收集
- [ ] ROI实际计算

---

## 📚 参考资源

### 工具推荐
- **日志:** pino, winston
- **监控:** Sentry, Datadog, New Relic
- **缓存:** Redis, KeyDB
- **测试:** Jest, Vitest, Playwright
- **文档:** Swagger/OpenAPI, Docusaurus

### 最佳实践文档
- [12-Factor App](https://12factor.net/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

**报告生成时间:** 2025-10-07
**总优化建议数:** 26项
**预计总实施时间:** 280小时 (7周)
**预计投资回报期:** 8个月
