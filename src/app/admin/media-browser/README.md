# 媒体浏览器组件库使用指南

## 快速开始

### 1. 导入必要的模块

```tsx
// Types and utilities
import type { MediaFile } from './types'
import { getThumbnailUrl, getGifUrl, isGif } from './utils'

// Components
import { MediaCard } from './components/MediaCard'
import { GridLayout } from './components/GridLayout'
import { JustifiedLayout } from './components/JustifiedLayout'
import { BulkOperationsBar } from './components/BulkOperationsBar'

// State management
import { uiReducer, filterReducer } from './reducers'
```

### 2. 设置状态管理

```tsx
import { useReducer, useState } from 'react'

function MediaBrowserPage() {
  // UI状态（使用reducer）
  const [uiState, dispatchUI] = useReducer(uiReducer, {
    viewTab: 'folders',
    viewMode: 'grid',
    compactMode: false,
    autoPlayAll: false,
    actorPanelCollapsed: false,
    leftSidebarCollapsed: false,
    columnWidth: 280,
    showUnassigned: false,
    justifiedRowHeight: 250,
  })

  // Filter状态（使用reducer）
  const [filterState, dispatchFilter] = useReducer(filterReducer, {
    selectedFolder: undefined,
    selectedActor: undefined,
    filterTypes: ['IMAGE', 'VIDEO', 'AUDIO'],
    filterSource: undefined,
  })

  // 批量操作状态
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())

  // Hover状态
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null)

  // ... 其他状态
}
```

### 3. 使用布局组件

#### Grid 布局（瀑布流）

```tsx
{uiState.viewMode === 'grid' && (
  <GridLayout
    files={filteredFiles}
    columns={3}
    columnWidth={uiState.columnWidth}
    compactMode={uiState.compactMode}
    bulkSelectionMode={bulkSelectionMode}
    selectedFileIds={selectedFileIds}
    autoPlayAll={uiState.autoPlayAll}
    hoveredVideoId={hoveredVideoId}
    onFileClick={(file) => {
      setSelectedFileForDetails(file)
      setTempFileRemark(file.remark || file.name)
    }}
    onFolderClick={(folderId) => {
      dispatchUI({ type: 'SET_VIEW_TAB', payload: 'folders' })
      dispatchFilter({ type: 'SET_FOLDER', payload: folderId })
    }}
    onActorClick={(actorId) => {
      dispatchUI({ type: 'SET_VIEW_TAB', payload: 'actors' })
      dispatchFilter({ type: 'SET_ACTOR', payload: actorId })
    }}
    onPreview={(file) => setPreviewFile(file)}
    onToggleSelection={(fileId) => {
      setSelectedFileIds(prev => {
        const next = new Set(prev)
        next.has(fileId) ? next.delete(fileId) : next.add(fileId)
        return next
      })
    }}
    onInlineEdit={async (fileId, remark) => {
      await updateFileRemarkMutation.mutateAsync({ id: fileId, remark })
    }}
    onHoverChange={setHoveredVideoId}
    getThumbnailUrl={getThumbnailUrl}
    getGifUrl={getGifUrl}
    isGif={isGif}
  />
)}
```

#### Justified 布局（木桶）

```tsx
{uiState.viewMode === 'justified' && (
  <JustifiedLayout
    files={filteredFiles}
    containerWidth={containerWidth}
    rowHeight={uiState.justifiedRowHeight}
    bulkSelectionMode={bulkSelectionMode}
    selectedFileIds={selectedFileIds}
    autoPlayAll={uiState.autoPlayAll}
    hoveredVideoId={hoveredVideoId}
    onFileClick={(file) => {
      setSelectedFileForDetails(file)
    }}
    onFolderClick={(folderId) => {
      dispatchUI({ type: 'SET_VIEW_TAB', payload: 'folders' })
      dispatchFilter({ type: 'SET_FOLDER', payload: folderId })
    }}
    onActorClick={(actorId) => {
      dispatchUI({ type: 'SET_VIEW_TAB', payload: 'actors' })
      dispatchFilter({ type: 'SET_ACTOR', payload: actorId })
    }}
    onPreview={(file) => setPreviewFile(file)}
    onToggleSelection={(fileId) => {
      setSelectedFileIds(prev => {
        const next = new Set(prev)
        next.has(fileId) ? next.delete(fileId) : next.add(fileId)
        return next
      })
    }}
    onHoverChange={setHoveredVideoId}
    getThumbnailUrl={getThumbnailUrl}
    getGifUrl={getGifUrl}
    isGif={isGif}
  />
)}
```

### 4. 添加批量操作栏

