/**
 * 数字人任务列表
 */

'use client'

import { api } from '~/components/providers/trpc-provider'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Loader2, AlertCircle, Eye, Trash2, Copy } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { TaskFormData } from '~/app/digital-human/page'

interface DigitalHumanTaskListProps {
  onApplyTask?: (data: TaskFormData) => void
}

export function DigitalHumanTaskList({ onApplyTask }: DigitalHumanTaskListProps) {
  const [page, setPage] = useState(1)

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

        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
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
            </CardContent>
          </Card>
        ))}
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
