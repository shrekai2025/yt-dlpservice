# AI生成任务成本追踪功能实施报告

## 概述

本次更新为AI生成任务系统添加了完整的成本追踪功能，包括：
- 任务级别的USD成本计算和存储
- 任务详情页面展示成本信息
- Studio镜头列表展示总消耗（替换原有的帧数显示）

---

## 1. 数据库变更

### 1.1 Schema 更新

**文件**: `prisma/schema.prisma`

在 `AIGenerationTask` 模型中新增字段：

```prisma
model AIGenerationTask {
  // ... 其他字段
  costUSD         Float?         // 任务消耗成本（美元）
  // ... 其他字段
}
```

- **类型**: `Float?` (可选浮点数)
- **说明**: 存储任务的实际成本，单位为美元(USD)
- **默认值**: `null` (历史数据自动填充为null)

### 1.2 数据库迁移

已通过 `npx prisma db push` 完成数据库schema同步。

---

## 2. 定价信息配置

### 2.1 已有定价的模型 (KIE供应商)

**文件**: `src/lib/ai-generation/config/pricing-info.ts`

以下KIE模型已配置完整定价信息：

#### 图像生成模型

| 模型 Slug | 模型名称 | 定价方式 | 示例价格 |
|----------|---------|---------|---------|
| `kie-4o-image` | 4o Image | 动态 (按输出数量) | 1张: $0.030, 2张: $0.035, 4张: $0.040 |
| `kie-flux-kontext` | Flux Kontext | 动态 (按版本) | Pro: $0.025, Max: $0.050 |
| `kie-midjourney-image` | Midjourney | 动态 (按速度) | Relaxed: $0.015, Fast: $0.040, Turbo: $0.080 |
| `kie-nano-banana` | Nano Banana | 静态 | $0.020/张 |
| `kie-nano-banana-edit` | Nano Banana Edit | 静态 | $0.020/张 |
| `kie-nano-banana-upscale` | Nano Banana Upscale | 静态 | $0.005/张 |
| `kie-seedream-v4` | Seedream V4 | 静态 | $0.018/张 |
| `kie-seedream-v4-edit` | Seedream V4 Edit | 静态 | $0.018/张 |
| `kie-qwen-image-edit` | Qwen Image Edit | 动态 (按分辨率) | 512x512: $0.005, 1024x1024: $0.018 |

#### 视频生成模型

