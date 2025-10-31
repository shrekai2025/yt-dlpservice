/**
 * 角色 Tab 组件
 * 角色管理
 */

import { useState } from 'react'
import { Plus, User, RefreshCw, Trash2, Upload, Link, Sparkles, ArrowLeft } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { api } from '~/components/providers/trpc-provider'
import { toast } from '~/components/ui/toast'

type Props = {
  episodeId: string
  projectId: string
  setting?: any
  onSave?: () => void
  onBackToShots?: () => void
}

export function SettingTab({ episodeId, projectId, setting, onSave, onBackToShots }: Props) {
  // 角色管理状态
  const [showCreateCharacter, setShowCreateCharacter] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [showLinkActorDialog, setShowLinkActorDialog] = useState(false)
  const [linkingCharacterId, setLinkingCharacterId] = useState<string | null>(null)

  // 查询角色列表（只显示当前集的角色）
  const { data: characters, refetch: refetchCharacters } = api.studio.listCharacters.useQuery(
    { projectId, episodeId },
    { refetchOnWindowFocus: false }
  )

  // 查询演员表(用于导入和关联)
  const { data: actors } = api.mediaBrowser.listActors.useQuery(undefined, {
    enabled: showImportDialog || showLinkActorDialog,
  })

  // Mutations
  const createCharacterMutation = api.studio.createCharacter.useMutation({
    onSuccess: () => {
      void refetchCharacters()
      setShowCreateCharacter(false)
    },
  })

  const importCharacterMutation = api.studio.importCharacterFromActor.useMutation({
    onSuccess: () => {
      void refetchCharacters()
      setShowImportDialog(false)
    },
  })

  const syncCharacterMutation = api.studio.syncCharacterFromActor.useMutation({
    onSuccess: () => void refetchCharacters(),
  })

  const deleteCharacterMutation = api.studio.deleteCharacter.useMutation({
    onSuccess: () => void refetchCharacters(),
  })

  const linkCharacterMutation = api.studio.linkCharacterToActor.useMutation({
    onSuccess: () => void refetchCharacters(),
  })

  const extractCharactersMutation = api.studio.extractCharactersFromObjective.useMutation({
    onSuccess: (data) => {
      console.log('[SettingTab] Extract characters success:', data)
      void refetchCharacters()
      if (data.created > 0 || (data.updated && data.updated > 0)) {
        toast.success(`已提取 ${data.characters.length} 个角色（新建 ${data.created} 个，更新 ${data.updated ?? 0} 个）`)
      } else {
        toast.success(`提取完成，共 ${data.characters.length} 个角色`)
      }
    },
    onError: (error) => {
      console.error('[SettingTab] Extract characters error:', error)
      toast.error(`提取角色失败: ${error.message}`)
    },
  })

  const handleExtractCharacters = () => {
    if (!confirm('从核心目标提取角色？这会根据目标确定中的JSON数据创建或更新角色。')) return
    extractCharactersMutation.mutate({ episodeId })
  }

  return (
    <div className="space-y-8">
      {/* 角色管理 */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button onClick={onBackToShots} variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回镜头表
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExtractCharacters}
                className="gap-2"
                disabled={extractCharactersMutation.isPending}
              >
                <Sparkles className="h-4 w-4" />
                {extractCharactersMutation.isPending ? '提取中...' : '从核心目标提取'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                从演员表导入
              </Button>
              <Button size="sm" onClick={() => setShowCreateCharacter(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                新建角色
              </Button>
            </div>
          </div>

          {/* 角色列表 */}
          <div className="grid grid-cols-3 gap-4">
            {characters?.map((char) => (
              <div
                key={char.id}
                className="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                onClick={() => setSelectedCharacter(char.id === selectedCharacter ? null : char.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                    {char.referenceImage ? (
                      <img src={char.referenceImage} alt={char.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{char.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{char.description || '无描述'}</p>
                    <div className="mt-2 flex gap-2 items-center flex-wrap">
                      {char.sourceEpisodeId && (char as any).sourceEpisode && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          同步自{(char as any).sourceEpisode.title || `第${(char as any).sourceEpisode.episodeNumber}集`}
                        </span>
                      )}
                      {char.sourceActorId ? (
                        <>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                            <Link className="h-3 w-3" />
                            已关联演员
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              syncCharacterMutation.mutate({ characterId: char.id })
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            title="从演员表同步最新数据"
                          >
                            <RefreshCw className="h-3 w-3" />
                            同步
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('确定要取消关联演员吗？')) {
                                linkCharacterMutation.mutate({ characterId: char.id, actorId: null })
                              }
                            }}
                            className="text-xs text-gray-600 hover:text-gray-700"
                          >
                            取消关联
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setLinkingCharacterId(char.id)
                            setShowLinkActorDialog(true)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Link className="h-3 w-3" />
                          关联演员
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteCharacterMutation.mutate({ characterId: char.id })
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {selectedCharacter === char.id && (
                  <div className="mt-3 pt-3 border-t text-xs space-y-2">
                    <div>
                      <span className="font-medium">Appearance:</span>
                      <p className="text-gray-600 mt-1">{char.appearancePrompt || '未设置'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {characters?.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>还没有角色</p>
                <p className="text-sm">从演员表导入或手动创建角色</p>
              </div>
            )}
          </div>
        </div>

      {/* 导入演员对话框 - 简化版,完整实现需要单独组件 */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">从演员表导入</h3>
            <div className="space-y-2 mb-4">
              {actors?.map((actor) => (
                <button
                  key={actor.id}
                  onClick={() => {
                    importCharacterMutation.mutate({
                      projectId,
                      actorId: actor.id,
                    })
                  }}
                  className="w-full flex items-center gap-3 p-3 border rounded hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {actor.avatarUrl ? (
                      <img src={actor.avatarUrl} alt={actor.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{actor.name}</div>
                    <div className="text-sm text-gray-500">{actor.bio || '无简介'}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 关联演员对话框 */}
      {showLinkActorDialog && linkingCharacterId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">选择要关联的演员</h3>
            <div className="space-y-2 mb-4">
              {actors?.map((actor) => (
                <button
                  key={actor.id}
                  onClick={() => {
                    linkCharacterMutation.mutate({
                      characterId: linkingCharacterId,
                      actorId: actor.id,
                    })
                    setShowLinkActorDialog(false)
                    setLinkingCharacterId(null)
                  }}
                  className="w-full flex items-center gap-3 p-3 border rounded hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {actor.avatarUrl ? (
                      <img src={actor.avatarUrl} alt={actor.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{actor.name}</div>
                    <div className="text-sm text-gray-500">{actor.bio || '无简介'}</div>
                  </div>
                </button>
              ))}
              {(!actors || actors.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>没有可用的演员</p>
                  <p className="text-sm">请先在媒体浏览器中创建演员</p>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLinkActorDialog(false)
                  setLinkingCharacterId(null)
                }}
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 创建角色对话框 - 简化版 */}
      {showCreateCharacter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">新建角色</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">角色名称</label>
                <input
                  type="text"
                  id="newCharName"
                  placeholder="如: Alice"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">描述</label>
                <textarea
                  id="newCharDesc"
                  rows={3}
                  placeholder="角色描述..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Appearance Prompt</label>
                <textarea
                  id="newCharAppearance"
                  rows={2}
                  placeholder="如: friendly female teacher, 30s, professional casual"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateCharacter(false)}>
                  取消
                </Button>
                <Button
                  onClick={() => {
                    const name = (document.getElementById('newCharName') as HTMLInputElement).value
                    const desc = (document.getElementById('newCharDesc') as HTMLTextAreaElement).value
                    const appearance = (document.getElementById('newCharAppearance') as HTMLTextAreaElement).value

                    if (name.trim()) {
                      createCharacterMutation.mutate({
                        projectId,
                        name: name.trim(),
                        description: desc.trim() || undefined,
                        appearancePrompt: appearance.trim() || undefined,
                      })
                    }
                  }}
                >
                  创建
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
