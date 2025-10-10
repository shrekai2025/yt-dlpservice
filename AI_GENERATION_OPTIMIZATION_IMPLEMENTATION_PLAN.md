# AI 生成模块优化实施方案

## 📋 概述

本文档提供 AI 生成模块的详细优化实施方案，包括需要实现的优化和架构设计方案。

---

## ✅ 需要实现的优化 (10项)

### 1. 异步轮询服务 (Async Polling Service)

#### 当前问题
- 每个 adapter 都实现自己的轮询逻辑 (KlingAdapter, PolloAdapter, ReplicateAdapter)
- 轮询逻辑重复，维护成本高
- 轮询任务阻塞 HTTP 请求，无法处理长时间任务（20+ 分钟）
- 没有统一的任务状态管理

#### 实施方案

**架构设计:**
```
Client Request → API Endpoint → Create GenerationRequest (PENDING)
                                      ↓
                              Return taskId immediately
                                      ↓
                          Background Polling Service polls task
                                      ↓
                          Update GenerationRequest status
                                      ↓
                          Client polls /generation/{id} endpoint
```

**技术栈:**
- 后台服务: Node.js Worker Thread 或独立进程
- 任务队列: 内存队列 + Prisma 持久化
- 轮询策略: 指数退避算法

**文件结构:**
```
src/lib/services/
├── polling-service.ts          # 异步轮询服务主逻辑
├── polling-worker.ts            # Worker 线程逻辑
└── polling-strategies/
    ├── base-strategy.ts         # 基础轮询策略
    ├── exponential-backoff.ts   # 指数退避策略
    └── fixed-interval.ts        # 固定间隔策略
```

**核心接口:**
```typescript
// 轮询任务接口
interface PollingTask {
  taskId: string              // 供应商任务 ID
  generationRequestId: string // 数据库记录 ID
  adapterName: string         // 使用的 adapter
  providerId: string          // 供应商 ID
  startTime: number           // 开始时间
  maxDuration: number         // 最大轮询时间（秒）
  pollInterval: number        // 轮询间隔（毫秒）
  retryCount: number          // 重试次数
}

// 轮询服务接口
interface PollingService {
  addTask(task: PollingTask): Promise<void>
  removeTask(taskId: string): Promise<void>
  getTaskStatus(taskId: string): Promise<TaskStatus>
  start(): Promise<void>
  stop(): Promise<void>
}

// 轮询策略接口
interface PollingStrategy {
  getNextPollDelay(attempt: number): number
  shouldContinue(startTime: number, maxDuration: number): boolean
}
```

**实现要点:**
1. 将轮询逻辑从 adapter 中分离
2. adapter 只负责提交任务和查询状态
3. PollingService 在后台持续轮询并更新数据库
4. 支持优雅关闭和任务恢复
5. 使用指数退避避免频繁请求

**迁移步骤:**
1. 创建 PollingService 和相关接口
2. 修改 BaseAdapter 添加 `checkTaskStatus()` 抽象方法
3. 在各个 adapter 中实现 `checkTaskStatus()` 方法
4. 修改 `dispatch()` 方法：提交任务后返回 taskId，不再轮询
5. 更新 API endpoint 支持异步响应

---

### 2. 错误监控和告警系统

#### 当前问题
- 错误只在控制台日志中，无集中监控
- 无告警机制，生产环境问题发现滞后
- 缺少错误统计和分析

#### 实施方案

**架构设计:**
```
Error Occurs → Error Handler → Log to Database
                              → Send Alert (if critical)
                              → Update Metrics
```

**技术栈:**
- 错误收集: Custom Error Handler + Prisma
- 告警渠道: Email (nodemailer) / Webhook / Slack
- 监控面板: 管理后台页面

**数据模型:**
```prisma
model ErrorLog {
  id           String   @id @default(cuid())
  level        String   // ERROR, WARN, CRITICAL
  source       String   // adapter name, service name
  message      String
  stack        String?
  context      String?  // JSON: request details, task info

  requestId    String?  // 关联的 GenerationRequest
  taskId       String?  // 供应商任务 ID

  resolved     Boolean  @default(false)
  resolvedAt   DateTime?
  resolvedBy   String?

  createdAt    DateTime @default(now())

  @@index([level])
  @@index([source])
  @@index([createdAt])
  @@map("error_logs")
}

model SystemAlert {
  id          String   @id @default(cuid())
  type        String   // ERROR_RATE_HIGH, TASK_TIMEOUT, API_DOWN
  severity    String   // LOW, MEDIUM, HIGH, CRITICAL
  message     String
  details     String?  // JSON

  sentAt      DateTime?
  channel     String?  // email, webhook, slack

  acknowledged Boolean  @default(false)
  acknowledgedAt DateTime?
  acknowledgedBy String?

  createdAt   DateTime @default(now())

  @@index([severity])
  @@index([acknowledged])
  @@map("system_alerts")
}
```

**文件结构:**
```
src/lib/services/
├── error-monitor.ts         # 错误监控服务
├── alert-manager.ts         # 告警管理器
└── alerters/
    ├── email-alerter.ts     # 邮件告警
    ├── webhook-alerter.ts   # Webhook 告警
    └── slack-alerter.ts     # Slack 告警

src/app/admin/monitoring/
├── errors/page.tsx          # 错误日志页面
└── alerts/page.tsx          # 告警管理页面
```

**核心接口:**
```typescript
interface ErrorMonitor {
  logError(error: ErrorInfo): Promise<void>
  checkAlertConditions(): Promise<void>
  getErrorStats(timeRange: TimeRange): Promise<ErrorStats>
}

interface AlertManager {
  sendAlert(alert: Alert): Promise<void>
  acknowledgeAlert(alertId: string, userId: string): Promise<void>
  getActiveAlerts(): Promise<Alert[]>
}

interface Alerter {
  send(alert: Alert): Promise<boolean>
}
```

**告警规则:**
1. 单个 adapter 1小时内失败率 > 50%
2. 任务超时率 > 20%
3. 单个任务重试次数 > 3
4. 系统级别错误 (数据库连接失败等)

---

### 3. 健康检查和监控端点

#### 当前问题
- 无法快速判断系统健康状态
- 无监控指标暴露
- 难以接入外部监控系统

#### 实施方案

**端点设计:**
```
GET /api/health                    # 基础健康检查
GET /api/health/detailed           # 详细健康检查
GET /api/metrics                   # Prometheus 格式指标
GET /api/admin/monitoring/stats    # 管理后台统计数据
```

**响应格式:**
```typescript
// GET /api/health
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
}

// GET /api/health/detailed
interface DetailedHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  components: {
    database: ComponentHealth
    s3: ComponentHealth
    adapters: Record<string, ComponentHealth>
    pollingService: ComponentHealth
  }
}

interface ComponentHealth {
  status: 'up' | 'down' | 'degraded'
  message?: string
  lastCheck: string
  responseTime?: number
}

// GET /api/metrics (Prometheus format)
// 文本格式，遵循 Prometheus 规范
```

**监控指标:**
```typescript
interface SystemMetrics {
  // 请求指标
  totalRequests: number
  activeRequests: number
  requestRate: number          // 每秒请求数

  // 任务指标
  totalTasks: number
  activeTasks: number
  completedTasks: number
  failedTasks: number
  taskSuccessRate: number
  avgTaskDuration: number

  // Adapter 指标
  adapterStats: Record<string, {
    callCount: number
    successCount: number
    failureCount: number
    avgResponseTime: number
    lastError?: string
  }>

  // 系统资源
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: number

  // 时间范围
  timeRange: {
    start: string
    end: string
  }
}
```

**文件结构:**
```
src/app/api/health/
├── route.ts                 # GET /api/health
└── detailed/route.ts        # GET /api/health/detailed

src/app/api/metrics/
└── route.ts                 # GET /api/metrics

src/lib/services/
├── health-checker.ts        # 健康检查服务
└── metrics-collector.ts     # 指标收集器
```

