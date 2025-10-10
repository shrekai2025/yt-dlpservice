"use client"

import { useState } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Card } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'

interface EditingProvider {
  id: string
  name: string
  apiEndpoint: string
  encryptedAuthKey: string
  uploadToS3: boolean
  s3PathPrefix: string | null
}

export default function ProvidersPage() {
  const [selectedType, setSelectedType] = useState<'image' | 'video' | 'stt' | 'all'>('all')
  const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Fetch providers
  const { data: providers, isLoading, refetch } = api.generation.listProviders.useQuery(
    selectedType === 'all' ? {} : { type: selectedType }
  )

  // Mutations
  const toggleMutation = api.generation.toggleProvider.useMutation({
    onSuccess: () => {
      setToast({ message: '供应商状态已更新', type: 'success' })
      refetch()
    },
    onError: (error) => {
      setToast({ message: `操作失败: ${error.message}`, type: 'error' })
    },
  })

  const updateMutation = api.generation.updateProvider.useMutation({
    onSuccess: () => {
      setToast({ message: '供应商已更新', type: 'success' })
      setEditingProvider(null)
      refetch()
    },
    onError: (error) => {
      setToast({ message: `更新失败: ${error.message}`, type: 'error' })
    },
  })

  const handleToggle = (id: string) => {
    toggleMutation.mutate({ id })
  }

  const handleEdit = async (providerId: string) => {
    // Fetch full provider details for editing
    const provider = providers?.find((p) => p.id === providerId)
    if (!provider) return

    // Generate environment variable name
    const envVarName = `AI_PROVIDER_${provider.modelIdentifier.toUpperCase().replace(/-/g, '_')}_API_KEY`

    // Show detailed prompt with environment variable info
    const message = `输入新的 API 密钥 (留空则不修改):

📋 密钥优先级说明：
• 数据库密钥优先：如果数据库中有密钥，优先使用数据库中的
• 环境变量兜底：数据库中没有密钥时，才使用环境变量 ${envVarName}
• 此处修改会直接保存到数据库，并立即生效

当前供应商：${provider.name} (${provider.modelIdentifier})`

    const newApiKey = prompt(message)

    if (newApiKey !== null && newApiKey.trim() !== '') {
      updateMutation.mutate({
        id: providerId,
        encryptedAuthKey: newApiKey,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-900">供应商管理</h1>
        <div className="text-neutral-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`rounded-md border px-4 py-3 ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <Button variant="ghost" size="sm" onClick={() => setToast(null)}>
              关闭
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">供应商管理</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={selectedType === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedType('all')}
        >
          全部 ({providers?.length || 0})
        </Button>
        <Button
          variant={selectedType === 'image' ? 'default' : 'outline'}
          onClick={() => setSelectedType('image')}
        >
          图像
        </Button>
        <Button
          variant={selectedType === 'video' ? 'default' : 'outline'}
          onClick={() => setSelectedType('video')}
        >
          视频
        </Button>
        <Button
          variant={selectedType === 'stt' ? 'default' : 'outline'}
          onClick={() => setSelectedType('stt')}
        >
          语音转录
        </Button>
      </div>

      {/* Provider List */}
      <div className="grid gap-4">
        {providers?.map((provider) => (
          <Card key={provider.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {provider.name}
                  </h3>
                  <Badge variant={provider.isActive ? 'default' : 'subtle'}>
                    {provider.isActive ? '激活' : '停用'}
                  </Badge>
                  <Badge variant="outline">{provider.type}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-500">模型标识符:</span>{' '}
                    <code className="rounded bg-neutral-100 px-2 py-1 text-xs">
                      {provider.modelIdentifier}
                    </code>
                  </div>
                  <div>
                    <span className="text-neutral-500">供应商:</span>{' '}
                    <span className="font-medium">{provider.provider || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">调用次数:</span>{' '}
                    <span className="font-medium">{provider.callCount}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-neutral-500">密钥优先级:</span>{' '}
                    <span className="text-xs text-neutral-600">
                      数据库密钥 → 环境变量
                      <code className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                        AI_PROVIDER_{provider.modelIdentifier.toUpperCase().replace(/-/g, '_')}_API_KEY
                      </code>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(provider.id)}
                  disabled={updateMutation.isPending}
                >
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(provider.id)}
                  disabled={toggleMutation.isPending}
                >
                  {provider.isActive ? '停用' : '激活'}
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {providers?.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-neutral-500">暂无供应商</div>
            <div className="mt-2 text-xs text-neutral-400">
              供应商需要通过系统开发添加
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
