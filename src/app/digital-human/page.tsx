/**
 * 数字人主页面 - 创建和管理任务
 */

'use client'

import { useState } from 'react'
import { DigitalHumanTaskList } from '~/components/digital-human/DigitalHumanTaskList'
import { DigitalHumanCompactForm } from '~/components/digital-human/DigitalHumanCompactForm'
import { Film } from 'lucide-react'

export interface TaskFormData {
  name: string
  imageUrl: string
  audioUrl: string
  prompt: string
  seed: number
  peFastMode: boolean
  enableMultiSubject: boolean
}

export default function DigitalHumanPage() {
  const [formData, setFormData] = useState<TaskFormData | null>(null)

  const handleApplyTask = (data: TaskFormData) => {
    setFormData(data)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center space-x-3">
        <Film className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">数字人生成</h1>
          <p className="text-sm text-gray-600">
            使用即梦 OmniHuman 1.5 模型生成高质量数字人视频
          </p>
        </div>
      </div>

      {/* 创建任务表单（紧凑版） */}
      <DigitalHumanCompactForm initialData={formData} onDataApplied={() => setFormData(null)} />

      {/* 任务列表 */}
      <DigitalHumanTaskList onApplyTask={handleApplyTask} />
    </div>
  )
}
