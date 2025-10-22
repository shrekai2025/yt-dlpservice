"use client"

import { Plus, Folder, Upload, Download, List, Grid3x3, Play, Maximize2, Minimize2 } from 'lucide-react'

interface ActionButtonsProps {
  onAddUrl: () => void
  onAddLocalPath: () => void
  onFileUpload: () => void
  onExport: () => void
  isUploading?: boolean
  isExporting?: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  viewMode: 'grid' | 'list' | 'justified'
  onViewModeChange: (mode: 'grid' | 'list' | 'justified') => void
  autoPlayAll: boolean
  onAutoPlayAllChange: (value: boolean) => void
  compactMode: boolean
  onCompactModeChange: (value: boolean) => void
}

export function ActionButtons({
  onAddUrl,
  onAddLocalPath,
  onFileUpload,
  onExport,
  isUploading,
  isExporting,
  fileInputRef,
  handleFileUpload,
  viewMode,
  onViewModeChange,
  autoPlayAll,
  onAutoPlayAllChange,
  compactMode,
  onCompactModeChange,
}: ActionButtonsProps) {
  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <button
          onClick={onAddUrl}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
        >
          <Plus className="h-3.5 w-3.5" />
          从URL
        </button>
        <button
          onClick={onAddLocalPath}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
        >
          <Folder className="h-3.5 w-3.5" />
          从本地
        </button>
        <button
          onClick={onFileUpload}
          disabled={isUploading}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {isUploading ? '上传中' : '本地上传'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
      
      <div className="flex gap-2 mt-2">
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {isExporting ? '导出中' : '导出'}
        </button>
        <button
          onClick={() => onViewModeChange(viewMode === 'grid' ? 'justified' : 'grid')}
          className="flex items-center justify-center rounded-md border border-neutral-300 px-2.5 py-2 hover:bg-neutral-50"
          title={viewMode === 'grid' ? '切换到木桶布局' : '切换到瀑布流'}
        >
          {viewMode === 'grid' ? <List className="h-3.5 w-3.5" /> : <Grid3x3 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onAutoPlayAllChange(!autoPlayAll)}
          className={`flex items-center justify-center rounded-md border px-2.5 py-2 transition-colors ${
            autoPlayAll
              ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
              : 'border-neutral-300 hover:bg-neutral-50'
          }`}
          title={autoPlayAll ? '退出全动态模式' : '全动态模式'}
        >
          <Play className="h-3.5 w-3.5" fill={autoPlayAll ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => onCompactModeChange(!compactMode)}
          className={`flex items-center justify-center rounded-md border px-2.5 py-2 transition-colors ${
            compactMode
              ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800'
              : 'border-neutral-300 hover:bg-neutral-50'
          }`}
          title={compactMode ? '退出紧凑模式' : '紧凑模式'}
        >
          {compactMode ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