| 模型 Slug | 模型名称 | 定价方式 | 示例价格 |
|----------|---------|---------|---------|
| `kie-midjourney-video` | Midjourney Video | 动态 (按质量+批量) | 标清1视频: $0.075, HD1视频: $0.225 |
| `kie-sora2` | Sora 2 | 静态 | $0.15/10秒 |
| `kie-sora2-image-to-video` | Sora 2 Image to Video | 静态 | $0.15/10秒 |
| `kie-sora2-pro` | Sora 2 Pro | 动态 (按时长+质量) | 标准10秒: $0.45, 高清10秒: $1.00 |
| `kie-sora2-pro-image-to-video` | Sora 2 Pro Image to Video | 动态 (按时长+质量) | 标准10秒: $0.45, 高清10秒: $1.00 |
| `kie-veo3` | Veo 3 | 静态 | $1.25 (Quality) |
| `kie-veo3-fast` | Veo 3 Fast | 静态 | $0.50 (Fast) |
| `kie-sora-watermark-remover` | Sora Watermark Remover | 静态 | $0.05 |
| `kie-kling-v2-1-master-image-to-video` | Kling v2.1 Master Image to Video | 动态 (按时长) | 5秒: $0.80, 10秒: $1.60 |
| `kie-kling-v2-1-master-text-to-video` | Kling v2.1 Master Text to Video | 动态 (按时长) | 5秒: $0.80, 10秒: $1.60 |
| `kie-kling-v2-1-standard` | Kling v2.1 Standard | 动态 (按时长) | 5秒: $0.125, 10秒: $0.25 |
| `kie-kling-v2-1-pro` | Kling v2.1 Pro | 动态 (按时长) | 5秒: $0.25, 10秒: $0.50 |
| `kie-kling-v2-5-turbo-pro` | Kling v2.5 Turbo Pro | 动态 (按时长) | 5秒: $0.21, 10秒: $0.42 |
| `kie-kling-v2-5-turbo-text-to-video-pro` | Kling v2.5 Turbo Pro Text to Video | 动态 (按时长) | 5秒: $0.21, 10秒: $0.42 |
| `kie-wan-2-2-a14b-text-to-video-turbo` | Wan 2.2 A14B Turbo Text to Video | 动态 (按分辨率) | 480p: $0.03, 720p: $0.06 |
| `kie-wan-2-2-a14b-image-to-video-turbo` | Wan 2.2 A14B Turbo Image to Video | 动态 (按分辨率) | 480p: $0.03, 720p: $0.06 |
| `kie-wan-2-5-text-to-video` | Wan 2.5 Text to Video | 动态 (按分辨率+时长) | 720p: $0.06/秒, 1080p: $0.10/秒 |
| `kie-wan-2-5-image-to-video` | Wan 2.5 Image to Video | 动态 (按分辨率+时长) | 720p: $0.06/秒, 1080p: $0.10/秒 |
| `kie-bytedance-v1-pro-text-to-video` | ByteDance V1 Pro Text to Video | 动态 (按分辨率+时长) | 480p: $0.014/秒, 720p: $0.03/秒, 1080p: $0.07/秒 |
| `kie-bytedance-v1-pro-image-to-video` | ByteDance V1 Pro Image to Video | 动态 (按分辨率+时长) | 480p: $0.014/秒, 720p: $0.03/秒, 1080p: $0.07/秒 |
| `kie-runway` | Runway | 动态 (按时长+质量) | 5秒720p: $0.06, 5秒1080p: $0.15 |
| `kie-runway-extend` | Runway Extend | 动态 (按质量) | 5秒720p: $0.06, 5秒1080p: $0.15 |

**KIE 合计**: 31个模型 ✅

---

### 2.2 已有定价的模型 (其他供应商)

#### OpenAI

| 模型 Slug | 模型名称 | 定价方式 | 示例价格 |
|----------|---------|---------|---------|
| `openai-dalle-3` | DALL-E 3 | 动态 (按尺寸+质量) | 1024x1024标准: $0.040, HD: $0.080 |

#### Replicate

| 模型 Slug | 模型名称 | 定价方式 | 示例价格 |
|----------|---------|---------|---------|
| `replicate-flux-pro` | Flux Pro | 静态 | $0.055/张 |
| `replicate-minimax` | Minimax Video | 动态 (按优化选项) | 标准: $0.012/秒, 优化: $0.014/秒 |

#### ElevenLabs

| 模型 Slug | 模型名称 | 定价方式 | 示例价格 |
|----------|---------|---------|---------|
| `elevenlabs-tts-v3` | ElevenLabs TTS v3 | 动态 (按字符数) | $0.10/1000字符 |

**其他供应商合计**: 4个模型 ✅

---

### 2.3 暂无定价信息的模型

以下模型因官方未公开定价或需要进一步调研，暂时标记为"暂无定价信息"：

| 模型 Slug | 模型名称 | 供应商 | 备注 |
|----------|---------|--------|------|
| `tuzi-kling` | Kling Video | Tuzi.ai | 图子AI平台暂无公开定价 |
| `tuzi-midjourney` | Midjourney | Tuzi.ai | 图子AI平台暂无公开定价 |
| `pollo-kling` | Kling 1.5 | Pollo.ai | Pollo平台暂无公开定价 |
| `pollo-veo3` | Veo 3 | Pollo.ai | Pollo平台暂无公开定价 |

**暂无定价合计**: 4个模型 ⚠️

---

## 3. 成本计算逻辑

### 3.1 计算函数

**文件**: `src/lib/ai-generation/config/pricing-info.ts`

新增 `calculateTaskCost()` 函数：

```typescript
export function calculateTaskCost(
  modelSlug: string,
  params: Record<string, unknown> = {}
): number | null
```

