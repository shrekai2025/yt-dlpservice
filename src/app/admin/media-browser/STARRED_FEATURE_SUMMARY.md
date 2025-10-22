# 标星功能实现总结

## ✅ 已完成

### 1. 数据模型
- ✅ Prisma schema已有 `starred` 字段
- ✅ 添加到 `MediaFile` 类型定义
- ✅ 添加 `filterStarred` 到 FilterState
- ✅ 添加 `maximizedSplitRatio` 到 UIState

### 2. 状态管理
- ✅ 添加 `TOGGLE_STARRED` 和 `SET_STARRED` actions
- ✅ 添加 `SET_MAXIMIZED_SPLIT_RATIO` action
- ✅ 更新 reducers
- ✅ 更新 hooks (toggleStarred, setStarred, setMaximizedSplitRatio)

## 🚧 待实现

### 3. UI组件更新

#### MediaCard.tsx - 添加标星按钮
```tsx
// 在非最大化模式下，hover时显示
{!maximized && !compactMode && (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onToggleStarred(file.id, !file.starred)
    }}
    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1.5 rounded-md hover:bg-white shadow-sm z-20"
    title={file.starred ? '取消标星' : '标星'}
  >
    <Star className={`h-3.5 w-3.5 ${file.starred ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-700'}`} />
  </button>
)}
```

#### page.tsx - 顶部添加标星筛选
```tsx
{/* 标星筛选 - 在图片/视频/音频筛选前 */}
<button
  onClick={() => toggleStarred()}
  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
    filterStarred
      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
  }`}
  title={filterStarred ? '显示全部' : '只看标星'}
>
  <Star className={`h-3.5 w-3.5 ${filterStarred ? 'fill-current' : ''}`} />
</button>
```

#### 最大化分屏布局
```tsx
{maximized ? (
  <div className="flex h-full">
    {/* 左侧：全部内容 */}
    <div style={{ width: `${maximizedSplitRatio}%` }} className="overflow-y-auto p-0.5">
      {/* 原有的Grid内容 */}
    </div>
    
    {/* 分割线 */}
    <div 
      className="w-px bg-neutral-300 cursor-col-resize relative group"
      onMouseDown={handleSplitDragStart}
    >
      {/* 拖动手柄 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-neutral-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-white" />
      </div>
    </div>
    
    {/* 右侧：标星文件（单列） */}
    <div style={{ width: `${100 - maximizedSplitRatio}%` }} className="overflow-y-auto p-0.5">
      <div className="space-y-0.5">
        {starredFiles.map(file => (
          <MediaCard key={file.id} file={file} /* ... */ />
        ))}
      </div>
    </div>
  </div>
) : (
  // 原有布局
)}
```

### 4. API更新
需要添加 toggleStarred mutation：
```typescript
toggleStarred: useMutation({
  mutationFn: ({ fileId, starred }: { fileId: string; starred: boolean }) =>
    api.mediaBrowser.updateFile.mutate({ fileId, data: { starred } }),
  onSuccess: () => {
    refetchFiles()
  }
})
```

### 5. 过滤逻辑
```typescript
// 在查询参数中添加 starred 过滤
const { data: filesData } = api.mediaBrowser.listFiles.useInfiniteQuery({
  ...otherParams,
  starred: filterStarred ? true : undefined,
})
```

## 实现步骤

1. ✅ 更新类型和状态管理
2. 更新 MediaCard 组件添加标星按钮
3. 更新 page.tsx 添加顶部标星筛选
4. 实现最大化分屏布局
5. 添加 API mutation
6. 更新查询逻辑包含 starred 过滤
7. 添加拖动分割线的交互逻辑

## 关键点

- 标星按钮只在**非最大化、非紧凑模式**下hover显示
- 标星筛选与媒体类型筛选**取交集**
- 最大化模式下**极度紧凑**（2px边距）
- 分割线可拖动，默认 70/30 分配
- 右侧只显示标星文件，**单列布局**

