/**
 * 数字人任务详情和进度显示
 */

'use client'

import { useState, useEffect } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { Progress } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Loader2, AlertCircle, CheckCircle2, Clock, Film, PlayCircle, User, Pause } from 'lucide-react'
import { SubjectSelection } from './SubjectSelection'
import Image from 'next/image'

interface DigitalHumanTaskDetailProps {
  taskId: string
}

// 任务阶段映射
const STAGE_INFO = {
  FACE_RECOGNITION_SUBMITTED: {
    label: '提交主体识别',
    description: '正在提交主体识别任务...',
    progress: 10,
  },
  FACE_RECOGNITION_PROCESSING: {
    label: '主体识别中',
    description: '正在识别图片中的人物或主体...',
    progress: 20,
  },
  FACE_RECOGNITION_COMPLETED: {
    label: '主体识别完成',
    description: '已检测到图片中的主体',
    progress: 30,
  },
  SUBJECT_DETECTION_COMPLETED: {
    label: '主体检测完成',
    description: '已完成多主体检测',
    progress: 40,
  },
  AWAITING_SUBJECT_SELECTION: {
    label: '等待选择主体',
    description: '请选择需要进行数字人生成的主体',
    progress: 50,
  },
  VIDEO_GENERATION_SUBMITTED: {
    label: '提交视频生成',
    description: '正在提交视频生成任务...',
    progress: 60,
  },
  VIDEO_GENERATION_PROCESSING: {
    label: '视频生成中',
    description: '正在生成数字人视频，请耐心等待...',
    progress: 80,
  },
  VIDEO_GENERATION_COMPLETED: {
    label: '视频生成完成',
    description: '数字人视频已生成完成',
    progress: 100,
  },
  FAILED: {
    label: '任务失败',
    description: '任务执行失败，请检查错误信息',
    progress: 0,
  },
} as const

export function DigitalHumanTaskDetail({ taskId }: DigitalHumanTaskDetailProps) {
  const [shouldRefetch, setShouldRefetch] = useState(false)

  const {
    data: task,
    isLoading,
    error,
    refetch,
  } = api.digitalHuman.getTask.useQuery(
    { taskId },
    {
      refetchInterval: shouldRefetch ? 5000 : false, // 处理中时每5秒轮询一次
      refetchIntervalInBackground: true,
    }
  )

  useEffect(() => {
    if (task) {
      const isProcessing = [
        'FACE_RECOGNITION_PROCESSING',
        'VIDEO_GENERATION_PROCESSING',
      ].includes(task.stage)

      setShouldRefetch(isProcessing)
    }
  }, [task])

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
            <AlertDescription>获取任务详情失败: {error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!task) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>任务不存在</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const stageInfo = STAGE_INFO[task.stage as keyof typeof STAGE_INFO]
  const isProcessing = [
    'FACE_RECOGNITION_PROCESSING',
    'VIDEO_GENERATION_PROCESSING',
  ].includes(task.stage)

  return (
    <div className="space-y-6">
      {/* 任务基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{task.name}</CardTitle>
              <CardDescription>
                创建时间: {new Date(task.createdAt).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={
                task.stage === 'VIDEO_GENERATION_COMPLETED' ? 'success' :
                task.stage === 'FAILED' ? 'danger' :
                isProcessing ? 'default' : 'outline'
              }>
                {stageInfo.label}
              </Badge>
              {task.enableMultiSubject && (
                <Badge variant="outline" className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  多主体
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 进度条 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{stageInfo.label}</span>
                <span className="text-sm text-gray-500">{stageInfo.progress}%</span>
              </div>
              <Progress value={stageInfo.progress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">{stageInfo.description}</p>
            </div>

            {/* 任务参数 */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">多主体模式</p>
                <p className="text-sm font-medium">
                  {task.enableMultiSubject ? '是' : '否'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">快速模式</p>
                <p className="text-sm font-medium">
                  {task.peFastMode ? '是' : '否'}
                </p>
              </div>
              {task.prompt && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">提示词</p>
                  <p className="text-sm font-medium">{task.prompt}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 输入预览 */}
      <Card>
        <CardHeader>
          <CardTitle>输入素材</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 原始图片 */}
            <div>
              <p className="text-sm font-medium mb-2">输入图片</p>
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={task.imageUrl}
                  alt="输入图片"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>

            {/* 音频信息 */}
            <div>
              <p className="text-sm font-medium mb-2">输入音频</p>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <PlayCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">音频已上传</p>
                  <a
                    href={task.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    查看音频
                  </a>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 等待选择主体 */}
      {task.stage === 'AWAITING_SUBJECT_SELECTION' && task.maskUrls && (
        <SubjectSelection
          taskId={task.id}
          maskUrls={task.maskUrls}
          onSuccess={() => {
            // 选择成功后重新获取任务状态
            setTimeout(() => refetch(), 1000)
          }}
        />
      )}

      {/* 视频生成成功 */}
      {task.stage === 'VIDEO_GENERATION_COMPLETED' && task.resultVideoUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
              生成完成
            </CardTitle>
            <CardDescription>数字人视频已生成完成</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 视频预览 */}
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  src={task.resultVideoUrl}
                  controls
                  className="w-full h-full"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-4">
                <Button asChild>
                  <a href={task.resultVideoUrl} download>
                    下载视频
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={task.resultVideoUrl} target="_blank">
                    在新窗口播放
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 任务失败 */}
      {task.stage === 'FAILED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              任务失败
            </CardTitle>
            <CardDescription>任务执行过程中出现错误</CardDescription>
          </CardHeader>
          <CardContent>
            {task.errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{task.errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}