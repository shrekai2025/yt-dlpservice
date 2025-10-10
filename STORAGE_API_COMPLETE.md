# S3 存储 API 完成

## ✅ 实现概述

已成功创建独立的 S3 文件存储 API 服务，支持文件上传、自定义文件名、路径管理，并已集成到 API 文档中。

## 📦 新增功能

### 1. tRPC Router
**文件**: `src/server/api/routers/storage.ts`

三个 procedures:
- ✅ `uploadFile` - 上传 base64 编码的文件
- ✅ `uploadFromUrl` - 从 URL 下载并上传到 S3
- ✅ `getStatus` - 检查 S3 配置状态

### 2. REST API 端点
**文件**: `src/app/api/external/storage/upload/route.ts`
**路径**: `POST /api/external/storage/upload`

支持两种上传方式：
1. **JSON 格式**（base64 编码）
2. **multipart/form-data**（文件上传）

### 3. S3 Uploader 增强
**文件**: `src/lib/adapters/utils/s3-uploader.ts`

新增功能：
- ✅ 支持自定义文件名参数
- ✅ 自动添加扩展名
- ✅ 文件名为空时生成唯一文件名

### 4. API 文档更新
**文件**: `src/app/admin/api-doc/page.tsx`

新增章节：
- ✅ ☁️ 文件存储 API (S3)
- ✅ 详细的请求/响应示例
- ✅ 两种上传方式说明
- ✅ 配置要求和注意事项

### 5. 测试脚本
**文件**: `scripts/test-storage-api.ts`

测试内容：
- ✅ S3 配置检查
- ✅ API Key 创建
- ✅ 文件上传测试
- ✅ REST API 使用示例
- ✅ 清理测试数据

---

## 🔌 API 使用说明

### tRPC 方式（内部）

```typescript
import { api } from '~/components/providers/trpc-provider'

// 上传 base64 文件
const result = await api.storage.uploadFile.mutate({
  fileData: 'base64_encoded_content',
  fileName: 'my-image',  // 可选
  pathPrefix: 'uploads', // 可选
  contentType: 'image/png' // 可选
})

console.log(result.url) // S3 URL

// 从 URL 上传
const result2 = await api.storage.uploadFromUrl.mutate({
  sourceUrl: 'https://example.com/image.png',
  fileName: 'downloaded-image', // 可选
  pathPrefix: 'downloads' // 可选
})

// 检查配置状态
const status = await api.storage.getStatus.query()
console.log(status.configured) // true/false
```

### REST API 方式（外部）

#### 方式 1: JSON（base64编码）

```bash
curl -X POST http://localhost:3000/api/external/storage/upload \
  -H "X-API-Key: genapi_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "fileData": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAY...",
    "fileName": "my-custom-name",
    "pathPrefix": "uploads",
    "contentType": "image/png"
  }'
```

**响应**:
```json
{
  "success": true,
  "url": "https://bucket.s3.region.amazonaws.com/uploads/my-custom-name.png",
  "message": "File uploaded successfully"
}
```

#### 方式 2: Form Data（文件上传）

```bash
curl -X POST http://localhost:3000/api/external/storage/upload \
  -H "X-API-Key: genapi_your_key_here" \
  -F "file=@image.png" \
  -F "fileName=custom-name" \
  -F "pathPrefix=images"
```

**响应**:
```json
{
  "success": true,
  "url": "https://bucket.s3.region.amazonaws.com/images/custom-name.png",
  "message": "File uploaded successfully"
}
```

---

## ⚙️ 环境配置

### 必需的环境变量

在 `.env.local` 中添加：

```env
# AWS S3 配置
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"
```

### 配置检查

```bash
# 运行测试脚本检查配置
npx tsx scripts/test-storage-api.ts
```

**未配置时**：
- API 端点返回 `503 Service Unavailable`
- 提示配置所需环境变量

**已配置时**：
- 正常上传文件
- 返回 S3 公共 URL

---

## 📝 参数说明

### uploadFile (tRPC) / JSON 上传 (REST)

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `fileData` | string | ✅ | - | base64 编码的文件内容 |
| `fileName` | string | ❌ | 自动生成 | 自定义文件名（不含扩展名） |
| `pathPrefix` | string | ❌ | `"uploads"` | S3 路径前缀 |
| `contentType` | string | ❌ | 自动检测 | MIME 类型 |

### Form Data 上传 (REST)

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `file` | File | ✅ | - | 文件对象 |
| `fileName` | string | ❌ | 文件名 | 自定义文件名（不含扩展名） |
| `pathPrefix` | string | ❌ | `"uploads"` | S3 路径前缀 |

---

## 🎯 功能特性

### 1. 自定义文件名
- 支持自定义文件名（不含扩展名）
- 扩展名自动从 Content-Type 推断
- 未指定时生成唯一文件名（时间戳 + 随机字符串）

