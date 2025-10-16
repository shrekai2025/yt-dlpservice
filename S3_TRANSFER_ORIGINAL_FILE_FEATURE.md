# S3转存原文件功能

## 功能概述

为S3转存功能新增**选择文件类型**的能力,用户可以选择:
1. **不转存** (默认) - 不上传到S3
2. **转存压缩文件** - 上传经过压缩后的文件
3. **转存原文件** - 上传未经压缩的原始文件

## 修改内容

### 1. 数据库Schema修改

**文件**: `prisma/schema.prisma`

新增字段:
- `originalVideoPath` - 压缩前的原始视频路径
- `originalAudioPath` - 压缩前的原始音频路径
- `s3TransferFileType` - S3转存文件类型 (none/compressed/original)

```prisma
// 文件路径
videoPath     String?
audioPath     String?
originalVideoPath String? // 新增
originalAudioPath String? // 新增

// S3转存相关
s3Url         String?
s3TransferStatus String? @default("none")
s3TransferFileType String? @default("none") // 新增
s3TransferProgress String?
s3TransferredAt DateTime?
```

### 2. Validation Schema修改

**文件**: `src/lib/utils/validation.ts`

- 移除: `transferToS3: z.boolean()`
- 新增: `s3TransferFileType: z.enum(['none', 'compressed', 'original']).default('none')`

### 3. 前端UI修改

**文件**: `src/app/admin/page.tsx`

将复选框改为三个单选按钮:

```tsx
<div className="grid gap-2 sm:grid-cols-3">
  {[
    { value: 'none', label: '不转存', desc: '不上传到 S3' },
    { value: 'compressed', label: '转存压缩文件', desc: '上传压缩后的文件' },
    { value: 'original', label: '转存原文件', desc: '上传未压缩的原始文件' }
  ].map((option) => (
    <button key={option.value} onClick={() => setS3TransferFileType(option.value)}>
      {option.label}
      <div>{option.desc}</div>
    </button>
  ))}
</div>
```

### 4. 任务创建逻辑修改

**文件**:
- `src/server/api/routers/task.ts`
- `src/app/api/external/tasks/route.ts`

修改任务创建逻辑,根据 `s3TransferFileType` 设置初始状态:

```typescript
s3TransferFileType: input.s3TransferFileType,
s3TransferStatus: input.s3TransferFileType !== 'none' ? 'pending' : 'none',
s3TransferProgress: input.s3TransferFileType !== 'none' ? '等待任务完成后转存' : '未启用'
```

### 5. 压缩流程修改

**文件**: `src/lib/services/task-processor.ts`

#### 关键修改点:

1. **保存原始文件路径**:
```typescript
await db.task.update({
  where: { id: taskId },
  data: {
    // ... 压缩统计信息 ...
    originalAudioPath: audioPath  // 保存原始路径
  }
})
```

2. **条件性删除原文件**:
```typescript
// 检查是否需要保留原文件
const task = await db.task.findUnique({
  where: { id: taskId },
  select: { s3TransferFileType: true }
})
const needOriginalFile = task?.s3TransferFileType === 'original'

if (needOriginalFile) {
  Logger.info(`📦 保留原始文件用于S3转存: ${audioPath}`)
} else {
  await fs.unlink(audioPath)  // 删除原文件
}
```

### 6. S3转存服务修改

**文件**: `src/lib/services/s3-transfer.ts`

#### 智能文件选择逻辑:

```typescript
// 获取任务信息
const task = await db.task.findUnique({
  where: { id: taskId },
  select: {
    s3TransferFileType: true,
    originalVideoPath: true,
    originalAudioPath: true,
    videoPath: true,
    audioPath: true
  }
})

// 根据用户选择决定上传哪个文件
let actualFilePath = filePath
if (task?.s3TransferFileType === 'original') {
  const originalPath = task.originalVideoPath || task.originalAudioPath
  if (originalPath) {
    try {
      await fs.access(originalPath)
      actualFilePath = originalPath
      Logger.info(`使用原始文件进行S3转存: ${originalPath}`)
    } catch {
      Logger.warn(`原始文件不存在,使用当前文件: ${filePath}`)
    }
  }
}
```

#### 上传后清理:

