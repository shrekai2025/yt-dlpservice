# 角色自动提取功能文档

## 功能概述

在Studio工作流的"目标确定"Tab中，每次生成脚本目标后，系统会自动从JSON数据中提取角色信息，并在"背景设定"Tab的角色库中展示。用户可以将提取的角色关联到演员表中的演员。

## 主要功能

### 1. 自动提取角色
- **触发时机**：每次在"目标确定"Tab点击"生成目标"并成功后
- **提取逻辑**：
  - 自动解析LLM返回的JSON数据（支持带说明文字的返回）
  - 从 `shots` 数组中提取所有唯一的角色名称
  - 每个角色记录其 `character` 名称和 `characterPrompt` 外观描述
- **智能处理**：
  - 如果角色已存在，不会重复创建
  - 如果现有角色没有外观描述，会自动更新

### 2. 角色展示
在"背景设定"Tab的角色库中展示提取的角色：
- 角色名称
- 角色描述（自动标注"从集 #X 自动提取"）
- 外观描述（Appearance Prompt）
- 关联状态（是否关联演员）

### 3. 关联演员
每个角色可以关联到演员表中的演员：
- **未关联状态**：显示"关联演员"按钮
- **已关联状态**：
  - 显示绿色"已关联演员"标签
  - 提供"同步"按钮（从演员表同步最新数据）
  - 提供"取消关联"按钮

## 技术实现

### 后端API

