"use client"

import { useState, useCallback } from 'react'
import { Star, Maximize2, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import type { MediaFile } from '../../types'

type SingleColumnGridProps = {
  files: MediaFile[]
  containerWidth: number
  maximized: boolean
  compactMode: boolean
  bulkSelectionMode: boolean
  selectedFileIds: Set<string>
  draggedFileId: string | null
  autoPlayAll: boolean
  hoveredVideoId: string | null
  onFileClick: (file: MediaFile) => void
  onToggleSelection: (fileId: string) => void
  onDragStart: (fileId: string) => void
  onDragEnd: () => void
  onVideoHover: (videoId: string | null) => void
  onRegenerateThumbnail: (fileId: string) => void
  onPreview: (file: MediaFile) => void
  onToggleStarred: (fileId: string, starred: boolean) => void
  getThumbnailUrl: (file: MediaFile) => string
  getVideoUrl: (file: MediaFile) => string
  getGifUrl: (file: MediaFile) => string
  isGif: (file: MediaFile) => boolean
}

export function SingleColumnGrid({
  files,
  containerWidth,
  maximized,
  compactMode,
  bulkSelectionMode,
  selectedFileIds,
  draggedFileId,
  autoPlayAll,
  hoveredVideoId,
  onFileClick,
  onToggleSelection,
  onDragStart,
  onDragEnd,
  onVideoHover,
  onRegenerateThumbnail,
  onPreview,
  onToggleStarred,
  getThumbnailUrl,
  getVideoUrl,
  getGifUrl,
  isGif,
}: SingleColumnGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [audioEnabledFileId, setAudioEnabledFileId] = useState<string | null>(null)

  const handleImageLoad = useCallback((fileId: string) => {
    setLoadedImages((prev) => new Set(prev).add(fileId))
  }, [])

  const toggleAudio = useCallback((fileId: string) => {
    setAudioEnabledFileId((prev) => (prev === fileId ? null : fileId))
  }, [])

  return (
    <div className="flex flex-col gap-2 w-full">
      {files.map((file) => {
        const isDragged = draggedFileId === file.id
        const isSelected = selectedFileIds.has(file.id)
        const aspectRatio = file.width && file.height ? file.width / file.height : 16 / 9

        // 计算高度：宽度固定为容器宽度，高度根据宽高比计算
        const cardWidth = containerWidth - 4 // 减去 padding
        const cardHeight = cardWidth / aspectRatio

        return (
          <div
            key={file.id}
            className={`group relative overflow-hidden ${
              maximized ? 'bg-black' : 'rounded-lg border border-neutral-200 bg-white'
            } ${isDragged ? 'opacity-50' : ''}`}
            style={{ width: cardWidth, height: cardHeight }}
            draggable={bulkSelectionMode}
            onDragStart={() => onDragStart(file.id)}
            onDragEnd={onDragEnd}
            onClick={() => {
              if (bulkSelectionMode) {
                onToggleSelection(file.id)
              } else {
                onFileClick(file)
              }
            }}
          >
            {/* 主要内容区域 */}
            <div className="relative w-full h-full">
              {/* 图片/视频预览 */}
              {file.type === 'VIDEO' ? (
                <div
                  className="relative w-full h-full"
                  onMouseEnter={() => onVideoHover(file.id)}
                  onMouseLeave={() => onVideoHover(null)}
                >
                  {(autoPlayAll || hoveredVideoId === file.id) && !bulkSelectionMode ? (
                    <video
                      src={getVideoUrl(file)}
                      className="w-full h-full object-contain bg-black"
                      autoPlay
                      loop
                      muted={audioEnabledFileId !== file.id}
                      playsInline
                    />
                  ) : isGif(file) ? (
                    <img
                      src={getGifUrl(file)}
                      alt={file.name}
                      className="w-full h-full object-contain bg-black"
                      loading="lazy"
                    />
                  ) : (
                    <img
                      src={getThumbnailUrl(file)}
                      alt={file.name}
                      className="w-full h-full object-contain bg-black"
                      loading="lazy"
                      onLoad={() => handleImageLoad(file.id)}
                    />
                  )}
                </div>
              ) : file.type === 'IMAGE' ? (
                <img
                  src={getThumbnailUrl(file)}
                  alt={file.name}
                  className="w-full h-full object-contain bg-black"
                  loading="lazy"
                  onLoad={() => handleImageLoad(file.id)}
                />
              ) : file.type === 'AUDIO' ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                  <div className="text-white text-center">
                    <div className="text-4xl mb-2">🎵</div>
                    <div className="text-sm font-medium">{file.name}</div>
                  </div>
                </div>
              ) : null}

              {/* 批量选择模式下的选择指示器 */}
              {bulkSelectionMode && (
                <div
                  className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white/90 border-white/90'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              )}

              {/* 右上角按钮组 */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                {file.type === 'VIDEO' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleAudio(file.id)
                    }}
                    className={`backdrop-blur-sm p-1.5 rounded-md shadow-sm pointer-events-auto ${
                      audioEnabledFileId === file.id
                        ? 'bg-green-600/80 hover:bg-green-600'
                        : 'bg-black/60 hover:bg-black/80'
                    }`}
                    title={audioEnabledFileId === file.id ? '关闭声音' : '开启声音'}
                  >
                    {audioEnabledFileId === file.id ? (
                      <Volume2 className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <VolumeX className="h-3.5 w-3.5 text-white" />
                    )}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleStarred(file.id, !file.starred)
                  }}
                  className="bg-black/60 backdrop-blur-sm p-1.5 rounded-md hover:bg-black/80 shadow-sm pointer-events-auto"
                  title={file.starred ? '取消标星' : '标星'}
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      file.starred ? 'fill-yellow-400 text-yellow-400' : 'text-white'
                    }`}
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onPreview(file)
                  }}
                  className="bg-black/60 backdrop-blur-sm p-1.5 rounded-md hover:bg-black/80 shadow-sm pointer-events-auto"
                  title="预览"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRegenerateThumbnail(file.id)
                  }}
                  className="bg-black/60 backdrop-blur-sm p-1.5 rounded-md hover:bg-black/80 shadow-sm pointer-events-auto"
                  title="重新生成缩略图"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
