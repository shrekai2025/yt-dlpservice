# 供应商系统架构说明

## 概述

系统中存在**两套独立的供应商系统**，分别服务于不同的功能模块：

1. **图像/视频能力供应商** - 用于AI内容生成（图像、视频）
2. **语言能力供应商（LLM）** - 用于文本对话和脚本生成

## 系统对比

| 特性 | 图像能力供应商 | 语言能力供应商 |
|-----|--------------|--------------|
| **数据库表** | `AIProvider`, `AIModel` | `ChatProvider` |
| **API Router** | `ai-generation.ts` | `llm-providers.ts`, `chat.ts` |
| **输出类型** | IMAGE, VIDEO, AUDIO | TEXT (对话、脚本) |
| **典型供应商** | KIE Midjourney, RunwayML, Luma AI | DeepSeek, OpenAI, Anthropic |
| **主要用途** | Studio镜头生成、AI图像/视频任务 | 对话、脚本生成、目标确定 |
| **管理页面** | `/admin/ai-generation/providers` | `/admin/ai-generation/providers`（语言tab） |

## 详细架构

### 1. 图像能力供应商系统

#### 数据模型

```prisma
// 供应商
model AIProvider {
  id           String      @id @default(cuid())
  name         String
  slug         String      @unique
  platformId   String?
  apiEndpoint  String?
  apiKey       String?
  uploadToS3   Boolean     @default(false)
  s3PathPrefix String?
  isActive     Boolean     @default(true)
  models       AIModel[]
}

// 模型
model AIModel {
  id                 String             @id @default(cuid())
  name               String
  slug               String             @unique
  providerId         String
  outputType         String             // IMAGE, VIDEO, AUDIO
  adapterName        String
  isActive           Boolean            @default(true)
  tasks              AIGenerationTask[]
  studioFrames       StudioFrame[]      // 关联到Studio镜头帧
  provider           AIProvider         @relation(...)
}
```

#### API接口

**Router**: `src/server/api/routers/ai-generation.ts`

主要接口：
- `listProviders()` - 列出所有图像能力供应商
- `listModels({ outputType, isActive })` - 列出模型（可按输出类型过滤）
- `updateProviderApiKey()` - 更新供应商API Key
- `updateModelStatus()` - 启用/禁用模型
- `generate()` - 创建AI生成任务

#### 使用场景

1. **Studio镜头制作**
   ```typescript
   // ShotsTab.tsx
   const { data: imageModels } = api.aiGeneration.listModels.useQuery({
     outputType: 'IMAGE',
     isActive: true,
   })

   generateFrameMutation.mutate({
     shotId: shot.id,
     modelId: selectedModelId,  // AIModel.id
     prompt: fullPrompt,
   })
   ```

2. **AI生成任务页面**
   - `/admin/ai-generation` - 创建图像/视频生成任务
   - `/admin/ai-generation/tasks` - 查看任务历史

3. **供应商管理**
   - `/admin/ai-generation/providers` - "图像能力"tab
   - 配置API Key
   - 启用/禁用模型

### 2. 语言能力供应商系统

#### 数据模型

```prisma
model ChatProvider {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  apiEndpoint  String?
  apiKey       String?
  defaultModel String?
  models       String?  // JSON数组
  isActive     Boolean  @default(true)
}
```

#### API接口

**Router**: `src/server/api/routers/llm-providers.ts`, `chat.ts`

主要接口：
- `listProviders({ isActive })` - 列出语言能力供应商
- `updateProviderApiKey()` - 更新供应商API Key
- `updateModelStatus()` - 启用/禁用模型
- `sendMessage()` - 发送对话消息（chat.ts）

#### 使用场景

1. **Studio目标确定**
   ```typescript
   // ObjectiveTab.tsx
   const { data: providers } = api.chat.listProviders.useQuery()

   generateMutation.mutate({
     provider: selectedProvider,
     model: selectedModel,
     message: rawInput,
     systemInstruction: systemPrompt,
   })
   ```

2. **AI对话功能**
   - `/admin/ai-chat` - AI对话界面
   - 使用LLM进行多轮对话

3. **供应商管理**
   - `/admin/ai-generation/providers` - "语言能力"tab
   - 配置API Key
   - 管理模型列表

