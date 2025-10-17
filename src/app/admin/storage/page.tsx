"use client"

import { useEffect, useState } from 'react'
import { api } from '~/components/providers/trpc-provider'

const STORAGE_KEY = 'storage-api-key'
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

interface StorageFile {
  id: string
  fileName: string
  storedName: string
  s3Url: string
  s3Key: string
  fileSize: number
  mimeType: string | null
  pathPrefix: string
  createdAt: Date
  updatedAt: Date
}

export default function StoragePage() {
  const [apiKey, setApiKey] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [page, setPage] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY)
    if (savedKey) {
      setApiKey(savedKey)
      setApiKeyInput(savedKey)
    }
  }, [])

  // Query files
  const { data, refetch, isLoading } = api.storageAdmin.listFiles.useQuery(
    { page, pageSize: 50 },
    { enabled: true }
  )

  // Mutations
  const deleteRecordMutation = api.storageAdmin.deleteRecord.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const deleteRecordAndFileMutation = api.storageAdmin.deleteRecordAndFile.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  // Save API key
  const handleSaveApiKey = () => {
    localStorage.setItem(STORAGE_KEY, apiKeyInput)
    setApiKey(apiKeyInput)
    alert('API Key 已保存')
  }

  // Upload file
  const handleFileUpload = async (file: File) => {
    if (!apiKey) {
      alert('请先配置 API Key')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      alert(`文件太大！最大允许 500MB，当前文件: ${formatFileSize(file.size)}`)
      return
    }

    setUploading(true)
    setUploadProgress(`正在上传: ${file.name}`)

    try {
      // Read file as base64
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')

      // Upload via REST API
      const response = await fetch('/api/external/storage/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          fileData: base64,
          fileName: file.name.replace(/\.[^/.]+$/, ''),
          contentType: file.type,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || 'Upload failed')
      }

      setUploadProgress('上传成功！')
      setTimeout(() => setUploadProgress(''), 2000)
      refetch()
    } catch (error) {
      console.error('Upload error:', error)
      alert(`上传失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setUploadProgress('')
    } finally {
      setUploading(false)
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // Delete handlers
  const handleDeleteRecord = (id: string, fileName: string) => {
    if (confirm(`确定要删除记录 "${fileName}" 吗？\n\n(仅删除数据库记录，S3 文件不会被删除)`)) {
      deleteRecordMutation.mutate({ id })
    }
  }

  const handleDeleteRecordAndFile = (id: string, fileName: string) => {
    if (
      confirm(
        `确定要删除记录和文件 "${fileName}" 吗？\n\n⚠️ 警告: 此操作将同时删除数据库记录和 S3 文件，且不可恢复！`
      )
    ) {
      deleteRecordAndFileMutation.mutate({ id })
    }
  }

  // Copy URL
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('zh-CN')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">S3 存储管理</h1>
        <p className="mt-2 text-sm text-neutral-600">
          上传文件到 S3 并管理上传记录
        </p>
      </div>

      {/* API Key Configuration */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">API Key 配置</h2>
        <p className="mt-1 text-sm text-neutral-600">
          配置 API Key 以使用上传功能（保存在本地浏览器）
        </p>
        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="输入 API Key (genapi_...)"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            onClick={handleSaveApiKey}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            保存
          </button>
        </div>
        {apiKey && (
          <p className="mt-2 text-xs text-green-600">✓ API Key 已配置</p>
        )}
      </div>

      {/* File Upload */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">上传文件</h2>
        <p className="mt-1 text-sm text-neutral-600">
          拖拽文件到下方区域或点击选择文件（最大 500MB）
        </p>

        <div
          className={`mt-4 flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            isDragging
              ? 'border-neutral-900 bg-neutral-50'
              : 'border-neutral-300 bg-neutral-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900 mx-auto" />
              <p className="text-sm text-neutral-600">{uploadProgress}</p>
            </div>
          ) : (
            <>
              <svg
                className="mb-3 h-12 w-12 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <label className="cursor-pointer rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
                选择文件
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={!apiKey}
                />
              </label>
              <p className="mt-2 text-xs text-neutral-500">
                或拖拽文件到此处
              </p>
            </>
          )}
        </div>
      </div>

      {/* File List */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">上传历史</h2>
        <p className="mt-1 text-sm text-neutral-600">
          共 {data?.pagination.total || 0} 条记录
        </p>

        {isLoading ? (
          <div className="mt-6 text-center text-sm text-neutral-500">
            加载中...
          </div>
        ) : data?.files.length === 0 ? (
          <div className="mt-6 text-center text-sm text-neutral-500">
            暂无上传记录
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">
                      文件名
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">
                      大小
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">
                      类型
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">
                      上传时间
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {data?.files.map((file: StorageFile) => (
                    <tr key={file.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={file.s3Url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-neutral-900 hover:text-neutral-600"
                          >
                            {file.fileName}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatFileSize(file.fileSize)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {file.mimeType || '-'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatDate(file.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyUrl(file.s3Url)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            复制URL
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(file.id, file.fileName)}
                            className="text-xs text-orange-600 hover:text-orange-800"
                            disabled={deleteRecordMutation.isPending}
                          >
                            删除记录
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteRecordAndFile(file.id, file.fileName)
                            }
                            className="text-xs text-red-600 hover:text-red-800"
                            disabled={deleteRecordAndFileMutation.isPending}
                          >
                            删除全部
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="text-sm text-neutral-600">
                  第 {page} 页 / 共 {data.pagination.totalPages} 页
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="rounded-md border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
