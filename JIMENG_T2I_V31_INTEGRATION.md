# 即梦 AI 文生图 3.1 集成文档

## 概述

成功集成了即梦 AI 文生图 3.1 模型到 AI 生成服务中。该模型是即梦同源的文生图能力升级版本，重点实现画面效果呈现升级，在画面美感塑造、风格精准多样及画面细节丰富度方面提升显著，同时兼具文字响应效果。

## 实现内容

### 1. 核心适配器 (Adapter)

**文件**: [src/lib/ai-generation/adapters/jimeng/jimeng-text-to-image-v31-adapter.ts](src/lib/ai-generation/adapters/jimeng/jimeng-text-to-image-v31-adapter.ts)

#### 主要功能
- ✅ 异步任务提交与查询机制
- ✅ 火山引擎签名认证（支持多种凭证配置方式）
- ✅ 完整的错误处理和重试机制
- ✅ 支持自定义图像尺寸（512-2048像素）
- ✅ 文本扩写功能（use_pre_llm）
- ✅ 随机种子控制

#### 认证方式
支持以下4种凭证配置方式（按优先级）：

1. **数据库专用字段**（推荐）
   - `apiKeyId`: 火山引擎 Access Key ID
   - `apiKeySecret`: 火山引擎 Secret Access Key

2. **环境变量**
   ```bash
   AI_PROVIDER_JIMENG_ACCESS_KEY_ID=your_access_key_id
   AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY=your_secret_access_key
   ```

3. **apiKey 字段 - JSON 格式**
   ```json
   {"accessKeyId":"xxx","secretAccessKey":"xxx"}
   ```

4. **apiKey 字段 - 冒号分隔格式**
   ```
   accessKeyId:secretAccessKey
   ```

#### API 工作流程

1. **提交任务** (CVSync2AsyncSubmitTask)
   ```typescript
   POST https://visual.volcengineapi.com/
   Query: Action=CVSync2AsyncSubmitTask&Version=2022-08-31
   Body: {
     req_key: "jimeng_t2i_v31",
     prompt: "千军万马",
     use_pre_llm: true,
     seed: -1,
     width: 1328,
     height: 1328
   }
   Response: { task_id: "7392616336519610409" }
   ```

2. **查询结果** (CVSync2AsyncGetResult)
   ```typescript
   POST https://visual.volcengineapi.com/
   Query: Action=CVSync2AsyncGetResult&Version=2022-08-31
   Body: {
     req_key: "jimeng_t2i_v31",
     task_id: "7392616336519610409",
     req_json: '{"return_url":true}'
   }
   Response: {
     data: {
       status: "done",
       image_urls: ["https://..."],
       binary_data_base64: null
     }
   }
   ```

#### 任务状态
- `in_queue`: 任务已提交
- `generating`: 任务处理中
- `done`: 处理完成
- `not_found`: 任务未找到
- `expired`: 任务已过期（12小时）

### 2. 模型参数配置

**文件**: [src/lib/ai-generation/config/model-parameters.ts](src/lib/ai-generation/config/model-parameters.ts:2033-2087)

#### 配置的参数

1. **图片宽度** (width)
   - 类型: number
   - 范围: 512-2048 像素
   - 默认值: 1328

2. **图片高度** (height)
   - 类型: number
   - 范围: 512-2048 像素
   - 默认值: 1328

3. **尺寸预设** (size_preset)
   - 类型: select
   - 默认值: '1328x1328'
   - 可选项:
     - 标清1K: 1328×1328 (1:1), 1472×1104 (4:3), 1584×1056 (3:2), 1664×936 (16:9), 2016×864 (21:9)
     - 高清2K: 2048×2048 (1:1), 2304×1728 (4:3), 2496×1664 (3:2), 2560×1440 (16:9), 3024×1296 (21:9)

4. **开启文本扩写** (use_pre_llm)
   - 类型: boolean
   - 默认值: true
   - 说明: 较短提示词建议开启，较长提示词建议关闭

5. **随机种子** (seed)
   - 类型: number
   - 范围: -1 到 2147483647
   - 默认值: -1（随机）
   - 说明: 相同种子+相同参数可生成相似图片

### 3. 定价配置

**文件**: [src/lib/ai-generation/config/pricing-info.ts](src/lib/ai-generation/config/pricing-info.ts:468-493)

#### 定价规则
- 标清1K (≤1328×1328): 约 $0.012/张
- 高清2K (≤2048×2048): 约 $0.020/张
- 超出2K范围: 约 $0.025/张

定价根据图片面积（宽×高）动态计算，显示格式：
```
约 $0.012/张 (1328x1328, 标清1K)
约 $0.020/张 (2048x2048, 高清2K)
```

### 4. 适配器工厂注册

**文件**: [src/lib/ai-generation/adapters/adapter-factory.ts](src/lib/ai-generation/adapters/adapter-factory.ts)

已将 `JimengTextToImageV31Adapter` 注册到适配器工厂中。

### 5. 数据库模型注册

**文件**: [scripts/seed-all-ai-providers.ts](scripts/seed-all-ai-providers.ts:62)

