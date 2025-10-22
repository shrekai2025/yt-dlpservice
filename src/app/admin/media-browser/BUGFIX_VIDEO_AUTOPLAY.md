# Bug 修复：视频/GIF 自动播放问题

## 🐛 问题描述

**症状**：
1. 木桶布局下，hover 时 GIF/视频不会自动播放
2. Grid 紧凑模式下，hover 遮罩可能阻挡 hover 事件

## 🔍 根本原因

### 问题 1：木桶布局使用错误的 hover 处理函数

**Grid 模式** (正确):
```tsx
onMouseEnter={() => {
  const fileObj = file as MediaFile
  if (file.type === 'VIDEO' || isGif(fileObj)) {
    handleVideoHover(file.id)  // ✅ 使用 handleVideoHover
  }
}}
```

**Justified 模式** (错误):
```tsx
onMouseEnter={() => setHoveredVideoId(file.id)}  // ❌ 直接设置，跳过了防抖
```

**问题**:
- `handleVideoHover` 包含**防抖逻辑**（150ms 延迟），避免快速移动时的闪烁
- 直接使用 `setHoveredVideoId` 会导致逻辑不一致

### 问题 2：Grid 紧凑模式遮罩层阻挡 hover 事件

**修复前**:
```tsx
<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
  {/* 没有 pointer-events-none */}
</div>
```

**问题**:
- 遮罩层在 hover 时显示，但它会**阻挡鼠标事件**
- 导致 `onMouseEnter/onMouseLeave` 无法正常触发

## ✅ 解决方案

### 修复 1：统一 Justified 模式的 hover 处理

**修改位置**: `page.tsx` 第 2616-2627 行

```tsx
// 修改前
onMouseEnter={() => setHoveredVideoId(file.id)}
onMouseLeave={() => setHoveredVideoId(null)}

// 修改后
onMouseEnter={() => {
  const fileObj = file as MediaFile
  if (file.type === 'VIDEO' || isGif(fileObj)) {
    handleVideoHover(file.id)  // ✅ 使用统一的处理函数
  }
}}
onMouseLeave={() => {
  const fileObj = file as MediaFile
  if (file.type === 'VIDEO' || isGif(fileObj)) {
    handleVideoHover(null)
  }
}}
```

**改进点**:
- ✅ 使用 `handleVideoHover` 统一处理
- ✅ 包含防抖逻辑，避免闪烁
- ✅ 只对视频和 GIF 处理（性能优化）

### 修复 2：Grid 紧凑模式添加 pointer-events 管理

**修改位置**: `page.tsx` 第 2498 行

```tsx
// 修改前
<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">

// 修改后
<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
```

**按钮容器** (第 2502 行):
```tsx
// 修改前
<div className="flex items-center flex-wrap gap-1.5 mt-1.5">

// 修改后
<div className="flex items-center flex-wrap gap-1.5 mt-1.5 pointer-events-auto">
```

**改进点**:
- ✅ 遮罩容器 `pointer-events-none` → 不阻挡事件
- ✅ 按钮容器 `pointer-events-auto` → 按钮可点击
- ✅ 添加 `z-10` → 层级管理

### 修复 3：Grid 紧凑模式预览按钮 z-index

**修改位置**: `page.tsx` 第 2557 行

```tsx
// 修改前
<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">

// 修改后
<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
```

**改进点**:
- ✅ `z-20` 确保预览按钮在最上层

## 🎯 handleVideoHover 函数说明

这个函数位于主页面，包含重要的防抖逻辑：

```tsx
const handleVideoHover = useCallback((fileId: string | null) => {
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current)
  }

  if (fileId === null) {
    // 立即清除 hover 状态
    setHoveredVideoId(null)
  } else {
    // 延迟 150ms 设置 hover 状态，避免快速移动时闪烁
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredVideoId(fileId)
    }, 150)
  }
}, [])
```

**功能**:
1. **防抖** - 鼠标快速移动时不会频繁切换
2. **优化性能** - 减少不必要的状态更新
3. **改善 UX** - 避免 GIF 快速闪烁

## 📊 修复对比

### Grid 紧凑模式

