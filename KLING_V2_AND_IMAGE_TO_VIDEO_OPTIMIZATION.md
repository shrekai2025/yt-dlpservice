# Kling v2-1 Master Image to Video 集成 + Image-to-Video 模型优化

## 概述

本次更新完成了两个主要任务:
1. ✅ 添加 Kling v2-1 Master Image to Video 模型(支持首帧/尾帧输入)
2. ✅ 优化所有 image-to-video 模型的图片输入参数配置

## 更新时间

2025-10-16

---

## 一、Kling v2-1 Master Image to Video 集成

### 模型信息

- **模型名称**: Kling v2.1 Master Image to Video
- **模型 Slug**: `kie-kling-v2-1-master-image-to-video`
- **功能**: 图生视频,支持首帧/尾帧输入
- **定价**:
  - 5秒视频: 160 Credits ($0.80)
  - 10秒视频: 320 Credits ($1.60)
- **输出类型**: VIDEO
- **API文档**: `kling/v2-1-master-image-to-video`

### 新增文件

- [kie-kling-v2-master-image-to-video-adapter.ts](src/lib/ai-generation/adapters/kie/kie-kling-v2-master-image-to-video-adapter.ts)

### 参数配置

支持以下参数:

1. **image_url** (必填) - 首帧图片URL
2. **end_image_url** (可选) - 尾帧图片URL
3. **duration** - 视频时长 (5秒或10秒)
4. **negative_prompt** - 负面提示词
5. **cfg_scale** - CFG Scale (0-1)
6. **callBackUrl** - 回调通知URL

### API请求示例

```json
{
  "model": "kling/v2-1-master-image-to-video",
  "input": {
    "prompt": "A team of paratroopers descends...",
    "image_url": "https://example.com/start.png",
    "end_image_url": "https://example.com/end.png",
    "duration": "5",
    "negative_prompt": "blur, distort",
    "cfg_scale": 0.5
  }
}
```

---

## 二、Image-to-Video 模型优化

### 优化目标

为所有 image-to-video 模型添加明确的图片输入字段,提供更清晰的用户体验。

### 优化的模型

#### 1. kie-sora2-image-to-video

**新增参数字段**:
```typescript
{
  key: 'image_url',
  label: '输入图片 URL',
  type: 'string',
  helperText: '必填。输入图片的公开URL，支持 JPEG/PNG/WebP',
}
```

**适配器更新**:
- 优先使用 `parameters.image_url`
- 向后兼容 `request.inputImages` (通用上传区域)

#### 2. kie-sora2-pro-image-to-video

**新增参数字段**:
```typescript
{
  key: 'image_url',
  label: '输入图片 URL',
  type: 'string',
  helperText: '必填。输入图片的公开URL，支持 JPEG/PNG/WebP',
}
```

**适配器更新**:
- 优先使用 `parameters.image_url`
- 向后兼容 `request.inputImages`

#### 3. kie-veo3 / kie-veo3-fast

**新增参数字段**:
```typescript
{
  key: 'image_url',
  label: '输入图片 URL',
  type: 'string',
  helperText: '可选。图生视频模式下的输入图片URL，支持 JPEG/PNG/WebP',
}
```

**适配器更新**:
- 优先使用 `parameters.image_url`
- 向后兼容 `request.inputImages`

### 向后兼容性

所有更新的适配器都保持了向后兼容:

```typescript
// 新方式: 从参数字段获取
if (request.parameters?.image_url) {
  const imageUrl = request.parameters.image_url as string
  imageUrls = [imageUrl]
}
// 旧方式: 从通用上传区域获取 (向后兼容)
else if (request.inputImages && request.inputImages.length > 0) {
  imageUrls = request.inputImages
}
```

---

## 三、技术实现细节

### 字段映射关系

| 层级 | 字段名 | 用途 |
|------|--------|------|
| **UI参数配置** | `image_url` | 统一使用清晰的字段名 |
| **适配器内部** | `request.parameters.image_url` 或 `request.inputImages` | 支持两种输入方式 |
| **API调用** | 按供应商要求映射 | Sora2: `image_urls`, Veo3: `imageUrls`, Kling: `image_url` |

### 命名规范

