# 镜头制作页面简化

## 修改日期
2025-10-19

## 修改目标
简化镜头制作页面，移除不必要的字段，优化Prompt生成逻辑。

## 主要变更

### 1. 删除的字段
- ✅ **镜头名称输入框** - 改为只读显示
- ✅ **时长(秒)输入框** - 完全删除
- ✅ **场景描述 Prompt** - 完全删除
- ✅ **动作 Prompt** - 完全删除
- ✅ **镜头运动 Prompt** - 完全删除

### 2. 新增的字段
- ✅ **角色动作与表情** - 在角色卡片中添加textarea，存储到 `ShotCharacter.action`
- ✅ **角色台词** - 保留并优化，存储到 `ShotCharacter.dialogue`

### 3. Prompt生成逻辑变更

#### 旧逻辑（复杂）
```typescript
// 1. 全局设定
if (setting?.stylePrompt) parts.push(setting.stylePrompt)
if (setting?.lightingPrompt) parts.push(setting.lightingPrompt)
if (setting?.colorPrompt) parts.push(setting.colorPrompt)

// 2. 场景描述
if (shot.scenePrompt) parts.push(shot.scenePrompt)

// 3. 角色描述
shot.characters?.forEach((sc: any) => {
  if (sc.action) parts.push(sc.action)
  else if (sc.character?.appearancePrompt) parts.push(sc.character.appearancePrompt)
  if (sc.position) parts.push(`${sc.character.name} at ${sc.position}`)
})

// 4. 镜头其他描述
if (shot.actionPrompt) parts.push(shot.actionPrompt)
if (shot.cameraPrompt) parts.push(shot.cameraPrompt)

return parts.filter(Boolean).join(', ')
```

#### 新逻辑（最终版 - 极简）
```typescript
// 格式: 当前镜头action + '说' + 当前镜头dialogue (不使用逗号分隔)
const buildPrompt = (shot: any) => {
  const parts: string[] = []

  shot.characters?.forEach((sc: any) => {
    const characterParts: string[] = []

    // 1. 当前镜头动作
    if (sc.action) {
      characterParts.push(sc.action)
    }

    // 2. 台词（如果有）
    if (sc.dialogue) {
      characterParts.push(`说"${sc.dialogue}"`)
    }

    // 不使用逗号分隔，直接拼接
    if (characterParts.length > 0) {
      parts.push(characterParts.join(''))
    }
  })

  return parts.join(' ')
}
```

#### 示例
假设：
- 当前镜头动作: "微笑着点头，双手放在柜台上"
- 当前镜头台词: "Good morning! What can I get you?"

生成的Prompt:
```
微笑着点头，双手放在柜台上说"Good morning! What can I get you?"
```

**重要**:
- ❌ 不包含角色外观
- ❌ 不使用逗号分隔
- ✅ 动作和"说台词"直接拼接

## 代码修改

### 文件: `src/components/studio/ShotsTab.tsx`

#### 1. 新增mutation
```typescript
const updateShotCharacterMutation = api.studio.updateShotCharacter.useMutation({
  onSuccess: () => onRefresh?.(),
})
```

#### 2. 更新buildPrompt函数
- 删除全局设定、场景描述、镜头运动等复杂逻辑
- 删除角色外观
- 极简化为：**动作 + 说"台词"**（不使用逗号分隔，直接拼接）
- 台词格式化为：`说"台词内容"`

#### 3. 简化镜头信息区域
**旧UI**：
- 镜头名称（输入框）
- 时长（输入框）
- 场景描述 Prompt（textarea）
- 动作 Prompt（textarea）
- 镜头运动 Prompt（textarea）

**新UI**：
- 镜头名称（只读，灰色背景卡片）

#### 4. 优化角色卡片
**旧UI**：
- 角色名称
- 台词输入框

**新UI**：
- 角色名称
- **动作与表情** (textarea) - 新增
- **台词** (input) - 保留

#### 5. 更新Prompt预览
- 标题改为 "完整 Prompt (格式: 动作说"台词")"
- 占位符改为 "(暂无内容,请添加角色并填写动作与台词)"

## UI变化对比

### Before (旧版)
```
┌─ 镜头 #1 ──────────────────────────────┐
│ [镜头名称] [时长]                       │
│ [场景描述 Prompt]                       │
│ [动作 Prompt] [镜头运动 Prompt]         │
│                                         │
│ 角色与台词:                             │
│ ┌─ 角色A ─────┐                        │
│ │ [台词...]    │                       │
│ └─────────────┘                        │
└─────────────────────────────────────────┘
```

### After (新版)
```
┌─ 镜头 #1 ──────────────────────────────┐
│ 镜头名称: 镜头 1                        │
│                                         │
│ 角色与台词:                             │
│ ┌─ 角色A ──────────────┐               │
│ │ 动作与表情:          │               │
│ │ [微笑着点头...]      │               │
│ │                      │               │
│ │ 台词:                │               │
│ │ [Good morning!...]   │               │
│ └──────────────────────┘               │
└─────────────────────────────────────────┘
```

## 数据流

1. **从目标同步** → `ShotCharacter.action` 和 `ShotCharacter.dialogue`
2. **用户手动编辑** → 通过 `updateShotCharacter` API 更新
3. **生成AI首帧** → 使用 `buildPrompt()` 构建完整Prompt

## 优势

1. **更简洁** - 删除了冗余字段，UI更清爽
2. **更直观** - 角色动作和台词在一起，便于编辑
3. **更一致** - Prompt格式统一，便于AI理解
4. **更高效** - 减少用户输入，从全局角色设定继承外观

## 后端API

已使用现有API，无需修改：
- `api.studio.updateShotCharacter` - 更新角色动作和台词
- 参数：`{ shotCharacterId, action?, dialogue? }`

## 测试建议

1. 进入镜头制作页面
2. 点击"从目标同步"，验证镜头创建
3. 展开镜头，查看UI是否简化
4. 编辑角色的"动作与表情"和"台词"
5. 查看"完整 Prompt"预览，验证格式：`外观, 动作, 说"台词"`
6. 选择图像模型，生成AI首帧
7. 验证生成的图像是否符合Prompt

## 完成状态

✅ 所有UI修改已完成
✅ buildPrompt函数已更新
✅ TypeScript编译通过
✅ 没有引入新的错误

---

**修改者备注：**
本次简化是为了减少用户输入负担，让系统更智能地从全局角色设定中继承信息，用户只需关注每个镜头中角色的具体动作和台词。
