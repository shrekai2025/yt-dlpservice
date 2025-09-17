"use client"

import { useState } from "react"
import { api } from "~/components/providers/trpc-provider"

export default function TaskManagementPage() {
  const [url, setUrl] = useState("")
  const [downloadType, setDownloadType] = useState<"AUDIO_ONLY" | "VIDEO_ONLY" | "BOTH">("AUDIO_ONLY")
  const [compressionPreset, setCompressionPreset] = useState<"none" | "light" | "standard" | "heavy">("none")
  const [sttProvider, setSttProvider] = useState<"google" | "doubao" | "doubao-small" | "tingwu" | undefined>(undefined)
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false)
  const [selectedTranscription, setSelectedTranscription] = useState<{taskId: string, text: string} | null>(null)


  // 数据查询
  const { data: tasks, refetch: refetchTasks } = api.task.list.useQuery({})
  const { data: stats } = api.task.stats.useQuery()
  const { data: downloaderStatus } = api.task.checkDownloader.useQuery()

  // Mutations
  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      setUrl("")
      setDownloadType("AUDIO_ONLY")
      setCompressionPreset("none")
      setSttProvider(undefined)
      refetchTasks()
    },
  })
  const processTask = api.task.process.useMutation()
  const processPending = api.task.processPending.useMutation()
  const deleteTask = api.task.delete.useMutation({
    onSuccess: () => {
      refetchTasks()
    },
  })

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    try {
      await createTask.mutateAsync({ 
        url: url.trim(), 
        downloadType, 
        compressionPreset,
        sttProvider 
      })
    } catch (error) {
      console.error("Failed to create task:", error)
    }
  }

  const handleShowTranscription = (task: any) => {
    if (task.transcription) {
      setSelectedTranscription({
        taskId: task.id,
        text: task.transcription
      })
      setShowTranscriptionModal(true)
    }
  }

  // 解析和格式化错误日志
  const getErrorDisplay = (errorMessage: string | null) => {
    if (!errorMessage) {
      return { hasErrors: false, latestError: null, totalErrors: 0 }
    }

    try {
      const parsed = JSON.parse(errorMessage)
      
      // 新格式：数组
      if (Array.isArray(parsed) && parsed.length > 0) {
        const latest = parsed[parsed.length - 1]
        const time = new Date(latest.timestamp).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        return {
          hasErrors: true,
          latestError: `${time} ${latest.message}`,
          totalErrors: parsed.length
        }
      }
      
      // 旧格式：字符串
      if (typeof parsed === 'string') {
        return {
          hasErrors: true,
          latestError: parsed,
          totalErrors: 1
        }
      }

      return { hasErrors: false, latestError: null, totalErrors: 0 }
    } catch (e) {
      // 解析失败，说明是旧的字符串格式
      return {
        hasErrors: true,
        latestError: errorMessage,
        totalErrors: 1
      }
    }
  }

  

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">任务管理</h1>

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
          {/* 维护操作 */}
          <div className="space-y-3">
            <div className="text-sm text-gray-600">维护操作</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/maintenance/update', { method: 'POST' })
                    const data = await res.json()
                    if (data?.success) {
                      alert('已开始更新，请稍等片刻，页面将自动刷新。')
                      // 轮询状态，完成后刷新
                      const poll = async () => {
                        for (let i = 0; i < 30; i++) { // 最长约30*2s=60s
                          await new Promise(r => setTimeout(r, 2000))
                          const s = await fetch('/api/admin/maintenance/update-status')
                          const j = await s.json()
                          if (j?.status === 'OK' || j?.status === 'FAIL') {
                            if (j?.status === 'OK') {
                              location.reload()
                            } else {
                              alert('更新失败，请查看日志。')
                            }
                            return
                          }
                        }
                      }
                      poll()
                    } else {
                      alert('触发更新失败：' + (data?.error || 'Unknown error'))
                    }
                  } catch (e:any) {
                    alert('触发更新异常：' + e.message)
                  }
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                🔄 更新服务
              </button>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/maintenance/tmux')
                    const data = await res.json()
                    const text = data?.output || '无输出'
                    const w = window.open('', '_blank', 'width=720,height=480')
                    if (w) {
                      w.document.write('<pre style="white-space:pre-wrap;word-break:break-all;padding:12px;">' +
                        String(text).replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</pre>')
                      w.document.title = 'tmux 会话列表'
                    }
                  } catch (e:any) {
                    alert('检查失败：' + e.message)
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                🧪 检查Chromium运行情况
              </button>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/maintenance/login-setup', { method: 'POST' })
                    const data = await res.json()
                    if (!data?.success) {
                      alert('启动登录流程失败：' + (data?.error || 'Unknown error'))
                      return
                    }
                    const guide = data.guidance
                    const w = window.open('', '_blank', 'width=820,height=680')
                    if (w) {
                      w.document.title = '重新登录账号 - 操作指南'
                      const html = `
                        <div style="padding:16px; font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
                          <h2>重新登录账号 - 操作指南</h2>
                          <ol>
                            <li>在你的本地电脑执行（保持窗口不关闭）：<pre>ssh -N -L 9222:localhost:9222 &lt;user&gt;@&lt;服务器IP&gt;</pre></li>
                            <li>打开本机 Chrome 输入 <code>chrome://inspect/#devices</code>，点击 <b>Configure…</b>，添加 <code>localhost:9222</code></li>
                            <li>在 Remote Target 中点击 <b>inspect</b>，在弹出的页面访问 <code>https://www.youtube.com</code> 完成登录（含二步验证）</li>
                            <li>服务器验证命令：
                              <pre>yt-dlp --cookies-from-browser "${guide?.cookiesFromBrowser || 'chromium:/home/<user>/chrome-profile/Default'}" --dump-json &lt;YouTubeURL&gt; | head -c 200</pre>
                            </li>
                          </ol>
                          <p>你可随时在此页面查看登录流程日志：</p>
                          <button onclick="(async()=>{const r=await fetch('/api/admin/maintenance/login-setup-status');const j=await r.json();const pre=document.getElementById('log');pre.textContent=j.logTail||'无日志';document.getElementById('status').textContent=j.status||'IDLE';})();" style="padding:6px 10px;">刷新登录日志</button>
                          <div style="margin-top:8px;">状态：<span id="status">等待中</span></div>
                          <pre id="log" style="white-space:pre-wrap;border:1px solid #ddd;padding:10px;border-radius:6px;max-height:260px;overflow:auto;"></pre>
                        </div>`
                      w.document.write(html)
                    } else {
                      alert('请允许弹窗以查看操作指南')
                    }
                  } catch (e:any) {
                    alert('启动登录流程异常：' + e.message)
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                🔐 重新登录账号
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 快速导航 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">工具和测试</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a 
            href="/admin/test-scraper" 
            className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <div className="text-2xl mr-3">🕷️</div>
            <div>
              <div className="font-medium text-blue-900">元数据爬虫测试</div>
              <div className="text-sm text-blue-700">测试各平台元数据抓取功能</div>
            </div>
          </a>
          <a 
            href="/admin/platforms" 
            className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <div className="text-2xl mr-3">🎯</div>
            <div>
              <div className="font-medium text-green-900">平台管理</div>
              <div className="text-sm text-green-700">管理支持的平台</div>
            </div>
          </a>
          <a 
            href="/admin/api-doc" 
            className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <div className="text-2xl mr-3">📚</div>
            <div>
              <div className="font-medium text-purple-900">API文档</div>
              <div className="text-sm text-purple-700">查看接口文档</div>
            </div>
          </a>
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
              {(stats?.byStatus?.extracting || 0) + (stats?.byStatus?.transcribing || 0)}
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

          <div>
            <label htmlFor="compressionPreset" className="block text-sm font-medium text-gray-700 mb-2">
              音频压缩设置
            </label>
            <select
              id="compressionPreset"
              value={compressionPreset}
              onChange={(e) => setCompressionPreset(e.target.value as "none" | "light" | "standard" | "heavy")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">不压缩 - 保持原始质量</option>
              <option value="light">轻度压缩 - 减少30-50%文件大小</option>
              <option value="standard">标准压缩 - 减少50-70%文件大小 (推荐)</option>
              <option value="heavy">高度压缩 - 减少70-85%文件大小</option>
            </select>
            <div className="mt-1 text-sm text-gray-500">
              <p>💡 压缩建议：</p>
              <ul className="ml-4 list-disc">
                <li><strong>轻度压缩</strong>：适合高质量音频需求</li>
                <li><strong>标准压缩</strong>：平衡质量与大小，推荐语音转录</li>
                <li><strong>高度压缩</strong>：文件过大时使用，满足豆包API 80MB限制</li>
              </ul>
            </div>
          </div>

          <div>
            <label htmlFor="sttProvider" className="block text-sm font-medium text-gray-700 mb-2">
              语音识别提供商
            </label>
            <select
              id="sttProvider"
              value={sttProvider || ""}
              onChange={(e) => setSttProvider(e.target.value ? e.target.value as "google" | "doubao" | "doubao-small" | "tingwu" : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">使用系统默认设置</option>
              <option value="google">Google Speech-to-Text (高精度，支持多语言)</option>
              <option value="doubao">豆包语音API (实时版)</option>
              <option value="doubao-small">豆包录音识别API (小模型版)</option>
              <option value="tingwu">通义听悟API</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              可选择特定的语音识别服务，留空则使用系统默认配置。不同服务商在识别精度和语言支持上各有特色。
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

      {/* YouTube Cookie管理 */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">🍪 YouTube Cookie管理</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-800 font-medium">遇到"Sign in to confirm you're not a bot"错误？</span>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            这是YouTube的反机器人验证，需要设置有效的Cookie来解决。
          </p>
          <div className="flex gap-3">
            <a
              href="/admin/youtube-auth"
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              🔧 设置YouTube Cookie
            </a>
            <button
              onClick={() => window.open('/admin/youtube-auth', '_blank')}
              className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              📋 查看设置指南
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Cookie通常24-48小时后过期，需要定期更新</p>
          <p>• 设置后立即生效，无需重启服务</p>
          <p>• 支持从浏览器直接复制Cookie字符串</p>
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
                  压缩设置
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
                  错误日志
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        (task as any).compressionPreset === 'none' ? 'bg-gray-100 text-gray-800' :
                        (task as any).compressionPreset === 'light' ? 'bg-yellow-100 text-yellow-800' :
                        (task as any).compressionPreset === 'standard' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {(task as any).compressionPreset === 'none' ? '不压缩' :
                         (task as any).compressionPreset === 'light' ? '轻度' :
                         (task as any).compressionPreset === 'standard' ? '标准' :
                         (task as any).compressionPreset === 'heavy' ? '高度' : '未知'}
                      </span>
                      {(task as any).compressionRatio && (
                        <div className="text-xs text-gray-500">
                          压缩率: {((task as any).compressionRatio * 100).toFixed(1)}%
                        </div>
                      )}
                      {(task as any).originalFileSize && (task as any).compressedFileSize && (
                        <div className="text-xs text-gray-500">
                          {Math.round((task as any).originalFileSize / 1024 / 1024)}MB → {Math.round((task as any).compressedFileSize / 1024 / 1024)}MB
                        </div>
                      )}
                    </div>
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
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      const errorInfo = getErrorDisplay(task.errorMessage)
                      if (!errorInfo.hasErrors) {
                        return <span className="text-gray-400">无错误</span>
                      }
                      
                      return (
                        <div className="max-w-xs">
                          <div className="text-xs text-red-600 font-mono truncate" title={errorInfo.latestError || ''}>
                            {errorInfo.latestError}
                          </div>
                          {errorInfo.totalErrors > 1 && (
                            <div className="text-xs text-gray-500 mt-1">
                              共 {errorInfo.totalErrors} 个错误
                            </div>
                          )}
                        </div>
                      )
                    })()}
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
                    {task.status === "COMPLETED" && task.transcription && (
                      <button
                        onClick={() => handleShowTranscription(task)}
                        className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                      >
                        获取文本
                      </button>
                    )}
                    {task.status === "COMPLETED" && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/tasks/${task.id}`)
                            const data = await res.json()
                            if (data && typeof window !== 'undefined') {
                              const w = window.open('', '_blank', 'width=800,height=600')
                              if (w) {
                                w.document.write('<pre style="white-space:pre-wrap;word-break:break-all;padding:12px;">' + 
                                  JSON.stringify(data, null, 2).replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</pre>')
                                w.document.title = `任务返回 - ${task.id}`
                              } else {
                                alert('弹窗被浏览器拦截，请允许弹窗')
                              }
                            }
                          } catch (e) {
                            alert('获取返回数据失败')
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                      >
                        查看返回数据
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

      {/* 转录文本弹窗 */}
      {showTranscriptionModal && selectedTranscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                转录文本 - 任务 {selectedTranscription.taskId.slice(0, 8)}...
              </h3>
              <button
                onClick={() => setShowTranscriptionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 弹窗内容 */}
            <div className="flex-1 overflow-auto p-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-sm text-gray-600 mb-2">
                  文本长度: {selectedTranscription.text.length} 字符
                </div>
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {selectedTranscription.text}
                </div>
              </div>
            </div>
            
            {/* 弹窗底部 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedTranscription.text)
                  alert('文本已复制到剪贴板')
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                复制文本
              </button>
              <button
                onClick={() => setShowTranscriptionModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 

 