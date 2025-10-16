# S3服务快速参考

## ✅ 修复完成

**问题**：`Module not found: Can't resolve '~/lib/adapters/utils/s3-uploader'`

**解决**：将S3服务从AI生成模块移到通用服务目录

---

## 📁 服务架构

### 1. AWS S3（通用服务）

**位置**：`~/lib/services/s3-uploader.ts`

**用途**：
- ✅ AI生成结果存储
- ✅ 通用文件上传
- ✅ 存储管理

**导入方式**：
```typescript
import { s3Uploader } from '~/lib/services/s3-uploader'
```

**环境变量**：
```bash
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-southeast-1"
AWS_S3_BUCKET="your-bucket-name"
```

### 2. 火山引擎TOS（豆包专用）

**位置**：`~/lib/services/doubao-small-stt.ts`（内置）

**用途**：
- ✅ 仅供豆包STT使用
- ❌ 不给AI生成使用
- ❌ 不给其他功能使用

**环境变量**：
```bash
TOS_ACCESS_KEY_ID="your-tos-key"
TOS_SECRET_ACCESS_KEY="your-tos-secret"
TOS_REGION="ap-southeast-1"
TOS_BUCKET_NAME="stt-small-01"
TOS_ENDPOINT="tos-ap-southeast-1.volces.com"
```

---

## 🔧 使用方法

### AI生成使用S3

```typescript
// 在result-storage-service.ts中
import { s3Uploader } from '~/lib/services/s3-uploader'

// 上传到AWS S3
const s3Url = await s3Uploader.uploadBuffer(
  buffer,
  pathPrefix,    // 例如: 'ai-generation'
  contentType,   // 例如: 'image/png'
  customFilename // 例如: 'generated-image'
)
```

### 通用存储API

```typescript
// 在storage.ts路由中
import { s3Uploader } from '~/lib/services/s3-uploader'

// 检查配置
if (!s3Uploader.isConfigured()) {
  throw new Error('S3 not configured')
}

// 上传文件
const url = await s3Uploader.uploadBuffer(buffer, 'uploads', 'image/png')
```

### 存储管理

```typescript
// 在storage-admin.ts中
import { s3Uploader } from '~/lib/services/s3-uploader'

// 删除S3文件
await s3Uploader.deleteFile(s3Key)
```

---

## 📝 重要规则

### ✅ 正确做法

1. **AI生成使用AWS S3**
   ```typescript
   import { s3Uploader } from '~/lib/services/s3-uploader'
   ```

2. **豆包STT使用火山TOS**
   ```typescript
   // 只在doubao-small-stt.ts内部使用TosClient
   ```

3. **通用文件上传使用AWS S3**
   ```typescript
   import { s3Uploader } from '~/lib/services/s3-uploader'
   ```

### ❌ 错误做法

1. **不要在AI生成中使用TOS**
   ```typescript
   ❌ import { uploadToVolcS3 } from '~/lib/upload/volc-s3'
   ```

2. **不要使用旧路径**
   ```typescript
   ❌ import { s3Uploader } from '~/lib/adapters/utils/s3-uploader'
   ❌ import { s3Uploader } from '~/lib/ai-generation/adapters/utils/s3-uploader'
   ```

3. **不要在其他功能使用TOS**
   ```typescript
   ❌ 只有豆包STT可以使用火山引擎TOS
   ```

---

## 🧪 测试

### 构建测试
```bash
npm run build
✅ 构建成功
```

### S3配置检查
```typescript
console.log(s3Uploader.isConfigured()) // true/false
```

### API测试
```bash
# 测试存储API
npm run test:storage-api
```

---

## 📊 文件变更清单

### 新增
- ✅ `src/lib/services/s3-uploader.ts`

### 删除
- ❌ `src/lib/ai-generation/adapters/utils/s3-uploader.ts`
- ❌ `src/app/admin/ai-generation/unigen-ui/page.tsx`

### 更新
- ✅ `src/server/api/routers/storage.ts`
- ✅ `src/app/api/external/storage/upload/route.ts`
- ✅ `src/server/api/routers/storage-admin.ts`
- ✅ `src/lib/ai-generation/services/result-storage-service.ts`
- ✅ `src/lib/services/health-checker.ts`
- ✅ `scripts/test-storage-api.ts`
- ✅ `src/app/admin/ai-generation/tasks/[id]/page.tsx`

---

## 🎯 总结

**核心原则**：
1. **AWS S3** = 通用服务（AI生成、存储API等）
2. **火山TOS** = 豆包专用（仅STT功能）
3. **业务解耦** = S3服务独立于AI生成模块

