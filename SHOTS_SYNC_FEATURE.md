# 从目标同步镜头功能文档

## 功能概述

在Studio工作流的"镜头制作"Tab中，添加了"从目标同步"按钮，点击后自动从"目标确定"Tab生成的JSON数据中同步镜头信息，包括场景描述、角色动作、台词等。

## 主要功能

### 1. 自动同步镜头
- **触发位置**："镜头制作"Tab顶部右侧，"添加镜头"按钮左侧
- **按钮样式**：Outline样式，带RefreshCw图标
- **触发时机**：用户手动点击"从目标同步"按钮
- **确认机制**：点击后弹出确认对话框，避免误操作

### 2. 同步逻辑
从目标JSON的`shots`数组中提取以下信息：
- **镜头编号**（shotNumber）- 用于匹配和排序
- **场景描述**（scenePrompt）- 同步到镜头的scenePrompt字段
- **角色动作**（characterPrompt）- 同步到镜头的actionPrompt字段
- **台词**（dialogue）- 同步到镜头的dialogue字段
- **角色信息**（character）- 自动关联角色到镜头

### 3. 智能更新策略
- **新建镜头**：如果镜头编号不存在，创建新镜头
- **更新镜头**：如果镜头编号已存在，更新镜头信息
- **角色关联**：自动将JSON中的角色名称匹配到角色库，并添加到镜头
- **去重处理**：不会重复添加已存在的角色

## 技术实现

### 后端API