**实现要点:**
1. 健康检查不需要认证，方便外部监控
2. 详细健康检查需要管理员权限
3. 检查数据库连接、S3 连接、各 adapter 可用性
4. 支持 Prometheus 格式指标导出
5. 缓存健康检查结果（避免频繁检查）

---

### 4. 统一日志系统

#### 当前问题
- 各 adapter 使用 `console.log` 输出日志
- 日志格式不统一
- 缺少日志级别控制
- 无法搜索和过滤日志
- 生产环境日志管理困难

#### 实施方案

**技术选型:**
- 日志库: `pino` (高性能 JSON 日志)
- 日志传输: pino-pretty (开发环境) + file rotation (生产环境)
- 可选: 集成 Loki / Elasticsearch

**日志级别:**
```typescript
enum LogLevel {
  TRACE = 10,  // 最详细的调试信息
  DEBUG = 20,  // 调试信息
  INFO = 30,   // 一般信息
  WARN = 40,   // 警告
  ERROR = 50,  // 错误
  FATAL = 60,  // 致命错误
}
```

**日志结构:**
```typescript
interface LogEntry {
  timestamp: string
  level: LogLevel
  source: string        // adapter name, service name
  message: string
  context?: {
    requestId?: string
    taskId?: string
    userId?: string
    duration?: number
    [key: string]: any
  }
  error?: {
    name: string
    message: string
    stack?: string
  }
}
```

**文件结构:**
```
src/lib/logger/
├── index.ts                 # Logger 导出
├── logger.ts                # Logger 类实现
├── formatters.ts            # 日志格式化
└── transports/
    ├── console.ts           # 控制台输出
    ├── file.ts              # 文件输出
    └── database.ts          # 数据库输出 (可选)
```

**使用示例:**
```typescript
// Before
console.log(`[FluxAdapter] Calling API: ${url}`)
console.error(`[FluxAdapter] Error:`, error)

// After
import { logger } from '~/lib/logger'

const adapterLogger = logger.child({ source: 'FluxAdapter' })

adapterLogger.info({ url }, 'Calling API')
adapterLogger.error({ error, requestId }, 'API call failed')
```

**核心功能:**
1. 统一的日志接口
2. 结构化日志 (JSON)
3. 日志级别控制 (通过环境变量)
4. 请求 ID 追踪
5. 性能日志 (记录耗时)
6. 日志轮转 (避免文件过大)

**环境变量:**
```env
LOG_LEVEL=info                    # trace, debug, info, warn, error, fatal
LOG_FORMAT=json                   # json, pretty
LOG_FILE_PATH=logs/app.log
LOG_FILE_MAX_SIZE=10M
LOG_FILE_MAX_FILES=7
```

---

### 5. 抽取 S3 上传逻辑到 BaseAdapter

#### 当前问题
- 每个 adapter 都实现 `downloadAndUploadToS3()` 方法
- 代码重复（FluxAdapter, KlingAdapter, PolloAdapter, ReplicateAdapter, TuziOpenAIAdapter）
- 逻辑完全相同，只是 contentType 不同

#### 实施方案

**重构步骤:**

1. **在 BaseAdapter 中添加通用方法**
```typescript
// src/lib/adapters/base-adapter.ts

export abstract class BaseAdapter {
  // ... existing code ...

  /**
   * Downloads media from URL and optionally uploads to S3
   * @param url - Media URL to download
   * @param contentType - MIME type (image/png, video/mp4, etc.)
   * @param prefix - S3 path prefix override (optional)
   */
  protected async downloadAndUploadToS3(
    url: string,
    contentType: string,
    prefix?: string
  ): Promise<string> {
    try {
      // Check if S3 upload is enabled
      if (!this.sourceInfo.uploadToS3) {
        logger.info(
          { url, adapter: this.sourceInfo.adapterName },
          'S3 upload disabled, returning direct URL'
        )
        return url
      }

      logger.info(
        { url, contentType, adapter: this.sourceInfo.adapterName },
        'Downloading media from URL'
      )

      // Download media
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
      })

      const buffer = Buffer.from(response.data)
      const s3Prefix = prefix || this.sourceInfo.s3PathPrefix || 'default'

      logger.info(
        { size: buffer.length, prefix: s3Prefix },
        'Uploading to S3'
      )

      // Upload to S3
      const s3Url = await s3Uploader.uploadBuffer(
        buffer,
        s3Prefix,
        contentType
      )

      if (!s3Url) {
        throw new Error('S3 upload failed, uploader returned null')
      }

      logger.info({ s3Url }, 'S3 upload successful')
      return s3Url
    } catch (error) {
      logger.error(
        { error, url, adapter: this.sourceInfo.adapterName },
        'Failed to download/upload media'
      )
      throw error
    }
  }

  /**
   * Uploads base64-encoded image to S3
   * @param base64Data - Base64 image data (with or without data URI prefix)
   * @param prefix - S3 path prefix override (optional)
   */
  protected async uploadBase64ToS3(
    base64Data: string,
    prefix?: string
  ): Promise<string> {
    try {
      if (!this.sourceInfo.uploadToS3) {
        logger.warn('S3 upload disabled but uploadBase64ToS3 was called')
        throw new Error('Cannot upload base64 image: S3 upload is disabled')
      }

      // Remove data URI prefix if present
      const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64String, 'base64')
      const s3Prefix = prefix || this.sourceInfo.s3PathPrefix || 'default'

      logger.info(
        { size: buffer.length, prefix: s3Prefix },
        'Uploading base64 image to S3'
      )

      const s3Url = await s3Uploader.uploadBuffer(
        buffer,
        s3Prefix,
        'image/png'
      )

      if (!s3Url) {
        throw new Error('S3 upload failed, uploader returned null')
      }

      logger.info({ s3Url }, 'Base64 image upload successful')
      return s3Url
    } catch (error) {
      logger.error(
        { error, adapter: this.sourceInfo.adapterName },
        'Failed to upload base64 image'
      )
      throw error
    }
  }
}
```

2. **修改各个 adapter，移除重复代码**

```typescript
// src/lib/adapters/flux-adapter.ts
export class FluxAdapter extends BaseAdapter {
  // 移除 downloadAndUploadToS3 方法

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    // ... existing code ...

    // 使用父类方法
    const finalUrl = await this.downloadAndUploadToS3(
      fluxUrl,
      'image/png'
    )

    // ... rest of code ...
  }
}

// src/lib/adapters/kling-adapter.ts
export class KlingAdapter extends BaseAdapter {
  // 移除 downloadAndUploadToS3 方法

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    // ... existing code ...

    // 使用父类方法
    const finalUrl = await this.downloadAndUploadToS3(
      videoUrl,
      'video/mp4'
    )

    // ... rest of code ...
  }
}

// 同样修改 PolloAdapter, ReplicateAdapter, TuziOpenAIAdapter
```

**收益:**
- 删除约 150 行重复代码
- 统一 S3 上传逻辑和错误处理
- 便于后续添加功能（如上传进度、重试等）

---

### 6. 抽取轮询逻辑到 BaseAdapter

#### 当前问题
- KlingAdapter, PolloAdapter, ReplicateAdapter 都实现了轮询逻辑
- 轮询策略相似但不完全相同
- 代码重复约 200 行

#### 实施方案

**注意:** 此优化与 "异步轮询服务" 冲突。建议：
- 如果实现异步轮询服务，则不需要此优化
- 如果不实现异步轮询服务，则实施此优化

**方案设计 (假设不实施异步轮询服务):**

