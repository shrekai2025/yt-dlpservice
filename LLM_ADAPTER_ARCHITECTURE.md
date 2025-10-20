# LLM 适配器架构

## 问题背景

不同的 LLM 供应商的 API 格式完全不同：
- **OpenAI Chat Completions API**: system 在 messages 数组中，返回 `choices[0].message.content`
- **Claude Messages API**: system 是独立字段，返回 `content[0].text`

需要一个解耦的架构来支持多种 API 格式。

## 解决方案

### 1. 数据库层

在 `LLMEndpoint` 模型中添加 `type` 字段来标识 API 类型：

```prisma
model LLMEndpoint {
  id          String      @id @default(cuid())
  providerId  String
  name        String
  url         String
  type        String      @default("openai") // openai, claude, etc.
  description String?
  isActive    Boolean     @default(true)
  sortOrder   Int         @default(0)
  ...
}
```

### 2. 适配器模式

创建适配器接口和具体实现：

#### 基础接口 (`base-adapter.ts`)

```typescript
export interface LLMAdapter {
  sendMessage(params: {
    apiUrl: string
    apiKey: string
    model: string
    messages: Message[]
    systemInstruction?: string
    temperature?: number
  }): Promise<LLMResponse>
}
```

#### OpenAI 适配器 (`openai-adapter.ts`)

```typescript
export class OpenAIAdapter implements LLMAdapter {
  async sendMessage(params) {
    // system 放在 messages 数组中
    const apiMessages = []
    if (systemInstruction) {
      apiMessages.push({ role: 'system', content: systemInstruction })
    }
    apiMessages.push(...messages)

    // 调用 OpenAI API
    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: apiMessages })
    })

    // 解析响应
    const data = await response.json()
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    }
  }
}
```

#### Claude 适配器 (`claude-adapter.ts`)

```typescript
export class ClaudeAdapter implements LLMAdapter {
  async sendMessage(params) {
    // system 是独立字段
    const apiMessages = messages.filter(m => m.role !== 'system')

    // 调用 Claude API
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        system: systemInstruction,
        max_tokens: 4096
      })
    })

    // 解析响应
    const data = await response.json()
    return {
      content: data.content.find(c => c.type === 'text')?.text,
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens
      }
    }
  }
}
```

#### 适配器工厂 (`adapter-factory.ts`)

```typescript
export class LLMAdapterFactory {
  static createAdapter(endpointType: string): LLMAdapter {
    switch (endpointType) {
      case 'openai':
        return new OpenAIAdapter()
      case 'claude':
        return new ClaudeAdapter()
      default:
        throw new Error(`不支持的 endpoint 类型: ${endpointType}`)
    }
  }
}
```

### 3. 使用方式

在 `chatRouter.sendMessage` 中：

```typescript
// 从数据库加载 endpoint（包含 type 字段）
const endpoint = await ctx.db.lLMEndpoint.findFirst({
  where: { /* ... */ }
})

// 根据 type 创建适配器
const adapter = LLMAdapterFactory.createAdapter(endpoint.type)

// 调用适配器
const llmResponse = await adapter.sendMessage({
  apiUrl: endpoint.url,
  apiKey: dbProvider.apiKey,
  model,
  messages,
  systemInstruction,
  temperature: 0.7,
})

// 统一的返回格式
const content = llmResponse.content
const usage = llmResponse.usage
```

## 文件结构

```
src/server/services/llm/
├── base-adapter.ts          # 基础接口定义
├── openai-adapter.ts        # OpenAI API 适配器
├── claude-adapter.ts        # Claude API 适配器
└── adapter-factory.ts       # 适配器工厂
```

## 当前配置的 Endpoints

### Tuzi 供应商

1. **Chat Completions** (type: `openai`)
   - URL: `https://api.tu-zi.com/v1/chat/completions`
   - 模型: `gemini-2.5-pro`, `gpt-5`

2. **Messages** (type: `claude`)
   - URL: `https://api.tu-zi.com/v1/messages`
   - 模型: `claude-sonnet-4-5-thinking-all`

## 优势

### 1. **解耦合**
- 每个 API 类型的实现完全独立
- 添加新的 API 类型只需新增适配器，无需修改现有代码

### 2. **可扩展**
- 轻松支持更多 API 格式（如 Gemini、LLaMA 等）
- 只需实现 `LLMAdapter` 接口

### 3. **统一接口**
- 所有 LLM 调用使用相同的接口
- 前端无需关心具体的 API 格式

### 4. **类型安全**
- TypeScript 接口确保类型安全
- 编译时检查错误

## 如何添加新的 API 类型

### 1. 创建新的适配器

```typescript
// src/server/services/llm/gemini-adapter.ts
export class GeminiAdapter implements LLMAdapter {
  async sendMessage(params) {
    // 实现 Gemini API 调用逻辑
  }
}
```

### 2. 在工厂中注册

```typescript
// src/server/services/llm/adapter-factory.ts
static createAdapter(endpointType: string): LLMAdapter {
  switch (endpointType) {
    case 'openai':
      return new OpenAIAdapter()
    case 'claude':
      return new ClaudeAdapter()
    case 'gemini':  // 新增
      return new GeminiAdapter()
    default:
      throw new Error(`不支持的 endpoint 类型: ${endpointType}`)
  }
}
```

### 3. 在数据库中创建 Endpoint

```typescript
// prisma/seed-llm-providers.ts
await prisma.lLMEndpoint.create({
  data: {
    providerId: provider.id,
    name: 'Gemini API',
    url: 'https://api.google.com/v1/generate',
    type: 'gemini',  // 指定 type
    isActive: true,
  },
})
```

## 测试建议

1. 在 Studio 的"目标确定"页面选择不同的模型
2. 测试 OpenAI 类型的模型（gemini-2.5-pro, gpt-5）
3. 测试 Claude 类型的模型（claude-sonnet-4-5-thinking-all）
4. 验证生成的内容正确返回

## 总结

通过适配器模式，我们实现了：
- ✅ 支持多种 LLM API 格式
- ✅ 完全解耦的架构
- ✅ 易于扩展新的 API 类型
- ✅ 统一的调用接口
- ✅ 类型安全

**实现时间**: 2025-10-19
**状态**: ✅ 完成并测试
