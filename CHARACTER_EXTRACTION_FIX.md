# 角色提取问题修复

## 问题描述
重新生成目标时，角色库没有跟随更新。

## 根本原因
1. 生成目标后，数据只保存在前端 state 中，**没有自动保存到数据库**
2. `extractCharactersFromObjective` API 需要从数据库的 `episode.objective` 字段读取数据
3. 因此角色提取时读取到的是旧数据或空数据

## 修复方案

### 原来的流程（错误）
```
1. 用户点击生成
2. LLM 返回结果
3. 保存到前端 state (objective)
4. 500ms 后触发角色提取
5. ❌ 角色提取从数据库读取，但数据库还是旧数据
```

### 修复后的流程（正确）
```
1. 用户点击生成
2. LLM 返回结果
3. 保存到前端 state (objective)
4. 设置标记 shouldExtractCharacters = true
5. 立即保存到数据库 (updateMutation)
6. 保存成功后，检查标记
7. ✅ 如果标记为 true，触发角色提取
8. 角色提取从数据库读取到最新数据
```

## 代码修改

### 文件: `src/components/studio/ObjectiveTab.tsx`

#### 1. 新增状态标记
```typescript
const [shouldExtractCharacters, setShouldExtractCharacters] = useState(false)
```

#### 2. 更新 updateMutation
```typescript
const updateMutation = api.studio.updateEpisode.useMutation({
  onSuccess: () => {
    setIsSaving(false)
    setIsGenerating(false)
    onSave?.()

    // 如果是生成后自动保存，触发角色提取
    if (shouldExtractCharacters) {
      setShouldExtractCharacters(false)
      setTimeout(() => {
        extractCharactersMutation.mutate({ episodeId })
      }, 300)
    }
  },
  onError: () => {
    setIsSaving(false)
    setIsGenerating(false)
    setShouldExtractCharacters(false)
  },
})
```

#### 3. 更新 generateMutation
```typescript
const generateMutation = api.chat.sendMessage.useMutation({
  onSuccess: (data) => {
    console.log('[ObjectiveTab] Generate success:', data)
    setObjective(data.reply)
    setShowSuccessMessage(true)
    setTimeout(() => setShowSuccessMessage(false), 3000)

    // 设置标记，表示保存成功后需要提取角色
    setShouldExtractCharacters(true)

    // 先保存到数据库，再触发角色提取
    updateMutation.mutate({
      episodeId,
      objective: data.reply.trim() || undefined,
      objectiveLLM: JSON.stringify({
        provider: selectedProvider,
        model: selectedModel,
      }),
    })
  },
  onError: (error) => {
    console.error('[ObjectiveTab] Generate error:', error)
    setIsGenerating(false)
    alert(`生成失败: ${error.message}`)
  },
})
```

## 测试验证

### 测试步骤
1. 在 Studio 页面，进入"目标确定"tab
2. 输入原始素材和核心要点
3. 点击"生成目标"
4. 等待生成完成
5. 切换到"背景设定"tab，查看角色库
6. ✅ 应该看到从目标中提取的角色
7. 修改原始素材，重新生成目标
8. ✅ 角色库应该自动更新

### 预期结果
- 生成目标后，角色库自动更新
- 可以在控制台看到以下日志：
  ```
  [ObjectiveTab] Generate success: {...}
  [ObjectiveTab] Extract characters success: {characters: [...], created: X, updated: Y}
  ```
- UI 显示成功消息：`已提取 X 个角色（新建 Y 个，更新 Z 个）`

## 相关文件
- `src/components/studio/ObjectiveTab.tsx` - 目标确定组件
- `src/server/api/routers/studio.ts` - Studio API (extractCharactersFromObjective)

## 修复日期
2025-10-19

## 注意事项
- 确保数据库保存完成后再提取角色（300ms 延迟）
- 错误处理：如果保存失败，清除标记，不触发角色提取
- 只在自动保存（生成后）时触发角色提取，手动保存不触发
