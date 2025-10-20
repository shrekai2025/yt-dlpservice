# Prompt拼接重复问题修复文档

## 问题描述

在镜头制作的"AI生成首帧"功能中，发现完整Prompt中出现重复内容：

**问题示例**：
```
角色A穿着浅棕色围裙配白衬衫、系着温暖色调的头巾，双手放在柜台上，表情柔和且带着微笑。,
明亮的面包店柜台前，木质展架上整齐陈列着各种形状和颜色的面包，空气中弥漫着新鲜烘焙的香气。,
角色A穿着浅棕色围裙配白衬衫、系着温暖色调的头巾，双手放在柜台上，表情柔和且带着微笑。
```

同样的角色描述出现了**两次**！

## 问题原因

### 数据流分析

1. **JSON同步阶段**
   ```json
   {
     "character": "角色A",
     "characterPrompt": "角色A穿着浅棕色围裙...表情柔和且带着微笑。"
   }
   ```
   同步时将`characterPrompt`存储到了`StudioShot.actionPrompt`

2. **角色提取阶段**
   同样的`characterPrompt`被存储到了`StudioCharacter.appearancePrompt`

3. **Prompt构建阶段**
   ```typescript
   // 添加角色外观
   if (sc.character?.appearancePrompt) {
     parts.push(sc.character.appearancePrompt)  // 第1次
   }

   // 添加镜头动作
   if (shot.actionPrompt) {
     parts.push(shot.actionPrompt)  // 第2次（实际是相同内容）
   }
   ```

### 根本原因

**数据架构混淆**：
- `StudioCharacter.appearancePrompt` - 应该存储角色的**通用外观**
- `StudioShotCharacter.action` - 应该存储角色在**此镜头的具体动作**
- `StudioShot.actionPrompt` - 应该存储**镜头级别的动作描述**

但在同步时，将JSON的`characterPrompt`（既包含外观又包含动作）错误地存储到了`actionPrompt`，导致重复。

## 解决方案

### 1. 数据存储优化

**修改前**：
```typescript
// 将characterPrompt存储到StudioShot.actionPrompt（错误）
await ctx.db.studioShot.update({
  data: {
    actionPrompt: shotData.characterPrompt,  // ❌ 会导致重复
  },
})
```

**修改后**：
```typescript
// 将characterPrompt存储到StudioShotCharacter.action（正确）
await ctx.db.studioShotCharacter.create({
  data: {
    action: shotData.characterPrompt,  // ✅ 存储在角色关联表
  },
})
```

### 2. Prompt构建优化

**修改前**：
```typescript
// 1. 添加全局设定
// 2. 添加角色通用外观
shot.characters?.forEach((sc) => {
  if (sc.character?.appearancePrompt) {
    parts.push(sc.character.appearancePrompt)  // ❌
  }
})
// 3. 添加场景描述
// 4. 添加镜头动作（包含重复的角色描述）
if (shot.actionPrompt) parts.push(shot.actionPrompt)  // ❌
```

**修改后**：
```typescript
// 1. 添加全局设定
// 2. 添加场景描述（提前）
if (shot.scenePrompt) parts.push(shot.scenePrompt)

// 3. 添加角色在此镜头的具体描述
shot.characters?.forEach((sc) => {
  if (sc.action) {
    parts.push(sc.action)  // ✅ 优先使用镜头特定动作
  } else if (sc.character?.appearancePrompt) {
    parts.push(sc.character.appearancePrompt)  // ✅ 后备方案
  }
})

// 4. 添加镜头其他动作
if (shot.actionPrompt) parts.push(shot.actionPrompt)
```

## 数据架构说明

### 正确的数据分层

```
StudioCharacter (角色库)
├─ appearancePrompt: "通用外观描述"
└─ 例如: "女性面包师，30岁左右，友好的笑容"

StudioShotCharacter (镜头中的角色)
├─ action: "在此镜头的具体动作和表情"
├─ dialogue: "台词"
└─ 例如: "穿着浅棕色围裙，双手放在柜台上，表情柔和且带着微笑"

StudioShot (镜头)
├─ scenePrompt: "场景环境描述"
├─ actionPrompt: "镜头级别的动作描述"
└─ cameraPrompt: "镜头运动描述"
```

### JSON字段映射

| JSON字段 | 正确映射 | 错误映射（旧） |
|---------|---------|--------------|
| character | StudioCharacter (匹配) | ✅ |
| characterPrompt | **StudioShotCharacter.action** | ~~StudioShot.actionPrompt~~ ❌ |
| scenePrompt | StudioShot.scenePrompt | ✅ |
| dialogue | StudioShotCharacter.dialogue | ✅ |

## 修复效果

### 修复前

```
完整Prompt:
角色A外观, 场景描述, 角色A外观（重复）, 镜头运动
```

### 修复后

```
完整Prompt:
全局风格, 场景描述, 角色A在此镜头的动作, 镜头运动
```

### 具体示例

**修复前**：
```
角色A穿着浅棕色围裙配白衬衫、系着温暖色调的头巾，双手放在柜台上，表情柔和且带着微笑。,
明亮的面包店柜台前，木质展架上整齐陈列着各种形状和颜色的面包，空气中弥漫着新鲜烘焙的香气。,
角色A穿着浅棕色围裙配白衬衫、系着温暖色调的头巾，双手放在柜台上，表情柔和且带着微笑。
```

**修复后**：
```
明亮的面包店柜台前，木质展架上整齐陈列着各种形状和颜色的面包，空气中弥漫着新鲜烘焙的香气。,
角色A穿着浅棕色围裙配白衬衫、系着温暖色调的头巾，双手放在柜台上，表情柔和且带着微笑。
```

更简洁，没有重复！

## 优化顺序

调整了Prompt的组合顺序，使其更符合图像生成的最佳实践：

1. **全局风格设定** - 整体氛围
2. **场景描述** - 环境背景
3. **角色动作** - 人物状态
4. **镜头运动** - 相机设置

## 相关文件

- 后端同步逻辑：[src/server/api/routers/studio.ts:1515-1593](src/server/api/routers/studio.ts#L1515-L1593)
- 前端Prompt构建：[src/components/studio/ShotsTab.tsx:93-124](src/components/studio/ShotsTab.tsx#L93-L124)

## 向后兼容

- ✅ 已有的手动创建的镜头不受影响
- ✅ 如果`StudioShotCharacter.action`为空，会回退到使用`appearancePrompt`
- ✅ `StudioShot.actionPrompt`仍可手动填写，用于镜头级别的动作描述

## 测试建议

1. **新建镜头同步**
   - 执行"从目标同步"
   - 检查Prompt是否无重复
   - 确认角色动作已正确存储

2. **已有镜头更新**
   - 对已有镜头执行同步
   - 验证数据正确更新
   - 确认Prompt构建正确

3. **手动编辑兼容性**
   - 手动添加角色到镜头
   - 验证Prompt构建是否正常
   - 确认后备逻辑生效

## 更新日志

### v1.2 (2025-10-19)
- 🐛 修复：Prompt重复问题
- 🎨 优化：数据存储架构
- 🎨 优化：Prompt组合顺序
- 📝 文档：添加数据架构说明
