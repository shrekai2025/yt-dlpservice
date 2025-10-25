"use client"

import React from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

export const dynamic = 'force-dynamic'

export default function InfoFetchPage(): React.ReactElement {
  const [previewUrl, setPreviewUrl] = React.useState('')
  const [videoInfo, setVideoInfo] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // 使用 mutation 而不是 query 来避免自动执行
  const getVideoInfoMutation = api.task.getVideoInfo.useMutation()

  const handlePreviewVideo = async () => {
    if (!previewUrl.trim()) {
      setError('请输入视频 URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setVideoInfo(null)

    try {
      console.log('发送视频预览请求，URL:', previewUrl)
      const result = await getVideoInfoMutation.mutateAsync({ url: previewUrl })
      console.log('视频预览结果:', result)
      setVideoInfo(result)
      setError(null)
    } catch (err: any) {
      console.error('视频预览错误:', err)
      setError(err.message || '获取视频信息失败')
      setVideoInfo(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">信息获取</h1>
        <p className="mt-2 text-sm text-neutral-600">
          获取视频或音频的基本信息，无需下载即可查看元数据
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>视频信息预览</CardTitle>
          <CardDescription>输入视频 URL 获取基本信息，无需下载即可查看标题、时长等元数据。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="输入视频 URL (支持 YouTube、Bilibili、小宇宙等)"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePreviewVideo()
                }
              }}
            />
            <Button onClick={handlePreviewVideo} disabled={isLoading}>
              {isLoading ? '获取中...' : '预览'}
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          {videoInfo && videoInfo.success && videoInfo.data && (
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <h3 className="mb-3 text-base font-semibold text-neutral-900">{videoInfo.data.title}</h3>
              <div className="space-y-2 text-sm text-neutral-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-700">⏱️ 时长:</span>
                  <span>
                    {Math.floor(videoInfo.data.duration / 60)}:{(videoInfo.data.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                {videoInfo.data.uploader && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-700">👤 上传者:</span>
                    <span>{videoInfo.data.uploader}</span>
                  </div>
                )}
                {videoInfo.platform && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-700">🌐 平台:</span>
                    <span className="capitalize">{videoInfo.platform}</span>
                  </div>
                )}
                {videoInfo.data.webpage_url && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-700">🔗 URL:</span>
                    <a
                      href={videoInfo.data.webpage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {videoInfo.data.webpage_url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
