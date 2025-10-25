/**
 * 数字人任务创建表单（紧凑版）
 */

'use client'

import { useState, useEffect } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Button, Card, CardContent, Alert, AlertDescription, Checkbox, Input, Label, Textarea } from '@/components/ui'
import { Loader2, AlertCircle, Plus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TaskFormData } from '~/app/digital-human/page'

interface DigitalHumanCompactFormProps {
  initialData?: TaskFormData | null
  onDataApplied?: () => void
}

export function DigitalHumanCompactForm({ initialData, onDataApplied }: DigitalHumanCompactFormProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    audioUrl: '',
    prompt: '',
    seed: -1,
    peFastMode: false,
    enableMultiSubject: false,
  })
  const [error, setError] = useState<string | null>(null)

  // 当接收到外部数据时，更新表单并展开
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
      setIsExpanded(true)
      onDataApplied?.()
    }
  }, [initialData, onDataApplied])

  const createTaskMutation = api.digitalHuman.createTask.useMutation({
    onSuccess: (data) => {
      // 重置表单
      setFormData({
        name: '',
        imageUrl: '',
        audioUrl: '',
        prompt: '',
        seed: -1,
        peFastMode: false,
        enableMultiSubject: false,
      })
      setIsExpanded(false)
      setError(null)

      // 跳转到任务详情
      router.push(`/digital-human/tasks/${data.id}`)
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 验证必填字段
    if (!formData.name || !formData.imageUrl || !formData.audioUrl) {
      setError('请填写所有必填字段')
      return
    }

    // 提交任务
    createTaskMutation.mutate({
      name: formData.name,
      imageUrl: formData.imageUrl,
      audioUrl: formData.audioUrl,
      prompt: formData.prompt || undefined,
      seed: formData.seed === -1 ? undefined : formData.seed,
      peFastMode: formData.peFastMode,
      enableMultiSubject: formData.enableMultiSubject,
    })
  }

  const isLoading = createTaskMutation.isPending

  return (
    <Card>
      <CardContent className="p-4">
        {/* 展开/折叠按钮 */}
        <div className="flex items-center justify-between mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between"
          >
            <span className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              创建新任务
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* 表单内容 */}
        {isExpanded && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 重要提示 */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>注意：</strong>音频时长必须小于 35 秒；图片支持 JPG/PNG，小于 5MB，分辨率小于 4096x4096
              </AlertDescription>
            </Alert>

            {/* 基本信息 - 紧凑布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 任务名称 */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">
                  任务名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：产品介绍视频"
                  maxLength={100}
                  disabled={isLoading}
                  className="h-9"
                />
              </div>

              {/* 图片URL */}
              <div className="space-y-1.5">
                <Label htmlFor="imageUrl" className="text-sm">
                  图片URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  disabled={isLoading}
                  className="h-9"
                />
              </div>

              {/* 音频URL */}
              <div className="space-y-1.5">
                <Label htmlFor="audioUrl" className="text-sm">
                  音频URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="audioUrl"
                  type="url"
                  value={formData.audioUrl}
                  onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                  placeholder="https://example.com/audio.mp3"
                  disabled={isLoading}
                  className="h-9"
                />
              </div>

              {/* 种子 */}
              <div className="space-y-1.5">
                <Label htmlFor="seed" className="text-sm">
                  种子（-1为随机）
                </Label>
                <Input
                  id="seed"
                  type="number"
                  value={formData.seed}
                  onChange={(e) => setFormData({ ...formData, seed: parseInt(e.target.value) })}
                  min={-1}
                  max={999999999}
                  disabled={isLoading}
                  className="h-9"
                />
              </div>
            </div>

            {/* 提示词 */}
            <div className="space-y-1.5">
              <Label htmlFor="prompt" className="text-sm">
                提示词（可选）
              </Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="描述生成细节..."
                maxLength={500}
                disabled={isLoading}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* 选项 */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="peFastMode"
                  checked={formData.peFastMode}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, peFastMode: checked as boolean })
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="peFastMode" className="text-sm font-normal cursor-pointer">
                  快速模式
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableMultiSubject"
                  checked={formData.enableMultiSubject}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableMultiSubject: checked as boolean })
                  }
                  disabled={isLoading}
                />
                <Label htmlFor="enableMultiSubject" className="text-sm font-normal cursor-pointer">
                  多主体模式
                </Label>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    创建任务
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpanded(false)}
                disabled={isLoading}
              >
                取消
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
