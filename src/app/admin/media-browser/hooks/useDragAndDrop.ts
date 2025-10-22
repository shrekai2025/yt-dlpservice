"use client"

import { useState } from 'react'

interface UseDragAndDropOptions {
  onDropToFolder: (fileId: string, folderId: string | null) => Promise<void>
  onDropToActor: (fileId: string, actorId: string | null) => Promise<void>
}

export function useDragAndDrop({
  onDropToFolder,
  onDropToActor,
}: UseDragAndDropOptions) {
  const [draggedFile, setDraggedFile] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [dragOverActor, setDragOverActor] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggedFile(fileId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedFile(null)
    setDragOverFolder(null)
    setDragOverActor(null)
  }

  const handleDragOverFolder = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolder(folderId)
  }

  const handleDragOverActor = (e: React.DragEvent, actorId: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverActor(actorId)
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
    setDragOverActor(null)
  }

  const handleDropToFolder = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    if (!draggedFile) return

    try {
      await onDropToFolder(draggedFile, targetFolderId)
    } catch (error) {
      console.error('Move file failed:', error)
      alert('移动文件失败')
    } finally {
      setDraggedFile(null)
      setDragOverFolder(null)
    }
  }

  const handleDropToActor = async (e: React.DragEvent, targetActorId: string | null) => {
    e.preventDefault()
    if (!draggedFile) return

    try {
      await onDropToActor(draggedFile, targetActorId)
    } catch (error) {
      console.error('Move file to actor failed:', error)
      alert('移动文件失败')
    } finally {
      setDraggedFile(null)
      setDragOverActor(null)
    }
  }

  return {
    // State
    draggedFile,
    dragOverFolder,
    dragOverActor,
    
    // Handlers
    handleDragStart,
    handleDragEnd,
    handleDragOverFolder,
    handleDragOverActor,
    handleDragLeave,
    handleDropToFolder,
    handleDropToActor,
  }
}

