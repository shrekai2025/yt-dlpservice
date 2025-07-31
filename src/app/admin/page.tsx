"use client"

import { useState } from "react"
import { api } from "~/components/providers/trpc-provider"

export default function TaskManagementPage() {
  const [url, setUrl] = useState("")
  const [downloadType, setDownloadType] = useState<"AUDIO_ONLY" | "VIDEO_ONLY" | "BOTH">("AUDIO_ONLY")
  const [compressionPreset, setCompressionPreset] = useState<"none" | "light" | "standard" | "heavy">("none")
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
      await createTask.mutateAsync({ url: url.trim(), downloadType, compressionPreset })
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
          
          <button
            type="submit"
            disabled={createTask.isPending}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {createTask.isPending ? "创建中..." : `创建任务 (${downloadType === 'AUDIO_ONLY' ? '仅音频' : downloadType === 'VIDEO_ONLY' ? '仅视频' : '视频+音频'})`}
          </button>
        </form>
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

 