import type { UIState, UIAction, FilterState, FilterAction } from './types'

// UI Reducer
export const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SET_VIEW_TAB':
      return { ...state, viewTab: action.payload }
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload }
    case 'TOGGLE_COMPACT_MODE':
      return { ...state, compactMode: !state.compactMode }
    case 'SET_COMPACT_MODE':
      return { ...state, compactMode: action.payload }
    case 'TOGGLE_AUTO_PLAY_ALL':
      return { ...state, autoPlayAll: !state.autoPlayAll }
    case 'SET_AUTO_PLAY_ALL':
      return { ...state, autoPlayAll: action.payload }
    case 'TOGGLE_ACTOR_PANEL':
      return { ...state, actorPanelCollapsed: !state.actorPanelCollapsed }
    case 'SET_ACTOR_PANEL_COLLAPSED':
      return { ...state, actorPanelCollapsed: action.payload }
    case 'TOGGLE_LEFT_SIDEBAR':
      return { ...state, leftSidebarCollapsed: !state.leftSidebarCollapsed }
    case 'SET_LEFT_SIDEBAR_COLLAPSED':
      return { ...state, leftSidebarCollapsed: action.payload }
    case 'SET_COLUMN_WIDTH':
      return { ...state, columnWidth: action.payload }
    case 'SET_SHOW_UNASSIGNED':
      return { ...state, showUnassigned: action.payload }
    case 'SET_JUSTIFIED_ROW_HEIGHT':
      return { ...state, justifiedRowHeight: action.payload }
    case 'TOGGLE_MAXIMIZED':
      return { ...state, maximized: !state.maximized }
    case 'SET_MAXIMIZED':
      return { ...state, maximized: action.payload }
    case 'SET_MAXIMIZED_SPLIT_RATIO':
      return { ...state, maximizedSplitRatio: action.payload }
    default:
      return state
  }
}

// Filter Reducer
export const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_FOLDER':
      return { ...state, selectedFolder: action.payload }
    case 'SET_ACTOR':
      return { ...state, selectedActor: action.payload }
    case 'TOGGLE_TYPE':
      // Toggle type selection
      const isSelected = state.filterTypes.includes(action.payload)
      if (isSelected) {
        // Deselect, but keep at least one
        const newTypes = state.filterTypes.filter((t) => t !== action.payload)
        return { ...state, filterTypes: newTypes.length > 0 ? newTypes : state.filterTypes }
      } else {
        // Add selection
        return { ...state, filterTypes: [...state.filterTypes, action.payload] }
      }
    case 'SET_TYPES':
      return { ...state, filterTypes: action.payload.length > 0 ? action.payload : state.filterTypes }
    case 'SET_SOURCE':
      return { ...state, filterSource: action.payload }
    case 'TOGGLE_STARRED':
      return { ...state, filterStarred: !state.filterStarred }
    case 'SET_STARRED':
      return { ...state, filterStarred: action.payload }
    case 'RESET_FILTERS':
      return {
        selectedFolder: undefined,
        selectedActor: undefined,
        filterTypes: ['IMAGE', 'VIDEO', 'AUDIO'],
        filterSource: undefined,
        filterStarred: false,
      }
    default:
      return state
  }
}
