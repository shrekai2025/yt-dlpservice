"use client"

import { useState } from 'react'
import NextImage from 'next/image'
import { Image, Video, Music, Loader2, RefreshCw, Maximize2, Star } from 'lucide-react'
import { getShimmerPlaceholder } from '~/lib/utils/image-placeholder'
import type { MediaFile } from '../../types'

type MediaCardProps = {
  file: MediaFile
  columnWidth: number
  maximized: boolean
  compactMode: boolean
  bulkSelectionMode: boolean
  isSelected: boolean
  isDragged: boolean
  autoPlayAll: boolean
  hoveredVideoId: string | null
  onFileClick: (file: MediaFile) => void
  onToggleSelection: (fileId: string) => void
  onDragStart: (e: React.DragEvent, fileId: string) => void
  onDragEnd: () => void
  onVideoHover: (fileId: string | null) => void
  onRegenerateThumbnail: (fileId: string) => void
  onPreview: (file: MediaFile) => void
  onInlineEdit: (fileId: string, remark: string) => void
  onToggleStarred: (fileId: string, starred: boolean) => void
  getThumbnailUrl: (file: MediaFile) => string | null
  getVideoUrl: (file: MediaFile) => string | null
  getGifUrl: (file: MediaFile) => string | null
  isGif: (file: MediaFile) => boolean
  getImageHeight: (file: MediaFile) => number
}

