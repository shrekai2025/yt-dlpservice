# Studio一键TTS功能测试指南

## 前置条件检查

### 1. 检查数据库Schema是否正确
```bash
# 检查 StudioCharacter 是否有 voiceId 字段
sqlite3 data/app.db "PRAGMA table_info(studio_characters);" | grep voiceId
```

### 2. 检查MediaActor的voiceId数据
```bash
# 查看演员表中的voice ID
sqlite3 data/app.db "SELECT id, name, voiceId FROM media_actors WHERE voiceId IS NOT NULL;"
```

预期结果：
```
cmgxnawvs000v328cw4rnzb43|Anya|jqcCZkN6Knx8BJ5TBdYR
cmgxndtyl000x328c9cjush5j|Jack Miller|UgBBYS2sOqTuMpoF3BR0
cmgxnzakm001b328cswbii8h9|Emily Carter|xctasy8XvGp2cVO9HL9k
```

## 功能测试步骤

### 测试1: 角色关联演员时同步voiceId

1. 打开浏览器访问：http://localhost:3000/admin/ai-generation/studio
2. 进入任意项目
3. 进入任意Episode
4. 切换到"角色"Tab
5. 点击"从演员表导入"或"关联演员"
6. 选择一个有voice ID的演员（Anya、Jack Miller 或 Emily Carter）
7. 在数据库中验证：
   ```bash
   sqlite3 data/app.db "SELECT id, name, voiceId, sourceActorId FROM studio_characters ORDER BY createdAt DESC LIMIT 5;"
   ```
   **预期结果**：新创建的角色应该有voiceId字段，且值与演员的voiceId相同

### 测试2: 刷新角色数据同步voiceId

1. 在角色Tab中，对已关联演员的角色点击"刷新"按钮
2. 在数据库中验证voiceId是否更新：
   ```bash
   sqlite3 data/app.db "SELECT name, voiceId FROM studio_characters WHERE sourceActorId IS NOT NULL;"
   ```

### 测试3: 一键TTS生成（成功场景）

**前置条件**：
- Episode中有镜头
- 镜头中有角色
- 角色有台词（dialogue字段）
- 角色已关联演员且有voiceId

**操作步骤**：
1. 进入"镜头制作"Tab
2. 确认页面上有镜头，且镜头有角色和台词
3. 点击"一键TTS"按钮（默认使用英语）
4. 确认提示对话框，点击确定
5. 观察toast提示消息

**预期结果**：
- Toast显示成功消息，如："成功创建 X 个TTS生成任务，它们将自动开始处理。"
- 在数据库中验证任务已创建：
  ```bash
  sqlite3 data/app.db "SELECT id, shotId, prompt, status, parameters FROM ai_generation_tasks WHERE prompt IS NOT NULL ORDER BY createdAt DESC LIMIT 5;"
  ```
- 任务状态应为"PENDING"
- parameters字段应包含custom_voice_id

### 测试4: 一键TTS生成（语言选择）

1. 点击"一键TTS"右侧的下拉箭头
2. 在下拉菜单中选择"中文"
3. 确认生成

**预期结果**：
- 任务的parameters中language字段应为"zh"
- 验证：
  ```bash
  sqlite3 data/app.db "SELECT parameters FROM ai_generation_tasks ORDER BY createdAt DESC LIMIT 1;"
  ```

### 测试5: 错误处理 - 角色没有voiceId

**准备**：创建一个没有关联演员的角色，并给它添加台词

1. 点击"一键TTS"按钮
2. 观察错误提示

**预期结果**：
- 应显示错误alert：`镜头 X 中的角色"XXX"没有关联演员或演员没有Voice ID。请先为演员配置Voice ID。`

### 测试6: 错误处理 - 没有镜头

1. 在一个空的Episode中（没有镜头）
2. "一键TTS"按钮应该是禁用状态（灰色）

### 测试7: 错误处理 - 没有台词

**准备**：确保所有角色都没有台词（dialogue为空）

1. 点击"一键TTS"按钮
2. 观察错误提示

**预期结果**：
- 应显示错误消息：`没有找到可以生成TTS的台词。请确保镜头中的角色有台词且已关联演员。`

## 验证TTS任务执行

### 检查任务处理器是否正常工作

```bash
# 查看最近的任务状态
sqlite3 data/app.db "SELECT id, status, errorMessage FROM ai_generation_tasks ORDER BY createdAt DESC LIMIT 10;"
```

**任务状态流转**：
- PENDING → PROCESSING → SUCCESS (或 FAILED)

### 检查生成的音频文件

```bash
# 查看生成的音频文件
ls -lht public/ai-generated/audio/ | head -20
```

### 验证任务关联到镜头

```bash
# 查看任务与镜头的关联
sqlite3 data/app.db "
SELECT
  t.id as task_id,
  s.shotNumber,
  t.prompt,
  t.status,
  json_extract(t.parameters, '$.custom_voice_id') as voice_id
FROM ai_generation_tasks t
JOIN studio_shots s ON t.shotId = s.id
ORDER BY s.shotNumber, t.createdAt;
"
```

## 常见问题排查

### 问题1: 点击"一键TTS"没有反应

**检查**：
1. 打开浏览器开发者工具 (F12)
2. 查看Console标签是否有错误
3. 查看Network标签，看API请求是否发送

**可能原因**：
- Prisma Client未重新生成
- 开发服务器需要重启

**解决方案**：
```bash
npx prisma generate
pkill -f "next dev"
npm run dev
```

### 问题2: API返回错误

**检查服务器日志**：
- 在运行`npm run dev`的终端查看错误信息

**常见错误**：
- "ElevenLabs TTS 模型未配置" → 需要在AI生成 > 供应商中配置ElevenLabs
- "角色不存在" → 数据库数据不一致
- "未授权" → 检查API key配置

### 问题3: 任务创建成功但一直是PENDING状态

**检查**：
1. 任务处理器是否正在运行
2. ElevenLabs API key是否配置正确
3. 查看错误日志：
   ```bash
   sqlite3 data/app.db "SELECT * FROM error_logs WHERE source LIKE '%TTS%' ORDER BY createdAt DESC LIMIT 5;"
   ```

## 数据库清理（如果需要重新测试）

```bash
# 删除所有TTS任务
sqlite3 data/app.db "DELETE FROM ai_generation_tasks WHERE modelId IN (SELECT id FROM ai_models WHERE slug = 'elevenlabs-tts-v3');"

# 清空角色的voiceId（谨慎使用）
sqlite3 data/app.db "UPDATE studio_characters SET voiceId = NULL;"
```

## 成功标准

✅ 所有测试通过
✅ 角色导入/关联时voiceId自动同步
✅ 一键TTS能成功创建任务
✅ 任务正确关联到镜头
✅ 语言选择功能正常
✅ 错误处理提示清晰准确
✅ 任务能被处理器执行并生成音频
