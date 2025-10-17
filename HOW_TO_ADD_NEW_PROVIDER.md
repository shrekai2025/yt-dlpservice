# 如何在远程服务器添加新的 AI 供应商

本文档说明如何在远程服务器上添加新的 AI 供应商和模型。

## 方法一：通过数据库直接添加（推荐用于生产环境）

### 1. 连接到服务器数据库

```bash
# SSH 到服务器
ssh user@your-server.com

# 进入项目目录
cd /path/to/yt-dlpservice

# 连接到 SQLite 数据库
sqlite3 prisma/dev.db
```

### 2. 添加平台（可选，如果是第三方平台）

```sql
INSERT INTO ai_platforms (id, name, slug, description, website, createdAt, updatedAt)
VALUES (
  'clxxxxxxxxxxxxx',  -- 生成一个 cuid
  'Platform Name',
  'platform-slug',
  'Platform description',
  'https://platform.com',
  datetime('now'),
  datetime('now')
);
```

### 3. 添加供应商

```sql
INSERT INTO ai_providers (
  id,
  name,
  slug,
  description,
  platformId,  -- 如果是官方供应商则为 NULL
  apiEndpoint,
  apiKey,      -- 可以为 NULL，之后通过后台设置
  uploadToS3,
  s3PathPrefix,
  isActive,
  sortOrder,
  createdAt,
  updatedAt
)
VALUES (
  'clxxxxxxxxxxxxx',  -- 生成一个 cuid
  'New Provider Name',
  'new-provider-slug',
  'Provider description',
  NULL,  -- 或者平台 ID
  'https://api.provider.com',
  NULL,  -- 稍后通过管理后台设置
  0,     -- 是否自动上传到 S3
  NULL,  -- S3 路径前缀
  1,     -- 启用状态
  10,    -- 排序顺序
  datetime('now'),
  datetime('now')
);
```

### 4. 添加模型

```sql
INSERT INTO ai_models (
  id,
  name,
  slug,
  description,
  providerId,
  outputType,
  adapterName,
  inputCapabilities,
  outputCapabilities,
  featureTags,
  functionTags,
  pricingInfo,
  usageCount,
  isActive,
  sortOrder,
  createdAt,
  updatedAt
)
VALUES (
  'clxxxxxxxxxxxxx',  -- 生成一个 cuid
  'Model Name',
  'provider-model-name',
  'Model description',
  'clxxxxxxxxxxxxx',  -- 供应商 ID
  'IMAGE',            -- 或 VIDEO, AUDIO
  'YourCustomAdapter',
  '["text-input"]',
  '["image-output"]',
  '["high-quality"]',
  '["text-to-image"]',
  'Pricing info text',
  0,
  1,
  1,
  datetime('now'),
  datetime('now')
);
```

### 5. 退出数据库

```sql
.exit
```

## 方法二：使用 Seed 脚本（推荐用于开发环境）

### 1. 编辑 Seed 文件

在服务器上编辑 `prisma/seed-ai-generation.ts` 文件，添加新的供应商和模型：

```typescript
// 添加新平台（如需要）
const newPlatform = await prisma.aIPlatform.upsert({
  where: { slug: 'new-platform' },
  update: {},
  create: {
    name: 'New Platform',
    slug: 'new-platform',
    description: 'Platform description',
    website: 'https://platform.com',
  },
})

// 添加新供应商
const newProvider = await prisma.aIProvider.upsert({
  where: { slug: 'new-provider' },
  update: {},
  create: {
    name: 'New Provider',
    slug: 'new-provider',
    description: 'Provider description',
    platformId: newPlatform.id, // 如果是官方供应商，设为 null
    apiEndpoint: 'https://api.provider.com',
    isActive: true,
    sortOrder: 10,
  },
})

// 添加新模型
await prisma.aIModel.upsert({
  where: { slug: 'new-provider-model' },
  update: {},
  create: {
    name: 'Model Name',
    slug: 'new-provider-model',
    description: 'Model description',
    providerId: newProvider.id,
    outputType: 'IMAGE',
    adapterName: 'YourCustomAdapter',
    inputCapabilities: JSON.stringify(['text-input']),
    outputCapabilities: JSON.stringify(['image-output']),
    featureTags: JSON.stringify(['high-quality']),
    functionTags: JSON.stringify(['text-to-image']),
    pricingInfo: 'Pricing details',
    isActive: true,
    sortOrder: 1,
  },
})
```

### 2. 运行 Seed 脚本

```bash
# 在服务器上执行
cd /path/to/yt-dlpservice
npm run db:seed
```

## 方法三：通过管理后台设置 API Key

添加供应商后，需要设置 API Key：

### 1. 访问管理后台

访问 `https://your-domain.com/admin/ai-generation/providers`

### 2. 设置 API Key

1. 找到新添加的供应商
2. 点击「设置 API Key」或「修改 API Key」
3. 输入 API Key
4. 点击「保存」

### 3. 通过环境变量设置（推荐）