```typescript
// src/lib/adapters/base-adapter.ts

/**
 * Task status response from provider
 */
export interface TaskStatusResponse {
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  output?: string[]     // URLs to generated content
  error?: string        // Error message if failed
  progress?: number     // Progress percentage (0-100)
}

export abstract class BaseAdapter {
  // ... existing code ...

  /**
   * Check task status - must be implemented by adapters that support async tasks
   * @param taskId - Provider task ID
   * @returns Task status response
   */
  protected async checkTaskStatus(
    taskId: string
  ): Promise<TaskStatusResponse> {
    throw new Error(
      `${this.sourceInfo.adapterName} does not support async task polling`
    )
  }

  /**
   * Poll task until completion or timeout
   * @param taskId - Provider task ID
   * @param options - Polling options
   */
  protected async pollTaskUntilComplete(
    taskId: string,
    options?: {
      maxDuration?: number     // Max polling time in seconds (default: 600)
      pollInterval?: number    // Poll interval in ms (default: 60000)
      useExponentialBackoff?: boolean  // Use exponential backoff (default: false)
    }
  ): Promise<TaskStatusResponse> {
    const {
      maxDuration = 600,
      pollInterval = 60000,
      useExponentialBackoff = false,
    } = options || {}

    const startTime = Date.now()
    const maxEndTime = startTime + maxDuration * 1000
    let attempt = 0

    logger.info(
      {
        taskId,
        maxDuration,
        pollInterval,
        adapter: this.sourceInfo.adapterName,
      },
      'Starting task polling'
    )

    while (Date.now() < maxEndTime) {
      try {
        attempt++
        const statusResult = await this.checkTaskStatus(taskId)

        logger.debug(
          {
            taskId,
            status: statusResult.status,
            attempt,
            adapter: this.sourceInfo.adapterName,
          },
          'Task status checked'
        )

        // Task completed successfully
        if (statusResult.status === 'SUCCESS') {
          const duration = Date.now() - startTime
          logger.info(
            {
              taskId,
              duration,
              attempts: attempt,
              adapter: this.sourceInfo.adapterName,
            },
            'Task completed successfully'
          )
          return statusResult
        }

        // Task failed
        if (statusResult.status === 'FAILED') {
          logger.error(
            {
              taskId,
              error: statusResult.error,
              adapter: this.sourceInfo.adapterName,
            },
            'Task failed'
          )
          return statusResult
        }

        // Task still processing - wait before next poll
        const delay = useExponentialBackoff
          ? Math.min(pollInterval * Math.pow(1.5, attempt - 1), 300000) // Max 5 min
          : pollInterval

        logger.debug(
          {
            taskId,
            status: statusResult.status,
            nextPollDelay: delay,
          },
          'Task still processing, waiting...'
        )

        await new Promise((resolve) => setTimeout(resolve, delay))
      } catch (error) {
        logger.error(
          {
            error,
            taskId,
            attempt,
            adapter: this.sourceInfo.adapterName,
          },
          'Error polling task status'
        )

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      }
    }

    // Timeout
    logger.error(
      {
        taskId,
        duration: Date.now() - startTime,
        attempts: attempt,
        adapter: this.sourceInfo.adapterName,
      },
      'Task polling timeout'
    )

    return {
      status: 'FAILED',
      error: 'Task polling timeout',
    }
  }
}
```

**修改各个 adapter:**

```typescript
// src/lib/adapters/kling-adapter.ts
export class KlingAdapter extends BaseAdapter {
  // 移除 pollTaskStatus 方法，重命名为 checkTaskStatus
  protected async checkTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const queryUrl = `https://api.tu-zi.com/kling/v1/videos/task/${taskId}`
    const response = await this.httpClient.get(queryUrl, { timeout: 30000 })
    const result = response.data

    // Parse response and convert to standard format
    if (result.code !== 0) {
      return {
        status: 'FAILED',
        error: result.message || 'Unknown error',
      }
    }

    const data = result.data || {}
    const taskStatus = data.task_status || 'unknown'

    // Map Kling status to standard status
    if (['completed', 'success', 'finished', 'succeed'].includes(taskStatus)) {
      const videoUrl = data.task_result?.videos?.[0]?.url
      return {
        status: 'SUCCESS',
        output: videoUrl ? [videoUrl] : [],
      }
    }

    if (['failed', 'error'].includes(taskStatus)) {
      return {
        status: 'FAILED',
        error: data.task_status_msg || 'Unknown error',
      }
    }

    if (['submitted', 'processing', 'running', 'pending'].includes(taskStatus)) {
      return { status: 'PROCESSING' }
    }

    return { status: 'PROCESSING' }
  }

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    // ... submit task ...

    // 使用父类的轮询方法
    const pollResult = await this.pollTaskUntilComplete(taskId, {
      maxDuration: 1200,  // 20 minutes
      pollInterval: 60000, // 60 seconds
    })

    if (pollResult.status === 'SUCCESS' && pollResult.output) {
      const finalUrl = await this.downloadAndUploadToS3(
        pollResult.output[0]!,
        'video/mp4'
      )
      return {
        status: 'SUCCESS',
        results: [{ type: 'video', url: finalUrl }],
      }
    }

    return {
      status: 'ERROR',
      message: pollResult.error || 'Task failed',
    }
  }
}

// 同样修改 PolloAdapter 和 ReplicateAdapter
```

---

### 7. 实现重试机制

#### 当前问题
- API 调用失败后立即返回错误，没有重试
- 临时性网络错误导致任务失败
- 供应商 API 限流后无法自动恢复

#### 实施方案

**重试策略:**
1. **指数退避** - 每次重试间隔加倍
2. **抖动** - 添加随机延迟避免雷击效应
3. **可重试错误判断** - 只重试临时性错误

**文件结构:**
```
src/lib/utils/
├── retry.ts                 # 重试工具函数
└── retry-config.ts          # 重试配置
```

**实现:**
```typescript
// src/lib/utils/retry.ts

export interface RetryConfig {
  maxAttempts: number           // 最大重试次数
  initialDelay: number          // 初始延迟 (ms)
  maxDelay: number              // 最大延迟 (ms)
  backoffMultiplier: number     // 退避倍数
  jitter: boolean               // 是否添加抖动
  retryableErrors?: string[]    // 可重试的错误类型
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'RATE_LIMIT',
  ],
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any, config: RetryConfig): boolean {
  if (!error) return false

  // Network errors
  if (error.code && config.retryableErrors?.includes(error.code)) {
    return true
  }

  // HTTP status codes
  if (error.response?.status) {
    const status = error.response.status
    // Retry on: 408, 429, 500, 502, 503, 504
    if ([408, 429, 500, 502, 503, 504].includes(status)) {
      return true
    }
  }

  return false
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function getRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  let delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1)
  delay = Math.min(delay, config.maxDelay)

  if (config.jitter) {
    // Add random jitter: ±25%
    const jitterAmount = delay * 0.25
    delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount)
  }

  return Math.floor(delay)
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: {
    operationName?: string
    logger?: any
  }
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const { logger, operationName = 'operation' } = context || {}

  let lastError: any

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      logger?.debug(
        { attempt, maxAttempts: finalConfig.maxAttempts, operationName },
        'Attempting operation'
      )

      const result = await fn()

      if (attempt > 1) {
        logger?.info(
          { attempt, operationName },
          'Operation succeeded after retry'
        )
      }

      return result
    } catch (error) {
      lastError = error

      const isRetryable = isRetryableError(error, finalConfig)
      const isLastAttempt = attempt === finalConfig.maxAttempts

      logger?.warn(
        {
          error,
          attempt,
          maxAttempts: finalConfig.maxAttempts,
          isRetryable,
          operationName,
        },
        'Operation failed'
      )

      // Don't retry if not retryable or last attempt
      if (!isRetryable || isLastAttempt) {
        throw error
      }

      // Wait before retry
      const delay = getRetryDelay(attempt, finalConfig)
      logger?.info(
        { delay, nextAttempt: attempt + 1, operationName },
        'Retrying after delay'
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Retry decorator for class methods
 */
export function Retry(config?: Partial<RetryConfig>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return retryWithBackoff(
        () => originalMethod.apply(this, args),
        config,
        {
          operationName: `${target.constructor.name}.${propertyKey}`,
          logger: logger,
        }
      )
    }

    return descriptor
  }
}
```

**在 BaseAdapter 中集成:**
```typescript
// src/lib/adapters/base-adapter.ts

export abstract class BaseAdapter {
  protected retryConfig: RetryConfig

  constructor(sourceInfo: ProviderConfig) {
    this.sourceInfo = sourceInfo
    this.httpClient = this.getHttpClient()
    this.retryConfig = this.getRetryConfig()
  }

