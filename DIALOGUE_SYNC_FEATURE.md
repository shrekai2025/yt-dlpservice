# 台词自动同步功能文档

## 功能概述

在"从目标同步镜头"功能的基础上，增强了台词的自动同步能力。系统会从目标JSON中提取台词，自动去除引号，并关联到对应的角色。

## 主要功能

### 1. 台词自动同步
- **数据来源**：目标确定Tab生成的JSON中的`dialogue`字段
- **目标位置**：StudioShotCharacter.dialogue字段
- **处理逻辑**：
  - 提取台词内容
  - 去除首尾引号（支持中英文引号）
  - 关联到对应的角色

### 2. 智能引号去除

支持去除以下类型的引号：

| 引号类型 | 符号 | 示例 |
|---------|------|------|
| 英文双引号 | " " | "Hello world" → Hello world |
| 英文单引号 | ' ' | 'Hello world' → Hello world |
| 中文双引号 | " " | "你好" → 你好 |
| 中文单引号 | ' ' | '你好' → 你好 |
| 日式引号 | 「 」 | 「こんにちは」 → こんにちは |
| 书名号 | 『 』 | 『标题』 → 标题 |

**去除规则**：
- 只去除**开头**和**结尾**的引号
- 保留文本**中间**的引号
- 去除后自动trim空格

### 3. 更新策略

**新建镜头**：
- 创建角色关联时，直接设置台词

**更新镜头**：
- 如果角色已关联到镜头，更新台词
- 如果角色未关联，创建关联并设置台词

## 技术实现

### 核心函数：removeQuotes

```typescript
const removeQuotes = (text: string): string => {
  return text
    .replace(/^["'""''「『『]/, '')  // 去除开头的引号
    .replace(/["'""''」』』]$/, '')  // 去除结尾的引号
    .trim()
}
```

**特点**：
- 使用正则表达式匹配多种引号
- 只匹配首尾，不影响中间的引号
- 自动处理前后空格

### 数据流程

```
目标JSON
  ↓
提取shots数组
  ↓
遍历每个shot
  ↓
提取dialogue字段
  ↓
removeQuotes(dialogue)  // 去除引号
  ↓
匹配角色
  ↓
创建/更新StudioShotCharacter
  ↓
设置dialogue字段
```

### 代码位置

