# Bug 修复：木桶布局缺失视频预览功能

## 🐛 问题描述

**症状**:
1. ✅ Grid 模式 - hover 时视频自动播放预览
2. ❌ Justified 模式 - hover 时视频**不播放**
3. ❌ Justified 模式 - 全动态模式下视频也不播放
4. ✅ 两种模式 GIF 都正常

## 🔍 根本原因

### Grid 模式（完整功能）

**位置**: `page.tsx` 第 2346-2367 行

```tsx
{/* 视频预览层 - 悬停时或全动态模式下覆盖在缩略图上方 */}
{file.type === 'VIDEO' && getVideoUrl(file as MediaFile) && (
  <video
    src={getVideoUrl(file as MediaFile)!}
    loop
    muted
    playsInline
    autoPlay={autoPlayAll}
    preload="metadata"
    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
      autoPlayAll || hoveredVideoId === file.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}
    onMouseEnter={(e) => {
      if (!autoPlayAll) {
        e.currentTarget.currentTime = 0
        e.currentTarget.play().catch(() => {
          // 忽略自动播放错误
        })
      }
    }}
  />
)}

{/* GIF预览层 */}
{(() => {
  const gifUrl = isGif(file as MediaFile) ? getGifUrl(file as MediaFile) : null
  return gifUrl ? <img ... /> : null
})()}
```

### Justified 模式（缺失视频预览）

**修复前**: 只有 GIF 预览层，**没有视频预览层**

```tsx
{/* ❌ 缺失：视频预览层 */}

{/* GIF Auto-play Overlay */}
{(() => {
  const gifUrl = isGif(file as MediaFile) ? getGifUrl(file as MediaFile) : null
  return gifUrl ? <img ... /> : null
})()}
```

**问题**:
- 只实现了 GIF 预览
- 完全缺少视频预览的 `<video>` 元素
- 即使 `hoveredVideoId` 正确设置，也没有元素响应

## ✅ 解决方案

### 添加视频预览层到 Justified 模式

**修改位置**: `page.tsx` 第 2655-2691 行

**修改后的完整代码**:

```tsx
{/* 视频预览层 - 悬停时或全动态模式下覆盖在缩略图上方 */}
{file.type === 'VIDEO' && getVideoUrl(file as MediaFile) && (
  <video
    src={getVideoUrl(file as MediaFile)!}
    loop
    muted
    playsInline
    autoPlay={autoPlayAll}
    preload="metadata"
    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
      autoPlayAll || hoveredVideoId === file.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}
    onMouseEnter={(e) => {
      if (!autoPlayAll) {
        e.currentTarget.currentTime = 0
        e.currentTarget.play().catch(() => {
          // 忽略自动播放错误
        })
      }
    }}
  />
)}

{/* GIF 预览层 - 悬停时或全动态模式下播放动画 */}
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

## 📊 Grid vs Justified 对比

### 修复前

| 功能 | Grid 模式 | Justified 模式 | 一致性 |
|------|----------|----------------|--------|
| 缩略图 | ✅ | ✅ | ✅ |
| 视频预览层 | ✅ | ❌ | ❌ |
| GIF 预览层 | ✅ | ✅ | ✅ |
| Hover 触发 | ✅ | ❌ (无视频层) | ❌ |
| 全动态模式 | ✅ | ❌ (无视频层) | ❌ |

### 修复后

| 功能 | Grid 模式 | Justified 模式 | 一致性 |
|------|----------|----------------|--------|
| 缩略图 | ✅ | ✅ | ✅ |
| 视频预览层 | ✅ | ✅ | ✅ |
| GIF 预览层 | ✅ | ✅ | ✅ |
| Hover 触发 | ✅ | ✅ | ✅ |
| 全动态模式 | ✅ | ✅ | ✅ |

## 🎯 视频预览功能详解

### 1. 视频元素配置

```tsx
<video
  src={getVideoUrl(file as MediaFile)!}
  loop                    // 循环播放
  muted                   // 静音（允许自动播放）
  playsInline             // 移动端内联播放
  autoPlay={autoPlayAll}  // 全动态模式下自动播放
  preload="metadata"      // 预加载元数据
  className={...}
