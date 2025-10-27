"use client"

export const dynamic = 'force-dynamic'

/**
 * Studio Episode Workflow Page
 * 工作流编辑页面 - 带Tab结构
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, FileText, Target, Settings, Film, Eye, User, Sparkles } from 'lucide-react'
import { api } from '~/components/providers/trpc-provider'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { RawInputTab } from '~/components/studio/RawInputTab'
import { ObjectiveTab } from '~/components/studio/ObjectiveTab'
import { SettingTab } from '~/components/studio/SettingTab'
import { VisualPromptTab } from '~/components/studio/VisualPromptTab'
import { ShotsTab } from '~/components/studio/ShotsTab'
import { PreviewTab } from '~/components/studio/PreviewTab'
import { DigitalHumanTab } from '~/components/studio/DigitalHumanTab'

type WorkflowTab = 'input' | 'objective' | 'setting' | 'visual' | 'shots' | 'digitalhuman' | 'preview'

const TABS: Array<{ id: WorkflowTab; label: string; icon: any }> = [
  { id: 'input', label: '概念', icon: FileText },
  { id: 'objective', label: '设定+脚本', icon: Target },
  { id: 'setting', label: '角色', icon: Settings },
  { id: 'visual', label: '视觉优化', icon: Sparkles },
  { id: 'shots', label: '镜头制作', icon: Film },
  { id: 'digitalhuman', label: '数字人合成', icon: User },
  { id: 'preview', label: '预览导出', icon: Eye },
]

export default function EpisodeWorkflowPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const episodeId = params.episodeId as string

  const [activeTab, setActiveTab] = useState<WorkflowTab>('input')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 查询集详情
  const { data: episode, isLoading, refetch } = api.studio.getEpisode.useQuery(
    { episodeId },
    {
      refetchOnWindowFocus: false,
    }
  )

  // 查询项目角色列表（只显示当前集的角色）
  const { data: characters } = api.studio.listCharacters.useQuery(
    { projectId: episode?.project.id ?? '', episodeId },
    { enabled: !!episode?.project.id }
  )

  // 自动保存状态到localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`studio-episode-${episodeId}-tab`)
    if (saved && TABS.some(t => t.id === saved)) {
      setActiveTab(saved as WorkflowTab)
    }
  }, [episodeId])

  useEffect(() => {
    localStorage.setItem(`studio-episode-${episodeId}-tab`, activeTab)
  }, [activeTab, episodeId])

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (!confirm('有未保存的更改,确定要离开吗?')) return
    }
    router.push(`/admin/ai-generation/studio/${slug}`)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-3">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!episode) {
    return (
      <div className="container mx-auto p-3">
        <div className="text-center py-12">
          <p className="text-red-500">集不存在</p>
          <Button onClick={handleBack} className="mt-4">返回</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 flex-shrink-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
            <div>
              <h1 className="text-lg font-bold">
                {episode.title || `第 ${episode.episodeNumber} 集`}
              </h1>
              <p className="text-xs text-gray-500">{episode.project.name}</p>
            </div>
          </div>

          {hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-orange-600">有未保存的更改</span>
              <Button size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                保存
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="px-4">
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-3 py-2 border-b-2 transition-colors
                    ${isActive
                      ? 'border-blue-500 text-blue-600 font-medium'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content - Full height with overflow */}
      <div className="flex-1 overflow-y-auto">
        <div className="h-full">
          {activeTab === 'input' && (
            <div className="h-full overflow-y-auto px-4 py-6">
              <div className="max-w-4xl mx-auto">
                <RawInputTab
                  episodeId={episodeId}
                  initialRawInput={episode.rawInput}
                  initialCorePoint={episode.corePoint}
                  onSave={() => {
                    setHasUnsavedChanges(false)
                    void refetch()
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'objective' && (
            <div className="h-full overflow-y-auto px-4 py-6">
              <div className="max-w-4xl mx-auto">
                <ObjectiveTab
                  episodeId={episodeId}
                  episodeType={episode.type}
                  initialObjective={episode.objective}
                  initialObjectiveLLM={episode.objectiveLLM}
                  initialSystemPrompt={episode.systemPrompt}
                  rawInput={episode.rawInput}
                  corePoint={episode.corePoint}
                  onSave={() => {
                    setHasUnsavedChanges(false)
                    void refetch()
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'setting' && (
            <div className="h-full overflow-y-auto px-4 py-6">
              <div className="max-w-6xl mx-auto">
                <SettingTab
                  episodeId={episodeId}
                  projectId={episode.project.id}
                  setting={episode.setting}
                  onSave={() => setHasUnsavedChanges(false)}
                />
              </div>
            </div>
          )}

          {activeTab === 'visual' && (
            <div className="h-full overflow-y-auto">
              <div className="max-w-6xl mx-auto">
                <VisualPromptTab
                  episodeId={episodeId}
                  episodeType={episode.type}
                  onSave={() => {
                    setHasUnsavedChanges(false)
                    void refetch()
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'shots' && (
            <div className="h-full px-4 py-4">
              <ShotsTab
                episodeId={episodeId}
                episodeType={episode.type || 'TYPE01'}
                projectId={episode.project.id}
                shots={episode.shots || []}
                characters={characters || []}
                setting={episode.setting}
                objective={episode.objective}
                onRefresh={() => void refetch()}
              />
            </div>
          )}

          {activeTab === 'digitalhuman' && (
            <div className="h-full overflow-y-auto px-4 py-6">
              <div className="max-w-6xl mx-auto">
                <DigitalHumanTab episodeId={episodeId} />
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="h-full overflow-y-auto px-4 py-6">
              <div className="max-w-7xl mx-auto">
                <PreviewTab
                  episode={episode}
                  shots={episode.shots || []}
                  setting={episode.setting}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
