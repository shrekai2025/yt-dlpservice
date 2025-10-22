"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { GripVertical } from 'lucide-react'

type MaximizedSplitViewProps = {
  splitRatio: number
  onSplitRatioChange: (ratio: number) => void
  leftContent: (width: number) => React.ReactNode
  rightContent: (width: number) => React.ReactNode
}

export function MaximizedSplitView({
  splitRatio,
  onSplitRatioChange,
  leftContent,
  rightContent,
}: MaximizedSplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [leftWidth, setLeftWidth] = useState(0)
  const [rightWidth, setRightWidth] = useState(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100

      // 限制在 30-80 之间
      const clampedRatio = Math.max(30, Math.min(80, newRatio))
      onSplitRatioChange(clampedRatio)
    },
    [isDragging, onSplitRatioChange]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 测量面板宽度
  useEffect(() => {
    const updateWidths = () => {
      if (leftPanelRef.current) {
        setLeftWidth(leftPanelRef.current.clientWidth)
      }
      if (rightPanelRef.current) {
        setRightWidth(rightPanelRef.current.clientWidth)
      }
    }

    updateWidths()

    const resizeObserver = new ResizeObserver(updateWidths)
    if (leftPanelRef.current) {
      resizeObserver.observe(leftPanelRef.current)
    }
    if (rightPanelRef.current) {
      resizeObserver.observe(rightPanelRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [splitRatio])

  // 添加全局事件监听
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div ref={containerRef} className="flex h-full bg-black">
      {/* 左侧：全部内容 */}
      <div ref={leftPanelRef} style={{ width: `${splitRatio}%` }} className="overflow-y-auto p-0.5">
        {leftWidth > 0 && leftContent(leftWidth)}
      </div>

      {/* 分割线 */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-px bg-neutral-700 cursor-col-resize relative group flex-shrink-0 z-50 ${
          isDragging ? 'bg-neutral-500' : ''
        }`}
        style={{ userSelect: 'none' }}
      >
        {/* 拖动手柄 */}
        <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 w-8 h-8 bg-neutral-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* 右侧：标星文件 */}
      <div ref={rightPanelRef} style={{ width: `${100 - splitRatio}%` }} className="overflow-y-auto p-0.5">
        {rightWidth > 0 && rightContent(rightWidth)}
      </div>
    </div>
  )
}

