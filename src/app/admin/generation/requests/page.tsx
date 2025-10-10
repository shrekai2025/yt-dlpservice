"use client"

import { useState } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Card } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Dialog } from '~/components/ui/dialog'

type StatusFilter = 'all' | 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'

export default function RequestsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const pageSize = 20

  // Fetch requests
  const { data, isLoading, refetch } = api.generation.listRequests.useQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: pageSize,
    offset: page * pageSize,
  })

  // Fetch selected request details
  const { data: requestDetails } = api.generation.getRequest.useQuery(
    { id: selectedRequest! },
    { enabled: !!selectedRequest }
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-neutral-100 text-neutral-800'
    }
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-900">生成记录</h1>
        <div className="text-neutral-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">生成记录</h1>
        <Button onClick={() => refetch()}>刷新</Button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => {
            setStatusFilter('all')
            setPage(0)
          }}
        >
          全部 ({data?.total || 0})
        </Button>
        <Button
          variant={statusFilter === 'SUCCESS' ? 'default' : 'outline'}
          onClick={() => {
            setStatusFilter('SUCCESS')
            setPage(0)
          }}
        >
          成功
        </Button>
        <Button
          variant={statusFilter === 'PROCESSING' ? 'default' : 'outline'}
          onClick={() => {
            setStatusFilter('PROCESSING')
            setPage(0)
          }}
        >
          处理中
        </Button>
        <Button
          variant={statusFilter === 'FAILED' ? 'default' : 'outline'}
          onClick={() => {
            setStatusFilter('FAILED')
            setPage(0)
          }}
        >
          失败
        </Button>
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {data?.requests.map((request) => (
          <Card
            key={request.id}
            className="cursor-pointer p-4 transition-shadow hover:shadow-md"
            onClick={() => setSelectedRequest(request.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                  <Badge variant="outline">{request.provider.type}</Badge>
                  <span className="text-xs text-neutral-500">
                    {new Date(request.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>

                <div className="text-sm">
                  <span className="font-medium text-neutral-900">{request.provider.name}</span>
                  <span className="mx-2 text-neutral-400">·</span>
                  <span className="text-neutral-600">{request.prompt}</span>
                </div>

                {request.completedAt && (
                  <div className="text-xs text-neutral-500">
                    完成时间: {new Date(request.completedAt).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>

              <Button variant="ghost" size="sm">
                查看详情
              </Button>
            </div>
          </Card>
        ))}

        {data?.requests.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-neutral-500">暂无记录</div>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
          <div className="text-sm text-neutral-600">
            显示 {page * pageSize + 1} - {Math.min((page + 1) * pageSize, data?.total || 0)} / 共 {data?.total} 条
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* Request Details Dialog */}
      {selectedRequest && requestDetails && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">生成详情</h2>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-neutral-500">状态</div>
                <Badge className={getStatusColor(requestDetails.status)}>
                  {requestDetails.status}
                </Badge>
              </div>

              <div>
                <div className="text-sm text-neutral-500">供应商</div>
                <div className="font-medium">{requestDetails.provider.name}</div>
              </div>

              <div>
                <div className="text-sm text-neutral-500">提示词</div>
                <div className="rounded bg-neutral-50 p-3 text-sm">
                  {requestDetails.prompt}
                </div>
              </div>

              {requestDetails.parameters && Object.keys(requestDetails.parameters).length > 0 && (
                <div>
                  <div className="text-sm text-neutral-500">参数</div>
                  <pre className="rounded bg-neutral-50 p-3 text-xs">
                    {JSON.stringify(requestDetails.parameters, null, 2)}
                  </pre>
                </div>
              )}

              {requestDetails.results && (
                <div>
                  <div className="text-sm text-neutral-500">结果</div>
                  <div className="space-y-2">
                    {(requestDetails.results as Array<{ type: string; url: string }>).map((result, idx) => (
                      <div key={idx} className="rounded bg-neutral-50 p-3">
                        <div className="text-xs text-neutral-500">{result.type}</div>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {result.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {requestDetails.errorMessage && (
                <div>
                  <div className="text-sm text-neutral-500">错误信息</div>
                  <div className="rounded bg-red-50 p-3 text-sm text-red-800">
                    {requestDetails.errorMessage}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-neutral-500">创建时间</div>
                  <div>{new Date(requestDetails.createdAt).toLocaleString('zh-CN')}</div>
                </div>
                {requestDetails.completedAt && (
                  <div>
                    <div className="text-neutral-500">完成时间</div>
                    <div>{new Date(requestDetails.completedAt).toLocaleString('zh-CN')}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setSelectedRequest(null)}>关闭</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