export function MediaCard({
  file,
  columnWidth,
  maximized,
  compactMode,
  bulkSelectionMode,
  isSelected,
  isDragged,
  autoPlayAll,
  hoveredVideoId,
  onFileClick,
  onToggleSelection,
  onDragStart,
  onDragEnd,
  onVideoHover,
  onRegenerateThumbnail,
  onPreview,
  onInlineEdit,
  onToggleStarred,
  getThumbnailUrl,
  getVideoUrl,
  getGifUrl,
  isGif,
  getImageHeight,
}: MediaCardProps) {
  const [editingInlineFileId, setEditingInlineFileId] = useState<string | null>(null)
  const [tempInlineRemark, setTempInlineRemark] = useState('')

  const imageHeight = getImageHeight(file)

  const handleInlineEditStart = (fileId: string, remark: string) => {
    setEditingInlineFileId(fileId)
    setTempInlineRemark(remark)
  }

  const handleInlineEditSave = async (fileId: string) => {
    if (tempInlineRemark.trim()) {
      await onInlineEdit(fileId, tempInlineRemark)
    }
    setEditingInlineFileId(null)
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, file.id)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => {
        if (file.type === 'VIDEO' || isGif(file)) {
          onVideoHover(file.id)
        }
      }}
      onMouseLeave={() => {
        if (file.type === 'VIDEO' || isGif(file)) {
          onVideoHover(null)
        }
      }}
      className={`group relative overflow-hidden ${
        maximized
          ? 'bg-black w-full'
          : 'rounded-lg border border-neutral-200 bg-white'
      } ${isDragged ? 'opacity-50' : ''}`}
    >
      {/* Thumbnail */}
      <div
        className="w-full bg-neutral-100 flex items-center justify-center cursor-pointer overflow-hidden relative"
        onClick={() => onFileClick(file)}
        style={{ height: `${imageHeight}px` }}
      >
        {/* 缩略图层 */}
        {getThumbnailUrl(file) ? (
          <NextImage
            src={getThumbnailUrl(file)!}
            alt={file.name}
            width={columnWidth}
            height={imageHeight}
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
            placeholder="blur"
            blurDataURL={getShimmerPlaceholder(columnWidth, imageHeight)}
            loading="lazy"
            quality={85}
          />
        ) : file.type === 'AUDIO' ? (
          <div className="w-full h-full bg-neutral-200 flex items-center justify-center px-4">
            <Music className="h-8 w-8 text-neutral-400 mr-3 flex-shrink-0" />
            <span className="text-sm font-medium text-neutral-600 truncate">
              {file.remark || file.name}
            </span>
          </div>
        ) : file.type === 'VIDEO' ? (
          <div className="w-full h-full bg-neutral-100 flex flex-col items-center justify-center gap-2">
            <Video className="h-12 w-12 text-neutral-400" />
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-neutral-400 animate-spin" />
              <span className="text-xs text-neutral-500">
                {file.source === 'URL' ? '生成缩略图中...' : '生成预览中...'}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRegenerateThumbnail(file.id)
              }}
              className="mt-1 px-2 py-1 text-xs bg-neutral-200 hover:bg-neutral-300 rounded transition-colors"
            >
              <RefreshCw className="h-3 w-3 inline mr-1" />
              重新生成
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-100">
            <Loader2 className="h-8 w-8 text-neutral-400 animate-spin" />
          </div>
        )}

        {/* 视频预览层 */}
        {file.type === 'VIDEO' && getVideoUrl(file) && (
          <video
            src={getVideoUrl(file)!}
            loop
            muted
            playsInline
            autoPlay={autoPlayAll}
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              autoPlayAll || hoveredVideoId === file.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onMouseEnter={(e) => {
              if (!autoPlayAll) {
                e.currentTarget.currentTime = 0
                e.currentTarget.play().catch(() => {})
              }
            }}
          />
        )}

        {/* GIF预览层 */}
        {(() => {
          const gifUrl = isGif(file) ? getGifUrl(file) : null
          return gifUrl ? (
            <img
              src={gifUrl}
              alt={file.name}
              loading="lazy"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                autoPlayAll || hoveredVideoId === file.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
          ) : null
        })()}

        {/* Type Icon Badge / Checkbox */}
        {!maximized && (
          bulkSelectionMode ? (
            <div
              className="absolute top-2 left-2 z-10"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelection(file.id)
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="w-5 h-5 rounded border-2 border-white cursor-pointer accent-blue-600"
              />
            </div>
          ) : (
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-md p-1.5 z-10">
              {file.type === 'IMAGE' && <Image className="h-4 w-4 text-white" />}
              {file.type === 'VIDEO' && <Video className="h-4 w-4 text-white" />}
              {file.type === 'AUDIO' && <Music className="h-4 w-4 text-white" />}
            </div>
          )
        )}
      </div>

      {/* Info - 紧凑模式和最大化模式下隐藏 */}
      {!compactMode && !maximized && (
        <div className="p-3">
          {editingInlineFileId === file.id ? (
            <input
              type="text"
              value={tempInlineRemark}
              onChange={(e) => setTempInlineRemark(e.target.value)}
              onBlur={() => handleInlineEditSave(file.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleInlineEditSave(file.id)
                }
                if (e.key === 'Escape') {
                  setEditingInlineFileId(null)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full text-sm font-medium px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
            />
          ) : (
            <p
              className="text-sm font-medium truncate cursor-text hover:bg-neutral-100 px-2 py-1 rounded -mx-2"
              onClick={(e) => {
                e.stopPropagation()
                handleInlineEditStart(file.id, file.remark || file.name)
              }}
            >
              {file.remark || file.name}
            </p>
          )}
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            <span className="text-xs text-neutral-500">
              {file.type === 'VIDEO' || file.type === 'AUDIO'
                ? file.duration && file.duration > 0
                  ? file.duration < 60
                    ? `${Math.round(file.duration)}秒`
                    : `${Math.round(file.duration / 60)}分钟`
                  : file.fileSize
                  ? `${Math.round(file.fileSize / 1024)}KB`
                  : '-'
                : file.fileSize
                ? `${Math.round(file.fileSize / 1024)}KB`
                : '-'}
            </span>
            {file.folder && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                {file.folder.name}
              </span>
            )}
            {file.actor && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                {file.actor.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 紧凑模式下的 Hover 浮层 */}
      {compactMode && !maximized && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className="text-white text-xs font-medium truncate">
              {file.remark || file.name}
            </p>
            <div className="flex items-center flex-wrap gap-1 mt-1">
              <span className="text-xs text-white/80">
                {file.type === 'VIDEO' || file.type === 'AUDIO'
                  ? file.duration && file.duration > 0
                    ? file.duration < 60
                      ? `${Math.round(file.duration)}秒`
                      : `${Math.round(file.duration / 60)}分钟`
                    : '-'
                  : file.fileSize
                  ? `${Math.round(file.fileSize / 1024)}KB`
                  : '-'}
              </span>
              {file.folder && (
                <span className="px-1.5 py-0.5 bg-blue-500/30 text-blue-100 rounded text-xs">
                  {file.folder.name}
                </span>
              )}
              {file.actor && (
                <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-100 rounded text-xs">
                  {file.actor.name}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Star and Preview Buttons */}
      {!bulkSelectionMode && !maximized && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleStarred(file.id, !file.starred)
            }}
            className="bg-black/60 backdrop-blur-sm p-1.5 rounded-md hover:bg-black/80 shadow-sm pointer-events-auto"
            title={file.starred ? '取消标星' : '标星'}
          >
            <Star className={`h-3.5 w-3.5 ${file.starred ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
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
        </div>
      )}
    </div>
  )
}

