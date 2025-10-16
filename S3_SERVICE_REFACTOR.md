# S3服务重构总结

## 问题描述

项目中S3服务路径混乱，导致模块找不到：
- 错误：`Module not found: Can't resolve '~/lib/adapters/utils/s3-uploader'`
- 原因：S3 uploader位于AI生成模块中，但被通用存储服务引用

## 解决方案

### 1. S3服务架构重新设计

**两个独立的S3服务：**

#### AWS S3服务（通用）
- **位置**：`~/lib/services/s3-uploader.ts`
- **用途**：通用对象存储服务
- **使用场景**：
  - AI生成结果存储
  - 通用文件上传API
  - 存储管理功能

#### 火山引擎TOS服务（专用）
- **位置**：`~/lib/services/doubao-small-stt.ts`（内置）
- **用途**：专门给豆包STT使用
- **使用场景**：
  - 豆包音频文件上传
  - 不对外提供通用服务

### 2. 文件变更

#### 新建文件
- ✅ `src/lib/services/s3-uploader.ts` - AWS S3通用上传服务

#### 删除文件
- ❌ `src/lib/ai-generation/adapters/utils/s3-uploader.ts` - 旧的AI生成模块S3服务
- ❌ `src/app/admin/ai-generation/unigen-ui/page.tsx` - 引用旧路径的页面

#### 更新文件
- ✅ `src/server/api/routers/storage.ts` - 更新导入路径
- ✅ `src/app/api/external/storage/upload/route.ts` - 更新导入路径
- ✅ `src/server/api/routers/storage-admin.ts` - 更新导入路径并实现S3删除功能
- ✅ `src/lib/ai-generation/services/result-storage-service.ts` - 使用AWS S3服务
- ✅ `src/lib/services/health-checker.ts` - 更新导入路径
- ✅ `scripts/test-storage-api.ts` - 更新导入路径
- ✅ `src/app/admin/ai-generation/tasks/[id]/page.tsx` - 修复JSX语法错误

### 3. 核心功能

#### AWS S3 Uploader (`~/lib/services/s3-uploader.ts`)

```typescript
// 主要功能
class S3Uploader {
  // 上传Buffer到S3
  async uploadBuffer(buffer: Buffer, pathPrefix: string, contentType?: string, customFilename?: string): Promise<string>
  
  // 从URL上传到S3
  async uploadFromUrl(url: string, pathPrefix: string, customFilename?: string): Promise<string>
  
  // 删除S3文件
  async deleteFile(s3Key: string): Promise<void>
  
  // 检查配置状态
  isConfigured(): boolean
}

// 自动初始化（从环境变量）
export const s3Uploader = new S3Uploader()
```

**环境变量配置：**
- `AWS_ACCESS_KEY_ID` - AWS访问密钥ID
- `AWS_SECRET_ACCESS_KEY` - AWS访问密钥
- `AWS_REGION` - AWS区域
- `AWS_S3_BUCKET` - S3存储桶名称

#### AI生成结果存储

```typescript
// AI生成使用AWS S3
import { s3Uploader } from '~/lib/services/s3-uploader'

// 上传生成结果到S3
const s3Url = await s3Uploader.uploadBuffer(
  buffer,
  pathPrefix,
  contentType,
  customFilename
)
```

### 4. 服务边界

#### AWS S3（通用）
- ✅ AI生成结果存储
- ✅ 通用文件上传
- ✅ 存储管理
- ✅ 可扩展给其他功能使用

#### 火山引擎TOS（专用）
- ✅ 豆包STT音频上传
- ❌ 不给AI生成使用
- ❌ 不给其他功能使用
- ⚠️ 仅在doubao-small-stt.ts中使用

## 使用指南

### 1. AI生成功能使用S3

```typescript
// 配置提供商时
{
  "uploadToS3": true,  // 启用S3上传
  "s3PathPrefix": "ai-generation"  // 可选的S3路径前缀
}

// 结果会自动上传到AWS S3
```

### 2. 通用存储API

```bash
# 上传文件（JSON格式）
curl -X POST http://localhost:3000/api/external/storage/upload \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "fileData": "base64-encoded-data",
    "fileName": "my-file",
    "pathPrefix": "uploads",
    "contentType": "image/png"
  }'

# 上传文件（FormData格式）
curl -X POST http://localhost:3000/api/external/storage/upload \
  -H "X-API-Key: your-api-key" \
  -F "file=@image.png" \
  -F "fileName=my-image"
```

### 3. 存储管理

```typescript
// tRPC API
import { api } from '~/components/providers/trpc-provider'

// 列出文件
const { data } = api.storageAdmin.listFiles.useQuery({ page: 1, pageSize: 50 })

// 删除记录和S3文件
await api.storageAdmin.deleteRecordAndFile.mutate({ id: fileId })
```

## 测试结果

✅ **构建成功**
- Next.js构建通过
- 无模块找不到错误
- TypeScript编译通过

✅ **功能验证**
- AWS S3服务正常初始化
- AI生成可使用S3存储
- 通用存储API正常工作
- 存储管理功能完善

## 注意事项

1. **AWS S3配置必需**：使用S3功能前必须配置AWS环境变量
2. **火山引擎TOS独立**：TOS专用于豆包STT，不要在其他地方使用
3. **路径规范**：统一使用 `~/lib/services/s3-uploader` 导入AWS S3服务
4. **错误处理**：S3上传失败会回退到原始URL，不影响业务

## 相关文档

- [AWS S3文档](https://docs.aws.amazon.com/s3/)
- [火山引擎TOS文档](https://www.volcengine.com/docs/6349/74841)
- [AI生成功能文档](./AI_GENERATION_README.md)
- [存储API文档](./doc/STORAGE_API_COMPLETE.md)

