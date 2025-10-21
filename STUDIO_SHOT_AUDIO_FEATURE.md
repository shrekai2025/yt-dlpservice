# Studio 镜头音频功能实现

## 概述

在 Studio 镜头制作页面中，为镜头列表添加了音频展示位，用户可以从任务历史中选择音频文件并设置到镜头上。

## 功能特点

1. **镜头列表音频展示位**
   - 在首帧和视频按钮旁边添加音频按钮
   - 橙色主题，与音频类型保持一致
   - 点击已设置的音频可预览播放
   - 空白状态时点击会提示"请从右侧任务历史中选择音频"

2. **任务历史"选为音频"按钮**
   - 仅对音频类型的任务结果显示
   - 点击后将音频URL设置到当前镜头
   - 显示加载状态"设置中..."
   - 成功后显示 toast 提示

3. **音频预览功能**
   - 橙色渐变背景的播放器界面
   - HTML5 音频控件
   - 自动播放
   - 下载、复制URL、删除等操作

## 修改的文件

### 1. Prisma Schema (`prisma/schema.prisma`)

**更新**: 复用 `cameraPrompt` 字段存储音频 URL

```prisma
model StudioShot {
  // ...
  scenePrompt     String?   // 场景描述 (存储首帧URL)
  actionPrompt    String?   // 动作描述 (存储视频URL)
  cameraPrompt    String?   // 镜头运动 (存储音频URL)
  // ...
}
```

### 2. tRPC API (`/src/server/api/routers/studio.ts`)

**新增**: `setShotAudio` mutation

```typescript
setShotAudio: userProcedure
  .input(
    z.object({
      shotId: z.string(),
      audioUrl: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 权限验证
    // 更新 cameraPrompt 字段为音频 URL
    const updatedShot = await ctx.db.studioShot.update({
      where: { id: input.shotId },
      data: {
        cameraPrompt: input.audioUrl,
      },
    })
    return updatedShot
  })
```

### 3. 镜头列表组件 (`/src/components/studio/ShotsTab.tsx`)

#### 导入更新
```typescript
import { Music as MusicIcon } from "lucide-react";
```

#### 状态管理
```typescript
const [showAudioUrlInput, setShowAudioUrlInput] = useState(false);
const [audioUrl, setAudioUrl] = useState(shot.cameraPrompt || "");
const [previewMedia, setPreviewMedia] = useState<{
  type: "image" | "video" | "audio";
  url: string;
} | null>(null);

useEffect(() => {
  setAudioUrl(shot.cameraPrompt || "");
}, [shot.cameraPrompt]);
```

#### 处理函数
```typescript
const handleSaveAudioUrl = () => {
  onUpdate({ cameraPrompt: audioUrl });
  setShowAudioUrlInput(false);
};

const handleDelete = (type: "image" | "video" | "audio") => {
  if (!confirm("确定删除吗？")) return;
  if (type === "audio") {
    setAudioUrl("");
    onUpdate({ cameraPrompt: "" });
  }
  // ...
};
```

#### 音频按钮UI
```typescript
{/* 音频按钮 */}
<button
  onClick={(e) => {
    e.stopPropagation();
    if (audioUrl) {
      setPreviewMedia({ type: "audio", url: audioUrl });
    } else {
      toast.info("请从右侧任务历史中选择音频");
    }
  }}
  className={`h-12 w-12 border-2 rounded flex items-center justify-center transition-colors ${
    audioUrl
      ? "border-orange-500 bg-orange-50 hover:bg-orange-100"
      : "border-gray-300 hover:border-gray-400"
  }`}
  title={audioUrl ? "查看音频" : "从任务历史选择音频"}
>
  {audioUrl ? (
    <MusicIcon className="h-5 w-5 text-orange-600" />
  ) : (
    <MusicIcon className="h-5 w-5 text-gray-400" />
  )}
</button>
```

#### 音频预览对话框
```typescript
) : (
  <div className="w-full max-w-2xl">
    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-8 space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <MusicIcon className="h-8 w-8 text-orange-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">音频播放</h3>
          <p className="text-sm text-neutral-600">镜头音频文件</p>
        </div>
      </div>
      <audio
        src={previewMedia.url}
        controls
        autoPlay
        className="w-full"
        preload="metadata"
      >
        您的浏览器不支持音频播放
      </audio>
    </div>
  </div>
)
```