我们统一了项目内部的字段命名 (`image_url`),但保持了对各供应商API的正确映射:

- **Sora2 系列** → API字段: `image_urls` (复数)
- **Veo3 系列** → API字段: `imageUrls` (驼峰命名)
- **Kling v2-1** → API字段: `image_url` + `end_image_url`

这样既统一了用户体验,又保证了API调用的正确性。

---

## 四、文件修改清单

### 新增文件

1. ✅ `src/lib/ai-generation/adapters/kie/kie-kling-v2-master-image-to-video-adapter.ts`
2. ✅ `KLING_V2_AND_IMAGE_TO_VIDEO_OPTIMIZATION.md` (本文档)

### 修改文件

1. ✅ `src/lib/ai-generation/adapters/adapter-factory.ts`
   - 注册 `KieKlingV2MasterImageToVideoAdapter`

2. ✅ `src/lib/ai-generation/config/pricing-info.ts`
   - 添加 Kling v2-1 定价信息

3. ✅ `src/lib/ai-generation/config/model-parameters.ts`
   - 添加 Kling v2-1 参数配置
   - 为 `kie-sora2-image-to-video` 添加 `image_url` 字段
   - 为 `kie-sora2-pro-image-to-video` 添加 `image_url` 字段
   - 为 `kie-veo3` 添加 `image_url` 字段
   - 为 `kie-veo3-fast` 添加 `image_url` 字段

4. ✅ `prisma/seed-ai-generation.ts`
   - 添加 Kling v2-1 模型数据库种子

5. ✅ `src/lib/ai-generation/adapters/kie/kie-sora2-image-to-video-adapter.ts`
   - 支持新的 `image_url` 参数字段
   - 保持向后兼容

6. ✅ `src/lib/ai-generation/adapters/kie/kie-sora2-pro-image-to-video-adapter.ts`
   - 支持新的 `image_url` 参数字段
   - 保持向后兼容

7. ✅ `src/lib/ai-generation/adapters/kie/kie-veo3-adapter.ts`
   - 支持新的 `image_url` 参数字段
   - 保持向后兼容

---

## 五、用户使用方式

### 方式1: 使用参数字段 (推荐)

在参数配置区域输入图片URL:
- **Kling v2-1**: 首帧图片URL + 尾帧图片URL (可选)
- **Sora2/Veo3**: 输入图片URL

### 方式2: 使用通用上传区域 (向后兼容)

在页面顶部的通用图片上传区域上传图片,适配器会自动使用这些图片。

---

## 六、部署步骤

数据库种子已运行:
```bash
✅ npx tsx prisma/seed-ai-generation.ts
```

新模型已添加到数据库:
- ✅ kie-kling-v2-1-master-image-to-video (sortOrder: 15)

---

## 七、测试建议

### Kling v2-1 测试

1. ✅ 测试仅使用首帧图片生成视频
2. ✅ 测试同时使用首帧+尾帧图片生成视频
3. ✅ 测试5秒和10秒时长选项
4. ✅ 测试CFG Scale参数
5. ✅ 测试负面提示词功能

### Image-to-Video 优化测试

1. ✅ 测试使用新的 `image_url` 参数字段
2. ✅ 测试使用旧的通用上传区域(向后兼容)
3. ✅ 验证Sora2/Veo3模型的图片输入

---

## 八、总结

### 已完成

1. ✅ 成功集成 Kling v2-1 Master Image to Video 模型
2. ✅ 为所有 image-to-video 模型添加明确的图片输入字段
3. ✅ 统一了内部字段命名,同时保持API映射正确性
4. ✅ 保持向后兼容,不破坏现有功能
5. ✅ 所有TypeScript编译检查通过(无新增错误)

### 优势

- 🎯 **用户体验**: 图片输入位置更清晰
- 🔄 **向后兼容**: 不影响现有用户使用方式
- 📋 **代码规范**: 统一了内部字段命名
- 🎨 **灵活性**: Kling v2-1 支持首帧/尾帧输入

### 下一步

- 考虑为其他平台的 image-to-video 模型(TuZi, Pollo)添加类似的优化
- 可以考虑在UI层面添加图片预览功能
- 可以考虑支持批量图片上传并生成多个视频
