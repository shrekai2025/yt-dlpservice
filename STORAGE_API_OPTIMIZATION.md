# S3 Storage API 优化建议

## 1. 高优先级优化

### 1.1 文件大小限制
**问题**: 当前没有文件大小限制，可能导致内存溢出或S3费用过高
**建议**:
- 在 REST API 中添加请求体大小限制（建议 100MB）
- 在 tRPC 中添加 base64 字符串长度验证
- 返回清晰的错误信息

```typescript
// 在 route.ts 中添加
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
if (buffer.length > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: 'File too large', message: 'Maximum file size is 100MB' },
    { status: 413 }
  )
}
```

### 1.2 文件名安全性验证
**问题**: 自定义文件名可能包含危险字符（如 `../`, 特殊字符等）
**建议**: 添加文件名清理和验证

```typescript
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // 只保留字母、数字、下划线、连字符
    .substring(0, 100)  // 限制长度
}
```

### 1.3 S3 存储桶权限配置提示
**问题**: 用户可能配置了S3但权限不足，导致上传失败
**建议**:
- 在初始化时测试 S3 写权限
- 提供更详细的配置说明文档
- 在 503 错误中提供权限检查链接

### 1.4 扩展名检测改进
**问题**: `s3-uploader.ts:62` 使用简单的 split 可能不准确（如 `application/vnd.ms-excel`）
**建议**: 使用专业的 MIME type 库或映射表

```typescript
import mime from 'mime-types'

const extension = mime.extension(contentType) || 'bin'
```

### 1.5 API Key 速率限制
**问题**: 没有速率限制，可能被滥用
**建议**:
- 实现基于 API Key 的速率限制（如每分钟100次）
- 在数据库中记录使用次数和最后使用时间
- 返回 429 Too Many Requests 错误

## 2. 中优先级优化

### 2.1 重复文件检测
**问题**: 相同文件会被重复上传，浪费存储空间
**建议**:
- 计算文件 hash (MD5 或 SHA256)
- 在数据库中记录已上传文件的 hash
- 如果 hash 相同，直接返回已有 URL

### 2.2 上传进度反馈
**问题**: 大文件上传时无法获取进度
**建议**:
- 对于 tRPC，可以使用 WebSocket 或 SSE
- 对于 REST API，考虑分块上传

### 2.3 Content-Type 自动检测增强
**问题**: 仅依赖客户端提供的 Content-Type 不可靠
**建议**: 使用 `file-type` 库检测实际文件类型

```typescript
import { fileTypeFromBuffer } from 'file-type'

const detectedType = await fileTypeFromBuffer(buffer)
const contentType = detectedType?.mime || providedContentType || 'application/octet-stream'
```

### 2.4 错误日志改进
**问题**: S3 上传失败的错误信息可能不够详细
**建议**:
- 记录更多上下文（文件大小、类型、bucket、region）
- 使用结构化日志
- 区分不同类型的 S3 错误（权限、网络、配额）

### 2.5 Zod Schema 优化
**问题**: `fileData` 没有格式验证
**建议**:
```typescript
fileData: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Invalid base64 format')
```

### 2.6 pathPrefix 验证
**问题**: 可能包含危险路径
**建议**:
```typescript
pathPrefix: z.string()
  .regex(/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/, 'Invalid path prefix')
  .default('uploads')
```

## 3. 低优先级优化

### 3.1 缓存头设置
**问题**: S3 URL 没有设置缓存策略
**建议**: 在 PutObjectCommand 中添加 `CacheControl`

```typescript
CacheControl: 'public, max-age=31536000',  // 1年缓存
```

### 3.2 多区域支持
**问题**: 仅支持单个 S3 region
**建议**: 支持根据用户地理位置选择不同 region

### 3.3 CloudFront CDN 集成
**问题**: 直接返回 S3 URL，访问速度可能慢
**建议**:
- 配置 CloudFront 分发
- 返回 CDN URL 而非 S3 URL

### 3.4 图片优化
**问题**: 上传的图片没有优化
**建议**:
- 使用 sharp 库进行压缩和格式转换
- 自动生成多种尺寸（缩略图、中等、原图）

### 3.5 签名 URL 生成
**问题**: 返回的是公开 URL
**建议**:
- 提供生成预签名 URL 的选项
- 支持设置过期时间

```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const command = new GetObjectCommand({ Bucket, Key })
const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
```

### 3.6 批量上传支持
**问题**: 仅支持单文件上传
**建议**:
- 添加批量上传 endpoint
- 返回所有文件的 URL 列表

### 3.7 上传统计和监控
**问题**: 无法追踪上传使用情况
**建议**:
- 在数据库中记录每次上传（文件大小、类型、API Key、时间）
- 提供统计 API（总上传量、文件数、按时间分布）

### 3.8 文件元数据存储
**问题**: 没有记录上传的文件信息
**建议**:
- 创建 `UploadedFile` 表存储文件元数据
- 字段：id, url, filename, fileSize, contentType, apiKeyId, createdAt

### 3.9 HTTP/2 支持优化
**问题**: 可能未充分利用 HTTP/2 特性
**建议**: 确保 S3 客户端配置启用 HTTP/2

### 3.10 测试覆盖
**问题**: 缺少自动化测试
**建议**:
- 单元测试：文件名清理、扩展名检测
- 集成测试：mock S3 客户端测试上传流程
- E2E 测试：使用 LocalStack 模拟 S3

## 4. 安全性建议

### 4.1 CORS 配置检查
**建议**: 确保 S3 bucket 的 CORS 配置正确

### 4.2 病毒扫描
**建议**: 集成 ClamAV 或 AWS VirusScan 扫描上传文件

### 4.3 敏感信息检测
**建议**: 使用 AWS Macie 检测上传文件中的敏感数据

### 4.4 访问日志
**建议**: 启用 S3 访问日志，追踪文件访问

## 5. 性能优化

### 5.1 上传到 S3 使用流式传输
**问题**: 当前将整个 buffer 加载到内存
**建议**: 使用 stream 减少内存占用（对于大文件）

### 5.2 并发上传控制
**问题**: 多个大文件同时上传可能耗尽资源
**建议**: 使用队列系统（如 BullMQ）限制并发

### 5.3 预热连接
**建议**: 在服务启动时预热 S3 连接池

## 总结

**立即修复的问题**:
1. ✅ 已修复: API Key 查询使用 `findFirst` 而非 `findUnique`

**建议优先实现的优化**:
1. 文件大小限制（防止滥用）
2. 文件名安全性验证（安全性）
3. API Key 速率限制（防止滥用）
4. Content-Type 检测改进（可靠性）
5. 错误日志详细化（可维护性）

**总体评价**:
- ✅ 编译通过
- ✅ 类型安全
- ✅ 基础鉴权实现
- ✅ 错误处理基本覆盖
- ⚠️ 缺少使用限制和安全加固
- ⚠️ 缺少监控和统计
