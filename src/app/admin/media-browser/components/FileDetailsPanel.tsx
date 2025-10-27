"use client"

import { useState, useCallback, useEffect } from 'react'
import NextImage from 'next/image'
import { X, Folder, User, Music, Edit2, Check, Copy, ChevronRight, Scissors, RotateCw, Loader2, HardDrive, Image as ImageIcon, Trash2, Info } from 'lucide-react'
import { getShimmerPlaceholder } from '~/lib/utils/image-placeholder'
import type { MediaFile } from '../types'

type FileDetailsPanelProps = {
  file: MediaFile
  onClose: () => void
  folders?: Array<{ id: string; name: string; color?: string | null }>
  actors?: Array<{ id: string; name: string; avatarUrl?: string | null }>
  onMoveToFolder: (fileId: string, folderId: string | null) => void
  onMoveToActor: (fileId: string, actorId: string | null) => void
  onUpdateRemark: (fileId: string, remark: string) => void
  onTrimVideo: () => void
  onRotateVideo: () => void
  onConvertToLocal: () => void
  onGenerateThumbnail: () => void
  onDelete: () => void
  getThumbnailUrl: (file: MediaFile) => string | null
  getMediaIcon: (type: string) => React.ReactNode
  getVideoUrl?: (file: MediaFile) => string | null
  getGifUrl?: (file: MediaFile) => string | null
  isRotating?: boolean
  isConverting?: boolean
  isGeneratingThumbnail?: boolean
}

