/**
 * 数字人任务创建页面
 */

import { DigitalHumanForm } from '~/components/digital-human/DigitalHumanForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Film, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CreateDigitalHumanPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center">
          <Film className="h-8 w-8 mr-3 text-blue-600" />
          创建数字人任务
        </h1>
        <p className="text-gray-600">
          上传图片和音频，开始生成数字人视频
        </p>
      </div>

      {/* 重要提示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-amber-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            重要注意事项
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">音频时长限制</h4>
              <p className="text-sm text-gray-600">
                音频时长必须小于 35 秒，超出限制会导致生成失败
              </p>
            </div>
            <div>
              <h4 className="font-medium">图片规格要求</h4>
              <p className="text-sm text-gray-600">
                支持 JPG/PNG 格式，小于 5MB，分辨率小于 4096x4096
              </p>
            </div>
            <div>
              <h4 className="font-medium">多主体模式</h4>
              <p className="text-sm text-gray-600">
                当图片包含多个人物时，可选择"启用多主体模式"来选择说话主体
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 创建表单 */}
      <div className="flex justify-center">
        <DigitalHumanForm />
      </div>

      {/* 操作链接 */}
      <div className="text-center">
        <Button variant="outline" asChild>
          <Link href="/digital-human">
            返回任务列表
          </Link>
        </Button>
      </div>
    </div>
  )
}