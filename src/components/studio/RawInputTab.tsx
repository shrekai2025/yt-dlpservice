/**
 * 原始输入 Tab 组件
 */

import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { api } from '~/components/providers/trpc-provider'

type Props = {
  episodeId: string
  initialRawInput?: string | null
  initialCorePoint?: string | null
  onSave?: () => void
}

export function RawInputTab({ episodeId, initialRawInput, initialCorePoint, onSave }: Props) {
  const [rawInput, setRawInput] = useState('')
  const [corePoint, setCorePoint] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const updateMutation = api.studio.updateEpisode.useMutation({
    onSuccess: () => {
      setIsSaving(false)
      onSave?.()
    },
    onError: () => {
      setIsSaving(false)
    },
  })

  useEffect(() => {
    if (initialRawInput !== undefined && initialRawInput !== null) {
      try {
        const parsed = JSON.parse(initialRawInput)
        setRawInput(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2))
      } catch {
        setRawInput(initialRawInput)
      }
    } else {
      setRawInput('')
    }
  }, [initialRawInput])

  useEffect(() => {
    if (initialCorePoint !== undefined && initialCorePoint !== null) {
      setCorePoint(initialCorePoint)
    } else {
      setCorePoint('')
    }
  }, [initialCorePoint])

  const handleSave = () => {
    setIsSaving(true)
    updateMutation.mutate({
      episodeId,
      rawInput: rawInput.trim(),
      corePoint: corePoint.trim(),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">原始输入</h2>
          <p className="text-sm text-gray-500 mt-1">
            输入非结构化的原始素材,可以是文本、数据、链接等任何信息
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">原始素材</label>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          rows={15}
          placeholder={`粘贴或输入原始素材...\n\n例如:\n- 对话数据\n- 教学要点\n- 参考链接\n- 任何相关信息`}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
        />
        <p className="text-xs text-gray-500">
          提示: 可以输入任何格式的文本,下一步会用 LLM 分析提取关键信息
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">核心看点</label>
        <textarea
          value={corePoint}
          onChange={(e) => setCorePoint(e.target.value)}
          rows={4}
          placeholder={`例如:\n- 强调 xxx 英文单词对话\n- 强调 xxx 英语对话；并使用非常搞笑的动物 cos 世界背景，所有演员 cosplay 成某种动物`}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <p className="text-xs text-gray-500">
          描述本集的核心看点和特色要求
        </p>
      </div>

      {updateMutation.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          保存失败: {updateMutation.error.message}
        </div>
      )}

      {updateMutation.isSuccess && !isSaving && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          ✓ 保存成功
        </div>
      )}
    </div>
  )
}
