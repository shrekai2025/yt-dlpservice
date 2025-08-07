'use client'

import { useState } from 'react'
import Link from 'next/link'

interface TestResult {
  success: boolean
  testInfo: {
    url: string
    platform: string
    duration: string
    timestamp: string
  }
  scraperResult: {
    success: boolean
    data?: any
    error?: string
    commentCount?: number
    duration?: number
  }
}

const TEST_URLS = {
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  bilibili: 'https://www.bilibili.com/video/BV1GJ411x7h7',
  xiaoyuzhou: 'https://www.xiaoyuzhoufm.com/episode/5e280fab418a84a046628f51'
}

export default function TestScraperPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string>('')

  const handleTest = async (testUrl?: string) => {
    const targetUrl = testUrl || url
    if (!targetUrl) {
      setError('请输入URL')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/test/metadata-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: targetUrl,
          timeout: 30000,
          waitTime: 10000,
          maxTopLevelComments: 5,
          maxTotalComments: 10
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || '测试失败')
      }
    } catch (err: any) {
      setError(err.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  const formatPlatformData = (data: any) => {
    if (!data.platformData) return null
    
    const platformData = data.platformData
    const entries = Object.entries(platformData)
    
    return (
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-gray-600">{getFieldLabel(key)}:</span>
            <span className="font-medium">{formatNumber(value as number)}</span>
          </div>
        ))}
      </div>
    )
  }

  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      playCount: '播放量',
      viewCount: '播放量',
      likeCount: '点赞数',
      coinCount: '硬币数',
      shareCount: '转发数',
      favoriteCount: '收藏数',
      commentCount: '评论数'
    }
    return labels[key] || key
  }

  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`
    }
    return num.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-blue-600 hover:text-blue-500">
                ← 返回管理面板
              </Link>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">🕷️ 元数据爬虫测试</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* 测试表单 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">测试爬虫功能</h2>
          
          {/* URL输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              输入URL或选择测试URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 快速测试按钮 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              快速测试
            </label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TEST_URLS).map(([platform, testUrl]) => (
                <button
                  key={platform}
                  onClick={() => handleTest(testUrl)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    platform === 'youtube' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                    platform === 'bilibili' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                    'bg-purple-100 text-purple-800 hover:bg-purple-200'
                  } disabled:opacity-50`}
                >
                  {loading ? '测试中...' : `测试${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义测试按钮 */}
          <button
            onClick={() => handleTest()}
            disabled={loading || !url}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '测试中...' : '开始测试'}
          </button>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="text-red-400">❌</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">测试失败</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 测试结果 */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">测试结果</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                result.scraperResult.success 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.scraperResult.success ? '✅ 成功' : '❌ 失败'}
              </span>
            </div>

            {/* 测试信息 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">测试信息</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-600">平台:</span> {result.testInfo.platform}</div>
                  <div><span className="text-gray-600">耗时:</span> {result.testInfo.duration}</div>
                  <div><span className="text-gray-600">时间:</span> {new Date(result.testInfo.timestamp).toLocaleString()}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">爬取信息</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-600">状态:</span> {result.scraperResult.success ? '成功' : '失败'}</div>
                  <div><span className="text-gray-600">评论数:</span> {result.scraperResult.commentCount || 0}</div>
                  {result.scraperResult.error && (
                    <div><span className="text-gray-600">错误:</span> <span className="text-red-600">{result.scraperResult.error}</span></div>
                  )}
                </div>
              </div>
            </div>

            {/* 爬取数据 */}
            {result.scraperResult.success && result.scraperResult.data && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">基本信息</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">标题</div>
                        <div className="font-medium">{result.scraperResult.data.title}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">作者</div>
                        <div className="font-medium">{result.scraperResult.data.author}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">时长</div>
                        <div className="font-medium">{Math.floor(result.scraperResult.data.duration / 60)}:{(result.scraperResult.data.duration % 60).toString().padStart(2, '0')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">发布时间</div>
                        <div className="font-medium">{result.scraperResult.data.publishDate || '未知'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 平台数据 */}
                {result.scraperResult.data.platformData && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">平台数据</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {formatPlatformData(result.scraperResult.data)}
                    </div>
                  </div>
                )}

                {/* 评论数据 */}
                {result.scraperResult.data.comments && result.scraperResult.data.comments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">评论数据 ({result.scraperResult.data.comments.length}条)</h4>
                    <div className="space-y-3">
                      {result.scraperResult.data.comments.map((comment: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="font-medium text-sm text-gray-900 mb-1">{comment.author}</div>
                          <div className="text-sm text-gray-700 mb-2">{comment.content}</div>
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="pl-4 border-l-2 border-gray-200">
                              {comment.replies.map((reply: any, replyIndex: number) => (
                                <div key={replyIndex} className="text-sm text-gray-600 mb-1">
                                  <span className="font-medium">{reply.author}:</span> {reply.content}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 原始数据 */}
                <details className="border border-gray-200 rounded-lg">
                  <summary className="p-4 font-medium text-gray-900 cursor-pointer">查看原始数据</summary>
                  <div className="p-4 border-t border-gray-200">
                    <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                      {JSON.stringify(result.scraperResult.data, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}