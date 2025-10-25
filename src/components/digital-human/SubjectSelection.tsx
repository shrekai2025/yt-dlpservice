/**
 * 数字人主体选择界面
 */

'use client'

import { useState } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Button } from '@/components/ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { Alert, AlertDescription } from '@/components/ui'
import { Loader2, AlertCircle, Info } from 'lucide-react'
import Image from 'next/image'

interface SubjectSelectionProps {
  taskId: string
  maskUrls: string[]
  onSuccess?: () => void
}

export function SubjectSelection({ taskId, maskUrls, onSuccess }: SubjectSelectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectSubjectMutation = api.digitalHuman.selectSubject.useMutation({
    onSuccess: () => {
      onSuccess?.()
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  const handleSelect = (index: number) => {
    setSelectedIndex(index)
  }

  const handleConfirm = () => {
    if (selectedIndex === null) {
      setError('请选择一个主体')
      return
    }

    setError(null)
    selectSubjectMutation.mutate({
      taskId,
      maskIndex: selectedIndex,
    })
  }

  const isLoading = selectSubjectMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>选择说话主体</CardTitle>
        <CardDescription>
          检测到多个主体，请选择需要进行数字人生成的主体
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 提示信息 */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              点击选择一个主体，然后点击"确认选择"继续生成视频
            </AlertDescription>
          </Alert>

          {/* 主体网格 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {maskUrls.map((maskUrl, index) => (
              <div
                key={index}
                className={`
                  relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all
                  ${
                    selectedIndex === index
                      ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2'
                      : 'border-gray-200 hover:border-gray-400'
                  }
                `}
                onClick={() => handleSelect(index)}
              >
                <div className="aspect-square relative bg-gray-100">
                  <Image
                    src={maskUrl}
                    alt={`主体 ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-2 text-center bg-white">
                  <p className="text-sm font-medium">主体 {index + 1}</p>
                  {selectedIndex === index && (
                    <p className="text-xs text-blue-600">已选择</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 说明 */}
          <Alert variant="default">
            <AlertDescription className="text-xs text-gray-600">
              提示：如果 mask 图显示不正确，可能需要手动将图片 URL 后缀改为 .png 查看
            </AlertDescription>
          </Alert>

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 确认按钮 */}
          <div className="flex justify-end space-x-4">
            <Button
              onClick={handleConfirm}
              disabled={isLoading || selectedIndex === null}
              className="min-w-[120px]"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? '处理中...' : '确认选择'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
