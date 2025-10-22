"use client"

import { MediaCard } from './MediaCard'
import type { MediaFile } from '../../types'

type MasonryGridProps = {
  files: MediaFile[]
  columns: MediaFile[][]
  columnWidth: number
  maximized: boolean
  compactMode: boolean
  bulkSelectionMode: boolean
  selectedFileIds: Set<string>
  draggedFileId: string | null
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

export function MasonryGrid({
  columns,
  columnWidth,
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
  onInlineEdit,
  onToggleStarred,
  getThumbnailUrl,
  getVideoUrl,
  getGifUrl,
  isGif,
  getImageHeight,
}: MasonryGridProps) {
  return (
    <div className={`flex w-full items-start ${maximized ? 'gap-0.5' : 'gap-4'}`}>
      {columns.map((columnFiles, columnIndex) => (
        <div
          key={columnIndex}
          className={`flex flex-col ${maximized ? 'gap-0.5' : 'gap-4'}`}
          style={{ width: `${columnWidth}px` }}
        >
          {columnFiles.map((file) => (
            <MediaCard
              key={file.id}
              file={file}
              columnWidth={columnWidth}
              maximized={maximized}
              compactMode={compactMode}
              bulkSelectionMode={bulkSelectionMode}
              isSelected={selectedFileIds.has(file.id)}
              isDragged={draggedFileId === file.id}
              autoPlayAll={autoPlayAll}
              hoveredVideoId={hoveredVideoId}
              onFileClick={onFileClick}
              onToggleSelection={onToggleSelection}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onVideoHover={onVideoHover}
              onRegenerateThumbnail={onRegenerateThumbnail}
              onPreview={onPreview}
              onInlineEdit={onInlineEdit}
              onToggleStarred={onToggleStarred}
              getThumbnailUrl={getThumbnailUrl}
              getVideoUrl={getVideoUrl}
              getGifUrl={getGifUrl}
              isGif={isGif}
              getImageHeight={getImageHeight}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