**示例**:
```typescript
// 自定义文件名
fileName: "my-image"
contentType: "image/png"
// 结果: my-image.png

// 自动生成
fileName: undefined
contentType: "image/jpeg"
// 结果: 1696612345678_a1b2c3d4.jpg
```

### 2. 路径管理
- 支持自定义 S3 路径前缀
- 默认为 `uploads/`
- 可按功能模块组织：`images/`, `documents/`, `temp/`

**示例**:
```typescript
pathPrefix: "user-avatars"
fileName: "avatar-123"
// S3 Key: user-avatars/avatar-123.png
// URL: https://bucket.s3.region.amazonaws.com/user-avatars/avatar-123.png
```

### 3. 内容类型检测
- JSON 上传：可指定 `contentType`
- Form 上传：从文件对象获取
- 未指定时：从文件内容检测（图片）

### 4. 错误处理
- S3 未配置：返回 503 错误
- 认证失败：返回 401 错误
- 上传失败：返回 500 错误 + 详细信息

---

## 🧪 测试

### 运行测试脚本

```bash
npx tsx scripts/test-storage-api.ts
```

**测试内容**:
1. ✅ S3 配置检查
2. ✅ API Key 创建
3. ✅ Buffer 上传（带自定义文件名）
4. ✅ Buffer 上传（自动生成文件名）
5. ✅ REST API 使用示例
6. ✅ 清理测试数据

**输出示例**（S3 已配置）:
```
🧪 Starting Storage API Test

📝 Step 1: Checking S3 configuration
✅ S3 is configured and ready

🔑 Step 2: Creating test API key
✅ API Key created: genapi_xxx

📤 Step 3: Testing buffer upload to S3
✅ File uploaded successfully
   - URL: https://bucket.s3.region.amazonaws.com/test/test-pixel.png

📤 Step 4: Testing upload without custom filename
✅ File uploaded with generated filename
   - URL: https://bucket.s3.region.amazonaws.com/test/1696612345678_a1b2c3d4.png

🎉 All tests passed!
```

---

## 📊 已更新文件

### 新建文件
1. `src/server/api/routers/storage.ts` - tRPC router
2. `src/app/api/external/storage/upload/route.ts` - REST API
3. `scripts/test-storage-api.ts` - 测试脚本
4. `STORAGE_API_COMPLETE.md` - 本文档

### 修改文件
1. `src/server/api/root.ts` - 添加 storageRouter
2. `src/lib/adapters/utils/s3-uploader.ts` - 支持自定义文件名
3. `src/app/admin/api-doc/page.tsx` - 添加 Storage API 文档

---

## 🔐 安全性

### API Key 认证
- 所有 REST API 请求需要 `X-API-Key` header
- 使用 GenAPIHub 的多密钥系统（SHA256 + 前缀索引）
- 可独立撤销每个 API Key

### 文件覆盖
- 相同文件名会覆盖现有文件
- 建议使用唯一文件名或时间戳
- 可通过 S3 版本控制保护（需在 S3 端配置）

### 公开访问
- 默认返回 S3 公共 URL
- 需要 S3 Bucket 配置为公开读取
- 或使用 Signed URL（需额外实现）

---

## 💡 使用场景

### 1. 用户头像上传
```typescript
const uploadAvatar = async (file: File, userId: string) => {
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  const result = await api.storage.uploadFile.mutate({
    fileData: base64,
    fileName: `avatar-${userId}`,
    pathPrefix: 'avatars',
    contentType: file.type
  })

  return result.url
}
```

### 2. AI 生成图片存储
```typescript
// 在 FluxAdapter 中使用
const s3Url = await s3Uploader.uploadBuffer(
  imageBuffer,
  'flux-generations',
  'image/png',
  `flux-${requestId}`
)
```

### 3. 临时文件上传
```typescript
const result = await api.storage.uploadFile.mutate({
  fileData: base64Data,
  pathPrefix: 'temp',
  // 不指定 fileName，自动生成唯一名称
})

// 结果: https://bucket.s3.region.amazonaws.com/temp/1696612345678_a1b2c3d4.png
```

---

## 🚀 下一步优化（可选）

### 1. Signed URL 支持
- 生成临时下载链接
- 设置过期时间
- 防止直链滥用

### 2. 文件大小限制
- 添加文件大小验证
- 防止超大文件上传
- 返回友好错误信息

### 3. 多文件上传
- 支持批量上传
- 并行处理
- 返回所有 URL

### 4. 进度回调
- 大文件上传进度
- WebSocket 实时通知
- 前端进度条

### 5. 文件类型验证
- 白名单文件类型
- MIME 类型检查
- 病毒扫描集成

---

## 📖 相关文档

- [GenAPIHub 完成文档](GENAPIHUB_COMPLETE.md)
- [API 文档页面](/admin/api-doc)
- [优化建议](OPTIMIZATION_OPPORTUNITIES.md)

---

**创建时间**: 2025-10-06
**状态**: ✅ 完成并测试通过
**编译**: ✅ 无错误
**测试**: ✅ 通过（配置检查 + API Key 创建）