## 为什么需要两套系统？

### 设计考虑

1. **功能分离**
   - 图像生成和文本生成是完全不同的能力
   - 需要不同的参数和配置
   - 有不同的计费方式

2. **数据结构差异**
   - 图像模型：需要复杂的adapter配置、输入输出能力定义
   - 语言模型：相对简单，主要是模型名称和端点

3. **任务管理**
   - 图像任务：有复杂的异步处理流程（AIGenerationTask）
   - 语言任务：通常是同步的对话请求

4. **历史原因**
   - 系统先实现了图像生成功能（AIProvider/AIModel）
   - 后来添加了LLM功能（ChatProvider）
   - 保持了独立架构以避免破坏现有功能

## 集成点

两套系统在Studio工作流中协同工作：

```
┌─────────────────────────────────────────────┐
│          Studio Episode 工作流               │
├─────────────────────────────────────────────┤
│                                             │
│  1. 原始输入 Tab                             │
│     └─ 填写素材                              │
│                                             │
│  2. 目标确定 Tab  【使用语言能力供应商】      │
│     ├─ 选择LLM Provider (ChatProvider)      │
│     ├─ 选择模型                              │
│     ├─ 生成脚本JSON                          │
│     └─ 自动提取角色                          │
│                                             │
│  3. 背景设定 Tab                             │
│     └─ 管理角色库                            │
│                                             │
│  4. 镜头制作 Tab  【使用图像能力供应商】      │
│     ├─ 从目标同步镜头                        │
│     ├─ 选择图像模型 (AIModel)               │
│     ├─ 生成首帧                              │
│     └─ 生成动画                              │
│                                             │
└─────────────────────────────────────────────┘
```

## 未来优化建议

虽然当前架构运行良好，但可以考虑以下优化：

### 选项1：保持独立（推荐）
- **优点**：职责清晰，互不干扰
- **适用场景**：两类功能继续独立发展

### 选项2：统一抽象层
创建统一的Provider接口，底层实现分离：
```typescript
interface IProvider {
  id: string
  name: string
  type: 'IMAGE' | 'VIDEO' | 'LANGUAGE'
  getModels(): Promise<Model[]>
  execute(params): Promise<Result>
}
```

### 选项3：迁移到单一表结构
将ChatProvider迁移到AIProvider系统：
- 添加outputType: 'TEXT'
- 统一管理界面
- 需要较大的重构工作

## 常见问题

### Q1: 为什么镜头制作的模型列表和供应商页面不一样？
**A**: 它们使用的是**同一个系统**！
- 镜头制作使用：`api.aiGeneration.listModels({ outputType: 'IMAGE' })`
- 供应商页面图像tab使用：`api.aiGeneration.listProviders({})`

它们都来自AIProvider/AIModel系统，只是查询的维度不同。

### Q2: 能在镜头制作中使用语言能力供应商吗？
**A**: 不能。语言能力供应商（ChatProvider）只能生成文本，不能生成图像。镜头制作需要的是图像模型（AIModel）。

### Q3: 如何添加新的图像供应商？
**A**:
1. 在数据库中添加AIProvider记录
2. 创建对应的adapter（如`kie-midjourney-adapter.ts`）
3. 添加AIModel记录
4. 在供应商管理页面配置API Key

### Q4: 如何添加新的语言供应商？
**A**:
1. 在数据库中添加ChatProvider记录
2. 配置API端点和模型列表
3. 在供应商管理页面配置API Key

## 相关文件

### 图像能力供应商
- 数据模型：`prisma/schema.prisma` (AIProvider, AIModel)
- API Router：`src/server/api/routers/ai-generation.ts`
- 服务层：`src/server/services/ai/`
- UI：`src/app/admin/ai-generation/providers/page.tsx`

### 语言能力供应商
- 数据模型：`prisma/schema.prisma` (ChatProvider)
- API Router：`src/server/api/routers/llm-providers.ts`, `chat.ts`
- UI：`src/app/admin/ai-generation/providers/page.tsx`

### Studio集成
- 目标确定：`src/components/studio/ObjectiveTab.tsx` (使用ChatProvider)
- 镜头制作：`src/components/studio/ShotsTab.tsx` (使用AIModel)
- 后端：`src/server/api/routers/studio.ts`
