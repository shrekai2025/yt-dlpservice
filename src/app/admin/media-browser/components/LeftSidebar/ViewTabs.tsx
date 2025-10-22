"use client"

import { Folder, User } from 'lucide-react'

interface ViewTabsProps {
  viewTab: 'folders' | 'actors'
  onViewTabChange: (tab: 'folders' | 'actors') => void
  onEditingStateChange: (state: { editingActorName?: boolean; editingActorBio?: boolean }) => void
}

export function ViewTabs({ viewTab, onViewTabChange, onEditingStateChange }: ViewTabsProps) {
  return (
    <div className="mb-4 border-t border-neutral-200 pt-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => {
            onViewTabChange('folders')
            // 重置演员编辑状态
            onEditingStateChange({
              editingActorName: false,
              editingActorBio: false,
            })
          }}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded transition-colors ${
            viewTab === 'folders'
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          <Folder className="h-4 w-4" />
          文件夹
        </button>
        <button
          onClick={() => {
            onViewTabChange('actors')
          }}
          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded transition-colors ${
            viewTab === 'actors'
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          <User className="h-4 w-4" />
          演员表
        </button>
      </div>
    </div>
  )
}

