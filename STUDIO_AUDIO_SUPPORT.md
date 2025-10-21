# Studio 镜头制作 - 音频支持更新

## 概述

在 Studio 的镜头制作页面中，为任务历史组件添加了对音频内容的完整支持，包括：
- 音频生成中的占位卡片显示
- 音频结果的缩略图展示
- 音频预览对话框
- 下载功能

## 修改文件

### `/src/components/studio/ShotTaskHistory.tsx`

#### 1. 导入更新
```typescript
// 新增 MusicIcon 图标
import {
  Trash2,
  Image as ImageIcon,
  Film as FilmIcon,
  Music as MusicIcon,  // 新增
  Copy,
  Sparkles,
  Eye,
} from "lucide-react";
```

#### 2. 状态管理
```typescript
// 新增音频预览状态
const [previewAudio, setPreviewAudio] = useState<string | null>(null);
```

#### 3. 类型定义更新
```typescript
// tasksWithMedia 过滤逻辑中支持 audio 类型
result is { type: "image" | "video" | "audio"; url: string }

// TaskMediaCardProps 接口更新
result: { type: "image" | "video" | "audio"; url: string };
```

#### 4. 音频缩略图显示
在 `TaskMediaCard` 组件中添加音频类型的渲染逻辑：
```typescript
) : result.type === "video" ? (
  // 视频缩略图...
) : (
  // 音频缩略图
  <button
    onClick={onPreview}
    className="flex h-full w-full cursor-pointer items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-colors"
    title="点击播放音频"
  >
    <MusicIcon className="h-10 w-10 text-purple-600" />
  </button>
)
```

#### 5. 音频预览对话框
添加完整的音频预览对话框，功能包括：
- 紫色主题的音频播放器界面
- 自动播放
- 在新标签页打开
- 下载音频文件

```typescript
{/* 音频预览对话框 */}
<Dialog
  open={Boolean(previewAudio)}
  onOpenChange={(open) => {
    if (!open) setPreviewAudio(null);
  }}
>
  <DialogContent className="max-w-lg">
    <DialogTitle className="sr-only">音频预览</DialogTitle>
    {previewAudio && (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
            <MusicIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">音频播放</h3>
            <p className="text-sm text-neutral-600">生成的语音文件</p>
          </div>
        </div>
        <div className="rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-4">
          <audio
            src={previewAudio}
            controls
            autoPlay
            className="w-full"
            preload="metadata"
          >
            您的浏览器不支持音频播放
          </audio>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1"
            onClick={() => window.open(previewAudio, "_blank")}>
            在新标签页打开
          </Button>
          <Button variant="outline" size="sm" className="flex-1"
            onClick={() => {/* 下载逻辑 */}}>
            下载音频
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

#### 6. 处理中任务的占位卡片支持
更新 `TaskPlaceholderCard` 组件以根据输出类型显示不同的样式：

**新增参数**：
```typescript
outputType: string  // 从任务对象获取
```

**音频类型特殊显示**：
- 紫色主题渐变背景（`from-purple-50 to-blue-50`）
- MusicIcon 图标带脉动动画
- 紫色进度条
- 紫色文字

**效果**：
- **音频任务**：紫色主题 + 音乐图标
- **视频任务**：橙色主题 + 旋转圆圈
- **图片任务**：蓝色主题 + 旋转圆圈

## 功能特性

### 1. 音频生成中状态
- 紫色渐变背景卡片
- 音乐图标脉动动画
- 进度百分比显示
- 紫色进度条

### 2. 音频生成完成
- 紫色渐变缩略图
- 音乐图标居中显示
- 点击预览功能

### 3. 音频预览对话框
- 完整的 HTML5 音频播放器
- 自动播放
- 播放控制（播放/暂停、进度条、音量）
- 在新标签页打开按钮
- 下载音频文件按钮

## UI 设计一致性

与主 AI 生成页面的音频显示保持一致：
- 相同的紫色主题配色
- 相同的 MusicIcon 图标
- 相同的预览对话框布局
- 相同的下载功能

## 测试建议

1. **生成中状态测试**：
   - 创建 ElevenLabs TTS 任务
   - 观察紫色占位卡片和音乐图标动画
   - 确认进度百分比正确显示

2. **完成状态测试**：
   - 等待音频生成完成
   - 确认紫色音频缩略图正确显示
   - 点击缩略图测试预览功能

3. **预览对话框测试**：
   - 确认音频自动播放
   - 测试播放控制功能
   - 测试"在新标签页打开"按钮
   - 测试"下载音频"按钮

## 相关文件

- `/src/components/studio/ShotTaskHistory.tsx` - 主要修改文件
- `/src/app/admin/ai-generation/tasks/task-history-section.tsx` - 参考实现
- `/src/lib/ai-generation/adapters/elevenlabs/elevenlabs-tts-adapter.ts` - 音频生成适配器

## 完成时间

2025-10-21

## 状态

✅ 已完成并通过编译检查
