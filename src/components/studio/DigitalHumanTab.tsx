/**
 * 数字人合成 Tab
 * 显示每个镜头的数字人生成状态和操作
 */

'use client'

import { useState, useRef } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Button } from '@/components/ui'
import { Card, CardContent } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Progress } from '@/components/ui'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Volume2,
  PlayCircle,
  RefreshCw,
  Save,
} from 'lucide-react'
import { toast } from '~/components/ui/toast'

interface DigitalHumanTabProps {
  episodeId: string
}

// 任务阶段进度映射
const STAGE_PROGRESS: Record<string, number> = {
  UPLOADING_ASSETS: 5,
  UPLOAD_FAILED: 0,
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

// 阶段标签映射
const STAGE_LABELS: Record<string, string> = {
  UPLOADING_ASSETS: 'S3上传中',
  UPLOAD_FAILED: '上传失败',
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

export function DigitalHumanTab({ episodeId }: DigitalHumanTabProps) {
  const [peFastMode, setPeFastMode] = useState(false) // 默认不启用快速模式
  const [selectedShotIds, setSelectedShotIds] = useState<Set<string>>(new Set())
  const [delayMinutes, setDelayMinutes] = useState(2) // 延迟时间（分钟），默认2分钟
  const [isBatchGenerating, setIsBatchGenerating] = useState(false)
  const [shouldTerminate, setShouldTerminate] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 })
  const shouldTerminateRef = useRef(false) // 使用 ref 确保终止标志立即生效

  const {
    data,
    isLoading,
    error,
    refetch,
  } = api.studio.getEpisodeDigitalHumanTasks.useQuery(
    { episodeId },
    {
      refetchInterval: 10000, // 每10秒刷新
      refetchIntervalInBackground: false,
    }
  )

  const createTaskMutation = api.studio.createShotDigitalHumanTask.useMutation({
    onSuccess: () => {
      // 批量生成时不显示单个成功提示，也不刷新
      if (!isBatchGenerating) {
        toast.success('数字人生成任务已创建')
        refetch()
      }
    },
    onError: (error) => {
      // 批量生成时的错误在 handleBatchGenerate 中处理
      if (!isBatchGenerating) {
        toast.error(`创建失败: ${error.message}`)
      }
    },
  })

  const saveToMediaBrowserMutation = api.mediaBrowser.downloadAndSaveUrl.useMutation({
    onSuccess: (data) => {
      toast.success(`已下载并保存: ${data.fileName}`)
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`)
    },
  })

  const handleGenerate = (shotId: string) => {
    createTaskMutation.mutate({ shotId, peFastMode })
  }

  // 存媒体到媒体浏览器（只在有且仅有一个演员时可用）
  const handleSaveToMedia = (url: string, shot: any) => {
    // 必须有且只有一个演员
    if (!shot.characters || shot.characters.length !== 1) {
      return
    }

    const firstCharacter = shot.characters[0]
    const actorId = firstCharacter?.character?.sourceActorId

    if (!actorId) {
      toast.error('演员未关联sourceActorId')
      return
    }

    saveToMediaBrowserMutation.mutate({
      url,
      actorId,
    })
  }

  // 切换镜头选中状态
  const toggleShotSelection = (shotId: string) => {
    setSelectedShotIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(shotId)) {
        newSet.delete(shotId)
      } else {
        newSet.add(shotId)
      }
      return newSet
    })
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    const shots = data?.shots || []
    const selectableShots = shots.filter(
      (shot) => shot.hasFirstFrame && shot.hasAudio
    )
    if (selectedShotIds.size === selectableShots.length) {
      setSelectedShotIds(new Set())
    } else {
      setSelectedShotIds(new Set(selectableShots.map((shot) => shot.id)))
    }
  }

  // 批量生成（带延迟）
  const handleBatchGenerate = async () => {
    if (selectedShotIds.size === 0) {
      toast.error('请先选择要生成的镜头')
      return
    }

    setIsBatchGenerating(true)
    setShouldTerminate(false)
    shouldTerminateRef.current = false

    const shotIds = Array.from(selectedShotIds)
    const totalShots = shotIds.length
    setBatchProgress({ completed: 0, total: totalShots })

    // 获取镜头信息用于显示更详细的错误
    const shotsMap = new Map(
      (data?.shots || []).map((shot) => [shot.id, shot])
    )

    let completedCount = 0
    const delayMs = delayMinutes * 60 * 1000 // 转换为毫秒

    try {
      for (let i = 0; i < shotIds.length; i++) {
        // 检查是否需要终止
        if (shouldTerminateRef.current) {
          toast.info(`批量生成已终止，已处理 ${completedCount}/${totalShots} 个镜头`)
          break
        }

        const shotId = shotIds[i]!
        const shot = shotsMap.get(shotId)

        try {
          // 创建生成任务
          await createTaskMutation.mutateAsync({ shotId, peFastMode })
          completedCount++
          setBatchProgress({ completed: completedCount, total: totalShots })
          console.log(`✅ 镜头 #${shot?.shotNumber || shotId} 生成任务创建成功 (${completedCount}/${totalShots})`)

          // 如果不是最后一个任务，且未终止，则等待延迟
          if (i < shotIds.length - 1 && !shouldTerminateRef.current) {
            console.log(`⏱️ 等待 ${delayMinutes} 分钟后创建下一个任务...`)
            toast.info(`已创建 ${completedCount}/${totalShots} 个任务，${delayMinutes} 分钟后创建下一个`)
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }
        } catch (error) {
          // 捕获错误但不中断批量生成
          const shotName = shot ? `#${shot.shotNumber} ${shot.name || ''}` : shotId
          console.error(`❌ 镜头 ${shotName} 生成失败:`, error)
          toast.error(`镜头 ${shotName} 生成失败，已跳过`)
          completedCount++
          setBatchProgress({ completed: completedCount, total: totalShots })

          // 失败后也等待延迟再继续
          if (i < shotIds.length - 1 && !shouldTerminateRef.current) {
            await new Promise(resolve => setTimeout(resolve, delayMs))
          }
        }
      }

      if (!shouldTerminateRef.current) {
        toast.success(`批量生成完成！共处理 ${completedCount} 个镜头`)
      }

      // 清空选中状态
      setSelectedShotIds(new Set())
    } catch (error) {
      console.error('批量生成错误:', error)
      toast.error('批量生成过程中出现错误')
    } finally {
      setIsBatchGenerating(false)
      setShouldTerminate(false)
      shouldTerminateRef.current = false
      setBatchProgress({ completed: 0, total: 0 })
      refetch() // 统一在最后刷新一次
    }
  }

  // 终止批量生成
  const handleTerminate = () => {
    setShouldTerminate(true)
    shouldTerminateRef.current = true // 立即设置 ref
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
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
            <AlertDescription>加载失败: {error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const shots = data?.shots || []
  const selectableShots = shots.filter(
    (shot) => shot.hasFirstFrame && shot.hasAudio
  )
  const allSelected = selectedShotIds.size === selectableShots.length && selectableShots.length > 0

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">数字人合成</h2>
          <p className="text-sm text-gray-500">
            {data?.projectName} / {data?.episodeName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 快速模式勾选 */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={peFastMode}
              onChange={(e) => setPeFastMode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">快速模式</span>
          </label>

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
      </div>

      {/* 批量操作栏 */}
      {selectableShots.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* 全选 */}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 font-medium">全选</span>
                </label>

                {/* 选中计数或批量进度 */}
                {isBatchGenerating && batchProgress.total > 0 ? (
                  <span className="text-sm text-gray-600">
                    正在生成 <span className="font-semibold text-blue-600">{batchProgress.completed}/{batchProgress.total}</span>
                  </span>
                ) : selectedShotIds.size > 0 ? (
                  <span className="text-sm text-gray-600">
                    已选中 <span className="font-semibold text-blue-600">{selectedShotIds.size}</span> 个镜头
                  </span>
                ) : null}

                {/* 延迟时间配置 */}
                <div className="flex items-center gap-2 text-sm">
                  <label htmlFor="delayMinutes" className="text-gray-700">
                    间隔(分钟):
                  </label>
                  <input
                    id="delayMinutes"
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Math.max(0, parseFloat(e.target.value) || 0))}
                    disabled={isBatchGenerating}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 批量生成按钮 */}
              <div>
                {!isBatchGenerating ? (
                  <Button
                    onClick={handleBatchGenerate}
                    disabled={selectedShotIds.size === 0}
                    size="sm"
                  >
                    <PlayCircle className="h-4 w-4 mr-1.5" />
                    全部生成
                  </Button>
                ) : (
                  <Button
                    onClick={handleTerminate}
                    variant="destructive"
                    size="sm"
                  >
                    <AlertCircle className="h-4 w-4 mr-1.5" />
                    终止
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 镜头列表 */}
      <div className="space-y-3">
        {shots.length === 0 && (
          <Card>
            <CardContent className="p-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  暂无镜头，请先在镜头制作页面创建镜头
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {shots.map((shot) => {
          const task = shot.latestTask
          const progress = task ? STAGE_PROGRESS[task.stage] || 0 : 0
          const stageLabel = task ? STAGE_LABELS[task.stage] || task.stage : '-'
          const isProcessing = task && [
            'FACE_RECOGNITION_PROCESSING',
            'VIDEO_GENERATION_PROCESSING',
          ].includes(task.stage)
          const isCompleted = task?.stage === 'VIDEO_GENERATION_COMPLETED'
          const isFailed = task?.stage === 'FAILED'
          const canGenerate = shot.hasFirstFrame && shot.hasAudio
          const isSelected = selectedShotIds.has(shot.id)

          return (
            <Card key={shot.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* 顶部：镜头信息和操作 */}
                  <div className="flex items-start justify-between gap-4">
                    {/* 复选框 */}
                    {canGenerate && (
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleShotSelection(shot.id)}
                          disabled={isBatchGenerating}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold">
                          #{shot.shotNumber} {shot.name}
                        </h3>

                        {/* 首帧和音频状态 */}
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={shot.hasFirstFrame ? 'success' : 'outline'}
                            className="text-xs"
                          >
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {shot.hasFirstFrame ? '有首帧' : '无首帧'}
                          </Badge>
                          <Badge
                            variant={shot.hasAudio ? 'success' : 'outline'}
                            className="text-xs"
                          >
                            <Volume2 className="h-3 w-3 mr-1" />
                            {shot.hasAudio ? '有音频' : '无音频'}
                          </Badge>
                        </div>

                        {/* 任务状态 */}
                        {task && (
                          <Badge
                            variant={
                              isCompleted
                                ? 'success'
                                : isFailed
                                ? 'danger'
                                : isProcessing
                                ? 'default'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {stageLabel}
                          </Badge>
                        )}
                      </div>

                      {/* 提示词 */}
                      {shot.prompt && (
                        <div className="text-xs text-gray-600 mb-1">
                          <span className="font-medium">提示词：</span>
                          <span className="ml-1">{shot.prompt}</span>
                        </div>
                      )}

                      {/* 错误信息 */}
                      {task?.errorMessage && (
                        <div className="text-xs text-red-500">
                          错误：{task.errorMessage}
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex-shrink-0">
                      {!task && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(shot.id)}
                          disabled={!canGenerate || createTaskMutation.isPending}
                          className="h-8"
                          title={
                            !shot.hasFirstFrame
                              ? '请先生成首帧'
                              : !shot.hasAudio
                              ? '请先选择音频'
                              : '生成数字人视频'
                          }
                        >
                          {createTaskMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <PlayCircle className="h-3.5 w-3.5 mr-1" />
                          )}
                          生成
                        </Button>
                      )}

                      {task && !isCompleted && !isFailed && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="h-8"
                        >
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          生成中
                        </Button>
                      )}

                      {(isCompleted || isFailed) && (
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(shot.id)}
                          disabled={!canGenerate || createTaskMutation.isPending}
                          className="h-8"
                        >
                          {createTaskMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          )}
                          重新生成
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 进度条（如果有任务） */}
                  {task && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-700">
                          {stageLabel}
                        </span>
                        <span className="text-xs text-gray-500">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}

                  {/* 视频预览（已完成） */}
                  {isCompleted && task.resultVideoUrl && (
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <a
                        href={task.resultVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-32 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0 group cursor-pointer block"
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
                      </a>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1" />
                            生成完成
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            点击预览窗口在新标签页查看视频
                          </p>
                        </div>
                        {/* 存媒体按钮 */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveToMedia(task.resultVideoUrl!, shot)}
                            disabled={saveToMediaBrowserMutation.isPending}
                            className="h-7 text-xs"
                            title={
                              !shot.characters || shot.characters.length === 0
                                ? "镜头无演员，点击查看详情"
                                : shot.characters.length > 1
                                ? "镜头有多个演员，点击查看详情"
                                : "保存到媒体浏览器"
                            }
                          >
                            <Save className="h-3 w-3 mr-1" />
                            存媒体
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
