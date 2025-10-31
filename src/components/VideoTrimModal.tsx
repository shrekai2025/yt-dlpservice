"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import { Scissors, Loader2, Volume2, VolumeX, Crop, Image } from 'lucide-react'
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
    originalPath?: string | null
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
  const [isDraggingMove, setIsDraggingMove] = useState(false) // 移动遮罩
  const [dragType, setDragType] = useState<'create' | 'move' | 'resize' | null>(null)

  // 时间轴缩放相关
  const [timelineZoom, setTimelineZoom] = useState(1) // 缩放倍数，1 = 100%
  const timelineScrollRef = useRef<HTMLDivElement>(null)

  // 获取视频URL - 使用 useMemo 避免重复计算
  // 优先使用 originalPath（新逻辑），然后 localPath（旧逻辑），最后 sourceUrl
  const videoUrl = useMemo(() => {
    const filePath = videoFile.originalPath || videoFile.localPath
    if (filePath) {
      return `/api/media-file/${filePath.replace('data/media-uploads/', '')}`
    }
    return videoFile.sourceUrl || ''
  }, [videoFile.originalPath, videoFile.localPath, videoFile.sourceUrl])

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
        case 'ArrowLeft':
          // 左键：快退10秒
          e.preventDefault()
          if (videoRef.current && videoDuration > 0) {
            const newTime = Math.max(0, videoRef.current.currentTime - 10)
            videoRef.current.currentTime = newTime
            setCurrentTime(newTime)
          }
          break
        case 'ArrowRight':
          // 右键：快进10秒
          e.preventDefault()
          if (videoRef.current && videoDuration > 0) {
            const newTime = Math.min(videoDuration, videoRef.current.currentTime + 10)
            videoRef.current.currentTime = newTime
            setCurrentTime(newTime)
          }
          break
        case '>':
        case '.':
          // Ctrl/Cmd + > 或 . : 放大时间轴
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setTimelineZoom(prev => Math.min(10, prev + 0.5))
          }
          break
        case '<':
        case ',':
          // Ctrl/Cmd + < 或 , : 缩小时间轴
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setTimelineZoom(prev => Math.max(1, prev - 0.5))
          }
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
    // 如果已经有裁剪区域，不要创建新的
    if (cropArea) return

    e.preventDefault()
    const coords = getRelativeCoordinates(e)
    setDragStart(coords)
    setIsDraggingCrop(true)
    setDragType('create')
    setCropArea(null) // 清除旧的裁剪区域
    setTempCropArea(null)
  }

  // 处理遮罩移动
  const handleCropBoxMove = (e: React.MouseEvent) => {
    if (!cropArea || !videoRef.current) return
    e.preventDefault()
    e.stopPropagation()

    const coords = getRelativeCoordinates(e)
    setDragStart(coords)
    setIsDraggingMove(true)
    setDragType('move')
  }

  // 处理遮罩调整大小
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    if (!cropArea) return
    e.preventDefault()
    e.stopPropagation()

    const coords = getRelativeCoordinates(e)
    setDragStart(coords)
    setResizeHandle(handle)
    setDragType('resize')
  }

  // 处理所有拖拽操作（创建、移动、调整大小）
  useEffect(() => {
    if ((!isDraggingCrop && !isDraggingMove && !resizeHandle) || !dragStart) return

    const video = videoRef.current
    if (!video) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const coords = getRelativeCoordinates(e)
      const deltaX = coords.x - dragStart.x
      const deltaY = coords.y - dragStart.y

      if (dragType === 'create' && isDraggingCrop) {
        // 创建新裁剪区域
        const x = Math.min(dragStart.x, coords.x)
        const y = Math.min(dragStart.y, coords.y)
        const width = Math.abs(coords.x - dragStart.x)
        const height = Math.abs(coords.y - dragStart.y)
        setTempCropArea({ x, y, width, height })
      } else if (dragType === 'move' && isDraggingMove && cropArea) {
        // 移动裁剪区域 - 需要将实际坐标转换为显示坐标
        const scaleX = video.clientWidth / video.videoWidth
        const scaleY = video.clientHeight / video.videoHeight
        const displayCrop = {
          x: cropArea.x * scaleX,
          y: cropArea.y * scaleY,
          width: cropArea.width * scaleX,
          height: cropArea.height * scaleY,
        }

        // 计算新位置（限制在视频范围内）
        const newX = Math.max(0, Math.min(displayCrop.x + deltaX, video.clientWidth - displayCrop.width))
        const newY = Math.max(0, Math.min(displayCrop.y + deltaY, video.clientHeight - displayCrop.height))

        // 转换回实际坐标并更新
        const actualCoords = convertToVideoCoordinates(newX, newY, displayCrop.width, displayCrop.height)
        setCropArea(actualCoords)
        setDragStart(coords)
      } else if (dragType === 'resize' && resizeHandle && cropArea) {
        // 调整裁剪区域大小
        const scaleX = video.clientWidth / video.videoWidth
        const scaleY = video.clientHeight / video.videoHeight
        const displayCrop = {
          x: cropArea.x * scaleX,
          y: cropArea.y * scaleY,
          width: cropArea.width * scaleX,
          height: cropArea.height * scaleY,
        }

        let newX = displayCrop.x
        let newY = displayCrop.y
        let newWidth = displayCrop.width
        let newHeight = displayCrop.height

        // 根据拖拽手柄调整尺寸
        switch (resizeHandle) {
          case 'nw': // 左上角
            newX = Math.max(0, displayCrop.x + deltaX)
            newY = Math.max(0, displayCrop.y + deltaY)
            newWidth = displayCrop.width - (newX - displayCrop.x)
            newHeight = displayCrop.height - (newY - displayCrop.y)
            break
          case 'ne': // 右上角
            newY = Math.max(0, displayCrop.y + deltaY)
            newWidth = Math.max(20, displayCrop.width + deltaX)
            newHeight = displayCrop.height - (newY - displayCrop.y)
            break
          case 'sw': // 左下角
            newX = Math.max(0, displayCrop.x + deltaX)
            newWidth = displayCrop.width - (newX - displayCrop.x)
            newHeight = Math.max(20, displayCrop.height + deltaY)
            break
          case 'se': // 右下角
            newWidth = Math.max(20, displayCrop.width + deltaX)
            newHeight = Math.max(20, displayCrop.height + deltaY)
            break
          case 'n': // 上边
            newY = Math.max(0, displayCrop.y + deltaY)
            newHeight = displayCrop.height - (newY - displayCrop.y)
            break
          case 's': // 下边
            newHeight = Math.max(20, displayCrop.height + deltaY)
            break
          case 'w': // 左边
            newX = Math.max(0, displayCrop.x + deltaX)
            newWidth = displayCrop.width - (newX - displayCrop.x)
            break
          case 'e': // 右边
            newWidth = Math.max(20, displayCrop.width + deltaX)
            break
        }

        // 确保不超出视频边界
        newWidth = Math.min(newWidth, video.clientWidth - newX)
        newHeight = Math.min(newHeight, video.clientHeight - newY)

        // 最小尺寸限制
        if (newWidth >= 20 && newHeight >= 20) {
          const actualCoords = convertToVideoCoordinates(newX, newY, newWidth, newHeight)
          setCropArea(actualCoords)
          setDragStart(coords)
        }
      }
    }

    const handleMouseUp = () => {
      if (dragType === 'create' && isDraggingCrop) {
        // 创建完成，转换为实际坐标
        if (tempCropArea && tempCropArea.width > 10 && tempCropArea.height > 10) {
          const actualCoords = convertToVideoCoordinates(
            tempCropArea.x,
            tempCropArea.y,
            tempCropArea.width,
            tempCropArea.height
          )
          setCropArea(actualCoords)
        }
        setTempCropArea(null)
      }

      // 重置所有拖拽状态
      setIsDraggingCrop(false)
      setIsDraggingMove(false)
      setResizeHandle(null)
      setDragStart(null)
      setDragType(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingCrop, isDraggingMove, resizeHandle, dragStart, tempCropArea, cropArea, dragType])

  // 重置裁剪区域
  const resetCropArea = () => {
    setCropArea(null)
  }

  // 选定预览图：将当前时间点的帧设置为预览图
  const handleSetThumbnail = async () => {
    try {
      // 直接从视频元素读取当前时间，确保准确性
      const video = videoRef.current
      if (!video) {
        alert('视频未加载')
        return
      }

      const actualCurrentTime = video.currentTime
      console.log('开始更新预览图:', {
        fileId: videoFile.id,
        stateCurrentTime: currentTime,
        videoCurrentTime: actualCurrentTime,
        videoPaused: video.paused
      })
      setIsUpdatingThumbnail(true)

      const requestBody = {
        fileId: videoFile.id,
        timeInSeconds: actualCurrentTime,
      }
      console.log('发送请求体:', requestBody)

      const response = await fetch('/api/admin/media/update-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }).catch(fetchError => {
        console.error('Fetch 错误详情:', fetchError)
        throw new Error(`网络请求失败: ${fetchError.message}`)
      })

      console.log('API响应状态:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API错误响应:', errorText)
        throw new Error(`更新预览图失败: ${response.status} - ${errorText}`)
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
        console.log('发送时间裁剪请求:', { fileId: videoFile.id, startTime, endTime })

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
        }).catch(fetchError => {
          console.error('Fetch 错误:', fetchError)
          throw new Error(`网络请求失败: ${fetchError.message}`)
        })

        console.log('API 响应状态:', response.status, response.statusText)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API 错误响应:', errorText)
          throw new Error(`视频裁剪失败 (${response.status}): ${errorText}`)
        }

        const result = await response.json()
        console.log('API 响应结果:', result)

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

        console.log('发送区域裁剪请求:', requestBody)

        const response = await fetch('/api/admin/media/crop-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }).catch(fetchError => {
          console.error('Fetch 错误:', fetchError)
          throw new Error(`网络请求失败: ${fetchError.message}`)
        })

        console.log('API 响应状态:', response.status, response.statusText)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API 错误响应:', errorText)
          throw new Error(`视频裁剪失败 (${response.status}): ${errorText}`)
        }

        const result = await response.json()
        console.log('API 响应结果:', result)

        if (result.success) {
          onTrimComplete()
          onClose()
        } else {
          alert(`裁剪失败: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('视频裁剪错误:', error)
      alert(`视频裁剪失败: ${error instanceof Error ? error.message : '请重试'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const startPercent = videoDuration > 0 ? (startTime / videoDuration) * 100 : 0
  const endPercent = videoDuration > 0 ? (endTime / videoDuration) * 100 : 100
  const currentPercent = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0
  const selectionWidth = endPercent - startPercent

  // 生成时间刻度标记
  const generateTimeMarkers = () => {
    if (videoDuration === 0) return []

    const markers: { time: number; label: string; isMajor: boolean }[] = []

    // 根据缩放级别决定刻度间隔
    let interval: number
    if (timelineZoom >= 5) {
      interval = 1 // 1秒
    } else if (timelineZoom >= 3) {
      interval = 5 // 5秒
    } else if (timelineZoom >= 2) {
      interval = 10 // 10秒
    } else {
      interval = 30 // 30秒
    }

    // 生成刻度
    for (let time = 0; time <= videoDuration; time += interval) {
      const isMajor = time % (interval * 2) === 0 || time === 0 || time >= videoDuration - interval
      markers.push({
        time,
        label: formatTime(time),
        isMajor,
      })
    }

    // 确保最后一个刻度是视频结束时间
    if (markers[markers.length - 1]?.time !== videoDuration) {
      markers.push({
        time: videoDuration,
        label: formatTime(videoDuration),
        isMajor: true,
      })
    }

    return markers
  }

  const timeMarkers = useMemo(() => generateTimeMarkers(), [videoDuration, timelineZoom])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 overflow-hidden">
        {/* 左右两列布局 */}
        <div className="flex h-full">
          {/* 左列：视频播放器和时间轴 (占大部分空间) */}
          <div className="flex-1 relative bg-neutral-900 select-none">
            {/* 上部分：视频播放区 - 使用绝对定位，预留底部145px给控件 */}
            <div className="absolute inset-0 bottom-[145px] flex items-center justify-center">
              <div
                ref={videoContainerRef}
                className="w-full h-full flex items-center justify-center bg-black rounded overflow-hidden relative"
                onMouseDown={handleCropMouseDown}
                style={{ cursor: cropMode !== 'time' ? 'crosshair' : 'default' }}
              >
            <video
              ref={videoRef}
              src={videoUrl}
              key={videoUrl}
              className="w-full h-full object-contain"
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
                  className="absolute border-2 border-orange-500"
                  style={{
                    left: `${videoOffsetX + displayCrop.x}px`,
                    top: `${videoOffsetY + displayCrop.y}px`,
                    width: `${displayCrop.width}px`,
                    height: `${displayCrop.height}px`,
                    backgroundColor: 'rgba(255, 87, 34, 0.2)', // 橘红色 20% 不透明度
                    pointerEvents: cropArea ? 'auto' : 'none', // 只有确定的裁剪区域才能交互
                    cursor: cropArea ? 'move' : 'default',
                  }}
                  onMouseDown={(e) => {
                    if (cropArea) {
                      e.stopPropagation()
                      handleCropBoxMove(e)
                    }
                  }}
                >
                  {/* 裁剪框四角拖拽手柄 */}
                  {cropArea && (
                    <>
                      <div
                        className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-orange-500 rounded-full cursor-nwse-resize z-10"
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleResizeStart(e, 'nw')}
                      />
                      <div
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-orange-500 rounded-full cursor-nesw-resize z-10"
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleResizeStart(e, 'ne')}
                      />
                      <div
                        className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-orange-500 rounded-full cursor-nesw-resize z-10"
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleResizeStart(e, 'sw')}
                      />
                      <div
                        className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-orange-500 rounded-full cursor-nwse-resize z-10"
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleResizeStart(e, 'se')}
                      />
                      {/* 四条边的拖拽手柄 */}
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-white border border-orange-500 rounded cursor-ns-resize z-10"
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleResizeStart(e, 'n')}
                      />
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-white border border-orange-500 rounded cursor-ns-resize z-10"
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleResizeStart(e, 's')}
                      />
                      <div
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-8 bg-white border border-orange-500 rounded cursor-ew-resize z-10"
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleResizeStart(e, 'w')}
                      />
                      <div
                        className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-8 bg-white border border-orange-500 rounded cursor-ew-resize z-10"
                        style={{ pointerEvents: 'auto' }}
                        onMouseDown={(e) => handleResizeStart(e, 'e')}
                      />
                    </>
                  )}
                </div>
              ) : null
            })()}

            {/* 提示文字 */}
            {cropMode !== 'time' && !cropArea && !isDraggingCrop && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-md text-sm pointer-events-none">
                拖动鼠标选择裁剪区域
              </div>
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
            </div>

            {/* 下部分：时间轴控制区 - 固定在底部145px高度 */}
            {(cropMode === 'time' || cropMode === 'both') && (
              <div className="absolute bottom-0 left-0 right-0 h-[145px] overflow-y-auto">
                <div className="space-y-1 bg-neutral-800 px-3 py-2 rounded-lg">
            {/* Time Display */}
            <div className="flex items-center justify-between text-xs text-neutral-200">
              <div className="flex items-center gap-2">
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

            {/* 缩放提示 */}
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>使用 Ctrl/Cmd + &gt;/&lt; 缩放时间轴</span>
              {timelineZoom > 1 && (
                <span className="text-blue-400">缩放: {Math.round(timelineZoom * 100)}%</span>
              )}
            </div>

            {/* Timeline Track - 带滚动和缩放 */}
            <div className="relative">
              {/* 可滚动容器 */}
              <div
                ref={timelineScrollRef}
                className="relative overflow-x-auto overflow-y-hidden VideoTrimModal-timeline-scroll"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#4B5563 #1F2937',
                }}
              >
                {/* 时间轴主体 - 宽度根据缩放倍数调整 */}
                <div
                  ref={timelineRef}
                  className="relative h-14 bg-neutral-700 rounded cursor-pointer select-none"
                  style={{
                    width: `${timelineZoom * 100}%`,
                    minWidth: '100%',
                  }}
                  onClick={handleTimelineClick}
                >
                  {/* 时间刻度 */}
                  <div className="absolute top-0 left-0 right-0 h-6 border-b border-neutral-600">
                    {timeMarkers.map((marker, index) => {
                      const leftPercent = (marker.time / videoDuration) * 100
                      return (
                        <div
                          key={index}
                          className="absolute top-0 bottom-0 flex flex-col items-center"
                          style={{ left: `${leftPercent}%` }}
                        >
                          {/* 刻度线 */}
                          <div
                            className={`${
                              marker.isMajor
                                ? 'h-6 w-0.5 bg-neutral-400'
                                : 'h-3 w-0.5 bg-neutral-500 mt-3'
                            }`}
                          />
                          {/* 时间标签 - 只显示主要刻度 */}
                          {marker.isMajor && (
                            <span className="absolute top-0 text-[9px] text-neutral-300 -translate-x-1/2 whitespace-nowrap font-mono">
                              {marker.label}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* 时间轴轨道区域 */}
                  <div className="absolute top-6 left-0 right-0 bottom-0 bg-neutral-200 rounded-b">
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
              </div>
            </div>
          </div>
                </div>
              </div>
            )}
          </div>

          {/* 右列：标题、模式切换、裁剪信息、操作按钮 */}
          <div className="w-[230px] bg-white flex flex-col border-l border-neutral-200">
            {/* 标题部分 */}
            <div className="px-6 py-5 border-b border-neutral-200">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">视频编辑</DialogTitle>
                <DialogDescription className="text-sm text-neutral-500 mt-1 truncate">
                  {videoFile.name}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* 模式切换 */}
            <div className="px-6 py-4 border-b border-neutral-200">
              <div className="text-xs font-medium text-neutral-700 mb-3">裁剪模式</div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setCropMode('time')}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    cropMode === 'time'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Scissors className="h-4 w-4" />
                  时间裁剪
                </button>
                <button
                  onClick={() => setCropMode('region')}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    cropMode === 'region'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Crop className="h-4 w-4" />
                  区域裁剪
                </button>
                <button
                  onClick={() => setCropMode('both')}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                    cropMode === 'both'
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  <Scissors className="h-4 w-4" />
                  <Crop className="h-4 w-4" />
                  组合裁剪
                </button>
              </div>
            </div>

            {/* 快捷键提示 */}
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
              <div className="text-xs font-medium text-neutral-700 mb-2">快捷键</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700 font-mono">空格</kbd>
                  <span>播放/暂停</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700 font-mono">[</kbd>
                  <span>设为开始</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700 font-mono">]</kbd>
                  <span>设为结尾</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700 font-mono">M</kbd>
                  <span>静音</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700 font-mono">←</kbd>
                  <span>后退10秒</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-700 font-mono">→</kbd>
                  <span>前进10秒</span>
                </div>
              </div>

              {/* 选定预览图按钮 */}
              {!isInitializing && videoDuration > 0 && (
                <button
                  onClick={handleSetThumbnail}
                  disabled={isUpdatingThumbnail || isProcessing}
                  className="w-full mt-3 px-3 py-2 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
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
            </div>

            {/* 裁剪区域信息 */}
            {cropMode !== 'time' && cropArea && (
              <div className="px-6 py-4 border-b border-neutral-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-neutral-700">裁剪区域</div>
                  <button
                    onClick={resetCropArea}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    重新选择
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
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

            {/* 加载提示 */}
            {isInitializing && videoDuration === 0 && (
              <div className="px-6 py-4 border-b border-neutral-200">
                <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  正在加载视频...
                </div>
              </div>
            )}

            {/* 操作按钮 - 固定在底部 */}
            <div className="mt-auto px-6 py-5 border-t border-neutral-200 bg-neutral-50">
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleTrim}
                  disabled={
                    isProcessing ||
                    (cropMode === 'time' && endTime - startTime < 0.1) ||
                    (cropMode === 'region' && !cropArea) ||
                    (cropMode === 'both' && (!cropArea || endTime - startTime < 0.1))
                  }
                  className="w-full px-4 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      {cropMode === 'time' && <Scissors className="h-4 w-4" />}
                      {cropMode === 'region' && <Crop className="h-4 w-4" />}
                      {cropMode === 'both' && (
                        <>
                          <Scissors className="h-4 w-4" />
                          <Crop className="h-4 w-4" />
                        </>
                      )}
                      {cropMode === 'time' && '裁剪时间'}
                      {cropMode === 'region' && '裁剪区域'}
                      {cropMode === 'both' && '组合裁剪'}
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="w-full px-4 py-2.5 text-sm font-medium border border-neutral-300 rounded-lg hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
