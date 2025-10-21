"use client"

import { useEffect, useMemo, useState } from 'react'
import { X, Upload, Link as LinkIcon } from 'lucide-react'
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
}

export function ShotAIGenerationPanel({ shotId, onTaskCreated, sceneDescriptions }: ShotAIGenerationPanelProps) {
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


  useEffect(() => {
    if (!availableProviders || availableProviders.length === 0) return
    if (selectedProviderId) return
    const savedProviderId = localStorage.getItem('shot-ai-provider-id')
    if (savedProviderId && availableProviders.some(p => p.id === savedProviderId)) {
      setSelectedProviderId(savedProviderId)
    } else {
      setSelectedProviderId(availableProviders[0]!.id)
    }
  }, [availableProviders, selectedProviderId])

  useEffect(() => {
    if (selectedProviderId && availableModels.length > 0) {
      const savedModelId = localStorage.getItem('shot-ai-model-id')
      // 检查保存的模型是否是 v2.5 turbo pro，如果是则清除（因为该模型不可用）
      const savedModel = availableModels.find(m => m.id === savedModelId)
      if (savedModel?.slug === 'kie-kling-v2-5-turbo-pro') {
        console.warn('清除不可用的模型缓存: v2.5 turbo pro')
        localStorage.removeItem('shot-ai-model-id')
        setSelectedModelId(availableModels[0]!.id)
      } else if (savedModelId && availableModels.some(m => m.id === savedModelId)) {
        setSelectedModelId(savedModelId)
      } else {
        setSelectedModelId(availableModels[0]!.id)
      }
    } else {
      setSelectedModelId('')
    }
  }, [selectedProviderId, availableModels])

  useEffect(() => {
    if (selectedProviderId) localStorage.setItem('shot-ai-provider-id', selectedProviderId)
  }, [selectedProviderId])

  useEffect(() => {
    if (selectedModelId) localStorage.setItem('shot-ai-model-id', selectedModelId)
  }, [selectedModelId])

  useEffect(() => {
    setSelectedProviderId('')
    setSelectedModelId('')
    setParameters({})
  }, [selectedOutputType])

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

  return (
    <>
    <Card className="space-y-6 p-6">
      <h3 className="text-lg font-semibold">AI 内容生成</h3>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {(['IMAGE', 'VIDEO', 'AUDIO'] as OutputType[]).map((type) => (
            <Button
              key={type}
              variant={selectedOutputType === type ? 'default' : 'outline'}
              onClick={() => setSelectedOutputType(type)}
              size="sm"
            >
              {type === 'IMAGE' ? '图像' : type === 'VIDEO' ? '视频' : '音频'}
            </Button>
          ))}
          <select
            value={selectedProviderId}
            onChange={(e) => setSelectedProviderId(e.target.value)}
            className="h-9 min-w-[180px] rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
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
            className="h-9 min-w-[200px] rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">{availableModels.length === 0 ? '暂无模型' : '选择模型'}</option>
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        {/* 输出数量字段已隐藏，固定为1 */}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">提示词 *</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="描述你想要生成的内容..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          {/* 快捷填充按钮 */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPrompt("将参考图中的角色更换为如下装扮和场景，保持角色一致即可：")}
              className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md border border-blue-200 transition-colors"
            >
              保持人
            </button>
            <button
              type="button"
              onClick={() => setPrompt("调整参考图的角色和环境，保持角色外观、场景、镜头角度一致：")}
              className="px-3 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-md border border-green-200 transition-colors"
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
                    className="px-3 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md border border-purple-200 transition-colors"
                    title={scene.description}
                  >
                    {scene.characterName}模板词
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 输入图片 - 仅当模型支持图片输入时显示 */}
        {supportsImageInput && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {(selectedModel?.slug === 'kie-kling-v2-1-master-image-to-video' ||
                  selectedModel?.slug === 'kie-kling-v2-1-pro')
                  ? '输入图片（首帧必填，尾帧可选）'
                  : '输入图片（可选）'}
              </label>
              <span className="text-xs text-gray-500">
                {uploadedImages.length}/5
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {uploadedImages.map((image, index) => (
                <div
                  key={image.url}
                  className="group relative h-16 w-16 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
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
                    className="absolute -right-1 -top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {remainingUploadSlots > 0 && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                  <Upload className="h-5 w-5 text-gray-400" />
                </label>
              )}
            </div>
            <div className="flex gap-2">
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
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddImageUrl}
                disabled={remainingUploadSlots <= 0 || imageUrlInput.trim().length === 0}
              >
                <LinkIcon className="h-4 w-4 mr-1" />
                添加链接
              </Button>
            </div>
            {uploadError && (
              <p className="text-xs text-red-600">{uploadError}</p>
            )}
            <p className="text-xs text-gray-500">
              {(selectedModel?.slug === 'kie-kling-v2-1-master-image-to-video' ||
                selectedModel?.slug === 'kie-kling-v2-1-pro')
                ? '第1张图片作为首帧（必填），第2张图片作为尾帧（可选），支持 PNG/JPG/WebP'
                : '最多上传 5 张图片，支持 PNG/JPG/WebP'}
            </p>
          </div>
        )}

        {/* 模型参数 */}
        {parameterFields.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">模型参数</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {parameterFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-sm font-medium">{field.label}</label>
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
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedModelId}
          className="w-full"
        >
          {isGenerating ? '生成中...' : '开始生成'}
        </Button>
      </div>
    </Card>

    {/* 任务历史 */}
    <ShotTaskHistory
      shotId={shotId}
      onRefreshShot={onTaskCreated}
      onApplyTask={handleApplyTask}
      onConvertToVideo={handleConvertToVideo}
    />

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
}
