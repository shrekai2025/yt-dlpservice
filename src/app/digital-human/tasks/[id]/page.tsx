/**
 * 数字人任务详情页面
 */

import { DigitalHumanTaskDetail } from '~/components/digital-human/DigitalHumanTaskDetail'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Film } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function DigitalHumanTaskDetailPage({ params }: Props) {
  // Await params as required by Next.js 15
  const resolvedParams = await params

  // 验证任务ID格式
  if (!resolvedParams.id || resolvedParams.id.length < 10) {
    notFound()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/digital-human">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Link>
          </Button>

          <div className="flex items-center">
            <Film className="h-6 w-6 mr-2 text-blue-600" />
            <h1 className="text-2xl font-bold">任务详情</h1>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          任务ID: {resolvedParams.id}
        </div>
      </div>

      {/* 任务详情 */}
      <DigitalHumanTaskDetail taskId={resolvedParams.id} />
    </div>
  )
}