"use client"

import React, { useState, useRef } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Separator } from '~/components/ui/separator'

type RecordingState = 'idle' | 'recording' | 'stopped'
type STTProvider = 'google' | 'doubao' | 'doubao-small'
type LanguageCode = 'cmn-Hans-CN' | 'en-US'
type CompressionPreset = 'none' | 'light' | 'standard' | 'heavy'
type SttJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface SttJob {
  id: string
  originalName: string
  fileSize: number
  duration: number | null
  provider: string
  languageCode: string | null
  compressionPreset: string | null
  status: SttJobStatus
  errorMessage: string | null
  transcription: string | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

export default function StandaloneSttPage(): React.ReactElement {
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // STT configuration
  const [apiKey, setApiKey] = useState<string>('')
  const [provider, setProvider] = useState<STTProvider>('doubao-small')
  const [languageCode, setLanguageCode] = useState<LanguageCode>('cmn-Hans-CN')
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>('standard')

  // STT job state
  const [jobStatus, setJobStatus] = useState<SttJobStatus | null>(null)
  const [transcription, setTranscription] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  // Task list state
  const [taskListPage, setTaskListPage] = useState(0)
  const [selectedTask, setSelectedTask] = useState<SttJob | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // tRPC queries
  const { data: jobsData, refetch: refetchJobs } = api.stt.listJobs.useQuery({
    limit: 10,
    offset: taskListPage * 10,
  })

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        setAudioUrl(URL.createObjectURL(audioBlob))
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setRecordingState('recording')
      setRecordingDuration(0)

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1
          // Auto-stop at 10 minutes
          if (newDuration >= 600) {
            stopRecording()
          }
          return newDuration
        })
      }, 1000)
    } catch (error) {
      console.error('Failed to start recording:', error)
      setErrorMessage('无法启动录音，请检查麦克风权限')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop()
      setRecordingState('stopped')
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }

  // Delete recording
  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingState('idle')
    setRecordingDuration(0)
    setTranscription(null)
    setErrorMessage(null)
    setJobStatus(null)
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('文件大小超过50MB限制')
      return
    }

    // Validate file type
    const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp4']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|mp4)$/i)) {
      setErrorMessage('不支持的文件格式，请上传 MP3, WAV, OGG, M4A 或 MP4 格式')
      return
    }

    setUploadedFile(file)
    setAudioBlob(null)
    setAudioUrl(null)
    setTranscription(null)
    setErrorMessage(null)
  }

  // Remove uploaded file
  const removeUploadedFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setTranscription(null)
    setErrorMessage(null)
    setJobStatus(null)
  }

  // Submit STT request
  const submitSTT = async () => {
    const audioFile = audioBlob || uploadedFile
    if (!audioFile) {
      setErrorMessage('请先录音或上传音频文件')
      return
    }

    try {
      setErrorMessage(null)
      setTranscription(null)
      setJobStatus('PENDING')

      const formData = new FormData()

      if (audioBlob) {
        formData.append('audio', audioBlob, 'recording.webm')
      } else if (uploadedFile) {
        formData.append('audio', uploadedFile)
      }

      formData.append('provider', provider)
      if (provider === 'google') {
        formData.append('languageCode', languageCode)
      }
      formData.append('compressionPreset', compressionPreset)

      const headers: HeadersInit = {}
      if (apiKey) {
        headers['x-api-key'] = apiKey
      }

      const response = await fetch('/api/external/stt/transcribe', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'STT请求失败')
      }

      const result = await response.json()

      if (!result.success || !result.data?.jobId) {
        throw new Error('API返回格式错误')
      }

      setIsPolling(true)

      // Extract audio duration for intelligent polling
      const audioDuration = result.data.metadata?.duration
        ? parseFloat(result.data.metadata.duration.replace('s', ''))
        : null

      // Start polling for status with intelligent interval
      pollJobStatus(result.data.jobId, audioDuration)

      // Refresh task list
      refetchJobs()
    } catch (error) {
      console.error('STT submission failed:', error)
      setErrorMessage(error instanceof Error ? error.message : 'STT请求失败')
      setJobStatus('FAILED')
    }
  }

  // Poll job status with exponential backoff and intelligent interval
  const pollJobStatus = async (jobId: string, audioDuration: number | null) => {
    /**
     * 智能计算轮询间隔
     * - 基于音频时长估算处理时间
     * - 实现指数退避: 10s → 30s → 50s → 100s → 100s...
     * - 根据provider调整策略
     */
    const getPollingIntervals = () => {
      if (provider === 'google') {
        // Google STT: 快速处理，固定5秒间隔
        return [5000, 5000, 5000, 5000]
      }

      if (provider === 'doubao') {
        // Doubao: 中等速度，30秒间隔
        return [10000, 20000, 30000, 30000]
      }

      // Doubao-small: 根据音频时长智能调整
      if (audioDuration && audioDuration > 0) {
        // 估算处理时间: 音频时长 * 系数 (根据日志分析，30秒音频需要204秒，系数约6.8)
        const estimatedProcessTime = audioDuration * 7 // 稍微保守估计

        // 如果预估时间很短(<60秒)，使用更短的间隔
        if (estimatedProcessTime < 60) {
          return [10000, 20000, 30000, 30000]
        }

        // 如果预估时间较长(>180秒)，首次等待时间更长
        if (estimatedProcessTime > 180) {
          return [30000, 50000, 100000, 100000]
        }
      }

      // 默认指数退避策略: 10s → 30s → 50s → 100s
      return [10000, 30000, 50000, 100000]
    }

    const intervals = getPollingIntervals()
    let attempts = 0
    const maxAttempts = 60 // 最多轮询60次

    /**
     * 获取当前轮询应该使用的间隔
     * - 前几次使用递增间隔
     * - 之后固定使用最大间隔
     */
    const getCurrentInterval = (attemptNumber: number): number => {
      if (attemptNumber < intervals.length) {
        return intervals[attemptNumber] ?? intervals[intervals.length - 1] ?? 100000
      }
      // 之后都使用最后一个间隔（通常是100秒）
      return intervals[intervals.length - 1] ?? 100000
    }

    const poll = async () => {
      if (attempts >= maxAttempts) {
        const totalTime = intervals.reduce((sum, interval) => sum + interval, 0) / 1000
        setErrorMessage(`轮询超时（已等待约${Math.floor(totalTime / 60)}分钟），请手动刷新任务列表查看结果`)
        setIsPolling(false)
        return
      }

      try {
        const headers: HeadersInit = {}
        if (apiKey) {
          headers['x-api-key'] = apiKey
        }

        const response = await fetch(`/api/external/stt/status/${jobId}`, {
          headers
        })
        if (!response.ok) throw new Error('Failed to fetch status')

        const result = await response.json()
        setJobStatus(result.status)

        if (result.status === 'COMPLETED') {
          setTranscription(result.transcription)
          setIsPolling(false)
          refetchJobs()
        } else if (result.status === 'FAILED') {
          setErrorMessage(result.errorMessage || 'STT处理失败')
          setIsPolling(false)
          refetchJobs()
        } else {
          // 继续轮询，使用智能间隔
          const nextInterval = getCurrentInterval(attempts)
          attempts++
          setTimeout(poll, nextInterval)
        }
      } catch (error) {
        console.error('Polling error:', error)
        // 错误时也使用相同的退避策略
        const nextInterval = getCurrentInterval(attempts)
        attempts++
        setTimeout(poll, nextInterval)
      }
    }

    // 立即开始第一次轮询
    poll()
  }

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Status badge
  const getStatusBadge = (status: SttJobStatus) => {
    const variants: Record<SttJobStatus, 'default' | 'subtle' | 'success' | 'danger'> = {
      PENDING: 'subtle',
      PROCESSING: 'default',
      COMPLETED: 'success',
      FAILED: 'danger',
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  // Open task detail modal
  const openTaskDetail = (task: SttJob) => {
    setSelectedTask(task)
    setIsDetailModalOpen(true)
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">独立STT</h1>
        <p className="mt-2 text-sm text-neutral-600">
          录音或上传音频文件进行语音转文本
        </p>
      </div>

      <Tabs defaultValue="transcribe" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transcribe">STT转录</TabsTrigger>
          <TabsTrigger value="tasks">任务列表</TabsTrigger>
        </TabsList>

        {/* Tab 1: STT Transcription */}
        <TabsContent value="transcribe" className="space-y-6">
          {/* Audio Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>音频输入</CardTitle>
              <CardDescription>录音或上传本地音频文件（最长10分钟，最大50MB）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recording */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-700">录音</label>
                <div className="flex items-center gap-4">
                  {recordingState === 'idle' && (
                    <Button onClick={startRecording} disabled={!!uploadedFile}>
                      开始录音
                    </Button>
                  )}
                  {recordingState === 'recording' && (
                    <>
                      <Button onClick={stopRecording} variant="destructive">
                        停止录音
                      </Button>
                      <span className="text-lg font-mono text-red-600">
                        {formatDuration(recordingDuration)}
                      </span>
                    </>
                  )}
                  {recordingState === 'stopped' && audioUrl && (
                    <>
                      <audio ref={audioRef} src={audioUrl} controls className="max-w-md" />
                      <span className="text-sm text-neutral-600">
                        时长: {formatDuration(recordingDuration)}
                      </span>
                      <Button onClick={deleteRecording} variant="outline" size="sm">
                        删除录音
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* File Upload */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-700">上传文件</label>
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.mp4"
                    onChange={handleFileUpload}
                    disabled={recordingState === 'stopped'}
                    className="text-sm"
                  />
                  {uploadedFile && (
                    <>
                      <span className="text-sm text-neutral-600">
                        {uploadedFile.name} ({formatFileSize(uploadedFile.size)})
                      </span>
                      <Button onClick={removeUploadedFile} variant="outline" size="sm">
                        删除
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* STT Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>STT配置</CardTitle>
              <CardDescription>选择语音识别服务提供商和相关参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="请输入API Key"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
                <p className="text-xs text-neutral-500">
                  使用外部STT API需要认证。请输入环境变量 TEXTGET_API_KEY 中配置的值
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">提供商</label>
                <div className="flex gap-3">
                  {(['google', 'doubao', 'doubao-small'] as STTProvider[]).map((p) => (
                    <Button
                      key={p}
                      variant={provider === p ? 'default' : 'outline'}
                      onClick={() => setProvider(p)}
                      size="sm"
                    >
                      {p === 'google' && 'Google'}
                      {p === 'doubao' && 'Doubao'}
                      {p === 'doubao-small' && 'Doubao Small'}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">
                  {provider === 'google' && '适合小文件(<10MB, <60s)，速度最快'}
                  {provider === 'doubao' && '适合中等文件，最大80MB'}
                  {provider === 'doubao-small' && '适合大文件，最大512MB（默认）'}
                </p>
              </div>

              {/* Language Selection (Google only) */}
              {provider === 'google' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">语言</label>
                  <div className="flex gap-3">
                    {(['cmn-Hans-CN', 'en-US'] as LanguageCode[]).map((lang) => (
                      <Button
                        key={lang}
                        variant={languageCode === lang ? 'default' : 'outline'}
                        onClick={() => setLanguageCode(lang)}
                        size="sm"
                      >
                        {lang === 'cmn-Hans-CN' ? '简体中文' : 'English'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Compression Preset */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">压缩预设</label>
                <div className="flex gap-3">
                  {(['none', 'light', 'standard', 'heavy'] as CompressionPreset[]).map((preset) => (
                    <Button
                      key={preset}
                      variant={compressionPreset === preset ? 'default' : 'outline'}
                      onClick={() => setCompressionPreset(preset)}
                      size="sm"
                    >
                      {preset === 'none' && '无压缩'}
                      {preset === 'light' && '轻度(30-50%)'}
                      {preset === 'standard' && '标准(50-70%)'}
                      {preset === 'heavy' && '高度(70-85%)'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={submitSTT}
                disabled={!audioBlob && !uploadedFile || isPolling}
                className="w-full"
              >
                {isPolling ? '处理中...' : '执行STT'}
              </Button>
            </CardContent>
          </Card>

          {/* Status and Results */}
          {(jobStatus || transcription || errorMessage) && (
            <Card>
              <CardHeader>
                <CardTitle>处理状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {jobStatus && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">状态:</span>
                    {getStatusBadge(jobStatus)}
                    {isPolling && <span className="text-sm text-neutral-500">轮询中...</span>}
                  </div>
                )}

                {errorMessage && (
                  <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
                    {errorMessage}
                  </div>
                )}

                {transcription && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">转录结果</label>
                    <div className="rounded-md bg-neutral-50 p-4 text-sm">
                      <pre className="whitespace-pre-wrap font-sans">{transcription}</pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Task List */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>STT任务列表</CardTitle>
              <CardDescription>查看所有STT任务的状态和结果</CardDescription>
            </CardHeader>
            <CardContent>
              {!jobsData?.data?.length ? (
                <p className="text-center text-sm text-neutral-500 py-8">暂无任务</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {jobsData.data.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => openTaskDetail(job)}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 cursor-pointer transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm">{job.originalName}</span>
                            {getStatusBadge(job.status)}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-neutral-500">
                            <span>提供商: {job.provider}</span>
                            <span>大小: {formatFileSize(job.fileSize)}</span>
                            {job.duration && <span>时长: {formatDuration(Math.round(job.duration))}</span>}
                            <span>创建: {new Date(job.createdAt).toLocaleString('zh-CN')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTaskListPage(p => Math.max(0, p - 1))}
                      disabled={taskListPage === 0}
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-neutral-600">
                      第 {taskListPage + 1} 页 · 共 {jobsData.total} 条
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTaskListPage(p => p + 1)}
                      disabled={!jobsData.hasMore}
                    >
                      下一页
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>任务详情</DialogTitle>
            <DialogDescription>STT任务的完整信息和转录结果</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-neutral-700">任务ID:</span>
                  <p className="text-neutral-600 font-mono text-xs mt-1">{selectedTask.id}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">状态:</span>
                  <div className="mt-1">{getStatusBadge(selectedTask.status)}</div>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">文件名:</span>
                  <p className="text-neutral-600 mt-1">{selectedTask.originalName}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">文件大小:</span>
                  <p className="text-neutral-600 mt-1">{formatFileSize(selectedTask.fileSize)}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-700">提供商:</span>
                  <p className="text-neutral-600 mt-1">{selectedTask.provider}</p>
                </div>
                {selectedTask.languageCode && (
                  <div>
                    <span className="font-medium text-neutral-700">语言:</span>
                    <p className="text-neutral-600 mt-1">{selectedTask.languageCode}</p>
                  </div>
                )}
                {selectedTask.duration && (
                  <div>
                    <span className="font-medium text-neutral-700">时长:</span>
                    <p className="text-neutral-600 mt-1">{formatDuration(Math.round(selectedTask.duration))}</p>
                  </div>
                )}
                {selectedTask.compressionPreset && (
                  <div>
                    <span className="font-medium text-neutral-700">压缩:</span>
                    <p className="text-neutral-600 mt-1">{selectedTask.compressionPreset}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-neutral-700">创建时间:</span>
                  <p className="text-neutral-600 mt-1">{new Date(selectedTask.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                {selectedTask.completedAt && (
                  <div>
                    <span className="font-medium text-neutral-700">完成时间:</span>
                    <p className="text-neutral-600 mt-1">{new Date(selectedTask.completedAt).toLocaleString('zh-CN')}</p>
                  </div>
                )}
              </div>

              {selectedTask.errorMessage && (
                <div>
                  <span className="font-medium text-neutral-700 text-sm">错误信息:</span>
                  <div className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
                    {selectedTask.errorMessage}
                  </div>
                </div>
              )}

              {selectedTask.transcription && (
                <div>
                  <span className="font-medium text-neutral-700 text-sm">转录结果:</span>
                  <div className="mt-2 rounded-md bg-neutral-50 p-4 text-sm max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans">{selectedTask.transcription}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