**功能**:
1. 根据模型slug获取定价配置
2. 如果是动态定价函数，传入参数计算实际价格
3. 解析定价文本中的美元金额
4. 对于按秒/按字符计费的模型，自动乘以实际数量
5. 返回最终USD成本，失败则返回 `null`

**支持的定价文本格式**:
- `"30 Credits/10秒 ≈ $0.15"` → 提取 `$0.15`
- `"$0.055/张"` → 提取 `$0.055`
- `"约 $0.0010 (100字符, $0.10/1k字符)"` → 提取 `$0.0010`
- `"暂无定价信息"` → 返回 `null`

### 3.2 自动计算时机

**文件**: `src/lib/ai-generation/services/task-manager.ts`

在 `createTask()` 方法中：

```typescript
// 获取模型信息以计算成本
const model = await db.aIModel.findUnique({
  where: { id: input.modelId },
  select: { slug: true },
})

// 计算任务成本
let costUSD: number | null = null
if (model) {
  const params = {
    ...(input.parameters || {}),
    numberOfOutputs: input.numberOfOutputs || 1,
  }
  costUSD = calculateTaskCost(model.slug, params)
}

// 创建任务时保存成本
const task = await db.aIGenerationTask.create({
  data: {
    // ... 其他字段
    costUSD, // 保存计算的成本
    // ...
  },
})
```

---

## 4. 前端展示

### 4.1 任务详情页面

**文件**: `src/app/admin/ai-generation/tasks/[id]/page.tsx`

在"执行信息"卡片中新增成本显示：

```tsx
{task.costUSD !== null && task.costUSD !== undefined && (
  <div>
    <div className="text-sm font-medium text-neutral-500">成本</div>
    <div className="mt-1 text-lg font-semibold text-green-600">
      ${task.costUSD.toFixed(4)} USD
    </div>
  </div>
)}
```

**效果**:
- 显示位置: 供应商任务ID下方
- 显示格式: `$0.0210 USD` (保留4位小数)
- 颜色: 绿色，突出显示

### 4.2 Studio镜头列表

**文件**: `src/components/studio/ShotsTab.tsx`

替换原有的"xx帧"显示为"总消耗"：

**修改前**:
```tsx
{shot.characters?.length || 0} 个角色 · {shot.frames?.length || 0} 个帧
```

**修改后**:
```tsx
{shot.characters?.length || 0} 个角色 · {(() => {
  // 计算该镜头所有关联任务的总成本
  const totalCost = (shot.generationTasks || []).reduce(
    (sum: number, task: any) => sum + (task.costUSD || 0),
    0
  );
  return totalCost > 0 ? `$${totalCost.toFixed(4)}` : '无消耗';
})()}
```

**效果**:
- 实时计算该镜头所有关联生成任务的总成本
- 有消耗时显示: `2 个角色 · $0.4500`
- 无消耗时显示: `2 个角色 · 无消耗`

---

## 5. API数据返回更新

### 5.1 Studio API

**文件**: `src/server/api/routers/studio.ts`

在 `getEpisode` 查询中新增 `generationTasks` 关联查询：

```typescript
shots: {
  include: {
    // ... 其他关联
    generationTasks: {
      select: {
        id: true,
        costUSD: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    },
  },
  orderBy: { shotNumber: 'asc' },
}
```

**说明**:
- 每个镜头返回其关联的所有生成任务
- 包含任务ID、成本、状态和创建时间
- 按创建时间倒序排列

---

## 6. 历史数据处理

### 6.1 策略

- **已有任务**: `costUSD` 字段自动填充为 `null`
- **新任务**: 自动计算并保存成本
- **前端展示**: 仅当 `costUSD !== null` 时才显示成本信息

### 6.2 数据一致性

历史任务的成本字段为 `null` 是符合预期的：
- 不影响现有功能
- 新任务自动包含成本信息
- 前端通过条件渲染优雅处理

---

## 7. 完整清单总结

### 7.1 已实现功能 ✅

