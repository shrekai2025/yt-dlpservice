"use client"

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import NextImage from 'next/image'
import { api } from '~/components/providers/trpc-provider'
import { Plus, Download, Grid3x3, List, Image, Video, Music, Folder, X, Upload, AlertCircle, RefreshCw, Trash2, Loader2, User, Edit2, Check, ChevronLeft, ChevronRight, Copy, Search, Minimize2, Maximize2, Play, HardDrive, Scissors, RotateCw, Star } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { getShimmerPlaceholder } from '~/lib/utils/image-placeholder'
import { VideoTrimModal } from '~/components/VideoTrimModal'
import { useMediaBrowserState } from './hooks/useMediaBrowserState'
import { useMediaHover } from './hooks/useMediaHover'
import { useMediaQueries } from './hooks/useMediaQueries'
import { useMediaMutations } from './hooks/useMediaMutations'
import { useBulkOperations } from './hooks/useBulkOperations'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { AddUrlDialog, AddLocalPathDialog, DownloadUrlDialog, CreateFolderDialog, CreateActorDialog } from './components/Dialogs'
import { DragDropOverlay } from './components/FloatingWidgets/DragDropOverlay'
import { MasonryGrid, JustifiedGrid, SingleColumnGrid } from './components/MediaGrid'
import { MaximizedSplitView } from './components/MaximizedSplitView'
import { FileDetailsPanel } from './components/FileDetailsPanel'
import type { MediaFile, UploadTask, UIState, FilterState } from './types'

// ===== Stage 4: State Management with useReducer =====

/**
 * UI State: Controls view configuration and layout
 */

