import { useMemo } from 'react'
import { filterReducer, uiReducer } from '../reducers'
import type { FilterState, ViewMode, ViewTab, UIState } from '../types'
import { STORAGE_KEYS } from '../types'
import { usePersistentReducer } from './usePersistentReducer'

const UI_STORAGE_KEY = 'media-browser:ui-state'
const FILTER_STORAGE_KEY = 'media-browser:filter-state'

const DEFAULT_UI_STATE: UIState = {
  viewTab: 'folders',
  viewMode: 'grid',
  compactMode: false,
  autoPlayAll: false,
  actorPanelCollapsed: false,
  leftSidebarCollapsed: false,
  columnWidth: 280,
  showUnassigned: false,
  justifiedRowHeight: 250,
  maximized: false,
  maximizedSplitRatio: 70,
}

const DEFAULT_FILTER_STATE: FilterState = {
  selectedFolder: undefined,
  selectedActor: undefined,
  filterTypes: ['IMAGE', 'VIDEO', 'AUDIO'],
  filterSource: undefined,
  filterStarred: false,
}

const booleanFromString = (value: string | null): boolean | undefined => {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

const parseViewMode = (value: string | null): ViewMode | undefined => {
  if (value === 'grid' || value === 'justified') return value
  return undefined
}

const parseViewTab = (value: string | null): ViewTab | undefined => {
  if (value === 'folders' || value === 'actors') return value
  return undefined
}

function loadLegacyUIState(): Partial<UIState> | undefined {
  if (typeof window === 'undefined') return undefined

  const ls = window.localStorage
  const legacy: Partial<UIState> = {}

  const maybeTab = parseViewTab(ls.getItem(STORAGE_KEYS.VIEW_TAB))
  if (maybeTab) legacy.viewTab = maybeTab

  const maybeMode = parseViewMode(ls.getItem(STORAGE_KEYS.VIEW_MODE))
  if (maybeMode) legacy.viewMode = maybeMode

  const maybeColumnWidth = Number(ls.getItem(STORAGE_KEYS.COLUMN_WIDTH))
  if (!Number.isNaN(maybeColumnWidth) && maybeColumnWidth > 0) {
    legacy.columnWidth = maybeColumnWidth
  }

  const compactMode = booleanFromString(ls.getItem(STORAGE_KEYS.COMPACT_MODE))
  if (compactMode !== undefined) legacy.compactMode = compactMode

  const autoPlayAll = booleanFromString(ls.getItem(STORAGE_KEYS.AUTO_PLAY_ALL))
  if (autoPlayAll !== undefined) legacy.autoPlayAll = autoPlayAll

  const actorPanelCollapsed = booleanFromString(ls.getItem(STORAGE_KEYS.ACTOR_PANEL_COLLAPSED))
  if (actorPanelCollapsed !== undefined) legacy.actorPanelCollapsed = actorPanelCollapsed

  const leftSidebarCollapsed = booleanFromString(ls.getItem(STORAGE_KEYS.LEFT_SIDEBAR_COLLAPSED))
  if (leftSidebarCollapsed !== undefined) legacy.leftSidebarCollapsed = leftSidebarCollapsed

  const showUnassigned = booleanFromString(ls.getItem(STORAGE_KEYS.SHOW_UNASSIGNED))
  if (showUnassigned !== undefined) legacy.showUnassigned = showUnassigned

  return Object.keys(legacy).length > 0 ? legacy : undefined
}

function loadLegacyFilterState(): Partial<FilterState> | undefined {
  if (typeof window === 'undefined') return undefined

  const ls = window.localStorage
  const legacy: Partial<FilterState> = {}

  const selectedFolder = ls.getItem(STORAGE_KEYS.SELECTED_FOLDER)
  if (selectedFolder) legacy.selectedFolder = selectedFolder

  const selectedActor = ls.getItem(STORAGE_KEYS.SELECTED_ACTOR)
  if (selectedActor) legacy.selectedActor = selectedActor

  const filterSource = ls.getItem(STORAGE_KEYS.FILTER_SOURCE)
  if (filterSource === 'LOCAL' || filterSource === 'URL') {
    legacy.filterSource = filterSource
  }

  try {
    const filterTypesRaw = ls.getItem(STORAGE_KEYS.FILTER_TYPE)
    if (filterTypesRaw) {
      const parsed = JSON.parse(filterTypesRaw) as FilterState['filterTypes']
      if (Array.isArray(parsed) && parsed.length > 0) {
        legacy.filterTypes = parsed
      }
    }
  } catch {
    // ignore invalid legacy value
  }

  return Object.keys(legacy).length > 0 ? legacy : undefined
}

export function useMediaBrowserState() {
  const [uiState, dispatchUI, uiHydrated] = usePersistentReducer(uiReducer, DEFAULT_UI_STATE, {
    storageKey: UI_STORAGE_KEY,
    legacyLoader: loadLegacyUIState,
  })

  const [filterState, dispatchFilter, filterHydrated] = usePersistentReducer(
    filterReducer,
    DEFAULT_FILTER_STATE,
    {
      storageKey: FILTER_STORAGE_KEY,
      legacyLoader: loadLegacyFilterState,
    }
  )

  const uiActions = useMemo(() => {
    return {
      setViewTab: (tab: ViewTab) => dispatchUI({ type: 'SET_VIEW_TAB', payload: tab }),
      setViewMode: (mode: ViewMode) => dispatchUI({ type: 'SET_VIEW_MODE', payload: mode }),
      setColumnWidth: (width: number) => dispatchUI({ type: 'SET_COLUMN_WIDTH', payload: width }),
      setJustifiedRowHeight: (height: number) =>
        dispatchUI({ type: 'SET_JUSTIFIED_ROW_HEIGHT', payload: height }),
      setCompactMode: (value: boolean) => dispatchUI({ type: 'SET_COMPACT_MODE', payload: value }),
      toggleCompactMode: () => dispatchUI({ type: 'TOGGLE_COMPACT_MODE' }),
      setAutoPlayAll: (value: boolean) =>
        dispatchUI({ type: 'SET_AUTO_PLAY_ALL', payload: value }),
      toggleAutoPlayAll: () => dispatchUI({ type: 'TOGGLE_AUTO_PLAY_ALL' }),
      setActorPanelCollapsed: (value: boolean) =>
        dispatchUI({ type: 'SET_ACTOR_PANEL_COLLAPSED', payload: value }),
      toggleActorPanel: () => dispatchUI({ type: 'TOGGLE_ACTOR_PANEL' }),
      setLeftSidebarCollapsed: (value: boolean) =>
        dispatchUI({ type: 'SET_LEFT_SIDEBAR_COLLAPSED', payload: value }),
      toggleLeftSidebar: () => dispatchUI({ type: 'TOGGLE_LEFT_SIDEBAR' }),
      setShowUnassigned: (value: boolean) =>
        dispatchUI({ type: 'SET_SHOW_UNASSIGNED', payload: value }),
      setMaximized: (value: boolean) => dispatchUI({ type: 'SET_MAXIMIZED', payload: value }),
      toggleMaximized: () => dispatchUI({ type: 'TOGGLE_MAXIMIZED' }),
      setMaximizedSplitRatio: (ratio: number) => dispatchUI({ type: 'SET_MAXIMIZED_SPLIT_RATIO', payload: ratio }),
    }
  }, [dispatchUI])

  const filterActions = useMemo(() => {
    return {
      setFolder: (folderId: string | undefined) =>
        dispatchFilter({ type: 'SET_FOLDER', payload: folderId }),
      setActor: (actorId: string | undefined) =>
        dispatchFilter({ type: 'SET_ACTOR', payload: actorId }),
      toggleType: (type: 'IMAGE' | 'VIDEO' | 'AUDIO') =>
        dispatchFilter({ type: 'TOGGLE_TYPE', payload: type }),
      setTypes: (types: FilterState['filterTypes']) =>
        dispatchFilter({ type: 'SET_TYPES', payload: types }),
      setSource: (source: 'LOCAL' | 'URL' | undefined) =>
        dispatchFilter({ type: 'SET_SOURCE', payload: source }),
      toggleStarred: () => dispatchFilter({ type: 'TOGGLE_STARRED' }),
      setStarred: (starred: boolean) => dispatchFilter({ type: 'SET_STARRED', payload: starred }),
      reset: () => dispatchFilter({ type: 'RESET_FILTERS' }),
    }
  }, [dispatchFilter])

  return {
    uiState,
    filterState,
    uiActions,
    filterActions,
    hydrated: uiHydrated && filterHydrated,
  }
}