1. ✅ 数据库Schema添加 `costUSD` 字段
2. ✅ 数据库迁移完成
3. ✅ 完善所有KIE模型定价信息 (31个)
4. ✅ 添加其他供应商定价信息 (4个)
5. ✅ 创建成本计算工具函数 `calculateTaskCost()`
6. ✅ 任务创建时自动计算并保存成本
7. ✅ 任务详情页面展示成本USD数量
8. ✅ Studio镜头列表展示总消耗，替换帧数显示
9. ✅ API返回数据包含成本字段

### 7.2 已有定价的模型统计

| 供应商 | 图像模型 | 视频模型 | 音频模型 | 总计 |
|--------|---------|---------|---------|------|
| KIE | 9 | 22 | 0 | 31 |
| OpenAI | 1 | 0 | 0 | 1 |
| Replicate | 1 | 1 | 0 | 2 |
| ElevenLabs | 0 | 0 | 1 | 1 |
| **总计** | **11** | **23** | **1** | **35** |

### 7.3 暂无定价的模型统计

| 供应商 | 模型数量 | 模型列表 |
|--------|---------|---------|
| Tuzi.ai | 2 | tuzi-kling, tuzi-midjourney |
| Pollo.ai | 2 | pollo-kling, pollo-veo3 |
| **总计** | **4** | |

**建议**: 后续可联系这些供应商获取官方定价，或通过实际使用测试确定价格。

---

## 8. 使用示例

### 8.1 查看任务成本

1. 进入任务详情页面: `/admin/ai-generation/tasks/{taskId}`
2. 在"执行信息"卡片中查看"成本"字段
3. 显示格式: `$0.0210 USD`

### 8.2 查看镜头总消耗

1. 进入Studio编辑页面: `/admin/ai-generation/studio/{slug}/{episodeId}`
2. 切换到"镜头制作"Tab
3. 在镜头列表中每个镜头下方查看总消耗
4. 显示格式: `2 个角色 · $0.4500`

---

## 9. 技术要点

### 9.1 定价配置灵活性

- **静态定价**: 固定价格字符串
- **动态定价**: 根据参数计算的函数
- **支持参数**: 分辨率、时长、质量、批量等

### 9.2 成本计算鲁棒性

- 解析失败返回 `null` 而非报错
- 支持多种定价文本格式
- 自动处理按秒/按字符计费的乘法运算

### 9.3 前端展示友好性

- 条件渲染，仅展示有效成本
- 保留4位小数，精确显示
- 绿色高亮，视觉突出

---

## 10. 后续优化建议

1. **补充暂无定价的模型**: 联系Tuzi.ai和Pollo.ai获取官方定价
2. **成本统计报表**: 添加项目/集级别的成本汇总统计
3. **成本预算功能**: 支持设置成本预算和告警
4. **成本趋势分析**: 按时间维度分析成本变化趋势
5. **批量成本导出**: 支持导出成本明细到Excel/CSV

---

## 11. 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `prisma/schema.prisma` | 修改 | 新增 `costUSD` 字段 |
| `src/lib/ai-generation/config/pricing-info.ts` | 修改 | 新增35个模型定价+计算函数 |
| `src/lib/ai-generation/services/task-manager.ts` | 修改 | 创建任务时自动计算成本 |
| `src/app/admin/ai-generation/tasks/[id]/page.tsx` | 修改 | 任务详情页展示成本 |
| `src/components/studio/ShotsTab.tsx` | 修改 | 镜头列表展示总消耗 |
| `src/server/api/routers/studio.ts` | 修改 | API返回generationTasks |

---

## 12. 测试建议

### 12.1 功能测试

1. **创建新任务**: 验证成本自动计算并保存
2. **查看任务详情**: 验证成本正确显示
3. **Studio镜头列表**: 验证总消耗正确计算
4. **不同模型测试**: 测试静态定价和动态定价模型
5. **历史任务**: 验证历史任务不显示成本（优雅降级）

### 12.2 边界测试

1. **无定价模型**: 验证返回 `null` 且不报错
2. **异常参数**: 验证计算失败时返回 `null`
3. **零成本**: 验证 `$0.0000` 正确显示

---

## 完成时间

2025-10-21

## 实施者

Claude (AI Assistant)
