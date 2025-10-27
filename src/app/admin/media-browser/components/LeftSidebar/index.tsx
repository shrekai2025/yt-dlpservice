"use client"

import { ChevronRight, ChevronLeft } from 'lucide-react'
import { ActionButtons } from './ActionButtons'
import { SourceFilter } from './SourceFilter'
import { ViewTabs } from './ViewTabs'
import { FoldersView } from './FoldersView'
import { ActorsView } from './ActorsView'

interface LeftSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  viewTab: 'folders' | 'actors'
  onViewTabChange: (tab: 'folders' | 'actors') => void
  filterSource?: string
  onFilterSourceChange: (source: string | undefined) => void
  
  // Action handlers
  onAddUrl: () => void
  onAddLocalPath: () => void
  onDownloadUrl: () => void
  onFileUpload: () => void
  onExport: () => void
  isUploading?: boolean
  isExporting?: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  
  // View mode
  viewMode: 'grid' | 'list' | 'justified'
  onViewModeChange: (mode: 'grid' | 'list' | 'justified') => void
  autoPlayAll: boolean
  onAutoPlayAllChange: (value: boolean) => void
  compactMode: boolean
  onCompactModeChange: (value: boolean) => void
  
  // Folders
  selectedFolder?: string
  onFolderSelect: (folderId: string | undefined) => void
  showUnassigned: boolean
  onShowUnassignedChange: (value: boolean) => void
  folders?: Array<{ id: string; name: string; color?: string; _count: { files: number } }>
  allFilesCount?: number
  unassignedFilesCount?: number
  onCreateFolder: () => void
  onEditFolder: (folderId: string) => void
  onDeleteFolder: (folderId: string) => void
  
  // Actors
  selectedActor?: string
  onActorSelect: (actorId: string | undefined) => void
  actors?: Array<{ id: string; name: string; avatarUrl?: string; _count: { files: number } }>
  onCreateActor: () => void
  
  // Drag and drop
  draggedFile?: string | null
  dragOverFolder?: string | null
  dragOverActor?: string | null
  onDragOverFolder: (e: React.DragEvent, folderId: string | null) => void
  onDragOverActor: (e: React.DragEvent, actorId: string | null) => void
  onDragLeave: () => void
  onDropToFolder: (e: React.DragEvent, folderId: string | null) => void
  onDropToActor: (e: React.DragEvent, actorId: string | null) => void
  
  // Editing state
  editingFolderId?: string | null
  editingActorName?: boolean
  editingActorBio?: boolean
  onEditingStateChange: (state: any) => void
}

export function LeftSidebar(props: LeftSidebarProps) {
  const {
    collapsed,
    onToggleCollapse,
    viewTab,
    onViewTabChange,
    filterSource,
    onFilterSourceChange,
  } = props

  return (
    <div className={`shrink-0 flex flex-col border-r border-neutral-200 bg-neutral-50 transition-all duration-300 ${
      collapsed ? 'w-12' : 'w-64'
    }`}>
      {/* Collapse/Expand Button */}
      <div className="border-b border-neutral-200">
        <button
          onClick={onToggleCollapse}
          className="w-full h-12 flex items-center justify-center hover:bg-neutral-100 transition-colors"
          title={collapsed ? '展开控制面板' : '收起控制面板'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-neutral-600" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-neutral-600" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Action Buttons */}
          <ActionButtons {...props} />

          {/* Filters */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            {/* Source Filter */}
            <SourceFilter
              filterSource={filterSource}
              onFilterSourceChange={onFilterSourceChange}
            />

            {/* View Tabs */}
            <ViewTabs
              viewTab={viewTab}
              onViewTabChange={onViewTabChange}
              onEditingStateChange={props.onEditingStateChange}
            />

            {/* Folders View */}
            {viewTab === 'folders' && <FoldersView {...props} />}

            {/* Actors View */}
            {viewTab === 'actors' && <ActorsView {...props} />}
          </div>
        </div>
      )}
    </div>
  )
}

