# Veo 3.1 更新总结 (2025-10-21)

## 价格更正

根据Kie.ai官方文档,已更正Veo 3.1的定价信息:

### 原错误定价 ❌
- 5秒 720P: 12 Credits ($0.06)
- 5秒 1080P: 30 Credits ($0.15)
- 10秒 720P: 30 Credits ($0.15)

### 正确定价 ✅

#### Veo 3.1 主模型
- **Quality (veo3)**: 250 Credits ≈ $1.25 (支持 16:9 和 9:16)
- **Fast (veo3_fast)**: 60 Credits ≈ $0.30 (支持 16:9 和 9:16)
- **获取1080P视频**: +5 Credits ≈ $0.025 (仅16:9,每视频一次性)

#### Veo 3.1 Extend (新增)
- **视频扩展**: 60 Credits ≈ $0.30 (每次扩展)

---

## 新增功能: Veo 3.1 Extend

添加了视频扩展功能,允许基于已生成的Veo 3.1视频进行续写扩展。

### 实现内容

#### 1. 新增适配器
**文件**: `src/lib/ai-generation/adapters/kie/kie-veo3-1-extend-adapter.ts`

- 实现 `KieVeo31ExtendAdapter` 类
- 使用API端点: `POST /api/v1/veo/extend`
- 需要原视频的 `taskId` 作为参数
- 支持自定义种子、水印、回调URL

#### 2. 注册到工厂
**文件**: `src/lib/ai-generation/adapters/adapter-factory.ts`

- 导入 `KieVeo31ExtendAdapter`
- 注册到 `ADAPTER_REGISTRY`

#### 3. 模型参数配置
**文件**: `src/lib/ai-generation/config/model-parameters.ts`

新增 `kie-veo3-1-extend` 参数:
- `parentTaskId`: 原视频任务ID (必需)
- `seeds`: 随机种子 (可选, 10000-99999)
- `watermark`: 水印文字 (可选)
- `callBackUrl`: 回调URL (可选)

同时为主模型添加了 `model` 参数:
- `veo3`: Quality (250 Credits)
- `veo3_fast`: Fast (60 Credits, 默认)

#### 4. 定价配置
**文件**: `src/lib/ai-generation/config/pricing-info.ts`

- 更新 `kie-veo3-1` 主模型定价逻辑 (动态根据model参数)
- 新增 `kie-veo3-1-extend` 固定定价: 60 Credits ($0.30)

#### 5. 数据库模型
**文件**: `prisma/seed-ai-generation.ts`

更新主模型并新增扩展模型:

```typescript
// 更新主模型定价
{
  slug: 'kie-veo3-1',
  pricingInfo: 'Quality: 250 Credits ($1.25) | Fast: 60 Credits ($0.30) | 1080P: +5 Credits ($0.025)'
}

// 新增扩展模型
{
  slug: 'kie-veo3-1-extend',
  name: 'Veo 3.1 Extend',
  adapterName: 'KieVeo31ExtendAdapter',
  pricingInfo: '60 Credits ($0.30) 每次扩展',
  sortOrder: 15
}
```

已成功运行seed更新数据库 ✅

---

## API文档参考

### Extend Video API

**端点**: `POST https://api.kie.ai/api/v1/veo/extend`

**请求参数**:
```typescript
{
  taskId: string         // 必需: 原视频生成任务ID
  prompt: string         // 必需: 扩展内容描述
  seeds?: number         // 可选: 10000-99999
  watermark?: string     // 可选: 水印文字
  callBackUrl?: string   // 可选: 回调URL
}
```

**响应**:
```typescript
{
  code: 200,
  msg: "success",
  data: {
    taskId: string  // 扩展任务ID,用于状态查询
  }
}
```

**状态查询**: 使用与主模型相同的查询端点
- `GET /api/v1/veo/record-info?taskId={taskId}`

---

## 使用说明

### Veo 3.1 主模型使用

1. 选择模型版本 (Quality 或 Fast)
2. 输入提示词
3. 可选: 上传1-2张图片用于图生视频
4. 选择生成模式 (文生视频/首尾帧/参考图)
5. 配置其他参数 (比例、种子、水印等)
6. 生成视频

### Veo 3.1 Extend 使用

1. 获取原视频的 `taskId` (来自Veo 3.1生成任务)
2. 在 Extend 模型中填入 `parentTaskId`
3. 输入扩展提示词 (描述如何继续视频)
4. 可选: 配置种子、水印
5. 生成扩展视频

**注意**:
- 已升级为1080P的视频无法进行扩展
- 扩展将继承原视频的比例和基础设置

---

## 技术要点

### Quality vs Fast

- **Quality (veo3)**: 高质量,但费用较高 (250 Credits)
- **Fast (veo3_fast)**: 快速生成,性价比高 (60 Credits)
- **默认选择**: Fast (更经济实惠)

### 1080P 获取

- 仅16:9比例支持
- 需要额外API调用
- 费用: +5 Credits (一次性)
- 1080P后的视频不能扩展

### 扩展限制

- 必须基于Veo 3.1生成的视频
- 不支持1080P升级后的视频
- 继承原视频的基础设置

---

## 文件变更清单

### 新增文件
- ✅ `src/lib/ai-generation/adapters/kie/kie-veo3-1-extend-adapter.ts`
- ✅ `VEO31_UPDATE_SUMMARY.md` (本文档)

### 修改文件
- ✅ `src/lib/ai-generation/adapters/adapter-factory.ts`
- ✅ `src/lib/ai-generation/config/model-parameters.ts`
- ✅ `src/lib/ai-generation/config/pricing-info.ts`
- ✅ `prisma/seed-ai-generation.ts`
- ✅ `VEO31_IMPLEMENTATION.md`

### 数据库
- ✅ 更新 `kie-veo3-1` 模型定价信息
- ✅ 新增 `kie-veo3-1-extend` 模型记录

---

## 验证结果

- ✅ TypeScript 编译通过 (无veo3相关错误)
- ✅ 数据库seed成功执行
- ✅ 适配器工厂注册成功
- ✅ 参数配置完整
- ✅ 定价信息正确

---

## 下一步

系统现已准备就绪,可以:

1. 使用 Veo 3.1 Quality 或 Fast 模型生成视频
2. 使用 Veo 3.1 Extend 扩展已生成的视频
3. 根据需求选择合适的质量和价格平衡点

建议默认使用 **Fast** 模式以获得更好的性价比 (60 Credits vs 250 Credits)。
