// Media Browser Types

export type MediaFile = {
  id: string
  name: string
  remark: string | null
  type: string
  source: string
  sourceUrl: string | null
  localPath: string | null
  originalPath: string | null
  thumbnailPath: string | null
  fileSize: number | null
  duration: number | null
  mimeType?: string | null
  width?: number | null
  height?: number | null
  starred?: boolean
  folder?: { id: string; name: string } | null
  actor?: {
    id: string
    name: string
    avatarUrl: string | null
    referenceImageUrl: string | null
    bio: string | null
  } | null
}

export type UploadTask = {
  id: string
  name: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  isDuplicate?: boolean
  url?: string
  fileData?: string
  fileName?: string
  mimeType?: string
}

export type ViewTab = 'folders' | 'actors'

export type ViewMode = 'grid' | 'justified'

// UI State
export type UIState = {
  viewTab: ViewTab
  viewMode: ViewMode
  compactMode: boolean
  autoPlayAll: boolean
  actorPanelCollapsed: boolean
  leftSidebarCollapsed: boolean
  columnWidth: number
  showUnassigned: boolean
  justifiedRowHeight: number
  maximized: boolean
  maximizedSplitRatio: number // 0-100, 左侧占比
}

export type UIAction =
  | { type: 'SET_VIEW_TAB'; payload: ViewTab }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'TOGGLE_COMPACT_MODE' }
  | { type: 'SET_COMPACT_MODE'; payload: boolean }
  | { type: 'TOGGLE_AUTO_PLAY_ALL' }
  | { type: 'SET_AUTO_PLAY_ALL'; payload: boolean }
  | { type: 'TOGGLE_ACTOR_PANEL' }
  | { type: 'SET_ACTOR_PANEL_COLLAPSED'; payload: boolean }
  | { type: 'TOGGLE_LEFT_SIDEBAR' }
  | { type: 'SET_LEFT_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'SET_COLUMN_WIDTH'; payload: number }
  | { type: 'SET_SHOW_UNASSIGNED'; payload: boolean }
  | { type: 'SET_JUSTIFIED_ROW_HEIGHT'; payload: number }
  | { type: 'TOGGLE_MAXIMIZED' }
  | { type: 'SET_MAXIMIZED'; payload: boolean }
  | { type: 'SET_MAXIMIZED_SPLIT_RATIO'; payload: number }

// Filter State
export type FilterState = {
  selectedFolder: string | undefined
  selectedActor: string | undefined
  filterTypes: ('IMAGE' | 'VIDEO' | 'AUDIO')[]
  filterSource: 'LOCAL' | 'URL' | undefined
  filterStarred: boolean
}

export type FilterAction =
  | { type: 'SET_FOLDER'; payload: string | undefined }
  | { type: 'SET_ACTOR'; payload: string | undefined }
  | { type: 'TOGGLE_TYPE'; payload: 'IMAGE' | 'VIDEO' | 'AUDIO' }
  | { type: 'SET_TYPES'; payload: ('IMAGE' | 'VIDEO' | 'AUDIO')[] }
  | { type: 'SET_SOURCE'; payload: 'LOCAL' | 'URL' | undefined }
  | { type: 'TOGGLE_STARRED' }
  | { type: 'SET_STARRED'; payload: boolean }
  | { type: 'RESET_FILTERS' }

// LocalStorage keys
export const STORAGE_KEYS = {
  VIEW_TAB: 'media-browser-view-tab',
  VIEW_MODE: 'media-browser-view-mode',
  FILTER_TYPE: 'media-browser-filter-type',
  FILTER_SOURCE: 'media-browser-filter-source',
  COLUMN_WIDTH: 'media-browser-column-width',
  ACTOR_PANEL_COLLAPSED: 'media-browser-actor-panel-collapsed',
  LEFT_SIDEBAR_COLLAPSED: 'media-browser-left-sidebar-collapsed',
  SELECTED_FOLDER: 'media-browser-selected-folder',
  SELECTED_ACTOR: 'media-browser-selected-actor',
  COMPACT_MODE: 'media-browser-compact-mode',
  AUTO_PLAY_ALL: 'media-browser-auto-play-all',
  SHOW_UNASSIGNED: 'media-browser-show-unassigned',
} as const

export type MediaFolder = {
  id: string
  name: string
  color: string | null
  _count?: {
    files: number
  }
}

export type MediaActor = {
  id: string
  name: string
  avatarUrl: string | null
  referenceImageUrl: string | null
  bio: string | null
  _count?: {
    files: number
  }
}
