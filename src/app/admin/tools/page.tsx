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
  const { data: browserStatus, refetch: refetchBrowserStatus } = api.browser.getStatus.useQuery()

  // Mutations
  const setConfig = api.config.set.useMutation()
  const testVoiceService = api.config.testVoiceService.useMutation()
  const testDoubaoSmallAPI = api.config.testDoubaoSmallAPI.useMutation()
  const diagnoseDoubaoSmallAPI = api.config.diagnoseDoubaoSmallAPI.useMutation()
  const getAllVoiceServiceStatus = api.config.getAllVoiceServiceStatus.useQuery()

  // 浏览器管理 Mutations
  const cleanupBrowser = api.browser.cleanup.useMutation({
    onSuccess: () => {
      refetchBrowserStatus()
    },
  })
  const testBrowser = api.browser.testBrowser.useMutation()

  // yt-dlp 状态检查
  const { data: downloaderStatus, refetch: refetchDownloaderStatus } = api.task.checkDownloader.useQuery()

  // 文件清理相关
  const { data: cleanupStatus, refetch: refetchCleanupStatus } = api.cleanup.status.useQuery()
  const manualCleanup = api.cleanup.manual.useMutation({
    onSuccess: () => {
      refetchCleanupStatus()
    }
  })
  const startAutoCleanup = api.cleanup.startAuto.useMutation({
    onSuccess: () => {
      refetchCleanupStatus()
    }
  })
  const stopAutoCleanup = api.cleanup.stopAuto.useMutation({
    onSuccess: () => {
      refetchCleanupStatus()
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
  const testGoogleSTT = api.config.testGoogleSTT.useMutation()

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

  const handleDoubaoSmallTest = async () => {
    if (!selectedFile) {
      setTestResult("请先选择音频文件")
      return
    }

    try {
      setTestResult("正在测试豆包录音文件识别（小模型版）API...")
      
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
          const result = await testDoubaoSmallAPI.mutateAsync({
            audioData: base64,
            fileName: selectedFile.name || 'unknown.mp3'
          })
          
          if (result.success) {
            setTestResult(`✅ 豆包小模型API测试成功！\n\n📝 转录结果:\n${result.data.transcription}\n\n📊 文件信息:\n- 文件名: ${selectedFile.name || 'unknown.mp3'}\n- 文件大小: ${selectedFile.size} bytes`)
          } else {
            setTestResult("❌ 豆包小模型API测试失败")
          }
        } catch (apiError) {
          setTestResult("❌ 豆包小模型API测试失败: " + (apiError instanceof Error ? apiError.message : String(apiError)))
        }
      }
      reader.readAsDataURL(selectedFile)
    } catch (error) {
      setTestResult("测试失败: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleGoogleSTTTest = async () => {
    if (!selectedFile) {
      setTestResult("请先选择音频文件")
      return
    }

    try {
      setTestResult("正在测试Google Speech-to-Text API...")
      
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
          const result = await testGoogleSTT.mutateAsync({
            audioData: base64,
            fileName: selectedFile.name || 'unknown.mp3'
          })
          
          if (result.success) {
            setTestResult(`✅ Google STT测试成功！\n\n📝 转录结果:\n${result.data.transcription}\n\n📊 文件信息:\n- 文件名: ${selectedFile.name || 'unknown.mp3'}\n- 文件大小: ${selectedFile.size} bytes`)
          } else {
            setTestResult("❌ Google STT测试失败")
          }
        } catch (apiError) {
          setTestResult("❌ Google STT测试失败: " + (apiError instanceof Error ? apiError.message : String(apiError)))
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

      {/* 浏览器管理 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">浏览器管理</h2>
        <div className="space-y-4">
          {/* 浏览器状态 */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">浏览器状态</h3>
                <p className="text-sm text-gray-600 mt-1">
                  浏览器连接: {browserStatus?.browserConnected ? "✅ 已连接" : "❌ 未连接"}
                </p>
                <p className="text-sm text-gray-600">
                  活跃页面: {browserStatus?.activePagesCount || 0} 个
                </p>
                <p className="text-sm text-gray-600">
                  闲置定时器: {browserStatus?.hasIdleTimer ? "✅ 已启动" : "❌ 未启动"}
                </p>
              </div>
              
              <button
                onClick={() => refetchBrowserStatus()}
                className="ml-2 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                刷新状态
              </button>
            </div>
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
              onClick={() => testBrowser.mutate()}
              disabled={testBrowser.isPending}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {testBrowser.isPending ? "测试中..." : "测试浏览器"}
            </button>
            
            <button
              onClick={() => cleanupBrowser.mutate()}
              disabled={cleanupBrowser.isPending}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              {cleanupBrowser.isPending ? "清理中..." : "清理浏览器资源"}
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

          {/* 浏览器状态显示 */}
          {browserStatus?.success && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="flex items-center space-x-2">
                <div className="text-green-500">✅</div>
                <div className="text-sm text-green-800">
                  <p className="font-medium">浏览器管理器运行正常</p>
                  <p>系统将按需启动浏览器实例处理网页解析任务</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* yt-dlp 路径配置 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">yt-dlp 路径配置</h2>
        <div className="space-y-4">
          {/* yt-dlp 状态显示 */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">yt-dlp 工具状态</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {downloaderStatus?.available 
                    ? `✅ yt-dlp 已找到并可用${downloaderStatus.version ? ` (版本: ${downloaderStatus.version})` : ''}` 
                    : "❌ yt-dlp 未找到或不可用"}
                </p>
                {downloaderStatus?.path && (
                  <p className="text-sm text-blue-600 mt-2 font-mono bg-blue-50 px-2 py-1 rounded">
                    📍 检测到的路径: {downloaderStatus.path}
                  </p>
                )}
                {!downloaderStatus?.available && (
                  <p className="text-sm text-red-600 mt-1">{downloaderStatus?.message}</p>
                )}
              </div>
              
              <button
                onClick={() => refetchDownloaderStatus()}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                重新检测
              </button>
            </div>
          </div>
          
          {/* 配置说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="flex items-start space-x-2">
              <div className="text-blue-500 mt-0.5">⚙️</div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">yt-dlp 路径配置说明</p>
                <div className="space-y-2">
                  <p>
                    系统会自动在以下位置按顺序搜索 yt-dlp：
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1 ml-2 font-mono">
                    <li>yt-dlp (系统PATH)</li>
                    <li>/usr/local/bin/yt-dlp</li>
                    <li>/usr/bin/yt-dlp</li>
                    <li>/home/ubuntu/.local/bin/yt-dlp</li>
                    <li>/Users/[用户名]/.local/bin/yt-dlp</li>
                    <li>/opt/homebrew/bin/yt-dlp</li>
                    <li>/usr/local/opt/yt-dlp/bin/yt-dlp</li>
                    <li>/Users/[用户名]/Library/Python/3.9/bin/yt-dlp</li>
                  </ul>
                  <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                    <p className="font-medium text-blue-900 mb-2">🔧 自定义 yt-dlp 路径</p>
                    <p className="mb-2">如果需要修改 yt-dlp 搜索路径，请编辑以下文件：</p>
                    <code className="block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                      src/lib/services/content-downloader.ts
                    </code>
                    <p className="mt-2 text-xs">
                      在 <code className="bg-gray-100 px-1 rounded">detectYtDlpPath()</code> 方法中的 
                      <code className="bg-gray-100 px-1 rounded">possiblePaths</code> 数组中添加您的自定义路径。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 安装指南 */}
          {!downloaderStatus?.available && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-600 mt-0.5">💡</div>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-2">yt-dlp 安装指南</p>
                  <div className="space-y-2">
                    <p className="mb-2">推荐的安装方法：</p>
                    <div className="bg-white rounded border border-yellow-300 p-3">
                      <p className="font-medium mb-2">🐍 Python pip 安装（推荐）：</p>
                      <code className="block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs mb-2">
                        pip3 install --user yt-dlp
                      </code>
                      <p className="font-medium mb-2">🍺 macOS Homebrew 安装：</p>
                      <code className="block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs mb-2">
                        brew install yt-dlp
                      </code>
                      <p className="font-medium mb-2">📦 Ubuntu/Debian 安装：</p>
                      <code className="block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                        sudo apt update && sudo apt install yt-dlp
                      </code>
                    </div>
                    <p className="text-xs mt-2">
                      安装完成后，点击"重新检测"按钮刷新状态。
                    </p>
                  </div>
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

      {/* 文件清理管理 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">文件清理管理</h2>
        <div className="space-y-4">
          {/* 清理状态显示 */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">自动清理状态</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {cleanupStatus?.data?.autoCleanupEnabled 
                    ? "✅ 自动清理服务已启动" 
                    : "❌ 自动清理服务未启动"}
                </p>
                {cleanupStatus?.data?.isRunning && (
                  <p className="text-sm text-blue-600 mt-1">🔄 清理任务正在运行中...</p>
                )}
              </div>
              
              <div className="flex gap-2">
                {!cleanupStatus?.data?.autoCleanupEnabled ? (
                  <button
                    onClick={() => startAutoCleanup.mutate()}
                    disabled={startAutoCleanup.isPending}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {startAutoCleanup.isPending ? "启动中..." : "启动自动清理"}
                  </button>
                ) : (
                  <button
                    onClick={() => stopAutoCleanup.mutate()}
                    disabled={stopAutoCleanup.isPending}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {stopAutoCleanup.isPending ? "停止中..." : "停止自动清理"}
                  </button>
                )}
                
                <button
                  onClick={() => refetchCleanupStatus()}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  刷新状态
                </button>
              </div>
            </div>
          </div>

          {/* 手动清理功能 */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="flex items-start space-x-2">
              <div className="text-blue-500 mt-0.5">🧹</div>
              <div className="flex-1">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">一键清理功能</p>
                  <p className="mb-3">
                    手动清理所有过期的临时文件、已完成任务的文件和测试文件。
                    清理操作会释放磁盘空间，避免服务器硬盘被填满。
                  </p>
                  <div className="space-y-2">
                    <p><strong>清理范围包括：</strong></p>
                    <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                      <li>超过保留时间的临时文件</li>
                      <li>已完成任务的视频和音频文件</li>
                      <li>豆包API测试产生的临时文件</li>
                      <li>空的临时目录</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={() => manualCleanup.mutate()}
                    disabled={manualCleanup.isPending || cleanupStatus?.data?.isRunning}
                    className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 font-medium"
                  >
                    {manualCleanup.isPending ? "清理中..." : "🗑️ 立即清理"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 清理结果显示 */}
          {manualCleanup.data && (
            <div className={`border rounded p-4 ${
              manualCleanup.data.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <h3 className="font-semibold mb-2">
                {manualCleanup.data.success ? '✅ 清理完成' : '❌ 清理失败'}
              </h3>
              <p className="text-sm mb-2">{manualCleanup.data.message}</p>
              {manualCleanup.data.success && manualCleanup.data.data && (
                <div className="text-sm space-y-1">
                  <p>📁 清理临时文件: {manualCleanup.data.data.tempFiles} 个</p>
                  <p>📋 清理完成任务: {manualCleanup.data.data.completedTasks} 个</p>
                  <p>💾 释放空间: {manualCleanup.data.data.formattedSize}</p>
                </div>
              )}
            </div>
          )}

          {/* 清理错误显示 */}
          {manualCleanup.error && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h3 className="font-semibold mb-2 text-red-800">清理失败</h3>
              <p className="text-sm text-red-700">{manualCleanup.error.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* 语音服务状态总览 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">语音服务状态总览</h2>
        
        {getAllVoiceServiceStatus.data?.success && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {getAllVoiceServiceStatus.data.data.map((service) => (
              <div
                key={service.provider}
                className={`p-4 rounded-lg border-2 ${
                  service.available
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      service.available ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="font-medium text-sm">{service.name}</span>
                </div>
                <div className="text-xs text-gray-600">
                  <div className="mb-1">
                    <span className="font-mono bg-gray-100 px-1 rounded">
                      {service.provider}
                    </span>
                  </div>
                  <div className={service.available ? 'text-green-700' : 'text-red-700'}>
                    {service.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={() => getAllVoiceServiceStatus.refetch()}
            disabled={getAllVoiceServiceStatus.isRefetching}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {getAllVoiceServiceStatus.isRefetching ? "检查中..." : "刷新状态"}
          </button>
          
          <button
            onClick={() => diagnoseDoubaoSmallAPI.mutate()}
            disabled={diagnoseDoubaoSmallAPI.isPending}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {diagnoseDoubaoSmallAPI.isPending ? "诊断中..." : "诊断豆包小模型"}
          </button>
        </div>

        {diagnoseDoubaoSmallAPI.data && (
          <div className="mt-4 p-4 bg-gray-50 rounded border">
            <h3 className="font-medium mb-2">豆包小模型诊断结果</h3>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(diagnoseDoubaoSmallAPI.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 语音转文字API测试 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">语音转文字API测试</h2>
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
          
          <div className="flex space-x-4">
            <button
              onClick={handleDoubaoTest}
              disabled={!selectedFile}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              测试豆包API
            </button>

            <button
              onClick={handleDoubaoSmallTest}
              disabled={!selectedFile}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              测试豆包小模型
            </button>
            
            <button
              onClick={handleGoogleSTTTest}
              disabled={!selectedFile}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              测试Google STT
            </button>
          </div>
          
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