也可以在服务器上通过环境变量设置：

```bash
# 编辑 .env 文件
nano .env

# 添加环境变量（格式：AI_PROVIDER_{SLUG}_API_KEY）
AI_PROVIDER_NEW_PROVIDER_API_KEY=your-api-key-here

# 重启服务
pm2 restart yt-dlpservice
```

## 创建适配器（如果是新的 API）

如果新供应商使用的是全新的 API，需要创建适配器：

### 1. 创建适配器文件

在 `src/lib/ai-generation/adapters/{provider}/` 目录下创建新文件：

```typescript
// src/lib/ai-generation/adapters/new-provider/new-provider-adapter.ts

import { BaseAdapter } from '../base-adapter'
import type { GenerationRequest, GenerationResult } from '../types'

export class NewProviderAdapter extends BaseAdapter {
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    // 实现生成逻辑
    const response = await this.callProviderAPI(request)

    return {
      taskId: response.taskId,
      status: 'processing',
      results: [],
    }
  }

  async pollStatus(taskId: string): Promise<GenerationResult> {
    // 实现轮询逻辑
    const response = await this.checkTaskStatus(taskId)

    return {
      taskId,
      status: response.status === 'completed' ? 'completed' : 'processing',
      results: response.results,
    }
  }

  private async callProviderAPI(request: GenerationRequest) {
    // 调用供应商 API
  }

  private async checkTaskStatus(taskId: string) {
    // 检查任务状态
  }
}
```

### 2. 注册适配器

在 `src/lib/ai-generation/adapters/adapter-factory.ts` 中注册：

```typescript
import { NewProviderAdapter } from './new-provider/new-provider-adapter'

export function createAdapter(modelConfig: ModelConfig) {
  switch (modelConfig.adapterName) {
    case 'NewProviderAdapter':
      return new NewProviderAdapter(modelConfig)
    // ... 其他适配器
    default:
      throw new Error(`Unknown adapter: ${modelConfig.adapterName}`)
  }
}
```

### 3. 部署到服务器

```bash
# 在本地开发完成后
git add .
git commit -m "Add new provider adapter"
git push origin main

# 在服务器上拉取代码
cd /path/to/yt-dlpservice
git pull origin main
npm install
npm run build
pm2 restart yt-dlpservice
```

## 验证供应商是否正常工作

### 1. 检查供应商列表

```bash
# 在服务器上
sqlite3 prisma/dev.db "SELECT * FROM ai_providers WHERE slug='new-provider';"
```

### 2. 测试 API 连接

访问 `https://your-domain.com/admin/ai-generation/providers` 查看供应商状态

### 3. 创建测试任务

在前端页面选择新模型，创建一个测试任务，确认是否能正常生成内容

## 常见问题

### Q: 如何生成 cuid？

可以使用在线工具或：

```javascript
// Node.js
const { createId } = require('@paralleldrive/cuid2')
console.log(createId())
```

或者使用任意字符串，确保唯一即可。

### Q: 供应商添加后不显示？

1. 检查 `isActive` 字段是否为 1
2. 刷新页面缓存
3. 检查浏览器控制台是否有错误

### Q: API Key 设置后不生效？

1. 确认环境变量格式正确
2. 重启服务 `pm2 restart yt-dlpservice`
3. 检查数据库中 API Key 是否已保存

### Q: 模型无法使用？

1. 确认适配器已正确实现和注册
2. 检查 `adapterName` 是否与代码中一致
3. 查看服务器日志 `pm2 logs yt-dlpservice`

## 数据库架构参考

### 表关系

```
ai_platforms (平台)
    ↓ (platformId)
ai_providers (供应商)
    ↓ (providerId)
ai_models (模型)
    ↓ (modelId)
ai_generation_tasks (生成任务)
```

### 字段说明

**ai_providers 表：**
- `slug`: 唯一标识符，用于代码引用
- `apiEndpoint`: API 基础 URL
- `apiKey`: API 密钥（可选）
- `isActive`: 是否启用（1=启用，0=禁用）
- `sortOrder`: 排序顺序
- `uploadToS3`: 是否自动上传结果到 S3
- `s3PathPrefix`: S3 存储路径前缀

**ai_models 表：**
- `slug`: 唯一标识符
- `adapterName`: 适配器类名
- `outputType`: 输出类型（IMAGE, VIDEO, AUDIO）
- `inputCapabilities`: 输入能力（JSON 数组）
- `outputCapabilities`: 输出能力（JSON 数组）
- `featureTags`: 特性标签（JSON 数组）
- `functionTags`: 功能标签（JSON 数组）
- `pricingInfo`: 定价信息（文本）

## 相关文件

- 数据库模式：`prisma/schema.prisma`
- Seed 脚本：`prisma/seed-ai-generation.ts`
- 管理后台：`src/app/admin/ai-generation/providers/page.tsx`
- API 路由：`src/server/api/routers/ai-generation.ts`
- 适配器工厂：`src/lib/ai-generation/adapters/adapter-factory.ts`
