# Media Browser 重构方案

## 问题分析

当前 `page.tsx` 文件有 **3549 行代码**，存在以下问题：

1. **单一文件过大**：所有功能都在一个文件中，难以维护和理解
2. **JSX 嵌套过深**：有大量的 UI 组件混在一起
3. **重复代码**：很多相似的 UI 模式（选择器、编辑框等）
4. **状态管理复杂**：虽然已经有 hooks，但还有很多局部状态
5. **难以测试**：组件和逻辑耦合紧密

## 文件结构分析

### 当前代码组成（约 3549 行）

1. **Imports & Types** (1-20 行): ~20 行
2. **State & Hooks** (21-250 行): ~230 行
3. **Mutations & API Calls** (251-380 行): ~130 行
4. **Callbacks & Handlers** (381-1340 行): ~960 行
5. **Main JSX Return** (1340-3549 行): ~2200 行
   - 拖拽上传覆盖层
   - 左侧边栏（文件夹/演员管理）
   - 主内容区域（网格/列表视图）
   - 右侧边栏（演员资料/文件详情）
   - 批量操作工具栏
   - 上传进度浮窗
   - 预览对话框
   - 各种编辑对话框

## 重构方案

### 阶段 1：拆分 UI 组件（优先级：高）

创建独立的组件文件，减少 JSX 代码：

#### 1.1 创建 `components/` 目录

```
src/app/admin/media-browser/
├── components/
│   ├── MediaGrid.tsx          # 媒体网格视图 (~400 行)
│   ├── MediaListView.tsx      # 媒体列表视图 (~300 行)
│   ├── MediaCard.tsx          # 单个媒体卡片 (~200 行)
│   ├── LeftSidebar/
│   │   ├── index.tsx          # 左侧边栏主组件 (~100 行)
│   │   ├── FoldersView.tsx    # 文件夹视图 (~150 行)
│   │   ├── ActorsView.tsx     # 演员视图 (~150 行)
│   │   └── ActionButtons.tsx  # 操作按钮组 (~100 行)
│   ├── RightSidebar/
│   │   ├── index.tsx          # 右侧边栏主组件 (~50 行)
│   │   ├── ActorProfile.tsx   # 演员资料面板 (~200 行)
│   │   └── FileDetails.tsx    # 文件详情面板 (~400 行)
│   ├── BulkActionsToolbar.tsx # 批量操作工具栏 (~150 行)
│   ├── UploadProgress.tsx     # 上传进度浮窗 (~200 行)
│   ├── PreviewDialog.tsx      # 预览对话框 (~150 行)
│   ├── Dialogs/
│   │   ├── CreateFolderDialog.tsx
│   │   ├── CreateActorDialog.tsx
│   │   ├── AddUrlDialog.tsx
│   │   └── AddLocalPathDialog.tsx
│   └── shared/
│       ├── FolderSelector.tsx # 文件夹选择器（复用）
│       ├── ActorSelector.tsx  # 演员选择器（复用）
│       └── InlineEdit.tsx     # 内联编辑（复用）
```

**预期减少行数**：~2000 行从 `page.tsx` 移出

### 阶段 2：提取业务逻辑（优先级：高）

#### 2.1 创建自定义 Hooks

```
src/app/admin/media-browser/
├── hooks/
│   ├── useMediaBrowserState.ts    # ✅ 已存在
│   ├── useMediaHover.ts           # ✅ 已存在
│   ├── usePersistentReducer.ts    # ✅ 已存在
│   ├── useMediaMutations.ts       # 🆕 集中管理所有 mutations
│   ├── useMediaQueries.ts         # 🆕 集中管理所有 queries
│   ├── useBulkOperations.ts       # 🆕 批量操作逻辑
│   ├── useDragAndDrop.ts          # 🆕 拖拽逻辑
│   ├── useFileUpload.ts           # 🆕 文件上传逻辑
│   └── useInfiniteScroll.ts       # 🆕 无限滚动逻辑
```

**预期减少行数**：~800 行从 `page.tsx` 移出

### 阶段 3：优化数据流（优先级：中）

#### 3.1 使用 Context 减少 Props 传递