```tsx
{bulkSelectionMode && selectedFileIds.size > 0 && (
  <BulkOperationsBar
    selectedCount={selectedFileIds.size}
    folders={folders || []}
    actors={actors || []}
    onAssignFolder={(folderId) => {
      Array.from(selectedFileIds).forEach((fileId) => {
        moveFileToFolderMutation.mutate({ fileId, folderId })
      })
      setBulkSelectionMode(false)
      setSelectedFileIds(new Set())
    }}
    onAssignActor={(actorId) => {
      Array.from(selectedFileIds).forEach((fileId) => {
        moveFileToActorMutation.mutate({ fileId, actorId })
      })
      setBulkSelectionMode(false)
      setSelectedFileIds(new Set())
    }}
    onDelete={() => {
      if (confirm(`确定要删除选中的 ${selectedFileIds.size} 个文件吗？`)) {
        Array.from(selectedFileIds).forEach((fileId) => {
          deleteFileMutation.mutate({ id: fileId })
        })
        setBulkSelectionMode(false)
        setSelectedFileIds(new Set())
      }
    }}
    onCancel={() => {
      setBulkSelectionMode(false)
      setSelectedFileIds(new Set())
    }}
    onSelectAll={() => {
      setSelectedFileIds(new Set(filteredFiles.map(f => f.id)))
    }}
    onClearSelection={() => {
      setSelectedFileIds(new Set())
    }}
  />
)}
```

## 核心概念

### MediaCard 组件

这是最核心的可复用组件，支持 3 种显示模式：

1. **Grid 标准模式** (`layout="grid"`, `compactMode={false}`)
   - 显示完整的信息区域
   - 支持内联编辑备注
   - 适合需要详细信息的场景

2. **Grid 紧凑模式** (`layout="grid"`, `compactMode={true}`)
   - 无信息区域，hover 时显示渐变浮层
   - 节省空间，适合大量文件展示

3. **Justified 模式** (`layout="justified"`)
   - 木桶布局专用
   - Hover 时显示黑色浮层
   - 每行完美填充

### 工具函数

#### getThumbnailUrl(file: MediaFile): string | null
获取文件的缩略图 URL，优先级：
1. thumbnailPath（生成的缩略图）
2. localPath（本地图片文件）
3. sourceUrl（远程URL）

#### isGif(file: MediaFile): boolean
判断文件是否为 GIF 动图（通过扩展名和 MIME 类型）

#### getGifUrl(file: MediaFile): string | null
获取 GIF 的原始 URL（用于播放动画）

#### formatFileSize(bytes: number | null): string
格式化文件大小为 KB

#### formatDuration(seconds: number | null): string
格式化时长（秒或分钟）

### State Reducers

#### uiReducer
管理 UI 相关状态：
- `SET_VIEW_TAB` - 切换视图标签（folders/actors）
- `SET_VIEW_MODE` - 切换布局模式（grid/justified）
- `TOGGLE_COMPACT_MODE` - 切换紧凑模式
- `TOGGLE_AUTO_PLAY_ALL` - 切换自动播放所有
- `SET_COLUMN_WIDTH` - 设置列宽
- `SET_JUSTIFIED_ROW_HEIGHT` - 设置木桶布局行高

#### filterReducer
管理筛选相关状态：
- `SET_FOLDER` - 选择文件夹
- `SET_ACTOR` - 选择演员
- `TOGGLE_TYPE` - 切换文件类型（IMAGE/VIDEO/AUDIO）
- `SET_SOURCE` - 设置来源（LOCAL/URL）
- `RESET_FILTERS` - 重置所有筛选

## 性能优化建议

1. **使用 useMemo 缓存筛选结果**
```tsx
const filteredFiles = useMemo(() => {
  return files.filter(file => {
    // 筛选逻辑
  })
}, [files, filterState])
```

2. **使用 useCallback 缓存回调函数**
```tsx
const handleFileClick = useCallback((file: MediaFile) => {
  setSelectedFile(file)
}, [])
```

3. **避免在循环中创建新函数**
```tsx
// ❌ 不好
{files.map(file => (
  <MediaCard onClick={() => handleClick(file)} />
))}

// ✅ 好
{files.map(file => (
  <MediaCard onClick={handleFileClick} />
))}
```

## 常见问题

### Q: 如何切换布局模式？
```tsx
dispatchUI({ type: 'SET_VIEW_MODE', payload: 'grid' })  // or 'justified'
```

### Q: 如何进入批量选择模式？
```tsx
setBulkSelectionMode(true)
```

### Q: 如何自定义列宽？
```tsx
dispatchUI({ type: 'SET_COLUMN_WIDTH', payload: 320 })
```

### Q: 如何启用自动播放所有 GIF？
```tsx
dispatchUI({ type: 'TOGGLE_AUTO_PLAY_ALL' })
```

## 下一步

- 查看 [MEDIA_BROWSER_REFACTOR.md](../../../../MEDIA_BROWSER_REFACTOR.md) 了解完整的重构方案
- 查看 `types.ts` 了解所有类型定义
- 查看 `utils.ts` 了解所有工具函数
