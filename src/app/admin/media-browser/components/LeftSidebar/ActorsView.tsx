"use client"

import { User, Plus } from 'lucide-react'

interface ActorsViewProps {
  selectedActor?: string
  onActorSelect: (actorId: string | undefined, actorData?: { name: string; bio?: string }) => void
  actors?: Array<{ id: string; name: string; avatarUrl?: string; bio?: string; _count: { files: number } }>
  allFilesCount?: number
  onCreateActor: () => void
  dragOverActor?: string | null
  onDragOverActor: (e: React.DragEvent, actorId: string | null) => void
  onDragLeave: () => void
  onDropToActor: (e: React.DragEvent, actorId: string | null) => void
}

export function ActorsView({
  selectedActor,
  onActorSelect,
  actors,
  allFilesCount,
  onCreateActor,
  dragOverActor,
  onDragOverActor,
  onDragLeave,
  onDropToActor,
}: ActorsViewProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-1">
          <User className="h-4 w-4" />
          演员
        </h3>
        <button
          onClick={onCreateActor}
          className="text-neutral-600 hover:text-neutral-900"
          title="添加演员"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-1">
        {/* All Actors */}
        <button
          onClick={() => onActorSelect(undefined)}
          onDragOver={(e) => onDragOverActor(e, null)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDropToActor(e, null)}
          className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
            !selectedActor
              ? 'bg-neutral-900 text-white'
              : dragOverActor === null
              ? 'bg-blue-100 hover:bg-blue-200'
              : 'hover:bg-neutral-100'
          }`}
        >
          All
          <span className="ml-2 text-xs opacity-60">
            ({allFilesCount || 0})
          </span>
        </button>

        {/* Actor List */}
        {actors?.map((actor) => (
          <button
            key={actor.id}
            onClick={() => {
              onActorSelect(actor.id, {
                name: actor.name,
                bio: actor.bio || '',
              })
            }}
            onDragOver={(e) => onDragOverActor(e, actor.id)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDropToActor(e, actor.id)}
            className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors flex items-start gap-2 ${
              selectedActor === actor.id
                ? 'bg-neutral-900 text-white'
                : dragOverActor === actor.id
                ? 'bg-blue-100 hover:bg-blue-200'
                : 'hover:bg-neutral-100'
            }`}
          >
            {actor.avatarUrl ? (
              <img
                src={actor.avatarUrl}
                alt={`${actor.name}的头像`}
                className="w-6 h-6 rounded object-cover flex-shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-6 h-6 rounded bg-neutral-300 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-neutral-600" />
              </div>
            )}
            <span className="flex-1 break-words min-w-0">{actor.name}</span>
            <span className="text-xs opacity-60 flex-shrink-0">
              ({actor._count?.files || 0})
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

