"use client"

import { useState, useRef } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Plus, Download, Grid3x3, List, Image, Video, Music, Folder, X, Upload, AlertCircle, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

type MediaFile = {
  id: string
  name: string
  type: string
  source: string
  sourceUrl: string | null
  localPath: string | null
  thumbnailPath: string | null
  fileSize: number | null
  duration: number | null
  folder?: { name: string } | null
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

export default function MediaBrowserPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined)
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [addUrlDialogOpen, setAddUrlDialogOpen] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([])
  const [draggedFile, setDraggedFile] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // 筛选状态
  const [filterType, setFilterType] = useState<'IMAGE' | 'VIDEO' | 'AUDIO' | undefined>(undefined)
  const [filterSource, setFilterSource] = useState<'LOCAL' | 'URL' | undefined>(undefined)

  // 查询数据
  const { data: filesData, refetch: refetchFiles } = api.mediaBrowser.listFiles.useQuery({
    page: 1,
    pageSize: 50,
    folderId: selectedFolder,
    tagId: selectedTag,
    type: filterType,
    source: filterSource,
  })

  // 查询所有文件总数（用于 All 文件夹显示）
  const { data: allFilesData } = api.mediaBrowser.listFiles.useQuery({
    page: 1,
    pageSize: 1, // 只需要获取总数，不需要实际文件数据
  })

  const { data: folders, refetch: refetchFolders } = api.mediaBrowser.listFolders.useQuery()
  const { data: tags } = api.mediaBrowser.listTags.useQuery()

  // Mutations
  const addUrlsMutation = api.mediaBrowser.addUrls.useMutation()
  const uploadLocalMutation = api.mediaBrowser.uploadLocal.useMutation()

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
  const createFolderMutation = api.mediaBrowser.createFolder.useMutation({
    onSuccess: () => {
      refetchFolders()
      setCreateFolderDialogOpen(false)
      setNewFolderName('')
    },
  })

  // 处理拖拽
  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggedFile(fileId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedFile(null)
    setDragOverFolder(null)
  }

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverFolder(folderId)
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
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

  // 处理创建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('请输入文件夹名称')
      return
    }

    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName.trim(),
      })
    } catch (error) {
      console.error('Create folder failed:', error)
      alert('创建文件夹失败')
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

    // 关闭对话框
    setAddUrlDialogOpen(false)
    setUrlInput('')

    // 创建任务
    const tasks: UploadTask[] = urls.map((url) => ({
      id: `url-${Date.now()}-${Math.random()}`,
      name: url,
      status: 'uploading',
      url,
    }))
    setUploadTasks(tasks)

    try {
      const result = await addUrlsMutation.mutateAsync({ urls, folderId: selectedFolder })

      // 更新任务状态
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

      // 刷新文件列表
      refetchFiles()

      // 3秒后移除成功的任务
      setTimeout(() => {
        setUploadTasks((prev) => prev.filter((t) => t.status !== 'success'))
      }, 3000)
    } catch (error) {
      console.error('Add URLs error:', error)
      // 全部标记为失败
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

    // 创建任务
    const tasks: UploadTask[] = fileArray.map((file) => ({
      id: `local-${Date.now()}-${Math.random()}`,
      name: file.name,
      status: 'pending',
      fileName: file.name,
      mimeType: file.type,
    }))
    setUploadTasks((prev) => [...prev, ...tasks])

    // 逐个上传文件
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      const task = tasks[i]

      if (!file || !task) continue

      try {
        // 更新为上传中
        setUploadTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'uploading' } : t))
        )

        // 读取文件为 base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const base64 = e.target?.result as string
            resolve(base64.split(',')[1] || '') // 移除 data:image/png;base64, 前缀
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // 上传
        const result = await uploadLocalMutation.mutateAsync({
          fileData: base64Data,
          fileName: file.name,
          mimeType: file.type,
          folderId: selectedFolder,
        })

        // 检查是否重复
        if (!result.success && result.isDuplicate) {
          // 标记为重复（使用 success 状态但带有 isDuplicate 标记）
          setUploadTasks((prev) =>
            prev.map((t) =>
              t.id === task.id
                ? { ...t, status: 'success', isDuplicate: true, error: result.error }
                : t
            )
          )
          // 3秒后移除
          setTimeout(() => {
            setUploadTasks((prev) => prev.filter((t) => t.id !== task.id))
          }, 3000)
          continue
        }

        // 标记为成功
        setUploadTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: 'success' } : t))
        )

        // 刷新文件列表
        refetchFiles()

        // 3秒后移除成功的任务
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

    // 重置 input
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
    // 音频文件不显示图片，返回 null
    if (file.type === 'AUDIO') return null

    if (file.thumbnailPath) {
      // Convert data/media-thumbnails/userId/fileId.jpg to /api/media-thumbnail/userId/fileId.jpg
      const thumbnailPath = file.thumbnailPath.replace('data/media-thumbnails/', '')
      return `/api/media-thumbnail/${thumbnailPath}`
    }
    if (file.sourceUrl && file.source === 'URL') return file.sourceUrl
    if (file.localPath) {
      // Convert data/media-uploads/userId/fileId.jpg to /api/media-file/userId/fileId.jpg
      const localPath = file.localPath.replace('data/media-uploads/', '')
      return `/api/media-file/${localPath}`
    }
    return null
  }

  // 获取原始图片URL（用于预览显示）
  const getOriginalImageUrl = (file: MediaFile) => {
    // 音频文件不显示图片，返回 null
    if (file.type === 'AUDIO') return null

    // 优先使用本地原始文件
    if (file.localPath) {
      const localPath = file.localPath.replace('data/media-uploads/', '')
      return `/api/media-file/${localPath}`
    }
    // 其次使用源URL
    if (file.sourceUrl && file.source === 'URL') return file.sourceUrl
    // 最后才使用缩略图
    if (file.thumbnailPath) {
      const thumbnailPath = file.thumbnailPath.replace('data/media-thumbnails/', '')
      return `/api/media-thumbnail/${thumbnailPath}`
    }
    return null
  }

  return (
    <div className="flex gap-6 h-screen overflow-hidden">
      {/* Left Sidebar - Fixed */}
      <div className="w-64 shrink-0 h-screen overflow-y-auto">
        <div className="py-4">
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
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLocalMutation.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploadLocalMutation.isPending ? '上传中...' : '上传本地'}
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

            <div className="mb-4 border-t border-neutral-200 pt-4">
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
                {/* All 文件夹 - 显示所有文件 */}
                <button
                  onClick={() => {
                    setSelectedFolder(undefined)
                    setSelectedTag(undefined)
                  }}
                  onDragOver={(e) => handleDragOver(e, null)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, null)}
                  className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
                    !selectedFolder && !selectedTag
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

                {/* 用户创建的文件夹 */}
                {folders?.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolder(folder.id)
                      setSelectedTag(undefined)
                    }}
                    onDragOver={(e) => handleDragOver(e, folder.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.id)}
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

            <div>
              <h3 className="text-sm font-semibold mb-2">标签</h3>
              <div className="space-y-1">
                {tags?.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setSelectedTag(tag.id)
                      setSelectedFolder(undefined)
                    }}
                    className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
                      selectedTag === tag.id
                        ? 'bg-neutral-900 text-white'
                        : 'hover:bg-neutral-100'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                    <span className="ml-2 text-xs opacity-60">
                      ({(tag as any)._count?.files || 0})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 h-screen overflow-y-auto">
        <div className="py-4">
          {/* File count badge */}
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700">
              共 {filesData?.pagination.total || 0} 个文件
            </span>
          </div>

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
                  column-width: 280px;
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
                    className={`masonry-item group relative rounded-lg border border-neutral-200 bg-white overflow-hidden hover:shadow-md transition-shadow ${
                      draggedFile === file.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-full bg-neutral-100 flex items-center justify-center cursor-move overflow-hidden"
                      onClick={() => setPreviewFile(file as MediaFile)}
                    >
                      {getThumbnailUrl(file as MediaFile) ? (
                        <img
                          src={getThumbnailUrl(file as MediaFile)!}
                          alt={file.name}
                          className="w-full object-cover"
                          style={{ display: 'block', height: 'auto' }}
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
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {file.type === 'VIDEO' || file.type === 'AUDIO'
                          ? `${Math.round((file.duration || 0) / 60)}分钟`
                          : file.fileSize
                          ? `${Math.round((file.fileSize || 0) / 1024)}KB`
                          : '-'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => deleteFileMutation.mutate({ id: file.id })}
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-white divide-y">
              {filesData?.files.map((file) => (
                <div key={file.id} className="flex items-center gap-4 p-4 hover:bg-neutral-50">
                  <div className="flex-shrink-0">{getMediaIcon(file.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-neutral-500">
                      {file.folder?.name || '未分类'} • {file.type}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteFileMutation.mutate({ id: file.id })}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

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
                          // 重试逻辑
                          setUploadTasks((prev) =>
                            prev.map((t) =>
                              t.id === task.id ? { ...t, status: 'uploading', error: undefined } : t
                            )
                          )

                          try {
                            if (task.url) {
                              // 重试 URL
                              const result = await addUrlsMutation.mutateAsync({
                                urls: [task.url],
                                folderId: selectedFolder,
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
              <img
                src={getOriginalImageUrl(previewFile)!}
                alt={previewFile.name}
                className="max-w-full max-h-full object-contain pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {previewFile.type === 'VIDEO' && (
              <video
                src={previewFile.sourceUrl || (previewFile.localPath ? `/api/media-file/${previewFile.localPath.replace('data/media-uploads/', '')}` : '')}
                controls
                autoPlay
                className="max-w-full max-h-full pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {previewFile.type === 'AUDIO' && (
              <div
                className="bg-white p-8 rounded-lg pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center gap-4">
                  <Music className="h-16 w-16 text-neutral-400" />
                  <p className="text-sm text-center font-medium">{previewFile.name}</p>
                  <audio
                    src={previewFile.sourceUrl || (previewFile.localPath ? `/api/media-file/${previewFile.localPath.replace('data/media-uploads/', '')}` : '')}
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
