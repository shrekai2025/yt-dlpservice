"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Image as ImageIcon,
  Film as FilmIcon,
  Music as MusicIcon,
  Copy,
  Sparkles,
  Eye,
} from "lucide-react";
import { api } from "~/components/providers/trpc-provider";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/toast";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";

type ListTasksOutput =
  inferRouterOutputs<AppRouter>["aiGeneration"]["listTasks"];
export type TaskHistoryTask = ListTasksOutput["tasks"][number];

interface ShotTaskHistoryProps {
  shotId: string;
  onRefreshShot?: () => void;
  onApplyTask?: (task: TaskHistoryTask) => void;
  onConvertToVideo?: (imageUrl: string) => void;
}

export function ShotTaskHistory({
  shotId,
  onRefreshShot,
  onApplyTask,
  onConvertToVideo,
}: ShotTaskHistoryProps) {
  const router = useRouter();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const {
    data: tasksData,
    refetch,
    isFetching,
  } = api.aiGeneration.listTasks.useQuery(
    {
      shotId,
      limit: 100,
    },
    {
      staleTime: 2000,
      refetchOnWindowFocus: false,
    },
  );

  const deleteMutation = api.aiGeneration.deleteTask.useMutation({
    onSuccess: () => {
      toast.success("已删除任务");
      void refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const setShotImageMutation = api.studio.setShotImage.useMutation({
    onSuccess: () => {
      toast.success("已设置为镜头首帧");
      onRefreshShot?.();
    },
    onError: (error) => {
      toast.error(`设置失败: ${error.message}`);
    },
  });

  const setShotVideoMutation = api.studio.setShotVideo.useMutation({
    onSuccess: () => {
      toast.success("已设置为镜头视频");
      onRefreshShot?.();
    },
    onError: (error) => {
      toast.error(`设置失败: ${error.message}`);
    },
  });

  const setShotAudioMutation = api.studio.setShotAudio.useMutation({
    onSuccess: () => {
      toast.success("已设置为镜头音频");
      onRefreshShot?.();
    },
    onError: (error) => {
      toast.error(`设置失败: ${error.message}`);
    },
  });

  useEffect(() => {
    const hasProcessing = tasksData?.tasks.some(
      (t) => t.status === "PROCESSING" || t.status === "PENDING",
    );

    if (!hasProcessing) return;

    const timer = setInterval(() => {
      void refetch();
    }, 3000);

    return () => clearInterval(timer);
  }, [tasksData, refetch]);

  const handleDelete = (taskId: string) => {
    deleteMutation.mutate({ taskId });
  };

  const handleSetAsKeyframe = (imageUrl: string) => {
    setShotImageMutation.mutate({ shotId, imageUrl });
  };

  const handleSetAsVideo = (videoUrl: string) => {
    setShotVideoMutation.mutate({ shotId, videoUrl });
  };

  const handleSetAsAudio = (audioUrl: string) => {
    setShotAudioMutation.mutate({ shotId, audioUrl });
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("已复制到剪贴板");
  };

  const tasksWithMedia = useMemo(() => {
    if (!tasksData?.tasks) return [];

    return tasksData.tasks
      .map((task) => {
        const mediaResults =
          Array.isArray(task.results) && task.results.length > 0
            ? task.results.filter(
                (
                  result,
                ): result is { type: "image" | "video" | "audio"; url: string } => {
                  if (typeof result !== "object" || result === null)
                    return false;
                  const maybeResult = result as {
                    type?: unknown;
                    url?: unknown;
                  };
                  if (typeof maybeResult.url !== "string") return false;
                  if (
                    maybeResult.type === "image" ||
                    maybeResult.type === "video" ||
                    maybeResult.type === "audio"
                  ) {
                    return true;
                  }
                  return false;
                },
              )
            : [];

        return { task, mediaResults };
      })
      .filter((item) => {
        // 显示有结果的任务，或者正在处理中的任务
        return (
          item.mediaResults.length > 0 ||
          item.task.status === "PROCESSING" ||
          item.task.status === "PENDING"
        );
      });
  }, [tasksData]);

  return (
    <div className="space-y-4 border-t pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">任务历史</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/ai-generation/tasks')}
          >
            <Eye className="h-4 w-4 mr-1" />
            查看
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            刷新
          </Button>
        </div>
      </div>

      {tasksWithMedia.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          还没有生成任务结果
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {tasksWithMedia.flatMap(({ task, mediaResults }) => {
            // 如果任务正在处理且没有结果，显示占位卡片
            if (
              mediaResults.length === 0 &&
              (task.status === "PROCESSING" || task.status === "PENDING")
            ) {
              return (
                <TaskPlaceholderCard
                  key={task.id}
                  taskStatus={task.status}
                  taskProgress={task.progress}
                  outputType={task.outputType}
                />
              );
            }

            // 否则显示正常的媒体卡片
            return mediaResults.map((result, index) => (
              <TaskMediaCard
                key={`${task.id}-${index}`}
                task={task}
                result={result}
                taskStatus={task.status}
                taskProgress={task.progress}
                onDelete={() => handleDelete(task.id)}
                onSetAsKeyframe={
                  result.type === "image"
                    ? () => handleSetAsKeyframe(result.url)
                    : undefined
                }
                onSetAsVideo={
                  result.type === "video"
                    ? () => handleSetAsVideo(result.url)
                    : undefined
                }
                onSetAsAudio={
                  result.type === "audio"
                    ? () => handleSetAsAudio(result.url)
                    : undefined
                }
                onConvertToVideo={
                  result.type === "image" && onConvertToVideo
                    ? () => onConvertToVideo(result.url)
                    : undefined
                }
                onPreview={
                  result.type === "image"
                    ? () => setPreviewImage(result.url)
                    : result.type === "video"
                      ? () => setPreviewVideo(result.url)
                      : result.type === "audio"
                        ? () => setPreviewAudio(result.url)
                        : undefined
                }
                onApplyTask={onApplyTask ? () => onApplyTask(task) : undefined}
                isDeleting={deleteMutation.isPending}
                isSettingImage={setShotImageMutation.isPending}
                isSettingVideo={setShotVideoMutation.isPending}
                isSettingAudio={setShotAudioMutation.isPending}
              />
            ));
          })}
        </div>
      )}

      {/* 图片预览对话框 */}
      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogTitle className="sr-only">图片预览</DialogTitle>
          {previewImage && (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <img
                src={previewImage}
                alt="预览"
                className="max-w-full max-h-[95vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 视频预览对话框 */}
      <Dialog
        open={Boolean(previewVideo)}
        onOpenChange={(open) => {
          if (!open) setPreviewVideo(null);
        }}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogTitle className="sr-only">视频预览</DialogTitle>
          {previewVideo && (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <video
                src={previewVideo}
                className="max-w-full max-h-[95vh]"
                controls
                autoPlay
                loop
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(previewAudio, "_blank")}
                >
                  在新标签页打开
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = previewAudio;
                    link.download = `audio-${Date.now()}.mp3`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  下载音频
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TaskMediaCardProps {
  task: TaskHistoryTask;
  result: { type: "image" | "video" | "audio"; url: string };
  taskStatus: string;
  taskProgress: number | null;
  onDelete: () => void;
  onSetAsKeyframe?: () => void;
  onSetAsVideo?: () => void;
  onSetAsAudio?: () => void;
  onConvertToVideo?: () => void;
  onPreview?: () => void;
  onApplyTask?: () => void;
  isDeleting: boolean;
  isSettingImage: boolean;
  isSettingVideo: boolean;
  isSettingAudio: boolean;
}

function TaskMediaCard({
  task,
  result,
  taskStatus,
  taskProgress,
  onDelete,
  onSetAsKeyframe,
  onSetAsVideo,
  onSetAsAudio,
  onConvertToVideo,
  onPreview,
  onApplyTask,
  isDeleting,
  isSettingImage,
  isSettingVideo,
  isSettingAudio,
}: TaskMediaCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
      <div className="relative h-24 w-full bg-gray-100">
        {result.type === "image" ? (
          <button
            onClick={onPreview}
            className="h-full w-full cursor-pointer hover:opacity-90 transition-opacity"
            title="点击查看大图"
          >
            <img
              src={result.url}
              alt="生成结果"
              className="h-full w-full object-cover"
            />
          </button>
        ) : result.type === "video" ? (
          <button
            onClick={onPreview}
            className="relative h-full w-full cursor-pointer hover:opacity-90 transition-opacity"
            title="点击播放视频"
          >
            <video
              src={result.url}
              className="h-full w-full object-cover"
              muted
              loop
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <FilmIcon className="h-8 w-8 text-white" />
            </div>
          </button>
        ) : (
          <button
            onClick={onPreview}
            className="flex h-full w-full cursor-pointer items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-colors"
            title="点击播放音频"
          >
            <MusicIcon className="h-10 w-10 text-purple-600" />
          </button>
        )}

        {(taskStatus === "PROCESSING" || taskStatus === "PENDING") && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-xs">
              {taskProgress !== null
                ? `${Math.round(taskProgress * 100)}%`
                : "处理中..."}
            </div>
          </div>
        )}

        {taskStatus === "FAILED" && (
          <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
            <div className="text-white text-xs font-medium">失败</div>
          </div>
        )}
      </div>

      <div className="p-2 space-y-1">
        {onApplyTask && (
          <button
            onClick={onApplyTask}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-green-50 hover:bg-green-100 text-green-700 transition-colors font-medium"
          >
            <Sparkles className="h-3 w-3" />
            应用
          </button>
        )}

        {onSetAsKeyframe && (
          <button
            onClick={onSetAsKeyframe}
            disabled={isSettingImage}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors disabled:opacity-50"
          >
            <ImageIcon className="h-3 w-3" />
            {isSettingImage ? "设置中..." : "选为首帧"}
          </button>
        )}

        {onSetAsVideo && (
          <button
            onClick={onSetAsVideo}
            disabled={isSettingVideo}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors disabled:opacity-50"
          >
            <FilmIcon className="h-3 w-3" />
            {isSettingVideo ? "设置中..." : "选为视频"}
          </button>
        )}

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

        {onConvertToVideo && (
          <button
            onClick={onConvertToVideo}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors font-medium"
          >
            <FilmIcon className="h-3 w-3" />
            转视频
          </button>
        )}

        {result.type === "video" && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.url);
              toast.success("已复制到剪贴板");
            }}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
          >
            <Copy className="h-3 w-3" />
            复制URL
          </button>
        )}

        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-red-50 hover:bg-red-100 text-red-700 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          {isDeleting ? "删除中..." : "删除"}
        </button>
      </div>
    </div>
  );
}

// 占位卡片组件 - 显示正在处理中的任务
function TaskPlaceholderCard({
  taskStatus,
  taskProgress,
  outputType,
}: {
  taskStatus: string;
  taskProgress: number | null;
  outputType: string;
}) {
  // 根据输出类型选择颜色和图标
  const isAudio = outputType === "AUDIO";
  const isVideo = outputType === "VIDEO";
  const colorClass = isAudio
    ? "from-purple-50 to-blue-50"
    : isVideo
      ? "from-orange-50 to-orange-100"
      : "from-blue-50 to-blue-100";
  const iconColorClass = isAudio
    ? "border-purple-500"
    : isVideo
      ? "border-orange-500"
      : "border-blue-500";
  const bgColorClass = isAudio
    ? "bg-purple-500/10"
    : isVideo
      ? "bg-orange-500/10"
      : "bg-blue-500/10";
  const textColorClass = isAudio
    ? "text-purple-700"
    : isVideo
      ? "text-orange-700"
      : "text-blue-700";
  const progressBgClass = isAudio
    ? "bg-purple-200"
    : isVideo
      ? "bg-orange-200"
      : "bg-blue-200";
  const progressBarClass = isAudio
    ? "bg-purple-500"
    : isVideo
      ? "bg-orange-500"
      : "bg-blue-500";

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div
        className={`relative h-24 w-full bg-gradient-to-br ${colorClass} flex items-center justify-center`}
      >
        {/* 加载动画 */}
        <div className={`absolute inset-0 ${bgColorClass} animate-pulse`} />
        <div className="relative z-10 text-center">
          {isAudio ? (
            <MusicIcon className="h-8 w-8 text-purple-500 mb-2 mx-auto animate-pulse" />
          ) : (
            <div
              className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${iconColorClass} mb-2`}
            />
          )}
          <div className={`text-xs ${textColorClass} font-medium`}>
            {taskProgress !== null
              ? `${Math.round(taskProgress * 100)}%`
              : "生成中..."}
          </div>
        </div>

        {/* 进度条 */}
        {taskProgress !== null && taskProgress > 0 && (
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${progressBgClass}`}>
            <div
              className={`h-full ${progressBarClass} transition-all duration-300`}
              style={{ width: `${Math.round(taskProgress * 100)}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-2">
        <div className="text-xs text-center text-gray-500">
          {taskStatus === "PENDING" ? "等待处理..." : "正在生成..."}
        </div>
      </div>
    </div>
  );
}
