# Studio 音频扩展功能 - 使用指南

## ✨ 功能概述

音频扩展功能允许为镜头的音频文件前后各增加2秒静音，使音频时长变长，方便后续视频编辑和对齐。

### 主要功能：
1. **批量扩展音频**：自动处理所有有音频的镜头
2. **防重复扩展**：已扩展的音频不会重复处理
3. **下载扩展音频**：在音频预览中可以下载扩展后的音频
4. **自动清理**：当原音频被删除或更改时，扩展音频自动删除
5. **批量清理**：一键清理所有扩展音频文件

## 📁 数据结构

### StudioShot 新增字段
```prisma
model StudioShot {
  // ... 其他字段
  cameraPrompt     String?  // 原始音频URL
  extendedAudioUrl String?  // 扩展后的音频URL (前后各+2秒)
}
```

## 🎯 使用流程

### 1. 扩展音频

在 **镜头制作** Tab页面，点击 **音频扩长度** 按钮：

```
顶部按钮区域:
[从目标同步] [一键TTS▼] [音频扩长度] [清理扩音频文件] [添加镜头]
```

**操作步骤**：
1. 点击 **音频扩长度** 按钮
2. 确认提示对话框
3. 等待处理完成
4. 查看成功提示消息

**处理逻辑**：
- 仅处理有原始音频且未扩展的镜头
- 使用 ffmpeg 在音频前后各增加 2秒 静音
- 扩展后的音频保存在 `public/ai-generated/extended-audio/` 目录
- 数据库记录扩展音频的URL

**示例提示**：
```
音频扩展完成：成功 5/5 个镜头。每个镜头的音频前后各增加了 2 和 2 秒。
```

### 2. 下载扩展音频

在音频预览面板中：

**步骤**：
1. 点击镜头卡片上的音频图标，打开预览
2. 在右侧操作区，会看到两个下载按钮：
   - **下载**：下载原始音频
   - **下载扩展音频 (+4s)**：下载扩展后的音频（绿色高亮）

**注意**：
- 下载扩展音频按钮仅在已扩展的音频预览中显示
- 按钮有绿色边框和背景，易于识别

### 3. 清理扩展音频

点击 **清理扩音频文件** 按钮：

**操作**：
1. 点击按钮
2. 确认删除对话框
3. 等待清理完成

**清理内容**：
- 删除所有扩展音频文件（磁盘文件）
- 清空数据库中的 `extendedAudioUrl` 字段
- 释放存储空间

**示例提示**：
```
已清理 5 个扩展音频文件。
```

## 🔧 技术实现

### 音频扩展服务

**文件位置**：`src/lib/services/audio-extender.ts`

**核心功能**：
```typescript
// 扩展音频
audioExtenderService.extendAudio({
  inputUrl: '/ai-generated/audio/tts-xxx.mp3',
  prefixDuration: 2,  // 前置2秒静音
  suffixDuration: 2,  // 后置2秒静音
})

// 删除扩展音频
audioExtenderService.deleteExtendedAudio(audioUrl)
```

**ffmpeg 命令**：
```bash
ffmpeg -i input.mp3 \
  -af "adelay=2000|2000,apad=pad_dur=2" \
  -c:a libmp3lame -b:a 128k \
  output.mp3
```

- `adelay`: 在开头添加延迟（毫秒）
- `apad`: 在结尾填充静音（秒）
- 输出格式：MP3, 128kbps

### API 端点

#### 1. batchExtendAudio
批量扩展音频

**输入**：
```typescript
{
  episodeId: string
  prefixDuration?: number  // 默认 2秒
  suffixDuration?: number  // 默认 2秒
}
```

**返回**：
```typescript
{
  success: boolean
  totalShots: number
  successCount: number
  results: Array<{
    shotId: string
    shotNumber: number
    success: boolean
    originalUrl: string
    extendedUrl?: string
    error?: string
  }>
  message: string
}
```

#### 2. cleanExtendedAudio
清理扩展音频

**输入**：
```typescript
{
  episodeId: string
}
```

**返回**：
```typescript
{
  success: boolean
  deletedCount: number
  message: string
}
```

### 自动清理机制

在更新镜头音频时（`updateShotAudio` API），自动触发清理：

