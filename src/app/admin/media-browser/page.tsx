"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export default function MediaBrowserPage() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">媒体浏览器</h1>
        <p className="text-sm text-neutral-500">浏览、管理和预览项目中的所有媒体文件</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>功能开发中</CardTitle>
          <CardDescription>此功能正在开发中，敬请期待。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-neutral-100 p-6">
              <svg
                className="h-12 w-12 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-neutral-900">媒体浏览器即将推出</h3>
            <p className="mt-2 max-w-md text-sm text-neutral-500">
              媒体浏览器将帮助您轻松查看和管理所有已下载的视频、音频和图片文件。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
