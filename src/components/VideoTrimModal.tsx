"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { X, Scissors, Loader2, Volume2, VolumeX, Crop, Image } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'

type CropMode = 'time' | 'region' | 'both'

type CropArea = {
  x: number      // 像素坐标
  y: number
  width: number
  height: number
}

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
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const [videoDuration, setVideoDuration] = useState(videoFile.duration || 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(videoFile.duration || 0)
  const [isDraggingStart, setIsDraggingStart] = useState(false)
  const [isDraggingEnd, setIsDraggingEnd] = useState(false)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMuted, setIsMuted] = useState(true) // 默认静音
  const [isInitializing, setIsInitializing] = useState(!(videoFile.duration && videoFile.duration > 0))
  const timelineRef = useRef<HTMLDivElement>(null)

  // 新增：裁剪模式和区域选择
  const [cropMode, setCropMode] = useState<CropMode>('time')
  const [cropArea, setCropArea] = useState<CropArea | null>(null) // 实际像素坐标
  const [tempCropArea, setTempCropArea] = useState<CropArea | null>(null) // 拖拽时的显示坐标
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [isUpdatingThumbnail, setIsUpdatingThumbnail] = useState(false)

  // 获取视频URL - 使用 useMemo 避免重复计算
  const videoUrl = useMemo(() =>
    videoFile.localPath
      ? `/api/media-file/${videoFile.localPath.replace('data/media-uploads/', '')}`
      : videoFile.sourceUrl || ''
  , [videoFile.localPath, videoFile.sourceUrl])

  // 当视频加载完成时设置时长
  useEffect(() => {
    // 只在 modal 打开时才设置监听器
    if (!isOpen) return

    // 如果 videoFile 已经有 duration，直接使用
    if (videoFile.duration && videoFile.duration > 0) {
      setVideoDuration(videoFile.duration)
      setEndTime(videoFile.duration)
      setStartTime(0)
      setCurrentTime(0)
      setIsInitializing(false)
    }

    // 使用 setTimeout 确保 DOM 已经渲染
    const timer = setTimeout(() => {
      const video = videoRef.current
      if (!video) return

      // 确保视频默认静音
      video.muted = isMuted

      const handleLoadedMetadata = () => {
        const duration = video.duration
        if (isNaN(duration) || duration === 0) return

        setVideoDuration(duration)
        setEndTime(duration)
        setStartTime(0)
        setCurrentTime(0)
        setIsInitializing(false)
      }

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime)
      }

      // If video already loaded, set duration immediately
      if (video.readyState >= 1 && video.duration && !isNaN(video.duration)) {
        handleLoadedMetadata()
      }

      // Only listen to essential events
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('timeupdate', handleTimeUpdate)

      // Cleanup function
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('timeupdate', handleTimeUpdate)
      }
    }, 10) // 减少延迟到 10ms

    return () => {
      clearTimeout(timer)
    }
  }, [isOpen, videoUrl, videoFile.duration, isMuted])

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

  // 坐标转换：显示坐标 -> 实际像素坐标
  const convertToVideoCoordinates = (displayX: number, displayY: number, displayWidth: number, displayHeight: number) => {
    const video = videoRef.current
    if (!video) return { x: 0, y: 0, width: 0, height: 0 }

    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    const scaleX = videoWidth / video.clientWidth
    const scaleY = videoHeight / video.clientHeight

    return {
      x: Math.round(displayX * scaleX),
      y: Math.round(displayY * scaleY),
      width: Math.round(displayWidth * scaleX),
      height: Math.round(displayHeight * scaleY),
    }
  }

  // 获取鼠标在视频元素内的相对坐标
  const getRelativeCoordinates = (e: MouseEvent | React.MouseEvent) => {
    const video = videoRef.current
    if (!video) return { x: 0, y: 0 }

    const rect = video.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    }
  }

  // 处理区域选择开始
  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (cropMode === 'time' || !videoRef.current) return

    e.preventDefault()
    const coords = getRelativeCoordinates(e)
    setDragStart(coords)
    setIsDraggingCrop(true)
    setCropArea(null) // 清除旧的裁剪区域
    setTempCropArea(null)
  }

  // 处理区域选择移动
  useEffect(() => {
    if (!isDraggingCrop || !dragStart) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const coords = getRelativeCoordinates(e)

      const x = Math.min(dragStart.x, coords.x)
      const y = Math.min(dragStart.y, coords.y)
      const width = Math.abs(coords.x - dragStart.x)
      const height = Math.abs(coords.y - dragStart.y)

      // 设置临时显示坐标（用于实时显示选择框）
      setTempCropArea({ x, y, width, height })
    }

    const handleMouseUp = () => {
      setIsDraggingCrop(false)
      setDragStart(null)

      // 转换为实际视频像素坐标
      if (tempCropArea && tempCropArea.width > 10 && tempCropArea.height > 10) {
        const video = videoRef.current
        if (video) {
          const actualCoords = convertToVideoCoordinates(
            tempCropArea.x,
            tempCropArea.y,
            tempCropArea.width,
            tempCropArea.height
          )
          setCropArea(actualCoords)
          setTempCropArea(null)
        }
      } else {
        setTempCropArea(null)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingCrop, dragStart, tempCropArea])

  // 重置裁剪区域
  const resetCropArea = () => {
    setCropArea(null)
  }

  // 选定预览图：将当前时间点的帧设置为预览图
  const handleSetThumbnail = async () => {
    try {
      console.log('开始更新预览图:', { fileId: videoFile.id, currentTime })
      setIsUpdatingThumbnail(true)

      const response = await fetch('/api/admin/media/update-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: videoFile.id,
          timeInSeconds: currentTime,
        }),
      })

      console.log('API响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API错误响应:', errorText)
        throw new Error(`更新预览图失败: ${response.status}`)
      }

      const result = await response.json()
      console.log('API响应结果:', result)

      if (result.success) {
        onClose() // 先关闭弹窗
        // 短暂延迟后刷新页面，确保能看到变化
        setTimeout(() => {
          window.location.reload()
        }, 300)
      } else {
        alert(`更新失败: ${result.error}`)
      }
    } catch (error) {
      console.error('更新预览图错误:', error)
      alert(`更新预览图失败: ${error instanceof Error ? error.message : '请重试'}`)
    } finally {
      setIsUpdatingThumbnail(false)
    }
  }

  // 处理裁剪
  const handleTrim = async () => {
    try {
      setIsProcessing(true)

      // 根据模式选择不同的 API
      if (cropMode === 'time') {
        // 纯时间裁剪
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
      } else if (cropMode === 'region' || cropMode === 'both') {
        // 区域裁剪或组合裁剪
        if (!cropArea) {
          alert('请先选择裁剪区域')
          return
        }

        const requestBody: any = {
          fileId: videoFile.id,
          cropArea,
        }

        // 如果是组合模式，添加时间参数
        if (cropMode === 'both') {
          requestBody.startTime = startTime
          requestBody.endTime = endTime
        }

        const response = await fetch('/api/admin/media/crop-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
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
        <div className="sticky top-0 z-10 bg-white border-b px-4 pt-4 pb-3">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">视频编辑</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 truncate">
              {videoFile.name}
            </DialogDescription>

            {/* 模式切换 - 更紧凑 */}
            <div className="mt-3 flex items-center gap-1.5">
              <button
                onClick={() => setCropMode('time')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  cropMode === 'time'
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <Scissors className="h-3 w-3 inline mr-1" />
                时间裁剪
              </button>
              <button
                onClick={() => setCropMode('region')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  cropMode === 'region'
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <Crop className="h-3 w-3 inline mr-1" />
                区域裁剪
              </button>
              <button
                onClick={() => setCropMode('both')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  cropMode === 'both'
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                <Scissors className="h-3 w-3 inline mr-1" />
                <Crop className="h-3 w-3 inline mr-1" />
                组合裁剪
              </button>
            </div>

            <div className="mt-1.5 text-[10px] text-neutral-400">
              <kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">空格</kbd> 播放/暂停
              {' '}<kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">[</kbd> 设为开始
              {' '}<kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">]</kbd> 设为结尾
              {' '}<kbd className="px-1 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-neutral-700">M</kbd> 静音
            </div>
          </DialogHeader>
        </div>

        <div className="flex flex-col px-4 pb-4">
          {/* Video Preview - More Compact */}
          <div
            ref={videoContainerRef}
            className="flex items-center justify-center bg-black rounded overflow-hidden my-3 relative min-h-[250px]"
            onMouseDown={handleCropMouseDown}
            style={{ cursor: cropMode !== 'time' ? 'crosshair' : 'default' }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              key={videoUrl}
              className="max-w-full max-h-[35vh] object-contain"
              onClick={togglePlay}
              preload="auto"
              playsInline
              controls={false}
              muted={isMuted}
            />

            {/* 裁剪框叠加层 - 显示临时拖拽区域或确定的裁剪区域 */}
            {cropMode !== 'time' && (tempCropArea || cropArea) && videoRef.current && (() => {
              const video = videoRef.current!
              const videoRect = video.getBoundingClientRect()
              const containerRect = videoContainerRef.current!.getBoundingClientRect()

              // 计算视频在容器中的偏移（因为视频是居中的）
              const videoOffsetX = videoRect.left - containerRect.left
              const videoOffsetY = videoRect.top - containerRect.top

              let displayCrop
              if (tempCropArea) {
                // 拖拽时：直接使用显示坐标
                displayCrop = tempCropArea
              } else if (cropArea) {
                // 确定后：需要将实际像素坐标转换回显示坐标
                const scaleX = video.clientWidth / video.videoWidth
                const scaleY = video.clientHeight / video.videoHeight
                displayCrop = {
                  x: cropArea.x * scaleX,
                  y: cropArea.y * scaleY,
                  width: cropArea.width * scaleX,
                  height: cropArea.height * scaleY,
                }
              }

              return displayCrop ? (
                <div
                  className="absolute border-2 border-white bg-white bg-opacity-25 pointer-events-none"
                  style={{
                    left: `${videoOffsetX + displayCrop.x}px`,
                    top: `${videoOffsetY + displayCrop.y}px`,
                    width: `${displayCrop.width}px`,
                    height: `${displayCrop.height}px`,
                  }}
                >
                  {/* 裁剪框四角标记 */}
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
                </div>
              ) : null
            })()}

            {/* 提示文字 */}
            {cropMode !== 'time' && !cropArea && !isDraggingCrop && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-md text-sm pointer-events-none">
                拖动鼠标选择裁剪区域
              </div>
            )}

            {/* 选定预览图按钮 - 左下角 */}
            {!isInitializing && videoDuration > 0 && (
              <button
                onClick={handleSetThumbnail}
                disabled={isUpdatingThumbnail || isProcessing}
                className="absolute bottom-4 left-4 px-3 py-2 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all z-10 shadow-lg"
                title="将当前时间点的帧设置为视频预览图"
              >
                {isUpdatingThumbnail ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <Image className="h-3.5 w-3.5" />
                    选定预览图
                  </>
                )}
              </button>
            )}

            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full transition-all z-10"
              title={isMuted ? '取消静音 (M)' : '静音 (M)'}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Loading Info - Only show if really initializing */}
          {isInitializing && videoDuration === 0 && (
            <div className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1.5 rounded mb-2 flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              正在加载视频...
            </div>
          )}

          {/* 裁剪区域信息 - More Compact */}
          {cropMode !== 'time' && cropArea && (
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-blue-900">裁剪区域</div>
                <button
                  onClick={resetCropArea}
                  className="text-[10px] text-blue-600 hover:text-blue-800 underline"
                >
                  重新选择
                </button>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px] text-blue-800">
                <div>
                  <span className="font-medium">起始: </span>
                  <span className="font-mono">X:{cropArea.x} Y:{cropArea.y}</span>
                </div>
                <div>
                  <span className="font-medium">尺寸: </span>
                  <span className="font-mono">{cropArea.width}×{cropArea.height}</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline - More Compact */}
          {(cropMode === 'time' || cropMode === 'both') && (
            <div className="space-y-2.5">
            {/* Time Display - Smaller */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
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

            {/* Timeline Track - Smaller Height */}
            <div className="relative">
              <div
                ref={timelineRef}
                className="relative h-14 bg-neutral-200 rounded cursor-pointer overflow-hidden select-none"
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

                {/* Start Marker - Smaller */}
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize z-20"
                  style={{ left: `${startPercent}%`, width: '16px', marginLeft: '-8px' }}
                  onMouseDown={handleStartDrag}
                >
                  <div className={`absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-6 rounded-sm flex items-center justify-center shadow-lg transition-all ${
                    isDraggingStart ? 'bg-green-700 scale-110' : 'bg-green-600 hover:bg-green-700'
                  }`}>
                    <div className="w-0.5 h-3 bg-white" />
                  </div>
                  <div className="absolute left-1/2 -top-5 -translate-x-1/2 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                    {formatTime(startTime)}
                  </div>
                </div>

                {/* End Marker - Smaller */}
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize z-20"
                  style={{ left: `${endPercent}%`, width: '16px', marginLeft: '-8px' }}
                  onMouseDown={handleEndDrag}
                >
                  <div className={`absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-6 rounded-sm flex items-center justify-center shadow-lg transition-all ${
                    isDraggingEnd ? 'bg-red-700 scale-110' : 'bg-red-600 hover:bg-red-700'
                  }`}>
                    <div className="w-0.5 h-3 bg-white" />
                  </div>
                  <div className="absolute left-1/2 -top-5 -translate-x-1/2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                    {formatTime(endTime)}
                  </div>
                </div>

                {/* Current Time Playhead - Smaller */}
                <div
                  className="absolute top-0 bottom-0 cursor-ew-resize z-30"
                  style={{ left: `${currentPercent}%`, width: '12px', marginLeft: '-6px' }}
                  onMouseDown={handlePlayheadDrag}
                >
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-yellow-500 -translate-x-1/2" />
                  <div className={`absolute left-1/2 -top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full shadow-lg transition-all ${
                    isDraggingPlayhead ? 'bg-yellow-600 scale-125' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`} />
                  <div className={`absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full shadow-lg transition-all ${
                    isDraggingPlayhead ? 'bg-yellow-600 scale-125' : 'bg-yellow-500 hover:bg-yellow-600'
                  }`} />
                </div>
              </div>

              {/* Time Labels - Smaller */}
              <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-0.5 px-1">
                <span>0:00</span>
                <span>{formatTime(videoDuration)}</span>
              </div>
            </div>
            </div>
          )}

          {/* Action Buttons - More Compact */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t mt-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleTrim}
              disabled={
                isProcessing ||
                (cropMode === 'time' && endTime - startTime < 0.1) ||
                (cropMode === 'region' && !cropArea) ||
                (cropMode === 'both' && (!cropArea || endTime - startTime < 0.1))
              }
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  {cropMode === 'time' && <Scissors className="h-3 w-3" />}
                  {cropMode === 'region' && <Crop className="h-3 w-3" />}
                  {cropMode === 'both' && (
                    <>
                      <Scissors className="h-3 w-3" />
                      <Crop className="h-3 w-3" />
                    </>
                  )}
                  {cropMode === 'time' && '裁剪时间'}
                  {cropMode === 'region' && '裁剪区域'}
                  {cropMode === 'both' && '组合裁剪'}
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
