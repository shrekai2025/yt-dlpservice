/**
 * 视觉优化 Tab 组件
 * 使用LLM优化视觉提示词
 */

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Save, RefreshCw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { api } from '~/components/providers/trpc-provider'

// 默认强化Prompt
const DEFAULT_ENHANCEMENT_PROMPT = `你是一个尽职尽责的静态视觉(图片)提示词优化专家，将抽象的感觉表达转化为具象的视觉表达，职责是将非静态的词汇转化为静态词汇。

我会在后面给你一个json数据，你把每一个需要优化的字段优化之后，按照原来的格式返回json数据，禁止在json体之外增加描述性内容，禁止更改json体格式，不需要改的字段就原样返回。

优化工作原则：
**视觉化**
- 抽象概念转化为具象表达：奇幻场景->奇幻场景（天上有粉色的云彩），注意当前场景是否在室外，如果场景看不到天空，就换其他的联想，例如房间内飘着气球和棉花糖。
- 表情解释：惊讶->惊讶（眼睛睁大，眉毛挑高，嘴巴微张）
- 细致描写：绿色品牌围裙->有绿色底色点缀白色小花和橙色包边的短款围裙。
- 捋顺表达：站在一个光线明亮的食物柜台后面->在光线明亮的食品店，站在一个展示着带包装的蔬菜的食物柜台后面。
**剔除无关要素**
- 剔除不该出现在画面中的物品名词，避免生成图像时产生干扰：角色朝左边面对同事说话->角色朝左边，注视着左边说话；看向镜头->直视前方

**动作过程转瞬间**
- 将过程性需要一段时间完成的动作转为瞬时状态描述：向前奔跑了一段距离->准备奔跑，微微躬身，手臂摆好姿势`

type Props = {
  episodeId: string
  episodeType: string
  onSave?: () => void
}

type LLMResponse = {
  styleSettings?: string
  characters?: Array<{
    name: string
    appearance?: string
    environment?: string
  }>
  shots?: Array<{
    shotNumber: number
    bodyOrientation?: string
    faceDirection?: string
    expression?: string
    action?: string
    cameraMovement?: string
    framing?: string
    sceneDescription?: string
    soundEffect?: string
  }>
}