  /**
   * Get retry configuration for this adapter
   * Can be overridden by subclasses
   */
  protected getRetryConfig(): RetryConfig {
    return {
      ...DEFAULT_RETRY_CONFIG,
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
    }
  }

  /**
   * Execute HTTP request with retry
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    return retryWithBackoff(fn, this.retryConfig, {
      operationName: operationName || 'HTTP request',
      logger: logger.child({ adapter: this.sourceInfo.adapterName }),
    })
  }
}
```

**使用示例:**
```typescript
// src/lib/adapters/flux-adapter.ts

export class FluxAdapter extends BaseAdapter {
  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    try {
      // ... prepare payload ...

      // 使用重试机制调用 API
      const response = await this.executeWithRetry(
        () => this.httpClient.post(apiEndpoint, payload),
        'Flux API call'
      )

      // ... process response ...
    } catch (error) {
      logger.error({ error }, 'Flux API call failed after retries')
      return {
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
```

---

### 8. 标准化错误处理

#### 当前问题
- 各 adapter 返回的错误格式不统一
- 错误信息不够详细
- 缺少错误分类

#### 实施方案

**错误分类:**
```typescript
// src/lib/errors/generation-errors.ts

export enum ErrorCode {
  // Client errors (4xx)
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMITED = 'RATE_LIMITED',

  // Provider errors (5xx)
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  S3_UPLOAD_FAILED = 'S3_UPLOAD_FAILED',
  TASK_TIMEOUT = 'TASK_TIMEOUT',

  // Task errors
  TASK_FAILED = 'TASK_FAILED',
  TASK_CANCELLED = 'TASK_CANCELLED',
}

export class GenerationError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any,
    public isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'GenerationError'
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      isRetryable: this.isRetryable,
    }
  }
}

// Specific error classes
export class InvalidRequestError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.INVALID_REQUEST, message, details, false)
    this.name = 'InvalidRequestError'
  }
}

export class ProviderError extends GenerationError {
  constructor(message: string, details?: any, isRetryable: boolean = true) {
    super(ErrorCode.PROVIDER_ERROR, message, details, isRetryable)
    this.name = 'ProviderError'
  }
}

export class QuotaExceededError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.QUOTA_EXCEEDED, message, details, false)
    this.name = 'QuotaExceededError'
  }
}

export class RateLimitError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.RATE_LIMITED, message, details, true)
    this.name = 'RateLimitError'
  }
}

export class S3UploadError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.S3_UPLOAD_FAILED, message, details, true)
    this.name = 'S3UploadError'
  }
}

export class TaskTimeoutError extends GenerationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.TASK_TIMEOUT, message, details, false)
    this.name = 'TaskTimeoutError'
  }
}

/**
 * Convert HTTP error to GenerationError
 */
export function mapHttpErrorToGenerationError(error: any): GenerationError {
  if (error instanceof GenerationError) {
    return error
  }

  const status = error.response?.status
  const data = error.response?.data

  // Map status codes to error types
  if (status === 401 || status === 403) {
    return new GenerationError(
      ErrorCode.AUTHENTICATION_FAILED,
      'Authentication failed',
      { status, data },
      false
    )
  }

  if (status === 429) {
    return new RateLimitError(
      'Rate limit exceeded',
      { status, data, retryAfter: error.response?.headers?.['retry-after'] }
    )
  }

  if (status === 402 || (data?.message?.toLowerCase().includes('credit'))) {
    return new QuotaExceededError(
      data?.message || 'Quota exceeded',
      { status, data }
    )
  }

  if (status >= 500) {
    return new ProviderError(
      data?.message || 'Provider error',
      { status, data },
      true
    )
  }

  if (status >= 400) {
    return new InvalidRequestError(
      data?.message || error.message || 'Invalid request',
      { status, data }
    )
  }

  // Network errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return new ProviderError(
      'Request timeout',
      { code: error.code },
      true
    )
  }

  if (error.code) {
    return new ProviderError(
      `Network error: ${error.code}`,
      { code: error.code },
      true
    )
  }

  // Unknown error
  return new GenerationError(
    ErrorCode.INTERNAL_ERROR,
    error.message || 'Unknown error',
    error,
    false
  )
}
```

**标准化 AdapterResponse:**
```typescript
// src/lib/adapters/types.ts

export interface AdapterResponse {
  status: 'SUCCESS' | 'ERROR'
  results?: GenerationResult[]
  message?: string
  error?: {
    code: ErrorCode
    message: string
    details?: any
    isRetryable: boolean
  }
}
```

**在 BaseAdapter 中添加错误处理:**
```typescript
// src/lib/adapters/base-adapter.ts

export abstract class BaseAdapter {
  /**
   * Handle error and convert to standard response
   */
  protected handleError(error: any, context?: string): AdapterResponse {
    const genError = mapHttpErrorToGenerationError(error)

    logger.error(
      {
        error: genError.toJSON(),
        context,
        adapter: this.sourceInfo.adapterName,
      },
      'Adapter error occurred'
    )

    return {
      status: 'ERROR',
      message: genError.message,
      error: {
        code: genError.code,
        message: genError.message,
        details: genError.details,
        isRetryable: genError.isRetryable,
      },
    }
  }

  /**
   * Validate request before processing
   */
  protected validateGenerationRequest(
    request: UnifiedGenerationRequest
  ): void {
    if (!request.prompt || request.prompt.trim() === '') {
      throw new InvalidRequestError('Prompt is required')
    }

    // Adapter-specific validation can be added in subclasses
  }
}
```

**修改各 adapter 使用标准错误处理:**
```typescript
// src/lib/adapters/flux-adapter.ts

export class FluxAdapter extends BaseAdapter {
  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    try {
      // Validate request
      this.validateGenerationRequest(request)

      // ... API call ...

      return {
        status: 'SUCCESS',
        results,
      }
    } catch (error) {
      return this.handleError(error, 'Flux image generation')
    }
  }
}
```

---

### 9. 参数验证增强

#### 当前问题
- 缺少输入参数验证
- 无效参数可能导致API调用失败
- 错误信息不明确

#### 实施方案

**技术选型:**
- 使用 `zod` 进行运行时类型验证

**文件结构:**
```
src/lib/adapters/validation/
├── index.ts                    # 导出所有 schema
├── common-schemas.ts           # 通用 schema
├── image-schemas.ts            # 图片生成 schema
└── video-schemas.ts            # 视频生成 schema
```

**实现:**
```typescript
// src/lib/adapters/validation/common-schemas.ts

import { z } from 'zod'

export const PromptSchema = z.string()
  .min(1, 'Prompt cannot be empty')
  .max(2000, 'Prompt too long (max 2000 characters)')

export const ImageUrlSchema = z.string()
  .url('Invalid image URL')
  .or(
    z.string().regex(
      /^data:image\/(png|jpeg|jpg|webp);base64,/,
      'Invalid base64 image format'
    )
  )

export const NumberOfOutputsSchema = z.number()
  .int('Number of outputs must be an integer')
  .min(1, 'Number of outputs must be at least 1')
  .max(10, 'Number of outputs cannot exceed 10')

export const SeedSchema = z.number()
  .int('Seed must be an integer')
  .min(0, 'Seed must be non-negative')
  .optional()

export const BaseGenerationRequestSchema = z.object({
  prompt: PromptSchema,
  input_images: z.array(ImageUrlSchema).optional(),
  number_of_outputs: NumberOfOutputsSchema.optional().default(1),
  parameters: z.record(z.any()).optional(),
})

// src/lib/adapters/validation/image-schemas.ts

export const AspectRatioSchema = z.enum([
  '1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '9:21'
])

export const SizeStringSchema = z.string().regex(
  /^\d+x\d+$/,
  'Size must be in format: widthxheight (e.g., 1024x1024)'
)

export const ImageSizeSchema = z.union([
  AspectRatioSchema,
  SizeStringSchema,
])

