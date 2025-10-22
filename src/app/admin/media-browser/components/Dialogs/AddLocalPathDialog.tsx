"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import type { UploadTask } from '../../types'

interface AddLocalPathDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddLocalPaths: (tasks: UploadTask[]) => Promise<void>
}

export function AddLocalPathDialog({
  open,
  onOpenChange,
  onAddLocalPaths,
}: AddLocalPathDialogProps) {
  const [localPathInput, setLocalPathInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const paths = localPathInput
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    if (paths.length === 0) {
      alert('请输入至少一个文件路径')
      return
    }

    setIsSubmitting(true)

    const tasks: UploadTask[] = paths.map((filePath) => {
      const fileName = filePath.split(/[/\\]/).pop() || filePath
      return {
        id: `local-ref-${Date.now()}-${Math.random()}`,
        name: fileName,
        status: 'uploading',
        url: filePath,
      }
    })

    try {
      await onAddLocalPaths(tasks)
      onOpenChange(false)
      setLocalPathInput('')
    } catch (error) {
      console.error('Add local paths failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>引用本地文件</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              💡 <strong>如何获取文件路径：</strong>
            </p>
            <ul className="mt-2 text-xs text-blue-700 space-y-1 ml-4">
              <li>• <strong>macOS:</strong> 在访达中选中文件，按 Option+Cmd+C 复制路径</li>
              <li>• <strong>Windows:</strong> 在文件资源管理器中按住 Shift 右键点击文件，选择"复制为路径"</li>
            </ul>
          </div>
          <div>
            <label className="text-sm font-medium">文件路径（每行一个）</label>
            <textarea
              value={localPathInput}
              onChange={(e) => setLocalPathInput(e.target.value)}
              placeholder={`macOS/Linux 示例:\n/Users/username/Videos/video.mp4\n/Users/username/Pictures/image.jpg\n\nWindows 示例:\nC:\\Users\\username\\Videos\\video.mp4\nD:\\Media\\image.png`}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none font-mono"
              rows={8}
            />
            <p className="mt-2 text-xs text-neutral-500">
              支持批量添加，每行一个完整的文件路径
            </p>
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

