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
      
      {/* 手动设置Cookie */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">手动设置Cookie</h2>
        <p className="text-gray-600 mb-4">
          从本地浏览器复制YouTube的Cookie (推荐使用Netscape格式)。
        </p>
        <textarea
          placeholder="粘贴Cookie内容..."
          value={cookiesText}
          onChange={(e) => setCookiesText(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 h-40 mb-4 font-mono text-sm"
          disabled={loading}
        />
        <div className="flex space-x-4">
          <button
            onClick={setCookies}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
          >
            {loading ? '处理中...' : '设置/更新Cookie'}
          </button>
          <button
            onClick={clearCookies}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
          >
            {loading ? '处理中...' : '清除Cookie'}
          </button>
        </div>
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