export const FluxRequestSchema = BaseGenerationRequestSchema.extend({
  parameters: z.object({
    size_or_ratio: ImageSizeSchema.optional().default('1024x1024'),
    seed: SeedSchema,
    prompt_upsampling: z.boolean().optional(),
    safety_tolerance: z.number().min(0).max(6).optional(),
  }).optional(),
})

export const TuziOpenAIRequestSchema = BaseGenerationRequestSchema.extend({
  parameters: z.object({
    size_or_ratio: ImageSizeSchema.optional().default('1024x1024'),
    seed: SeedSchema,
    n: z.number().int().min(1).max(10).optional(),
    quality: z.enum(['standard', 'hd']).optional(),
    style: z.enum(['vivid', 'natural']).optional(),
  }).optional(),
})

// src/lib/adapters/validation/video-schemas.ts

export const VideoDurationSchema = z.number()
  .int('Duration must be an integer')
  .min(1, 'Duration must be at least 1 second')
  .max(30, 'Duration cannot exceed 30 seconds')

export const KlingRequestSchema = BaseGenerationRequestSchema.extend({
  parameters: z.object({
    size_or_ratio: ImageSizeSchema.optional().default('16:9'),
    duration: z.enum([5, 10]).optional().default(5),
    mode: z.enum(['standard', 'pro']).optional().default('pro'),
  }).optional(),
})

export const PolloRequestSchema = BaseGenerationRequestSchema.extend({
  parameters: z.object({
    duration: VideoDurationSchema.optional().default(8),
    generateAudio: z.boolean().optional().default(true),
    negative_prompt: z.string().optional(),
    seed: SeedSchema,
  }).optional(),
})

export const ReplicateRequestSchema = BaseGenerationRequestSchema.extend({
  parameters: z.object({
    duration: VideoDurationSchema.optional(),
    aspect_ratio: z.enum(['16:9', '9:16', '1:1']).optional(),
    seed: SeedSchema,
  }).optional(),
})
```

**在 BaseAdapter 中集成验证:**
```typescript
// src/lib/adapters/base-adapter.ts

import { z } from 'zod'

export abstract class BaseAdapter {
  /**
   * Get validation schema for this adapter
   * Must be implemented by subclasses that want validation
   */
  protected getValidationSchema(): z.ZodSchema | null {
    return null
  }

  /**
   * Validate request using adapter-specific schema
   */
  protected validateRequest(
    request: UnifiedGenerationRequest
  ): UnifiedGenerationRequest {
    const schema = this.getValidationSchema()

    if (!schema) {
      // No validation schema, use basic validation
      if (!request.prompt || request.prompt.trim() === '') {
        throw new InvalidRequestError('Prompt is required')
      }
      return request
    }

    try {
      // Validate and return parsed (with defaults) request
      return schema.parse(request)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
        throw new InvalidRequestError(
          `Invalid request parameters: ${messages.join('; ')}`,
          { errors: error.errors }
        )
      }
      throw error
    }
  }
}
```

**在各 adapter 中实现:**
```typescript
// src/lib/adapters/flux-adapter.ts

import { FluxRequestSchema } from './validation'

export class FluxAdapter extends BaseAdapter {
  protected getValidationSchema() {
    return FluxRequestSchema
  }

  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    try {
      // Validate and parse request (applies defaults)
      const validatedRequest = this.validateRequest(request)

      // ... use validatedRequest ...
    } catch (error) {
      return this.handleError(error, 'Flux image generation')
    }
  }
}

// 同样在其他 adapter 中实现
```

**收益:**
1. 在 API 调用前捕获错误，节省 API 调用成本
2. 提供清晰的错误信息
3. 自动应用默认值
4. 类型安全（TypeScript + Zod）

---

### 10. 移除未使用的代码

#### 当前问题
发现以下未使用的文件/代码:
- `src/lib/adapters/sources/flux-adapter.ts` - 旧版 adapter，已被根目录版本替代

#### 实施方案

**检查并移除:**

1. **检查是否真的未使用**
```bash
# 搜索所有引用
grep -r "sources/flux-adapter" src/
grep -r "from './sources" src/lib/adapters/
```

2. **如果确认未使用，删除文件**
```bash
rm src/lib/adapters/sources/flux-adapter.ts
```

3. **检查其他潜在未使用的代码**
```bash
# 使用 ESLint 查找未使用的导出
npx eslint src/ --ext .ts,.tsx --no-eslintrc --parser @typescript-eslint/parser --plugin @typescript-eslint/eslint-plugin --rule '@typescript-eslint/no-unused-vars: error'

# 或使用 ts-prune
npx ts-prune
```

4. **清理未使用的依赖**
```bash
npx depcheck
```

**清理清单:**
- [ ] `src/lib/adapters/sources/` 目录（如果整个目录都未使用）
- [ ] 未使用的类型定义
- [ ] 未使用的工具函数
- [ ] 未使用的 npm 包

---

## 📝 需要设计方案的功能 (3项，不实现)

### 方案 1: 批量生成支持

#### 业务需求
允许用户一次性提交多个生成任务，系统批量处理。

#### 使用场景
1. 批量生成产品图片（多个商品 × 多个角度）
2. 批量视频生成（同一模板，不同参数）
3. A/B 测试（同一 prompt，不同模型）

#### 架构设计

**方案 A: 简单批量 (推荐用于 MVP)**

```typescript
// API 设计
POST /api/external/generation/batch

Request:
{
  "requests": [
    {
      "modelIdentifier": "flux-pro",
      "prompt": "a red apple",
      "parameters": { "size_or_ratio": "1024x1024" }
    },
    {
      "modelIdentifier": "flux-pro",
      "prompt": "a green apple",
      "parameters": { "size_or_ratio": "1024x1024" }
    }
  ],
  "options": {
    "parallel": true,        // 是否并行执行（默认 true）
    "maxConcurrency": 3,     // 最大并发数
    "stopOnError": false     // 遇到错误是否停止（默认 false）
  }
}

Response:
{
  "batchId": "batch_abc123",
  "totalTasks": 2,
  "status": "PROCESSING",
  "tasks": [
    { "id": "gen_001", "status": "PENDING" },
    { "id": "gen_002", "status": "PENDING" }
  ]
}

// 查询批量任务状态
GET /api/external/generation/batch/{batchId}

Response:
{
  "batchId": "batch_abc123",
  "status": "COMPLETED",  // PROCESSING, COMPLETED, PARTIAL_FAILED, FAILED
  "totalTasks": 2,
  "completedTasks": 2,
  "failedTasks": 0,
  "progress": 100,
  "tasks": [
    {
      "id": "gen_001",
      "status": "SUCCESS",
      "results": [{ "type": "image", "url": "..." }]
    },
    {
      "id": "gen_002",
      "status": "SUCCESS",
      "results": [{ "type": "image", "url": "..." }]
    }
  ]
}
```

**数据模型:**
```prisma
model GenerationBatch {
  id              String            @id @default(cuid())
  totalTasks      Int
  completedTasks  Int               @default(0)
  failedTasks     Int               @default(0)
  status          BatchStatus       // PROCESSING, COMPLETED, PARTIAL_FAILED, FAILED

  parallel        Boolean           @default(true)
  maxConcurrency  Int               @default(3)
  stopOnError     Boolean           @default(false)

  tasks           GenerationRequest[]

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  completedAt     DateTime?

  @@index([status])
  @@map("generation_batches")
}

enum BatchStatus {
  PROCESSING
  COMPLETED
  PARTIAL_FAILED
  FAILED
}

