"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import type { UploadTask } from '../../types'

interface AddUrlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddUrls: (tasks: UploadTask[]) => Promise<void>
  currentFolder?: string | null
  viewTab: 'folders' | 'actors'
}

export function AddUrlDialog({
  open,
  onOpenChange,
  onAddUrls,
  currentFolder,
  viewTab,
}: AddUrlDialogProps) {
  const [urlInput, setUrlInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const urls = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0)

    if (urls.length === 0) {
      alert('请输入至少一个 URL')
      return
    }

    setIsSubmitting(true)
    
    const tasks: UploadTask[] = urls.map((url) => ({
      id: `url-${Date.now()}-${Math.random()}`,
      name: url,
      status: 'uploading',
      url,
    }))

    try {
      await onAddUrls(tasks)
      onOpenChange(false)
      setUrlInput('')
    } catch (error) {
      console.error('Add URLs failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加媒体 URL</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">URL（每行一个）</label>
            <textarea
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg&#10;https://example.com/video.mp4"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
              rows={6}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSubmitting ? '添加中...' : '添加'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

