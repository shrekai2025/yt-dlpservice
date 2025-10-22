"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { GripVertical } from 'lucide-react'

type MaximizedSplitViewProps = {
  splitRatio: number
  onSplitRatioChange: (ratio: number) => void
  leftContent: React.ReactNode
  rightContent: React.ReactNode
}

export function MaximizedSplitView({
  splitRatio,
  onSplitRatioChange,
  leftContent,
  rightContent,
}: MaximizedSplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

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
      <div style={{ width: `${splitRatio}%` }} className="overflow-y-auto p-0.5">
        {leftContent}
      </div>

      {/* 分割线 */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-px bg-neutral-700 cursor-col-resize relative group flex-shrink-0 ${
          isDragging ? 'bg-neutral-500' : ''
        }`}
        style={{ userSelect: 'none' }}
      >
        {/* 拖动手柄 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-neutral-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* 右侧：标星文件 */}
      <div style={{ width: `${100 - splitRatio}%` }} className="overflow-y-auto p-0.5">
        {rightContent}
      </div>
    </div>
  )
}

