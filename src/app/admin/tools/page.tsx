"use client"

import { useState } from "react"
import { api } from "~/components/providers/trpc-provider"

export default function ToolsPage() {
  const [configKey, setConfigKey] = useState("")
  const [configValue, setConfigValue] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [testResult, setTestResult] = useState<string>("")

  // 数据查询
  const { data: browserStatus, refetch: refetchBrowserStatus } = api.browser.getLoginStatus.useQuery()

  // Mutations
  const setConfig = api.config.set.useMutation()
  const testVoiceService = api.config.testVoiceService.useMutation()

  // 浏览器管理 Mutations
  const initializeBrowser = api.browser.initialize.useMutation({
    onSuccess: () => {
      refetchBrowserStatus()
    },
  })
  const startLogin = api.browser.startLogin.useMutation({
    onSuccess: () => {
      refetchBrowserStatus()
    },
  })
  const refreshLogin = api.browser.refreshLogin.useMutation({
    onSuccess: () => {
      refetchBrowserStatus()
    },
  })
  const closeBrowser = api.browser.closeBrowser.useMutation({
    onSuccess: () => {
      refetchBrowserStatus()
    },
  })
  const testBrowser = api.browser.testBrowser.useMutation()

  // Chrome 状态检查
  const { data: chromeStatus, refetch: refetchChromeStatus } = api.browser.checkChromeInstallation.useQuery()
  const installChrome = api.browser.installChrome.useMutation({
    onSuccess: () => {
      refetchChromeStatus()
    }
  })

  const { data: videoInfo, refetch: getVideoInfo, isFetching: getVideoInfoLoading, error: getVideoInfoError } = api.task.getVideoInfo.useQuery(
    { url: previewUrl },
    { enabled: false }
  )

  const handleSetConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configKey.trim() || !configValue.trim()) return

    try {
      await setConfig.mutateAsync({
        key: configKey.trim(),
        value: configValue.trim(),
      })
      setConfigKey("")
      setConfigValue("")
    } catch (error) {
      console.error("Failed to set config:", error)
    }
  }

  const handlePreviewVideo = async () => {
    if (!previewUrl.trim()) return
    
    try {
      await getVideoInfo()
    } catch (error) {
      console.error("Failed to get video info:", error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
  }

  const testDoubaoAPI = api.config.testDoubaoAPI.useMutation()

  const handleDoubaoTest = async () => {
    if (!selectedFile) {
      setTestResult("请先选择音频文件")
      return
    }

    try {
      setTestResult("正在测试豆包API...")
      
      // 将文件转换为 Base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string
        const base64 = base64Data.split(',')[1] // 移除 data:audio/...;base64, 前缀
        
        if (!base64) {
          setTestResult("❌ 文件读取失败：无法获取音频数据")
          return
        }
        
        try {
          const result = await testDoubaoAPI.mutateAsync({
            audioData: base64,
            fileName: selectedFile.name || 'unknown.mp3'
          })
          
          if (result.success) {
            setTestResult(`✅ 豆包API测试成功！\n\n📝 转录结果:\n${result.data.transcription}\n\n📊 文件信息:\n- 文件名: ${selectedFile.name || 'unknown.mp3'}\n- 文件大小: ${selectedFile.size} bytes`)
          } else {
            setTestResult("❌ 豆包API测试失败")
          }
        } catch (apiError) {
          setTestResult("❌ 豆包API测试失败: " + (apiError instanceof Error ? apiError.message : String(apiError)))
        }
      }
      reader.readAsDataURL(selectedFile)
    } catch (error) {
      setTestResult("测试失败: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">实用工具</h1>

      {/* YouTube 登录管理 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">YouTube 登录管理 (独立 Chrome)</h2>
        <div className="space-y-4">
          {/* Chrome 安装状态检查 */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Chrome 浏览器状态</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {chromeStatus?.installed 
                    ? "✅ Google Chrome 已安装并可用" 
                    : "❌ 未检测到 Google Chrome，需要安装"}
                </p>
                {!chromeStatus?.success && (
                  <p className="text-sm text-red-600 mt-1">{chromeStatus?.message}</p>
                )}
              </div>
              
              {!chromeStatus?.installed && (
                <button
                  onClick={() => installChrome.mutate()}
                  disabled={installChrome.isPending}
                  className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
                >
                  {installChrome.isPending ? "安装中..." : "安装 Chrome"}
                </button>
              )}
              
              <button
                onClick={() => refetchChromeStatus()}
                className="ml-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                重新检测
              </button>
            </div>
            
            {installChrome.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700">
                  <strong>安装失败：</strong>{installChrome.error.message}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  请手动安装 Google Chrome 浏览器，或检查系统权限
                </p>
              </div>
            )}
          </div>
          
          {/* 智能登录说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="flex items-start space-x-2">
              <div className="text-blue-500 mt-0.5">💡</div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">独立 Chrome 智能登录</p>
                <p className="mb-2">
                  系统现在使用独立的 Google Chrome 浏览器（非 Chromium）进行 YouTube 登录，
                  兼容性更好，登录成功率更高。当遇到认证错误时会自动弹出 Chrome 浏览器。
                </p>
                <p className="text-blue-600">
                  <strong>推荐操作：</strong>确保 Chrome 已安装，然后手动登录一次，后续系统将自动使用保存的登录状态。
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => initializeBrowser.mutate()}
              disabled={initializeBrowser.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {initializeBrowser.isPending ? "初始化中..." : "初始化 Chrome"}
            </button>
            
            <button
              onClick={() => startLogin.mutate()}
              disabled={startLogin.isPending}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {startLogin.isPending ? "启动中..." : "手动登录"}
            </button>
            
            <button
              onClick={() => refreshLogin.mutate()}
              disabled={refreshLogin.isPending}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              {refreshLogin.isPending ? "刷新中..." : "刷新登录状态"}
            </button>
            
            <button
              onClick={() => closeBrowser.mutate()}
              disabled={closeBrowser.isPending}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {closeBrowser.isPending ? "关闭中..." : "关闭浏览器"}
            </button>
            
            <button
              onClick={() => testBrowser.mutate()}
              disabled={testBrowser.isPending}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {testBrowser.isPending ? "测试中..." : "测试 Chrome"}
            </button>
          </div>
          
          {/* 登录操作提示 */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <p className="mb-2"><strong>使用流程：</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>确认 Chrome 浏览器已安装（如未安装会自动安装）</li>
              <li>点击"初始化 Chrome"准备专用 Chrome 实例</li>
              <li>点击"手动登录"主动完成 YouTube 登录（推荐首次使用）</li>
              <li>创建 YouTube 任务，系统会自动检测并处理认证需求</li>
              <li>如果任务失败提示需要登录，系统会自动弹出 Chrome 浏览器</li>
              <li>在专用 Chrome 中完成登录后，任务会自动重试</li>
            </ol>
            <p className="mt-2 text-gray-500">
              <strong>注意：</strong>独立 Chrome 与您的主浏览器完全隔离，登录状态会自动保存。
            </p>
          </div>

          {/* 自动登录状态显示 */}
          {browserStatus?.isLoggedIn && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center space-x-2">
                <div className="text-green-500">✅</div>
                <div className="text-sm text-green-800">
                  <p className="font-medium">Chrome 自动登录已就绪</p>
                  <p>系统将在需要时自动使用已保存的 Chrome 登录状态处理 YouTube 视频</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 视频信息预览 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">视频信息预览</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="输入视频 URL 进行预览"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePreviewVideo}
              disabled={getVideoInfoLoading}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              {getVideoInfoLoading ? "获取中..." : "预览"}
            </button>
          </div>
          
          {getVideoInfoError && (
            <div className="text-red-600 text-sm">
              获取视频信息失败: {getVideoInfoError.message}
            </div>
          )}
          
          {videoInfo && videoInfo.data && (
            <div className="border border-gray-200 rounded p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">{videoInfo.data.title}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>时长: {Math.floor(videoInfo.data.duration / 60)}:{(videoInfo.data.duration % 60).toString().padStart(2, '0')}</div>
                {videoInfo.data.uploader && <div>上传者: {videoInfo.data.uploader}</div>}
                <div>平台: {videoInfo.platform || '未知'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 配置管理 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">配置管理</h2>
        <form onSubmit={handleSetConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="configKey" className="block text-sm font-medium text-gray-700 mb-2">
                配置键
              </label>
              <input
                type="text"
                id="configKey"
                value={configKey}
                onChange={(e) => setConfigKey(e.target.value)}
                placeholder="如: audio_quality"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="configValue" className="block text-sm font-medium text-gray-700 mb-2">
                配置值
              </label>
              <input
                type="text"
                id="configValue"
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                placeholder="如: 192k"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={setConfig.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {setConfig.isPending ? "设置中..." : "设置配置"}
            </button>
          </div>
        </form>
      </div>

      {/* 豆包API测试 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">豆包API测试</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="audioFile" className="block text-sm font-medium text-gray-700 mb-2">
              选择音频文件
            </label>
            <input
              type="file"
              id="audioFile"
              accept="audio/*"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              支持 MP3、WAV、M4A 等音频格式，文件大小建议不超过 100MB
            </p>
          </div>
          
          <button
            onClick={handleDoubaoTest}
            disabled={!selectedFile}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            测试豆包API
          </button>
          
          {testResult && (
            <div className="border border-gray-200 rounded p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">测试结果</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{testResult}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 