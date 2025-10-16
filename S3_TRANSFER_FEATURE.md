# S3转存功能使用文档

## 功能概述

S3转存功能允许在媒体文件下载并压缩完成后，自动将文件转存到AWS S3存储桶。这是一个**可选功能**，默认不启用，不影响正常的下载和转录流程。

## 特性

✅ **可选启用** - 通过`transferToS3`参数控制
✅ **并行处理** - 转存过程不阻塞主流程（下载、压缩、转录）
✅ **独立状态** - 转存有自己的状态字段，不影响任务主状态
✅ **详细进度** - 显示转存进度或失败原因
✅ **智能文件选择** - 优先转存视频文件，如无视频则转存音频
✅ **友好文件名** - 使用任务ID和标题生成S3文件名
✅ **按平台分类** - 自动按平台分类存储（media/youtube、media/twitter等）

## 配置要求

### 环境变量

需要在`.env`或`.env.local`中配置AWS S3相关环境变量：

```bash
# AWS S3配置
AWS_ACCESS_KEY_ID="your_access_key_id"
AWS_SECRET_ACCESS_KEY="your_secret_access_key"
AWS_REGION="ap-northeast-1"  # 东京区域
AWS_S3_BUCKET="your-bucket-name"
```

### AWS S3权限

IAM用户需要以下S3权限：
- `s3:PutObject` - 上传文件
- `s3:DeleteObject` - 删除文件（可选，用于清理）

### S3桶配置

建议配置：
- 启用版本控制（可选）
- 设置生命周期策略自动归档或删除旧文件
- 配置CORS（如需前端直接访问）
- 启用服务器端加密（AES-256或KMS）

## API使用

### 创建任务时启用S3转存

**请求示例：**

```bash
curl -X POST http://localhost:3000/api/external/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "url": "https://twitter.com/user/status/123456",
    "downloadType": "VIDEO_ONLY",
    "transferToS3": true
  }'
```

**参数说明：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| url | string | ✅ | - | 媒体URL |
| downloadType | enum | ❌ | AUDIO_ONLY | 下载类型 |
| compressionPreset | enum | ❌ | none | 压缩预设 |
| sttProvider | enum | ❌ | 全局配置 | STT服务提供商 |
| **transferToS3** | **boolean** | **❌** | **false** | **是否转存到S3** |

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "clx123abc",
    "url": "https://twitter.com/user/status/123456",
    "platform": "twitter",
    "downloadType": "VIDEO_ONLY",
    "status": "PENDING",
    "s3TransferStatus": "pending",
    "s3TransferProgress": "等待任务完成后转存",
    "s3Url": null,
    "createdAt": "2025-10-15T10:00:00.000Z",
    "updatedAt": "2025-10-15T10:00:00.000Z"
  }
}
```

## 转存状态说明

### s3TransferStatus 字段值

| 状态 | 说明 |
|------|------|
| `none` | 未启用S3转存（默认） |
| `pending` | 等待任务完成后转存 |
| `uploading` | 正在上传到S3 |
| `completed` | 转存成功 |
| `failed` | 转存失败 |

### s3TransferProgress 字段

- 显示当前转存进度信息
- 失败时显示具体错误原因
- 示例：
  - `"未启用"` - 未开启转存
  - `"等待任务完成后转存"` - 等待中
  - `"正在上传到S3..."` - 上传中
  - `"转存成功"` - 成功
  - `"转存失败: S3未配置"` - 失败原因

### s3Url 字段

转存成功后，包含完整的S3 URL：

```
https://your-bucket.s3.ap-northeast-1.amazonaws.com/media/twitter/clx123abc_tweet_title.mp4
```

### s3TransferredAt 字段

转存完成的时间戳（ISO 8601格式）

## 工作流程

```
1. 创建任务 (transferToS3=true)
   ↓
2. s3TransferStatus = "pending"
   ↓
3. 下载媒体文件
   ↓
4. 压缩音频（如启用）
   ↓
5. 音频转录
   ↓
6. 任务状态 = "COMPLETED"
   ↓
7. 【并行】S3转存开始
   ↓ (异步执行，不阻塞)
   s3TransferStatus = "uploading"
   ↓
8. 上传到S3
   ↓
9. s3TransferStatus = "completed"
   s3Url = "https://..."
   s3TransferredAt = "2025-10-15T10:05:00.000Z"
```

## 查询任务状态

### 查询单个任务

```bash
curl http://localhost:3000/api/external/tasks/clx123abc \
  -H "X-API-Key: your_api_key"
```

**响应示例（转存完成）：**

```json
{
  "success": true,
  "data": {
    "id": "clx123abc",
    "status": "COMPLETED",
    "s3TransferStatus": "completed",
    "s3TransferProgress": "转存成功",
    "s3Url": "https://your-bucket.s3.ap-northeast-1.amazonaws.com/media/twitter/clx123abc_tweet_title.mp4",
    "s3TransferredAt": "2025-10-15T10:05:00.000Z",
    "transcription": "转录文本内容...",
    // ... 其他字段
  }
}
```

### 查询任务列表

```bash
curl "http://localhost:3000/api/external/tasks?limit=20" \
  -H "X-API-Key: your_api_key"
