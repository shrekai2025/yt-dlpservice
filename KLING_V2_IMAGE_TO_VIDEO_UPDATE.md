# Kling v2-1 Master Image to Video 交互优化

## 更新时间
2025-10-16

## 问题描述

原先的实现要求用户手动输入图片URL:
- ❌ 需要手动输入首帧图片URL
- ❌ 需要手动输入尾帧图片URL (可选)
- ❌ 与其他图生视频模型的交互方式不一致

## 优化方案

### 新的交互方式

使用与其他图生视频模型一致的交互方式:
- ✅ 在页面顶部的**图片上传区域**上传图片
- ✅ **第1张图片**自动作为**首帧**
- ✅ **第2张图片**(如果有)自动作为**尾帧**
- ✅ 与Sora2, Veo3等模型保持一致的用户体验

### 技术实现

#### 1. 参数配置 (model-parameters.ts)

**修改前**:
```typescript
'kie-kling-v2-1-master-image-to-video': [
  {
    key: 'image_url',
    label: '首帧图片 URL',
    type: 'string',
    // ...
  },
  {
    key: 'end_image_url',
    label: '尾帧图片 URL',
    type: 'string',
    // ...
  },
  // 其他参数...
]
```

**修改后**:
```typescript
'kie-kling-v2-1-master-image-to-video': [
  // 直接移除了image_url和end_image_url字段
  // 使用通用的图片上传区域
  {
    key: 'duration',
    // ...
  },
  // 其他参数...
]
```

#### 2. 适配器逻辑 (kie-kling-v2-master-image-to-video-adapter.ts)

**修改前**:
```typescript
// 从参数中获取URL
const imageUrl = request.parameters?.image_url as string
if (!imageUrl) {
  return error
}

const input = {
  prompt: request.prompt,
  image_url: imageUrl,
}

if (request.parameters?.end_image_url) {
  input.end_image_url = request.parameters.end_image_url
}
```

**修改后**:
```typescript
// 从通用上传区域获取图片
if (!request.inputImages || request.inputImages.length === 0) {
  return error
}

const input = {
  prompt: request.prompt,
  image_url: request.inputImages[0], // 第一张图片作为首帧
}

// 如果有第二张图片,自动作为尾帧
if (request.inputImages.length >= 2) {
  input.end_image_url = request.inputImages[1]
}
```

## 使用说明

### 用户操作流程

1. **选择模型**: Kling v2.1 Master Image to Video

2. **上传图片** (在页面顶部):
   - 上传 **1张图片**: 仅使用首帧生成视频
   - 上传 **2张图片**: 第1张作为首帧,第2张作为尾帧

3. **输入提示词**: 描述想要生成的视频内容

4. **配置参数**:
   - 视频时长 (5秒/10秒)
   - 负面提示词 (可选)
   - CFG Scale (可选)
   - 回调URL (可选)

5. **点击生成**

### 示例场景

#### 场景1: 仅使用首帧
- 上传1张图片 → 从这张图片生成视频动画

#### 场景2: 使用首帧+尾帧
- 上传2张图片 → 从第1张过渡到第2张生成视频

## 优势

### 1. 用户体验一致性
所有image-to-video模型使用相同的交互方式,降低学习成本。

### 2. 操作便捷性
- ❌ **旧方式**: 需要先上传图片到其他地方,获取URL,再粘贴到表单
- ✅ **新方式**: 直接在页面上传,系统自动处理

### 3. 功能清晰性
- 图片上传区域明确显示"上传图片"
- 用户可以直观看到已上传的图片
- 首帧/尾帧由上传顺序自动决定

### 4. 减少错误
- 避免用户输入错误的URL
- 避免URL失效问题
- 自动验证图片格式和大小

## 与其他模型的对比

| 模型 | 图片输入方式 | 首帧/尾帧 |
|------|-------------|----------|
| Sora 2 Image to Video | 通用上传区域 | 无区分 |
| Sora 2 Pro Image to Video | 通用上传区域 | 无区分 |
| Veo 3 | 通用上传区域 | 无区分 |
| **Kling v2.1 Image to Video (旧)** | ❌ 手动输入URL | 分别输入 |
| **Kling v2.1 Image to Video (新)** | ✅ 通用上传区域 | 自动识别 |

## 注意事项

1. **图片顺序很重要**
   - 第1张图片 = 首帧
   - 第2张图片 = 尾帧
   - 请按正确顺序上传

2. **图片数量**
   - 至少需要1张图片(首帧)
   - 最多使用前2张图片(首帧+尾帧)
   - 如果上传超过2张,只使用前2张

3. **图片要求**
   - 支持格式: JPEG, PNG, WebP
   - 最大大小: 10MB
   - 必须是公开可访问的URL(系统会自动上传)

## 测试建议

### 测试场景1: 单张图片
1. 上传1张图片
2. 验证适配器使用 `inputImages[0]` 作为 `image_url`
3. 验证 `end_image_url` 未设置

### 测试场景2: 两张图片
1. 上传2张图片
2. 验证适配器使用 `inputImages[0]` 作为 `image_url`
3. 验证适配器使用 `inputImages[1]` 作为 `end_image_url`

### 测试场景3: 错误处理
1. 不上传图片,直接生成
2. 验证返回错误提示"至少需要1张图片"

## 修改文件

1. ✅ `src/lib/ai-generation/config/model-parameters.ts`
   - 移除 `image_url` 字段
   - 移除 `end_image_url` 字段

2. ✅ `src/lib/ai-generation/adapters/kie/kie-kling-v2-master-image-to-video-adapter.ts`
   - 改用 `request.inputImages` 数组
   - 第1张图片 → `image_url`
   - 第2张图片 → `end_image_url`

## 总结

这次优化使Kling v2.1 Master Image to Video模型的交互方式与其他图生视频模型保持一致,提供了更好的用户体验和更清晰的操作流程。

✅ 用户不再需要手动输入URL
✅ 首帧/尾帧自动识别
✅ 与其他模型交互方式统一
✅ 减少操作步骤和错误
