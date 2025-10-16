"use client"

/**
 * AI Providers Management Page
 *
 * 供应商和模型管理
 */

import { useState } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Card } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'

export default function AIProvidersPage() {
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null)
  const [newApiKey, setNewApiKey] = useState('')

  // 查询供应商列表
  const { data: providersData, refetch } = api.aiGeneration.listProviders.useQuery({})

  // 更新 API Key
  const updateApiKeyMutation = api.aiGeneration.updateProviderApiKey.useMutation({
    onSuccess: () => {
      setEditingProviderId(null)
      setNewApiKey('')
      void refetch()
      alert('API Key 更新成功')
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`)
    },
  })

  // 更新模型状态
  const updateModelStatusMutation = api.aiGeneration.updateModelStatus.useMutation({
    onSuccess: () => {
      void refetch()
    },
  })

  const handleSaveApiKey = (providerId: string) => {
    if (!newApiKey.trim()) {
      alert('请输入 API Key')
      return
    }

    updateApiKeyMutation.mutate({
      providerId,
      apiKey: newApiKey.trim(),
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">供应商管理</h1>
      </div>

      <div className="space-y-6">
        {providersData?.map((provider) => (
          <Card key={provider.id} className="p-6">
            <div className="space-y-4">
              {/* 供应商信息 */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{provider.name}</h2>
                    <Badge variant={provider.isActive ? 'default' : 'outline'}>
                      {provider.isActive ? '启用' : '禁用'}
                    </Badge>
                    {provider.platform && (
                      <Badge variant="outline">平台: {provider.platform.name}</Badge>
                    )}
                  </div>
                  {provider.description && (
                    <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                  )}
                  {provider.apiEndpoint && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {provider.apiEndpoint}
                    </p>
                  )}
                </div>
              </div>

              {/* API Key 配置 */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">API Key</h3>
                  {provider.apiKey ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      已配置
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      未配置
                    </Badge>
                  )}
                </div>

                {editingProviderId === provider.id ? (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="输入新的 API Key"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveApiKey(provider.id)}
                      disabled={updateApiKeyMutation.isPending}
                    >
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProviderId(null)
                        setNewApiKey('')
                      }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingProviderId(provider.id)}
                  >
                    {provider.apiKey ? '修改 API Key' : '设置 API Key'}
                  </Button>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  提示: 也可以通过环境变量 AI_PROVIDER_{provider.slug.toUpperCase().replace(/-/g, '_')}_API_KEY 配置
                </p>
              </div>

              {/* 模型列表 */}
              {provider.models && provider.models.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">模型列表 ({provider.models.length})</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {provider.models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{model.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {model.outputType}
                            </Badge>
                            <Badge
                              variant={model.isActive ? 'default' : 'outline'}
                              className={`text-xs ${model.isActive ? '' : 'border-dashed'}`}
                            >
                              {model.isActive ? '启用中' : '已停用'}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            使用次数: {model.usageCount}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={model.isActive ? 'destructive' : 'default'}
                          onClick={() => {
                            updateModelStatusMutation.mutate({
                              modelId: model.id,
                              isActive: !model.isActive,
                            })
                          }}
                        >
                          {model.isActive ? '停用' : '启用'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
