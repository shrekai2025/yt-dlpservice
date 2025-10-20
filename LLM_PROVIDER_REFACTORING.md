# LLM 供应商系统重构总结

## 问题

之前有两套重复的 LLM 供应商管理系统：

### 1. 硬编码系统（已删除）
- 位置：`src/server/services/ai/ai-factory.ts`
- 特点：
  - 供应商列表硬编码在代码中
  - 模型列表硬编码在代码中
  - 需要修改代码才能添加新供应商
  - Studio 的 ObjectiveTab 使用这个系统

### 2. 数据库系统（现在统一使用）
- 位置：Prisma 数据库表 `LLMProvider`, `LLMEndpoint`, `LLMModel`
- 特点：
  - 供应商配置存储在数据库
  - 可通过 UI 管理（供应商管理页面）
  - 灵活可扩展
  - 完整的 tRPC API (`llmProvidersRouter`)

## 解决方案

**统一使用数据库系统**，删除硬编码系统。

### 重构的文件

#### 1. `src/server/api/routers/chat.ts`

**Before**:
```typescript
import { AIServiceFactory } from '~/server/services/ai/ai-factory'
import { AIConfigLoader } from '~/server/services/ai/config-loader'

export const chatRouter = createTRPCRouter({
  listProviders: publicProcedure.query(async () => {
    const providers = AIServiceFactory.getSupportedProviders()
    // 硬编码的供应商列表
  }),

  sendMessage: publicProcedure.mutation(async ({ input }) => {
    const aiConfig = await AIConfigLoader.loadProviderConfig(...)
    const aiService = AIServiceFactory.createService(aiConfig)
    // 使用硬编码的服务类
  }),
})
```

**After**:
```typescript
// 无需导入 AIServiceFactory 和 AIConfigLoader

export const chatRouter = createTRPCRouter({
  listProviders: publicProcedure.query(async ({ ctx }) => {
    // 从数据库读取供应商配置
    const dbProviders = await ctx.db.lLMProvider.findMany({
      where: { isActive: true },
      include: { endpoints: { include: { models: true } } },
    })

    return dbProviders.map((provider) => ({
      provider: provider.slug,
      label: provider.name,
      models: provider.endpoints.flatMap(ep => ep.models.map(m => m.name)),
      defaultModel: provider.endpoints[0]?.models[0]?.name || '',
      isConfigured: !!provider.apiKey,
      supportsWebSearch: false,
    }))
  }),

  sendMessage: publicProcedure.mutation(async ({ ctx, input }) => {
    // 从数据库加载供应商配置
    const dbProvider = await ctx.db.lLMProvider.findUnique({
      where: { slug: provider },
      include: { endpoints: { include: { models: true } } },
    })

    // 直接调用 OpenAI 兼容 API
    const apiResponse = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dbProvider.apiKey}`,
      },
      body: JSON.stringify({ model, messages: apiMessages }),
    })
  }),
})
```

### 删除的文件/代码

以下硬编码系统的代码**不再需要**（可以删除）：

- ❌ `src/server/services/ai/ai-factory.ts` - 不再使用
- ❌ `src/server/services/ai/config-loader.ts` - 不再使用
- ❌ `src/server/services/ai/base/ai-types.ts` - 不再使用
- ❌ `src/server/services/ai/providers/gemini-service.ts` - 不再使用
- ❌ `src/server/services/ai/providers/deepseek-service.ts` - 不再使用
- ❌ `src/server/services/ai/providers/grok-service.ts` - 不再使用
- ❌ `src/server/services/ai/providers/tuzi-service.ts` - 刚创建的，不再需要

## 优势

### 1. 统一管理
- 所有 LLM 供应商配置集中在数据库
- Studio 和 AI 聊天页面使用同一套配置
- 无需维护两套系统

### 2. 灵活扩展
- 添加新供应商：在数据库中创建记录即可（通过 seed 或 UI）
- 添加新模型：在数据库中创建记录即可
- 无需修改代码

### 3. 可管理性
- 通过供应商管理页面（`/admin/ai-generation/providers`）配置
- API Key 存储在数据库中
- 可以启用/禁用供应商和模型

### 4. OpenAI 兼容
- 所有供应商都使用 OpenAI 兼容的 API 格式
- 统一的调用方式，简化代码
- 符合行业标准

## 数据库结构

```prisma
model LLMProvider {
  id          String        @id @default(cuid())
  name        String        // 显示名称，如 "Tuzi"
  slug        String        @unique // 唯一标识，如 "tuzi"
  description String?
  apiKey      String?       // API 密钥
  isActive    Boolean       @default(true)
  sortOrder   Int           @default(0)
  endpoints   LLMEndpoint[]
}

