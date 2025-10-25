"use client"

export const dynamic = 'force-dynamic'

/**
 * Studio Main Page
 *
 * AI 短片制作工作流选择和项目管理页面
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Folder, Film, Trash2, Settings } from 'lucide-react'
import { api } from '~/components/providers/trpc-provider'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

export default function StudioPage() {
  const router = useRouter()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectSlug, setNewProjectSlug] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')

  // 查询项目列表
  const { data: projects, refetch } = api.studio.listProjects.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  // 创建项目 mutation
  const createMutation = api.studio.createProject.useMutation({
    onSuccess: () => {
      setCreateDialogOpen(false)
      setNewProjectName('')
      setNewProjectSlug('')
      setNewProjectDescription('')
      void refetch()
    },
  })

  // 删除项目 mutation
  const deleteMutation = api.studio.deleteProject.useMutation({
    onSuccess: () => {
      void refetch()
    },
  })

  const handleCreateProject = () => {
    if (!newProjectName.trim() || !newProjectSlug.trim()) return

    createMutation.mutate({
      name: newProjectName,
      slug: newProjectSlug,
      description: newProjectDescription || undefined,
    })
  }

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (!confirm(`确定要删除项目"${projectName}"吗?这将删除所有相关数据。`)) return
    deleteMutation.mutate({ projectId })
  }

  return (
    <div className="container mx-auto p-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Studio</h1>
          <p className="text-gray-500 mt-1">AI 短片制作工作流系统</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新建项目
        </Button>
      </div>

      {/* 项目列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <Card
            key={project.id}
            className="p-4 hover:shadow-lg transition-shadow cursor-pointer relative group"
          >
            {/* 删除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteProject(project.id, project.name)
              }}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>

            <div
              onClick={() => router.push(`/admin/ai-generation/studio/${project.slug}`)}
              className="space-y-4"
            >
              {/* 项目图标 */}
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Film className="h-6 w-6 text-white" />
              </div>

              {/* 项目信息 */}
              <div>
                <h3 className="font-semibold text-lg">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>

              {/* 统计信息 */}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Folder className="h-4 w-4" />
                  <span>{project._count.episodes} 集</span>
                </div>
                <div className="flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  <span>{project._count.characters} 角色</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* 空状态 */}
        {projects?.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <Film className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">还没有项目</h3>
            <p className="text-gray-500 mb-4">创建你的第一个短片制作工作流项目</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              新建项目
            </Button>
          </div>
        )}
      </div>

      {/* 创建项目对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建工作流项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">项目名称 *</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="如: 英语对话教学"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">标识符 *</label>
              <input
                type="text"
                value={newProjectSlug}
                onChange={(e) => setNewProjectSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="如: english-dialog"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-xs text-gray-500">只能包含小写字母、数字和连字符</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">描述(可选)</label>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
                placeholder="描述这个工作流的用途..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || !newProjectSlug.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? '创建中...' : '创建项目'}
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