模型信息：
```typescript
{
  provider: '即梦AI',
  platform: '即梦',
  slug: 'jimeng',
  modelId: 'jimeng-text-to-image-v31',
  name: 'Jimeng 3.1 文生图',
  adapterName: 'JimengTextToImageV31Adapter',
  type: 'IMAGE',
  description: '文生图3.1（画面效果升级，在美感塑造、风格精准多样及画面细节丰富度方面显著提升）'
}
```

## 错误处理

### 可重试错误
以下错误码会被标记为可重试：
- `50511`: 输出图片后审核未通过
- `50429`: QPS超限
- `50430`: 并发超限

### 不可重试错误
- `50411`: 输入图片前审核未通过
- `50412`: 输入文本前审核未通过
- `50413`: 输入文本含敏感词、版权词等
- `50500`: 内部错误
- `50501`: 内部算法错误

## API 限制

- **宽高比**: 1:3 到 3:1 之间
- **尺寸范围**: 宽度和高度都在 [512, 2048] 像素之间
- **提示词长度**: 建议 ≤120 字符，最长不超过 800 字符
- **任务过期时间**: 12 小时
- **图片链接有效期**: 24 小时

## 使用示例

### 基础文生图
```typescript
const request: GenerationRequest = {
  prompt: "千军万马",
  parameters: {
    width: 1328,
    height: 1328,
    use_pre_llm: true,
    seed: -1
  }
}

// 提交任务
const response = await adapter.dispatch(request);
// response.status === 'PROCESSING'
// response.providerTaskId === "7392616336519610409"

// 查询结果
const result = await adapter.query(response.providerTaskId);
// result.status === 'SUCCESS'
// result.results[0].url === "https://..."
```

### 使用预设尺寸
```typescript
const request: GenerationRequest = {
  prompt: "美丽的日落",
  parameters: {
    size_preset: "2048x2048",  // 高清2K 1:1
    use_pre_llm: true,
    seed: 12345  // 固定种子
  }
}
```

### 长提示词（关闭扩写）
```typescript
const request: GenerationRequest = {
  prompt: "一幅细致入微的油画，描绘了黄昏时分的港口，渔船归来，海鸥盘旋，夕阳余晖洒在海面上...",
  parameters: {
    width: 2560,
    height: 1440,  // 16:9 高清
    use_pre_llm: false,  // 长提示词关闭扩写
    seed: -1
  }
}
```

## 测试

### 构建验证
```bash
npm run build
# ✓ Compiled successfully
```

### 数据库种子
```bash
npm run db:seed
# ✓ Models created
# ✅ Seed completed!
```

## 文件清单

1. **核心适配器**: `src/lib/ai-generation/adapters/jimeng/jimeng-text-to-image-v31-adapter.ts`
2. **模型参数配置**: `src/lib/ai-generation/config/model-parameters.ts` (行 2033-2087)
3. **定价配置**: `src/lib/ai-generation/config/pricing-info.ts` (行 468-493)
4. **适配器工厂**: `src/lib/ai-generation/adapters/adapter-factory.ts` (行 58, 124)
5. **数据库种子**: `scripts/seed-all-ai-providers.ts` (行 62)
6. **集成文档**: `JIMENG_T2I_V31_INTEGRATION.md`

## 相关文档

- [火山引擎即梦AI官方文档](https://www.volcengine.com/docs/visual/)
- [即梦AI 4.0集成文档](JIMENG_AI_INTEGRATION.md)
- [AI生成系统架构文档](AI_GENERATION_ARCHITECTURE.md)

## 更新日志

### 2025-01-26
- ✅ 创建 JimengTextToImageV31Adapter 适配器
- ✅ 添加模型参数配置（支持尺寸预设、文本扩写、随机种子）
- ✅ 添加定价信息配置（根据分辨率动态计算）
- ✅ 在适配器工厂中注册新适配器
- ✅ 在数据库种子中添加模型记录
- ✅ 构建验证通过
- ✅ 创建集成文档

## 使模型在界面上显示

已执行数据库迁移，将模型添加到数据库中：

```bash
# 执行 SQL 迁移
sqlite3 data/app.db < prisma/migrations/add_jimeng_t2i_v31_model.sql

# 验证模型已添加
sqlite3 data/app.db "SELECT slug, name FROM ai_models WHERE slug LIKE '%jimeng%';"
```

**重启开发服务器**以使更改生效：

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

模型将出现在 AI 生成界面的模型选择下拉列表中，显示为：
- **即梦AI - 文生图3.1**

## 下一步

1. ~~**前端集成**: 在 Studio 界面中添加即梦 3.1 模型选项~~ ✅ 已完成
2. **测试**: 进行端到端测试，验证完整工作流程
3. **监控**: 添加日志和监控，跟踪模型使用情况
4. **优化**: 根据使用情况优化参数和定价

## 注意事项

⚠️ **重要提示**:
- 确保已配置火山引擎凭证（Access Key ID 和 Secret Access Key）
- 图片链接仅24小时有效，需要及时保存
- 任务12小时后过期，无法再查询结果
- 宽高比必须在 1:3 到 3:1 之间，否则可能出图异常
- 提示词过长（>800字符）可能导致生成失败

---

**集成完成** ✅
