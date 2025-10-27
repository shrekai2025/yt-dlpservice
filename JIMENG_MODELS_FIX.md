# 即梦 AI 模型图片上传功能修复

## 问题描述

即梦 4.0 和 Video 3.0 模型支持图片输入，但在界面上看不到图片上传控件。

## 根本原因

数据库中旧的即梦模型缺少 `inputCapabilities` 和 `outputCapabilities` 字段配置。前端代码通过检查这些字段来决定是否显示图片上传控件：

```typescript
// src/components/studio/ShotAIGenerationPanel.tsx
const supportsImageInput = useMemo(() => {
  if (!selectedModel?.inputCapabilities) return false
  try {
    const capabilities = JSON.parse(selectedModel.inputCapabilities) as string[]
    return capabilities.includes('image-input')
  } catch {
    return false
  }
}, [selectedModel])
```

## 解决方案

创建并执行了数据库更新脚本：`prisma/migrations/update_jimeng_models_capabilities.sql`

### 更新内容

| 模型 | slug | inputCapabilities | outputCapabilities | 说明 |
|------|------|-------------------|-------------------|------|
| **Jimeng 4.0** | `ai-jimeng-40` | `["text-input", "image-input"]` | `["image-output"]` | 支持文生图、图生图、图像编辑、多图组合 |
| **Jimeng 2.1** | `ai-jimeng-21-` | `["text-input"]` | `["image-output"]` | 仅支持文生图 |
| **Jimeng Video 3.0** | `ai-jimeng-video-30` | `["text-input", "image-input"]` | `["video-output"]` | 支持文生视频、图生视频 |
| **Jimeng T2I v3.1** | `jimeng-text-to-image-v31` | `["text-input"]` | `["image-output"]` | 仅支持文生图 |

### 执行步骤

```bash
# 执行数据库更新
sqlite3 data/app.db < prisma/migrations/update_jimeng_models_capabilities.sql

# 验证更新结果
sqlite3 data/app.db "SELECT slug, name, inputCapabilities FROM ai_models WHERE slug LIKE '%jimeng%';"
```

## 验证结果

✅ **Jimeng 4.0** - 现在支持图片输入
- inputCapabilities: `["text-input", "image-input"]`
- 界面将显示图片上传控件
- 可以上传最多 10 张图片用于图生图、图像编辑、多图组合

✅ **Jimeng Video 3.0** - 现在支持图片输入
- inputCapabilities: `["text-input", "image-input"]`
- 界面将显示图片上传控件
- 支持：无图片=文生视频，1张图=首帧生成，2张图=首尾帧生成

✅ **Jimeng 2.1** - 仅文本输入（符合预期）
- inputCapabilities: `["text-input"]`
- 不显示图片上传控件

✅ **Jimeng T2I v3.1** - 仅文本输入（符合预期）
- inputCapabilities: `["text-input"]`
- 不显示图片上传控件

## 界面效果

**重启开发服务器后**，用户选择不同模型时会看到：

### Jimeng 4.0
```
✅ 提示词输入框
✅ 图片上传控件（支持多图）
✅ 参数配置面板
```

### Jimeng Video 3.0
```
✅ 提示词输入框
✅ 图片上传控件（支持1-2张）
✅ 参数配置面板（时长、比例等）
```

### Jimeng 2.1 / T2I v3.1
```
✅ 提示词输入框
❌ 图片上传控件（不显示，仅文生图）
✅ 参数配置面板
```

## 重启服务器

```bash
# 停止当前服务器 (Ctrl+C)
npm run dev
```

重启后，所有即梦模型的图片上传功能将正常显示！

## 文件清单

- **SQL 更新脚本**: `prisma/migrations/update_jimeng_models_capabilities.sql`
- **修复文档**: `JIMENG_MODELS_FIX.md`

## 技术细节

### inputCapabilities 字段说明

这是一个 JSON 字符串数组，定义模型支持的输入类型：

- `"text-input"`: 支持文本输入（提示词）
- `"image-input"`: 支持图片输入
- `"video-input"`: 支持视频输入（未来可能使用）
- `"audio-input"`: 支持音频输入（未来可能使用）

### outputCapabilities 字段说明

定义模型的输出类型：

- `"image-output"`: 输出图片
- `"video-output"`: 输出视频
- `"audio-output"`: 输出音频
- `"text-output"`: 输出文本

### 前端渲染逻辑

前端会解析 `inputCapabilities` JSON，检查是否包含 `"image-input"`：

```typescript
const supportsImageInput = useMemo(() => {
  if (!selectedModel?.inputCapabilities) return false
  try {
    const capabilities = JSON.parse(selectedModel.inputCapabilities) as string[]
    return capabilities.includes('image-input')
  } catch {
    return false
  }
}, [selectedModel])
```

如果 `supportsImageInput` 为 `true`，则渲染图片上传控件。

## 相关适配器

各模型的适配器已正确实现图片处理逻辑：

1. **Jimeng40Adapter** - 支持多图输入（最多10张）
2. **JimengVideo30Adapter** - 根据图片数量自动选择模式：
   - 0张: 文生视频
   - 1张: 首帧生成
   - 2张: 首尾帧生成
3. **JimengTextToImageAdapter** - 仅文本输入
4. **JimengTextToImageV31Adapter** - 仅文本输入

## 更新日志

### 2025-01-26
- ✅ 识别问题：即梦 4.0 和 Video 3.0 缺少 inputCapabilities 配置
- ✅ 创建 SQL 更新脚本
- ✅ 执行数据库更新
- ✅ 验证所有即梦模型的能力配置
- ✅ 创建修复文档

---

**修复完成** ✅ 重启服务器后，即梦 4.0 和 Video 3.0 的图片上传控件将正常显示！