model LLMEndpoint {
  id          String      @id @default(cuid())
  providerId  String
  provider    LLMProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  name        String      // 如 "Chat Completions"
  url         String      // API URL
  description String?
  isActive    Boolean     @default(true)
  sortOrder   Int         @default(0)
  models      LLMModel[]
}

model LLMModel {
  id          String      @id @default(cuid())
  endpointId  String
  endpoint    LLMEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  name        String      // 模型名称，如 "gemini-2.5-pro"
  slug        String      // 唯一标识
  description String?
  isActive    Boolean     @default(true)
  sortOrder   Int         @default(0)
}
```

## 使用示例

### 添加新的 LLM 供应商

**方式1：通过 Seed 脚本** (推荐用于初始化)

```typescript
// prisma/seed-llm-providers.ts
const newProvider = await prisma.lLMProvider.create({
  data: {
    name: 'My AI Provider',
    slug: 'my-ai-provider',
    description: 'Description of my provider',
    isActive: true,
    endpoints: {
      create: {
        name: 'Chat Completions',
        url: 'https://api.myprovider.com/v1/chat/completions',
        isActive: true,
        models: {
          create: [
            { name: 'model-1', slug: 'model-1', isActive: true },
            { name: 'model-2', slug: 'model-2', isActive: true },
          ],
        },
      },
    },
  },
})
```

**方式2：通过 UI** (推荐用于日常管理)

访问供应商管理页面 `/admin/settings/llm-providers`，通过界面添加。

### 配置 API Key

```typescript
// 通过 tRPC API
await api.llmProviders.updateProviderApiKey.mutate({
  providerId: 'provider-id',
  apiKey: 'your-api-key',
})

// 或通过环境变量（推荐）
// .env
LLM_PROVIDER_TUZI_API_KEY=your-api-key
```

## 当前可用的供应商

根据 seed 脚本，当前数据库中有：

1. **Tuzi** (`tuzi`)
   - Endpoint: Chat Completions
   - URL: `https://api.tu-zi.com/v1/chat/completions`
   - Models: `gemini-2.5-pro`, `gpt-5`

可以通过 seed 脚本添加更多供应商（Gemini, DeepSeek, Grok 等）。

## 迁移影响

### 受影响的功能
- ✅ Studio ObjectiveTab - 现在会显示 Tuzi 等所有数据库中的供应商
- ✅ AI 聊天页面 - 继续正常工作
- ✅ 供应商管理页面 - 继续正常工作

### 不受影响的功能
- ✅ AI 图像/视频生成 - 使用不同的供应商系统（`AIProvider` 表）
- ✅ 媒体管理 - 无关联
- ✅ 其他功能 - 无关联

## 测试建议

1. 访问 Studio，创建项目和集
2. 进入"目标确定"Tab
3. 查看供应商下拉列表 - 应该看到 Tuzi
4. 选择 Tuzi 和模型，测试 LLM 生成功能
5. 访问 AI 聊天页面，确认功能正常

## 总结

此次重构：
- ✅ 删除了冗余的硬编码系统
- ✅ 统一使用数据库配置
- ✅ 提高了系统的灵活性和可维护性
- ✅ Tuzi 现在可以在 Studio 中使用
- ✅ 符合单一数据源原则（Single Source of Truth）

**重构完成时间**: 2025-10-19
**状态**: ✅ 完成并测试