export function FileDetailsPanel({
  file,
  onClose,
  folders = [],
  actors = [],
  onMoveToFolder,
  onMoveToActor,
  onUpdateRemark,
  onTrimVideo,
  onRotateVideo,
  onConvertToLocal,
  onGenerateThumbnail,
  onDelete,
  getThumbnailUrl,
  getMediaIcon,
  getVideoUrl,
  getGifUrl,
  isRotating = false,
  isConverting = false,
  isGeneratingThumbnail = false,
}: FileDetailsPanelProps) {
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [editingRemark, setEditingRemark] = useState(false)
  const [tempRemark, setTempRemark] = useState(file.remark || '')
  const [showFolderSelector, setShowFolderSelector] = useState(false)
  const [showActorSelector, setShowActorSelector] = useState(false)
  const [showFileInfo, setShowFileInfo] = useState(false)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }, [position])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  const handleRemarkSave = () => {
    onUpdateRemark(file.id, tempRemark)
    setEditingRemark(false)
  }

  const handleCopyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text)
  }

  return (
    <div
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        maxHeight: '85vh',
      }}
    >
      <div className="w-80 bg-white rounded-xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
        {/* Header - Draggable */}
        <div
          className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-neutral-50 to-white border-b border-neutral-200 cursor-move select-none"
          onMouseDown={handleDragStart}
        >
          <h2 className="text-sm font-semibold text-neutral-700">文件详情</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content - Compact Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
          {/* Media Preview - Auto-play */}
          <div className="w-full rounded-md bg-neutral-100 flex items-center justify-center overflow-hidden">
            {file.type === 'VIDEO' && getVideoUrl?.(file) ? (
              <video
                src={getVideoUrl(file)!}
                className="w-full h-auto object-contain"
                controls
                autoPlay
                muted
                loop
              />
            ) : file.type === 'IMAGE' && (getGifUrl?.(file) || getThumbnailUrl(file)) ? (
              <img
                src={getGifUrl?.(file) || getThumbnailUrl(file)!}
                alt={file.name}
                className="w-full h-auto object-contain"
              />
            ) : file.type === 'AUDIO' && getVideoUrl?.(file) ? (
              <div className="w-full p-4">
                <div className="flex items-center justify-center mb-4">
                  <Music className="h-12 w-12 text-neutral-400" />
                </div>
                <audio
                  src={getVideoUrl(file)!}
                  className="w-full"
                  controls
                  autoPlay
                />
              </div>
            ) : getThumbnailUrl(file) ? (
              <NextImage
                src={getThumbnailUrl(file)!}
                alt={file.name}
                width={320}
                height={180}
                className="w-full h-auto object-contain"
                placeholder="blur"
                blurDataURL={getShimmerPlaceholder(320, 180)}
                quality={85}
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center">
                {getMediaIcon(file.type)}
              </div>
            )}
          </div>

          {/* Folder and Actor - Inline */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <button
                onClick={() => setShowFolderSelector(!showFolderSelector)}
                className="w-full px-2 py-1.5 text-xs bg-white rounded border border-neutral-300 hover:border-neutral-400 transition-colors text-left flex items-center gap-1.5"
              >
                <Folder className="h-3 w-3 flex-shrink-0 text-neutral-500" />
                <span className={`flex-1 truncate ${file.folder ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {file.folder?.name || '未分配'}
                </span>
                <ChevronRight className={`h-3 w-3 flex-shrink-0 text-neutral-400 transition-transform ${showFolderSelector ? 'rotate-90' : ''}`} />
              </button>

              {showFolderSelector && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-neutral-300 shadow-lg z-50 max-h-40 overflow-y-auto">
                  <button
                    onClick={() => {
                      onMoveToFolder(file.id, null)
                      setShowFolderSelector(false)
                    }}
                    className={`w-full px-2 py-1.5 text-xs text-left hover:bg-neutral-100 transition-colors flex items-center gap-1.5 ${!file.folder ? 'bg-neutral-100' : ''}`}
                  >
                    <Folder className="h-3 w-3 text-neutral-400" />
                    <span className="text-neutral-500">未分配</span>
                  </button>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => {
                        onMoveToFolder(file.id, folder.id)
                        setShowFolderSelector(false)
                      }}
                      className={`w-full px-2 py-1.5 text-xs text-left hover:bg-neutral-100 transition-colors flex items-center gap-1.5 ${file.folder?.id === folder.id ? 'bg-blue-50 text-blue-700' : ''}`}
                    >
                      <Folder className="h-3 w-3" style={{ color: folder.color || '#gray' }} />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowActorSelector(!showActorSelector)}
                className="w-full px-2 py-1.5 text-xs bg-white rounded border border-neutral-300 hover:border-neutral-400 transition-colors text-left flex items-center gap-1.5"
              >
                <User className="h-3 w-3 flex-shrink-0 text-neutral-500" />
                <span className={`flex-1 truncate ${file.actor ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {file.actor?.name || '未分配'}
                </span>
                <ChevronRight className={`h-3 w-3 flex-shrink-0 text-neutral-400 transition-transform ${showActorSelector ? 'rotate-90' : ''}`} />
              </button>

              {showActorSelector && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-neutral-300 shadow-lg z-50 max-h-40 overflow-y-auto">
                  <button
                    onClick={() => {
                      onMoveToActor(file.id, null)
                      setShowActorSelector(false)
                    }}
                    className={`w-full px-2 py-1.5 text-xs text-left hover:bg-neutral-100 transition-colors flex items-center gap-1.5 ${!file.actor ? 'bg-neutral-100' : ''}`}
                  >
                    <User className="h-3 w-3 text-neutral-400" />
                    <span className="text-neutral-500">未分配</span>
                  </button>
                  {actors.map((actor) => (
                    <button
                      key={actor.id}
                      onClick={() => {
                        onMoveToActor(file.id, actor.id)
                        setShowActorSelector(false)
                      }}
                      className={`w-full px-2 py-1.5 text-xs text-left hover:bg-neutral-100 transition-colors flex items-center gap-1.5 ${file.actor?.id === actor.id ? 'bg-purple-50 text-purple-700' : ''}`}
                    >
                      {actor.avatarUrl ? (
                        <img src={actor.avatarUrl} alt={actor.name} className="h-3 w-3 rounded-full object-cover" />
                      ) : (
                        <User className="h-3 w-3 text-neutral-400" />
                      )}
                      <span className="truncate">{actor.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Remark - Editable */}
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">备注</label>
            {editingRemark ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempRemark}
                  onChange={(e) => setTempRemark(e.target.value)}
                  onBlur={handleRemarkSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRemarkSave()
                    if (e.key === 'Escape') setEditingRemark(false)
                  }}
                  autoFocus
                  className="flex-1 px-2 py-1 text-xs border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                />
                <button onClick={handleRemarkSave} className="p-1 text-green-600 hover:text-green-700">
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                className="px-2 py-1 text-xs bg-neutral-50 rounded border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors break-all flex items-start gap-1.5"
                onClick={() => setEditingRemark(true)}
              >
                <span className="flex-1">{file.remark || file.name}</span>
                <Edit2 className="h-3 w-3 text-neutral-400 flex-shrink-0 mt-0.5" />
              </div>
            )}
          </div>

          {/* File Info - Collapsed in Info Icon */}
          <div className="relative">
            <button
              onClick={() => setShowFileInfo(!showFileInfo)}
              className="w-full px-2 py-1.5 text-xs bg-neutral-50 rounded border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-100 transition-colors text-left flex items-center gap-1.5"
            >
              <Info className="h-3 w-3 flex-shrink-0 text-neutral-500" />
              <span className="flex-1 text-neutral-600">文件信息</span>
              <ChevronRight className={`h-3 w-3 flex-shrink-0 text-neutral-400 transition-transform ${showFileInfo ? 'rotate-90' : ''}`} />
            </button>

            {showFileInfo && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-neutral-300 shadow-lg z-50 p-2">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-neutral-500">类型:</span>
                    <span className="ml-1 font-medium">{file.type}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">大小:</span>
                    <span className="ml-1 font-medium">
                      {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(1)}MB` : '-'}
                    </span>
                  </div>
                  {file.width && file.height && (
                    <div>
                      <span className="text-neutral-500">分辨率:</span>
                      <span className="ml-1 font-medium">{file.width}×{file.height}</span>
                    </div>
                  )}
                  {file.duration && (
                    <div>
                      <span className="text-neutral-500">时长:</span>
                      <span className="ml-1 font-medium">{file.duration.toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Paths - Compact with Copy */}
          {file.originalPath && file.source === 'LOCAL_REF' && (
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">原始路径</label>
              <div className="flex items-start gap-1">
                <div className="flex-1 px-2 py-1 text-[10px] bg-neutral-50 rounded border border-neutral-200 break-all font-mono">
                  {file.originalPath}
                </div>
                <button
                  onClick={() => handleCopyToClipboard(file.originalPath!)}
                  className="p-1 text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded hover:bg-neutral-100"
                  title="复制"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Actions - Compact Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t">
            {file.type === 'VIDEO' && (
              <>
                <button
                  onClick={onTrimVideo}
                  className="flex-1 px-2 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <Scissors className="h-3 w-3" />
                  裁剪
                </button>
                <button
                  onClick={onRotateVideo}
                  disabled={isRotating}
                  className="flex-1 px-2 py-1.5 text-xs font-medium bg-neutral-600 text-white rounded hover:bg-neutral-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                >
                  {isRotating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      旋转中
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-3 w-3" />
                      旋转
                    </>
                  )}
                </button>
              </>
            )}
            {file.source === 'URL' && (
              <button
                onClick={onConvertToLocal}
                disabled={isConverting}
                className="w-full px-2 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    转存中
                  </>
                ) : (
                  <>
                    <HardDrive className="h-3 w-3" />
                    转存本地
                  </>
                )}
              </button>
            )}

            {/* Generate Thumbnail Button */}
            {(file.type === 'VIDEO' || file.type === 'IMAGE') && (
              <button
                onClick={onGenerateThumbnail}
                disabled={isGeneratingThumbnail}
                className="flex-1 px-2 py-1.5 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
              >
                {isGeneratingThumbnail ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    生成中
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-3 w-3" />
                    预览图
                  </>
                )}
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={onDelete}
              className="flex-1 px-2 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