// 修改 GenerationRequest，添加 batchId 字段
model GenerationRequest {
  // ... existing fields ...

  batchId         String?
  batch           GenerationBatch?  @relation(fields: [batchId], references: [id])

  @@index([batchId])
}
```

**实现要点:**
1. 接收批量请求，创建 GenerationBatch 记录
2. 为每个请求创建 GenerationRequest 记录
3. 根据 `parallel` 和 `maxConcurrency` 控制并发执行
4. 使用 `Promise.allSettled()` 处理并行任务
5. 更新 batch 的进度和状态

**方案 B: 高级批量 (企业级)**

在方案 A 基础上增加:
1. **优先级队列** - 不同批次有不同优先级
2. **资源调度** - 根据供应商配额智能分配任务
3. **依赖关系** - 任务之间可以有依赖（如先生成图片，再基于图片生成视频）
4. **断点续传** - 批量任务失败后可以从断点恢复
5. **成本预估** - 提交前预估总成本

#### 技术挑战
1. **并发控制** - 避免超出供应商限流
2. **内存管理** - 大批量任务可能占用大量内存
3. **错误处理** - 部分失败如何处理
4. **事务性** - 批量操作的原子性

#### 实施建议
- **阶段 1 (2周):** 实现方案 A，支持基本批量提交和状态查询
- **阶段 2 (3周):** 添加并发控制和优先级队列
- **阶段 3 (4周):** 实现方案 B 的高级特性

#### 成本估算
- 开发: 4-9 周（取决于实现方案）
- 额外基础设施: 任务队列（Redis）
- 监控和测试: 2 周

---

### 方案 2: 图像预处理 Pipeline

#### 业务需求
在将图像传递给生成 API 前，自动进行预处理（压缩、格式转换、尺寸调整等）。

#### 使用场景
1. 用户上传高分辨率图片，需要压缩后传递给 API（节省流量和成本）
2. 某些 API 只支持特定格式（如 Pollo 只支持 URL，不支持 base64）
3. 图像增强（去噪、锐化）以提高生成质量

#### 架构设计

**Pipeline 架构:**
```
Input Image → Validator → Preprocessor Chain → Output Image
                ↓
            - Format check
            - Size check
            - Content check

Preprocessor Chain:
1. Format Converter (PNG/JPEG/WebP)
2. Resizer (按比例或目标尺寸)
3. Compressor (质量/大小优化)
4. Enhancer (锐化/去噪) [可选]
5. Uploader (转 URL if needed)
```

**技术栈:**
- 图像处理: `sharp` (高性能 Node.js 图像库)
- 格式检测: `file-type`
- 临时存储: S3 或本地临时目录

**接口设计:**
```typescript
// 预处理配置
interface PreprocessConfig {
  // 格式转换
  format?: 'png' | 'jpeg' | 'webp' | 'keep'  // keep = 保持原格式

  // 尺寸调整
  resize?: {
    mode: 'fit' | 'fill' | 'cover' | 'contain'  // 调整模式
    width?: number
    height?: number
    maxWidth?: number
    maxHeight?: number
  }

  // 压缩
  compression?: {
    quality?: number    // 1-100
    maxSizeKB?: number  // 最大文件大小
  }

  // 增强
  enhance?: {
    sharpen?: boolean
    denoise?: boolean
    autoContrast?: boolean
  }

  // 输出
  output?: {
    type: 'base64' | 'url' | 'buffer'
    uploadToS3?: boolean
  }
}

// 预处理器接口
interface ImagePreprocessor {
  process(input: Buffer | string, config: PreprocessConfig): Promise<ProcessedImage>
  validate(input: Buffer | string): Promise<ValidationResult>
}

interface ProcessedImage {
  data: Buffer | string  // base64 or URL
  format: string
  width: number
  height: number
  size: number          // bytes
  metadata?: any
}
```

**Pipeline 实现:**
```typescript
// src/lib/services/image-preprocessing/

// pipeline.ts
export class ImagePreprocessingPipeline {
  private steps: PreprocessStep[] = []

  constructor(config: PreprocessConfig) {
    this.buildPipeline(config)
  }

  private buildPipeline(config: PreprocessConfig) {
    // 1. 验证步骤
    this.steps.push(new ValidationStep())

    // 2. 格式转换
    if (config.format && config.format !== 'keep') {
      this.steps.push(new FormatConversionStep(config.format))
    }

    // 3. 尺寸调整
    if (config.resize) {
      this.steps.push(new ResizeStep(config.resize))
    }

    // 4. 压缩
    if (config.compression) {
      this.steps.push(new CompressionStep(config.compression))
    }

    // 5. 增强
    if (config.enhance) {
      this.steps.push(new EnhanceStep(config.enhance))
    }

    // 6. 输出转换
    if (config.output) {
      this.steps.push(new OutputStep(config.output))
    }
  }

  async process(input: Buffer | string): Promise<ProcessedImage> {
    let currentData = input
    let metadata = {}

    for (const step of this.steps) {
      const result = await step.execute(currentData, metadata)
      currentData = result.data
      metadata = { ...metadata, ...result.metadata }
    }

    return {
      data: currentData,
      ...metadata,
    } as ProcessedImage
  }
}

// steps/base-step.ts
export abstract class PreprocessStep {
  abstract execute(
    input: Buffer | string,
    metadata: any
  ): Promise<{ data: Buffer | string; metadata: any }>
}

// steps/resize-step.ts
export class ResizeStep extends PreprocessStep {
  constructor(private config: PreprocessConfig['resize']) {
    super()
  }

  async execute(input: Buffer | string, metadata: any) {
    const buffer = this.toBuffer(input)
    const image = sharp(buffer)

    // 获取原始尺寸
    const { width, height } = await image.metadata()

    // 计算目标尺寸
    const targetSize = this.calculateTargetSize(
      width!,
      height!,
      this.config!
    )

    // 调整尺寸
    const resized = await image
      .resize(targetSize.width, targetSize.height, {
        fit: this.config!.mode,
        withoutEnlargement: true,
      })
      .toBuffer()

    return {
      data: resized,
      metadata: {
        ...metadata,
        width: targetSize.width,
        height: targetSize.height,
      },
    }
  }

  private calculateTargetSize(
    width: number,
    height: number,
    config: NonNullable<PreprocessConfig['resize']>
  ): { width: number; height: number } {
    // 实现尺寸计算逻辑
    // ...
  }

  private toBuffer(input: Buffer | string): Buffer {
    if (Buffer.isBuffer(input)) return input
    // 处理 base64 字符串
    // ...
  }
}

// 类似实现其他 Step: FormatConversionStep, CompressionStep, EnhanceStep, OutputStep
```

**集成到 Adapter:**
```typescript
// src/lib/adapters/base-adapter.ts

export abstract class BaseAdapter {
  /**
   * Get preprocessing config for this adapter
   * Can be overridden by subclasses
   */
  protected getPreprocessConfig(): PreprocessConfig | null {
    return null
  }

  /**
   * Preprocess input images
   */
  protected async preprocessImages(
    images: string[]
  ): Promise<string[]> {
    const config = this.getPreprocessConfig()
    if (!config) {
      return images  // No preprocessing
    }

    const pipeline = new ImagePreprocessingPipeline(config)
    const processed: string[] = []

    for (const image of images) {
      const result = await pipeline.process(image)
      processed.push(result.data as string)
    }

    return processed
  }

  // 在 dispatch 前调用
  async dispatch(request: UnifiedGenerationRequest): Promise<AdapterResponse> {
    // Preprocess images if needed
    if (request.input_images && request.input_images.length > 0) {
      request.input_images = await this.preprocessImages(request.input_images)
    }

    // ... rest of dispatch logic
  }
}
```

**Adapter 配置示例:**
```typescript
// src/lib/adapters/pollo-adapter.ts

export class PolloAdapter extends BaseAdapter {
  protected getPreprocessConfig(): PreprocessConfig {
    return {
      // Pollo 需要 URL 格式，不支持 base64
      output: {
        type: 'url',
        uploadToS3: true,
      },
      // 压缩以节省上传时间
      compression: {
        quality: 85,
        maxSizeKB: 5000,  // 5MB
      },
      // 保持原格式
      format: 'keep',
    }
  }
}

// src/lib/adapters/flux-adapter.ts