```typescript
// 如果音频URL被清空或更改
if (shot.extendedAudioUrl &&
    (!newAudioUrl || newAudioUrl !== oldAudioUrl)) {
  // 删除扩展音频文件
  await audioExtenderService.deleteExtendedAudio(shot.extendedAudioUrl)
  // 清空数据库字段
  extendedAudioUrl = null
}
```

## 📝 使用场景

### 场景1：TTS生成后扩展

1. 使用 **一键TTS** 生成所有角色语音
2. 等待TTS任务完成
3. 点击 **音频扩长度** 批量扩展所有生成的音频
4. 在视频编辑时使用扩展后的音频，有更多空间对齐视频

### 场景2：手动上传音频后扩展

1. 手动上传音频文件到镜头
2. 点击 **音频扩长度**
3. 系统自动跳过已扩展的，只处理新上传的

### 场景3：重新生成音频

1. 删除或更换镜头的音频
2. 系统自动清理对应的扩展音频
3. 新音频可以再次扩展

## ⚠️ 注意事项

### 系统要求
- **ffmpeg** 必须已安装且在系统PATH中
- 测试 ffmpeg：`ffmpeg -version`
- macOS: `brew install ffmpeg`
- Ubuntu: `apt-get install ffmpeg`

### 存储空间
- 扩展音频文件存储在 `public/ai-generated/extended-audio/`
- 每个扩展音频大约比原文件大 10-20%
- 定期使用 **清理扩音频文件** 释放空间

### 性能考虑
- 音频扩展是串行处理（逐个处理）
- 每个音频处理时间约 1-3 秒
- 10个镜头大约需要 10-30 秒

### 错误处理
- 如果音频URL无效或文件不存在，跳过该镜头
- 处理失败的镜头会在结果中标记
- 不影响其他镜头的处理

## 🐛 故障排查

### 问题1：点击按钮没有反应

**检查**：
1. 打开浏览器开发者工具 (F12)
2. 查看 Console 是否有错误
3. 查看 Network 标签，API 请求是否发送

**解决**：
```bash
# 重新生成 Prisma Client
npx prisma generate

# 重启开发服务器
pkill -f "next dev"
npm run dev
```

### 问题2：音频扩展失败

**检查**：
1. 确认 ffmpeg 已安装：`ffmpeg -version`
2. 查看服务器日志中的错误信息
3. 确认原始音频文件可访问

**常见错误**：
- `ffmpeg: command not found` → 安装 ffmpeg
- `No such file or directory` → 音频URL无效
- `Invalid data found` → 音频文件损坏

### 问题3：扩展音频按钮不显示

**检查**：
1. 镜头是否有音频
2. 数据库中 `extendedAudioUrl` 字段是否有值
3. 预览的是否是音频类型

**验证**：
```bash
sqlite3 data/app.db "SELECT shotNumber, cameraPrompt, extendedAudioUrl FROM studio_shots WHERE episodeId = 'xxx' LIMIT 5;"
```

## 📊 测试验证

### 快速测试脚本

```bash
# 1. 检查数据库
sqlite3 data/app.db "
SELECT
  s.shotNumber,
  s.cameraPrompt IS NOT NULL as has_audio,
  s.extendedAudioUrl IS NOT NULL as has_extended
FROM studio_shots s
WHERE s.episodeId = 'your-episode-id'
ORDER BY s.shotNumber;
"

# 2. 检查扩展音频文件
ls -lh public/ai-generated/extended-audio/ | head -10

# 3. 测试音频文件
ffprobe public/ai-generated/extended-audio/extended-xxx.mp3
```

### 预期结果

**扩展前**：
- 音频时长：5.2秒
- 文件大小：83KB

**扩展后**：
- 音频时长：9.2秒 (5.2 + 2 + 2)
- 文件大小：约 100KB
- 前2秒和后2秒是静音

## 🎉 功能完整性

✅ 所有功能已实现：
- ✅ 数据库字段添加
- ✅ 音频扩展服务
- ✅ 批量扩展 API
- ✅ 清理扩展音频 API
- ✅ 音频删除时自动清理
- ✅ UI 按钮（音频扩长度）
- ✅ UI 按钮（清理扩音频文件）
- ✅ 音频预览下载扩展音频按钮
- ✅ 防重复扩展逻辑

现在可以开始使用了！🚀
