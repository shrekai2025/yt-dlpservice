/**
 * 脚本数据查看器组件
 * 格式化展示脚本JSON数据
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

type ScriptData = {
  styleSettings?: string
  learningPoint?: string
  characters?: Array<{
    name: string
    appearance: string
    environment: string
  }>
  shots?: Array<{
    shotNumber: number
    character: string
    action: string
    dialogue: string
  }>
}

type Props = {
  data: string | ScriptData
  className?: string
}

/**
 * 从字符串中提取JSON部分（从第一个{到最后一个}）
 */
function extractJsonFromString(str: string): string {
  const firstBrace = str.indexOf('{')
  const lastBrace = str.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    return str // 如果找不到有效的大括号，返回原字符串
  }

  return str.substring(firstBrace, lastBrace + 1)
}

export function ScriptDataViewer({ data, className = '' }: Props) {
  const [isRawDataExpanded, setIsRawDataExpanded] = useState(false)

  // 解析数据
  let parsedData: ScriptData | null = null
  let rawJsonString = ''
  let originalData = ''
  let parseError = false

  try {
    if (typeof data === 'string') {
      originalData = data // 保存原始数据
      // 提取JSON部分（从第一个{到最后一个}）
      const extractedJson = extractJsonFromString(data)
      rawJsonString = extractedJson
      parsedData = JSON.parse(extractedJson)
    } else {
      originalData = JSON.stringify(data, null, 2)
      rawJsonString = JSON.stringify(data, null, 2)
      parsedData = data
    }
  } catch (error) {
    parseError = true
    rawJsonString = typeof data === 'string' ? data : JSON.stringify(data)
    originalData = rawJsonString
  }

  // 如果解析失败，只显示原始数据
  if (parseError || !parsedData) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
          ⚠️ 数据格式不是有效的JSON，以下为原始内容：
        </div>
        <div className="rounded-md border border-gray-300 bg-gray-50 p-3">
          <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-auto max-h-96">
            {rawJsonString}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 风格设定 */}
      {parsedData.styleSettings && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <div className="text-xs font-semibold text-blue-900 mb-2 uppercase tracking-wide">
            风格设定
          </div>
          <div className="text-sm text-blue-800 leading-relaxed">
            {parsedData.styleSettings}
          </div>
        </div>
      )}

      {/* 全局角色设定 */}
      {parsedData.characters && parsedData.characters.length > 0 && (
        <div className="rounded-md border border-purple-200 bg-purple-50 p-4">
          <div className="text-xs font-semibold text-purple-900 mb-2 uppercase tracking-wide">
            全局角色设定
          </div>
          <div className="space-y-3">
            {parsedData.characters.map((char, index) => (
              <div key={index} className="bg-white rounded-md border border-purple-200 p-3">
                <div className="text-sm font-semibold text-purple-900 mb-2">
                  {char.name}
                </div>
                <div className="space-y-2 text-sm text-purple-800">
                  <div>
                    <span className="font-medium">外观设定：</span>
                    {char.appearance}
                  </div>
                  <div>
                    <span className="font-medium">所在场景：</span>
                    {char.environment}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 完整场景描述（拼接字段） */}
      {parsedData.styleSettings && parsedData.characters && parsedData.characters.length > 0 && (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
          <div className="text-xs font-semibold text-orange-900 mb-2 uppercase tracking-wide">
            完整场景描述
          </div>
          <div className="space-y-2">
            {parsedData.characters.map((char, index) => {
              const compositeParts = [
                parsedData.styleSettings,
                '角色',
                char.appearance,
                '摄像机拍摄微微侧面',
                char.environment,
              ]
              const compositeText = compositeParts.filter(Boolean).join(' ')

              return (
                <div key={index} className="text-sm text-orange-900 leading-relaxed bg-white rounded-md border border-orange-200 p-3">
                  <div className="font-medium text-orange-900 mb-1">{char.name}:</div>
                  <div className="text-orange-800">{compositeText}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 学习要点 */}
      {parsedData.learningPoint && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <div className="text-xs font-semibold text-green-900 mb-2 uppercase tracking-wide">
            英语学习要点
          </div>
          <div className="text-sm text-green-800 leading-relaxed">
            {parsedData.learningPoint}
          </div>
        </div>
      )}

      {/* 镜头列表 */}
      {parsedData.shots && parsedData.shots.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            镜头脚本 ({parsedData.shots.length} 个镜头)
          </div>
          <div className="space-y-3">
            {parsedData.shots.map((shot, index) => (
              <div
                key={index}
                className="rounded-md border border-gray-300 bg-white shadow-sm hover:shadow transition-shadow"
              >
                {/* 镜头头部 */}
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded">
                      镜头 {shot.shotNumber}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {shot.character}
                    </div>
                  </div>
                </div>

                {/* 镜头内容 */}
                <div className="p-4 space-y-3">
                  {/* 角色动作与表情 */}
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">
                      角色动作与表情
                    </div>
                    <div className="text-sm text-gray-700 bg-indigo-50 border border-indigo-200 rounded px-3 py-2">
                      {shot.action}
                    </div>
                  </div>

                  {/* 台词 */}
                  <div>
                    <div className="text-xs font-semibold text-gray-600 mb-1">
                      台词
                    </div>
                    <div className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded px-3 py-2 italic">
                      "{shot.dialogue}"
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 原始返回数据 - 默认收起 */}
      <div className="rounded-md border border-gray-300 bg-gray-50">
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setIsRawDataExpanded(!isRawDataExpanded)}
        >
          <div className="flex items-center gap-2">
            {isRawDataExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm font-medium text-gray-700">原始返回数据</span>
            {originalData !== rawJsonString && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                已自动提取JSON
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {isRawDataExpanded ? '点击收起' : '点击展开'}
          </span>
        </div>
        {isRawDataExpanded && (
          <div className="px-3 pb-3 pt-0 space-y-2">
            {/* 如果进行了JSON提取，显示提示信息 */}
            {originalData !== rawJsonString && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
                <div className="font-semibold mb-1">📝 数据处理说明</div>
                <div>已自动从返回内容中提取JSON部分（从第一个 {'{'} 到最后一个 {'}'}）</div>
              </div>
            )}

            {/* 显示完整的原始数据 */}
            <div className="bg-white rounded border border-gray-200 p-3 overflow-auto max-h-96">
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                {originalData}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
