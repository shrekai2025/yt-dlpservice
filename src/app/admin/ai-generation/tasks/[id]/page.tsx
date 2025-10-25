"use client"

export const dynamic = 'force-dynamic'

/**
 * AI Generation Task Detail Page
 *
 * 任务详情页面 - 显示完整的任务信息、结果和执行历史
 */

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { toast, Toaster } from '~/components/ui/toast'

type TaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [autoRefresh, setAutoRefresh] = useState(true)

  // 查询任务详情
  // 根据任务状态动态调整轮询间隔，避免不必要的请求
  const { data: task, refetch, isLoading } = api.aiGeneration.getTask.useQuery(
    { taskId },
    {
      enabled: !!taskId,
      refetchInterval: autoRefresh ? 5000 : false, // 从 3秒 改为 5秒
    }
  )

  // 删除任务
  const deleteMutation = api.aiGeneration.deleteTask.useMutation({
    onSuccess: () => {
      router.push('/admin/ai-generation/tasks')
    },
  })

  // 任务完成后停止自动刷新
  useEffect(() => {
    if (task && (task.status === 'SUCCESS' || task.status === 'FAILED' || task.status === 'CANCELLED')) {
      setAutoRefresh(false)
    }
  }, [task])

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PROCESSING: 'bg-blue-100 text-blue-800 animate-pulse',
      SUCCESS: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    }

    return (
      <Badge className={variants[status]}>
        {status}
      </Badge>
    )
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-neutral-500">加载中...</div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="text-xl text-neutral-500">任务不存在</div>
          <Button onClick={() => router.push('/admin/ai-generation/tasks')}>
            返回任务列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster />
      <div className="container mx-auto p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">任务详情</h1>
            {getStatusBadge(task.status)}
          </div>
          <div className="text-sm text-neutral-500">ID: {task.id}</div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
          >
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/ai-generation/tasks')}
          >
            返回列表
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (window.confirm('确认删除此任务？')) {
                deleteMutation.mutate({ taskId: task.id })
              }
            }}
          >
            删除
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 基本信息 */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">基本信息</h2>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-neutral-500">模型</div>
              <div className="mt-1">
                {task.model.provider.name} / {task.model.name}
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {task.model.slug} ({task.model.outputType})
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-neutral-500">提示词</div>
              <div className="mt-1 p-3 bg-neutral-50 rounded border text-sm whitespace-pre-wrap">
                {task.prompt}
              </div>
            </div>

            {task.inputImages.length > 0 && (
              <div>
                <div className="text-sm font-medium text-neutral-500">输入图片</div>
                <div className="mt-2 space-y-2">
                  {task.inputImages.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <img
                        src={url}
                        alt={`Input ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ddd" width="80" height="80"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999"%3EError%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      <div className="text-xs text-neutral-500 truncate flex-1">{url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-neutral-500">输出数量</div>
              <div className="mt-1">{task.numberOfOutputs}</div>
            </div>

            {Object.keys(task.parameters).length > 0 && (
              <div>
                <div className="text-sm font-medium text-neutral-500">参数</div>
                <div className="mt-1 p-3 bg-neutral-50 rounded border">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(task.parameters, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 执行信息 */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">执行信息</h2>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium text-neutral-500">状态</div>
              <div className="mt-1 flex items-center gap-2">
                {getStatusBadge(task.status)}
                {task.progress !== null && task.progress !== undefined && task.status === 'PROCESSING' && (
                  <span className="text-sm text-blue-600">
                    {Math.round(task.progress * 100)}%
                  </span>
                )}
              </div>
              {task.progress !== null && task.progress !== undefined && task.status === 'PROCESSING' && (
                <div className="mt-2 w-full max-w-md">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.round(task.progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {task.providerTaskId && (
              <div>
                <div className="text-sm font-medium text-neutral-500">供应商任务ID</div>
                <div className="mt-1 font-mono text-sm">{task.providerTaskId}</div>
              </div>
            )}

            {task.costUSD !== null && task.costUSD !== undefined && (
              <div>
                <div className="text-sm font-medium text-neutral-500">成本</div>
                <div className="mt-1 text-lg font-semibold text-green-600">
                  ${task.costUSD.toFixed(4)} USD
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-neutral-500">创建时间</div>
              <div className="mt-1">{formatDate(task.createdAt)}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-neutral-500">更新时间</div>
              <div className="mt-1">{formatDate(task.updatedAt)}</div>
            </div>

            {task.completedAt && (
              <div>
                <div className="text-sm font-medium text-neutral-500">完成时间</div>
                <div className="mt-1">{formatDate(task.completedAt)}</div>
              </div>
            )}

            {task.durationMs && (
              <div>
                <div className="text-sm font-medium text-neutral-500">耗时</div>
                <div className="mt-1">{formatDuration(task.durationMs)}</div>
              </div>
            )}

            {task.errorMessage && (
              <div>
                <div className="text-sm font-medium text-red-600">错误信息</div>
                <div className="mt-1 p-3 bg-red-50 rounded border border-red-200 text-sm text-red-700">
                  {task.errorMessage}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 生成结果 */}
      {task.results && task.results.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">生成结果</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {task.results.map((result: { type: string; url: string }, index: number) => (
              <div key={index} className="space-y-2">
                {result.type === 'image' ? (
                  <div className="relative aspect-square">
                    <img
                      src={result.url}
                      alt={`Result ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999"%3EImage Error%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  </div>
                ) : result.type === 'video' ? (
                  <div className="relative aspect-video">
                    <video
                      src={result.url}
                      controls
                      className="w-full h-full rounded-lg border"
                    >
                      您的浏览器不支持视频播放
                    </video>
                  </div>
                ) : result.type === 'audio' ? (
                  <div className="space-y-2">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                          <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-purple-900">音频文件 #{index + 1}</div>
                          <div className="text-xs text-purple-600">点击播放按钮试听</div>
                        </div>
                      </div>
                      <audio
                        src={result.url}
                        controls
                        className="w-full"
                        preload="metadata"
                      >
                        您的浏览器不支持音频播放
                      </audio>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-neutral-50 rounded border">
                    <div className="text-sm font-medium">其他类型: {result.type}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(result.url, '_blank')}
                  >
                    打开
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(result.url)
                      toast.success('URL已复制到剪贴板')
                    }}
                  >
                    复制URL
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
    </>
  )
}