```typescript
// 如果上传的是原文件,上传完成后删除它
if (task?.s3TransferFileType === 'original' && actualFilePath !== filePath) {
  try {
    await fs.unlink(actualFilePath)
    Logger.info(`🗑️ S3转存完成,已删除原始文件: ${actualFilePath}`)
  } catch (error) {
    Logger.warn(`清理原始文件失败: ${error}`)
  }
}
```

## 工作流程

### 场景1: 转存压缩文件

1. 用户创建任务,选择"转存压缩文件"
2. 下载媒体 → `audioPath` = `/downloads/task123/audio.mp3`
3. 压缩音频:
   - 保存 `originalAudioPath` = `/downloads/task123/audio.mp3`
   - 压缩后 `audioPath` = `/downloads/task123/audio_compressed.mp3`
   - 删除原文件 `/downloads/task123/audio.mp3`
4. 转录使用压缩文件
5. S3转存上传 `/downloads/task123/audio_compressed.mp3`

### 场景2: 转存原文件

1. 用户创建任务,选择"转存原文件"
2. 下载媒体 → `audioPath` = `/downloads/task123/audio.mp3`
3. 压缩音频:
   - 保存 `originalAudioPath` = `/downloads/task123/audio.mp3`
   - 压缩后 `audioPath` = `/downloads/task123/audio_compressed.mp3`
   - **保留原文件** `/downloads/task123/audio.mp3` (因为需要转存)
4. 转录使用压缩文件
5. S3转存上传 `/downloads/task123/audio.mp3` (原文件)
6. 上传成功后删除原文件

### 场景3: 不压缩的文件

如果文件不需要压缩(如本身就很小或压缩设置为none):
- `audioPath` = `/downloads/task123/audio.mp3`
- `originalAudioPath` 不设置或为 null
- 转存时使用 `audioPath`

## 文件生命周期管理

| 阶段 | 压缩文件 | 原文件 | 说明 |
|------|---------|--------|------|
| 下载完成 | - | ✓ 存在 | 下载的原始文件 |
| 压缩完成 (转存压缩) | ✓ 存在 | ❌ 已删除 | 节省磁盘空间 |
| 压缩完成 (转存原文件) | ✓ 存在 | ✓ 保留 | 等待S3上传 |
| S3上传完成 (压缩) | ✓ 存在 | - | 本地保留压缩文件 |
| S3上传完成 (原文件) | ✓ 存在 | ❌ 删除 | 上传后清理 |

## 优势

1. **节省成本** - 压缩文件更小,S3存储成本更低
2. **保留质量** - 需要高质量媒体时可选择原文件
3. **磁盘优化** - 原文件在S3上传后立即删除,节省本地磁盘空间
4. **灵活性** - 用户可根据实际需求选择
5. **向后兼容** - 默认"不转存",不影响现有逻辑

## API使用示例

### tRPC API

```typescript
await api.task.create.mutateAsync({
  url: 'https://youtube.com/watch?v=xxx',
  downloadType: 'AUDIO_ONLY',
  compressionPreset: 'standard',
  s3TransferFileType: 'original'  // 'none' | 'compressed' | 'original'
})
```

### 外部 REST API

```bash
curl -X POST http://localhost:3000/api/external/tasks \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtube.com/watch?v=xxx",
    "downloadType": "AUDIO_ONLY",
    "compressionPreset": "standard",
    "s3TransferFileType": "original"
  }'
```

## 注意事项

1. **原文件可用性**: 如果选择转存原文件但原文件已被删除(如系统清理),会回退到使用当前可用文件
2. **无压缩场景**: 如果没有进行压缩,`originalAudioPath`为空,转存时使用`audioPath`
3. **并行处理**: S3转存在后台异步执行,不阻塞转录流程
4. **错误处理**: 原文件删除失败不会影响主流程,只记录警告日志
5. **存储显示**: 转存的文件会同时显示在任务列表和 `/admin/storage` 页面

## 测试建议

1. 测试三种模式:
   - 不转存
   - 转存压缩文件
   - 转存原文件

2. 验证文件大小:
   - 压缩文件应该更小
   - 原文件保持原始大小

3. 检查磁盘清理:
   - 转存原文件后,原文件应被删除
   - 转存压缩文件后,压缩文件仍保留

4. 测试边界情况:
   - 无需压缩的文件
   - 压缩失败的情况
   - S3未配置的情况