/>
```

### 2. 显示/隐藏控制

```tsx
className={`
  absolute inset-0 w-full h-full object-cover
  transition-opacity duration-200
  ${autoPlayAll || hoveredVideoId === file.id
    ? 'opacity-100'                    // 显示
    : 'opacity-0 pointer-events-none'  // 隐藏且不阻挡点击
  }
`}
```

**触发条件**:
- `autoPlayAll === true` (全动态模式) **或**
- `hoveredVideoId === file.id` (当前 hover)

### 3. Hover 时播放控制

```tsx
onMouseEnter={(e) => {
  if (!autoPlayAll) {
    e.currentTarget.currentTime = 0  // 重置到开头
    e.currentTarget.play().catch(() => {
      // 忽略自动播放错误（某些浏览器限制）
    })
  }
}}
```

**逻辑**:
- 只在非全动态模式下执行
- 重置到视频开头
- 开始播放（捕获错误）

## 🔧 技术细节

### 层级结构

```
卡片容器
├─ 缩略图层 (z-0, 始终显示)
├─ 视频预览层 (z-0, 条件显示)
│   └─ opacity: autoPlayAll || hoveredVideoId === file.id ? 100 : 0
├─ GIF 预览层 (z-0, 条件显示)
│   └─ opacity: autoPlayAll || hoveredVideoId === file.id ? 100 : 0
├─ 类型图标/复选框 (z-10)
├─ Hover 遮罩 (z-10, pointer-events-none)
└─ 预览按钮 (z-20)
```

### 为什么视频和 GIF 都是 z-0？

- 它们不会同时显示（一个文件要么是视频要么是 GIF）
- 都需要覆盖缩略图
- 使用 opacity 控制显示/隐藏，不需要 z-index 区分

### getVideoUrl 函数

```tsx
const getVideoUrl = useCallback((file: MediaFile) => {
  if (file.type !== 'VIDEO') return null

  if (file.source === 'LOCAL_REF') return `/api/media-ref/${file.id}`
  if (file.source === 'LOCAL' && file.localPath) {
    return `/api/serve-file?path=${encodeURIComponent(file.localPath)}`
  }
  if (file.sourceUrl) return file.sourceUrl

  return null
}, [])
```

**优先级**:
1. LOCAL_REF → `/api/media-ref/{id}`
2. LOCAL + localPath → `/api/serve-file?path=...`
3. sourceUrl → 直接使用 URL

## ✅ 验证清单

### Grid 模式
- [x] Hover 时视频自动播放
- [x] 全动态模式下所有视频播放
- [x] GIF 正常播放
- [x] 视频从头开始播放
- [x] 静音播放（符合浏览器政策）

### Justified 模式（修复后）
- [x] Hover 时视频自动播放 ✨ 新增
- [x] 全动态模式下所有视频播放 ✨ 新增
- [x] GIF 正常播放
- [x] 视频从头开始播放 ✨ 新增
- [x] 静音播放 ✨ 新增

### 交互测试
- [x] Hover 触发防抖正常（150ms）
- [x] 快速移动不闪烁
- [x] 遮罩不阻挡 hover 事件
- [x] 预览按钮可点击
- [x] 文件夹/演员标签可点击

## 🎨 用户体验

### 修复前
- ❌ Justified 模式下视频缩略图死板
- ❌ 无法预览视频内容
- ❌ 全动态模式对视频无效
- ⚠️ Grid 和 Justified 体验不一致

### 修复后
- ✅ 两种模式下 hover 都能预览视频
- ✅ 全动态模式下所有视频自动播放
- ✅ 平滑的淡入淡出动画
- ✅ 完全一致的用户体验

## 📝 相关修改

### 本次修改
- `src/app/admin/media-browser/page.tsx` 第 2655-2691 行
  - 添加视频预览层（18 行新增代码）
  - 调整 GIF 预览层注释

### 相关历史修改
- 2655 行之前：Hover 事件处理统一（使用 `handleVideoHover`）
- 2498 行：Grid 紧凑模式 pointer-events 修复
- 2685 行：Justified 模式遮罩样式统一

## 🔗 完整功能流程

### Hover 时视频播放流程

```
用户 Hover 卡片
  ↓
onMouseEnter 触发
  ↓
handleVideoHover(file.id) (150ms 防抖)
  ↓
setHoveredVideoId(file.id)
  ↓
视频元素 className 更新
  ↓
opacity: 0 → 100 (200ms 过渡)
  ↓
video.onMouseEnter 触发
  ↓
currentTime = 0, play()
  ↓
视频从头播放
```

### 全动态模式流程

```
用户点击"全动态"按钮
  ↓
setAutoPlayAll(true)
  ↓
所有视频元素：
  - autoPlay={true}
  - opacity: 100
  ↓
所有视频自动播放
```

## 🚀 性能优化

### 已实现的优化

1. **预加载策略** - `preload="metadata"`
   - 只加载元数据，不加载完整视频
   - 减少带宽消耗

2. **条件渲染** - 检查 `getVideoUrl` 返回值
   - 只在有视频 URL 时渲染 `<video>` 元素
   - 避免空元素

3. **pointer-events-none** - 隐藏时不阻挡点击
   - 提升交互响应速度

4. **防抖机制** - 150ms 延迟
   - 减少快速移动时的状态更新
   - 避免频繁创建/销毁视频播放

---

**修复日期**: 2025-10-22
**影响范围**: Justified 模式视频预览
**测试状态**: ✅ 已验证
**相关功能**:
- Hover 视频播放
- 全动态模式
- GIF 自动播放
