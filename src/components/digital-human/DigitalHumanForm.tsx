/**
 * 数字人任务创建表单
 */

'use client'

import { useState } from 'react'
import { api } from '~/components/providers/trpc-provider'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription, Checkbox, Input, Label, Textarea } from '@/components/ui'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function DigitalHumanForm() {
  const router = useRouter()
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

  const createTaskMutation = api.digitalHuman.createTask.useMutation({
    onSuccess: (data) => {
      // 跳转到任务详情或任务列表
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>创建数字人任务</CardTitle>
        <CardDescription>
          上传图片和音频，生成数字人视频（OmniHuman 1.5）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 任务名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              任务名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如：产品介绍视频"
              maxLength={100}
              disabled={isLoading}
            />
          </div>

          {/* 图片URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">
              图片URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              placeholder="https://example.com/image.jpg"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              支持 JPG/PNG 格式，小于 5MB，分辨率小于 4096x4096
            </p>
          </div>

          {/* 音频URL */}
          <div className="space-y-2">
            <Label htmlFor="audioUrl">
              音频URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="audioUrl"
              type="url"
              value={formData.audioUrl}
              onChange={(e) =>
                setFormData({ ...formData, audioUrl: e.target.value })
              }
              placeholder="https://example.com/audio.mp3"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              <strong>重要：</strong>音频时长必须小于 35 秒
            </p>
          </div>

          {/* 多主体选项 */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="enableMultiSubject"
              checked={formData.enableMultiSubject}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  enableMultiSubject: checked === true,
                })
              }
              disabled={isLoading}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="enableMultiSubject"
                className="text-sm font-medium cursor-pointer"
              >
                启用多主体模式
              </Label>
              <p className="text-xs text-gray-500">
                当图片包含多个人物时，可以选择说话主体
              </p>
            </div>
          </div>

          {/* 提示词（可选） */}
          <div className="space-y-2">
            <Label htmlFor="prompt">提示词（可选）</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) =>
                setFormData({ ...formData, prompt: e.target.value })
              }
              placeholder="描述画面、动作、运镜等..."
              maxLength={500}
              rows={3}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              支持中文、英语、日语、韩语、墨西哥语、印尼语
            </p>
          </div>

          {/* 随机种子（可选） */}
          <div className="space-y-2">
            <Label htmlFor="seed">随机种子（可选）</Label>
            <Input
              id="seed"
              type="number"
              value={formData.seed}
              onChange={(e) =>
                setFormData({ ...formData, seed: parseInt(e.target.value) || -1 })
              }
              placeholder="-1（随机）"
              min={-1}
              max={999999999}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              设置为相同的正整数可复现相同效果（默认 -1 表示随机）
            </p>
          </div>

          {/* 快速模式 */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="peFastMode"
              checked={formData.peFastMode}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  peFastMode: checked === true,
                })
              }
              disabled={isLoading}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="peFastMode"
                className="text-sm font-medium cursor-pointer"
              >
                快速模式
              </Label>
              <p className="text-xs text-gray-500">
                牺牲部分效果以加快生成速度
              </p>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 提交按钮 */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? '创建中...' : '创建任务'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
