"use client"

export const dynamic = 'force-dynamic'

/**
 * Studio Project Detail Page
 * 项目详情页 - 集列表和管理
 */

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Plus, Archive, RotateCcw, Trash2, Film, Calendar, ArrowLeft } from 'lucide-react'
import { api } from '~/components/providers/trpc-provider'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

type EpisodeStatus = 'draft' | 'in-progress' | 'completed' | 'archived'

const STATUS_COLORS: Record<EpisodeStatus, string> = {
  'draft': 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  'completed': 'bg-green-100 text-green-700',
  'archived': 'bg-purple-100 text-purple-700',
}

const STATUS_LABELS: Record<EpisodeStatus, string> = {
  'draft': '草稿',
  'in-progress': '进行中',
  'completed': '已完成',
  'archived': '已归档',
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newEpisodeTitle, setNewEpisodeTitle] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<EpisodeStatus | undefined>()
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 查询项目信息
  const { data: projects } = api.studio.listProjects.useQuery()
  const project = projects?.find(p => p.slug === slug)

  // 查询集列表
  const { data: episodesData, refetch } = api.studio.listEpisodes.useQuery(
    {
      projectId: project?.id ?? '',
      status: selectedStatus,
    },
    {
      enabled: !!project?.id,
      refetchOnWindowFocus: false,
    }
  )

  // Mutations
  const createMutation = api.studio.createEpisode.useMutation({
    onSuccess: () => {
      setCreateDialogOpen(false)
      setNewEpisodeTitle('')
      void refetch()
    },
  })

  const archiveMutation = api.studio.archiveEpisode.useMutation({
    onSuccess: () => void refetch(),
  })

  const restoreMutation = api.studio.restoreEpisode.useMutation({
    onSuccess: () => void refetch(),
  })

  const deleteMutation = api.studio.deleteEpisode.useMutation({
    onSuccess: () => void refetch(),
  })

  const updateEpisodeMutation = api.studio.updateEpisode.useMutation({
    onSuccess: () => void refetch(),
  })

  const handleCreateEpisode = () => {
    if (!project?.id) return
    createMutation.mutate({
      projectId: project.id,
      title: newEpisodeTitle.trim() || undefined,
    })
  }

  const handleArchive = (episodeId: string) => {
    archiveMutation.mutate({ episodeId })
  }

  const handleRestore = (episodeId: string) => {
    restoreMutation.mutate({ episodeId })
  }

  const handleDelete = (episodeId: string, episodeTitle: string) => {
    if (!confirm(`确定要删除"${episodeTitle}"吗?这将删除所有相关镜头数据。`)) return
    deleteMutation.mutate({ episodeId })
  }

  const handleOpenEpisode = (episodeId: string) => {
    router.push(`/admin/ai-generation/studio/${slug}/${episodeId}`)
  }

  const handleStartEdit = (episodeId: string, currentTitle: string, episodeNumber: number) => {
    setEditingEpisodeId(episodeId)
    setEditingTitle(currentTitle || `第 ${episodeNumber} 集`)
  }

  const handleSaveTitle = (episodeId: string) => {
    if (editingTitle.trim()) {
      updateEpisodeMutation.mutate({
        episodeId,
        title: editingTitle.trim(),
      })
    }
    setEditingEpisodeId(null)
  }

  const handleCancelEdit = () => {
    setEditingEpisodeId(null)
    setEditingTitle('')
  }

  // 自动聚焦输入框
  useEffect(() => {
    if (editingEpisodeId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingEpisodeId])

  if (!project) {
    return (
      <div className="container mx-auto p-3">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-3 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/ai-generation/studio')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-gray-500 mt-1">{project.description}</p>
          )}
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新建集
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">状态筛选:</span>
        <div className="flex gap-2">
          <Button
            variant={selectedStatus === undefined ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStatus(undefined)}
          >
            全部
          </Button>
          {(['draft', 'in-progress', 'completed', 'archived'] as EpisodeStatus[]).map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(status)}
            >
              {STATUS_LABELS[status]}
            </Button>
          ))}
        </div>
      </div>

      {/* Episodes List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {episodesData?.episodes.map((episode) => (
          <Card
            key={episode.id}
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer relative group"
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[episode.status as EpisodeStatus]}`}>
                {STATUS_LABELS[episode.status as EpisodeStatus]}
              </span>
            </div>

            <div className="space-y-4 pr-20">
              {/* Episode Number */}
              <div className="flex items-center gap-2">
                <div 
                  className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center cursor-pointer"
                  onClick={() => handleOpenEpisode(episode.id)}
                >
                  <span className="text-white font-bold">#{episode.episodeNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {editingEpisodeId === episode.id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveTitle(episode.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveTitle(episode.id)
                        } else if (e.key === 'Escape') {
                          handleCancelEdit()
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-lg w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <h3 
                      className="font-semibold text-lg truncate cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit(episode.id, episode.title || '', episode.episodeNumber)
                      }}
                    >
                      {episode.title || `第 ${episode.episodeNumber} 集`}
                    </h3>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div 
                className="flex items-center gap-4 text-sm text-gray-500 cursor-pointer"
                onClick={() => handleOpenEpisode(episode.id)}
              >
                <div className="flex items-center gap-1">
                  <Film className="h-4 w-4" />
                  <span>{episode._count.shots} 镜头</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(episode.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              {episode.status !== 'archived' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleArchive(episode.id)
                  }}
                  className="p-2 hover:bg-purple-50 rounded"
                  title="归档"
                >
                  <Archive className="h-4 w-4 text-purple-500" />
                </button>
              )}
              {episode.status === 'archived' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRestore(episode.id)
                  }}
                  className="p-2 hover:bg-green-50 rounded"
                  title="恢复"
                >
                  <RotateCcw className="h-4 w-4 text-green-500" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(episode.id, episode.title || `第 ${episode.episodeNumber} 集`)
                }}
                className="p-2 hover:bg-red-50 rounded"
                title="删除"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </Card>
        ))}

        {/* Empty State */}
        {episodesData?.episodes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <Film className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedStatus ? `没有${STATUS_LABELS[selectedStatus]}的集` : '还没有集'}
            </h3>
            <p className="text-gray-500 mb-4">创建第一集开始制作短片</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              新建集
            </Button>
          </div>
        )}
      </div>

      {/* Create Episode Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标题(可选)</label>
              <input
                type="text"
                value={newEpisodeTitle}
                onChange={(e) => setNewEpisodeTitle(e.target.value)}
                placeholder="如: Lesson 1: Coffee Shop"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !createMutation.isPending) {
                    handleCreateEpisode()
                  }
                }}
              />
              <p className="text-xs text-gray-500">留空将自动生成序号</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateEpisode} disabled={createMutation.isPending}>
                {createMutation.isPending ? '创建中...' : '创建'}
              </Button>
            </div>

            {createMutation.error && (
              <p className="text-sm text-red-600">{createMutation.error.message}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
