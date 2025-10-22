"use client"

import { useState, useCallback } from 'react'
import type { MediaFile } from '../types'

export function useBulkOperations() {
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [showBulkFolderSelector, setShowBulkFolderSelector] = useState(false)
  const [showBulkActorSelector, setShowBulkActorSelector] = useState(false)

  const toggleBulkSelection = useCallback((fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }, [])

  const selectAllFiles = useCallback((files: MediaFile[]) => {
    const allIds = new Set(files.map(f => f.id))
    setSelectedFileIds(allIds)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedFileIds(new Set())
  }, [])

  const exitBulkMode = useCallback(() => {
    setBulkSelectionMode(false)
    setSelectedFileIds(new Set())
    setShowBulkFolderSelector(false)
    setShowBulkActorSelector(false)
  }, [])

  const enterBulkMode = useCallback(() => {
    setBulkSelectionMode(true)
  }, [])

  return {
    // State
    bulkSelectionMode,
    selectedFileIds,
    showBulkFolderSelector,
    showBulkActorSelector,
    
    // Actions
    toggleBulkSelection,
    selectAllFiles,
    clearSelection,
    exitBulkMode,
    enterBulkMode,
    setBulkSelectionMode,
    setShowBulkFolderSelector,
    setShowBulkActorSelector,
  }
}