export class FluxAdapter extends BaseAdapter {
  protected getPreprocessConfig(): PreprocessConfig {
    return {
      // Flux 支持 base64
      output: {
        type: 'base64',
      },
      // 限制尺寸以节省 API 成本
      resize: {
        mode: 'fit',
        maxWidth: 2048,
        maxHeight: 2048,
      },
      compression: {
        quality: 90,
      },
    }
  }
}
```

#### 预处理预设

提供常用预设配置:
```typescript
export const PREPROCESS_PRESETS: Record<string, PreprocessConfig> = {
  // 快速预览（低质量、小尺寸）
  fast: {
    resize: { mode: 'fit', maxWidth: 512, maxHeight: 512 },
    compression: { quality: 70 },
    format: 'jpeg',
    output: { type: 'base64' },
  },

  // 标准质量（平衡质量和大小）
  standard: {
    resize: { mode: 'fit', maxWidth: 1024, maxHeight: 1024 },
    compression: { quality: 85 },
    format: 'keep',
    output: { type: 'url', uploadToS3: true },
  },

  // 高质量（最小压缩）
  high: {
    resize: { mode: 'fit', maxWidth: 2048, maxHeight: 2048 },
    compression: { quality: 95 },
    format: 'png',
    output: { type: 'url', uploadToS3: true },
  },

  // 供应商特定预设
  'pollo-optimized': {
    resize: { mode: 'cover', width: 1920, height: 1080 },
    compression: { quality: 90, maxSizeKB: 5000 },
    format: 'jpeg',
    output: { type: 'url', uploadToS3: true },
  },
}
```

#### 实施建议
- **阶段 1 (2周):** 实现基础 Pipeline 和核心 Step（格式转换、尺寸调整、压缩）
- **阶段 2 (1周):** 实现输出转换（base64 ↔ URL）
- **阶段 3 (2周):** 实现增强功能（锐化、去噪）
- **阶段 4 (1周):** 集成到各 Adapter，配置预设

#### 成本估算
- 开发: 6 周
- sharp 库依赖: 免费（开源）
- S3 存储成本: 临时文件（1-7天过期），成本极低
- 性能影响: 每张图片增加 100-500ms 处理时间

---

### 方案 3: A/B 测试框架

#### 业务需求
对比不同模型、不同参数的生成效果，选择最佳方案。

#### 使用场景
1. 新模型上线前，对比新旧模型效果
2. 优化 prompt，测试哪个版本效果更好
3. 参数调优（如找到最佳的 `duration`、`aspect_ratio`）
4. 成本优化（找到性价比最高的模型）

#### 架构设计

**核心概念:**
```
Experiment (实验)
├── Variant A (变体 A)
│   ├── Model: flux-pro
│   ├── Parameters: { size: "1024x1024" }
│   └── Traffic: 50%
└── Variant B (变体 B)
    ├── Model: flux-dev
    ├── Parameters: { size: "1024x1024" }
    └── Traffic: 50%

Metrics (指标):
- Success Rate (成功率)
- Avg Duration (平均耗时)
- Avg Cost (平均成本)
- User Rating (用户评分)
```

**数据模型:**
```prisma
model Experiment {
  id          String            @id @default(cuid())
  name        String
  description String?
  status      ExperimentStatus  // DRAFT, RUNNING, PAUSED, COMPLETED

  // 实验配置
  variants    ExperimentVariant[]
  metrics     ExperimentMetric[]

  // 流量分配
  trafficAllocation String  // JSON: { "variant_a": 50, "variant_b": 50 }

  // 时间
  startedAt   DateTime?
  endedAt     DateTime?

  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@map("experiments")
}

enum ExperimentStatus {
  DRAFT
  RUNNING
  PAUSED
  COMPLETED
}

model ExperimentVariant {
  id            String       @id @default(cuid())
  experimentId  String
  experiment    Experiment   @relation(fields: [experimentId], references: [id])

  name          String       // "Control", "Variant A", "Variant B"
  description   String?

  // 变体配置
  modelIdentifier String
  prompt          String?    // Prompt override (如果为 null，使用请求的 prompt)
  parameters      String     // JSON: adapter parameters

  // 统计数据
  totalRequests   Int        @default(0)
  successCount    Int        @default(0)
  failureCount    Int        @default(0)
  totalDuration   Int        @default(0)  // milliseconds
  totalCost       Float      @default(0)  // 需要实现成本跟踪

  // 用户反馈
  totalRatings    Int        @default(0)
  avgRating       Float?

  requests        GenerationRequest[]

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([experimentId])
  @@map("experiment_variants")
}

model ExperimentMetric {
  id            String     @id @default(cuid())
  experimentId  String
  experiment    Experiment @relation(fields: [experimentId], references: [id])

  name          String     // "success_rate", "avg_duration", "avg_cost"
  type          String     // "primary", "secondary"
  goal          String     // "maximize", "minimize"

  createdAt     DateTime   @default(now())

  @@index([experimentId])
  @@map("experiment_metrics")
}

// 修改 GenerationRequest，添加实验相关字段
model GenerationRequest {
  // ... existing fields ...

  experimentId    String?
  variantId       String?
  variant         ExperimentVariant? @relation(fields: [variantId], references: [id])

  // 用户反馈
  userRating      Int?       // 1-5 stars
  userFeedback    String?

  @@index([experimentId])
  @@index([variantId])
}
```

**API 设计:**

```typescript
// 创建实验
POST /api/admin/experiments

Request:
{
  "name": "Flux Pro vs Dev",
  "description": "Compare quality and cost",
  "variants": [
    {
      "name": "Control (Flux Pro)",
      "modelIdentifier": "flux-pro",
      "parameters": { "size_or_ratio": "1024x1024" }
    },
    {
      "name": "Variant A (Flux Dev)",
      "modelIdentifier": "flux-dev",
      "parameters": { "size_or_ratio": "1024x1024" }
    }
  ],
  "trafficAllocation": {
    "variant_0": 50,
    "variant_1": 50
  },
  "metrics": [
    { "name": "success_rate", "type": "primary", "goal": "maximize" },
    { "name": "avg_cost", "type": "primary", "goal": "minimize" },
    { "name": "user_rating", "type": "secondary", "goal": "maximize" }
  ]
}

// 启动实验
POST /api/admin/experiments/{id}/start

// 获取实验结果
GET /api/admin/experiments/{id}/results

Response:
{
  "experimentId": "exp_abc123",
  "status": "RUNNING",
  "duration": 86400,  // seconds
  "variants": [
    {
      "name": "Control (Flux Pro)",
      "stats": {
        "totalRequests": 500,
        "successRate": 98.5,
        "avgDuration": 3200,
        "avgCost": 0.05,
        "avgRating": 4.3
      }
    },
    {
      "name": "Variant A (Flux Dev)",
      "stats": {
        "totalRequests": 500,
        "successRate": 97.8,
        "avgDuration": 2800,
        "avgCost": 0.02,
        "avgRating": 4.1
      }
    }
  ],
  "winner": {
    "variantId": "var_xyz",
    "confidence": 95.5,
    "recommendation": "Variant A has 44% lower cost with only 0.7% lower success rate"
  }
}

// 用户评分接口
POST /api/external/generation/{id}/rate

Request:
{
  "rating": 5,
  "feedback": "Great quality!"
}
```

**实验分配逻辑:**
```typescript
// src/lib/services/ab-testing/experiment-allocator.ts

export class ExperimentAllocator {
  /**
   * Determine which variant a request should use
   */
  async allocateVariant(
    experimentId: string,
    userId?: string
  ): Promise<ExperimentVariant> {
    const experiment = await db.experiment.findUnique({
      where: { id: experimentId },
      include: { variants: true },
    })

    if (!experiment || experiment.status !== 'RUNNING') {
      throw new Error('Experiment not running')
    }

    // 解析流量分配
    const allocation = JSON.parse(experiment.trafficAllocation)

    // 确定性分配（同一用户总是得到相同的变体）
    if (userId) {
      return this.deterministicAllocation(experiment.variants, allocation, userId)
    }

    // 随机分配
    return this.randomAllocation(experiment.variants, allocation)
  }

