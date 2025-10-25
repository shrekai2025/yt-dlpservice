"use client"

import { api } from '~/components/providers/trpc-provider'
import { useToast } from '~/components/ui/use-toast'
import type { MediaFile } from '../types'

interface UseMediaMutationsOptions {
  onFilesChange?: () => void
  onFoldersChange?: () => void
  onActorsChange?: () => void
  onFileDetailsUpdate?: (file: MediaFile) => void
}

export function useMediaMutations({
  onFilesChange,
  onFoldersChange,
  onActorsChange,
  onFileDetailsUpdate,
}: UseMediaMutationsOptions = {}) {
  const { toast } = useToast()
  
  // ===== File Operations =====
  const addUrlsMutation = api.mediaBrowser.addUrls.useMutation()
  
  const uploadLocalMutation = api.mediaBrowser.uploadLocal.useMutation()
  
  const addLocalReferenceMutation = api.mediaBrowser.addLocalReference.useMutation()
  
  const deleteFileMutation = api.mediaBrowser.deleteFile.useMutation({
    onSuccess: () => {
      onFilesChange?.()
    },
  })
  
  const updateFileMutation = api.mediaBrowser.updateFile.useMutation({
    onSuccess: () => {
      onFilesChange?.()
    },
  })
  
  const moveFileToFolderMutation = api.mediaBrowser.moveFileToFolder.useMutation({
    onSuccess: (updatedFile) => {
      onFilesChange?.()
      onFoldersChange?.()
      onFileDetailsUpdate?.(updatedFile)
    },
  })
  
  const moveFileToActorMutation = api.mediaBrowser.moveFileToActor.useMutation({
    onSuccess: (updatedFile) => {
      onFilesChange?.()
      onActorsChange?.()
      onFileDetailsUpdate?.(updatedFile)
    },
  })
  
  const regenerateThumbnailMutation = api.mediaBrowser.regenerateThumbnail.useMutation({
    onSuccess: () => {
      toast({
        title: '缩略图重新生成',
        description: '缩略图重新生成任务已添加，请稍后刷新查看',
      })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '重新生成失败',
        description: error.message,
      })
    },
  })
  
  const convertUrlToLocalMutation = api.mediaBrowser.convertUrlToLocal.useMutation({
    onSuccess: (data) => {
      alert('文件已成功转存到本地')
      onFileDetailsUpdate?.(data.file)
      onFilesChange?.()
    },
    onError: (error) => {
      alert(`转存失败: ${error.message}`)
    },
  })
  
  const exportMutation = api.mediaBrowser.exportMedia.useMutation()
  
  // ===== Folder Operations =====
  const createFolderMutation = api.mediaBrowser.createFolder.useMutation({
    onSuccess: () => {
      onFoldersChange?.()
    },
  })
  
  const updateFolderMutation = api.mediaBrowser.updateFolder.useMutation({
    onSuccess: () => {
      onFoldersChange?.()
    },
  })
  
  const deleteFolderMutation = api.mediaBrowser.deleteFolder.useMutation({
    onSuccess: () => {
      onFoldersChange?.()
      onFilesChange?.()
    },
  })
  
  // ===== Actor Operations =====
  const createActorMutation = api.mediaBrowser.createActor.useMutation({
    onSuccess: () => {
      onActorsChange?.()
    },
  })
  
  const updateActorMutation = api.mediaBrowser.updateActor.useMutation({
    onSuccess: () => {
      onActorsChange?.()
    },
  })
  
  return {
    // File operations
    addUrlsMutation,
    uploadLocalMutation,
    addLocalReferenceMutation,
    deleteFileMutation,
    updateFileMutation,
    moveFileToFolderMutation,
    moveFileToActorMutation,
    regenerateThumbnailMutation,
    convertUrlToLocalMutation,
    exportMutation,
    
    // Folder operations
    createFolderMutation,
    updateFolderMutation,
    deleteFolderMutation,
    
    // Actor operations
    createActorMutation,
    updateActorMutation,
  }
}