```typescript
// contexts/MediaBrowserContext.tsx
export const MediaBrowserContext = createContext({
  // 查询数据
  files: [],
  folders: [],
  actors: [],
  
  // UI 状态
  uiState,
  filterState,
  
  // 操作方法
  mutations: {},
  actions: {},
})
```

### 阶段 4：重复代码提取（优先级：中）

#### 4.1 共享组件模式

当前有多个相似的选择器和编辑器：
- 文件夹选择器（在文件详情、批量操作中重复）
- 演员选择器（在文件详情、批量操作中重复）
- 内联编辑（备注、名称等多处使用）

提取为可复用组件。

### 阶段 5：类型系统优化（优先级：低）

```typescript
// types/index.ts - 已存在，需要扩充
// 添加更多共享类型定义
```

## 重构后的文件大小预估

| 文件 | 当前行数 | 重构后 |
|------|---------|--------|
| page.tsx | 3549 | ~500 |
| hooks/* | 已有 3 个 | +6 个新 hooks (~800 行) |
| components/* | 0 | ~2000 行（分布在多个文件） |
| contexts/* | 0 | ~100 行 |

**总代码量**：约 3400 行（减少 ~150 行重复代码）
**最大单文件**：~500 行（page.tsx）
**可维护性**：显著提升 ✅

## 实施步骤

### Step 1: 提取独立 UI 组件（不依赖复杂 props）
- [ ] PreviewDialog
- [ ] UploadProgress
- [ ] CreateFolderDialog
- [ ] CreateActorDialog
- [ ] AddUrlDialog
- [ ] AddLocalPathDialog

### Step 2: 创建业务逻辑 Hooks
- [ ] useMediaMutations
- [ ] useMediaQueries
- [ ] useBulkOperations
- [ ] useDragAndDrop
- [ ] useFileUpload
- [ ] useInfiniteScroll

### Step 3: 创建 Context
- [ ] MediaBrowserContext
- [ ] 在 page.tsx 中使用 Provider

### Step 4: 提取复杂 UI 组件（使用 Context）
- [ ] LeftSidebar/*
- [ ] RightSidebar/*
- [ ] MediaGrid
- [ ] MediaListView
- [ ] MediaCard
- [ ] BulkActionsToolbar

### Step 5: 提取共享组件
- [ ] FolderSelector
- [ ] ActorSelector
- [ ] InlineEdit

### Step 6: 清理和优化
- [ ] 移除重复代码
- [ ] 优化性能
- [ ] 添加注释和文档
- [ ] 测试所有功能

## 优势

1. **可维护性** ⬆️⬆️⬆️
   - 每个文件职责单一，易于理解
   - 修改某个功能只需要改一个文件

2. **可复用性** ⬆️⬆️
   - 共享组件可以在其他地方使用
   - Hooks 可以在其他页面复用

3. **可测试性** ⬆️⬆️⬆️
   - 独立组件易于单元测试
   - Hooks 可以独立测试

4. **性能优化** ⬆️
   - 更细粒度的组件可以更好地优化渲染
   - 使用 React.memo 等优化手段

5. **团队协作** ⬆️⬆️
   - 不同开发者可以同时修改不同文件
   - 减少代码冲突

## 风险与注意事项

1. **渐进式重构**：不要一次性改动太多，每次只重构一部分
2. **保持功能一致**：重构过程中要确保功能不变
3. **测试覆盖**：每次重构后都要测试相关功能
4. **Git 提交**：每完成一个模块就提交一次，方便回滚
5. **性能监控**：重构后要确保性能没有下降

## 时间估算

- 阶段 1（UI 组件拆分）：2-3 天
- 阶段 2（业务逻辑提取）：1-2 天
- 阶段 3（Context 优化）：1 天
- 阶段 4（重复代码清理）：1 天
- 阶段 5（测试与优化）：1 天

**总计**：6-8 天

## 下一步行动

建议先从最独立的组件开始：

1. **立即可做**：提取 Dialog 组件（AddUrlDialog, CreateFolderDialog 等）
2. **第二优先**：创建业务逻辑 Hooks
3. **第三优先**：拆分大型 UI 组件

要开始重构吗？我建议从最简单的 Dialog 组件开始！

