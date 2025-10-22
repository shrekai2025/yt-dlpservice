"use client"

interface SourceFilterProps {
  filterSource?: string
  onFilterSourceChange: (source: string | undefined) => void
}

export function SourceFilter({ filterSource, onFilterSourceChange }: SourceFilterProps) {
  return (
    <div className="mb-4">
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onFilterSourceChange(undefined)}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filterSource === undefined
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => onFilterSourceChange('LOCAL')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filterSource === 'LOCAL'
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          本地
        </button>
        <button
          onClick={() => onFilterSourceChange('URL')}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            filterSource === 'URL'
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          }`}
        >
          URL
        </button>
      </div>
    </div>
  )
}

