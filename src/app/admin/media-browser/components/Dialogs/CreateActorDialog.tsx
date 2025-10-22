"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

interface CreateActorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateActor: (name: string) => Promise<void>
  existingActors?: Array<{ name: string }>
}

export function CreateActorDialog({
  open,
  onOpenChange,
  onCreateActor,
  existingActors = [],
}: CreateActorDialogProps) {
  const [actorName, setActorName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActorName('')
    }
  }, [open])

  const handleSubmit = async () => {
    const trimmedName = actorName.trim()
    
    if (!trimmedName) {
      alert('请输入演员名称')
      return
    }

    // Check for duplicates
    const duplicate = existingActors.find((a) => a.name === trimmedName)
    if (duplicate) {
      alert('演员名称已存在，请使用其他名称')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onCreateActor(trimmedName)
      onOpenChange(false)
      setActorName('')
    } catch (error) {
      console.error('Create actor failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Unique constraint')) {
        alert('演员名称已存在，请使用其他名称')
      } else {
        alert(`创建演员失败: ${errorMessage}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建演员</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">演员名称</label>
            <input
              type="text"
              value={actorName}
              onChange={(e) => setActorName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="请输入演员名称"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                onOpenChange(false)
                setActorName('')
              }}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {isSubmitting ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

