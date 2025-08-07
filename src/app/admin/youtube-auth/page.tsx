'use client'

import { useState, useEffect } from 'react'

interface AuthStatus {
  authenticated: boolean
  cookieFilePath: string
  guide: string
}

export default function YouTubeAuthPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [cookiesText, setCookiesText] = useState('')
  const [testing, setTesting] = useState(false)
  const [testUrl, setTestUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

  // 获取认证状态
  const fetchAuthStatus = async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/youtube/auth')
      const result = await response.json()
      
      if (result.success) {
        setAuthStatus(result.data)
      } else {
        setMessage(`获取状态失败: ${result.error}`)
      }
    } catch (error: any) {
      setMessage(`获取状态失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 设置Cookie
  const setCookies = async () => {
    if (!cookiesText.trim()) {
      setMessage('请输入Cookie内容')
      return
    }

    setLoading(true)
    setMessage('正在设置Cookie...')
    try {
      const response = await fetch('/api/youtube/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: cookiesText })
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage('✅ Cookie设置成功！')
        setCookiesText('')
        await fetchAuthStatus()
      } else {
        setMessage(`❌ 设置失败: ${result.error}`)
      }
    } catch (error: any) {
      setMessage(`❌ 设置失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 清除Cookie
  const clearCookies = async () => {
    setLoading(true)
    setMessage('正在清除Cookie...')
    try {
      const response = await fetch('/api/youtube/auth', {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage('✅ Cookie已清除')
        await fetchAuthStatus()
      } else {
        setMessage(`❌ 清除失败: ${result.error}`)
      }
    } catch (error: any) {
      setMessage(`❌ 清除失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 测试Cookie
  const testCookies = async () => {
    setTesting(true)
    setMessage('正在测试Cookie有效性...')
    try {
      const response = await fetch('/api/youtube/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', testUrl })
      })

      const result = await response.json()
      
      if (result.success) {
        setMessage(`✅ Cookie测试成功！\n标题: ${result.data.title}\n时长: ${result.data.duration}秒\n播放量: ${result.data.viewCount?.toLocaleString() || 'N/A'}\n频道: ${result.data.uploader}`)
      } else {
        setMessage(`❌ ${result.message || result.error}`)
      }
    } catch (error: any) {
      setMessage(`❌ 测试失败: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    fetchAuthStatus()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">YouTube认证管理</h1>
      
      {/* 状态显示 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">认证状态</h2>
        {authStatus ? (
          <div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              authStatus.authenticated 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {authStatus.authenticated ? '✅ 已配置Cookie' : '❌ 未配置Cookie'}
            </div>
            <p className="mt-2 text-gray-600">
              Cookie文件路径: <code className="bg-gray-100 px-2 py-1 rounded">{authStatus.cookieFilePath}</code>
            </p>
          </div>
        ) : (
          <p>加载中...</p>
        )}
      </div>

      {/* 消息显示 */}
      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 whitespace-pre-wrap">{message}</p>
        </div>
      )}
      
      {/* Cookie获取指南 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">📋 Cookie获取指南</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">步骤1: 在本地浏览器获取Cookie</h3>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 ml-4">
              <li>在Chrome/Firefox中访问 <code className="bg-blue-100 px-1 rounded">https://www.youtube.com</code> 并登录</li>
              <li>按 <kbd className="bg-blue-100 px-2 py-1 rounded">F12</kbd> 打开开发者工具</li>
              <li>转到 <strong>Network</strong> 标签页</li>
              <li>刷新页面，找到任意请求</li>
              <li>右键点击请求 → <strong>Copy</strong> → <strong>Copy as cURL (bash)</strong></li>
              <li>从cURL命令中复制 <code className="bg-blue-100 px-1 rounded">-H 'cookie: ...'</code> 部分的cookie值</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">或者使用浏览器扩展（推荐）</h3>
            <p className="text-blue-700">安装"Cookie-Editor"扩展，点击扩展 → Export → Export as Netscape → Copy</p>
          </div>
        </div>
      </div>

      {/* 手动设置Cookie */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🍪 设置Cookie</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cookie内容 (支持浏览器Cookie字符串或Netscape格式)
          </label>
          <textarea
            placeholder={`粘贴Cookie内容，例如:
1. 浏览器格式: key1=value1; key2=value2; key3=value3
2. Netscape格式: 以"# Netscape HTTP Cookie File"开头的完整文件内容`}
            value={cookiesText}
            onChange={(e) => setCookiesText(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 h-40 mb-4 font-mono text-sm resize-none"
            disabled={loading}
          />
          <div className="text-xs text-gray-500 mb-4">
            💡 系统会自动识别格式并转换为适合yt-dlp的Netscape格式
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={setCookies}
            disabled={loading || !cookiesText.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                处理中...
              </>
            ) : (
              '🔧 设置Cookie'
            )}
          </button>
          <button
            onClick={clearCookies}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
          >
            {loading ? '处理中...' : '🗑️ 清除Cookie'}
          </button>
        </div>
      </div>

      {/* Cookie测试 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🧪 测试Cookie有效性</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试视频URL（可选）
          </label>
          <input
            type="url"
            placeholder="YouTube视频URL，留空使用默认测试视频"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            disabled={testing}
          />
        </div>
        <button
          onClick={testCookies}
          disabled={testing || !authStatus?.authenticated}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center"
        >
          {testing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              测试中...
            </>
          ) : (
            '🧪 测试Cookie'
          )}
        </button>
        {!authStatus?.authenticated && (
          <p className="text-sm text-gray-500 mt-2">请先设置Cookie后再进行测试</p>
        )}
      </div>

      {/* 使用指南 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">使用指南</h2>
        {authStatus ? (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded overflow-x-auto">
            {authStatus.guide}
          </pre>
        ) : <p>加载中...</p>}
      </div>
    </div>
  )
}