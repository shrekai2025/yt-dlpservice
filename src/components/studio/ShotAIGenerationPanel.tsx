"use client"

import { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from 'react'
import { X, Upload, Link as LinkIcon, Edit2 } from 'lucide-react'
import { api } from '~/components/providers/trpc-provider'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/toast'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'
import { getModelParameters, type ParameterField } from '~/lib/ai-generation/config/model-parameters'
import { ShotTaskHistory, type TaskHistoryTask } from './ShotTaskHistory'

type OutputType = 'IMAGE' | 'VIDEO' | 'AUDIO'

type UploadedImage = {
  url: string
  name: string
}

interface ShotAIGenerationPanelProps {
  shotId: string
  onTaskCreated?: () => void
  sceneDescriptions?: Array<{ characterName: string; description: string }> | null
  hideTaskHistory?: boolean
  currentShot?: any // 当前镜头数据
}

export interface ShotAIGenerationPanelRef {
  applyTask: (task: TaskHistoryTask) => void
  convertToVideo: (imageUrl: string) => void
  addReferenceImage: (imageUrl: string) => void
}

interface CustomTemplate {
  id: string
  name: string
  template: string
}

export const ShotAIGenerationPanel = forwardRef<ShotAIGenerationPanelRef, ShotAIGenerationPanelProps>(
  function ShotAIGenerationPanel({ shotId, onTaskCreated, sceneDescriptions, hideTaskHistory = false, currentShot }, ref) {
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType>('IMAGE')
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [numberOfOutputs] = useState(1) // 固定为1，不允许修改
  const [parameters, setParameters] = useState<Record<string, unknown>>({})
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Custom templates state
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [templateContent, setTemplateContent] = useState('')

  // Load custom templates from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('shot-ai-custom-templates')
    if (saved) {
      try {
        const templates = JSON.parse(saved) as CustomTemplate[]
        setCustomTemplates(templates)
      } catch (e) {
        console.error('Failed to load custom templates:', e)
      }
    }
  }, [])

  // Save custom templates to localStorage whenever they change
  useEffect(() => {
    if (customTemplates.length > 0) {
      localStorage.setItem('shot-ai-custom-templates', JSON.stringify(customTemplates))
    }
  }, [customTemplates])

  const handleOpenTemplateModal = (template?: CustomTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setTemplateName(template.name)
      setTemplateContent(template.template)
    } else {
      setEditingTemplate(null)
      setTemplateName('')
      setTemplateContent('')
    }
    setShowTemplateModal(true)
  }

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) {
      toast.error('请填写名称和模板内容')
      return
    }

    if (editingTemplate) {
      // Update existing template
      setCustomTemplates(prev =>
        prev.map(t => t.id === editingTemplate.id
          ? { ...t, name: templateName.trim(), template: templateContent.trim() }
          : t
        )
      )
      toast.success('模板已更新')
    } else {
      // Create new template
      const newTemplate: CustomTemplate = {
        id: Date.now().toString(),
        name: templateName.trim(),
        template: templateContent.trim(),
      }
      setCustomTemplates(prev => [...prev, newTemplate])
      toast.success('模板已添加')
    }

    setShowTemplateModal(false)
    setTemplateName('')
    setTemplateContent('')
    setEditingTemplate(null)
  }

  const handleDeleteTemplate = (id: string) => {
    if (confirm('确定删除此模板？')) {
      setCustomTemplates(prev => prev.filter(t => t.id !== id))
      toast.success('模板已删除')
    }
  }

  const handleInsertVariable = (variable: string) => {
    setTemplateContent(prev => prev + `{{${variable}}}`)
  }

  // 预览模板内容的函数
  const previewTemplateContent = (template: string): string => {
    if (!currentShot || !template) {
      return template
    }

    // Replace variables with actual values from current shot
    let result = template

    // 通用字段
    result = result.replace(/\{\{shotNumber\}\}/g, currentShot.shotNumber?.toString() || '')

    // 全局样式设置（从 setting 中获取）
    result = result.replace(/\{\{styleSettings\}\}/g, currentShot.setting?.styleSettings || '')

    // 角色信息 - 取第一个角色
    const firstCharacter = currentShot.characters?.[0]
    if (firstCharacter?.character) {
      result = result.replace(/\{\{name\}\}/g, firstCharacter.character.name || '')
      result = result.replace(/\{\{appearance\}\}/g, firstCharacter.character.appearance || '')
      result = result.replace(/\{\{environment\}\}/g, firstCharacter.character.environment || '')
    } else {
      result = result.replace(/\{\{name\}\}/g, '')
      result = result.replace(/\{\{appearance\}\}/g, '')
      result = result.replace(/\{\{environment\}\}/g, '')
    }

    // TYPE02 字段
    result = result.replace(/\{\{shotSizeView\}\}/g, currentShot.shotSizeView || '')
    result = result.replace(/\{\{settingBackground\}\}/g, currentShot.settingBackground || '')
    result = result.replace(/\{\{compositionPosition\}\}/g, currentShot.compositionPosition || '')
    result = result.replace(/\{\{poseExpressionCostume\}\}/g, currentShot.poseExpressionCostume || '')

    // TYPE03 字段（在 shot 对象上）
    result = result.replace(/\{\{framing\}\}/g, currentShot.framing || '')
    result = result.replace(/\{\{bodyOrientation\}\}/g, currentShot.bodyOrientation || '')
    result = result.replace(/\{\{faceDirection\}\}/g, currentShot.faceDirection || '')
    result = result.replace(/\{\{cameraMovement\}\}/g, currentShot.cameraMovement || '')
    result = result.replace(/\{\{expression\}\}/g, currentShot.expression || '')
    result = result.replace(/\{\{action\}\}/g, currentShot.action || '')
    result = result.replace(/\{\{dialogue\}\}/g, currentShot.dialogue || '')

    // TYPE01 字段（在角色数组中）- 取第一个角色的动作和台词
    if (firstCharacter?.action) {
      result = result.replace(/\{\{characterAction\}\}/g, firstCharacter.action)
    } else {
      result = result.replace(/\{\{characterAction\}\}/g, '')
    }
    if (firstCharacter?.dialogue) {
      result = result.replace(/\{\{characterDialogue\}\}/g, firstCharacter.dialogue)
    } else {
      result = result.replace(/\{\{characterDialogue\}\}/g, '')
    }

    // 如果还有未替换的变量，移除它们
    result = result.replace(/\{\{[^}]+\}\}/g, '')

    return result
  }

  const handleApplyTemplate = (template: string) => {
    const result = previewTemplateContent(template)
    setPrompt(result)
  }

  // 计算模板预览
  const templatePreview = useMemo(() => {
    return previewTemplateContent(templateContent)
  }, [templateContent, currentShot])

  const { data: providersData } = api.aiGeneration.listProviders.useQuery(
    { isActive: true },
    { staleTime: 60000, refetchOnWindowFocus: false }
  )

  const { data: modelsData } = api.aiGeneration.listModels.useQuery(
    { outputType: selectedOutputType, isActive: true },
    { staleTime: 60000, refetchOnWindowFocus: false }
  )

  const generateMutation = api.aiGeneration.generate.useMutation({
    onSuccess: () => {
      setIsGenerating(false)
      setError(null)
      toast.success('任务已创建')
      onTaskCreated?.()
    },
    onError: (error) => {
      setIsGenerating(false)
      setError(error.message)
      toast.error(`生成失败: ${error.message}`)
    },
  })

  const availableProviders = useMemo(() => {
    if (!providersData || !modelsData) return []
    const providerIdsWithModels = new Set(modelsData.map((m) => m.provider.id))
    return providersData.filter((p) => providerIdsWithModels.has(p.id))
  }, [providersData, modelsData])

  const availableModels = useMemo(() => {
    if (!modelsData || !selectedProviderId) return []
    return modelsData.filter((m) => m.provider.id === selectedProviderId)
  }, [modelsData, selectedProviderId])

  // 获取选中的模型
  const selectedModel = useMemo(() => {
    return modelsData?.find((m) => m.id === selectedModelId)
  }, [modelsData, selectedModelId])

  // 获取模型参数配置
  const parameterFields = useMemo(() => {
    if (!selectedModel) return []
    return getModelParameters(selectedModel.slug)
  }, [selectedModel])

  // 检查模型是否支持图片输入
  const supportsImageInput = useMemo(() => {
    if (!selectedModel?.inputCapabilities) return false
    try {
      const capabilities = JSON.parse(selectedModel.inputCapabilities) as string[]
      return capabilities.includes('image-input')
    } catch {
      return false
    }
  }, [selectedModel])


  // 为每种输出类型保存供应商选择
  useEffect(() => {
    if (selectedProviderId) {
      localStorage.setItem(`shot-ai-${selectedOutputType}-provider-id`, selectedProviderId)
    }
  }, [selectedProviderId, selectedOutputType])

  // 为每种输出类型保存模型选择
  useEffect(() => {
    if (selectedModelId) {
      localStorage.setItem(`shot-ai-${selectedOutputType}-model-id`, selectedModelId)
    }
  }, [selectedModelId, selectedOutputType])

  // 切换输出类型时，恢复该类型之前保存的选择，或使用智能默认值
  useEffect(() => {
    if (!modelsData || !providersData) return

    setParameters({})

    // 尝试从localStorage恢复该输出类型的选择
    const savedProviderId = localStorage.getItem(`shot-ai-${selectedOutputType}-provider-id`)
    const savedModelId = localStorage.getItem(`shot-ai-${selectedOutputType}-model-id`)

    // 获取当前输出类型可用的供应商
    const providerIdsWithModels = new Set(modelsData.map((m) => m.provider.id))
    const availableProvidersForType = providersData.filter((p) => providerIdsWithModels.has(p.id))

    // 如果有保存的选择且仍然有效，使用保存的选择
    if (savedProviderId && availableProvidersForType.some(p => p.id === savedProviderId)) {
      setSelectedProviderId(savedProviderId)

      const modelsForProvider = modelsData.filter((m) => m.provider.id === savedProviderId)
      if (savedModelId && modelsForProvider.some(m => m.id === savedModelId)) {
        setSelectedModelId(savedModelId)
        return
      } else if (modelsForProvider.length > 0) {
        setSelectedModelId(modelsForProvider[0]!.id)
        return
      }
    }

    // 如果没有保存的有效选择，使用智能默认值
    if (selectedOutputType === 'IMAGE') {
      // 优先选择 KIE + nano banana edit
      const kieProvider = providersData.find(p => p.name.toLowerCase().includes('kie'))
      if (kieProvider) {
        const nanoBananaModel = modelsData.find(m =>
          m.provider.id === kieProvider.id &&
          (m.name.toLowerCase().includes('nano') || m.name.toLowerCase().includes('banana'))
        )
        if (nanoBananaModel) {
          setSelectedProviderId(kieProvider.id)
          setSelectedModelId(nanoBananaModel.id)
          return
        }
      }

      // 备选：即梦 + jimeng 4.0
      const jimengProvider = providersData.find(p => p.name.includes('即梦'))
      if (jimengProvider) {
        const jimeng4Model = modelsData.find(m =>
          m.provider.id === jimengProvider.id &&
          (m.name.includes('4.0') || m.apiIdentifier?.includes('v4'))
        )
        if (jimeng4Model) {
          setSelectedProviderId(jimengProvider.id)
          setSelectedModelId(jimeng4Model.id)
          return
        }
      }
    }

    // 如果都没有，选择第一个可用的供应商和模型
    if (availableProvidersForType.length > 0) {
      const firstProvider = availableProvidersForType[0]!
      setSelectedProviderId(firstProvider.id)
      const firstModel = modelsData.find(m => m.provider.id === firstProvider.id)
      if (firstModel) {
        setSelectedModelId(firstModel.id)
      }
    } else {
      setSelectedProviderId('')
      setSelectedModelId('')
    }
  }, [selectedOutputType, modelsData, providersData])

  // 当切换模型时初始化参数
  useEffect(() => {
    if (!selectedModel) {
      setParameters({})
      return
    }

    // 如果新模型不支持图片输入，清空已上传的图片
    if (!supportsImageInput && uploadedImages.length > 0) {
      setUploadedImages([])
      setUploadError(null)
      setImageUrlInput('')
    }

    // 尝试从localStorage恢复参数
    const savedParams = localStorage.getItem(`shot-ai-params-${selectedModel.slug}`)

    if (savedParams) {
      try {
        const parsedParams = JSON.parse(savedParams) as Record<string, unknown>
        setParameters(parsedParams)
        return
      } catch {
        // 解析失败，使用默认值
      }
    }

    // 使用默认值初始化参数
    const defaultParams: Record<string, unknown> = {}
    parameterFields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaultParams[field.key] = field.defaultValue
      }
    })
    setParameters(defaultParams)
  }, [selectedModel, parameterFields, supportsImageInput, uploadedImages.length])

  // 保存参数到localStorage
  useEffect(() => {
    if (selectedModel && Object.keys(parameters).length > 0) {
      localStorage.setItem(`shot-ai-params-${selectedModel.slug}`, JSON.stringify(parameters))
    }
  }, [selectedModel, parameters])

  const handleParameterChange = (key: string, value: unknown) => {
    setParameters(prev => ({ ...prev, [key]: value }))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const remainingSlots = 5 - uploadedImages.length
    if (remainingSlots <= 0) {
      setUploadError('最多上传 5 张图片')
      event.target.value = ''
      return
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots)
    if (selectedFiles.some((file) => !file.type.startsWith('image/'))) {
      setUploadError('仅支持图片文件')
      event.target.value = ''
      return
    }

    setIsUploadingImage(true)
    setUploadError(null)

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error('上传失败')
        }

        const data = await response.json() as { url: string }
        return { url: data.url, name: file.name }
      })

      const uploadedFiles = await Promise.all(uploadPromises)
      setUploadedImages((prev) => [...prev, ...uploadedFiles])
      toast.success(`成功上传 ${uploadedFiles.length} 张图片`)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '上传失败')
      toast.error('图片上传失败')
    } finally {
      setIsUploadingImage(false)
      event.target.value = ''
    }
  }

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim()
    const slots = 5 - uploadedImages.length
    if (slots <= 0) {
      setUploadError('最多上传 5 张图片')
      return
    }
    if (!url) {
      setUploadError('请输入图片 URL')
      return
    }
    try {
      new URL(url)
    } catch {
      setUploadError('请输入有效的 URL')
      return
    }
    if (uploadedImages.some((image) => image.url === url)) {
      setUploadError('该图片已添加')
      return
    }
    setUploadedImages((prev) => [...prev, { url, name: url }])
    setImageUrlInput('')
    setUploadError(null)
    toast.success('图片链接已添加')
  }

  // 从外部添加参考图URL的函数
  const addReferenceImageUrl = (url: string) => {
    const slots = 5 - uploadedImages.length
    if (slots <= 0) {
      toast.error('最多上传 5 张图片')
      return
    }
    if (!url) {
      toast.error('图片 URL 无效')
      return
    }
    if (uploadedImages.some((image) => image.url === url)) {
      toast.error('该图片已添加')
      return
    }
    setUploadedImages((prev) => [...prev, { url, name: url }])
    setUploadError(null)
    toast.success('已添加演员参考图')
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
    setUploadError(null)
  }

  const handleGenerate = () => {
    if (!selectedModelId) {
      setError('请选择一个模型')
      return
    }
    if (!prompt.trim()) {
      setError('请输入提示词')
      return
    }

    setError(null)
    setIsGenerating(true)

    const images = uploadedImages.map((image) => image.url)
    generateMutation.mutate({
      modelId: selectedModelId,
      prompt: prompt.trim(),
      inputImages: images.length > 0 ? images : undefined,
      numberOfOutputs,
      parameters,
      shotId,
    })
  }

  const remainingUploadSlots = Math.max(0, 5 - uploadedImages.length)

  const renderParameterInput = (field: ParameterField) => {
    const value = parameters[field.key] ?? field.defaultValue
    switch (field.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleParameterChange(field.key, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm">{Boolean(value) ? '开启' : '关闭'}</span>
          </label>
        )
      case 'select':
        return (
          <select
            value={String(value ?? '')}
            onChange={(e) => {
              const selectedOption = field.options?.find(
                (opt) => String(opt.value) === e.target.value
              )
              handleParameterChange(field.key, selectedOption?.value)
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">请选择</option>
            {field.options?.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        )
      case 'number':
        return (
          <input
            type="number"
            value={Number(value ?? field.min ?? 0)}
            onChange={(e) => handleParameterChange(field.key, parseFloat(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        )
      case 'string':
      case 'textarea':
      default:
        return (
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => handleParameterChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        )
    }
  }

  // 处理转视频
  const handleConvertToVideo = (imageUrl: string) => {
    // 先切换到视频输出类型，等待 modelsData 更新后再选择模型
    setSelectedOutputType('VIDEO')

    // 设置输入图片
    setUploadedImages([{ url: imageUrl, name: '转视频源图片' }])

    toast.success('已切换到视频生成模式，推荐使用 Kling v2.1 Master 模型')
  }

  // 处理应用历史任务
  const handleApplyTask = (task: TaskHistoryTask) => {
    // 应用模型选择
    if (task.model.id) {
      setSelectedModelId(task.model.id)
      setSelectedProviderId(task.model.provider.id)

      // 根据模型的输出类型设置相应的输出类型
      if (task.model.outputType) {
        setSelectedOutputType(task.model.outputType as OutputType)
      }
    }

    // 应用提示词
    if (task.prompt) {
      setPrompt(task.prompt)
    }

    // 应用输入图片
    if (Array.isArray(task.inputImages) && task.inputImages.length > 0) {
      const images = task.inputImages
        .filter((img): img is string => typeof img === 'string')
        .map((url, index) => ({
          url,
          name: `历史图片 ${index + 1}`,
        }))
      setUploadedImages(images)
    } else {
      setUploadedImages([])
    }

    // 应用参数
    if (task.parameters && typeof task.parameters === 'object') {
      try {
        const taskParams = task.parameters as Record<string, unknown>
        setParameters(taskParams)
      } catch (e) {
        console.error('解析任务参数失败:', e)
      }
    }

    toast.success('已应用任务配置')
  }

  // 暴露方法给父组件通过ref调用
  useImperativeHandle(ref, () => ({
    applyTask: handleApplyTask,
    convertToVideo: handleConvertToVideo,
    addReferenceImage: addReferenceImageUrl,
  }))

  return (
    <>
    <Card className="space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedOutputType}
          onChange={(e) => setSelectedOutputType(e.target.value as OutputType)}
          className="h-7 min-w-[100px] rounded border border-gray-300 px-2 text-xs focus:border-blue-500 focus:outline-none"
        >
          <option value="IMAGE">图像</option>
          <option value="VIDEO">视频</option>
          <option value="AUDIO">音频</option>
        </select>
        <select
          value={selectedProviderId}
          onChange={(e) => setSelectedProviderId(e.target.value)}
          className="h-7 min-w-[140px] rounded border border-gray-300 px-2 text-xs focus:border-blue-500 focus:outline-none"
        >
          <option value="">选择供应商</option>
          {availableProviders.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          disabled={!selectedProviderId || availableModels.length === 0}
          className="h-7 min-w-[160px] rounded border border-gray-300 px-2 text-xs focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="">{availableModels.length === 0 ? '暂无模型' : '选择模型'}</option>
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedModelId || !shotId}
          size="sm"
          className="h-7 px-3 text-xs"
        >
          {isGenerating ? '生成中...' : !shotId ? '请先展开镜头' : '生成'}
        </Button>
      </div>

      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={10}
          placeholder="描述你想要生成的内容..."
          className="w-full rounded border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />

        {/* 快捷填充按钮 */}
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setPrompt("将参考图中的角色更换为如下装扮和场景，保持角色一致即可：")}
            className="px-2 py-0.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors"
          >
            保持人
          </button>
          <button
            type="button"
            onClick={() => setPrompt("调整参考图的角色和环境，保持角色外观、场景、镜头角度一致：")}
            className="px-2 py-0.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 transition-colors"
          >
            延续人+场景
          </button>

          {/* 角色模板词按钮 */}
          {sceneDescriptions && sceneDescriptions.length > 0 && (
            <>
              {sceneDescriptions.map((scene, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPrompt(prev => prev + (prev ? ' ' : '') + scene.description)}
                  className="px-2 py-0.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200 transition-colors"
                  title={scene.description}
                >
                  {scene.characterName}模板词
                </button>
              ))}
            </>
          )}

          {/* 自定义模板按钮 */}
          {customTemplates.map((template) => (
            <div key={template.id} className="relative group">
              <button
                type="button"
                onClick={() => handleApplyTemplate(template.template)}
                className="px-2 py-0.5 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded border border-orange-200 transition-colors"
                title={template.template}
              >
                {template.name}
              </button>
              {/* 编辑按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenTemplateModal(template)
                }}
                className="absolute -top-1 -right-6 h-4 w-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="编辑"
              >
                <Edit2 className="h-2.5 w-2.5" />
              </button>
              {/* 删除按钮 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteTemplate(template.id)
                }}
                className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="删除"
              >
                ×
              </button>
            </div>
          ))}

          {/* 添加模板按钮 */}
          <button
            type="button"
            onClick={() => handleOpenTemplateModal()}
            className="h-6 w-6 rounded-full border-2 border-dashed border-gray-400 hover:border-gray-600 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center"
            title="添加自定义模板"
          >
            +
          </button>
        </div>
      </div>

        {/* 输入图片 - 仅当模型支持图片输入时显示 */}
        {supportsImageInput && (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((image, index) => (
                <div
                  key={image.url}
                  className="group relative h-8 w-8 overflow-hidden rounded border border-gray-200 bg-gray-50"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewImage(image.url)}
                    className="h-full w-full"
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -right-0.5 -top-0.5 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </div>
              ))}
              {remainingUploadSlots > 0 && (
                <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                  <Upload className="h-3 w-3 text-gray-400" />
                </label>
              )}
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => {
                  setImageUrlInput(e.target.value)
                  if (uploadError) setUploadError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddImageUrl()
                  }
                }}
                placeholder="或粘贴图片 URL"
                disabled={remainingUploadSlots <= 0}
                className="flex-1 min-w-[200px] h-8 rounded border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddImageUrl}
                disabled={remainingUploadSlots <= 0 || imageUrlInput.trim().length === 0}
                className="h-8 px-2"
              >
                <LinkIcon className="h-3 w-3" />
              </Button>
            </div>
            {uploadError && (
              <p className="text-xs text-red-600">{uploadError}</p>
            )}
          </div>
        )}

      {/* 模型参数 */}
      {parameterFields.length > 0 && (
        <div className="space-y-2 border-t pt-2">
          <h4 className="text-xs font-medium">模型参数</h4>
          <div className="grid gap-2 md:grid-cols-2">
            {parameterFields.map((field) => (
              <div key={field.key} className="space-y-0.5">
                <label className="text-xs font-medium">{field.label}</label>
                {renderParameterInput(field)}
                {field.helperText && (
                  <p className="text-xs text-gray-500">{field.helperText}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </Card>

    {/* 任务历史 */}
    <ShotTaskHistory
      shotId={shotId}
      onRefreshShot={onTaskCreated}
      onApplyTask={handleApplyTask}
      onConvertToVideo={handleConvertToVideo}
    />

    {/* 模板编辑模态框 */}
    <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{editingTemplate ? '编辑模板' : '添加自定义模板'}</DialogTitle>
        <div className="space-y-4">
          {/* 名称输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">模板名称</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="例如：人物特写"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 模板内容输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">模板内容</label>
            <textarea
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              placeholder="输入模板内容，使用 {{变量名}} 来插入变量"
              rows={6}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 变量快捷插入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">快速插入变量</label>
            <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded border border-gray-200 max-h-40 overflow-y-auto">
              {/* 全局字段 */}
              <button type="button" onClick={() => handleInsertVariable('shotNumber')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">shotNumber</button>
              <button type="button" onClick={() => handleInsertVariable('styleSettings')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">styleSettings</button>

              {/* 角色字段 */}
              <button type="button" onClick={() => handleInsertVariable('name')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">name</button>
              <button type="button" onClick={() => handleInsertVariable('appearance')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">appearance</button>
              <button type="button" onClick={() => handleInsertVariable('environment')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">environment</button>

              {/* TYPE02 字段 */}
              <button type="button" onClick={() => handleInsertVariable('shotSizeView')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">shotSizeView</button>
              <button type="button" onClick={() => handleInsertVariable('settingBackground')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">settingBackground</button>
              <button type="button" onClick={() => handleInsertVariable('compositionPosition')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">compositionPosition</button>
              <button type="button" onClick={() => handleInsertVariable('poseExpressionCostume')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">poseExpressionCostume</button>

              {/* TYPE03 字段 */}
              <button type="button" onClick={() => handleInsertVariable('framing')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">framing</button>
              <button type="button" onClick={() => handleInsertVariable('bodyOrientation')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">bodyOrientation</button>
              <button type="button" onClick={() => handleInsertVariable('faceDirection')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">faceDirection</button>
              <button type="button" onClick={() => handleInsertVariable('cameraMovement')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">cameraMovement</button>
              <button type="button" onClick={() => handleInsertVariable('expression')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">expression</button>
              <button type="button" onClick={() => handleInsertVariable('action')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">action</button>
              <button type="button" onClick={() => handleInsertVariable('dialogue')} className="px-2 py-1 text-xs bg-white hover:bg-blue-50 border border-gray-300 rounded">dialogue</button>
            </div>
          </div>

          {/* 内容预览 */}
          {templateContent && (
            <div className="space-y-1">
              <label className="text-sm font-medium">内容预览</label>
              <div className="p-2 bg-green-50 rounded border border-green-200 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {templatePreview || '（无内容）'}
              </div>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateModal(false)
                setTemplateName('')
                setTemplateContent('')
                setEditingTemplate(null)
              }}
            >
              取消
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? '更新' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* 图片预览对话框 */}
    <Dialog
      open={Boolean(previewImage)}
      onOpenChange={(open) => {
        if (!open) setPreviewImage(null)
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogTitle className="sr-only">图片预览</DialogTitle>
        {previewImage && (
          <img
            src={previewImage}
            alt="预览"
            className="w-full h-auto"
          />
        )}
      </DialogContent>
    </Dialog>
  </>
  )
})
