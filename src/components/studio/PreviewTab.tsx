/**
 * 预览导出 Tab 组件
 * 分镜板视图和数据导出
 */

import { Download, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'

type Props = {
  episode: any
  shots: any[]
  setting: any
}

export function PreviewTab({ episode, shots, setting }: Props) {
  const [copied, setCopied] = useState(false)

  // 构建导出数据
  const exportData = {
    episode: {
      number: episode.episodeNumber,
      title: episode.title,
      objective: episode.objective,
    },
    setting: {
      era: setting?.era,
      genre: setting?.genre,
      visualStyle: setting?.visualStyle,
      stylePrompt: setting?.stylePrompt,
      lightingPrompt: setting?.lightingPrompt,
      colorPrompt: setting?.colorPrompt,
    },
    shots: shots.map((shot) => ({
      shotNumber: shot.shotNumber,
      name: shot.name,
      duration: shot.duration,
      scene: shot.scenePrompt,
      action: shot.actionPrompt,
      camera: shot.cameraPrompt,
      characters: shot.characters?.map((sc: any) => ({
        name: sc.character.name,
        dialogue: sc.dialogue,
        position: sc.position,
      })),
      keyframe: shot.frames?.find((f: any) => f.type === 'keyframe' && f.isSelected)?.resultUrl,
      animation: shot.frames?.find((f: any) => f.type === 'animation' && f.isSelected)?.resultUrl,
    })),
  }

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `episode-${episode.episodeNumber}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">预览导出</h2>
          <p className="text-sm text-gray-500 mt-1">
            查看分镜板,导出数据用于后期合成
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyJSON} className="gap-2">
            {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? '已复制' : '复制JSON'}
          </Button>
          <Button onClick={handleDownloadJSON} className="gap-2">
            <Download className="h-4 w-4" />
            导出JSON
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">总镜头数</div>
          <div className="text-2xl font-bold text-blue-700">{shots.length}</div>
        </div>
      </div>

      {/* 分镜板 - 网格视图 */}
      <div>
        <h3 className="font-medium mb-4">分镜板</h3>
        <div className="grid grid-cols-3 gap-4">
          {shots.map((shot) => {
            const keyframe = shot.frames?.find((f: any) => f.type === 'keyframe' && f.isSelected)
            const animation = shot.frames?.find((f: any) => f.type === 'animation' && f.isSelected)

            return (
              <div key={shot.id} className="border rounded-lg overflow-hidden">
                {/* 图像预览 */}
                <div className="aspect-video bg-gray-100 relative">
                  {keyframe?.resultUrl ? (
                    <img
                      src={keyframe.resultUrl}
                      alt={`Shot ${shot.shotNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      未生成
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
                    #{shot.shotNumber}
                  </div>
                  {shot.duration && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {shot.duration}s
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="p-3 space-y-2">
                  <h4 className="font-medium text-sm">
                    {shot.name || `镜头 ${shot.shotNumber}`}
                  </h4>

                  {shot.characters && shot.characters.length > 0 && (
                    <div className="space-y-1">
                      {shot.characters.map((sc: any) => (
                        <div key={sc.id} className="text-xs">
                          <span className="font-medium text-purple-600">{sc.character.name}:</span>
                          <span className="text-gray-600 ml-1">{sc.dialogue || '(无台词)'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 text-xs">
                    {keyframe?.resultUrl && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✓ 首帧</span>
                    )}
                    {animation?.resultUrl && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">✓ 动画</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {shots.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>还没有镜头</p>
            <p className="text-sm mt-1">请先在"镜头制作"tab中创建镜头</p>
          </div>
        )}
      </div>

      {/* 导出数据预览 */}
      <div>
        <h3 className="font-medium mb-4">导出数据预览</h3>
        <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
          <pre className="text-xs font-mono text-gray-700">
            {JSON.stringify(exportData, null, 2)}
          </pre>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          可以将此数据导入到视频编辑软件或其他工具中使用
        </p>
      </div>
    </div>
  )
}