  private deterministicAllocation(
    variants: ExperimentVariant[],
    allocation: Record<string, number>,
    userId: string
  ): ExperimentVariant {
    // 使用 userId 的 hash 确定变体
    const hash = this.hashUserId(userId)
    const random = hash % 100

    let cumulative = 0
    for (let i = 0; i < variants.length; i++) {
      const weight = allocation[`variant_${i}`] || 0
      cumulative += weight

      if (random < cumulative) {
        return variants[i]!
      }
    }

    return variants[0]!
  }

  private randomAllocation(
    variants: ExperimentVariant[],
    allocation: Record<string, number>
  ): ExperimentVariant {
    const random = Math.random() * 100

    let cumulative = 0
    for (let i = 0; i < variants.length; i++) {
      const weight = allocation[`variant_${i}`] || 0
      cumulative += weight

      if (random < cumulative) {
        return variants[i]!
      }
    }

    return variants[0]!
  }

  private hashUserId(userId: string): number {
    // 简单 hash 函数
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash)
  }
}
```

**集成到生成流程:**
```typescript
// src/app/api/external/generation/route.ts

export async function POST(request: Request) {
  const body = await request.json()

  // 检查是否有活跃实验
  const activeExperiment = await findActiveExperimentForModel(
    body.modelIdentifier
  )

  let variantConfig = null
  let experimentId = null
  let variantId = null

  if (activeExperiment) {
    // 分配变体
    const allocator = new ExperimentAllocator()
    const variant = await allocator.allocateVariant(
      activeExperiment.id,
      getUserId(request)  // 从认证信息获取
    )

    // 使用变体配置覆盖请求
    variantConfig = {
      modelIdentifier: variant.modelIdentifier,
      parameters: JSON.parse(variant.parameters),
    }

    experimentId = activeExperiment.id
    variantId = variant.id
  }

  // 创建 GenerationRequest（包含实验信息）
  const generationRequest = await db.generationRequest.create({
    data: {
      modelIdentifier: variantConfig?.modelIdentifier || body.modelIdentifier,
      prompt: body.prompt,
      parameters: JSON.stringify(variantConfig?.parameters || body.parameters),
      experimentId,
      variantId,
      // ... other fields
    },
  })

  // ... rest of generation logic
}
```

**结果分析:**
```typescript
// src/lib/services/ab-testing/experiment-analyzer.ts

export class ExperimentAnalyzer {
  /**
   * Calculate experiment results
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentResults> {
    const experiment = await db.experiment.findUnique({
      where: { id: experimentId },
      include: {
        variants: {
          include: {
            requests: true,
          },
        },
        metrics: true,
      },
    })

    const results: ExperimentResults = {
      experimentId,
      variants: [],
      winner: null,
    }

    // 计算每个变体的指标
    for (const variant of experiment!.variants) {
      const stats = this.calculateVariantStats(variant)
      results.variants.push({
        variantId: variant.id,
        name: variant.name,
        stats,
      })
    }

    // 统计检验，确定获胜者
    results.winner = this.determineWinner(results.variants, experiment!.metrics)

    return results
  }

  private calculateVariantStats(variant: ExperimentVariant): VariantStats {
    const requests = variant.requests

    return {
      totalRequests: requests.length,
      successRate: (variant.successCount / requests.length) * 100,
      avgDuration: variant.totalDuration / requests.length,
      avgCost: variant.totalCost / requests.length,
      avgRating: variant.avgRating,
    }
  }

  private determineWinner(
    variants: VariantResult[],
    metrics: ExperimentMetric[]
  ): Winner | null {
    // 实现统计检验（如 t-test）
    // 计算置信度
    // 返回获胜者和推荐

    // 简化版本：比较主要指标
    const primaryMetric = metrics.find((m) => m.type === 'primary')
    if (!primaryMetric) return null

    // ... 实现统计检验逻辑 ...

    return {
      variantId: 'var_xyz',
      confidence: 95.5,
      recommendation: 'Variant A is significantly better',
    }
  }
}
```

**管理后台页面:**
```tsx
// src/app/admin/experiments/page.tsx

export default function ExperimentsPage() {
  return (
    <div>
      <h1>A/B Testing Experiments</h1>

      {/* 实验列表 */}
      <ExperimentList />

      {/* 创建实验按钮 */}
      <CreateExperimentButton />
    </div>
  )
}

// src/app/admin/experiments/[id]/page.tsx

export default function ExperimentDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <ExperimentHeader experimentId={params.id} />

      {/* 实时统计 */}
      <ExperimentStats experimentId={params.id} />

      {/* 变体对比图表 */}
      <VariantComparison experimentId={params.id} />

      {/* 控制按钮 */}
      <ExperimentControls experimentId={params.id} />
    </div>
  )
}
```

#### 高级特性

1. **多变量测试 (MVT)**
   - 同时测试多个变量（如 model + parameters + prompt）
   - 使用全因子设计或部分因子设计

2. **自适应实验**
   - 动态调整流量分配（Multi-Armed Bandit）
   - 自动暂停表现差的变体

3. **分段分析**
   - 按用户群体分析（新用户 vs 老用户）
   - 按时间段分析（工作日 vs 周末）

4. **成本跟踪**
   - 集成供应商计费 API
   - 实时计算 ROI

#### 实施建议
- **阶段 1 (3周):** 实现基础实验框架和分配逻辑
- **阶段 2 (2周):** 实现统计分析和结果展示
- **阶段 3 (2周):** 实现管理后台 UI
- **阶段 4 (2周):** 实现高级特性（多变量、自适应）

#### 成本估算
- 开发: 9 周
- 无额外基础设施成本
- 需要数据分析专业知识（统计检验）

---

## 🚀 实施路线图

### Phase 1: 基础优化 (2-3周)
优先级: P0-P1
- [x] 统一日志系统 (3天)
- [x] 抽取S3上传逻辑 (2天)
- [x] 标准化错误处理 (3天)
- [x] 参数验证增强 (2天)
- [x] 移除未使用代码 (1天)

### Phase 2: 架构优化 (3-4周)
优先级: P1
- [ ] 实现重试机制 (3天)
- [ ] 抽取轮询逻辑 (3天) - 如果不实施异步轮询服务
- [ ] 错误监控和告警 (5天)
- [ ] 健康检查端点 (2天)

### Phase 3: 异步化改造 (3-4周)
优先级: P0
- [ ] 实现异步轮询服务 (10天)
- [ ] 修改所有 adapter 适配异步模式 (5天)
- [ ] 测试和优化 (3天)

### Phase 4: 高级功能 (根据需求)
- [ ] 批量生成支持 (4-9周)
- [ ] 图像预处理 Pipeline (6周)
- [ ] A/B 测试框架 (9周)

---

## 📊 预期收益

### 代码质量
- 删除约 350 行重复代码
- 提高代码可维护性 40%
- 统一错误处理和日志

### 系统稳定性
- 错误率降低 60%（通过重试和错误处理）
- 99.5% 可用性（通过健康检查和监控）
- 平均故障恢复时间 < 5分钟

### 开发效率
- 新 adapter 开发时间减少 50%
- Bug 修复时间减少 40%
- 日志查找效率提升 80%

### 运营效率
- 实时监控和告警
- 自动化错误处理
- 减少人工干预 70%

---

## ⚠️ 风险和注意事项

1. **异步轮询服务风险**
   - 需要确保服务高可用
   - 任务恢复机制必须可靠
   - 建议先小规模试点

2. **日志系统迁移**
   - 逐步迁移，不要一次性改动所有代码
   - 保留原有 console.log 一段时间作为备份

3. **重试机制风险**
   - 可能导致重复计费（部分供应商）
   - 需要仔细判断哪些错误可重试

4. **测试覆盖**
   - 所有优化都需要充分测试
   - 建议编写集成测试

5. **向后兼容**
   - API 接口改动需要保持向后兼容
   - 考虑版本控制

---

## 📚 参考文档

- [Pino 日志库](https://github.com/pinojs/pino)
- [Sharp 图像处理](https://sharp.pixelplumbing.com/)
- [Zod 验证库](https://zod.dev/)
- [Prometheus 监控](https://prometheus.io/)
- [A/B Testing 最佳实践](https://www.optimizely.com/optimization-glossary/ab-testing/)