```

## 错误处理

### 常见错误及解决方案

#### 1. "S3未配置"

**原因**: 未设置AWS环境变量

**解决方案**:
```bash
# 在 .env.local 中添加
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="ap-northeast-1"
AWS_S3_BUCKET="your-bucket"
```

#### 2. "文件不存在"

**原因**:
- 文件已被清理
- 下载失败导致无文件

**解决方案**:
- 检查任务状态是否为COMPLETED
- 查看任务的errorMessage字段
- 调整文件清理策略（MAX_FILE_AGE_HOURS）

#### 3. "权限不足"

**原因**: AWS IAM权限不足

**解决方案**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```

#### 4. "文件路径为空"

**原因**: 下载时未生成文件

**解决方案**:
- 检查downloadType配置
- 查看下载日志确认是否成功
- 确认平台支持该内容类型

## 最佳实践

### 1. 成本优化

```bash
# 仅对重要内容启用S3转存
# 音频文件较小，可以不转存
{
  "url": "...",
  "downloadType": "VIDEO_ONLY",
  "transferToS3": true  // 只转存视频
}
```

### 2. 生命周期管理

在S3桶配置生命周期规则：

```json
{
  "Rules": [
    {
      "Id": "ArchiveOldMedia",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"  // 30天后转为低频访问
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"  // 90天后归档
        }
      ],
      "Expiration": {
        "Days": 365  // 365天后删除
      }
    }
  ]
}
```

### 3. 监控转存状态

```bash
# 查询待转存任务
curl "http://localhost:3000/api/external/tasks?s3TransferStatus=pending" \
  -H "X-API-Key: your_api_key"

# 查询转存失败的任务
curl "http://localhost:3000/api/external/tasks?s3TransferStatus=failed" \
  -H "X-API-Key: your_api_key"
```

### 4. 批量转存

如需批量处理历史任务：

```typescript
// 使用 s3TransferService
import { s3TransferService } from '~/lib/services/s3-transfer'

// 批量转存最多10个待处理任务
await s3TransferService.batchTransfer(10)
```

## 数据库字段

### Task 表新增字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| s3Url | String? | null | S3存储URL |
| s3TransferStatus | String? | "none" | 转存状态 |
| s3TransferProgress | String? | null | 转存进度或错误信息 |
| s3TransferredAt | DateTime? | null | 转存完成时间 |

## 示例场景

### 场景1: 下载Twitter视频并转存

```bash
curl -X POST http://localhost:3000/api/external/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "url": "https://twitter.com/user/status/123456",
    "downloadType": "VIDEO_ONLY",
    "transferToS3": true
  }'
```

**预期结果**:
1. 下载视频 → 2. 提取音频 → 3. 转录 → 4. 任务完成 → 5. 异步转存到S3

### 场景2: 仅转录不转存

```bash
curl -X POST http://localhost:3000/api/external/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "url": "https://youtube.com/watch?v=xxx",
    "downloadType": "AUDIO_ONLY"
    // 不传 transferToS3 或设为 false
  }'
```

**预期结果**:
- s3TransferStatus = "none"
- s3TransferProgress = "未启用"
- 不会上传到S3

## 技术细节

### 并行处理原理

```typescript
// TaskProcessor 在任务完成后调用
await this.handleS3Transfer(taskId)

// handleS3Transfer 使用异步方式
s3TransferService.transferToS3Async(taskId, filePath)
// ↓ 内部使用 setImmediate
setImmediate(async () => {
  await this.transferToS3(taskId, filePath)
})
```

这确保：
- S3转存不阻塞主流程
- 转录完成后用户立即收到响应
- S3转存在后台继续进行

### 文件名生成规则

```
格式: {taskId}_{sanitized_title}.{ext}
示例: clx123abc_How_to_use_Twitter_API.mp4

存储路径: media/{platform}/{filename}
完整URL: https://bucket.s3.region.amazonaws.com/media/twitter/clx123abc_title.mp4
```

## 故障排查

### 检查S3配置

```bash
# 查看日志
pm2 logs yt-dlpservice | grep -i "s3"

# 应该看到
# "AWS S3 uploader initialized from environment variables"
```

### 手动触发转存

```typescript
import { s3TransferService } from '~/lib/services/s3-transfer'

// 对指定任务手动触发转存
await s3TransferService.transferToS3('taskId', '/path/to/file.mp4')
```

### 查看S3上传日志

```bash
pm2 logs yt-dlpservice --lines 100 | grep "S3转存"
```

## 更新日志

- **2025-10-15**: 新增S3转存功能
  - 实现可选的S3转存
  - 支持并行处理不阻塞主流程
  - 添加详细的转存状态跟踪
  - 智能文件选择和命名

## 相关链接

- [AWS S3 文档](https://docs.aws.amazon.com/s3/)
- [Prisma Schema](prisma/schema.prisma)
- [S3 Transfer Service](src/lib/services/s3-transfer.ts)
- [S3 Uploader Service](src/lib/services/s3-uploader.ts)