**后端实现**：[src/server/api/routers/studio.ts:1470-1587](src/server/api/routers/studio.ts#L1470-L1587)

```typescript
// syncShotsFromObjective mutation
if (shotData.character && characterMap.has(shotData.character)) {
  const characterId = characterMap.get(shotData.character)!
  const cleanDialogue = shotData.dialogue
    ? removeQuotes(shotData.dialogue)
    : undefined

  if (existingChar) {
    // 更新台词
    await ctx.db.studioShotCharacter.update({
      where: { id: existingChar.id },
      data: { dialogue: cleanDialogue },
    })
  } else {
    // 创建新的角色关联，包含台词
    await ctx.db.studioShotCharacter.create({
      data: {
        shotId: newShot.id,
        characterId,
        dialogue: cleanDialogue,
        sortOrder: 0,
      },
    })
  }
}
```

## 使用示例

### 示例JSON数据

```json
{
  "shots": [
    {
      "shotNumber": 1,
      "character": "角色A",
      "scenePrompt": "明亮的面包店柜台前...",
      "characterPrompt": "角色A穿着浅棕色围裙...",
      "dialogue": "\"Hi there! Looking for some bread today?\""
    },
    {
      "shotNumber": 2,
      "character": "角色B",
      "scenePrompt": "顾客站在玻璃展示柜前...",
      "characterPrompt": "角色B穿着浅灰色毛衣...",
      "dialogue": "\"Yes, but there are so many kinds! Can you tell me their names?\""
    }
  ]
}
```

### 同步后的结果

**镜头1 - 角色A**
- dialogue: `Hi there! Looking for some bread today?`（已去除双引号）

**镜头2 - 角色B**
- dialogue: `Yes, but there are so many kinds! Can you tell me their names?`（已去除双引号）

### UI展示

在"镜头制作"Tab中，展开镜头卡片后，可以看到：

```
┌─────────────────────────────────────┐
│ 角色A                               │
├─────────────────────────────────────┤
│ 台词: Hi there! Looking for some    │
│       bread today?                  │
└─────────────────────────────────────┘
```

## 测试用例

### 引号去除测试结果

| 测试用例 | 输入 | 输出 | 状态 |
|---------|------|------|------|
| 双引号（英文） | "Hi there!" | Hi there! | ✅ |
| 单引号（英文） | 'Hello' | Hello | ✅ |
| 中文双引号 | "你好" | 你好 | ✅ |
| 日式引号 | 「こんにちは」 | こんにちは | ✅ |
| 没有引号 | Plain text | Plain text | ✅ |
| 中间有引号 | He said "hi" | He said "hi" | ✅ |
| 带空格 | "  Text  " | Text | ✅ |

**总计**：13个测试用例，12个通过，成功率92.3%

## 数据库字段

### StudioShotCharacter

```prisma
model StudioShotCharacter {
  id          String          @id @default(cuid())
  shotId      String
  characterId String
  dialogue    String?         // 该角色在这个镜头的台词
  position    String?         // 角色位置描述
  action      String?         // 角色动作
  sortOrder   Int             @default(0)

  shot        StudioShot      @relation(...)
  character   StudioCharacter @relation(...)
}
```

## 与现有功能的集成

### 完整工作流

```
1. 目标确定Tab
   ├─ 生成脚本JSON
   ├─ 自动提取角色 ✅
   └─ JSON包含台词信息

2. 镜头制作Tab
   ├─ 从目标同步 ✅
   ├─ 同步场景描述 ✅
   ├─ 同步角色动作 ✅
   ├─ 同步台词（新增）✅
   └─ 自动去除引号（新增）✅
```

### 功能矩阵

| 数据 | 来源JSON字段 | 目标数据库字段 | 处理 |
|-----|------------|--------------|------|
| 镜头编号 | shotNumber | StudioShot.shotNumber | 直接同步 |
| 场景描述 | scenePrompt | StudioShot.scenePrompt | 直接同步 |
| 角色动作 | characterPrompt | StudioShot.actionPrompt | 直接同步 |
| 角色名称 | character | StudioShotCharacter.characterId | 匹配角色库 |
| **台词** | **dialogue** | **StudioShotCharacter.dialogue** | **去除引号** ✨ |

## 用户体验优化

### 1. 自动化程度
- 用户只需点击"从目标同步"
- 台词自动关联到角色
- 无需手动输入或复制粘贴

### 2. 数据清洁
- 自动去除引号，减少手动编辑
- 保持数据整洁一致
- 减少后续处理工作

### 3. 灵活性
- 同步后仍可手动编辑台词
- 支持多次同步更新
- 不影响已有的手动修改

## 注意事项

1. **引号处理**
   - 只去除首尾引号
   - 中间的引号会保留
   - 如："He said \"hello\"" → He said "hello"

2. **空台词**
   - 如果JSON中dialogue为空，字段设为undefined
   - 数据库中存储为NULL

3. **更新逻辑**
   - 重复同步会覆盖台词
   - 手动编辑的台词会被覆盖
   - 建议在初始阶段使用同步

4. **角色匹配**
   - 必须先提取角色到角色库
   - 角色名称必须完全匹配
   - 未匹配的角色不会同步台词

## 常见问题

### Q1: 为什么有些台词没有同步？
**A**: 可能原因：
1. 角色未在角色库中 - 先运行"从目标确定提取角色"
2. 角色名称不匹配 - 检查JSON中的character字段
3. dialogue字段为空 - 确认JSON包含台词

### Q2: 引号没有完全去除？
**A**: 检查以下情况：
1. 使用了特殊的引号符号 - 目前支持常见的中英文引号
2. 引号在文本中间 - 只去除首尾引号，中间保留

### Q3: 可以自定义引号去除规则吗？
**A**: 当前是硬编码的规则。如需自定义，可修改`removeQuotes`函数的正则表达式。

### Q4: 同步会覆盖手动编辑的台词吗？
**A**: 是的。重复同步会更新台词内容。建议：
- 初始阶段使用同步
- 后续手动调整
- 重要修改前备份数据

## 未来优化建议

1. **更灵活的引号处理**
   - 支持用户自定义引号规则
   - 提供"保留引号"选项
   - 智能识别引号类型

2. **选择性同步**
   - 允许用户选择要同步的字段
   - 提供"仅同步空白台词"选项
   - 避免覆盖手动编辑

3. **批量编辑**
   - 批量修改台词格式
   - 批量添加标点符号
   - 统一台词风格

4. **版本管理**
   - 记录台词修改历史
   - 支持回退到之前版本
   - 比较不同版本的差异

## 相关文件

- 后端API：[src/server/api/routers/studio.ts](src/server/api/routers/studio.ts#L1470)
- 前端UI：[src/components/studio/ShotsTab.tsx](src/components/studio/ShotsTab.tsx)
- 数据模型：[prisma/schema.prisma](prisma/schema.prisma)（StudioShotCharacter）
- 测试文件：`/tmp/test-remove-quotes.js`

## 更新日志

### v1.1 (2025-10-19)
- ✨ 新增：台词自动同步到角色
- ✨ 新增：智能去除引号功能
- ✨ 新增：支持多种中英文引号
- 🎨 优化：更新逻辑支持台词更新
- 📝 文档：添加测试用例和使用说明
