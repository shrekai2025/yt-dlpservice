"use client"

import { useState } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Card } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Dialog } from '~/components/ui/dialog'

export default function ApiKeysPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  // Fetch API keys
  const { data: apiKeys, isLoading, refetch } = api.apiKeys.list.useQuery()

  // Create API key mutation
  const createMutation = api.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.key)
      setNewKeyName('')
      refetch()
    },
  })

  // Revoke API key mutation
  const revokeMutation = api.apiKeys.revoke.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const handleCreate = () => {
    if (!newKeyName.trim()) return
    createMutation.mutate({ name: newKeyName.trim() })
  }

  const handleRevoke = (id: string, name: string) => {
    if (confirm(`确定要撤销 API Key "${name}" 吗？`)) {
      revokeMutation.mutate({ id })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-900">API 密钥管理</h1>
        <div className="text-neutral-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">API 密钥管理</h1>
          <p className="mt-1 text-sm text-neutral-600">
            管理外部 API 访问密钥，用于认证 Generation API 请求
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>创建密钥</Button>
      </div>

      {/* Warning Box */}
      <Card className="border-yellow-200 bg-yellow-50 p-4">
        <div className="flex gap-3">
          <span className="text-yellow-600">⚠️</span>
          <div className="text-sm text-yellow-800">
            <strong>安全提示：</strong>
            密钥仅在创建时显示一次，请妥善保存。如果丢失，需要创建新密钥。
          </div>
        </div>
      </Card>

      {/* API Keys List */}
      <div className="space-y-3">
        {apiKeys?.map((key) => (
          <Card key={key.id} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-neutral-900">{key.name}</h3>
                  <Badge variant={key.isActive ? 'default' : 'subtle'}>
                    {key.isActive ? '激活' : '已撤销'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-500">密钥前缀:</span>{' '}
                    <code className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
                      {key.prefix}***
                    </code>
                  </div>
                  <div>
                    <span className="text-neutral-500">创建时间:</span>{' '}
                    <span className="text-neutral-700">
                      {new Date(key.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {key.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(key.id, key.name)}
                    disabled={revokeMutation.isPending}
                  >
                    撤销
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {apiKeys?.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-neutral-500">暂无 API 密钥</div>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              创建第一个密钥
            </Button>
          </Card>
        )}
      </div>

      {/* Create API Key Dialog */}
      {showCreateDialog && !createdKey && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">创建 API 密钥</h2>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                密钥名称
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="例如：我的应用、客户端A"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-neutral-500">
                用于识别此密钥的用途或所属应用
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false)
                  setNewKeyName('')
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newKeyName.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? '创建中...' : '创建'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Show Created Key Dialog */}
      {createdKey && (
        <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-green-600">✅ 密钥创建成功</h2>

            <Card className="border-green-200 bg-green-50 p-4">
              <div className="text-sm text-green-800">
                <strong>重要：</strong>
                请立即复制并保存此密钥。关闭后将无法再次查看。
              </div>
            </Card>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                API 密钥
              </label>
              <div className="mt-1 flex gap-2">
                <code className="flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-sm">
                  {createdKey}
                </code>
                <Button onClick={() => copyToClipboard(createdKey)}>复制</Button>
              </div>
            </div>

            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold">使用方法：</p>
              <pre className="mt-2 overflow-x-auto rounded bg-blue-100 p-2 text-xs">
{`curl -X POST http://your-domain/api/external/generation \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${createdKey}" \\
  -d '{"model_identifier": "...", "prompt": "..."}'`}
              </pre>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setCreatedKey(null)
                  setShowCreateDialog(false)
                }}
              >
                我已保存，关闭
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
