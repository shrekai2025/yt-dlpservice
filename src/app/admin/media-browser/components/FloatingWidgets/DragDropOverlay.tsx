"use client"

import { Upload } from 'lucide-react'

interface DragDropOverlayProps {
  show: boolean
}

export function DragDropOverlay({ show }: DragDropOverlayProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-blue-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-12 border-4 border-dashed border-blue-500">
        <div className="flex flex-col items-center gap-4">
          <Upload className="h-20 w-20 text-blue-500" />
          <div className="text-center">
            <h3 className="text-2xl font-bold text-neutral-900 mb-2">
              释放文件以上传
            </h3>
            <p className="text-neutral-600">
              支持图片、视频和音频文件
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

