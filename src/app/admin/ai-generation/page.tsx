"use client"

export const dynamic = 'force-dynamic'

/**
 * AI Generation Main Page
 *
 * 主生成页面 - 选择供应商、模型、配置参数、提交生成任务
 */

import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { X, Settings, Film } from 'lucide-react'
import { api } from '~/components/providers/trpc-provider'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '~/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { getModelParameters, type ParameterField } from '~/lib/ai-generation/config/model-parameters'
import { getModelPricingInfo } from '~/lib/ai-generation/config/pricing-info'
import { TaskHistorySection, type TaskHistoryTask } from './tasks/task-history-section'

type OutputType = 'IMAGE' | 'VIDEO' | 'AUDIO'

type UploadedImage = {
  url: string
  name: string
}

const OUTPUT_VARIANT_HINTS: Record<string, string> = {
  'kie-4o-image': '可用输出数量：1 / 2 / 4',
  'kie-flux-kontext': '可用输出数量：仅支持 1 张输出',
  'kie-midjourney-image': '可用输出数量：建议保持为 1，更多变体请在模型内处理',
}

export default function AIGenerationPage() {
  const router = useRouter()

  // 状态管理
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType>('IMAGE')
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [numberOfOutputs, setNumberOfOutputs] = useState(2)
  const [parameters, setParameters] = useState<Record<string, unknown>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tasksRefreshToken, setTasksRefreshToken] = useState<number | null>(null)

  // 数据查询
  const { data: providersData } = api.aiGeneration.listProviders.useQuery(
    {
      isActive: true,
    },
    {
      // 供应商列表很少变化，使用较长的缓存时间
      staleTime: 60000, // 1分钟
      refetchOnWindowFocus: false,
    }
  )

  const { data: modelsData } = api.aiGeneration.listModels.useQuery(
    {
      outputType: selectedOutputType,
      isActive: true,
    },
    {
      // 模型列表也很少变化
      staleTime: 60000, // 1分钟
      refetchOnWindowFocus: false,
    }
  )

  // 生成任务 mutation
  const generateMutation = api.aiGeneration.generate.useMutation({
    onSuccess: (data) => {
      console.log('Task created:', data)
      setIsGenerating(false)
      setError(null)
      // 刷新任务历史
      setTasksRefreshToken(Date.now())
    },
    onError: (error) => {
      console.error('Generation failed:', error)
      setIsGenerating(false)
      setError(error.message)
    },
  })

  const uploadImageMutation = api.storage.uploadFile.useMutation()

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result === 'string') {
          const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result
          resolve(base64)
        } else {
          reject(new Error('无法读取文件'))
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsDataURL(file)
    })

  const handleImageInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files

    if (!files || files.length === 0) {
      event.target.value = ''
      return
    }

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

    if (selectedFiles.length < files.length) {
      setUploadError('最多上传 5 张图片')
    } else {
      setUploadError(null)
    }

    setIsUploadingImage(true)

    try {
      for (const file of selectedFiles) {
        const base64 = await readFileAsBase64(file)
        const response = await uploadImageMutation.mutateAsync({
          fileData: base64,
          fileName: file.name.replace(/\.[^/.]+$/, ''),
          contentType: file.type,
          pathPrefix: 'ai-generation/input-images',
        })

        if (response?.url) {
          setUploadedImages((prev) => [...prev, { url: response.url, name: file.name }])
        }
      }
    } catch (error) {
      console.error('Image upload failed:', error)
      setUploadError(error instanceof Error ? error.message : '图片上传失败，请重试')
    } finally {
      setIsUploadingImage(false)
      event.target.value = ''
    }
  }

  const handleRemoveImage = (url: string) => {
    setUploadedImages((prev) => prev.filter((image) => image.url !== url))
    setUploadError(null)
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

    if (!/^https?:\/\//i.test(url)) {
      setUploadError('请输入有效的图片 URL')
      return
    }

    if (uploadedImages.some((image) => image.url === url)) {
      setUploadError('该图片已添加')
      return
    }

    setUploadedImages((prev) => [...prev, { url, name: url }])
    setImageUrlInput('')
    setUploadError(null)
  }

  // 过滤当前类型的供应商
  const availableProviders = useMemo(() => {
    if (!providersData || !modelsData) return []

    // 找出拥有当前类型模型的供应商
    const providerIdsWithModels = new Set(
      modelsData.map((m) => m.provider.id)
    )

    return providersData.filter((p) => providerIdsWithModels.has(p.id))
  }, [providersData, modelsData])

  // 从localStorage恢复用户选择（仅在页面首次加载时）
  useEffect(() => {
    const savedOutputType = localStorage.getItem('ai-gen-output-type')
    
    if (savedOutputType && ['IMAGE', 'VIDEO', 'AUDIO'].includes(savedOutputType)) {
      setSelectedOutputType(savedOutputType as OutputType)
    }
  }, [])

  // 恢复供应商选择（当供应商列表加载后）
  useEffect(() => {
    if (!availableProviders || availableProviders.length === 0) return
    if (selectedProviderId) return // 已经选择了，不要覆盖
    
    const savedProviderId = localStorage.getItem('ai-gen-provider-id')
    
    if (savedProviderId && availableProviders.some(p => p.id === savedProviderId)) {
      setSelectedProviderId(savedProviderId)
    } else {
      // 如果没有保存的选择，自动选择第一个
      setSelectedProviderId(availableProviders[0]!.id)
    }
  }, [availableProviders, selectedProviderId])

  // 过滤当前供应商的模型
  const availableModels = useMemo(() => {
    if (!modelsData || !selectedProviderId) return []

    return modelsData.filter((m) => m.provider.id === selectedProviderId)
  }, [modelsData, selectedProviderId])

  // 获取选中的模型
  const selectedModel = useMemo(() => {
    return modelsData?.find((m) => m.id === selectedModelId)
  }, [modelsData, selectedModelId])

  const isFluxKontextModel = selectedModel?.slug === 'kie-flux-kontext'

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

  // 获取模型参数配置
  const parameterFields = useMemo(() => {
    if (!selectedModel) return []
    return getModelParameters(selectedModel.slug)
  }, [selectedModel])

  const outputCountHint = useMemo(() => {
    if (!selectedModel) {
      return '根据所选模型自动调整可用输出数量，默认 1 个结果。'
    }

    return (
      OUTPUT_VARIANT_HINTS[selectedModel.slug] ??
      '该模型默认支持单张输出；如需更多输出，请查看供应商文档。'
    )
  }, [selectedModel])

  // 计算费用预估
  const pricingEstimate = useMemo(() => {
    if (!selectedModel) {
      return null
    }

    return getModelPricingInfo(selectedModel.slug, {
      ...parameters,
      numberOfOutputs,
    })
  }, [selectedModel, parameters, numberOfOutputs])

  // 保存选择到localStorage
  useEffect(() => {
    localStorage.setItem('ai-gen-output-type', selectedOutputType)
  }, [selectedOutputType])

  useEffect(() => {
    if (selectedProviderId) {
      localStorage.setItem('ai-gen-provider-id', selectedProviderId)
    }
  }, [selectedProviderId])

  useEffect(() => {
    if (selectedModelId) {
      localStorage.setItem('ai-gen-model-id', selectedModelId)
    }
  }, [selectedModelId])

  // 当切换类型时重置选择
  useEffect(() => {
    setSelectedProviderId('')
    setSelectedModelId('')
    setParameters({})

    // 切换到IMAGE类型时，自动选择即梦AI和jimeng 4.0
    if (selectedOutputType === 'IMAGE' && modelsData && providersData) {
      // 找到即梦AI供应商
      const jimengProvider = providersData.find(p => p.name.includes('即梦'))
      if (jimengProvider) {
        setSelectedProviderId(jimengProvider.id)

        // 找到jimeng 4.0模型
        const jimeng4Model = modelsData.find(m =>
          m.provider.id === jimengProvider.id &&
          (m.name.includes('4.0') || m.apiIdentifier?.includes('v4'))
        )
        if (jimeng4Model) {
          setSelectedModelId(jimeng4Model.id)
        }
      }
    }
  }, [selectedOutputType, modelsData, providersData])

  // 当切换供应商时重置模型
  useEffect(() => {
    if (selectedProviderId && availableModels.length > 0) {
      // 尝试恢复之前选择的模型
      const savedModelId = localStorage.getItem('ai-gen-model-id')
      const modelExists = availableModels.some(m => m.id === savedModelId)

      if (savedModelId && modelExists) {
        setSelectedModelId(savedModelId)
      } else {
        // 自动选择第一个模型
        setSelectedModelId(availableModels[0]!.id)
      }
    } else {
      setSelectedModelId('')
    }
  }, [selectedProviderId, availableModels])

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
    const savedParams = localStorage.getItem(`ai-gen-params-${selectedModel.slug}`)
    
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
      localStorage.setItem(`ai-gen-params-${selectedModel.slug}`, JSON.stringify(parameters))
    }
  }, [parameters, selectedModel])

  // 处理参数变化
  const handleParameterChange = (key: string, value: unknown) => {
    setParameters((prev) => {
      const normalizedValue = value === '' ? undefined : value

      if (normalizedValue === undefined) {
        const { [key]: _removed, ...rest } = prev
        return rest
      }

      return {
        ...prev,
        [key]: normalizedValue,
      }
    })
  }

  useEffect(() => {
    if (isFluxKontextModel && numberOfOutputs !== 1) {
      setNumberOfOutputs(1)
    }
  }, [isFluxKontextModel, numberOfOutputs])

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
      setParameters(task.parameters as Record<string, unknown>)
    }

    // 应用输出数量
    if (task.numberOfOutputs) {
      setNumberOfOutputs(task.numberOfOutputs)
    }

    // 滚动到页面顶部以便用户看到应用的参数
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 处理生成
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
    })
  }


  // 渲染参数输入
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
            value={value as number}
            onChange={(e) => {
              const num = parseFloat(e.target.value)
              handleParameterChange(field.key, isNaN(num) ? undefined : num)
            }}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        )

      case 'textarea':
        return (
          <textarea
            value={String(value ?? '')}
            onChange={(e) => handleParameterChange(field.key, e.target.value)}
            rows={3}
            placeholder={field.placeholder}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        )

      default: // string
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

  const remainingUploadSlots = Math.max(0, 5 - uploadedImages.length)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI 内容生成</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/digital-human')}
          >
            <Film className="h-4 w-4 mr-2" />
            数字人
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/ai-generation/providers')}
          >
            <Settings className="h-4 w-4 mr-2" />
            供应商管理
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="space-y-6 p-6">
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
            <div className="ml-auto flex flex-col items-end gap-1 text-right">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">输出数量</span>
                <input
                  type="number"
                  value={numberOfOutputs}
                  onChange={(e) =>
                    setNumberOfOutputs(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min={1}
                  max={isFluxKontextModel ? 1 : 10}
                  disabled={isFluxKontextModel}
                  className="h-9 w-20 rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>
              <span className="text-xs text-gray-500">{outputCountHint}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* 提示词 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">提示词 *</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="描述你想要生成的内容..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
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
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      </button>
                      {/* Kling v2.1 Master/Pro 首帧/尾帧标签 */}
                      {(selectedModel?.slug === 'kie-kling-v2-1-master-image-to-video' ||
                        selectedModel?.slug === 'kie-kling-v2-1-pro') && index < 2 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-500/90 px-1 py-0.5 text-center text-[10px] font-medium text-white">
                          {index === 0 ? '首帧' : '尾帧'}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleRemoveImage(image.url)
                        }}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white transition-colors hover:bg-black/80"
                        aria-label="删除图片"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {remainingUploadSlots > 0 && (
                    <label
                      className={`flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-500 transition-colors hover:border-blue-500 hover:text-blue-600 ${isUploadingImage ? 'cursor-wait opacity-60' : ''}`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageInputChange}
                        disabled={isUploadingImage}
                      />
                      {isUploadingImage ? (
                        <span>上传中...</span>
                      ) : (
                        <>
                          <span className="text-lg font-medium leading-none">+</span>
                          <span>上传</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                <div className="flex w-full flex-wrap items-center gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(event) => {
                      setImageUrlInput(event.target.value)
                      if (uploadError) setUploadError(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddImageUrl()
                      }
                    }}
                    placeholder="粘贴图片 URL"
                    className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                    disabled={remainingUploadSlots <= 0}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddImageUrl}
                    disabled={remainingUploadSlots <= 0 || imageUrlInput.trim().length === 0}
                  >
                    添加链接
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {(selectedModel?.slug === 'kie-kling-v2-1-master-image-to-video' ||
                    selectedModel?.slug === 'kie-kling-v2-1-pro')
                    ? '第1张图片作为首帧（必填），第2张图片作为尾帧（可选），支持 PNG/JPG/WebP'
                    : '最多上传 5 张图片，支持 PNG/JPG/WebP'}
                </p>
                {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              </div>
            )}

            {/* 模型参数 */}
            {parameterFields.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-medium">模型参数</h3>
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

            {/* 错误提示 */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* 生成按钮 */}
            <div className="space-y-1">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedModelId}
                className="w-full"
              >
                {isGenerating ? '生成中...' : '开始生成'}
              </Button>
              {pricingEstimate && (
                <p className="text-xs text-gray-500 text-center">
                  预估费用: {pricingEstimate}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
      >
        <DialogContent className="max-w-4xl bg-neutral-950 p-0">
          <VisuallyHidden>
            <DialogTitle>图片预览</DialogTitle>
          </VisuallyHidden>
          {previewImage && (
            <img
              src={previewImage}
              alt="预览图片"
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 任务历史 */}
      <TaskHistorySection refreshToken={tasksRefreshToken} onApplyTask={handleApplyTask} />
    </div>
  )
}
