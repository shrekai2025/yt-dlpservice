"use client"

import { useEffect, useMemo, useState } from 'react'
import type { inferRouterOutputs } from '@trpc/server'

import { api } from '~/components/providers/trpc-provider'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { cn } from '~/lib/utils/cn'
import { Dialog, DialogContent } from '~/components/ui/dialog'
import type { AppRouter } from '~/server/api/root'

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
export type OutputType = 'IMAGE' | 'VIDEO' | 'AUDIO'

type ListTasksOutput = inferRouterOutputs<AppRouter>['aiGeneration']['listTasks']
export type TaskHistoryTask = ListTasksOutput['tasks'][number]

interface TaskHistorySectionProps {
  variant?: 'page' | 'embedded'
  className?: string
  refreshToken?: string | number | null
  onApplyTask?: (task: TaskHistoryTask) => void
}

export function TaskHistorySection({
  variant = 'embedded',
  className,
  refreshToken,
  onApplyTask,
}: TaskHistorySectionProps) {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | undefined>(undefined)
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType | undefined>(undefined)
  const [previewMedia, setPreviewMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(
    null
  )
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const {
    data: tasksData,
    refetch,
    isFetching,
  } = api.aiGeneration.listTasks.useQuery(
    {
      status: selectedStatus,
      outputType: selectedOutputType,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
    },
    {
      // 添加缓存时间，减少不必要的请求
      staleTime: 2000, // 2秒内的数据被认为是新鲜的，不会重新请求
      refetchOnWindowFocus: false, // 窗口获得焦点时不自动刷新
    }
  )

  const deleteMutation = api.aiGeneration.deleteTask.useMutation({
    onSuccess: () => {
      void refetch()
    },
  })

  useEffect(() => {
    const hasProcessing = tasksData?.tasks.some(
      (t) => t.status === 'PROCESSING' || t.status === 'PENDING'
    )

    if (!hasProcessing) return

    // 动态调整轮询间隔：
    // - 如果有多个任务在处理，使用更长的间隔避免频繁请求
    // - 如果只有1-2个任务，使用较短间隔获取更及时的更新
    const processingCount = tasksData?.tasks.filter(
      (t) => t.status === 'PROCESSING' || t.status === 'PENDING'
    ).length ?? 0
    
    const interval = processingCount > 2 ? 5000 : 3000

    const timer = setInterval(() => {
      void refetch()
    }, interval)

    return () => clearInterval(timer)
  }, [tasksData, refetch])

  useEffect(() => {
    if (refreshToken !== undefined && refreshToken !== null) {
      void refetch()
    }
  }, [refreshToken, refetch])

  // 当筛选状态或输出类型改变时，重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedStatus, selectedOutputType])

  const heading = variant === 'page' ? '生成任务' : '任务历史'

  const containerClassName = useMemo(() => {
    if (variant === 'page') {
      return cn('container mx-auto space-y-6 p-6', className)
    }

    return cn('space-y-4 border-t border-neutral-200 pt-6', className)
  }, [variant, className])

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800',
      SUCCESS: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    }

    return <Badge className={variants[status]}>{status}</Badge>
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN')
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    const seconds = ms / 1000
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainSeconds}s`
  }

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between">
        <h2 className={cn('text-2xl font-semibold', variant === 'page' && 'text-3xl font-bold')}>
          {heading}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
            刷新
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* 任务类型筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">任务类型:</span>
          <div className="flex gap-2">
            <Button
              variant={selectedOutputType === undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedOutputType(undefined)}
            >
              All
            </Button>
            {(['IMAGE', 'VIDEO', 'AUDIO'] as OutputType[]).map((type) => (
              <Button
                key={type}
                variant={selectedOutputType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedOutputType(type)}
              >
                {type === 'IMAGE' ? 'Image' : type === 'VIDEO' ? 'Video' : 'Audio'}
              </Button>
            ))}
          </div>
        </div>

        {/* 任务状态筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">任务状态:</span>
          <div className="flex gap-2">
            <Button
              variant={selectedStatus === undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(undefined)}
            >
              全部
            </Button>
            {(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'] as TaskStatus[]).map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {tasksData?.tasks.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">暂无任务记录</Card>
        ) : (
          tasksData?.tasks.map((task) => {
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

            return (
              <Card key={task.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(task.status)}
                      <span className="text-xs text-gray-500">{formatDate(task.createdAt)}</span>
                      {task.durationMs && (
                        <span className="text-xs text-gray-500">
                          耗时: {formatDuration(task.durationMs)}
                        </span>
                      )}
                      {task.progress !== null &&
                        task.progress !== undefined &&
                        task.status === 'PROCESSING' && (
                          <span className="text-xs font-medium text-blue-600">
                            进度: {Math.round(task.progress * 100)}%
                          </span>
                        )}
                    </div>

                    {task.progress !== null &&
                      task.progress !== undefined &&
                      task.status === 'PROCESSING' && (
                        <div className="w-full max-w-md">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${Math.round(task.progress * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                    <div className="text-sm font-medium">{task.prompt}</div>

                    <div className="text-xs text-gray-500">
                      模型: {task.model.provider.name} / {task.model.name}
                    </div>

                    {task.errorMessage && (
                      <div className="rounded bg-red-50 p-2 text-xs text-red-600">
                        {task.errorMessage}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {onApplyTask && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onApplyTask(task)}
                      >
                        应用
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/admin/ai-generation/tasks/${task.id}`
                      }}
                    >
                      详情
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deleteMutation.isLoading}
                      onClick={() => {
                        deleteMutation.mutate({ taskId: task.id })
                      }}
                    >
                      删除
                    </Button>
                  </div>
                </div>

                {mediaResults.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {mediaResults.map((result, index) => (
                      <button
                        key={`${result.url}-${index}`}
                        type="button"
                        className="group relative h-24 w-24 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                        onClick={() => setPreviewMedia({ type: result.type, url: result.url })}
                        aria-label={result.type === 'video' ? '查看生成视频' : '查看生成图片'}
                      >
                        {result.type === 'image' ? (
                          <img
                            src={result.url}
                            alt={`生成结果缩略图 ${index + 1}`}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <video
                            src={result.url}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 pointer-events-none"
                            muted
                            loop
                            playsInline
                          />
                        )}
                        {result.type === 'video' && (
                          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                            视频
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {tasksData && tasksData.total > 0 && (
        <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
          <div className="text-sm text-gray-500">
            共 {tasksData.total} 条记录，当前显示第 {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, tasksData.total)} 条
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              上一页
            </Button>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-gray-500">第</span>
              <span className="font-medium">{currentPage}</span>
              <span className="text-gray-500">页，共</span>
              <span className="font-medium">{Math.ceil(tasksData.total / itemsPerPage)}</span>
              <span className="text-gray-500">页</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= Math.ceil(tasksData.total / itemsPerPage)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(previewMedia)}
        onOpenChange={(open) => {
          if (!open) setPreviewMedia(null)
        }}
      >
        <DialogContent className="max-w-4xl bg-neutral-950 p-0">
          {previewMedia &&
            (previewMedia.type === 'image' ? (
              <img
                src={previewMedia.url}
                alt="生成结果预览"
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />
            ) : (
              <video
                src={previewMedia.url}
                controls
                playsInline
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />
            ))}
        </DialogContent>
      </Dialog>
    </div>
  )
}
