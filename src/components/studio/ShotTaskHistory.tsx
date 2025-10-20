"use client"

import { useEffect, useMemo, useState } from 'react'
import { Trash2, Image as ImageIcon, Film as FilmIcon, Copy, Sparkles } from 'lucide-react'
import { api } from '~/components/providers/trpc-provider'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/toast'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~/server/api/root'

type ListTasksOutput = inferRouterOutputs<AppRouter>['aiGeneration']['listTasks']
export type TaskHistoryTask = ListTasksOutput['tasks'][number]

interface ShotTaskHistoryProps {
  shotId: string
  onRefreshShot?: () => void
  onApplyTask?: (task: TaskHistoryTask) => void
}

export function ShotTaskHistory({ shotId, onRefreshShot, onApplyTask }: ShotTaskHistoryProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)
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
    }
  )

  const deleteMutation = api.aiGeneration.deleteTask.useMutation({
    onSuccess: () => {
      toast.success('已删除任务')
      void refetch()
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })

  const setShotImageMutation = api.studio.setShotImage.useMutation({
    onSuccess: () => {
      toast.success('已设置为镜头首帧')
      onRefreshShot?.()
    },
    onError: (error) => {
      toast.error(`设置失败: ${error.message}`)
    },
  })

  const setShotVideoMutation = api.studio.setShotVideo.useMutation({
    onSuccess: () => {
      toast.success('已设置为镜头视频')
      onRefreshShot?.()
    },
    onError: (error) => {
      toast.error(`设置失败: ${error.message}`)
    },
  })

  useEffect(() => {
    const hasProcessing = tasksData?.tasks.some(
      (t) => t.status === 'PROCESSING' || t.status === 'PENDING'
    )

    if (!hasProcessing) return

    const timer = setInterval(() => {
      void refetch()
    }, 3000)

    return () => clearInterval(timer)
  }, [tasksData, refetch])

  const handleDelete = (taskId: string) => {
    deleteMutation.mutate({ taskId })
  }

  const handleSetAsKeyframe = (imageUrl: string) => {
    setShotImageMutation.mutate({ shotId, imageUrl })
  }

  const handleSetAsVideo = (videoUrl: string) => {
    setShotVideoMutation.mutate({ shotId, videoUrl })
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('已复制到剪贴板')
  }

  const tasksWithMedia = useMemo(() => {
    if (!tasksData?.tasks) return []

    return tasksData.tasks.map((task) => {
      const mediaResults =
        Array.isArray(task.results) && task.results.length > 0
          ? task.results.filter((result): result is { type: 'image' | 'video'; url: string } => {
              if (typeof result !== 'object' || result === null) return false
              const maybeResult = result as { type?: unknown; url?: unknown }
              if (typeof maybeResult.url !== 'string') return false
              if (maybeResult.type === 'image' || maybeResult.type === 'video') {
                return true
              }
              return false
            })
          : []

      return { task, mediaResults }
    }).filter(item => item.mediaResults.length > 0)
  }, [tasksData])

  return (
    <div className="space-y-4 border-t pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">任务历史</h3>
        <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
          刷新
        </Button>
      </div>

      {tasksWithMedia.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          还没有生成任务结果
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {tasksWithMedia.flatMap(({ task, mediaResults }) =>
            mediaResults.map((result, index) => (
              <TaskMediaCard
                key={`${task.id}-${index}`}
                task={task}
                result={result}
                taskStatus={task.status}
                taskProgress={task.progress}
                onDelete={() => handleDelete(task.id)}
                onSetAsKeyframe={result.type === 'image' ? () => handleSetAsKeyframe(result.url) : undefined}
                onSetAsVideo={result.type === 'video' ? () => handleSetAsVideo(result.url) : undefined}
                onCopyUrl={() => handleCopyUrl(result.url)}
                onPreview={result.type === 'image' ? () => setPreviewImage(result.url) : undefined}
                onApplyTask={onApplyTask ? () => onApplyTask(task) : undefined}
                isDeleting={deleteMutation.isPending}
                isSettingImage={setShotImageMutation.isPending}
                isSettingVideo={setShotVideoMutation.isPending}
              />
            ))
          )}
        </div>
      )}

      {/* 图片预览对话框 */}
      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
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
    </div>
  )
}

interface TaskMediaCardProps {
  task: TaskHistoryTask
  result: { type: 'image' | 'video'; url: string }
  taskStatus: string
  taskProgress: number | null
  onDelete: () => void
  onSetAsKeyframe?: () => void
  onSetAsVideo?: () => void
  onCopyUrl: () => void
  onPreview?: () => void
  onApplyTask?: () => void
  isDeleting: boolean
  isSettingImage: boolean
  isSettingVideo: boolean
}

function TaskMediaCard({
  task,
  result,
  taskStatus,
  taskProgress,
  onDelete,
  onSetAsKeyframe,
  onSetAsVideo,
  onCopyUrl,
  onPreview,
  onApplyTask,
  isDeleting,
  isSettingImage,
  isSettingVideo,
}: TaskMediaCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
      <div className="relative h-24 w-full bg-gray-100">
        {result.type === 'image' ? (
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
        ) : (
          <div className="relative h-full w-full">
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
          </div>
        )}

        {(taskStatus === 'PROCESSING' || taskStatus === 'PENDING') && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-xs">
              {taskProgress !== null ? `${Math.round(taskProgress * 100)}%` : '处理中...'}
            </div>
          </div>
        )}

        {taskStatus === 'FAILED' && (
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
            {isSettingImage ? '设置中...' : '选为首帧'}
          </button>
        )}

        {onSetAsVideo && (
          <button
            onClick={onSetAsVideo}
            disabled={isSettingVideo}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors disabled:opacity-50"
          >
            <FilmIcon className="h-3 w-3" />
            {isSettingVideo ? '设置中...' : '选为视频'}
          </button>
        )}

        <button
          onClick={onCopyUrl}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
        >
          <Copy className="h-3 w-3" />
          复制URL
        </button>

        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs rounded bg-red-50 hover:bg-red-100 text-red-700 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          {isDeleting ? '删除中...' : '删除'}
        </button>
      </div>
    </div>
  )
}