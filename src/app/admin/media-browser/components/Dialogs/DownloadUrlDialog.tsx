"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface DownloadUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (url: string, downloadType: 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH', folderId?: string | null) => Promise<void>
  currentFolder?: string | null
}

export function DownloadUrlDialog({
  open,
  onOpenChange,
  onSubmit,
  currentFolder,
}: DownloadUrlDialogProps) {
  const [url, setUrl] = useState('')
  const [downloadType, setDownloadType] = useState<'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'>('VIDEO_ONLY')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!url.trim()) {
      alert('请输入 URL')
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(url.trim(), downloadType, currentFolder)
      onOpenChange(false)
      setUrl('')
      setDownloadType('VIDEO_ONLY')
    } catch (error) {
      console.error('Download URL failed:', error)
      alert('创建下载任务失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>下载 URL</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700">下载类型</label>
            <select
              value={downloadType}
              onChange={(e) => setDownloadType(e.target.value as 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH')}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              <option value="VIDEO_ONLY">仅视频</option>
              <option value="AUDIO_ONLY">仅音频</option>
              <option value="BOTH">视频+音频</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-md">
            <p className="font-medium mb-1">说明：</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>将创建 URL2STT 任务进行下载</li>
              <li>下载完成后自动添加到媒体浏览器</li>
              <li>不会进行压缩、识别和转存</li>
              {currentFolder && <li>文件将保存到当前文件夹</li>}
            </ul>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? '创建中...' : '添加'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
