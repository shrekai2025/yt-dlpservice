# Sora Watermark Remover 集成文档

## 概述

成功为 AI 生成服务添加了 Kie.ai 的 Sora Watermark Remover 模型支持。

## 功能说明

- **模型名称**: Sora Watermark Remover
- **模型 Slug**: `kie-sora-watermark-remover`
- **功能**: 移除 Sora 2 视频水印
- **定价**: 10 Credits ($0.05) per use
- **输出类型**: VIDEO

## 集成内容

### 1. 适配器实现

**文件**: `src/lib/ai-generation/adapters/kie/kie-sora-watermark-remover-adapter.ts`

- 继承自 `BaseAdapter`
- 实现 `dispatch()` 方法：创建水印移除任务
- 实现 `checkTaskStatus()` 方法：查询任务状态
- 支持以下功能：
  - 验证 video_url 参数（必须以 https://sora.chatgpt.com/ 开头）
  - 可选的回调通知 URL (callBackUrl)
  - 任务状态轮询（waiting → success/fail）
  - 错误处理和重试逻辑

### 2. 适配器注册

**文件**: `src/lib/ai-generation/adapters/adapter-factory.ts`

- 导入 `KieSoraWatermarkRemoverAdapter`
- 注册到 `ADAPTER_REGISTRY`

### 3. 定价配置

**文件**: `src/lib/ai-generation/config/pricing-info.ts`

```typescript
'kie-sora-watermark-remover': '10 Credits ≈ $0.05'
```

### 4. 参数配置

**文件**: `src/lib/ai-generation/config/model-parameters.ts`

配置了两个参数：

1. **video_url** (必填)
   - 类型: string
   - 说明: 输入 Sora 2 视频的公开链接
   - 验证: 必须以 sora.chatgpt.com 开头
   - 示例: `https://sora.chatgpt.com/p/s_xxxxx`

2. **callBackUrl** (可选)
   - 类型: string
   - 说明: 任务完成时系统将向此 URL 发送 POST 请求通知
   - 示例: `https://your-domain.com/api/callback`

### 5. 数据库种子

**文件**: `prisma/seed-ai-generation.ts`

添加了模型定义：

```typescript
{
  name: 'Sora Watermark Remover',
  slug: 'kie-sora-watermark-remover',
  description: 'Sora 2 视频水印移除工具（通过Kie.ai）',
  providerId: kieProvider.id,
  outputType: 'VIDEO',
  adapterName: 'KieSoraWatermarkRemoverAdapter',
  inputCapabilities: ['url-input'],
  outputCapabilities: ['video-output'],
  featureTags: ['watermark-removal', 'video-processing', 'sora'],
  functionTags: ['video-processing', 'watermark-removal'],
  pricingInfo: '10 Credits ($0.05)',
  isActive: true,
  sortOrder: 14,
}
```

## API 使用说明

### 请求参数

```json
{
  "model": "sora-watermark-remover",
  "input": {
    "video_url": "https://sora.chatgpt.com/p/s_68e83bd7eee88191be79d2ba7158516f"
  },
  "callBackUrl": "https://your-domain.com/api/callback" // 可选
}
```

### 响应格式

#### 创建任务响应

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "281e5b0*********************f39b9"
  }
}
```

#### 查询任务状态响应

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "281e5b0*********************f39b9",
    "model": "sora-watermark-remover",
    "state": "success",
    "resultJson": "{\"resultUrls\":[\"https://file.aiquickdraw.com/custom-page/akr/section-images/1760183775820t7ja5v5r.mp4\"]}",
    "costTime": 15000,
    "completeTime": 1757584179490,
    "createTime": 1757584164490
  }
}
```

## 任务状态

- `waiting`: 等待处理
- `success`: 处理成功，可从 `resultJson.resultUrls` 获取结果视频
- `fail`: 处理失败，错误信息在 `failMsg`

## 部署步骤

1. 运行数据库迁移（如需要）:
   ```bash
   npx prisma migrate dev
   ```

2. 运行数据库种子:
   ```bash
   npx prisma db seed
   ```

3. 重启应用服务

## 测试建议

1. 测试基本功能：使用有效的 Sora 2 视频 URL
2. 测试参数验证：使用无效的 URL（不以 sora.chatgpt.com 开头）
3. 测试回调通知：提供 callBackUrl 参数
4. 测试任务状态轮询：检查 waiting → success 状态转换
5. 测试错误处理：使用无效的视频 ID 或已删除的视频

## 注意事项

1. video_url 必须是公开可访问的 OpenAI Sora 2 视频链接
2. 每次调用消耗 10 Credits ($0.05)
3. 任务为异步处理，需要轮询状态或使用回调通知
4. 处理时间取决于视频大小和服务器负载

## API 文档

官方 API 文档: https://api.kie.ai/api/v1/jobs/createTask

## 集成完成时间

2025-10-16
