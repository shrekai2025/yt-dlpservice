"use client"

import { Folder, Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import { useState } from 'react'

interface FoldersViewProps {
  selectedFolder?: string
  onFolderSelect: (folderId: string | undefined) => void
  showUnassigned: boolean
  onShowUnassignedChange: (value: boolean) => void
  folders?: Array<{ id: string; name: string; color?: string; _count: { files: number } }>
  allFilesCount?: number
  unassignedFilesCount?: number
  onCreateFolder: () => void
  dragOverFolder?: string | null
  onDragOverFolder: (e: React.DragEvent, folderId: string | null) => void
  onDragLeave: () => void
  onDropToFolder: (e: React.DragEvent, folderId: string | null) => void
}

export function FoldersView({
  selectedFolder,
  onFolderSelect,
  showUnassigned,
  onShowUnassignedChange,
  folders,
  allFilesCount,
  unassignedFilesCount,
  onCreateFolder,
  dragOverFolder,
  onDragOverFolder,
  onDragLeave,
  onDropToFolder,
}: FoldersViewProps) {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [tempFolderName, setTempFolderName] = useState('')
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null)

  const handleFolderNameEdit = async (folderId: string) => {
    if (!tempFolderName.trim()) {
      alert('请输入文件夹名称')
      return
    }
    
    // TODO: Call update mutation
    console.log('Update folder:', folderId, tempFolderName)
    setEditingFolderId(null)
  }

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`确定要删除文件夹"${folderName}"吗？文件夹中的文件将变为未归属状态。`)) {
      return
    }
    
    // TODO: Call delete mutation
    console.log('Delete folder:', folderId)
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-1">
          <Folder className="h-4 w-4" />
          文件夹
        </h3>
        <button
          onClick={onCreateFolder}
          className="text-neutral-600 hover:text-neutral-900"
          title="添加文件夹"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-1">
        {/* All Files */}
        <button
          onClick={() => {
            onFolderSelect(undefined)
            onShowUnassignedChange(false)
          }}
          onDragOver={(e) => onDragOverFolder(e, null)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDropToFolder(e, null)}
          className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
            !selectedFolder && !showUnassigned
              ? 'bg-neutral-900 text-white'
              : dragOverFolder === null
              ? 'bg-blue-100 hover:bg-blue-200'
              : 'hover:bg-neutral-100'
          }`}
        >
          All
          <span className="ml-2 text-xs opacity-60">
            ({allFilesCount || 0})
          </span>
        </button>

        {/* Unassigned Files */}
        <button
          onClick={() => {
            onFolderSelect(undefined)
            onShowUnassignedChange(true)
          }}
          onDragOver={(e) => onDragOverFolder(e, null)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDropToFolder(e, null)}
          className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
            showUnassigned
              ? 'bg-neutral-900 text-white'
              : dragOverFolder === null
              ? 'bg-blue-100 hover:bg-blue-200'
              : 'hover:bg-neutral-100'
          }`}
        >
          未归属文件
          <span className="ml-2 text-xs opacity-60">
            ({unassignedFilesCount || 0})
          </span>
        </button>

        {/* Folder List */}
        {folders?.map((folder) => (
          <div
            key={folder.id}
            className="relative group"
            onMouseEnter={() => setHoveredFolderId(folder.id)}
            onMouseLeave={() => setHoveredFolderId(null)}
          >
            {editingFolderId === folder.id ? (
              <div className="flex items-center gap-1 px-2 py-1.5">
                <input
                  type="text"
                  value={tempFolderName}
                  onChange={(e) => setTempFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void handleFolderNameEdit(folder.id)
                    } else if (e.key === 'Escape') {
                      setEditingFolderId(null)
                    }
                  }}
                  className="flex-1 rounded border border-neutral-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  autoFocus
                />
                <button
                  onClick={() => handleFolderNameEdit(folder.id)}
                  className="text-green-600 hover:text-green-700"
                  title="保存"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setEditingFolderId(null)}
                  className="text-neutral-500 hover:text-neutral-600"
                  title="取消"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  onFolderSelect(folder.id)
                  onShowUnassignedChange(false)
                }}
                onDragOver={(e) => onDragOverFolder(e, folder.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDropToFolder(e, folder.id)}
                className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors cursor-pointer ${
                  selectedFolder === folder.id
                    ? 'bg-neutral-900 text-white'
                    : dragOverFolder === folder.id
                    ? 'bg-blue-100 hover:bg-blue-200'
                    : 'hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex-1 break-words min-w-0">
                    {folder.name}
                    <span className="ml-2 text-xs opacity-60">
                      ({folder._count?.files || 0})
                    </span>
                  </span>
                  {hoveredFolderId === folder.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingFolderId(folder.id)
                          setTempFolderName(folder.name)
                        }}
                        className="text-neutral-500 hover:text-neutral-700"
                        title="编辑名称"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleDeleteFolder(folder.id, folder.name)
                        }}
                        className="text-red-500 hover:text-red-700"
                        title="删除文件夹"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