export default function MediaBrowserPage() {
  const { uiState, filterState, uiActions, filterActions, hydrated } = useMediaBrowserState()
  const { hoveredId: hoveredVideoId, handleHover: handleVideoHover } = useMediaHover({ delay: 150 })

  // Destructure for easier access
  const {
    viewTab,
    viewMode,
    compactMode,
    autoPlayAll,
    actorPanelCollapsed,
    leftSidebarCollapsed,
    columnWidth,
    showUnassigned,
    justifiedRowHeight,
    maximized,
    maximizedSplitRatio,
  } = uiState

  const { selectedFolder, selectedActor, filterTypes, filterSource, filterStarred} = filterState

  const {
    setViewTab,
    setViewMode,
    setCompactMode,
    setAutoPlayAll,
    setActorPanelCollapsed,
    setLeftSidebarCollapsed,
    setColumnWidth,
    setJustifiedRowHeight,
    setShowUnassigned,
    setMaximized,
    setMaximizedSplitRatio,
  } = uiActions

  const {
    setFolder: setSelectedFolder,
    setActor: setSelectedActor,
    toggleType: toggleFilterType,
    setSource: setFilterSource,
    toggleStarred,
  } = filterActions

  useEffect(() => {
    if (!hydrated) return
    if (typeof window === 'undefined') return

    const persisted = window.localStorage.getItem('media-browser:ui-state')
    if (!persisted && !selectedFolder && !selectedActor && !showUnassigned) {
      setShowUnassigned(true)
      setViewTab('folders')
    }
  }, [hydrated, selectedFolder, selectedActor, showUnassigned, setShowUnassigned, setViewTab])

  const [addUrlDialogOpen, setAddUrlDialogOpen] = useState(false)
  const [downloadUrlDialogOpen, setDownloadUrlDialogOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([])
  // 拖拽操作
  const {
    draggedFile,
    dragOverFolder,
    dragOverActor,
    handleDragStart,
    handleDragEnd,
    handleDragOverFolder,
    handleDragOverActor,
    handleDragLeave,
    handleDropToFolder,
    handleDropToActor,
  } = useDragAndDrop({
    onDropToFolder: async (fileId, folderId) => {
      await moveFileToFolderMutation.mutateAsync({ fileId, folderId })
    },
    onDropToActor: async (fileId, actorId) => {
      await moveFileToActorMutation.mutateAsync({ fileId, actorId })
    },
  })
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [createActorDialogOpen, setCreateActorDialogOpen] = useState(false)
  const [addLocalPathDialogOpen, setAddLocalPathDialogOpen] = useState(false)

  // 演员资料编辑状态
  const [editingActorName, setEditingActorName] = useState(false)
  const [editingActorBio, setEditingActorBio] = useState(false)
  const [editingActorVoiceId, setEditingActorVoiceId] = useState(false)
  const [tempActorName, setTempActorName] = useState('')
  const [tempActorBio, setTempActorBio] = useState('')
  const [tempActorVoiceId, setTempActorVoiceId] = useState('')
  const [tempActorAvatarUrl, setTempActorAvatarUrl] = useState('')
  const [showAvatarUrlDialog, setShowAvatarUrlDialog] = useState(false)
  const [tempActorReferenceImageUrl, setTempActorReferenceImageUrl] = useState('')
  const [showReferenceImageUrlDialog, setShowReferenceImageUrlDialog] = useState(false)


  // 文件夹编辑状态
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [tempFolderName, setTempFolderName] = useState('')
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null)

  // 文件详情面板状态
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<MediaFile | null>(null)
  const [videoTrimModalOpen, setVideoTrimModalOpen] = useState(false)
  const [videoFileForTrim, setVideoFileForTrim] = useState<MediaFile | null>(null)

  // 批量操作
  const {
    bulkSelectionMode,
    selectedFileIds,
    showBulkFolderSelector,
    showBulkActorSelector,
    toggleBulkSelection,
    selectAllFiles,
    clearSelection,
    exitBulkMode,
    enterBulkMode,
    setBulkSelectionMode,
    setShowBulkFolderSelector,
    setShowBulkActorSelector,
  } = useBulkOperations()

  // Inline editing state for list view
  const [editingInlineFileId, setEditingInlineFileId] = useState<string | null>(null)
  const [tempInlineRemark, setTempInlineRemark] = useState('')

  // 拖拽文件上传状态
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const dragCounterRef = useRef(0)

  // 空格键快捷键：预览选中的文件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略在输入框、文本域中的按键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // 空格键：预览当前选中的文件
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (selectedFileForDetails && !previewFile) {
          setPreviewFile(selectedFileForDetails)
        }
      }

      // Escape键：关闭预览
      if (e.key === 'Escape') {
        if (previewFile) {
          e.preventDefault()
          setPreviewFile(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedFileForDetails, previewFile])

  // ===== Use Custom Hooks =====
  const {
    filesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetchFiles,
    allFilesData,
    unassignedFilesData,
    folders,
    refetchFolders,
    actors,
    refetchActors,
  } = useMediaQueries({
    viewTab,
    selectedFolder,
    selectedActor,
    showUnassigned,
    filterSource,
    filterStarred,
    leftSidebarCollapsed,
  })

  // ===== Stage 5: Infinite Scroll Listener =====
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    if (!hasNextPage || isFetchingNextPage) return // Don't set up listener if no more pages or already fetching

    let timeoutId: NodeJS.Timeout | null = null
    let isRequesting = false

    const handleScroll = () => {
      // Skip if already requesting
      if (isRequesting || isFetchingNextPage) return

      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Debounce scroll events
      timeoutId = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = container
        // Trigger fetch when user scrolls near bottom (within 800px)
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)

        if (distanceFromBottom < 800 && hasNextPage && !isRequesting) {
          isRequesting = true
          void fetchNextPage().finally(() => {
            isRequesting = false
          })
        }
      }, 150) // 150ms debounce
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Mutations
  const {
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
    createFolderMutation,
    updateFolderMutation,
    deleteFolderMutation,
    createActorMutation,
    updateActorMutation,
  } = useMediaMutations({
    onFilesChange: refetchFiles,
    onFoldersChange: refetchFolders,
    onActorsChange: refetchActors,
    onFileDetailsUpdate: (file) => {
      if (selectedFileForDetails?.id === file.id) {
        setSelectedFileForDetails(file)
      }
    },
  })

  const [isRotating, setIsRotating] = useState(false)

  // 旋转视频
  const handleRotateVideo = async (fileId: string) => {
    if (!confirm('确定要将视频向右旋转90度吗？此操作会覆盖原文件，无法撤销。')) {
      return
    }

    try {
      setIsRotating(true)
      const response = await fetch('/api/admin/media/rotate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      })

      if (!response.ok) {
        throw new Error('视频旋转失败')
      }

      const result = await response.json()

      if (result.success) {
        alert('视频旋转成功！')
        refetchFiles()
        // 刷新详情页
        if (selectedFileForDetails) {
          const updatedFile = await fetch(`/api/admin/media/${fileId}`).then(r => r.json())
          if (updatedFile) {
            setSelectedFileForDetails(updatedFile)
          }
        }
      } else {
        alert(`旋转失败: ${result.error}`)
      }
    } catch (error) {
      console.error('视频旋转错误:', error)
      alert('视频旋转失败，请重试')
    } finally {
      setIsRotating(false)
    }
  }

  // 获取当前选中的演员信息
  const selectedActorData = actors?.find((a) => a.id === selectedActor)

  /**
   * Memoize files data to prevent unnecessary re-renders
   * Only recalculates when the actual file data changes
   * Deduplicate files by ID to prevent duplicate keys in infinite scroll
   * Filter by selected types
   */
  const memoizedFiles = useMemo(() => {
    const files = filesData?.files ?? []
    // Deduplicate by ID and filter by selected types
    const seen = new Set<string>()
    return files.filter(file => {
      if (seen.has(file.id)) {
        return false
      }
      seen.add(file.id)
      // 根据filterTypes过滤
      return filterTypes.includes(file.type as 'IMAGE' | 'VIDEO' | 'AUDIO')
    })
  }, [filesData?.files, filterTypes])

  // 标星文件（用于最大化分屏模式）
  const starredFiles = useMemo(() => {
    return memoizedFiles.filter(file => file.starred)
  }, [memoizedFiles])

  // 批量操作相关函数 - 适配新的 hook
  const handleSelectAllFiles = useCallback(() => {
    selectAllFiles(memoizedFiles)
  }, [memoizedFiles, selectAllFiles])


  // 处理创建文件夹
  // 适配新的 CreateFolderDialog 组件
  const handleCreateFolder = async (name: string) => {
    await createFolderMutation.mutateAsync({ name })
  }

  // 处理文件夹名称编辑
  const handleFolderNameEdit = async (folderId: string) => {
    if (!tempFolderName.trim()) {
      alert('请输入文件夹名称')
      return
    }

    // 检查是否与其他文件夹重名
    const duplicate = folders?.find((f) => f.id !== folderId && f.name === tempFolderName.trim())
    if (duplicate) {
      alert('文件夹名称已存在，请使用其他名称')
      return
    }

    try {
      await updateFolderMutation.mutateAsync({
        id: folderId,
        name: tempFolderName.trim(),
      })
      setEditingFolderId(null)
    } catch (error) {
      console.error('Update folder name failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Unique constraint')) {
        alert('文件夹名称已存在，请使用其他名称')
      } else {
        alert(`更新文件夹名称失败: ${errorMessage}`)
      }
    }
  }

  // 处理删除文件夹
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    const folder = folders?.find((f) => f.id === folderId)
    const fileCount = (folder as any)?._count?.files || 0

    if (fileCount > 0) {
      const confirmed = confirm(
        `文件夹"${folderName}"中还有 ${fileCount} 个文件。删除文件夹不会删除这些文件，它们将变为未归属文件。确定要删除吗？`
      )
      if (!confirmed) return
    } else {
      const confirmed = confirm(`确定要删除文件夹"${folderName}"吗？`)
      if (!confirmed) return
    }

    try {
      await deleteFolderMutation.mutateAsync({ id: folderId })
      // 如果当前选中的是被删除的文件夹，切换到 All
      if (selectedFolder === folderId) {
        setSelectedFolder(undefined)
        setShowUnassigned(false)
      }
    } catch (error) {
      console.error('Delete folder failed:', error)
      alert('删除文件夹失败')
    }
  }

  // 处理创建演员
  // 适配新的 CreateActorDialog 组件
  const handleCreateActor = async (name: string) => {
    await createActorMutation.mutateAsync({ name })
  }

  // 处理演员名称编辑
  const handleActorNameEdit = async () => {
    if (!selectedActor || !tempActorName.trim()) return

    // 检查是否与其他演员重名
    const duplicate = actors?.find((a) => a.id !== selectedActor && a.name === tempActorName.trim())
    if (duplicate) {
      alert('演员名称已存在，请使用其他名称')
      return
    }

    try {
      await updateActorMutation.mutateAsync({
        id: selectedActor,
        name: tempActorName.trim(),
      })
      setEditingActorName(false)
    } catch (error) {
      console.error('Update actor name failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Unique constraint')) {
        alert('演员名称已存在，请使用其他名称')
      } else {
        alert(`更新演员名称失败: ${errorMessage}`)
      }
    }
  }

  // 处理演员简介编辑
  const handleActorBioEdit = async () => {
    if (!selectedActor) return

    try {
      await updateActorMutation.mutateAsync({
        id: selectedActor,
        bio: tempActorBio.trim() || undefined,
      })
      setEditingActorBio(false)
    } catch (error) {
      console.error('Update actor bio failed:', error)
      alert('更新演员简介失败')
    }
  }

  // 处理演员Voice ID编辑
  const handleActorVoiceIdEdit = async () => {
    if (!selectedActor) return

    try {
      await updateActorMutation.mutateAsync({
        id: selectedActor,
        voiceId: tempActorVoiceId.trim() || undefined,
      })
      setEditingActorVoiceId(false)
    } catch (error) {
      console.error('Update actor voice ID failed:', error)
      alert('更新演员Voice ID失败')
    }
  }

  // 处理演员头像更新
  const handleActorAvatarUpdate = async () => {
    if (!selectedActor) return

    try {
      await updateActorMutation.mutateAsync({
        id: selectedActor,
        avatarUrl: tempActorAvatarUrl.trim() || undefined,
      })
      setShowAvatarUrlDialog(false)
      setTempActorAvatarUrl('')
    } catch (error) {
      console.error('Update actor avatar failed:', error)
      alert('更新演员头像失败')
    }
  }

  // 处理演员形象参考图更新
  const handleActorReferenceImageUpdate = async () => {
    if (!selectedActor) return

    try {
      await updateActorMutation.mutateAsync({
        id: selectedActor,
        referenceImageUrl: tempActorReferenceImageUrl.trim() || undefined,
      })
      setShowReferenceImageUrlDialog(false)
      setTempActorReferenceImageUrl('')
    } catch (error) {
      console.error('Update actor reference image failed:', error)
      alert('更新演员形象参考图失败')
    }
  }


  // 处理列表内联备注编辑
  const handleInlineRemarkEdit = async (fileId: string) => {
    try {
      await updateFileMutation.mutateAsync({
        id: fileId,
        remark: tempInlineRemark.trim() || null,
      })
      setEditingInlineFileId(null)
      void refetchFiles()
    } catch (error) {
      console.error('Update file remark failed:', error)
      alert('更新备注失败')
    }
  }

  // 处理复制到剪贴板
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('已复制到剪贴板')
    } catch (error) {
      console.error('Copy to clipboard failed:', error)
      alert('复制失败')
    }
  }

  // 处理下载文件
  const handleDownloadFile = (file: MediaFile) => {
    const downloadUrl = file.localPath
      ? `/api/media-file/${file.localPath.replace('data/media-uploads/', '')}`
      : file.sourceUrl

    if (downloadUrl) {
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = file.name
      link.click()
    }
  }

  // 处理添加本地文件路径
  // 适配新的 AddLocalPathDialog 组件
  const handleAddLocalPaths = async (tasks: UploadTask[]) => {
    setUploadTasks(tasks)

    for (const task of tasks) {
      const filePath = task.url!
      const fileName = task.name

      // 推断 MIME 类型
      const ext = fileName.split('.').pop()?.toLowerCase()
      const mimeType =
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        ext === 'png' ? 'image/png' :
        ext === 'gif' ? 'image/gif' :
        ext === 'webp' ? 'image/webp' :
        ext === 'mp4' ? 'video/mp4' :
        ext === 'webm' ? 'video/webm' :
        ext === 'mov' ? 'video/quicktime' :
        ext === 'mp3' ? 'audio/mpeg' :
        ext === 'wav' ? 'audio/wav' :
        ext === 'ogg' ? 'audio/ogg' :
        'application/octet-stream'

      try {
        const result = await addLocalReferenceMutation.mutateAsync({
          filePath,
          fileName,
          mimeType,
          folderId: viewTab === 'folders' ? selectedFolder : undefined,
        })

        if (!result.success && result.isDuplicate) {
          setUploadTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, status: 'success', isDuplicate: true, error: result.error }
                : t
            )
          )
          setTimeout(() => {
            setUploadTasks((prev) => prev.filter((t) => t.id !== task.id))
          }, 3000)
          continue
        }

        setUploadTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'success' } : t))
        )

        refetchFiles()

        setTimeout(() => {
          setUploadTasks((prev) => prev.filter((t) => t.id !== task.id))
        }, 3000)
      } catch (error) {
        console.error('Error adding local reference:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)

        setUploadTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: 'error', error: errorMessage }
              : t
          )
        )
      }
    }
  }

  // 处理下载 URL 到媒体浏览器
  const handleDownloadUrl = async (
    url: string,
    downloadType: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH',
    folderId?: string | null
  ) => {
    try {
      const response = await fetch('/api/admin/media/download-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          downloadType,
          folderId,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || '创建下载任务失败')
      }

      alert(`下载任务已创建！\n任务ID: ${result.data.taskId}\n${result.data.message}\n\n下载完成后文件将自动添加到媒体浏览器。`)
    } catch (error: any) {
      console.error('Download URL error:', error)
      throw error
    }
  }

  // 处理添加 URL
  // 适配新的 AddUrlDialog 组件
  const handleAddUrls = async (tasks: UploadTask[]) => {
    setUploadTasks(tasks)
    
    const urls = tasks.map(t => t.url!)

    try {
      const result = await addUrlsMutation.mutateAsync({
        urls,
        folderId: viewTab === 'folders' ? selectedFolder : undefined
      })

      setUploadTasks((prev) =>
        prev.map((task) => {
          const urlResult = result.results.find((r) => r.url === task.url)
          if (urlResult) {
            return {
              ...task,
              status: urlResult.success ? 'success' : 'error',
              error: urlResult.error,
              isDuplicate: urlResult.isDuplicate,
            }
          }
          return task
        })
      )

      refetchFiles()

      setTimeout(() => {
        setUploadTasks((prev) => prev.filter((t) => t.status !== 'success'))
      }, 3000)
    } catch (error) {
      console.error('Add URLs error:', error)
      setUploadTasks((prev) =>
        prev.map((task) => ({
          ...task,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        }))
      )
    }
  }

  // 处理文件上传的通用逻辑
  const processFilesUpload = useCallback(async (fileArray: File[]) => {
    const tasks: UploadTask[] = fileArray.map((file) => ({
      id: `local-${Date.now()}-${Math.random()}`,
      name: file.name,
      status: 'pending',
      fileName: file.name,
      mimeType: file.type,
    }))
    setUploadTasks((prev) => [...prev, ...tasks])

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      const task = tasks[i]

      if (!file || !task) continue

      try {
        setUploadTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading' } : t))
        )

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const base64 = e.target?.result as string
            resolve(base64.split(',')[1] || '')
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        const result = await uploadLocalMutation.mutateAsync({
          fileData: base64Data,
          fileName: file.name,
          mimeType: file.type,
          folderId: viewTab === 'folders' ? selectedFolder : undefined,
        })

        if (!result.success && result.isDuplicate) {
          setUploadTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, status: 'success', isDuplicate: true, error: result.error }
                : t
            )
          )
          setTimeout(() => {
            setUploadTasks((prev) => prev.filter((t) => t.id !== task.id))
          }, 3000)
          continue
        }

        setUploadTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'success' } : t))
        )

        refetchFiles()

        setTimeout(() => {
          setUploadTasks((prev) => prev.filter((t) => t.id !== task.id))
        }, 3000)
      } catch (error) {
        console.error('Error uploading file:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)

        setUploadTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: 'error',
                  error: errorMessage,
                  isDuplicate: false,
                  fileData: undefined,
                }
              : t
          )
        )
      }
    }
  }, [uploadLocalMutation, viewTab, selectedFolder, refetchFiles])

  // 处理本地文件选择上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    await processFilesUpload(fileArray)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 处理拖拽文件上传
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current++
    
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDraggingFiles(true)
    }
  }, [])

  const handleDragLeaveGlobal = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current--
    
    if (dragCounterRef.current === 0) {
      setIsDraggingFiles(false)
    }
  }, [])

  const handleDragOverGlobal = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDropGlobal = useCallback(async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current = 0
    setIsDraggingFiles(false)
    
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return
    
    const fileArray = Array.from(files).filter(file => {
      return file.type.startsWith('image/') || 
             file.type.startsWith('video/') || 
             file.type.startsWith('audio/')
    })
    
    if (fileArray.length > 0) {
      await processFilesUpload(fileArray)
    }
  }, [processFilesUpload])

  // 添加全局拖拽事件监听器
  useEffect(() => {
    const handleDragEnterEvent = (e: DragEvent) => handleDragEnter(e)
    const handleDragLeaveEvent = (e: DragEvent) => handleDragLeaveGlobal(e)
    const handleDragOverEvent = (e: DragEvent) => handleDragOverGlobal(e)
    const handleDropEvent = (e: DragEvent) => handleDropGlobal(e)

    window.addEventListener('dragenter', handleDragEnterEvent)
    window.addEventListener('dragleave', handleDragLeaveEvent)
    window.addEventListener('dragover', handleDragOverEvent)
    window.addEventListener('drop', handleDropEvent)

    return () => {
      window.removeEventListener('dragenter', handleDragEnterEvent)
      window.removeEventListener('dragleave', handleDragLeaveEvent)
      window.removeEventListener('dragover', handleDragOverEvent)
      window.removeEventListener('drop', handleDropEvent)
    }
  }, [handleDragEnter, handleDragLeaveGlobal, handleDragOverGlobal, handleDropGlobal])

  // 处理导出
  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync()
      window.open(result.downloadPath, '_blank')
    } catch (error) {
      alert(`导出失败: ${error}`)
    }
  }

  // 获取媒体图标
  const getMediaIcon = useCallback((type: string) => {
    switch (type) {
      case 'IMAGE':
        return <Image className="h-5 w-5" />
      case 'VIDEO':
        return <Video className="h-5 w-5" />
      case 'AUDIO':
        return <Music className="h-5 w-5" />
      default:
        return null
    }
  }, [])

  // 检查文件是否为GIF
  const isGif = useCallback((file: MediaFile) => {
    if (file.type !== 'IMAGE') return false
    return file.mimeType === 'image/gif' ||
           file.name?.toLowerCase().endsWith('.gif') ||
           file.sourceUrl?.toLowerCase().includes('.gif')
  }, [])

  // 获取缩略图URL（用于列表显示）
  const getThumbnailUrl = useCallback((file: MediaFile) => {
    if (file.type === 'AUDIO') return null

    // 优先使用生成的缩略图（包括远程URL的缩略图）
    if (file.thumbnailPath) {
      const thumbnailPath = file.thumbnailPath.replace('data/media-thumbnails/', '')
      return `/api/media-thumbnail/${thumbnailPath}`
    }

    // 本地引用文件，直接使用文件路径
    if (file.source === 'LOCAL_REF') return `/api/media-ref/${file.id}`

    // 本地上传文件，使用本地路径
    if (file.localPath) {
      const localPath = file.localPath.replace('data/media-uploads/', '')
      return `/api/media-file/${localPath}`
    }

    // 如果没有缩略图且没有本地路径，返回 null
    // 远程 URL 图片/视频需要等待缩略图生成完成
    return null
  }, [])

  // 获取原始图片URL（用于预览显示）
  const getOriginalImageUrl = useCallback((file: MediaFile) => {
    if (file.type === 'AUDIO') return null

    if (file.source === 'LOCAL_REF') return `/api/media-ref/${file.id}`
    if (file.localPath) {
      const localPath = file.localPath.replace('data/media-uploads/', '')
      return `/api/media-file/${localPath}`
    }
    if (file.sourceUrl && file.source === 'URL') return file.sourceUrl
    if (file.thumbnailPath) {
      const thumbnailPath = file.thumbnailPath.replace('data/media-thumbnails/', '')
      return `/api/media-thumbnail/${thumbnailPath}`
    }
    return null
  }, [])

  // 获取视频URL（用于悬停预览）
  const getVideoUrl = useCallback((file: MediaFile) => {
    if (file.type !== 'VIDEO') return null

    if (file.source === 'LOCAL_REF') return `/api/media-ref/${file.id}`
    if (file.localPath && file.localPath.trim()) {
      const localPath = file.localPath.replace('data/media-uploads/', '')
      return `/api/media-file/${localPath}`
    }
    if (file.sourceUrl && file.sourceUrl.trim() && file.source === 'URL') return file.sourceUrl
    return null
  }, [])

  // 获取GIF原始URL（用于hover时播放动画）
  const getGifUrl = useCallback((file: MediaFile) => {
    if (!isGif(file)) return null

    if (file.source === 'LOCAL_REF') return `/api/media-ref/${file.id}`
    if (file.localPath && file.localPath.trim()) {
      const localPath = file.localPath.replace('data/media-uploads/', '')
      return `/api/media-file/${localPath}`
    }
    if (file.sourceUrl && file.sourceUrl.trim() && file.source === 'URL') return file.sourceUrl
    return null
  }, [isGif])

  // ===== Stage 2: useMemo for Derived Data =====

  /**
   * Memoize grid column width calculation
   * Prevents recalculation on every render
   */
  const memoizedColumnWidth = useMemo(() => {
    return columnWidth
  }, [columnWidth])

  /**
   * Memoize unassigned files data
   * TODO: Use this when implementing virtual scrolling
   */
  // const memoizedUnassignedFiles = useMemo(() => {
  //   return unassignedFilesData?.files ?? []
  // }, [unassignedFilesData?.files])

  /**
   * Memoize total file count for performance
   * TODO: Use this for pagination display
   */
  // const memoizedTotalCount = useMemo(() => {
  //   return filesData?.total ?? 0
  // }, [filesData?.total])

  /**
   * Memoize file selection state checker
   * TODO: Use this to optimize multi-file selection rendering
   */
  // const isFileSelected = useCallback((fileId: string) => {
  //   return selectedFiles.includes(fileId)
  // }, [selectedFiles])

  /**
   * Memoize upload progress calculation
   * Prevents recalculating on every render
   */
  const uploadProgress = useMemo(() => {
    const total = uploadTasks.length
    const completed = uploadTasks.filter(t => t.status === 'success').length
    return { total, completed }
  }, [uploadTasks])

  /**
   * Calculate number of columns for grid based on container width
   * Assumes container is roughly 70% of viewport width
   */
  // Measure actual container width using state
  const [containerWidth, setContainerWidth] = useState(1200)

  // Update container width when scroll container mounts or resizes
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const updateWidth = () => {
      const width = container.clientWidth
      setContainerWidth(width)
    }

    // Initial measurement
    updateWidth()

    // Observe resize changes
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const gridColumns = useMemo(() => {
    // Calculate how many columns fit in the actual container width
    const cols = Math.max(1, Math.floor((containerWidth - 32) / (memoizedColumnWidth + 16))) // -32 for container padding, +16 for gap
    return cols
  }, [containerWidth, memoizedColumnWidth])

  // 标星文件的 justified rows（放在containerWidth之后）
  const starredJustifiedRows = useMemo(() => {
    const rows: MediaFile[][] = []
    let currentRow: MediaFile[] = []
    let currentRowWidth = 0

    starredFiles.forEach((file, index) => {
      const aspectRatio = file.width && file.height ? file.width / file.height : 1
      const scaledWidth = justifiedRowHeight * aspectRatio
      
      if (currentRowWidth + scaledWidth > containerWidth && currentRow.length > 0) {
        rows.push(currentRow)
        currentRow = [file]
        currentRowWidth = scaledWidth
      } else {
        currentRow.push(file)
        currentRowWidth += scaledWidth
      }

      if (index === starredFiles.length - 1 && currentRow.length > 0) {
        rows.push(currentRow)
      }
    })

    return rows
  }, [starredFiles, justifiedRowHeight, containerWidth])

  // ===== Stage 3: Virtual Scrolling =====

  /**
   * Calculate image height based on aspect ratio for masonry layout
   * Falls back to square if dimensions are not available
   * Limits aspect ratio to 1:20 (wide) to 20:1 (tall)
   */
  const getImageHeight = useCallback((file: MediaFile) => {
    // Audio files: use half height
    if (file.type === 'AUDIO') {
      return Math.round(memoizedColumnWidth / 2)
    }

    // Use width and height if available
    if (file.width && file.height) {
      const aspectRatio = file.height / file.width

      // Clamp aspect ratio to 1:20 (0.05) to 20:1 (20)
      const clampedAspectRatio = Math.min(Math.max(aspectRatio, 0.05), 20)

      return Math.round(memoizedColumnWidth * clampedAspectRatio)
    }

    // Default to square aspect ratio
    return memoizedColumnWidth
  }, [memoizedColumnWidth])

  /**
   * Masonry layout: Distribute files into columns
   * Each column stacks items independently for true waterfall effect
   */
  const masonryColumns = useMemo(() => {
    const columns: MediaFile[][] = Array.from({ length: gridColumns }, () => [])
    const columnHeights: number[] = Array(gridColumns).fill(0)

    // Distribute files to the shortest column
    memoizedFiles.forEach((file) => {
      const imageHeight = file.width && file.height
        ? Math.round(memoizedColumnWidth * (file.height / file.width))
        : memoizedColumnWidth

      const itemHeight = compactMode ? imageHeight : imageHeight + 100

      // Find the shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))

      // Add file to shortest column
      columns[shortestColumnIndex]!.push(file)
      columnHeights[shortestColumnIndex] += itemHeight + 16 // +16 for gap
    })

    return columns
  }, [memoizedFiles, gridColumns, memoizedColumnWidth, compactMode])

  /**
   * Justified layout (木桶布局): Fixed height, adaptive width
   * 计算每行的图片宽度，使其高度一致
   */
  const justifiedRows = useMemo(() => {
    const rows: MediaFile[][] = []
    let currentRow: MediaFile[] = []
    let currentRowWidth = 0
    const targetHeight = justifiedRowHeight
    const gap = 8 // gap between items
    const availWidth = containerWidth - 48 // Subtract padding

    memoizedFiles.forEach((file, index) => {
      // 计算此文件在目标高度下的宽度
      const aspectRatio = file.width && file.height ? file.width / file.height : 1
      const itemWidth = Math.round(targetHeight * aspectRatio)

      // 尝试添加到当前行
      const potentialWidth = currentRowWidth + itemWidth + (currentRow.length > 0 ? gap : 0)

      // 如果加入后超过容器宽度，或者是最后一个元素
      if (potentialWidth > availWidth && currentRow.length > 0) {
        // 结束当前行
        rows.push([...currentRow])
        currentRow = [file]
        currentRowWidth = itemWidth
      } else {
        currentRow.push(file)
        currentRowWidth = potentialWidth
      }

      // 如果是最后一个元素，添加当前行
      if (index === memoizedFiles.length - 1 && currentRow.length > 0) {
        rows.push(currentRow)
      }
    })

    return rows
  }, [memoizedFiles, justifiedRowHeight, containerWidth])

  // 渲染MediaGrid的辅助函数（可重用于分屏）
  const renderMediaGrid = useCallback((
    files: MediaFile[],
    justifiedRowsOverride?: MediaFile[][],
    columnsOverride?: MediaFile[][],
    containerWidthOverride?: number
  ) => {
    if (files.length === 0) {
  return (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <Image className="h-12 w-12 text-neutral-400 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900">暂无媒体文件</h3>
            <p className="text-sm text-neutral-500 mt-1">
              点击「添加 URL」开始添加媒体文件
                </p>
              </div>
            </div>
      )
    }

    if (viewMode === 'grid') {
      return (
        <MasonryGrid
          files={files}
          columns={columnsOverride || masonryColumns}
          columnWidth={memoizedColumnWidth}
          maximized={maximized}
          compactMode={compactMode}
          bulkSelectionMode={bulkSelectionMode}
          selectedFileIds={selectedFileIds}
          draggedFileId={draggedFile}
          autoPlayAll={autoPlayAll}
          hoveredVideoId={hoveredVideoId}
          onFileClick={(file) => {
            setSelectedFileForDetails(file)
          }}
          onToggleSelection={toggleBulkSelection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onVideoHover={handleVideoHover}
          onRegenerateThumbnail={(fileId) => regenerateThumbnailMutation.mutate({ fileId })}
          onPreview={setPreviewFile}
          onInlineEdit={async (fileId, remark) => {
            await updateFileMutation.mutateAsync({
              id: fileId,
              remark: remark,
            })
          }}
          onToggleStarred={async (fileId, starred) => {
            await updateFileMutation.mutateAsync({
              id: fileId,
              starred: starred,
            })
          }}
          getThumbnailUrl={getThumbnailUrl}
          getVideoUrl={getVideoUrl}
          getGifUrl={getGifUrl}
          isGif={(file) => isGif(file) ?? false}
          getImageHeight={getImageHeight}
        />
      )
    } else if (viewMode === 'justified') {
      return (
        <JustifiedGrid
          rows={justifiedRowsOverride || justifiedRows}
          rowHeight={justifiedRowHeight}
          containerWidth={containerWidthOverride || containerWidth}
          maximized={maximized}
          compactMode={compactMode}
          bulkSelectionMode={bulkSelectionMode}
          selectedFileIds={selectedFileIds}
          draggedFileId={draggedFile}
          autoPlayAll={autoPlayAll}
          hoveredVideoId={hoveredVideoId}
          onFileClick={(file) => {
            setSelectedFileForDetails(file)
          }}
          onToggleSelection={toggleBulkSelection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onVideoHover={handleVideoHover}
          onRegenerateThumbnail={(fileId) => regenerateThumbnailMutation.mutate({ fileId })}
          onPreview={setPreviewFile}
          onInlineEdit={async (fileId, remark) => {
            await updateFileMutation.mutateAsync({
              id: fileId,
              remark: remark,
            })
          }}
          onToggleStarred={async (fileId, starred) => {
            await updateFileMutation.mutateAsync({
              id: fileId,
              starred: starred,
            })
          }}
          getThumbnailUrl={getThumbnailUrl}
          getVideoUrl={getVideoUrl}
          getGifUrl={getGifUrl}
          isGif={(file) => isGif(file) ?? false}
        />
      )
    }
    return null
  }, [viewMode, masonryColumns, memoizedColumnWidth, maximized, compactMode, bulkSelectionMode, selectedFileIds, draggedFile, autoPlayAll, hoveredVideoId, justifiedRows, justifiedRowHeight, containerWidth, setSelectedFileForDetails, toggleBulkSelection, handleDragStart, handleDragEnd, handleVideoHover, regenerateThumbnailMutation, setPreviewFile, updateFileMutation, getThumbnailUrl, getVideoUrl, getGifUrl, isGif, getImageHeight])

  return (
    <>
      {/* 拖拽文件上传提示覆盖层 */}
      <DragDropOverlay show={isDraggingFiles} />

      <div className={`flex h-full ${maximized ? 'fixed inset-0 z-50 bg-black overflow-hidden' : ''}`}>
      {/* Left Sidebar - Fixed */}
      {!maximized && (
      <div className={`shrink-0 flex flex-col border-r border-neutral-200 bg-neutral-50 overflow-y-auto transition-all duration-300 ${
        leftSidebarCollapsed ? 'w-12' : 'w-64'
      }`}>
        {/* Collapse/Expand Button */}
        <div className="border-b border-neutral-200">
          <button
            onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
            className="w-full h-12 flex items-center justify-center hover:bg-neutral-100 transition-colors"
            title={leftSidebarCollapsed ? '展开控制面板' : '收起控制面板'}
          >
            {leftSidebarCollapsed ? (
              <ChevronRight className="h-5 w-5 text-neutral-600" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-neutral-600" />
            )}
          </button>
        </div>

        {!leftSidebarCollapsed && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Action Buttons */}
          <div className="mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setAddUrlDialogOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
              >
                <Plus className="h-3.5 w-3.5" />
                加URL
              </button>
              <button
                onClick={() => setAddLocalPathDialogOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800"
              >
                <Folder className="h-3.5 w-3.5" />
                从本地
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLocalMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadLocalMutation.isPending ? '上传中' : '本地上传'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setDownloadUrlDialogOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-green-700 px-3 py-2 text-xs font-medium text-white hover:bg-green-600"
              >
                <Download className="h-3.5 w-3.5" />
                下载URL
              </button>
              <button
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {exportMutation.isPending ? '导出中' : '导出'}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            {/* Source Filter */}
            <div className="mb-4">
              {/* Source Filter */}
              <div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setFilterSource(undefined)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      filterSource === undefined
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterSource('LOCAL')}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      filterSource === 'LOCAL'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    本地
                  </button>
                  <button
                    onClick={() => setFilterSource('URL')}
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
            </div>

            {/* View Tabs */}
            <div className="mb-4 border-t border-neutral-200 pt-4">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    setViewTab('folders')
                    setSelectedActor(undefined)
                    // 重置编辑状态
                    setEditingActorName(false)
                    setEditingActorBio(false)
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
                    setViewTab('actors')
                    setSelectedFolder(undefined)
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

            {/* Folders View */}
            {viewTab === 'folders' && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1">
                    <Folder className="h-4 w-4" />
                    文件夹
                  </h3>
                  <button
                    onClick={() => setCreateFolderDialogOpen(true)}
                    className="text-neutral-600 hover:text-neutral-900"
                    title="添加文件夹"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setSelectedFolder(undefined)
                      setShowUnassigned(false)
                    }}
                    onDragOver={(e) => handleDragOverFolder(e, null)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropToFolder(e, null)}
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
                      ({allFilesData?.pagination.total || 0})
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedFolder(undefined)
                      setShowUnassigned(true)
                    }}
                    onDragOver={(e) => handleDragOverFolder(e, null)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropToFolder(e, null)}
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
                      ({unassignedFilesData?.pagination.total || 0})
                    </span>
                  </button>

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
                            setSelectedFolder(folder.id)
                            setShowUnassigned(false)
                          }}
                          onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDropToFolder(e, folder.id)}
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
                                ({(folder as any)._count?.files || 0})
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
            )}

            {/* Actors View */}
            {viewTab === 'actors' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1">
                    <User className="h-4 w-4" />
                    演员
                  </h3>
                  <button
                    onClick={() => setCreateActorDialogOpen(true)}
                    className="text-neutral-600 hover:text-neutral-900"
                    title="添加演员"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedActor(undefined)}
                    onDragOver={(e) => handleDragOverActor(e, null)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropToActor(e, null)}
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
                      ({allFilesData?.pagination.total || 0})
                    </span>
                  </button>

                  {actors?.map((actor) => (
                    <button
                      key={actor.id}
                      onClick={() => {
                        setSelectedActor(actor.id)
                        setTempActorName(actor.name)
                        setTempActorBio(actor.bio || '')
                        setTempActorVoiceId(actor.voiceId || '')
                        // 重置编辑状态
                        setEditingActorName(false)
                        setEditingActorBio(false)
                        setEditingActorVoiceId(false)
                      }}
                      onDragOver={(e) => handleDragOverActor(e, actor.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropToActor(e, actor.id)}
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
                        ({(actor as any)._count?.files || 0})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${maximized ? 'bg-black' : ''}`}>
        {/* Fixed Header - File count badge and column width slider */}
        {!maximized && (
        <div className="shrink-0 border-b border-neutral-200 bg-white px-6 py-2.5 flex items-center gap-4">
          <div className="flex items-center gap-2">
            {bulkSelectionMode ? (
              <>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  已选 {selectedFileIds.size} 个文件
                </span>
                <button
                  onClick={() => selectAllFiles(filesData?.files || [])}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  全选
                </button>
                <button
                  onClick={clearSelection}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  清空
                </button>
                <button
                  onClick={exitBulkMode}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  退出多选
                </button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                  共 {filesData?.pagination?.total || 0} 个文件
                </span>
                <button
                  onClick={() => refetchFiles()}
                  disabled={isRefetching}
                  className="p-1.5 rounded-md hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="刷新列表"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setBulkSelectionMode(true)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                >
                  多选
                </button>
              </>
            )}
            
            {/* View Mode Controls - 紧凑精致的视图控制 */}
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-neutral-200">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'justified' : 'grid')}
                className="p-1.5 rounded hover:bg-neutral-100 transition-colors text-neutral-600 hover:text-neutral-900"
                title={viewMode === 'grid' ? '切换到木桶布局' : '切换到瀑布流'}
              >
                {viewMode === 'grid' ? <List className="h-3.5 w-3.5" /> : <Grid3x3 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setAutoPlayAll(!autoPlayAll)}
                className={`p-1.5 rounded transition-colors ${
                  autoPlayAll
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
                title={autoPlayAll ? '退出全动态模式' : '全动态模式'}
              >
                <Play className="h-3.5 w-3.5" fill={autoPlayAll ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => setCompactMode(!compactMode)}
                className={`p-1.5 rounded transition-colors ${
                  compactMode
                    ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
                title={compactMode ? '退出紧凑模式' : '紧凑模式'}
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMaximized(!maximized)}
                className="p-1.5 rounded hover:bg-neutral-100 transition-colors text-neutral-600 hover:text-neutral-900"
                title="最大化"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {/* 标星筛选 */}
            <button
              onClick={() => toggleStarred()}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                filterStarred
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
              title={filterStarred ? '显示全部' : '只看标星'}
            >
              <Star className={`h-3.5 w-3.5 ${filterStarred ? 'fill-current' : ''}`} />
            </button>
            
            {/* 文件类型快捷筛选 */}
            <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleFilterType('IMAGE')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    filterTypes.includes('IMAGE')
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                  title={filterTypes.includes('IMAGE') ? '隐藏图片' : '显示图片'}
                >
                  <Image className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleFilterType('VIDEO')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    filterTypes.includes('VIDEO')
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                  title={filterTypes.includes('VIDEO') ? '隐藏视频' : '显示视频'}
                >
                  <Video className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleFilterType('AUDIO')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    filterTypes.includes('AUDIO')
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                  title={filterTypes.includes('AUDIO') ? '隐藏音频' : '显示音频'}
                >
                  <Music className="h-3.5 w-3.5" />
                </button>
              </div>

            {/* 列宽/行高调整 */}
            {viewMode === 'grid' && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="140"
                  max="420"
                  value={columnWidth}
                  onChange={(e) => setColumnWidth(Number(e.target.value))}
                  className="w-32 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                />
                <span className="text-xs text-neutral-500 w-12">{columnWidth}px</span>
              </div>
            )}
            {viewMode === 'justified' && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="150"
                  max="400"
                  value={justifiedRowHeight}
                  onChange={(e) => setJustifiedRowHeight(Number(e.target.value))}
                  className="w-32 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                />
                <span className="text-xs text-neutral-500 w-12">{justifiedRowHeight}px</span>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Scrollable Content Area */}
        <div ref={scrollContainerRef} className={`flex-1 ${maximized ? 'overflow-hidden' : 'overflow-y-auto px-6 py-4'}`}>
          {/* Media Grid/List */}
          {maximized ? (
            <MaximizedSplitView
              splitRatio={maximizedSplitRatio}
              onSplitRatioChange={setMaximizedSplitRatio}
              leftContent={(width) => {
                // 根据左侧容器宽度重新计算布局
                const cols = viewMode === 'grid'
                  ? Math.max(1, Math.floor((width - 4) / (memoizedColumnWidth + 16)))
                  : 0

                const leftColumns = viewMode === 'grid'
                  ? Array.from({ length: cols }, () => [] as MediaFile[])
                  : []

                if (viewMode === 'grid') {
                  memoizedFiles.forEach((file, index) => {
                    leftColumns[index % cols]?.push(file)
                  })
                }

                // 计算左侧的 justified rows
                const leftJustifiedRows: MediaFile[][] = []
                if (viewMode === 'justified') {
                  let currentRow: MediaFile[] = []
                  let currentRowWidth = 0

                  memoizedFiles.forEach((file) => {
                    const aspectRatio = file.width && file.height ? file.width / file.height : 1
                    const scaledWidth = justifiedRowHeight * aspectRatio

                    if (currentRowWidth + scaledWidth > width - 4 && currentRow.length > 0) {
                      leftJustifiedRows.push(currentRow)
                      currentRow = [file]
                      currentRowWidth = scaledWidth
                    } else {
                      currentRow.push(file)
                      currentRowWidth += scaledWidth
                    }
                  })

                  if (currentRow.length > 0) {
                    leftJustifiedRows.push(currentRow)
                  }
                }

                return renderMediaGrid(memoizedFiles, leftJustifiedRows, leftColumns, width)
              }}
              rightContent={(width) => {
                // 右侧始终使用单列全宽布局
                return (
                  <SingleColumnGrid
                    files={starredFiles}
                    containerWidth={width}
                    maximized={maximized}
                    compactMode={compactMode}
                    bulkSelectionMode={bulkSelectionMode}
                    selectedFileIds={selectedFileIds}
                    draggedFileId={draggedFile}
                    autoPlayAll={autoPlayAll}
                    hoveredVideoId={hoveredVideoId}
                    onFileClick={(file) => {
                      setSelectedFileForDetails(file)
                    }}
                    onToggleSelection={toggleBulkSelection}
                    onDragStart={(fileId) => handleDragStart({} as React.DragEvent, fileId)}
                    onDragEnd={handleDragEnd}
                    onVideoHover={handleVideoHover}
                    onRegenerateThumbnail={(fileId) => regenerateThumbnailMutation.mutate({ fileId })}
                    onPreview={setPreviewFile}
                    onToggleStarred={async (fileId, starred) => {
                      await updateFileMutation.mutateAsync({
                        id: fileId,
                        starred: starred,
                      })
                    }}
                    getThumbnailUrl={getThumbnailUrl}
                    getVideoUrl={getVideoUrl}
                    getGifUrl={getGifUrl}
                    isGif={(file) => isGif(file) ?? false}
                  />
                )
              }}
            />
          ) : (
          <div>
          {filesData?.files.length === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
              <div className="flex flex-col items-center justify-center">
                <Image className="h-12 w-12 text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900">暂无媒体文件</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  点击「添加 URL」开始添加媒体文件
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <MasonryGrid
              files={memoizedFiles}
              columns={masonryColumns}
              columnWidth={memoizedColumnWidth}
              maximized={maximized}
              compactMode={compactMode}
              bulkSelectionMode={bulkSelectionMode}
              selectedFileIds={selectedFileIds}
              draggedFileId={draggedFile}
              autoPlayAll={autoPlayAll}
              hoveredVideoId={hoveredVideoId}
              onFileClick={(file) => {
                setSelectedFileForDetails(file)
              }}
              onToggleSelection={toggleBulkSelection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onVideoHover={handleVideoHover}
              onRegenerateThumbnail={(fileId) => regenerateThumbnailMutation.mutate({ fileId })}
              onPreview={setPreviewFile}
              onInlineEdit={async (fileId, remark) => {
                await updateFileMutation.mutateAsync({
                  id: fileId,
                  remark: remark,
                })
              }}
              onToggleStarred={async (fileId, starred) => {
                console.log('[onToggleStarred] fileId:', fileId, 'starred:', starred)
                await updateFileMutation.mutateAsync({
                  id: fileId,
                  starred: starred,
                })
                console.log('[onToggleStarred] mutation completed')
              }}
              getThumbnailUrl={getThumbnailUrl}
              getVideoUrl={getVideoUrl}
              getGifUrl={getGifUrl}
              isGif={(file) => isGif(file) ?? false}
              getImageHeight={getImageHeight}
            />
        ) : viewMode === 'justified' ? (
            <JustifiedGrid
              rows={justifiedRows}
              rowHeight={justifiedRowHeight}
              containerWidth={containerWidth}
              maximized={maximized}
              compactMode={compactMode}
              bulkSelectionMode={bulkSelectionMode}
              selectedFileIds={selectedFileIds}
              draggedFileId={draggedFile}
              autoPlayAll={autoPlayAll}
              hoveredVideoId={hoveredVideoId}
              onFileClick={(file) => {
                setSelectedFileForDetails(file)
              }}
              onToggleSelection={toggleBulkSelection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onVideoHover={handleVideoHover}
              onRegenerateThumbnail={(fileId) => regenerateThumbnailMutation.mutate({ fileId })}
              onPreview={setPreviewFile}
              onInlineEdit={async (fileId, remark) => {
                await updateFileMutation.mutateAsync({
                  id: fileId,
                  remark: remark,
                })
              }}
              onToggleStarred={async (fileId, starred) => {
                await updateFileMutation.mutateAsync({
                  id: fileId,
                  starred: starred,
                })
              }}
              getThumbnailUrl={getThumbnailUrl}
              getVideoUrl={getVideoUrl}
              getGifUrl={getGifUrl}
              isGif={(file) => isGif(file) ?? false}
            />
          ) : null}
                                </div>
                              )}

          {/* Infinite Scroll Loading Indicator */}
          {isFetchingNextPage && viewMode === 'grid' && (
            <div className="flex gap-4 w-full items-start px-6">
              {Array.from({ length: gridColumns }).map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="flex flex-col gap-4"
                  style={{ width: `${memoizedColumnWidth}px` }}
                >
                  {/* 每列显示 2-3 个占位框，高度使用固定的变化模式 */}
                  {Array.from({ length: 2 + (colIndex % 2) }).map((_, itemIndex) => {
                    // 使用固定的高度变化模式，避免每次渲染都改变
                    const heightMultiplier = [0.8, 1.2, 1.0, 1.4][(colIndex + itemIndex) % 4]!
                    return (
                      <div
                        key={itemIndex}
                        className="rounded-lg border border-neutral-200 bg-neutral-50 animate-pulse"
                        style={{
                          height: `${memoizedColumnWidth * heightMultiplier}px`
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          )}
          {isFetchingNextPage && viewMode === 'justified' && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              <span className="ml-2 text-sm text-neutral-500">加载更多...</span>
            </div>
          )}

          {/* End of List Indicator */}
          {!maximized && !hasNextPage && filesData && filesData.files.length > 0 && (
            <div className="text-center py-8 text-sm text-neutral-400">
              已加载全部 {filesData.total} 个文件
            </div>
          )}
          </div>
        </div>
        
        {/* Maximized Mode Bottom Toolbar */}
        {maximized && (
          <div className="absolute bottom-0 left-0 right-0 h-24 z-[60] group">
            {/* Toolbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/66 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 flex items-center gap-4 shadow-2xl transition-transform duration-300 translate-y-28 group-hover:translate-y-0">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'justified' : 'grid')}
              className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              title={viewMode === 'grid' ? '切换到木桶布局' : '切换到瀑布流'}
            >
              {viewMode === 'grid' ? <List className="h-3.5 w-3.5" /> : <Grid3x3 className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setAutoPlayAll(!autoPlayAll)}
              className={`p-1.5 rounded transition-colors ${
                autoPlayAll
                  ? 'bg-green-600/80 text-white hover:bg-green-600'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              title={autoPlayAll ? '退出全动态模式' : '全动态模式'}
            >
              <Play className="h-3.5 w-3.5" fill={autoPlayAll ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={`p-1.5 rounded transition-colors ${
                compactMode
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              title={compactMode ? '退出紧凑模式' : '紧凑模式'}
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>

            <div className="w-px h-4 bg-white/20 mx-1" />

            {viewMode === 'grid' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">宽度</span>
                <input
                  type="range"
                  min="140"
                  max="420"
                  value={columnWidth}
                  onChange={(e) => setColumnWidth(Number(e.target.value))}
                  className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <span className="text-xs text-white/70 w-10">{columnWidth}px</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">高度</span>
                <input
                  type="range"
                  min="150"
                  max="400"
                  value={justifiedRowHeight}
                  onChange={(e) => setJustifiedRowHeight(Number(e.target.value))}
                  className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <span className="text-xs text-white/70 w-10">{justifiedRowHeight}px</span>
              </div>
            )}

            <div className="w-px h-4 bg-white/20 mx-1" />

            <button
              onClick={() => setMaximized(false)}
              className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              title="退出最大化"
            >
              <X className="h-4 w-4" />
            </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Actor Profile (only show when actor is selected) - Fixed positioning overlay */}
      {!maximized && viewTab === 'actors' && selectedActor && selectedActorData && (
        <div className="fixed right-0 top-0 bottom-0 z-40 shadow-2xl" style={{ width: actorPanelCollapsed ? '48px' : '320px' }}>
          <div className="h-full flex flex-col border-l border-neutral-200 bg-white overflow-y-auto transition-all duration-300">
          {/* Collapse/Expand Button */}
          <div className="border-b border-neutral-200">
            <button
              onClick={() => setActorPanelCollapsed(!actorPanelCollapsed)}
              className="w-full h-12 flex items-center justify-center hover:bg-neutral-50 transition-colors"
              title={actorPanelCollapsed ? '展开演员信息' : '收起演员信息'}
            >
              {actorPanelCollapsed ? (
                <ChevronLeft className="h-5 w-5 text-neutral-600" />
              ) : (
                <ChevronRight className="h-5 w-5 text-neutral-600" />
              )}
            </button>
          </div>

          {/* Actor Info - Hidden when collapsed */}
          {!actorPanelCollapsed && (
            <div className="p-6">
            {/* Actor Avatar - Compact */}
            <div className="mb-4">
              <div
                className="w-32 h-32 mx-auto rounded-lg bg-neutral-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setTempActorAvatarUrl(selectedActorData.avatarUrl || '')
                  setShowAvatarUrlDialog(true)
                }}
              >
                {selectedActorData.avatarUrl ? (
                  <img
                    src={selectedActorData.avatarUrl}
                    alt={`${selectedActorData.name}的头像`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-400">
                    <User className="h-12 w-12" />
                    <span className="text-xs">点击添加头像</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actor Reference Image - 16:9 aspect ratio */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">形象参考图</label>
              <div
                className="w-full rounded-lg bg-neutral-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                style={{ aspectRatio: '16 / 9' }}
                onClick={() => {
                  setTempActorReferenceImageUrl(selectedActorData.referenceImageUrl || '')
                  setShowReferenceImageUrlDialog(true)
                }}
              >
                {selectedActorData.referenceImageUrl ? (
                  <img
                    src={selectedActorData.referenceImageUrl}
                    alt={`${selectedActorData.name}的形象参考图`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-400">
                    <User className="h-12 w-12" />
                    <span className="text-sm">点击添加形象参考图</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actor Name */}
            <div className="mb-4">
              {editingActorName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempActorName}
                    onChange={(e) => setTempActorName(e.target.value)}
                    onBlur={handleActorNameEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleActorNameEdit()
                      if (e.key === 'Escape') setEditingActorName(false)
                    }}
                    autoFocus
                    className="flex-1 px-2 py-1 text-lg font-semibold border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                  <button
                    onClick={handleActorNameEdit}
                    className="p-1 text-green-600 hover:text-green-700"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => setEditingActorName(true)}
                >
                  <h2 className="text-lg font-semibold">{selectedActorData.name}</h2>
                  <Edit2 className="h-4 w-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            {/* Actor Bio */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                个性与背景
              </label>
              {editingActorBio ? (
                <div>
                  <textarea
                    value={tempActorBio}
                    onChange={(e) => setTempActorBio(e.target.value)}
                    onBlur={handleActorBioEdit}
                    placeholder="添加演员个性与背景..."
                    autoFocus
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>
              ) : (
                <div
                  className="min-h-[60px] px-3 py-2 text-sm text-neutral-700 bg-neutral-50 rounded cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => setEditingActorBio(true)}
                >
                  {selectedActorData.bio || (
                    <span className="text-neutral-400">点击添加个性与背景...</span>
                  )}
                </div>
              )}
            </div>

            {/* Actor Voice ID */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                Voice ID (ElevenLabs)
              </label>
              {editingActorVoiceId ? (
                <div>
                  <input
                    type="text"
                    value={tempActorVoiceId}
                    onChange={(e) => setTempActorVoiceId(e.target.value)}
                    onBlur={handleActorVoiceIdEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleActorVoiceIdEdit()
                      } else if (e.key === 'Escape') {
                        setEditingActorVoiceId(false)
                        setTempActorVoiceId(selectedActorData.voiceId || '')
                      }
                    }}
                    placeholder="输入 ElevenLabs Voice ID..."
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>
              ) : (
                <div
                  className="px-3 py-2 text-sm text-neutral-700 bg-neutral-50 rounded cursor-pointer hover:bg-neutral-100 transition-colors"
                  onClick={() => {
                    setEditingActorVoiceId(true)
                    setTempActorVoiceId(selectedActorData.voiceId || '')
                  }}
                >
                  {selectedActorData.voiceId || (
                    <span className="text-neutral-400">点击添加 Voice ID...</span>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <h3 className="text-sm font-semibold mb-3">演员资料</h3>
              <div className="text-xs text-neutral-500">
                共 {(selectedActorData as any)._count?.files || 0} 个作品
              </div>
            </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Bulk Actions Floating Toolbar */}
      {bulkSelectionMode && selectedFileIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-neutral-900 text-white rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4">
            <span className="text-sm font-medium">
              已选择 {selectedFileIds.size} 个文件
            </span>
            <div className="h-6 w-px bg-neutral-700"></div>

            {/* 分配文件夹 */}
            <div className="relative">
              <button
                onClick={() => setShowBulkFolderSelector(!showBulkFolderSelector)}
                className="px-4 py-2 text-sm font-medium bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors flex items-center gap-2"
              >
                <Folder className="h-4 w-4" />
                分配文件夹
              </button>

              {showBulkFolderSelector && (
                <div
                  className="absolute bottom-full left-0 mb-2 bg-white text-neutral-900 rounded-lg border border-neutral-300 shadow-lg min-w-48 max-h-64 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {folders?.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => {
                        // 批量分配逻辑稍后实现
                        Array.from(selectedFileIds).forEach((fileId) => {
                          moveFileToFolderMutation.mutate({ fileId, folderId: folder.id })
                        })
                        setShowBulkFolderSelector(false)
                        exitBulkMode()
                      }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-neutral-100 transition-colors flex items-center gap-2"
                    >
                      <Folder className="h-4 w-4" style={{ color: folder.color || '#gray' }} />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 分配演员 */}
            <div className="relative">
              <button
                onClick={() => setShowBulkActorSelector(!showBulkActorSelector)}
                className="px-4 py-2 text-sm font-medium bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                分配演员
              </button>

              {showBulkActorSelector && (
                <div
                  className="absolute bottom-full left-0 mb-2 bg-white text-neutral-900 rounded-lg border border-neutral-300 shadow-lg min-w-48 max-h-64 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actors?.map((actor) => (
                    <button
                      key={actor.id}
                      onClick={() => {
                        // 批量分配逻辑
                        Array.from(selectedFileIds).forEach((fileId) => {
                          moveFileToActorMutation.mutate({ fileId, actorId: actor.id })
                        })
                        setShowBulkActorSelector(false)
                        exitBulkMode()
                      }}
                      className="w-full px-4 py-2 text-sm text-left hover:bg-neutral-100 transition-colors flex items-center gap-2"
                    >
                      {actor.avatarUrl ? (
                        <img
                          src={actor.avatarUrl}
                          alt={actor.name}
                          className="h-4 w-4 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-neutral-400" />
                      )}
                      <span className="truncate">{actor.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 批量删除 */}
            <button
              onClick={() => {
                if (confirm(`确定要删除选中的 ${selectedFileIds.size} 个文件吗？此操作无法撤销。`)) {
                  Array.from(selectedFileIds).forEach((fileId) => {
                    deleteFileMutation.mutate({ id: fileId })
                  })
                  exitBulkMode()
                }
              }}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
          </div>
        </div>
      )}

      {/* File Details - New Compact Draggable Panel */}
      {!maximized && selectedFileForDetails && (
        <FileDetailsPanel
          file={selectedFileForDetails}
          onClose={() => setSelectedFileForDetails(null)}
          folders={folders}
          actors={actors}
          onMoveToFolder={(fileId, folderId) => {
            moveFileToFolderMutation.mutate({ fileId, folderId })
          }}
          onMoveToActor={(fileId, actorId) => {
            moveFileToActorMutation.mutate({ fileId, actorId })
          }}
          onUpdateRemark={(fileId, remark) => {
            updateFileMutation.mutate({ fileId, data: { remark } })
          }}
          onTrimVideo={() => {
            setVideoFileForTrim(selectedFileForDetails)
            setVideoTrimModalOpen(true)
            // Close file details to improve performance
            setSelectedFileForDetails(null)
          }}
          onRotateVideo={() => {
            void handleRotateVideo(selectedFileForDetails.id)
          }}
          onConvertToLocal={() => {
            convertUrlToLocalMutation.mutate({ fileId: selectedFileForDetails.id })
          }}
          onGenerateThumbnail={() => {
            regenerateThumbnailMutation.mutate({ fileId: selectedFileForDetails.id })
          }}
          onDelete={() => {
            if (confirm('确定要删除这个文件吗？此操作无法撤销。')) {
              deleteFileMutation.mutate({ id: selectedFileForDetails.id })
              setSelectedFileForDetails(null)
            }
          }}
          getThumbnailUrl={getThumbnailUrl}
          getMediaIcon={getMediaIcon}
          getVideoUrl={getVideoUrl}
          getGifUrl={getGifUrl}
          isRotating={isRotating}
          isConverting={convertUrlToLocalMutation.isPending}
          isGeneratingThumbnail={regenerateThumbnailMutation.isPending}
        />
      )}

      {/* Video Trim Modal */}
      {videoFileForTrim && videoTrimModalOpen && (
        <VideoTrimModal
          isOpen={videoTrimModalOpen}
          onClose={() => {
            setVideoTrimModalOpen(false)
            setVideoFileForTrim(null)
          }}
          videoFile={videoFileForTrim}
          onTrimComplete={() => {
            refetchFiles()
          }}
        />
      )}

      {/* Add URL Dialog */}
      <AddUrlDialog
        open={addUrlDialogOpen}
        onOpenChange={setAddUrlDialogOpen}
        onAddUrls={handleAddUrls}
        currentFolder={selectedFolder}
        viewTab={viewTab}
      />

      {/* Add Local Path Dialog */}
      <AddLocalPathDialog
        open={addLocalPathDialogOpen}
        onOpenChange={setAddLocalPathDialogOpen}
        onAddLocalPaths={handleAddLocalPaths}
      />

      {/* Download URL Dialog */}
      <DownloadUrlDialog
        open={downloadUrlDialogOpen}
        onOpenChange={setDownloadUrlDialogOpen}
        onSubmit={handleDownloadUrl}
        currentFolder={selectedFolder}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        onCreateFolder={handleCreateFolder}
        existingFolders={folders}
      />

      {/* Create Actor Dialog */}
      <CreateActorDialog
        open={createActorDialogOpen}
        onOpenChange={setCreateActorDialogOpen}
        onCreateActor={handleCreateActor}
        existingActors={actors}
      />

      {/* Actor Avatar URL Dialog */}
      <Dialog open={showAvatarUrlDialog} onOpenChange={setShowAvatarUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置演员头像</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">头像 URL</label>
              <input
                type="text"
                value={tempActorAvatarUrl}
                onChange={(e) => setTempActorAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleActorAvatarUpdate()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAvatarUrlDialog(false)
                  setTempActorAvatarUrl('')
                }}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={handleActorAvatarUpdate}
                disabled={updateActorMutation.isPending}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {updateActorMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Actor Reference Image URL Dialog */}
      <Dialog open={showReferenceImageUrlDialog} onOpenChange={setShowReferenceImageUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置形象参考图</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">形象参考图 URL</label>
              <input
                type="text"
                value={tempActorReferenceImageUrl}
                onChange={(e) => setTempActorReferenceImageUrl(e.target.value)}
                placeholder="https://example.com/reference.jpg"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleActorReferenceImageUpdate()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowReferenceImageUrlDialog(false)
                  setTempActorReferenceImageUrl('')
                }}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={handleActorReferenceImageUpdate}
                disabled={updateActorMutation.isPending}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {updateActorMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Progress Float */}
      {uploadTasks.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 w-96 max-h-[70vh] overflow-hidden flex flex-col rounded-lg border border-neutral-200 bg-white shadow-2xl">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
            <h3 className="text-sm font-semibold text-neutral-900">
              添加进度 ({uploadProgress.completed}/{uploadProgress.total})
            </h3>
            <button
              onClick={() => setUploadTasks([])}
              className="text-neutral-500 hover:text-neutral-700"
              title="清空所有"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {uploadTasks.map((task) => (
              <div
                key={task.id}
                className="px-4 py-3 border-b border-neutral-100 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {task.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    )}
                    {task.status === 'success' && !task.isDuplicate && (
                      <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {task.status === 'success' && task.isDuplicate && (
                      <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    {task.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    {task.status === 'pending' && (
                      <div className="h-4 w-4 rounded-full border-2 border-neutral-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {task.name}
                    </p>
                    {task.status === 'uploading' && (
                      <p className="text-xs text-neutral-500 mt-0.5">上传中...</p>
                    )}
                    {task.status === 'success' && !task.isDuplicate && (
                      <p className="text-xs text-green-600 mt-0.5">添加成功</p>
                    )}
                    {task.status === 'success' && task.isDuplicate && (
                      <p className="text-xs text-blue-600 mt-0.5">该文件已存在</p>
                    )}
                    {task.status === 'error' && (
                      <p className="text-xs text-red-600 mt-0.5">
                        {task.error || '添加失败'}
                      </p>
                    )}
                  </div>
                  {task.status === 'error' && !task.isDuplicate && (
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          setUploadTasks((prev) =>
                            prev.map((t) =>
                              t.id === task.id ? { ...t, status: 'uploading', error: undefined } : t
                            )
                          )

                          try {
                            if (task.url) {
                              const result = await addUrlsMutation.mutateAsync({
                                urls: [task.url],
                                folderId: viewTab === 'folders' ? selectedFolder : undefined,
                              })
                              const urlResult = result.results[0]
                              if (urlResult) {
                                setUploadTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id
                                      ? {
                                          ...t,
                                          status: urlResult.success ? 'success' : 'error',
                                          error: urlResult.error,
                                        }
                                      : t
                                  )
                                )
                                if (urlResult.success) {
                                  refetchFiles()
                                  setTimeout(() => {
                                    setUploadTasks((prev) => prev.filter((t) => t.id !== task.id))
                                  }, 3000)
                                }
                              }
                            }
                          } catch (error) {
                            setUploadTasks((prev) =>
                              prev.map((t) =>
                                t.id === task.id
                                  ? {
                                      ...t,
                                      status: 'error',
                                      error: error instanceof Error ? error.message : String(error),
                                    }
                                  : t
                              )
                            )
                          }
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="重试"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setUploadTasks((prev) => prev.filter((t) => t.id !== task.id))
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
          ))}
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setPreviewFile(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-neutral-300 z-10"
            onClick={(e) => {
              e.stopPropagation()
              setPreviewFile(null)
            }}
          >
            <X className="h-8 w-8" />
          </button>

          <div className="relative w-full h-full flex items-center justify-center p-8 pointer-events-none">
            {previewFile.type === 'IMAGE' && getOriginalImageUrl(previewFile) && (
              <NextImage
                src={getOriginalImageUrl(previewFile)!}
                alt={previewFile.name}
                width={1920}
                height={1080}
                className="max-w-full max-h-full object-contain pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                placeholder="blur"
                blurDataURL={getShimmerPlaceholder(1920, 1080)}
                quality={90}
                priority
              />
            )}
            {previewFile.type === 'VIDEO' && getVideoUrl(previewFile) && (
              <video
                src={getVideoUrl(previewFile)!}
                controls
                autoPlay
                className="max-w-full max-h-full pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {previewFile.type === 'AUDIO' && (
              <div
                className="bg-white p-8 rounded-lg pointer-events-auto max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center gap-4">
                  <Music className="h-24 w-24 text-neutral-400" />
                  <p className="text-lg text-center font-medium text-neutral-900">{previewFile.remark || previewFile.name}</p>
                  {previewFile.remark && (
                    <p className="text-sm text-center text-neutral-500">{previewFile.name}</p>
                  )}
                  <audio
                    src={
                      previewFile.source === 'LOCAL_REF'
                        ? `/api/media-ref/${previewFile.id}`
                        : previewFile.sourceUrl || (previewFile.localPath ? `/api/media-file/${previewFile.localPath.replace('data/media-uploads/', '')}` : '')
                    }
                    controls
                    autoPlay
                    className="w-full mt-4"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
