"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { Badge } from '~/components/ui/badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { cn } from '~/lib/utils/cn'
import { api } from '~/components/providers/trpc-provider'

export default function TaskManagementPage() {
  const [url, setUrl] = useState("")
  const [downloadType, setDownloadType] = useState<"AUDIO_ONLY" | "VIDEO_ONLY" | "BOTH">("AUDIO_ONLY")
  const [compressionPreset, setCompressionPreset] = useState<"none" | "light" | "standard" | "heavy">("none")
  const [sttProvider, setSttProvider] = useState<"google" | "doubao" | "doubao-small" | "tingwu" | "none" | undefined>(undefined)
  const [googleSttLanguage, setGoogleSttLanguage] = useState<"cmn-Hans-CN" | "en-US">("cmn-Hans-CN")
  const [s3TransferFileType, setS3TransferFileType] = useState<"none" | "compressed" | "original">("none")
  const [enableTranscription, setEnableTranscription] = useState(true)
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false)
  const [selectedTranscription, setSelectedTranscription] = useState<{taskId: string, text: string} | null>(null)
  const [toast, setToast] = useState<{ message: string; tone?: 'default' | 'success' | 'error' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const showToast = (message: string, tone: 'default' | 'success' | 'error' = 'default') => {
    setToast({ message, tone })
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])


  // 数据查询
  const {
    data: tasks,
    refetch: refetchTasks,
    isFetching: isFetchingTasks,
  } = api.task.list.useQuery({})
  const { data: stats } = api.task.stats.useQuery()
  const { data: downloaderStatus } = api.task.checkDownloader.useQuery()

  // Mutations
  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      setUrl("")
      setDownloadType("AUDIO_ONLY")
      setCompressionPreset("none")
      setSttProvider(undefined)
      setGoogleSttLanguage("cmn-Hans-CN")
      setS3TransferFileType("none")
      setEnableTranscription(true)
      refetchTasks()
      showToast('任务创建成功', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : '创建任务失败', 'error')
    },
  })
  const processTask = api.task.process.useMutation({
    onSuccess: () => showToast('已触发任务处理', 'success'),
    onError: (error) => showToast(error instanceof Error ? error.message : '处理任务失败', 'error'),
  })
  const processPending = api.task.processPending.useMutation({
    onSuccess: () => {
      showToast('已触发等待任务处理', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : '批量处理失败', 'error')
    },
  })
  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      refetchTasks()
      showToast('任务已删除', 'success')
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : '删除任务失败', 'error')
    },
  })

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    try {
      await createTask.mutateAsync({
        url: url.trim(),
        downloadType,
        compressionPreset,
        sttProvider: sttProvider === 'none' ? undefined : sttProvider,
        googleSttLanguage: sttProvider === 'google' ? googleSttLanguage : undefined,
        s3TransferFileType,
        enableTranscription
      })
    } catch (error) {
      console.error("Failed to create task:", error)
    }
  }

  const handleShowTranscription = (task: any) => {
    if (task.transcription) {
      setSelectedTranscription({
        taskId: task.id,
        text: task.transcription
      })
      setShowTranscriptionModal(true)
    }
  }

  // 解析和格式化错误日志
  const getErrorDisplay = (errorMessage: string | null) => {
    if (!errorMessage) {
      return { hasErrors: false, latestError: null, totalErrors: 0 }
    }

    try {
      const parsed = JSON.parse(errorMessage)
      
      // 新格式：数组
      if (Array.isArray(parsed) && parsed.length > 0) {
        const latest = parsed[parsed.length - 1]
        const time = new Date(latest.timestamp).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        return {
          hasErrors: true,
          latestError: `${time} ${latest.message}`,
          totalErrors: parsed.length
        }
      }
      
      // 旧格式：字符串
      if (typeof parsed === 'string') {
        return {
          hasErrors: true,
          latestError: parsed,
          totalErrors: 1
        }
      }

      return { hasErrors: false, latestError: null, totalErrors: 0 }
    } catch {
      // 解析失败，说明是旧的字符串格式
      return {
        hasErrors: true,
        latestError: errorMessage,
        totalErrors: 1
      }
    }
  }



  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">URL2STT</h1>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="uppercase tracking-wide">Chromium 下载器</span>
          <Badge variant={downloaderStatus?.available ? 'success' : 'danger'}>
            {downloaderStatus?.available ? '可用' : '未启动'}
          </Badge>
          {downloaderStatus?.version && (
            <span className="text-neutral-400">yt-dlp v{downloaderStatus.version}</span>
          )}
        </div>
      </div>
      {toast && (
        <div
          className={cn(
            'flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm shadow-sm',
            toast.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : toast.tone === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-neutral-200 bg-white text-neutral-600',
          )}
        >
          <span className="leading-relaxed">{toast.message}</span>
          <Button size="sm" variant="ghost" onClick={() => setToast(null)}>
            关闭
          </Button>
        </div>
      )}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>删除任务</DialogTitle>
            <DialogDescription>
              确认删除任务 {deleteTarget ? `${deleteTarget.slice(0, 8)}…` : ''}。此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return
                deleteTask.mutate({ id: deleteTarget })
                setDeleteTarget(null)
              }}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>任务统计</CardTitle>
          <CardDescription>当前任务队列与状态分布概览。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-5">
            {[{
              label: '总任务数',
              value: stats?.total ?? 0,
            }, {
              label: '等待中',
              value: stats?.byStatus?.pending ?? 0,
            }, {
              label: '处理中',
              value: (stats?.byStatus?.extracting ?? 0) + (stats?.byStatus?.transcribing ?? 0),
            }, {
              label: '已完成',
              value: stats?.byStatus?.completed ?? 0,
            }, {
              label: '失败',
              value: stats?.byStatus?.failed ?? 0,
            }].map((item) => (
              <div key={item.label} className="space-y-2 rounded-md border border-neutral-200 p-4">
                <span className="text-xs font-medium uppercase text-neutral-500">{item.label}</span>
                <div className="text-2xl font-semibold tracking-tight text-neutral-900">{item.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>创建新任务</CardTitle>
          <CardDescription>选择下载配置、压缩预设和语音服务，加入任务队列。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTask} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium text-neutral-700">
                视频 URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                required
              />
              <p className="text-xs text-neutral-500">支持 YouTube、Bilibili、小宇宙、Apple 播客、Twitter、PornHub。</p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">下载类型</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {[{ value: 'AUDIO_ONLY', label: '仅音频' }, { value: 'VIDEO_ONLY', label: '仅视频' }, { value: 'BOTH', label: '视频 + 音频' }].map(
                  (option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDownloadType(option.value as typeof downloadType)}
                      className={cn(
                        'rounded-md border border-neutral-200 px-3 py-2 text-sm transition-colors',
                        downloadType === option.value
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'hover:border-neutral-300 hover:bg-neutral-100',
                      )}
                    >
                      {option.label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">音频压缩</span>
              <div className="grid gap-2 sm:grid-cols-4">
                {[{ value: 'none', label: '不压缩' }, { value: 'light', label: '轻度' }, { value: 'standard', label: '标准' }, { value: 'heavy', label: '高度' }].map(
                  (option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setCompressionPreset(option.value as typeof compressionPreset)}
                      className={cn(
                        'rounded-md border border-neutral-200 px-3 py-2 text-sm transition-colors',
                        compressionPreset === option.value
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'hover:border-neutral-300 hover:bg-neutral-100',
                      )}
                    >
                      {option.label}
                    </button>
                  ),
                )}
              </div>
              <p className="text-xs text-neutral-500">建议使用“标准”，兼顾音质与豆包 API 的 80MB 限制。</p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">语音识别服务</span>
              <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-6">
                {[
                  { value: undefined, label: '遵循默认' },
                  { value: 'doubao', label: '豆包' },
                  { value: 'doubao-small', label: '豆包小模型' },
                  { value: 'google', label: 'Google' },
                  { value: 'tingwu', label: '通义听悟' },
                  { value: 'none', label: '不识别' }
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      setSttProvider(option.value as typeof sttProvider)
                      setEnableTranscription(option.value !== 'none')
                    }}
                    className={cn(
                      'rounded-md border border-neutral-200 px-3 py-2 text-sm transition-colors',
                      sttProvider === option.value
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'hover:border-neutral-300 hover:bg-neutral-100',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-500">选择"不识别"将跳过语音转录,仅下载和处理媒体文件。</p>
            </div>

            {sttProvider === 'google' && (
              <div className="space-y-2">
                <label htmlFor="googleSttLanguage" className="text-sm font-medium text-neutral-700">
                  Google STT 语言
                </label>
                <select
                  id="googleSttLanguage"
                  value={googleSttLanguage}
                  onChange={(e) => setGoogleSttLanguage(e.target.value as typeof googleSttLanguage)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="cmn-Hans-CN">简体中文 (cmn-Hans-CN)</option>
                  <option value="en-US">英语 (en-US)</option>
                </select>
                <p className="text-xs text-neutral-500">默认：简体中文 | 位置：us-central1 | 模型：chirp_2</p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-sm font-medium text-neutral-700">S3 转存设置</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { value: 'none', label: '不转存', desc: '不上传到 S3' },
                  { value: 'compressed', label: '转存处理后文件', desc: '上传经过压缩/处理的文件' },
                  { value: 'original', label: '转存原始文件', desc: '上传下载的原始文件' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setS3TransferFileType(option.value as typeof s3TransferFileType)}
                    className={cn(
                      'rounded-md border border-neutral-200 px-3 py-2 text-sm transition-colors text-left',
                      s3TransferFileType === option.value
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'hover:border-neutral-300 hover:bg-neutral-100',
                    )}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className={cn(
                      "text-xs mt-1",
                      s3TransferFileType === option.value ? 'text-neutral-300' : 'text-neutral-500'
                    )}>
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-500">
                S3转存在任务完成后并行执行,不阻塞转录流程。"处理后文件"体积更小节省成本,"原始文件"保持下载时的质量。
              </p>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-neutral-500">
                • 任务创建后会自动进入队列并立即处理。<br />• 如需访问受限视频，请提前配置 Cookie。
              </div>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? '创建中…' : '创建任务'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>批量操作</CardTitle>
          <CardDescription>针对等待中的任务执行统一处理。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="subtle"
            onClick={() => processPending.mutate()}
            disabled={processPending.isPending}
          >
            {processPending.isPending ? '处理中…' : '处理所有等待任务'}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-10">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>任务列表</CardTitle>
            <CardDescription>查看任务状态、压缩信息与转录结果。</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>共 {tasks?.total ?? 0} 条</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refetchTasks()}
              disabled={isFetchingTasks}
            >
              {isFetchingTasks ? '刷新中…' : '刷新'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">ID</th>
                  <th className="px-5 py-3 text-left font-medium">URL</th>
                  <th className="px-5 py-3 text-left font-medium">平台</th>
                  <th className="px-5 py-3 text-left font-medium">下载类型</th>
                  <th className="px-5 py-3 text-left font-medium">压缩</th>
                  <th className="px-5 py-3 text-left font-medium">状态</th>
                  <th className="px-5 py-3 text-left font-medium">S3转存</th>
                  <th className="px-5 py-3 text-left font-medium">文件</th>
                  <th className="px-5 py-3 text-left font-medium">创建时间</th>
                  <th className="px-5 py-3 text-left font-medium">错误</th>
                  <th className="px-5 py-3 text-left font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {(tasks?.data ?? []).map((task) => {
                  const compressionPreset = (task as any).compressionPreset as string | undefined
                  const compressionRatio = (task as any).compressionRatio as number | undefined
                  const compressionLabel =
                    compressionPreset === 'light'
                      ? '轻度'
                      : compressionPreset === 'standard'
                      ? '标准'
                      : compressionPreset === 'heavy'
                      ? '高度'
                      : '不压缩'
                  const statusBadgeVariant =
                    task.status === 'COMPLETED' ? 'success' : task.status === 'FAILED' ? 'danger' : 'outline'

                  return (
                    <tr key={task.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-5 py-4 font-mono text-xs text-neutral-600">{task.id.slice(0, 8)}…</td>
                      <td className="px-5 py-4 max-w-xs truncate text-neutral-700">
                        <a
                          className="text-neutral-900 underline-offset-2 hover:underline"
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {task.url}
                        </a>
                      </td>
                      <td className="px-5 py-4 text-neutral-700">{task.platform}</td>
                      <td className="px-5 py-4 text-neutral-700">
                        <Badge variant={task.downloadType === 'AUDIO_ONLY' ? 'outline' : 'subtle'}>
                          {task.downloadType === 'AUDIO_ONLY' ? '仅音频' : task.downloadType === 'VIDEO_ONLY' ? '仅视频' : '视频 + 音频'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 space-y-1 text-neutral-700">
                        <Badge variant={compressionPreset && compressionPreset !== 'none' ? 'subtle' : 'outline'}>
                          {compressionLabel}
                        </Badge>
                        {typeof compressionRatio === 'number' && (
                          <div className="text-xs text-neutral-500">压缩率 {Math.round(compressionRatio * 100)}%</div>
                        )}
                        {(task as any).originalFileSize && (task as any).compressedFileSize && (
                          <div className="text-xs text-neutral-500">
                            {Math.round((task as any).originalFileSize / 1024 / 1024)}MB → {Math.round((task as any).compressedFileSize / 1024 / 1024)}MB
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statusBadgeVariant}>{task.status}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        {(() => {
                          const s3Status = (task as any).s3TransferStatus as string | undefined
                          const s3Url = (task as any).s3Url as string | undefined
                          const s3Progress = (task as any).s3TransferProgress as string | undefined
                          const s3FileType = (task as any).s3TransferFileType as string | undefined

                          if (!s3Status || s3Status === 'none') {
                            return <span className="text-xs text-neutral-400">未启用</span>
                          }

                          if (s3Status === 'completed' && s3Url) {
                            return (
                              <div className="space-y-1">
                                <Badge variant="success">已转存</Badge>
                                {s3FileType && s3FileType !== 'none' && (
                                  <div className="text-xs text-neutral-500">
                                    {s3FileType === 'original' ? '原文件' : '压缩文件'}
                                  </div>
                                )}
                                <a
                                  href={s3Url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-blue-600 hover:underline truncate max-w-[200px]"
                                  title={s3Url}
                                >
                                  查看文件
                                </a>
                              </div>
                            )
                          }

                          if (s3Status === 'failed') {
                            return (
                              <div className="space-y-1">
                                <Badge variant="danger">转存失败</Badge>
                                {s3Progress && (
                                  <div className="text-xs text-red-600 max-w-[200px] truncate" title={s3Progress}>
                                    {s3Progress}
                                  </div>
                                )}
                              </div>
                            )
                          }

                          if (s3Status === 'uploading') {
                            return (
                              <div className="space-y-1">
                                <Badge variant="outline">上传中</Badge>
                                {s3Progress && (
                                  <div className="text-xs text-neutral-500">{s3Progress}</div>
                                )}
                              </div>
                            )
                          }

                          if (s3Status === 'pending') {
                            return <Badge variant="outline">等待转存</Badge>
                          }

                          return <span className="text-xs text-neutral-400">-</span>
                        })()}
                      </td>
                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {task.videoPath && <div className="truncate" title={task.videoPath}>视频: {task.videoPath.split('/').pop()}</div>}
                        {task.audioPath && <div className="truncate" title={task.audioPath}>音频: {task.audioPath.split('/').pop()}</div>}
                      </td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{new Date(task.createdAt).toLocaleString('zh-CN')}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {(() => {
                          const errorInfo = getErrorDisplay(task.errorMessage)
                          if (!errorInfo.hasErrors) return <span>无</span>
                          return (
                            <div className="max-w-xs space-y-1">
                              <span className="line-clamp-2 font-mono text-red-600" title={errorInfo.latestError || ''}>
                                {errorInfo.latestError}
                              </span>
                              {errorInfo.totalErrors > 1 && (
                                <span className="text-neutral-500">共 {errorInfo.totalErrors} 条</span>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {task.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => processTask.mutate({ id: task.id })}
                              disabled={processTask.isPending}
                            >
                              {processTask.isPending ? '处理中…' : '处理'}
                            </Button>
                          )}
                          {task.status === 'COMPLETED' && task.transcription && (
                            <Button size="sm" variant="ghost" onClick={() => handleShowTranscription(task)}>
                              获取文本
                            </Button>
                          )}
                          {task.status === 'COMPLETED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/tasks/${task.id}`)
                                  const data = await res.json()
                                  if (data && typeof window !== 'undefined') {
                                    const w = window.open('', '_blank', 'width=800,height=600')
                                    if (w) {
                                      w.document.write(
                                        '<pre style="white-space:pre-wrap;word-break:break-all;padding:12px;">' +
                                          JSON.stringify(data, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                                          '</pre>',
                                      )
                                      w.document.title = `任务返回 - ${task.id}`
                              } else {
                                showToast('弹窗被浏览器拦截，请允许弹窗', 'error')
                              }
                            }
                          } catch {
                            showToast('获取返回数据失败', 'error')
                          }
                        }}
                            >
                              查看返回数据
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteTarget(task.id)}
                            disabled={deleteTask.isPending}
                          >
                            删除
                          </Button>
                        </div>
                        {task.title && (
                          <div className="mt-2 text-xs text-neutral-500" title={task.title}>
                            {task.title.length > 36 ? `${task.title.slice(0, 36)}…` : task.title}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 转录文本弹窗 */}
      <Dialog open={showTranscriptionModal} onOpenChange={setShowTranscriptionModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              转录文本 · {selectedTranscription?.taskId.slice(0, 8)}…
            </DialogTitle>
            <DialogDescription>
              文本长度：{selectedTranscription?.text.length} 字符
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-neutral-800">
{selectedTranscription?.text}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedTranscription) {
                  navigator.clipboard.writeText(selectedTranscription.text)
                  showToast('文本已复制到剪贴板', 'success')
                }
              }}
            >
              复制文本
            </Button>
            <Button variant="subtle" onClick={() => setShowTranscriptionModal(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 

 