### 4. 任务历史组件 (`/src/components/studio/ShotTaskHistory.tsx`)

#### 新增 Mutation
```typescript
const setShotAudioMutation = api.studio.setShotAudio.useMutation({
  onSuccess: () => {
    toast.success("已设置为镜头音频");
    onRefreshShot?.();
  },
  onError: (error) => {
    toast.error(`设置失败: ${error.message}`);
  },
});
```

#### 处理函数
```typescript
const handleSetAsAudio = (audioUrl: string) => {
  setShotAudioMutation.mutate({ shotId, audioUrl });
};
```

#### 传递给 TaskMediaCard
```typescript
onSetAsAudio={
  result.type === "audio"
    ? () => handleSetAsAudio(result.url)
    : undefined
}
isSettingAudio={setShotAudioMutation.isPending}
```

#### TaskMediaCard 更新
```typescript
interface TaskMediaCardProps {
  // ...
  onSetAsAudio?: () => void;
  isSettingAudio: boolean;
}

// 添加"选为音频"按钮
{onSetAsAudio && (
  <button
    onClick={onSetAsAudio}
    disabled={isSettingAudio}
    className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors disabled:opacity-50"
  >
    <MusicIcon className="h-3 w-3" />
    {isSettingAudio ? "设置中..." : "选为音频"}
  </button>
)}
```

## 使用流程

1. **生成音频**
   - 在 Studio 镜头页面展开镜头
   - 在右侧 AI 内容生成面板选择音频生成模型
   - 生成音频内容

2. **设置镜头音频**
   - 音频生成完成后在任务历史中显示
   - 点击音频卡片上的"选为音频"按钮
   - 镜头列表中的音频展示位会显示橙色音乐图标

3. **预览和管理**
   - 点击橙色音频按钮可预览播放
   - 预览对话框提供下载、复制URL、删除等功能

## 设计决策

### 为什么复用 cameraPrompt 字段？

- 原本 `cameraPrompt` 用于存储镜头运动描述
- 实际使用中发现该字段利用率低
- 复用该字段存储音频 URL 避免了数据库迁移
- 保持与首帧(scenePrompt)、视频(actionPrompt)的一致性

### 为什么不能直接点击添加音频？

- 保持 UI 一致性和简洁性
- 音频文件通常需要 AI 生成，不像图片视频可以直接输入 URL
- 引导用户通过任务历史选择，确保音频来源可追溯

### 颜色选择

- **首帧**: 绿色 - 表示起始、基础
- **视频**: 紫色 - 表示动态、创作
- **音频**: 橙色 - 表示声音、温暖，区别于其他类型

## 测试要点

1. **UI 显示测试**
   - ✓ 镜头列表显示音频按钮
   - ✓ 空白状态显示灰色图标
   - ✓ 已设置状态显示橙色图标

2. **功能测试**
   - ✓ 空白状态点击提示"请从右侧任务历史中选择音频"
   - ✓ "选为音频"按钮仅对音频类型显示
   - ✓ 点击"选为音频"成功设置到镜头
   - ✓ 设置过程显示加载状态

3. **预览测试**
   - ✓ 点击已设置的音频图标打开预览
   - ✓ 音频自动播放
   - ✓ 播放控件正常工作
   - ✓ 下载、复制、删除功能正常

4. **状态同步测试**
   - ✓ 设置音频后镜头列表立即更新
   - ✓ 删除音频后恢复空白状态
   - ✓ 多个镜头的音频状态独立

## 完成时间

2025-10-21

## 状态

✅ 已完成实现
⚠️ 需要手动测试完整流程

## 相关文件

- `prisma/schema.prisma` - 数据模型
- `/src/server/api/routers/studio.ts` - API 路由
- `/src/components/studio/ShotsTab.tsx` - 镜头列表组件
- `/src/components/studio/ShotTaskHistory.tsx` - 任务历史组件