| 元素 | 修复前 | 修复后 | 效果 |
|------|--------|--------|------|
| Hover 遮罩 | 无 pointer-events | `pointer-events-none` | ✅ 不阻挡事件 |
| 按钮容器 | 无 pointer-events | `pointer-events-auto` | ✅ 按钮可点击 |
| 预览按钮 | 无 z-index | `z-20` | ✅ 最上层 |
| Hover 处理 | `handleVideoHover` | `handleVideoHover` | ✅ 一致 |

### Justified 模式

| 元素 | 修复前 | 修复后 | 效果 |
|------|--------|--------|------|
| Hover 遮罩 | ✅ 已有 pointer-events | ✅ 已有 | - |
| 按钮容器 | ✅ 已有 pointer-events | ✅ 已有 | - |
| 预览按钮 | ✅ 已有 z-20 | ✅ 已有 | - |
| Hover 处理 | ❌ `setHoveredVideoId` | ✅ `handleVideoHover` | ✅ 修复！ |

## 🔧 技术细节

### Z-index 层级结构

```
z-20: 预览按钮（右上角）
z-10: Hover 遮罩、类型图标/复选框（左上角）
z-0:  缩略图、GIF overlay
```

### Pointer-events 策略

```
卡片容器 (可接收事件)
  ├─ onMouseEnter → handleVideoHover(id)
  ├─ onMouseLeave → handleVideoHover(null)
  │
  ├─ 遮罩容器 (pointer-events-none) ← 穿透
  │   ├─ 文字 (继承 none) ← 穿透
  │   └─ 按钮容器 (pointer-events-auto) ← 可点击
  │
  └─ 预览按钮 (z-20) ← 最上层，可点击
```

### GIF 自动播放逻辑

```tsx
{(() => {
  const gifUrl = isGif(file as MediaFile) ? getGifUrl(file as MediaFile) : null
  return gifUrl ? (
    <img
      src={gifUrl}
      alt={file.name}
      loading="lazy"
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
        autoPlayAll || hoveredVideoId === file.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    />
  ) : null
})()}
```

**触发条件**:
- `autoPlayAll === true` (全局开关) **或**
- `hoveredVideoId === file.id` (当前 hover) **且** 文件是 GIF

## ✅ 验证清单

### Grid 紧凑模式
- [x] Hover 时 GIF 自动播放
- [x] 快速移动不会闪烁（防抖生效）
- [x] 预览按钮可点击
- [x] 文件夹/演员标签可点击
- [x] 遮罩不阻挡 hover 事件

### Justified 模式
- [x] Hover 时 GIF 自动播放
- [x] 快速移动不会闪烁（防抖生效）
- [x] 预览按钮可点击
- [x] 文件夹/演员标签可点击
- [x] 遮罩不阻挡 hover 事件

### 自动播放开关
- [x] `autoPlayAll` 开启时所有 GIF 播放
- [x] `autoPlayAll` 关闭时只 hover 播放

## 🎨 用户体验改进

### 修复前
- ❌ 木桶布局 hover 时 GIF 不播放
- ❌ 快速移动鼠标时 GIF 闪烁
- ⚠️ Grid 紧凑模式遮罩可能干扰交互

### 修复后
- ✅ 两种模式 hover 都正常播放 GIF
- ✅ 150ms 防抖，平滑的播放体验
- ✅ 遮罩不干扰任何交互
- ✅ 所有按钮都可正常点击

## 📝 相关修改

### 修改文件
- `src/app/admin/media-browser/page.tsx`
  - 第 2616-2627 行：Justified 模式 hover 处理
  - 第 2498 行：Grid 紧凑模式遮罩 pointer-events
  - 第 2502 行：Grid 紧凑模式按钮容器 pointer-events
  - 第 2557 行：Grid 紧凑模式预览按钮 z-index

### 未修改（已正确）
- `src/app/admin/media-browser/components/MediaCard.tsx` - 组件版本已正确
- Justified 模式遮罩 pointer-events - 之前已修复
- Justified 模式预览按钮 z-index - 之前已修复

---

**修复日期**: 2025-10-22
**影响范围**: Grid 紧凑模式和 Justified 模式
**测试状态**: ✅ 已验证
**相关问题**: Hover 遮罩阻挡点击问题
