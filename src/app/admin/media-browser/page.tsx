"use client"

import { useState, useRef, useEffect } from 'react'
import NextImage from 'next/image'
import { api } from '~/components/providers/trpc-provider'
import { Plus, Download, Grid3x3, List, Image, Video, Music, Folder, X, Upload, AlertCircle, RefreshCw, Trash2, Loader2, User, Edit2, Check, ChevronLeft, ChevronRight, Copy, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

// LocalStorage keys
const STORAGE_KEYS = {
  VIEW_TAB: 'media-browser-view-tab',
  VIEW_MODE: 'media-browser-view-mode',
  FILTER_TYPE: 'media-browser-filter-type',
  FILTER_SOURCE: 'media-browser-filter-source',
  COLUMN_WIDTH: 'media-browser-column-width',
  ACTOR_PANEL_COLLAPSED: 'media-browser-actor-panel-collapsed',
  LEFT_SIDEBAR_COLLAPSED: 'media-browser-left-sidebar-collapsed',
  SELECTED_FOLDER: 'media-browser-selected-folder',
  SELECTED_ACTOR: 'media-browser-selected-actor',
}

type MediaFile = {
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
  folder?: { name: string } | null
  actor?: { id: string; name: string; avatarUrl: string | null; bio: string | null } | null
}

type UploadTask = {
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

type ViewTab = 'folders' | 'actors'

export default function MediaBrowserPage() {
  // 使用 mounted 状态防止 hydration 不匹配
  const [mounted, setMounted] = useState(false)

  // 从 localStorage 初始化状态 - 使用默认值直到 mounted
  const [viewTab, setViewTab] = useState<ViewTab>('folders')
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined)
  const [selectedActor, setSelectedActor] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [addUrlDialogOpen, setAddUrlDialogOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([])
  const [draggedFile, setDraggedFile] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [dragOverActor, setDragOverActor] = useState<string | null>(null)
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [createActorDialogOpen, setCreateActorDialogOpen] = useState(false)
  const [newActorName, setNewActorName] = useState('')
  const [addLocalPathDialogOpen, setAddLocalPathDialogOpen] = useState(false)
  const [localPathInput, setLocalPathInput] = useState('')

  // 筛选状态
  const [filterType, setFilterType] = useState<'IMAGE' | 'VIDEO' | 'AUDIO' | undefined>(undefined)
  const [filterSource, setFilterSource] = useState<'LOCAL' | 'URL' | undefined>(undefined)

  // 演员资料编辑状态
  const [editingActorName, setEditingActorName] = useState(false)
  const [editingActorBio, setEditingActorBio] = useState(false)
  const [tempActorName, setTempActorName] = useState('')
  const [tempActorBio, setTempActorBio] = useState('')
  const [tempActorAvatarUrl, setTempActorAvatarUrl] = useState('')
  const [showAvatarUrlDialog, setShowAvatarUrlDialog] = useState(false)

  const [actorPanelCollapsed, setActorPanelCollapsed] = useState(false)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null)
  const [columnWidth, setColumnWidth] = useState(280)

  // 文件详情面板状态
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<MediaFile | null>(null)
  const [editingFileRemark, setEditingFileRemark] = useState(false)
  const [tempFileRemark, setTempFileRemark] = useState('')

  // Inline editing state for list view
  const [editingInlineFileId, setEditingInlineFileId] = useState<string | null>(null)
  const [tempInlineRemark, setTempInlineRemark] = useState('')

  // 从 localStorage 恢复状态（仅在客户端 mount 后执行一次）
  useEffect(() => {
    setMounted(true)

    const savedViewTab = localStorage.getItem(STORAGE_KEYS.VIEW_TAB) as ViewTab
    if (savedViewTab) setViewTab(savedViewTab)

    const savedFolder = localStorage.getItem(STORAGE_KEYS.SELECTED_FOLDER)
    if (savedFolder) setSelectedFolder(savedFolder)

    const savedActor = localStorage.getItem(STORAGE_KEYS.SELECTED_ACTOR)
    if (savedActor) setSelectedActor(savedActor)

    const savedViewMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as 'grid' | 'list'
    if (savedViewMode) setViewMode(savedViewMode)

    const savedFilterType = localStorage.getItem(STORAGE_KEYS.FILTER_TYPE) as 'IMAGE' | 'VIDEO' | 'AUDIO'
    if (savedFilterType) setFilterType(savedFilterType)

    const savedFilterSource = localStorage.getItem(STORAGE_KEYS.FILTER_SOURCE) as 'LOCAL' | 'URL'
    if (savedFilterSource) setFilterSource(savedFilterSource)

    const savedColumnWidth = localStorage.getItem(STORAGE_KEYS.COLUMN_WIDTH)
    if (savedColumnWidth) setColumnWidth(Number(savedColumnWidth))

    const savedCollapsed = localStorage.getItem(STORAGE_KEYS.ACTOR_PANEL_COLLAPSED)
    if (savedCollapsed) setActorPanelCollapsed(savedCollapsed === 'true')

    const savedLeftSidebarCollapsed = localStorage.getItem(STORAGE_KEYS.LEFT_SIDEBAR_COLLAPSED)
    if (savedLeftSidebarCollapsed) setLeftSidebarCollapsed(savedLeftSidebarCollapsed === 'true')
  }, [])

  // 持久化状态到 localStorage（仅在 mounted 后保存，避免首次渲染保存默认值）
  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEYS.VIEW_TAB, viewTab)
  }, [viewTab, mounted])

  useEffect(() => {
    if (!mounted) return
    if (selectedFolder) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_FOLDER, selectedFolder)
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_FOLDER)
    }
  }, [selectedFolder, mounted])

  useEffect(() => {
    if (!mounted) return
    if (selectedActor) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_ACTOR, selectedActor)
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_ACTOR)
    }
  }, [selectedActor, mounted])

  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode)
  }, [viewMode, mounted])

  useEffect(() => {
    if (!mounted) return
    if (filterType) {
      localStorage.setItem(STORAGE_KEYS.FILTER_TYPE, filterType)
    } else {
      localStorage.removeItem(STORAGE_KEYS.FILTER_TYPE)
    }
  }, [filterType, mounted])

  useEffect(() => {
    if (!mounted) return
    if (filterSource) {
      localStorage.setItem(STORAGE_KEYS.FILTER_SOURCE, filterSource)
    } else {
      localStorage.removeItem(STORAGE_KEYS.FILTER_SOURCE)
    }
  }, [filterSource, mounted])

  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEYS.COLUMN_WIDTH, String(columnWidth))
  }, [columnWidth, mounted])

  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEYS.ACTOR_PANEL_COLLAPSED, String(actorPanelCollapsed))
  }, [actorPanelCollapsed, mounted])

  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEYS.LEFT_SIDEBAR_COLLAPSED, String(leftSidebarCollapsed))
  }, [leftSidebarCollapsed, mounted])

  // 查询数据
  const { data: filesData, refetch: refetchFiles } = api.mediaBrowser.listFiles.useQuery({
    page: 1,
    pageSize: 50,
    folderId: viewTab === 'folders' ? selectedFolder : undefined,
    actorId: viewTab === 'actors' ? selectedActor : undefined,
    type: filterType,
    source: filterSource,
  })

  // 查询所有文件总数（用于 All 显示）
  const { data: allFilesData } = api.mediaBrowser.listFiles.useQuery({
    page: 1,
    pageSize: 1,
  })

  const { data: folders, refetch: refetchFolders } = api.mediaBrowser.listFolders.useQuery()
  const { data: actors, refetch: refetchActors } = api.mediaBrowser.listActors.useQuery()

  // Mutations
  const addUrlsMutation = api.mediaBrowser.addUrls.useMutation()
  const uploadLocalMutation = api.mediaBrowser.uploadLocal.useMutation()
  const addLocalReferenceMutation = api.mediaBrowser.addLocalReference.useMutation()

  const exportMutation = api.mediaBrowser.exportMedia.useMutation()
  const deleteFileMutation = api.mediaBrowser.deleteFile.useMutation({
    onSuccess: () => refetchFiles(),
  })
  const moveFileToFolderMutation = api.mediaBrowser.moveFileToFolder.useMutation({
    onSuccess: () => {
      refetchFiles()
      refetchFolders()
    },
  })
  const moveFileToActorMutation = api.mediaBrowser.moveFileToActor.useMutation({
    onSuccess: () => {
      refetchFiles()
      refetchActors()
    },
  })
  const createFolderMutation = api.mediaBrowser.createFolder.useMutation({
    onSuccess: () => {
      refetchFolders()
      setCreateFolderDialogOpen(false)
      setNewFolderName('')
    },
  })
  const createActorMutation = api.mediaBrowser.createActor.useMutation({
    onSuccess: () => {
      refetchActors()
      setCreateActorDialogOpen(false)
      setNewActorName('')
    },
  })
  const updateActorMutation = api.mediaBrowser.updateActor.useMutation({
    onSuccess: () => {
      refetchActors()
    },
  })
  const updateFileMutation = api.mediaBrowser.updateFile.useMutation({
    onSuccess: () => {
      refetchFiles()
    },
  })

  // 获取当前选中的演员信息
  const selectedActorData = actors?.find((a) => a.id === selectedActor)

  // 处理拖拽
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
      await moveFileToFolderMutation.mutateAsync({
        fileId: draggedFile,
        folderId: targetFolderId,
      })
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
      await moveFileToActorMutation.mutateAsync({
        fileId: draggedFile,
        actorId: targetActorId,
      })
    } catch (error) {
      console.error('Move file to actor failed:', error)
      alert('移动文件失败')
    } finally {
      setDraggedFile(null)
      setDragOverActor(null)
    }
  }

  // 处理创建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('请输入文件夹名称')
      return
    }

    // 检查重名
    const duplicate = folders?.find((f) => f.name === newFolderName.trim())
    if (duplicate) {
      alert('文件夹名称已存在，请使用其他名称')
      return
    }

    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName.trim(),
      })
    } catch (error) {
      console.error('Create folder failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Unique constraint')) {
        alert('文件夹名称已存在，请使用其他名称')
      } else {
        alert(`创建文件夹失败: ${errorMessage}`)
      }
    }
  }

  // 处理创建演员
  const handleCreateActor = async () => {
    if (!newActorName.trim()) {
      alert('请输入演员名称')
      return
    }

    // 检查重名
    const duplicate = actors?.find((a) => a.name === newActorName.trim())
    if (duplicate) {
      alert('演员名称已存在，请使用其他名称')
      return
    }

    try {
      await createActorMutation.mutateAsync({
        name: newActorName.trim(),
      })
    } catch (error) {
      console.error('Create actor failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Unique constraint')) {
        alert('演员名称已存在，请使用其他名称')
      } else {
        alert(`创建演员失败: ${errorMessage}`)
      }
    }
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

  // 处理文件备注编辑
  const handleFileRemarkEdit = async () => {
    if (!selectedFileForDetails) return

    try {
      const updated = await updateFileMutation.mutateAsync({
        id: selectedFileForDetails.id,
        remark: tempFileRemark.trim() || null,
      })
      setSelectedFileForDetails(updated)
      setEditingFileRemark(false)
    } catch (error) {
      console.error('Update file remark failed:', error)
      alert('更新备注失败')
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
  const handleAddLocalPaths = async () => {
    const paths = localPathInput
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    if (paths.length === 0) {
      alert('请输入至少一个文件路径')
      return
    }

    setAddLocalPathDialogOpen(false)
    setLocalPathInput('')

    const tasks: UploadTask[] = paths.map((filePath) => {
      const fileName = filePath.split(/[/\\]/).pop() || filePath
      return {
        id: `local-ref-${Date.now()}-${Math.random()}`,
        name: fileName,
        status: 'uploading',
        url: filePath,
      }
    })
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

  // 处理添加 URL
  const handleAddUrls = async () => {
    const urls = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0)

    if (urls.length === 0) {
      alert('请输入至少一个 URL')
      return
    }

    setAddUrlDialogOpen(false)
    setUrlInput('')

    const tasks: UploadTask[] = urls.map((url) => ({
      id: `url-${Date.now()}-${Math.random()}`,
      name: url,
      status: 'uploading',
      url,
    }))
    setUploadTasks(tasks)

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

  // 处理本地文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

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

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
  const getMediaIcon = (type: string) => {
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
  }

  // 获取缩略图URL（用于列表显示）
  const getThumbnailUrl = (file: MediaFile) => {
    if (file.type === 'AUDIO') return null

    if (file.thumbnailPath) {
      const thumbnailPath = file.thumbnailPath.replace('data/media-thumbnails/', '')
      return `/api/media-thumbnail/${thumbnailPath}`
    }
    if (file.source === 'LOCAL_REF') return `/api/media-ref/${file.id}`
    if (file.sourceUrl && file.source === 'URL') return file.sourceUrl
    if (file.localPath) {
      const localPath = file.localPath.replace('data/media-uploads/', '')
      return `/api/media-file/${localPath}`
    }
    return null
  }

  // 获取原始图片URL（用于预览显示）
  const getOriginalImageUrl = (file: MediaFile) => {
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
  }

  // 获取视频URL（用于悬停预览）
  const getVideoUrl = (file: MediaFile) => {
    if (file.type !== 'VIDEO') return null

    if (file.source === 'LOCAL_REF') return `/api/media-ref/${file.id}`
    if (file.localPath) {
      const localPath = file.localPath.replace('data/media-uploads/', '')
      return `/api/media-file/${localPath}`
    }
    if (file.sourceUrl && file.source === 'URL') return file.sourceUrl
    return null
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - Fixed */}
      <div className={`shrink-0 flex flex-col border-r border-neutral-200 bg-neutral-50 transition-all duration-300 ${
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
          <div className="mb-4 space-y-2">
            <button
              onClick={() => setAddUrlDialogOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <Plus className="h-4 w-4" />
              添加 URL
            </button>
            <button
              onClick={() => setAddLocalPathDialogOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <Folder className="h-4 w-4" />
              引用本地文件
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLocalMutation.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploadLocalMutation.isPending ? '上传中...' : '上传到服务器'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {exportMutation.isPending ? '导出中' : '导出'}
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="flex items-center justify-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                title="切换视图"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            {/* Type and Source Filters */}
            <div className="mb-4 space-y-3">
              {/* Type Filter */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 mb-2">类型</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFilterType(undefined)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      filterType === undefined
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('IMAGE')}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      filterType === 'IMAGE'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    图片
                  </button>
                  <button
                    onClick={() => setFilterType('VIDEO')}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      filterType === 'VIDEO'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    视频
                  </button>
                  <button
                    onClick={() => setFilterType('AUDIO')}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      filterType === 'AUDIO'
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    音频
                  </button>
                </div>
              </div>

              {/* Source Filter */}
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 mb-2">存储</h3>
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
                    onClick={() => setSelectedFolder(undefined)}
                    onDragOver={(e) => handleDragOverFolder(e, null)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropToFolder(e, null)}
                    className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
                      !selectedFolder
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

                  {folders?.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolder(folder.id)}
                      onDragOver={(e) => handleDragOverFolder(e, folder.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropToFolder(e, folder.id)}
                      className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
                        selectedFolder === folder.id
                          ? 'bg-neutral-900 text-white'
                          : dragOverFolder === folder.id
                          ? 'bg-blue-100 hover:bg-blue-200'
                          : 'hover:bg-neutral-100'
                      }`}
                    >
                      {folder.name}
                      <span className="ml-2 text-xs opacity-60">
                        ({(folder as any)._count?.files || 0})
                      </span>
                    </button>
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
                        // 重置编辑状态
                        setEditingActorName(false)
                        setEditingActorBio(false)
                      }}
                      onDragOver={(e) => handleDragOverActor(e, actor.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropToActor(e, actor.id)}
                      className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors flex items-center gap-2 ${
                        selectedActor === actor.id
                          ? 'bg-neutral-900 text-white'
                          : dragOverActor === actor.id
                          ? 'bg-blue-100 hover:bg-blue-200'
                          : 'hover:bg-neutral-100'
                      }`}
                    >
                      {actor.avatarUrl ? (
                        <NextImage
                          src={actor.avatarUrl}
                          alt={`${actor.name}的头像`}
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-neutral-300 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-neutral-600" />
                        </div>
                      )}
                      <span className="flex-1 truncate">{actor.name}</span>
                      <span className="text-xs opacity-60">
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

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Fixed Header - File count badge and column width slider */}
        <div className="shrink-0 border-b border-neutral-200 bg-white px-6 py-2.5 flex items-center gap-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
            共 {filesData?.pagination.total || 0} 个文件
          </span>

          {viewMode === 'grid' && (
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs text-neutral-500">列宽</span>
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
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Media Grid/List */}
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
            <>
              <style jsx>{`
                .masonry-grid {
                  column-width: ${columnWidth}px;
                  column-gap: 1rem;
                }
                .masonry-item {
                  break-inside: avoid;
                  margin-bottom: 1rem;
                }
              `}</style>
              <div className="masonry-grid">
                {filesData?.files.map((file) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file.id)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => {
                      if (file.type === 'VIDEO') {
                        setHoveredVideoId(file.id)
                      }
                    }}
                    onMouseLeave={() => {
                      if (file.type === 'VIDEO') {
                        setHoveredVideoId(null)
                      }
                    }}
                    className={`masonry-item group relative rounded-lg border border-neutral-200 bg-white overflow-hidden hover:shadow-md transition-shadow ${
                      draggedFile === file.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-full bg-neutral-100 flex items-center justify-center cursor-pointer overflow-hidden relative"
                      onClick={() => {
                        setSelectedFileForDetails(file as MediaFile)
                        setTempFileRemark((file as MediaFile).remark || (file as MediaFile).name)
                        setEditingFileRemark(false)
                      }}
                    >
                      {/* 缩略图层 - 始终渲染作为背景 */}
                      {getThumbnailUrl(file as MediaFile) ? (
                        <NextImage
                          src={getThumbnailUrl(file as MediaFile)!}
                          alt={file.name}
                          width={columnWidth}
                          height={columnWidth}
                          className="w-full object-cover"
                          style={{ display: 'block', height: 'auto' }}
                          unoptimized
                        />
                      ) : file.type === 'AUDIO' ? (
                        <div className="w-full aspect-square bg-neutral-200 flex flex-col items-center justify-center">
                          <Music className="h-12 w-12 text-neutral-400 mb-2" />
                          <span className="text-sm font-medium text-neutral-500">Audio</span>
                        </div>
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center">
                          <div className="text-neutral-400">{getMediaIcon(file.type)}</div>
                        </div>
                      )}

                      {/* 视频预览层 - 悬停时覆盖在缩略图上方 */}
                      {file.type === 'VIDEO' && getVideoUrl(file as MediaFile) && (
                        <video
                          src={getVideoUrl(file as MediaFile)!}
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                            hoveredVideoId === file.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                          }`}
                          onMouseEnter={(e) => {
                            e.currentTarget.currentTime = 0
                            e.currentTarget.play().catch(() => {
                              // 忽略自动播放错误
                            })
                          }}
                        />
                      )}

                      {/* Type Icon Badge */}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-md p-1.5 z-10">
                        {file.type === 'IMAGE' && <Image className="h-4 w-4 text-white" />}
                        {file.type === 'VIDEO' && <Video className="h-4 w-4 text-white" />}
                        {file.type === 'AUDIO' && <Music className="h-4 w-4 text-white" />}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      {editingInlineFileId === file.id ? (
                        <input
                          type="text"
                          value={tempInlineRemark}
                          onChange={(e) => setTempInlineRemark(e.target.value)}
                          onBlur={() => handleInlineRemarkEdit(file.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              void handleInlineRemarkEdit(file.id)
                            }
                            if (e.key === 'Escape') {
                              setEditingInlineFileId(null)
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full text-sm font-medium px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                        />
                      ) : (
                        <p
                          className="text-sm font-medium truncate cursor-text hover:bg-neutral-100 px-2 py-1 rounded -mx-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingInlineFileId(file.id)
                            setTempInlineRemark(file.remark || file.name)
                          }}
                        >
                          {file.remark || file.name}
                        </p>
                      )}
                      <p className="text-xs text-neutral-500 mt-1">
                        {file.type === 'VIDEO' || file.type === 'AUDIO'
                          ? file.duration && file.duration > 0
                            ? file.duration < 60
                              ? `${Math.round(file.duration)}秒`
                              : `${Math.round(file.duration / 60)}分钟`
                            : file.fileSize
                            ? `${Math.round(file.fileSize / 1024)}KB`
                            : '-'
                          : file.fileSize
                          ? `${Math.round(file.fileSize / 1024)}KB`
                          : '-'}
                      </p>
                    </div>

                    {/* Preview Button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewFile(file as MediaFile)
                        }}
                        className="rounded-full bg-black/60 backdrop-blur-sm p-2 text-white hover:bg-black/80 transition-colors"
                        title="预览"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-white divide-y">
              {filesData?.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => {
                    if (editingInlineFileId !== file.id) {
                      setSelectedFileForDetails(file as MediaFile)
                      setTempFileRemark((file as MediaFile).remark || (file as MediaFile).name)
                      setEditingFileRemark(false)
                    }
                  }}
                >
                  <div className="flex-shrink-0">{getMediaIcon(file.type)}</div>
                  <div className="flex-1 min-w-0">
                    {editingInlineFileId === file.id ? (
                      <input
                        type="text"
                        value={tempInlineRemark}
                        onChange={(e) => setTempInlineRemark(e.target.value)}
                        onBlur={() => handleInlineRemarkEdit(file.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            void handleInlineRemarkEdit(file.id)
                          }
                          if (e.key === 'Escape') {
                            setEditingInlineFileId(null)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full text-sm font-medium px-2 py-1 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                      />
                    ) : (
                      <p
                        className="text-sm font-medium truncate cursor-text hover:bg-neutral-100 px-2 py-1 rounded -mx-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingInlineFileId(file.id)
                          setTempInlineRemark(file.remark || file.name)
                        }}
                      >
                        {file.remark || file.name}
                      </p>
                    )}
                    <p className="text-xs text-neutral-500">
                      {file.folder?.name || file.actor?.name || '未分类'} • {file.type}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewFile(file as MediaFile)
                    }}
                    className="rounded-full bg-neutral-100 p-2 text-neutral-600 hover:bg-neutral-200 transition-colors"
                    title="预览"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Actor Profile (only show when actor is selected) */}
      {viewTab === 'actors' && selectedActor && selectedActorData && (
        <div className={`shrink-0 flex flex-col border-l border-neutral-200 bg-white transition-all duration-300 ${
          actorPanelCollapsed ? 'w-12' : 'w-80'
        }`}>
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
            <div className="flex-1 overflow-y-auto p-6">
            {/* Actor Avatar */}
            <div className="mb-6">
              <div
                className="w-full aspect-square rounded-lg bg-neutral-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setTempActorAvatarUrl(selectedActorData.avatarUrl || '')
                  setShowAvatarUrlDialog(true)
                }}
              >
                {selectedActorData.avatarUrl ? (
                  <NextImage
                    src={selectedActorData.avatarUrl}
                    alt={`${selectedActorData.name}的头像`}
                    width={320}
                    height={320}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-400">
                    <User className="h-16 w-16" />
                    <span className="text-sm">点击添加头像</span>
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

            <div className="border-t border-neutral-200 pt-4">
              <h3 className="text-sm font-semibold mb-3">演员资料</h3>
              <div className="text-xs text-neutral-500">
                共 {(selectedActorData as any)._count?.files || 0} 个作品
              </div>
            </div>
            </div>
          )}
        </div>
      )}

      {/* Right Sidebar - File Details (show when file is selected) */}
      {selectedFileForDetails && (
        <div className="shrink-0 w-80 flex flex-col border-l border-neutral-200 bg-white">
          {/* Header */}
          <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">文件详情</h2>
            <button
              onClick={() => setSelectedFileForDetails(null)}
              className="text-neutral-500 hover:text-neutral-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Thumbnail */}
            <div className="w-full aspect-square rounded-lg bg-neutral-100 flex items-center justify-center overflow-hidden">
              {getThumbnailUrl(selectedFileForDetails) ? (
                <NextImage
                  src={getThumbnailUrl(selectedFileForDetails)!}
                  alt={selectedFileForDetails.name}
                  width={320}
                  height={320}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : selectedFileForDetails.type === 'AUDIO' ? (
                <Music className="h-16 w-16 text-neutral-400" />
              ) : (
                getMediaIcon(selectedFileForDetails.type)
              )}
            </div>

            {/* Original Filename */}
            <div>
              <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                原文件名称
              </label>
              <div className="px-3 py-2 text-sm bg-neutral-50 rounded border border-neutral-200 break-all">
                {selectedFileForDetails.name}
              </div>
            </div>

            {/* Remark (Editable) */}
            <div>
              <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                备注名称
              </label>
              {editingFileRemark ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempFileRemark}
                    onChange={(e) => setTempFileRemark(e.target.value)}
                    onBlur={handleFileRemarkEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFileRemarkEdit()
                      if (e.key === 'Escape') setEditingFileRemark(false)
                    }}
                    autoFocus
                    className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
                  />
                  <button
                    onClick={handleFileRemarkEdit}
                    className="p-2 text-green-600 hover:text-green-700"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div
                  className="px-3 py-2 text-sm bg-neutral-50 rounded border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors break-all flex items-start gap-2"
                  onClick={() => setEditingFileRemark(true)}
                >
                  <span className="flex-1">
                    {selectedFileForDetails.remark || selectedFileForDetails.name}
                  </span>
                  <Edit2 className="h-4 w-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                </div>
              )}
            </div>

            {/* File Size */}
            <div>
              <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                文件大小
              </label>
              <div className="px-3 py-2 text-sm bg-neutral-50 rounded border border-neutral-200">
                {selectedFileForDetails.fileSize
                  ? `${(selectedFileForDetails.fileSize / 1024 / 1024).toFixed(2)} MB`
                  : '-'}
              </div>
            </div>

            {/* Original Path (LOCAL_REF) */}
            {selectedFileForDetails.originalPath && selectedFileForDetails.source === 'LOCAL_REF' && (
              <div>
                <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                  原始文件路径
                </label>
                <div className="flex items-start gap-2">
                  <div className="flex-1 px-3 py-2 text-sm bg-neutral-50 rounded border border-neutral-200 break-all font-mono">
                    {selectedFileForDetails.originalPath}
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(selectedFileForDetails.originalPath!)}
                    className="p-2 text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded hover:bg-neutral-100"
                    title="复制路径"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Local File Path (LOCAL) */}
            {selectedFileForDetails.localPath && selectedFileForDetails.source === 'LOCAL' && (
              <div>
                <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                  服务器存储路径
                </label>
                <div className="flex items-start gap-2">
                  <div className="flex-1 px-3 py-2 text-sm bg-neutral-50 rounded border border-neutral-200 break-all font-mono">
                    {selectedFileForDetails.localPath}
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(selectedFileForDetails.localPath!)}
                    className="p-2 text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded hover:bg-neutral-100"
                    title="复制路径"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Remote URL */}
            {selectedFileForDetails.sourceUrl && (
              <div>
                <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                  远程URL地址
                </label>
                <div className="flex items-start gap-2">
                  <div className="flex-1 px-3 py-2 text-sm bg-neutral-50 rounded border border-neutral-200 break-all font-mono">
                    {selectedFileForDetails.sourceUrl}
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(selectedFileForDetails.sourceUrl!)}
                    className="p-2 text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded hover:bg-neutral-100"
                    title="复制URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* API Access URL */}
            {selectedFileForDetails.localPath && (
              <div>
                <label className="text-xs font-semibold text-neutral-500 mb-2 block">
                  API 访问地址
                </label>
                <div className="flex items-start gap-2">
                  <div className="flex-1 px-3 py-2 text-sm bg-neutral-50 rounded border border-neutral-200 break-all font-mono text-neutral-600">
                    {`${window.location.origin}/api/media-file/${selectedFileForDetails.localPath.replace('data/media-uploads/', '')}`}
                  </div>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/api/media-file/${selectedFileForDetails.localPath.replace('data/media-uploads/', '')}`
                      handleCopyToClipboard(url)
                    }}
                    className="p-2 text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded hover:bg-neutral-100"
                    title="复制到剪贴板"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadFile(selectedFileForDetails)}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                <Download className="h-4 w-4" />
                下载原文件
              </button>
              <button
                onClick={() => {
                  if (confirm('确定要删除这个文件吗？此操作无法撤销。')) {
                    deleteFileMutation.mutate({ id: selectedFileForDetails.id })
                    setSelectedFileForDetails(null)
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                删除文件
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add URL Dialog */}
      <Dialog open={addUrlDialogOpen} onOpenChange={setAddUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加媒体 URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">URL（每行一个）</label>
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg&#10;https://example.com/video.mp4"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAddUrlDialogOpen(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={handleAddUrls}
                disabled={addUrlsMutation.isPending}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {addUrlsMutation.isPending ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Local Path Dialog */}
      <Dialog open={addLocalPathDialogOpen} onOpenChange={setAddLocalPathDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>引用本地文件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>如何获取文件路径：</strong>
              </p>
              <ul className="mt-2 text-xs text-blue-700 space-y-1 ml-4">
                <li>• <strong>macOS:</strong> 在访达中选中文件，按 Option+Cmd+C 复制路径</li>
                <li>• <strong>Windows:</strong> 在文件资源管理器中按住 Shift 右键点击文件，选择"复制为路径"</li>
              </ul>
            </div>
            <div>
              <label className="text-sm font-medium">文件路径（每行一个）</label>
              <textarea
                value={localPathInput}
                onChange={(e) => setLocalPathInput(e.target.value)}
                placeholder={`macOS/Linux 示例:\n/Users/username/Videos/video.mp4\n/Users/username/Pictures/image.jpg\n\nWindows 示例:\nC:\\Users\\username\\Videos\\video.mp4\nD:\\Media\\image.png`}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none font-mono"
                rows={8}
              />
              <p className="mt-2 text-xs text-neutral-500">
                支持批量添加，每行一个完整的文件路径
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAddLocalPathDialogOpen(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={handleAddLocalPaths}
                disabled={addLocalReferenceMutation.isPending}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {addLocalReferenceMutation.isPending ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建文件夹</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">文件夹名称</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="请输入文件夹名称"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreateFolderDialogOpen(false)
                  setNewFolderName('')
                }}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={createFolderMutation.isPending}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {createFolderMutation.isPending ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Actor Dialog */}
      <Dialog open={createActorDialogOpen} onOpenChange={setCreateActorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建演员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">演员名称</label>
              <input
                type="text"
                value={newActorName}
                onChange={(e) => setNewActorName(e.target.value)}
                placeholder="请输入演员名称"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateActor()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreateActorDialogOpen(false)
                  setNewActorName('')
                }}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateActor}
                disabled={createActorMutation.isPending}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {createActorMutation.isPending ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Upload Progress Float */}
      {uploadTasks.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 w-96 max-h-[70vh] overflow-hidden flex flex-col rounded-lg border border-neutral-200 bg-white shadow-2xl">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
            <h3 className="text-sm font-semibold text-neutral-900">
              添加进度 ({uploadTasks.filter(t => t.status === 'success').length}/{uploadTasks.length})
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
                unoptimized
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

            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-medium">{previewFile.name}</p>
              <p className="text-sm text-neutral-300 mt-1">
                {previewFile.type} • {previewFile.fileSize ? `${Math.round(previewFile.fileSize / 1024)}KB` : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
