"use client"

import { useState } from "react"
import { api } from "~/components/providers/trpc-provider"

export default function AdminPage() {
  const [url, setUrl] = useState("")
  const [downloadType, setDownloadType] = useState<"AUDIO_ONLY" | "VIDEO_ONLY" | "BOTH">("AUDIO_ONLY")
  const [configKey, setConfigKey] = useState("")
  const [configValue, setConfigValue] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")

  // 数据查询
  const { data: tasks, refetch: refetchTasks } = api.task.list.useQuery({})
  const { data: stats } = api.task.stats.useQuery()
  const { data: downloaderStatus } = api.task.checkDownloader.useQuery()
  const { data: browserStatus, refetch: refetchBrowserStatus } = api.browser.getLoginStatus.useQuery()

  // Mutations
  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      setUrl("")
      setDownloadType("AUDIO_ONLY")
      refetchTasks()
    },
  })
  const setConfig = api.config.set.useMutation()
  const testDatabase = api.config.testDatabase.useMutation()
  const processTask = api.task.process.useMutation()
  const processPending = api.task.processPending.useMutation()
  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      refetchTasks()
    },
  })

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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    try {
      await createTask.mutateAsync({ url: url.trim(), downloadType })
    } catch (error) {
      console.error("Failed to create task:", error)
    }
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">YT-DLP Service 管理面板</h1>

      {/* 下载器状态 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">系统状态</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">下载器状态</div>
            <div className={`font-semibold ${downloaderStatus?.available ? 'text-green-600' : 'text-red-600'}`}>
              {downloaderStatus?.available ? '✅ 可用' : '❌ 不可用'}
            </div>
            {downloaderStatus?.version && (
              <div className="text-xs text-gray-500">版本: {downloaderStatus.version}</div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-600">YouTube 登录状态</div>
            <div className={`font-semibold ${browserStatus?.isLoggedIn ? 'text-green-600' : 'text-gray-600'}`}>
              {browserStatus?.isLoggedIn ? '✅ 已登录' : '❌ 未登录'}
            </div>
            {browserStatus?.loginTime && (
              <div className="text-xs text-gray-500">
                登录时间: {new Date(browserStatus.loginTime).toLocaleString("zh-CN")}
              </div>
            )}
          </div>
        </div>
      </div>

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

      {/* 任务统计 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">任务统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.total || 0}</div>
            <div className="text-sm text-gray-600">总任务数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats?.byStatus?.pending || 0}</div>
            <div className="text-sm text-gray-600">等待中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(stats?.byStatus?.downloading || 0) + (stats?.byStatus?.extracting || 0) + (stats?.byStatus?.uploading || 0) + (stats?.byStatus?.transcribing || 0)}
            </div>
            <div className="text-sm text-gray-600">处理中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.byStatus?.completed || 0}</div>
            <div className="text-sm text-gray-600">已完成</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats?.byStatus?.failed || 0}</div>
            <div className="text-sm text-gray-600">失败</div>
          </div>
        </div>
      </div>

      {/* 创建任务 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">创建新任务</h2>
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              视频 URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="请输入 YouTube 或 Bilibili 视频链接"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="downloadType" className="block text-sm font-medium text-gray-700 mb-2">
              下载类型
            </label>
            <select
              id="downloadType"
              value={downloadType}
              onChange={(e) => setDownloadType(e.target.value as "AUDIO_ONLY" | "VIDEO_ONLY" | "BOTH")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="AUDIO_ONLY">仅音频 (用于语音转录)</option>
              <option value="VIDEO_ONLY">仅视频 (不转录文字)</option>
              <option value="BOTH">视频+音频 (完整备份)</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              默认选择"仅音频"适合语音转录需求，节省存储空间
            </p>
          </div>
          
          <button
            type="submit"
            disabled={createTask.isPending}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {createTask.isPending ? "创建中..." : `创建任务 (${downloadType === 'AUDIO_ONLY' ? '仅音频' : downloadType === 'VIDEO_ONLY' ? '仅视频' : '视频+音频'})`}
          </button>
        </form>
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

      {/* 批量操作 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">批量操作</h2>
        <div className="flex gap-2">
          <button
            onClick={() => processPending.mutate()}
            disabled={processPending.isPending}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {processPending.isPending ? "处理中..." : "处理所有等待任务"}
          </button>
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
            <button
              type="button"
              onClick={() => testDatabase.mutate()}
              disabled={testDatabase.isPending}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {testDatabase.isPending ? "测试中..." : "测试数据库连接"}
            </button>
          </div>
        </form>
      </div>

      {/* 任务列表 */}
      <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold p-6 border-b">任务列表</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平台
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  下载类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件路径
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks?.data?.map((task) => (
                <tr key={task.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                    {task.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 max-w-xs truncate">
                    <a href={task.url} target="_blank" rel="noopener noreferrer">
                      {task.url}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {task.platform}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      task.downloadType === 'AUDIO_ONLY' ? 'bg-purple-100 text-purple-800' :
                      task.downloadType === 'VIDEO_ONLY' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.downloadType === 'AUDIO_ONLY' ? '仅音频' :
                       task.downloadType === 'VIDEO_ONLY' ? '仅视频' : '视频+音频'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : task.status === "FAILED"
                          ? "bg-red-100 text-red-800"
                          : task.status === "PENDING"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {task.videoPath && (
                      <div className="font-mono" title={task.videoPath}>
                        视频: {task.videoPath.split('/').pop()}
                      </div>
                    )}
                    {task.audioPath && (
                      <div className="font-mono mt-1" title={task.audioPath}>
                        音频: {task.audioPath.split('/').pop()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(task.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {task.status === "PENDING" && (
                      <button
                        onClick={() => processTask.mutate({ id: task.id })}
                        disabled={processTask.isPending}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        {processTask.isPending ? "处理中..." : "处理"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`确定要删除任务 ${task.id.slice(0,8)} 吗？`)) {
                          deleteTask.mutate({ id: task.id })
                        }
                      }}
                      disabled={deleteTask.isPending}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      删除
                    </button>
                    {task.title && (
                      <div className="text-xs text-gray-500 mt-1" title={task.title}>
                        {task.title.length > 20 ? task.title.slice(0, 20) + "..." : task.title}
                      </div>
                    )}
                  </td>
                </tr>
              )) ?? []}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 

 