export function VisualPromptTab({ episodeId, episodeType, onSave }: Props) {
  const [enhancementPrompt, setEnhancementPrompt] = useState(DEFAULT_ENHANCEMENT_PROMPT)
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [llmResponse, setLlmResponse] = useState<LLMResponse | null>(null)

  // UI state
  const [expandedSections, setExpandedSections] = useState<{
    global: boolean
    characters: boolean
    shots: boolean
  }>({
    global: true,
    characters: true,
    shots: true,
  })
  const [expandedShots, setExpandedShots] = useState<Set<number>>(new Set())

  // 查询episode数据
  const { data: episode, refetch: refetchEpisode } = api.studio.getEpisode.useQuery(
    { episodeId },
    { refetchOnWindowFocus: false }
  )

  // 查询角色列表
  const { data: characters } = api.studio.listCharacters.useQuery(
    { projectId: episode?.project.id ?? '', episodeId },
    { enabled: !!episode?.project.id }
  )

  // 从episode中获取shots
  const shots = episode?.shots || []

  // 查询LLM提供商
  const { data: providers } = api.chat.listProviders.useQuery()

  // Mutations
  const updateEpisodeMutation = api.studio.updateEpisode.useMutation({
    onSuccess: () => {
      void refetchEpisode()
      onSave?.()
    },
  })

  const updateCharacterMutation = api.studio.updateCharacter.useMutation({
    onSuccess: () => {
      void refetchEpisode()
      onSave?.()
    },
  })

  const updateShotMutation = api.studio.updateShot.useMutation({
    onSuccess: () => {
      void refetchEpisode()
      onSave?.()
    },
  })

  const sendMessageMutation = api.chat.sendMessage.useMutation()

  // 从localStorage加载保存的数据和配置
  useEffect(() => {
    const savedPrompt = localStorage.getItem(`visual-prompt-enhancement-${episodeId}`)
    if (savedPrompt) {
      setEnhancementPrompt(savedPrompt)
    }

    const savedResponse = localStorage.getItem(`visual-prompt-response-${episodeId}`)
    if (savedResponse) {
      try {
        setLlmResponse(JSON.parse(savedResponse) as LLMResponse)
      } catch (e) {
        console.error('Failed to parse saved LLM response:', e)
      }
    }

    const savedProvider = localStorage.getItem(`visual-prompt-provider-${episodeId}`)
    const savedModel = localStorage.getItem(`visual-prompt-model-${episodeId}`)
    if (savedProvider) setSelectedProvider(savedProvider)
    if (savedModel) setSelectedModel(savedModel)
  }, [episodeId])

  // 保存enhancementPrompt到localStorage
  useEffect(() => {
    localStorage.setItem(`visual-prompt-enhancement-${episodeId}`, enhancementPrompt)
  }, [enhancementPrompt, episodeId])

  // 保存provider和model选择
  useEffect(() => {
    if (selectedProvider) {
      localStorage.setItem(`visual-prompt-provider-${episodeId}`, selectedProvider)
    }
  }, [selectedProvider, episodeId])

  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem(`visual-prompt-model-${episodeId}`, selectedModel)
    }
  }, [selectedModel, episodeId])

  // Debug: 打印shots数据
  useEffect(() => {
    console.log('[VisualPromptTab] Episode data:', episode)
    console.log('[VisualPromptTab] Shots data:', shots)
    console.log('[VisualPromptTab] Shots length:', shots?.length)
    console.log('[VisualPromptTab] Episode type:', episodeType)
  }, [episode, shots, episodeType])

  // 从objective中提取styleSettings
  const getStyleSettings = (): string => {
    if (!episode?.objective) return ''
    try {
      const jsonStr = extractJsonFromString(episode.objective)
      const data = JSON.parse(jsonStr) as { styleSettings?: string }
      return data.styleSettings || ''
    } catch (e) {
      return ''
    }
  }

  // 提取JSON字符串
  const extractJsonFromString = (str: string): string => {
    const firstBrace = str.indexOf('{')
    const lastBrace = str.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      return str
    }
    return str.substring(firstBrace, lastBrace + 1)
  }

  // 构建发送给LLM的JSON数据
  const buildInputJson = (): string => {
    const inputData: any = {
      styleSettings: getStyleSettings(),
      characters: characters?.map(char => ({
        name: char.name,
        appearance: char.appearancePrompt || '',
        environment: char.description || '',
      })) || [],
      shots: shots?.map((shot: any) => {
        const shotData: any = {
          shotNumber: shot.shotNumber,
        }

        // 根据episodeType添加相应字段
        if (episodeType === 'TYPE01' || episodeType === 'TYPE02') {
          shotData.action = shot.action || ''
        }

        if (episodeType === 'TYPE02') {
          shotData.sceneDescription = shot.sceneDescription || ''
          shotData.soundEffect = shot.soundEffect || ''
        }

        if (episodeType === 'TYPE03') {
          shotData.framing = shot.framing || ''
          shotData.bodyOrientation = shot.bodyOrientation || ''
          shotData.faceDirection = shot.faceDirection || ''
          shotData.expression = shot.expression || ''
          shotData.action = shot.action || ''
          shotData.cameraMovement = shot.cameraMovement || ''
        }

        return shotData
      }) || [],
    }

    return JSON.stringify(inputData, null, 2)
  }

  // LLM处理
  const handleLLMProcess = async () => {
    if (!selectedProvider || !selectedModel) {
      alert('请选择LLM提供商和模型')
      return
    }

    setIsProcessing(true)
    try {
      const inputJson = buildInputJson()
      const fullPrompt = `${enhancementPrompt}\n\n${inputJson}`

      const response = await sendMessageMutation.mutateAsync({
        provider: selectedProvider,
        model: selectedModel,
        message: fullPrompt,
        systemInstruction: '',
      })

      // 解析LLM返回的JSON
      const jsonStr = extractJsonFromString(response.reply)
      const parsedResponse = JSON.parse(jsonStr) as LLMResponse

      setLlmResponse(parsedResponse)

      // 保存到localStorage
      localStorage.setItem(`visual-prompt-response-${episodeId}`, JSON.stringify(parsedResponse))

      alert('LLM处理完成')
    } catch (error) {
      console.error('LLM processing error:', error)
      alert(`LLM处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // 临时保存（已通过localStorage自动保存）
  const handleTempSave = () => {
    if (!llmResponse) {
      alert('暂无LLM返回数据')
      return
    }
    localStorage.setItem(`visual-prompt-response-${episodeId}`, JSON.stringify(llmResponse))
    alert('已保存到本地缓存')
  }

  // 全部替换
  const handleReplaceAll = async () => {
    if (!llmResponse) {
      alert('暂无LLM返回数据')
      return
    }

    if (!confirm('确定要用LLM返回值替换所有字段吗？此操作会更新数据库。')) {
      return
    }

    try {
      // 更新styleSettings（在objective中）
      if (llmResponse.styleSettings && episode?.objective) {
        try {
          const jsonStr = extractJsonFromString(episode.objective)
          const objectiveData = JSON.parse(jsonStr)
          objectiveData.styleSettings = llmResponse.styleSettings

          await updateEpisodeMutation.mutateAsync({
            episodeId,
            objective: JSON.stringify(objectiveData, null, 2),
          })
        } catch (e) {
          console.error('Failed to update styleSettings:', e)
        }
      }

      // 更新characters
      if (llmResponse.characters && characters) {
        for (const llmChar of llmResponse.characters) {
          const char = characters.find(c => c.name === llmChar.name)
          if (char) {
            await updateCharacterMutation.mutateAsync({
              characterId: char.id,
              appearancePrompt: llmChar.appearance || char.appearancePrompt || undefined,
              description: llmChar.environment || char.description || undefined,
            })
          }
        }
      }

      // 更新shots
      if (llmResponse.shots && shots) {
        for (const llmShot of llmResponse.shots) {
          const shot = shots.find((s: any) => s.shotNumber === llmShot.shotNumber)
          if (shot) {
            const updateData: any = {
              shotId: shot.id,
            }

            // 根据episodeType更新相应字段
            if (episodeType === 'TYPE01' || episodeType === 'TYPE02') {
              if (llmShot.action !== undefined) updateData.action = llmShot.action
            }

            if (episodeType === 'TYPE02') {
              if (llmShot.sceneDescription !== undefined) updateData.sceneDescription = llmShot.sceneDescription
              if (llmShot.soundEffect !== undefined) updateData.soundEffect = llmShot.soundEffect
            }

            if (episodeType === 'TYPE03') {
              if (llmShot.framing !== undefined) updateData.framing = llmShot.framing
              if (llmShot.bodyOrientation !== undefined) updateData.bodyOrientation = llmShot.bodyOrientation
              if (llmShot.faceDirection !== undefined) updateData.faceDirection = llmShot.faceDirection
              if (llmShot.expression !== undefined) updateData.expression = llmShot.expression
              if (llmShot.action !== undefined) updateData.action = llmShot.action
              if (llmShot.cameraMovement !== undefined) updateData.cameraMovement = llmShot.cameraMovement
            }

            // 重新构建promptText
            updateData.promptText = buildPromptText(shot, updateData)

            await updateShotMutation.mutateAsync(updateData)
          }
        }
      }

      alert('全部替换完成')
      void refetchEpisode()
    } catch (error) {
      console.error('Replace all error:', error)
      alert(`替换失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 构建promptText（根据episodeType）
  const buildPromptText = (originalShot: any, updates: any): string => {
    const styleSettings = getStyleSettings()

    if (episodeType === 'TYPE03') {
      const parts = [
        updates.styleSettings ?? styleSettings,
        updates.framing ?? originalShot.framing,
        updates.cameraMovement ?? originalShot.cameraMovement,
        updates.bodyOrientation ?? originalShot.bodyOrientation,
        updates.faceDirection ?? originalShot.faceDirection,
        updates.expression ?? originalShot.expression,
        updates.action ?? originalShot.action,
        originalShot.dialogue ? `说"${originalShot.dialogue}"` : '',
      ].filter(Boolean)
      return parts.join('\n')
    }

    if (episodeType === 'TYPE02') {
      const parts = [
        updates.styleSettings ?? styleSettings,
        updates.action ?? originalShot.action,
        updates.sceneDescription ?? originalShot.sceneDescription,
        updates.soundEffect ?? originalShot.soundEffect,
        originalShot.dialogue ? `说"${originalShot.dialogue}"` : '',
      ].filter(Boolean)
      return parts.join('\n')
    }

    // TYPE01
    const appearance = characters?.find(c =>
      originalShot.characters?.some((sc: any) => sc.characterId === c.id)
    )?.appearancePrompt || ''

    const environment = characters?.find(c =>
      originalShot.characters?.some((sc: any) => sc.characterId === c.id)
    )?.description || ''

    const parts = [
      updates.styleSettings ?? styleSettings,
      '角色',
      appearance,
      '摄像机拍摄微微侧面',
      environment,
      updates.action ?? originalShot.action,
      originalShot.dialogue ? `说"${originalShot.dialogue}"` : '',
    ].filter(Boolean)

    return parts.join(' ')
  }

  // Toggle section
  const toggleSection = (section: 'global' | 'characters' | 'shots') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Toggle shot
  const toggleShot = (shotNumber: number) => {
    setExpandedShots(prev => {
      const newSet = new Set(prev)
      if (newSet.has(shotNumber)) {
        newSet.delete(shotNumber)
      } else {
        newSet.add(shotNumber)
      }
      return newSet
    })
  }

  // Toggle all shots
  const toggleAllShots = () => {
    if (expandedShots.size === shots?.length) {
      setExpandedShots(new Set())
    } else {
      setExpandedShots(new Set(shots?.map((s: any) => s.shotNumber) || []))
    }
  }

  const currentProvider = providers?.find(p => p.provider === selectedProvider)

  return (
    <div className="space-y-4 p-4">
      {/* Header with buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">视觉Prompt强化</h2>
        <div className="flex gap-2">
          <Button onClick={handleTempSave} variant="outline" size="sm">
            <Save className="h-4 w-4 mr-1" />
            临时保存
          </Button>
          <Button onClick={handleReplaceAll} size="sm">
            全部替换
          </Button>
        </div>
      </div>

      {/* Enhancement Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium">强化Prompt</label>
        <textarea
          value={enhancementPrompt}
          onChange={(e) => setEnhancementPrompt(e.target.value)}
          rows={8}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
        />
      </div>

      {/* LLM Provider Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">LLM提供商</label>
          <select
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value)
              setSelectedModel('')
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">选择提供商</option>
            {providers?.map((provider) => (
              <option key={provider.provider} value={provider.provider}>
                {provider.provider}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">模型</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedProvider}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
          >
            <option value="">选择模型</option>
            {currentProvider?.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* LLM Process Button */}
      <Button
        onClick={handleLLMProcess}
        disabled={isProcessing || !selectedProvider || !selectedModel}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            正在处理...
          </>
        ) : (
          'LLM处理'
        )}
      </Button>

      <div className="border-t pt-4 space-y-3">
        {/* Global Section */}
        <div className="border rounded-md">
          <div
            className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => toggleSection('global')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.global ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium text-sm">全局</span>
            </div>
          </div>

          {expandedSections.global && (
            <div className="p-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">styleSettings</label>
                <input
                  type="text"
                  value={getStyleSettings()}
                  readOnly
                  className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50"
                />
                {llmResponse?.styleSettings && (
                  <div className="mt-1 px-2 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded">
                    {llmResponse.styleSettings}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Characters Section */}
        <div className="border rounded-md">
          <div
            className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => toggleSection('characters')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.characters ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium text-sm">角色</span>
            </div>
          </div>

          {expandedSections.characters && (
            <div className="p-3 space-y-4">
              {characters?.map((char) => {
                const llmChar = llmResponse?.characters?.find(c => c.name === char.name)
                return (
                  <div key={char.id} className="space-y-2 pb-3 border-b last:border-b-0">
                    <div>
                      <label className="text-xs font-medium text-gray-600">name</label>
                      <input
                        type="text"
                        value={char.name}
                        readOnly
                        className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-100"
                      />
                    </div>

                    {(episodeType === 'TYPE01' || episodeType === 'TYPE02') && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-gray-600">appearance</label>
                          <input
                            type="text"
                            value={char.appearancePrompt || ''}
                            readOnly
                            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50"
                          />
                          {llmChar?.appearance && (
                            <div className="mt-1 px-2 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded">
                              {llmChar.appearance}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-600">environment</label>
                          <input
                            type="text"
                            value={char.description || ''}
                            readOnly
                            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50"
                          />
                          {llmChar?.environment && (
                            <div className="mt-1 px-2 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded">
                              {llmChar.environment}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Shots Section */}
        <div className="border rounded-md">
          <div
            className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => toggleSection('shots')}
          >
            <div className="flex items-center gap-2">
              {expandedSections.shots ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium text-sm">镜头 {shots && shots.length > 0 ? `(${shots.length})` : ''}</span>
            </div>
            {expandedSections.shots && shots && shots.length > 0 && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleAllShots()
                }}
                variant="outline"
                size="sm"
              >
                {expandedShots.size === shots.length ? '全部收起' : '全部展开'}
              </Button>
            )}
          </div>

          {expandedSections.shots && (
            <div className="divide-y">
              {!shots || shots.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  暂无镜头数据。请先在"设定+脚本"Tab中同步镜头。
                </div>
              ) : (
                <>
                  {expandedShots.size === 0 && (
                    <div className="p-3 text-center text-xs text-blue-600 bg-blue-50 border-b border-blue-100">
                      💡 提示：点击右上角"全部展开"按钮或单击镜头标题查看字段详情
                    </div>
                  )}
                  {shots.map((shot: any) => {
                  const llmShot = llmResponse?.shots?.find(s => s.shotNumber === shot.shotNumber)
                  const isExpanded = expandedShots.has(shot.shotNumber)

                  return (
                  <div key={shot.id}>
                    <div
                      className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleShot(shot.shotNumber)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">镜头 {shot.shotNumber}</span>
                      </div>
                      {!isExpanded && (
                        <span className="text-xs text-gray-400">点击展开</span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-3 space-y-2 bg-gray-50">
                        {/* TYPE03 fields */}
                        {episodeType === 'TYPE03' && (
                          <>
                            <FieldRow label="framing" value={shot.framing || ''} llmValue={llmShot?.framing} />
                            <FieldRow label="bodyOrientation" value={shot.bodyOrientation || ''} llmValue={llmShot?.bodyOrientation} />
                            <FieldRow label="faceDirection" value={shot.faceDirection || ''} llmValue={llmShot?.faceDirection} />
                            <FieldRow label="expression" value={shot.expression || ''} llmValue={llmShot?.expression} />
                            <FieldRow label="action" value={shot.action || ''} llmValue={llmShot?.action} />
                            <FieldRow label="cameraMovement" value={shot.cameraMovement || ''} llmValue={llmShot?.cameraMovement} />
                          </>
                        )}

                        {/* TYPE01 and TYPE02 fields */}
                        {(episodeType === 'TYPE01' || episodeType === 'TYPE02') && (
                          <FieldRow label="action" value={shot.action || ''} llmValue={llmShot?.action} />
                        )}

                        {/* TYPE02 specific fields */}
                        {episodeType === 'TYPE02' && (
                          <>
                            <FieldRow label="sceneDescription" value={shot.sceneDescription || ''} llmValue={llmShot?.sceneDescription} />
                            <FieldRow label="soundEffect" value={shot.soundEffect || ''} llmValue={llmShot?.soundEffect} />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  )
                })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Field row component
function FieldRow({ label, value, llmValue }: { label: string; value: string; llmValue?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        readOnly
        className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-300 rounded bg-white"
      />
      {llmValue && (
        <div className="mt-1 px-2 py-1.5 text-sm bg-blue-50 border border-blue-200 rounded">
          {llmValue}
        </div>
      )}
    </div>
  )
}
