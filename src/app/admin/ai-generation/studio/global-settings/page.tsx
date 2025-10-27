"use client"

export const dynamic = 'force-dynamic'

/**
 * Studio Global Settings Page
 *
 * 全局设定页面，用于管理镜头制作中的完整场景 Prompt 模板
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { api } from '~/components/providers/trpc-provider'
import { Button } from '~/components/ui/button'

export default function GlobalSettingsPage() {
  const router = useRouter()
  const [promptTemplate, setPromptTemplate] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 查询全局设定
  const { data: settings, refetch } = api.studio.getGlobalSettings.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  // 更新全局设定 mutation
  const updateMutation = api.studio.updateGlobalSettings.useMutation({
    onSuccess: () => {
      setIsSaving(false)
      alert('保存成功！')
      void refetch()
    },
    onError: (error) => {
      setIsSaving(false)
      alert(`保存失败: ${error.message}`)
    },
  })

  // 初始化模板内容
  useEffect(() => {
    if (settings?.promptTemplate) {
      setPromptTemplate(settings.promptTemplate)
    }
  }, [settings])

  const handleSave = () => {
    setIsSaving(true)
    updateMutation.mutate({
      promptTemplate: promptTemplate.trim(),
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          onClick={() => router.push('/admin/ai-generation/studio')}
          variant="outline"
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          返回 Studio
        </Button>
        <h1 className="text-3xl font-bold">全局设定</h1>
        <p className="text-gray-500 mt-1">配置镜头制作中的完整场景 Prompt 模板</p>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                完整场景 Prompt 模板
              </label>
              <p className="text-xs text-gray-500 mb-4">
                在这里配置完整场景 Prompt 的模板。您可以使用以下数据库字段变量：
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-2">可用变量：</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{styleSettings}}'}</code> - 风格设定</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{characterName}}'}</code> - 角色名称</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{characterAppearance}}'}</code> - 角色外观</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{characterEnvironment}}'}</code> - 角色场景位置</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{framing}}'}</code> - 景别</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{bodyOrientation}}'}</code> - 身体朝向</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{faceDirection}}'}</code> - 面部和眼神朝向</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{expression}}'}</code> - 表情描述</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{action}}'}</code> - 动作描述</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{dialogue}}'}</code> - 台词</li>
                  <li><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{cameraMovement}}'}</code> - 镜头运动</li>
                </ul>
                <p className="text-xs text-blue-700 mt-3">
                  提示：这些变量将在生成镜头时自动替换为对应的数据库字段内容
                </p>
              </div>
              <textarea
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                rows={15}
                placeholder="例如：&#10;{{styleSettings}}&#10;{{framing}}&#10;{{cameraMovement}}&#10;{{bodyOrientation}}&#10;{{faceDirection}}&#10;{{expression}}&#10;{{action}}&#10;{{dialogue}}"
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-xs text-gray-500 mt-2">
                模板将用于在镜头制作时拼接各个字段，生成完整的场景 Prompt
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/ai-generation/studio')}
              >
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !promptTemplate.trim()}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? '保存中...' : '保存设定'}
              </Button>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-3">使用说明</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p>1. 在上方文本框中编辑完整场景 Prompt 的模板</p>
            <p>2. 使用 <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">{'{{变量名}}'}</code> 的格式插入数据库字段</p>
            <p>3. 系统会在镜头制作时自动将变量替换为实际内容</p>
            <p>4. 每行一个字段，系统会自动用换行符连接</p>
          </div>
        </div>
      </div>
    </div>
  )
}