#### syncShotsFromObjective
**路径**：[src/server/api/routers/studio.ts:1423-1581](src/server/api/routers/studio.ts#L1423-L1581)

```typescript
syncShotsFromObjective: userProcedure
  .input(z.object({ episodeId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // 1. 验证权限和获取episode
    // 2. 提取JSON（从第一个{到最后一个}）
    // 3. 解析shots数组
    // 4. 获取项目所有角色（用于匹配）
    // 5. 批量创建或更新镜头
    // 6. 自动关联角色到镜头
    // 7. 返回同步结果统计
  })
```

**输入**：
```typescript
{
  episodeId: string  // 集ID
}
```

**返回数据**：
```typescript
{
  shots: Array<ShotData>,  // 提取的镜头数据
  created: number,          // 新建镜头数量
  updated: number           // 更新镜头数量
}
```

### 前端组件

#### ShotsTab 更新
**文件**：[src/components/studio/ShotsTab.tsx](src/components/studio/ShotsTab.tsx)

**主要改动**：
1. 添加`syncShotsMutation`用于调用同步API
2. 添加`syncMessage`状态用于显示同步结果
3. 添加`handleSyncFromObjective`处理函数
4. 在UI中添加"从目标同步"按钮
5. 显示同步成功/失败提示信息

**UI布局**：
```tsx
<div className="flex gap-2">
  <Button onClick={handleSyncFromObjective} variant="outline">
    <RefreshCw /> 从目标同步
  </Button>
  <Button onClick={handleCreateShot}>
    <Plus /> 添加镜头
  </Button>
</div>
```

## 数据映射

### JSON字段到数据库字段的映射

| JSON字段 | 数据库字段 | 说明 |
|---------|-----------|------|
| shotNumber | shotNumber | 镜头编号，用于排序和匹配 |
| character | StudioShotCharacter | 通过角色名称匹配到角色库 |
| scenePrompt | scenePrompt | 场景环境描述 |
| characterPrompt | actionPrompt | 角色外观和动作描述 |
| dialogue | dialogue | 台词内容 |

### 示例JSON数据

```json
{
  "styleSettings": "轻松愉快的现代都市咖啡面包店风格...",
  "aestheticSettings": "角色A穿着浅棕色围裙...",
  "learningPoint": "本集的英语学习要点是介绍5-6种常见面包...",
  "shots": [
    {
      "shotNumber": 1,
      "character": "角色A",
      "scenePrompt": "明亮的面包店柜台前，木质展架上整齐陈列着各种形状和颜色的面包...",
      "characterPrompt": "角色A穿着浅棕色围裙配白衬衫、系着温暖色调的头巾，双手放在柜台上，表情柔和且带着微笑。",
      "dialogue": "Hi there! Looking for some bread today?"
    },
    {
      "shotNumber": 2,
      "character": "角色B",
      "scenePrompt": "顾客站在玻璃展示柜前，柜内摆满了各式面包和糕点...",
      "characterPrompt": "角色B穿着浅灰色毛衣外搭休闲夹克、背着单肩包，表情好奇地望着柜台里的面包。",
      "dialogue": "Yes, but there are so many kinds! Can you tell me their names?"
    }
  ]
}
```

### 同步后的数据库记录

**StudioShot (镜头1)**
- shotNumber: 1
- name: "镜头 1"
- scenePrompt: "明亮的面包店柜台前，木质展架上整齐陈列着各种形状和颜色的面包..."
- actionPrompt: "角色A穿着浅棕色围裙配白衬衫、系着温暖色调的头巾，双手放在柜台上，表情柔和且带着微笑。"
- dialogue: "Hi there! Looking for some bread today?"

**StudioShotCharacter (镜头1的角色)**
- shotId: [镜头1的ID]
- characterId: [角色A的ID]
- sortOrder: 0

## 使用流程

### 完整工作流程

```
1. 在"原始输入"Tab填写素材
   ↓
2. 在"目标确定"Tab生成脚本JSON
   ↓
3. 自动提取角色到角色库（已实现）
   ↓
4. 切换到"镜头制作"Tab
   ↓
5. 点击"从目标同步"按钮
   ↓
6. 确认同步操作
   ↓
7. 系统自动创建/更新镜头
   ↓
8. 显示同步结果提示
   ↓
9. 查看和编辑同步的镜头
```

### 用户操作步骤

1. **生成目标**
   - 在"目标确定"Tab生成脚本JSON
   - 确认JSON包含完整的shots数组

2. **同步镜头**
   - 切换到"镜头制作"Tab
   - 点击顶部的"从目标同步"按钮
   - 在确认对话框中点击"确定"

3. **查看结果**
   - 查看同步成功提示："✓ 同步成功！新建 X 个镜头，更新 Y 个镜头"
   - 检查镜头列表，确认数据正确同步

4. **编辑调整**
   - 展开镜头卡片
   - 编辑场景描述、动作、镜头运动等
   - 添加或调整角色台词

## 功能特点

### 1. 智能JSON提取
- 支持LLM返回带说明文字的JSON
- 自动提取从第一个`{`到最后一个`}`的内容
- 容错性强，不会因格式问题失败

### 2. 增量更新
- 不会删除现有镜头
- 已存在的镜头会更新内容
- 新镜头会自动创建

### 3. 角色自动关联
- 根据角色名称自动匹配角色库
- 自动将角色添加到对应镜头
- 不会重复添加已存在的角色

### 4. 实时反馈
- 同步过程显示加载状态
- 完成后显示详细的成功/失败信息
- 5秒后自动隐藏提示

## 注意事项

1. **前置条件**
   - 必须先在"目标确定"Tab生成JSON数据
   - 建议先提取角色到角色库（自动完成）
   - JSON必须包含有效的shots数组

2. **数据覆盖**
   - 同步会更新现有镜头的内容
   - 如果手动编辑过镜头，同步会覆盖这些修改
   - 建议在初次创建时使用，后续手动调整

3. **角色匹配**
   - 角色名称必须与角色库中的名称完全匹配
   - 大小写敏感
   - 如果角色不存在，不会自动创建，只会跳过

4. **性能考虑**
   - 大量镜头（>50个）可能需要较长同步时间
   - 同步期间建议不要进行其他操作

## 常见问题

### Q1: 点击同步没有反应？
**A**: 可能原因：
1. 还没有生成目标JSON - 先到"目标确定"Tab生成
2. JSON格式不正确 - 检查"原始返回数据"
3. shots数组为空 - 确认JSON包含镜头数据

### Q2: 同步后镜头数量不对？
**A**: 检查以下几点：
1. JSON中的shotNumber是否连续
2. 是否有镜头被过滤（如缺少必需字段）
3. 查看同步结果提示中的创建/更新数量

### Q3: 角色没有被添加到镜头？
**A**: 可能原因：
1. 角色库中没有对应名称的角色
2. 角色名称拼写不匹配
3. 建议先查看"背景设定"Tab确认角色已提取

### Q4: 可以重复同步吗？
**A**: 可以！但注意：
- 同步会覆盖现有镜头的内容
- 手动编辑的内容会丢失
- 建议只在初始阶段使用，后续手动调整

### Q5: 同步失败如何处理？
**A**: 按以下步骤排查：
1. 查看错误提示信息
2. 到"目标确定"Tab检查JSON格式
3. 展开"原始返回数据"查看完整内容
4. 必要时手动修正JSON后重新生成

## 最佳实践

1. **工作流程优化**
   - 先生成目标 → 提取角色 → 同步镜头 → 手动调整
   - 在同步前保存重要的手动编辑
   - 使用版本控制跟踪重要修改

2. **JSON规范**
   - 确保System Prompt要求LLM返回规范的JSON
   - 每个shot必须包含shotNumber
   - 角色名称保持一致性

3. **角色管理**
   - 先让系统自动提取角色
   - 检查角色库确认角色已创建
   - 必要时手动调整角色信息

4. **镜头调整**
   - 同步后立即检查镜头内容
   - 补充缺失的信息（如镜头运动）
   - 调整台词和角色位置

## 更新日志

### v1.0 (2025-10-19)
- ✨ 新增：从目标同步镜头功能
- ✨ 新增：智能JSON提取（复用角色提取逻辑）
- ✨ 新增：镜头增量更新
- ✨ 新增：角色自动关联
- ✨ 新增：同步结果实时反馈
- 🎨 优化："从目标同步"按钮UI设计
- 🎨 优化：确认对话框防误操作