#### 1. extractCharactersFromObjective
**路径**：[src/server/api/routers/studio.ts:1242-1362](src/server/api/routers/studio.ts#L1242-L1362)

```typescript
// 从目标JSON中提取角色
extractCharactersFromObjective: userProcedure
  .input(z.object({ episodeId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // 1. 验证权限和获取episode
    // 2. 提取JSON（从第一个{到最后一个}）
    // 3. 解析shots数组，提取唯一角色
    // 4. 批量创建或更新角色
    // 5. 返回提取结果统计
  })
```

**返回数据**：
```typescript
{
  characters: Array<{ name: string, characterPrompt: string }>,
  created: number,    // 新建角色数量
  updated: number     // 更新角色数量
}
```

#### 2. linkCharacterToActor
**路径**：[src/server/api/routers/studio.ts:1365-1416](src/server/api/routers/studio.ts#L1365-L1416)

```typescript
// 关联角色到演员
linkCharacterToActor: userProcedure
  .input(z.object({
    characterId: z.string(),
    actorId: z.string().nullable()
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. 验证角色和演员存在
    // 2. 更新角色的sourceActorId字段
    // 3. 返回更新后的角色信息
  })
```

### 前端组件

#### 1. ObjectiveTab 更新
**文件**：[src/components/studio/ObjectiveTab.tsx](src/components/studio/ObjectiveTab.tsx)

**主要改动**：
- 添加 `extractCharactersMutation` 用于调用提取API
- 在 `generateMutation.onSuccess` 中自动触发角色提取
- 显示提取结果提示信息（成功/失败）

**提示示例**：
```
🎭 已提取 2 个角色（新建 2 个，更新 0 个）
```

#### 2. SettingTab 更新
**文件**：[src/components/studio/SettingTab.tsx](src/components/studio/SettingTab.tsx)

**主要改动**：
- 添加 `linkCharacterMutation` 用于关联演员
- 添加关联状态显示（已关联/未关联）
- 添加关联演员对话框
- 添加取消关联功能

**UI改进**：
- 关联演员按钮（带 Link 图标）
- 已关联标签（绿色背景）
- 同步/取消关联操作按钮

### 核心工具函数

#### extractJsonFromString
用于从LLM返回的文本中提取JSON部分：

```typescript
function extractJsonFromString(str: string): string {
  const firstBrace = str.indexOf('{')
  const lastBrace = str.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    return str // 如果找不到有效的大括号，返回原字符串
  }

  return str.substring(firstBrace, lastBrace + 1)
}
```

**应用场景**：
- 后端提取角色时使用
- 前端ScriptDataViewer显示时使用
- 确保即使LLM返回带说明文字，也能正确解析

## 数据流程

```
1. 用户点击"生成目标"
   ↓
2. LLM返回脚本JSON（可能带说明文字）
   ↓
3. ObjectiveTab保存JSON到episode.objective
   ↓
4. 自动触发extractCharactersFromObjective
   ↓
5. 后端提取JSON，解析shots数组
   ↓
6. 批量创建/更新StudioCharacter记录
   ↓
7. 前端显示提取结果提示
   ↓
8. 用户切换到"背景设定"Tab查看角色库
   ↓
9. 用户可以点击"关联演员"选择演员
   ↓
10. 更新character.sourceActorId字段
```

## 数据库模型

### StudioCharacter
```prisma
model StudioCharacter {
  id               String   @id @default(cuid())
  projectId        String
  name             String
  description      String?
  sourceActorId    String?  // 关联的演员ID
  appearancePrompt String?  // 从JSON提取的外观描述
  referenceImage   String?
  metadata         String?
  sortOrder        Int      @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  project          StudioProject @relation(...)
  sourceActor      MediaActor?   @relation(...) // 关联的演员
  shotCharacters   StudioShotCharacter[]

  @@unique([projectId, name])
}
```

## 使用示例

### 示例JSON数据
```json
{
  "styleSettings": "温馨的欧式面包房风格",
  "aestheticSettings": "Baker穿着传统围裙，Customer穿着休闲装",
  "learningPoint": "学习面包的英文名称",
  "shots": [
    {
      "shotNumber": 1,
      "character": "Baker",
      "scenePrompt": "面包房柜台后方...",
      "characterPrompt": "Baker穿着巴伐利亚风格的围裙连衣裙，头发整齐地盘成发髻...",
      "dialogue": "Welcome! What can I get for you today?"
    },
    {
      "shotNumber": 2,
      "character": "Customer",
      "scenePrompt": "面包房柜台前方...",
      "characterPrompt": "Customer穿着简约的黑色连衣裙，长发自然垂落...",
      "dialogue": "I'd like some bread..."
    }
  ]
}
```

### 提取结果
从上述JSON会提取2个角色：
1. **Baker**
   - 名称：Baker
   - 外观：Baker穿着巴伐利亚风格的围裙连衣裙，头发整齐地盘成发髻...
   - 描述：从集 #1 自动提取

2. **Customer**
   - 名称：Customer
   - 外观：Customer穿着简约的黑色连衣裙，长发自然垂落...
   - 描述：从集 #1 自动提取

## 用户操作流程

### 1. 生成目标并自动提取角色
1. 在"原始输入"Tab填写素材
2. 切换到"目标确定"Tab
3. 配置LLM和System Prompt
4. 点击"生成目标"
5. 等待生成完成
6. 查看提取角色提示："🎭 已提取 2 个角色（新建 2 个，更新 0 个）"

### 2. 查看和关联角色
1. 切换到"背景设定"Tab
2. 滚动到"角色库"部分
3. 查看自动提取的角色列表
4. 点击某个角色的"关联演员"按钮
5. 在弹出对话框中选择演员
6. 确认关联成功（显示绿色"已关联演员"标签）

### 3. 同步或取消关联
- **同步**：点击"同步"按钮从演员表更新最新数据
- **取消关联**：点击"取消关联"按钮解除关联

## 优势特点

1. **全自动化**：无需手动创建角色，生成目标后自动提取
2. **智能去重**：同名角色不会重复创建
3. **容错性强**：支持LLM返回带说明文字的JSON
4. **灵活关联**：可以将角色关联到演员表，复用演员数据
5. **实时反馈**：提供清晰的操作反馈和状态提示

## 注意事项

1. **JSON格式要求**：LLM必须返回包含 `shots` 数组的JSON
2. **角色唯一性**：基于角色名称判断唯一性（projectId + name）
3. **演员关联**：一个角色只能关联一个演员，但一个演员可以关联多个角色
4. **数据同步**：关联演员后，需要手动点击"同步"才会更新角色数据
