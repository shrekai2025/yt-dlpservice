# JSON结构优化总结

## 修改日期
2025-10-19

## 优化目标
优化目标生成返回的JSON结构，将角色外观和场景信息从镜头级别提升到全局级别，避免在每个镜头中重复描述。

## 主要变更

### 1. JSON结构变更

#### 删除的字段
- `aestheticSettings` (人文审美设定) - 不再需要

#### 新增的字段
- `characters[]` - 全局角色设定数组
  - `name` - 角色名称
  - `appearance` - 角色外观设定（服装+配饰+发型）
  - `environment` - 角色所在场景位置

#### 修改的字段
- `shots[]` 数组中：
  - 删除：`scenePrompt` (场景环境)
  - 删除：`characterPrompt` (角色外观与动作)
  - 新增：`action` (角色在此镜头的动作与表情)

### 2. 新旧结构对比

**旧结构：**
```json
{
  "styleSettings": "风格设定",
  "aestheticSettings": "人文审美设定",
  "learningPoint": "学习要点",
  "shots": [
    {
      "shotNumber": 1,
      "character": "角色A",
      "scenePrompt": "场景环境描述",
      "characterPrompt": "角色外观+动作+表情",
      "dialogue": "台词"
    }
  ]
}
```

**新结构：**
```json
{
  "styleSettings": "风格设定",
  "learningPoint": "学习要点",
  "characters": [
    {
      "name": "角色A",
      "appearance": "角色外观（服装+配饰+发型）",
      "environment": "角色所在场景位置"
    }
  ],
  "shots": [
    {
      "shotNumber": 1,
      "character": "角色A",
      "action": "角色动作与表情",
      "dialogue": "台词"
    }
  ]
}
```

## 代码修改清单

### 1. 前端UI组件

#### `/src/components/studio/ScriptDataViewer.tsx`
- ✅ 更新TypeScript类型定义
- ✅ 删除"人文审美设定"展示区域
- ✅ 新增"全局角色设定"展示区域，显示角色外观和场景
- ✅ 简化镜头展示，只显示"角色动作与表情"和"台词"

**关键修改：**
```typescript
// 类型定义
type ScriptData = {
  styleSettings?: string
  learningPoint?: string
  characters?: Array<{
    name: string
    appearance: string
    environment: string
  }>
  shots?: Array<{
    shotNumber: number
    character: string
    action: string
    dialogue: string
  }>
}
```

### 2. 后端API

#### `/src/server/api/routers/studio.ts`

**extractCharactersFromObjective (Lines 1288-1349):**
- ✅ 从 `data.characters` 数组直接读取角色信息
- ✅ 将 `appearance` 存储到 `StudioCharacter.appearancePrompt`
- ✅ 将 `environment` 存储到 `StudioCharacter.description`
- ✅ 更新逻辑：总是更新现有角色的外观和场景信息

**syncShotsFromObjective (Lines 1472-1602):**
- ✅ 更新JSON类型定义，使用 `action` 替代 `scenePrompt` 和 `characterPrompt`
- ✅ 简化镜头创建/更新逻辑，不再存储场景信息
- ✅ 将 `shotData.action` 存储到 `StudioShotCharacter.action`

**关键修改：**
```typescript
// 角色提取
const data = JSON.parse(jsonStr) as {
  characters?: Array<{
    name: string
    appearance: string
    environment: string
  }>
}

// 镜头同步
const data = JSON.parse(jsonStr) as {
  shots?: Array<{
    shotNumber: number
    character?: string
    action?: string
    dialogue?: string
  }>
}
```

## 数据架构说明

优化后的数据分层更加清晰：

| 数据字段 | 存储位置 | 用途 |
|---------|---------|------|
| 角色外观 | `StudioCharacter.appearancePrompt` | 全局角色外观（服装+配饰+发型） |
| 角色场景 | `StudioCharacter.description` | 角色所在场景位置 |
| 镜头动作 | `StudioShotCharacter.action` | 角色在特定镜头的动作与表情 |
| 镜头台词 | `StudioShotCharacter.dialogue` | 角色在特定镜头的台词 |

## 优势

1. **避免重复**：角色外观和场景只需在全局定义一次
2. **更清晰的分层**：全局设定 vs 镜头特定内容
3. **更易维护**：修改角色外观只需改一处
4. **更符合逻辑**：角色外观应该是一致的，不应该在每个镜头中都描述一遍

## 向后兼容性

- UI组件会优雅处理旧格式数据（仍然包含 `aestheticSettings`、`scenePrompt`、`characterPrompt`）
- 新生成的数据将使用新格式

## 测试建议

1. 生成新的目标数据，验证新JSON格式
2. 检查"全局角色设定"展示是否正常
3. 执行"从目标同步"，验证角色和镜头数据是否正确提取
4. 检查AI生成首帧的Prompt是否正确（应使用全局角色外观+镜头特定动作）

## 相关文件

- `optimized-script-prompt.md` - Prompt模板（用户已手动修改）
- `src/components/studio/ScriptDataViewer.tsx` - JSON展示组件
- `src/server/api/routers/studio.ts` - 后端API
- `src/components/studio/ShotsTab.tsx` - 镜头制作页面（buildPrompt函数需要测试）

## 后续优化建议

1. 更新 `ShotsTab.tsx` 的 `buildPrompt` 函数，确保正确组合全局角色设定和镜头特定动作
2. 考虑在UI中显示从哪个角色继承了外观和场景信息
3. 为角色添加"预览Prompt"功能，显示完整的角色描述

## 完成状态

✅ 所有代码修改已完成
✅ TypeScript编译通过
✅ 没有引入新的错误

---

**修改者备注：**
本次优化是为了让LLM生成更加结构化的脚本数据，将全局设定和镜头特定内容明确分离，提高数据的可维护性和复用性。
