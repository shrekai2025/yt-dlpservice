/**
 * 数字人任务列表
 */

'use client'

import { api } from '~/components/providers/trpc-provider'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Progress } from '@/components/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import { Loader2, AlertCircle, Eye, Trash2, Copy, RefreshCw, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { TaskFormData } from '~/app/digital-human/page'

interface DigitalHumanTaskListProps {
  onApplyTask?: (data: TaskFormData) => void
}

// 任务阶段进度映射
const STAGE_PROGRESS: Record<string, number> = {
  FACE_RECOGNITION_SUBMITTED: 10,
  FACE_RECOGNITION_PROCESSING: 20,
  FACE_RECOGNITION_COMPLETED: 30,
  SUBJECT_DETECTION_COMPLETED: 40,
  AWAITING_SUBJECT_SELECTION: 50,
  VIDEO_GENERATION_SUBMITTED: 60,
  VIDEO_GENERATION_PROCESSING: 80,
  VIDEO_GENERATION_COMPLETED: 100,
  FAILED: 0,
}

export function DigitalHumanTaskList({ onApplyTask }: DigitalHumanTaskListProps) {
  const [page, setPage] = useState(1)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)

  const {
    data,
    isLoading,
    error,
    refetch,
  } = api.digitalHuman.getUserTasks.useQuery(
    { page, limit: 20 },
    {
      refetchInterval: 10000, // 每10秒刷新一次
      refetchIntervalInBackground: false,
    }
  )

  const deleteTaskMutation = api.digitalHuman.deleteTask.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const handleDelete = (taskId: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      deleteTaskMutation.mutate({ taskId })
    }
  }

  const handleApply = (task: typeof tasks[0]) => {
    if (onApplyTask) {
      onApplyTask({
        name: `${task.name} (副本)`,
        imageUrl: task.imageUrl,
        audioUrl: task.audioUrl,
        prompt: task.prompt || '',
        seed: task.seed || -1,
        peFastMode: task.peFastMode,
        enableMultiSubject: task.enableMultiSubject,
      })

      // 滚动到页面顶部
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>获取任务列表失败: {error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const tasks = data?.tasks || []
  const totalPages = data?.totalPages || 1

  return (
    <div className="space-y-4">
      {/* 标题栏和刷新按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">任务列表</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="h-8"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 任务列表 */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <Card>
            <CardContent className="p-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  还没有任何任务，点击上方"创建新任务"开始生成数字人视频
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {tasks.map((task) => {
          const progress = STAGE_PROGRESS[task.stage] || 0
          const isProcessing = [
            'FACE_RECOGNITION_PROCESSING',
            'VIDEO_GENERATION_PROCESSING',
          ].includes(task.stage)

          return (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* 顶部：标题、状态和操作按钮 */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold truncate">{task.name}</h3>
                        <Badge
                          variant={
                            task.stage === 'VIDEO_GENERATION_COMPLETED'
                              ? 'success'
                              : task.stage === 'FAILED'
                              ? 'danger'
                              : task.stage === 'AWAITING_SUBJECT_SELECTION'
                              ? 'warning'
                              : isProcessing
                              ? 'default'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {getStageLabel(task.stage)}
                        </Badge>
                        {task.enableMultiSubject && (
                          <Badge variant="outline" className="text-xs">
                            多主体
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-gray-500">
                        {new Date(task.createdAt).toLocaleString()}
                        {task.errorMessage && (
                          <span className="text-red-500 ml-2">• {task.errorMessage}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApply(task)}
                        className="h-8"
                        title="应用此任务的参数"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        应用
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-8"
                      >
                        <Link href={`/digital-human/tasks/${task.id}`}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          查看
                        </Link>
                      </Button>

                      {task.stage !== 'VIDEO_GENERATION_PROCESSING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(task.id)}
                          disabled={deleteTaskMutation.isPending}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-700">
                        {getStageLabel(task.stage)}
                      </span>
                      <span className="text-xs text-gray-500">{progress}%</span>
                    </div>
                    <Progress
                      value={progress}
                      className="h-1.5"
                    />
                  </div>

                  {/* 视频预览（仅已完成的任务） */}
                  {task.stage === 'VIDEO_GENERATION_COMPLETED' && task.resultVideoUrl && (
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <div
                        className="relative w-32 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0 group cursor-pointer"
                        onClick={() => setPreviewVideoUrl(task.resultVideoUrl || null)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setPreviewVideoUrl(task.resultVideoUrl || null)
                          }
                        }}
                      >
                        <video
                          src={task.resultVideoUrl}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                          <PlayCircle className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 mb-1">生成完成</p>
                        <p className="text-xs text-gray-500 truncate">点击预览窗口查看视频</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>

              <span className="text-sm text-gray-600">
                第 {page} / {totalPages} 页 (共 {data?.total} 个任务)
              </span>

              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                下一页
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 视频预览对话框 */}
      <Dialog
        open={!!previewVideoUrl}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewVideoUrl(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>视频预览</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewVideoUrl && (
              <>
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <video
                    src={previewVideoUrl}
                    controls
                    autoPlay
                    className="w-full h-full"
                    controlsList="nodownload"
                  />
                </div>
                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <a href={previewVideoUrl} download>
                      下载视频
                    </a>
                  </Button>
                  <Button variant="outline" asChild className="flex-1">
                    <a href={previewVideoUrl} target="_blank" rel="noopener noreferrer">
                      在新窗口打开
                    </a>
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 阶段标签映射
function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    FACE_RECOGNITION_SUBMITTED: '识别提交',
    FACE_RECOGNITION_PROCESSING: '识别中',
    FACE_RECOGNITION_COMPLETED: '识别完成',
    SUBJECT_DETECTION_COMPLETED: '检测完成',
    AWAITING_SUBJECT_SELECTION: '等待选择',
    VIDEO_GENERATION_SUBMITTED: '生成提交',
    VIDEO_GENERATION_PROCESSING: '生成中',
    VIDEO_GENERATION_COMPLETED: '已完成',
    FAILED: '失败',
  }
  return labels[stage] || stage
}
