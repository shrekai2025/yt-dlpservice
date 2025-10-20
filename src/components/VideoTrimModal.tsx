"use client"

import { useState, useRef, useEffect } from 'react'
import { X, Scissors, Loader2, Volume2, VolumeX } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'

type VideoTrimModalProps = {
  isOpen: boolean
  onClose: () => void
  videoFile: {
    id: string
    name: string
    localPath?: string | null
    sourceUrl?: string | null
    duration?: number | null
  }
  onTrimComplete: () => void
}

export function VideoTrimModal({ isOpen, onClose, videoFile, onTrimComplete }: VideoTrimModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [isDraggingStart, setIsDraggingStart] = useState(false)
  const [isDraggingEnd, setIsDraggingEnd] = useState(false)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMuted, setIsMuted] = useState(true) // 默认静音
  const timelineRef = useRef<HTMLDivElement>(null)

  // 获取视频URL
  const videoUrl = videoFile.localPath
    ? `/api/media-file/${videoFile.localPath.replace('data/media-uploads/', '')}`
    : videoFile.sourceUrl || ''

  console.log('VideoTrimModal - 视频信息:', {
    name: videoFile.name,
    localPath: videoFile.localPath,
    sourceUrl: videoFile.sourceUrl,
    videoUrl: videoUrl
  })

  // 当视频加载完成时设置时长
  useEffect(() => {
    // 只在 modal 打开时才设置监听器
    if (!isOpen) return

    // 使用 setTimeout 确保 DOM 已经渲染
    const timer = setTimeout(() => {
      const video = videoRef.current
      if (!video) {
        console.log('❌ 视频元素不存在')
        return
      }

      console.log('✅ 找到视频元素，设置事件监听器, URL:', videoUrl)

      // 确保视频默认静音
      video.muted = isMuted

      const handleLoadedMetadata = () => {
        const duration = video.duration
        console.log('✅ 视频元数据已加载！')
        console.log('   - 时长:', duration, '秒')
        console.log('   - readyState:', video.readyState)
        console.log('   - videoWidth:', video.videoWidth)
        console.log('   - videoHeight:', video.videoHeight)

        if (isNaN(duration) || duration === 0) {
          console.warn('⚠️ 视频时长无效:', duration)
          return
        }

        setVideoDuration(duration)
        setEndTime(duration)
        setStartTime(0)
        setCurrentTime(0)
      }

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime)
      }

      const handleError = (e: Event) => {
        console.error('❌ 视频加载错误:', e)
        console.error('   - error:', video.error)
        console.error('   - networkState:', video.networkState)
        console.error('   - readyState:', video.readyState)
      }

      const handleCanPlay = () => {
        console.log('🎬 视频可以播放')
        console.log('   - readyState:', video.readyState)
        console.log('   - duration:', video.duration)
      }

      const handleLoadStart = () => {
        console.log('📥 开始加载视频...')
      }

      const handleLoadedData = () => {
        console.log('📦 视频数据已加载')
        console.log('   - readyState:', video.readyState)
      }

      // 如果视频已经加载，立即设置时长
      console.log('当前 readyState:', video.readyState)
      console.log('当前 duration:', video.duration)

      if (video.readyState >= 1 && video.duration && !isNaN(video.duration)) {
        console.log('视频已经加载，立即设置时长')
        handleLoadedMetadata()
      }

      video.addEventListener('loadstart', handleLoadStart)
      video.addEventListener('loadeddata', handleLoadedData)
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('timeupdate', handleTimeUpdate)
      video.addEventListener('error', handleError)

      // 清理函数
      return () => {
        console.log('清理视频事件监听器')
        video.removeEventListener('loadstart', handleLoadStart)
        video.removeEventListener('loadeddata', handleLoadedData)
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('timeupdate', handleTimeUpdate)
        video.removeEventListener('error', handleError)
      }
    }, 100) // 延迟 100ms 确保 DOM 已渲染

    return () => {
      clearTimeout(timer)
    }
  }, [isOpen, videoUrl])

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // 处理时间轴点击
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || isDraggingStart || isDraggingEnd || isDraggingPlayhead || videoDuration === 0) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    const time = percent * videoDuration

    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  // 处理开始标志拖动
  const handleStartDrag = (e: React.MouseEvent) => {
    if (videoDuration === 0) return
    e.preventDefault()
    setIsDraggingStart(true)
  }

  // 处理结束标志拖动
  const handleEndDrag = (e: React.MouseEvent) => {
    if (videoDuration === 0) return
    e.preventDefault()
    setIsDraggingEnd(true)
  }

  // 处理播放头拖动
  const handlePlayheadDrag = (e: React.MouseEvent) => {
    if (videoDuration === 0) return
    e.preventDefault()
    setIsDraggingPlayhead(true)
  }

  // 全局鼠标移动处理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return

      // 防止拖拽时选中文本
      e.preventDefault()

      const rect = timelineRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = Math.max(0, Math.min(1, x / rect.width))
      const time = percent * videoDuration

      if (isDraggingStart) {
        setStartTime(Math.min(time, endTime - 0.1))
      } else if (isDraggingEnd) {
        setEndTime(Math.max(time, startTime + 0.1))
      } else if (isDraggingPlayhead) {
        const clampedTime = Math.max(0, Math.min(videoDuration, time))
        if (videoRef.current) {
          videoRef.current.currentTime = clampedTime
          setCurrentTime(clampedTime)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDraggingStart(false)
      setIsDraggingEnd(false)
      setIsDraggingPlayhead(false)
    }

    if (isDraggingStart || isDraggingEnd || isDraggingPlayhead) {
      // 禁用文本选择
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ew-resize'

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingStart, isDraggingEnd, isDraggingPlayhead, videoDuration, startTime, endTime])

  // 播放/暂停
  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }

  // 设置开始时间为当前播放时间
  const setStartToCurrent = () => {
    if (videoRef.current && videoDuration > 0) {
      const time = videoRef.current.currentTime
      setStartTime(Math.min(time, endTime - 0.1))
    }
  }

  // 设置结束时间为当前播放时间
  const setEndToCurrent = () => {
    if (videoRef.current && videoDuration > 0) {
      const time = videoRef.current.currentTime
      setEndTime(Math.max(time, startTime + 0.1))
    }
  }

  // 切换静音
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
  }

  // 键盘快捷键
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略在输入框中的按键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case '[':
          e.preventDefault()
          setStartToCurrent()
          break
        case ']':
          e.preventDefault()
          setEndToCurrent()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          toggleMute()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, videoDuration, startTime, endTime, isMuted])

  // 处理裁剪
  const handleTrim = async () => {
    try {
      setIsProcessing(true)

      const response = await fetch('/api/admin/media/trim-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: videoFile.id,
          startTime,
          endTime,
        }),
      })

      if (!response.ok) {
        throw new Error('视频裁剪失败')
      }

      const result = await response.json()

      if (result.success) {
        onTrimComplete()
        onClose()
      } else {
        alert(`裁剪失败: ${result.error}`)
      }
    } catch (error) {
      console.error('视频裁剪错误:', error)
      alert('视频裁剪失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }

  const startPercent = videoDuration > 0 ? (startTime / videoDuration) * 100 : 0
  const endPercent = videoDuration > 0 ? (endTime / videoDuration) * 100 : 100
  const currentPercent = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0
  const selectionWidth = endPercent - startPercent

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-white border-b px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">视频裁剪</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">
              {videoFile.name}
            </DialogDescription>
            <div className="mt-2 text-xs text-neutral-400">
              快捷键：<kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">空格</kbd> 播放/暂停
              {' '}<kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">[</kbd> 设为开始
              {' '}<kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">]</kbd> 设为结尾
              {' '}<kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">M</kbd> 静音/取消静音
            </div>
          </DialogHeader>
        </div>

        <div className="flex flex-col px-6 pb-6">
          {/* Video Preview */}
          <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden my-4 relative min-h-[300px]">
            <video
              ref={videoRef}
              src={videoUrl}
              className="max-w-full max-h-[40vh] object-contain"
              onClick={togglePlay}
              preload="metadata"
              playsInline
              controls={false}
              muted={isMuted}
            />
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full transition-all"
              title={isMuted ? '取消静音 (M)' : '静音 (M)'}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Debug Info */}
          {videoDuration === 0 && (
            <div className="text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded mb-2">
              <div>正在加载视频元数据...</div>
              <div className="mt-1 font-mono text-[10px] text-neutral-600">URL: {videoUrl}</div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-4">
            {/* Time Display */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-neutral-500">开始: </span>
                  <span className="font-mono font-semibold">{formatTime(startTime)}</span>
                </div>
                <div>
                  <span className="text-neutral-500">结束: </span>
                  <span className="font-mono font-semibold">{formatTime(endTime)}</span>
                </div>
                <div>
                  <span className="text-neutral-500">时长: </span>
                  <span className="font-mono font-semibold">{formatTime(endTime - startTime)}</span>
                </div>
              </div>
              <div>
                <span className="text-neutral-500">当前: </span>
                <span className="font-mono font-semibold">{formatTime(currentTime)}</span>
              </div>
            </div>

            {/* Timeline Track */}
            <div className="relative">
              <div
                ref={timelineRef}
                className="relative h-20 bg-neutral-200 rounded-lg cursor-pointer overflow-hidden select-none"
                onClick={handleTimelineClick}
              >
                {/* Selected Region */}
                <div
                  className="absolute top-0 bottom-0 bg-blue-500 bg-opacity-30 border-l-2 border-r-2 border-blue-600"
                  style={{
                    left: `${startPercent}%`,
                    width: `${selectionWidth}%`,
                  }}
                />

                {/* Start Marker */}
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize z-20"
                  style={{ left: `${startPercent}%`, width: '20px', marginLeft: '-10px' }}
                  onMouseDown={handleStartDrag}
                >
                  <div className={`absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-8 rounded-sm flex items-center justify-center shadow-lg transition-all ${
                    isDraggingStart ? 'bg-green-700 scale-110' : 'bg-green-600 hover:bg-green-700'
                  }`}>
                    <div className="w-0.5 h-4 bg-white" />
                  </div>
                  <div className="absolute left-1/2 -top-6 -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                    {formatTime(startTime)}
                  </div>
                </div>

                {/* End Marker */}
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize z-20"
                  style={{ left: `${endPercent}%`, width: '20px', marginLeft: '-10px' }}
                  onMouseDown={handleEndDrag}
                >
                  <div className={`absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-8 rounded-sm flex items-center justify-center shadow-lg transition-all ${
                    isDraggingEnd ? 'bg-red-700 scale-110' : 'bg-red-600 hover:bg-red-700'
                  }`}>
                    <div className="w-0.5 h-4 bg-white" />
                  </div>
                  <div className="absolute left-1/2 -top-6 -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                    {formatTime(endTime)}
                  </div>
                </div>

                {/* Current Time Playhead */}
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize z-30"
                  style={{ left: `${currentPercent}%`, width: '16px', marginLeft: '-8px' }}
                  onMouseDown={handlePlayheadDrag}
                >
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-yellow-500 -translate-x-1/2" />
                  <div className={`absolute left-1/2 -top-2 -translate-x-1/2 w-3 h-3 rounded-full shadow-lg transition-all ${
                    isDraggingPlayhead ? 'bg-yellow-600 scale-125' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`} />
                  <div className={`absolute left-1/2 -bottom-2 -translate-x-1/2 w-3 h-3 rounded-full shadow-lg transition-all ${
                    isDraggingPlayhead ? 'bg-yellow-600 scale-125' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`} />
                </div>
              </div>

              {/* Time Labels */}
              <div className="flex items-center justify-between text-xs text-neutral-500 mt-1 px-1">
                <span>0:00</span>
                <span>{formatTime(videoDuration)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleTrim}
              disabled={isProcessing || endTime - startTime < 0.1}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4" />
                  裁剪并保存
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
