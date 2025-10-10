"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"

const STORAGE_KEY = "unigen_api_key"
const DEFAULT_PARAMETERS_TEMPLATE = `{
  "size_or_ratio": "16:9"
}`

const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 45 // ~3分钟

type GenerationStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED"

type ProviderOption = {
  id: string
  name: string
  model_identifier: string
  type: string
  provider?: string | null
}

type GenerationResult = {
  type: string
  url: string
  metadata?: Record<string, unknown>
}

type TaskRecord = {
  id: string
  status: GenerationStatus
  model_identifier: string
  prompt: string
  input_images: string[]
  number_of_outputs: number
  parameters: Record<string, unknown>
  results: GenerationResult[] | null
  error_message?: string | null
  task_id?: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  duration_ms: number | null
  client_key_prefix?: string | null
}

type HistoryResponse = {
  data: TaskRecord[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

type KeyStatus = "missing" | "valid" | "invalid"

type ActiveDialog = {
  task: TaskRecord
  open: boolean
}

function formatDate(iso: string | null) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("zh-CN")
  } catch {
    return iso
  }
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null || durationMs === undefined) return "-"
  if (durationMs < 1000) return `${durationMs} ms`
  const seconds = durationMs / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  const minutes = Math.floor(seconds / 60)
  const remain = Math.round(seconds % 60)
  return `${minutes}m ${remain}s`
}

function getStatusTone(status: GenerationStatus) {
  switch (status) {
    case "SUCCESS":
      return "bg-green-100 text-green-800"
    case "FAILED":
      return "bg-red-100 text-red-800"
    case "PROCESSING":
      return "bg-blue-100 text-blue-800"
    case "PENDING":
      return "bg-yellow-100 text-yellow-800"
    default:
      return "bg-neutral-100 text-neutral-800"
  }
}

export default function UnigenUiPage() {
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [storedApiKey, setStoredApiKey] = useState("")
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("missing")
  const [isSavingKey, setIsSavingKey] = useState(false)

  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [isLoadingProviders, setIsLoadingProviders] = useState(false)

  const [selectedProviderId, setSelectedProviderId] = useState("")
  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === selectedProviderId) || null,
    [providers, selectedProviderId]
  )

  const [prompt, setPrompt] = useState("")
  const [parameterEditor, setParameterEditor] = useState(DEFAULT_PARAMETERS_TEMPLATE)
  const [formError, setFormError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const [latestTask, setLatestTask] = useState<TaskRecord | null>(null)

  const [history, setHistory] = useState<TaskRecord[]>([])
  const [historyMeta, setHistoryMeta] = useState({ total: 0, limit: 20, offset: 0, hasMore: false })
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollAttemptsRef = useRef(0)

  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null)

  const resetPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
    pollAttemptsRef.current = 0
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const savedKey = window.localStorage.getItem(STORAGE_KEY)
    if (savedKey) {
      setApiKeyInput(savedKey)
      setStoredApiKey(savedKey)
      setKeyStatus("valid")
    }
  }, [])

  const fetchProviders = useCallback(
    async (apiKey: string) => {
      setIsLoadingProviders(true)
      try {
        const response = await fetch("/api/external/generation/providers", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          cache: "no-store",
        })

        if (response.status === 401) {
          setKeyStatus("invalid")
          setProviders([])
          setSelectedProviderId("")
          return
        }

        if (!response.ok) {
          throw new Error("无法获取模型供应商列表")
        }

        const data = (await response.json()) as { data: ProviderOption[] }
        setProviders(data.data || [])
        setKeyStatus("valid")

        if (!data.data || data.data.length === 0) {
          setSelectedProviderId("")
          return
        }

        const exists = data.data.some((provider) => provider.id === selectedProviderId)
        if (!exists) {
          setSelectedProviderId(data.data[0]!.id)
        }
      } catch (error) {
        console.error("Failed to load providers", error)
        setProviders([])
        setSelectedProviderId("")
        setKeyStatus("invalid")
      } finally {
        setIsLoadingProviders(false)
      }
    },
    [selectedProviderId]
  )

  const mergeHistory = useCallback((records: TaskRecord[], append: boolean) => {
    if (!append) {
      setHistory(records)
      return
    }

    setHistory((prev) => {
      const map = new Map<string, TaskRecord>()
      records.forEach((record) => map.set(record.id, record))
      prev.forEach((record) => {
        if (!map.has(record.id)) {
          map.set(record.id, record)
        }
      })
      return Array.from(map.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    })
  }, [])

  const loadHistory = useCallback(
    async (apiKey: string, { offset = 0, append = false } = {}) => {
      setIsLoadingHistory(true)
      setHistoryError(null)
      try {
        const params = new URLSearchParams({
          limit: String(historyMeta.limit),
          offset: String(offset),
        })

        const response = await fetch(`/api/external/generation/tasks?${params.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          cache: "no-store",
        })

        if (response.status === 401) {
          setKeyStatus("invalid")
          setHistory([])
          setHistoryMeta({ total: 0, limit: historyMeta.limit, offset: 0, hasMore: false })
          return
        }

        if (!response.ok) {
          throw new Error("获取生成记录失败")
        }

        const data = (await response.json()) as HistoryResponse
        mergeHistory(data.data || [], append)
        setHistoryMeta({
          total: data.pagination?.total ?? 0,
          limit: data.pagination?.limit ?? historyMeta.limit,
          offset: data.pagination?.offset ?? offset,
          hasMore: data.pagination?.hasMore ?? false,
        })
      } catch (error) {
        console.error("Failed to load history", error)
        setHistoryError(error instanceof Error ? error.message : "未知错误")
      } finally {
        setIsLoadingHistory(false)
      }
    },
    [historyMeta.limit, mergeHistory]
  )

  const loadTaskById = useCallback(
    async (apiKey: string, taskId: string) => {
      try {
        const response = await fetch(`/api/external/generation/tasks/${taskId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          cache: "no-store",
        })

        if (!response.ok) {
          return null
        }

        const data = (await response.json()) as TaskRecord
        setLatestTask(data)
        setHistory((prev) => {
          const exists = prev.some((task) => task.id === data.id)
          if (!exists) return prev
          return prev.map((task) => (task.id === data.id ? data : task))
        })
        return data
      } catch (error) {
        console.error("Failed to load task by id", error)
        return null
      }
    },
    []
  )

  useEffect(() => {
    if (!storedApiKey) {
      setKeyStatus("missing")
      setProviders([])
      setHistory([])
      setHistoryMeta({ total: 0, limit: historyMeta.limit, offset: 0, hasMore: false })
      return
    }

    fetchProviders(storedApiKey)
    loadHistory(storedApiKey, { offset: 0, append: false })
  }, [storedApiKey, fetchProviders, loadHistory, historyMeta.limit])

  useEffect(() => () => resetPolling(), [resetPolling])

  const handleSaveKey = async () => {
    const trimmed = apiKeyInput.trim()
    setIsSavingKey(true)
    try {
      if (!trimmed) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY)
        }
        setStoredApiKey("")
        setKeyStatus("missing")
        return
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, trimmed)
      }
      setStoredApiKey(trimmed)
      setKeyStatus("valid")
    } finally {
      setIsSavingKey(false)
    }
  }

  const handleGenerate = async () => {
    setFormError(null)
    resetPolling()

    if (!storedApiKey) {
      setFormError("请先保存 API 密钥")
      return
    }
    if (!selectedProvider) {
      setFormError("请选择一个模型供应商")
      return
    }
    if (!prompt.trim()) {
      setFormError("请输入提示词")
      return
    }

    let parsedParameters: Record<string, unknown> = {}
    if (parameterEditor.trim()) {
      try {
        parsedParameters = JSON.parse(parameterEditor)
      } catch (error) {
        setFormError("参数 JSON 格式错误")
        return
      }
    }

    setIsGenerating(true)

    try {
      const response = await fetch("/api/external/generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": storedApiKey,
        },
        body: JSON.stringify({
          model_identifier: selectedProvider.model_identifier,
          prompt: prompt.trim(),
          input_images: [],
          number_of_outputs: 1,
          parameters: parsedParameters,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data?.error || data?.message || "生成失败"
        setFormError(message)
        return
      }

      if (data?.id) {
        const task = await loadTaskById(storedApiKey, data.id)
        if (!task) {
          setLatestTask({
            id: data.id,
            status: data.status as GenerationStatus,
            model_identifier: selectedProvider.model_identifier,
            prompt: prompt.trim(),
            input_images: [],
            number_of_outputs: 1,
            parameters: parsedParameters,
            results: data.results || null,
            error_message: data.error || null,
            task_id: data.task_id,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.created_at || new Date().toISOString(),
            completed_at: data.completed_at || null,
            duration_ms: data.duration_ms ?? null,
            client_key_prefix: data.client_key_prefix,
          })
        }

        if (data.status === "PROCESSING") {
          const poll = async () => {
            if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
              return
            }
            pollAttemptsRef.current += 1

            const result = await loadTaskById(storedApiKey, data.id)
            if (!result) {
              pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS)
              return
            }

            if (result.status === "PROCESSING" || result.status === "PENDING") {
              pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS)
            } else {
              resetPolling()
              loadHistory(storedApiKey, { offset: 0, append: false })
            }
          }

          pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS)
        } else {
          loadHistory(storedApiKey, { offset: 0, append: false })
        }
      }
    } catch (error) {
      console.error("Generation failed", error)
      setFormError(error instanceof Error ? error.message : "生成出错")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!storedApiKey) return
    try {
      const response = await fetch(`/api/external/generation/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "X-API-Key": storedApiKey,
        },
      })

      if (response.status === 409) {
        const data = await response.json()
        alert(data?.error || "任务正在处理中，无法删除")
        return
      }

      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}))
        alert(data?.error || "删除失败")
        return
      }

      setHistory((prev) => prev.filter((task) => task.id !== taskId))
      if (latestTask?.id === taskId) {
        setLatestTask(null)
      }
      setHistoryMeta((prev) => ({ ...prev, total: Math.max(prev.total - 1, 0) }))
    } catch (error) {
      console.error("Failed to delete task", error)
      alert("删除失败")
    }
  }

  const handleLoadMore = async () => {
    if (!storedApiKey || !historyMeta.hasMore || isLoadingHistory) return
    const nextOffset = historyMeta.offset + historyMeta.limit
    await loadHistory(storedApiKey, { offset: nextOffset, append: true })
  }

  const keyStatusBadge = useMemo(() => {
    if (keyStatus === "missing") return { text: "未填写", tone: "bg-yellow-100 text-yellow-700" }
    if (keyStatus === "valid") return { text: "已验证", tone: "bg-green-100 text-green-800" }
    return { text: "无效", tone: "bg-red-100 text-red-800" }
  }, [keyStatus])

  const renderResults = (task: TaskRecord | null) => {
    if (!task) {
      return (
        <div className="py-12 text-center text-sm text-neutral-500">
          生成结果将显示在这里
        </div>
      )
    }

    if ((task.status === "PENDING" || task.status === "PROCESSING") && !task.results) {
      return (
        <div className="rounded border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          当前任务正在执行中，请稍候...
          {task.task_id ? (
            <div className="mt-2 text-xs text-blue-600">任务 ID：{task.task_id}</div>
          ) : null}
        </div>
      )
    }

    if (task.status === "FAILED") {
      return (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          任务失败：{task.error_message || "未知错误"}
        </div>
      )
    }

    if (!task.results || task.results.length === 0) {
      return (
        <div className="rounded border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          未获取到生成结果
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {task.results.map((result, index) => (
          <div key={`${result.url}-${index}`} className="rounded border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-neutral-800">
                结果 {index + 1} · {result.type}
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                打开链接
              </a>
            </div>
            {result.type === "image" ? (
              <img
                src={result.url}
                alt={`generation-${index}`}
                className="mt-3 max-h-[320px] w-full rounded object-contain"
              />
            ) : null}
            {result.type === "video" ? (
              <video src={result.url} controls className="mt-3 w-full rounded" />
            ) : null}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">UniGen UI</h1>
        <p className="mt-1 text-sm text-neutral-600">
          使用统一 REST API 发起生成任务，支持密钥管理、历史记录查看与结果下载。
        </p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700">API Key</label>
            <input
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="请输入访问密钥"
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-neutral-500">
              密钥保存在浏览器本地 Storage，所有请求都会携带此密钥。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={keyStatusBadge.tone}>{keyStatusBadge.text}</Badge>
            <Button onClick={handleSaveKey} disabled={isSavingKey}>
              {isSavingKey ? "保存中..." : "保存并验证"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <Card className="space-y-5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">生成配置</h2>
              <p className="text-sm text-neutral-500">选择模型，填写提示词与参数</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setParameterEditor(DEFAULT_PARAMETERS_TEMPLATE)}>
              重置参数
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">模型供应商</label>
              <select
                value={selectedProviderId}
                onChange={(event) => setSelectedProviderId(event.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">{isLoadingProviders ? "加载中..." : "请选择供应商"}</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} · {provider.type}
                  </option>
                ))}
              </select>
              {selectedProvider ? (
                <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-xs">
                  <div>
                    模型标识：<code className="font-mono">{selectedProvider.model_identifier}</code>
                  </div>
                  {selectedProvider.provider ? (
                    <div className="mt-1 text-neutral-600">供应商平台：{selectedProvider.provider}</div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">提示词 (Prompt)</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="描述你希望生成的内容..."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">参数 (JSON)</label>
              <textarea
                value={parameterEditor}
                onChange={(event) => setParameterEditor(event.target.value)}
                rows={6}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder='{"style": "cinematic"}'
              />
              <p className="text-xs text-neutral-500">示例参数：size_or_ratio, style, seed 等</p>
            </div>
          </div>

          {formError ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          ) : null}

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || !storedApiKey || !selectedProviderId}
          >
            {isGenerating ? "生成中..." : "开始生成"}
          </Button>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">最新一次生成</h2>
              {latestTask ? (
                <p className="text-xs text-neutral-500">
                  任务 ID：{latestTask.id} · 创建时间：{formatDate(latestTask.created_at)}
                </p>
              ) : null}
            </div>
            {latestTask ? (
              <Badge className={getStatusTone(latestTask.status)}>{latestTask.status}</Badge>
            ) : null}
          </div>

          {latestTask ? (
            <div className="space-y-3">
              <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                <div className="text-xs text-neutral-500">提示词</div>
                <div className="mt-1 whitespace-pre-wrap">{latestTask.prompt}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-neutral-500">模型</div>
                  <div>{latestTask.model_identifier}</div>
                </div>
                <div>
                  <div className="text-neutral-500">耗时</div>
                  <div>{formatDuration(latestTask.duration_ms)}</div>
                </div>
              </div>
            </div>
          ) : null}

          {renderResults(latestTask)}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">生成任务历史</h2>
            <p className="text-sm text-neutral-500">
              按时间倒序排列，最多显示最近 {historyMeta.limit} 条，可删除已完成任务。
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => storedApiKey && loadHistory(storedApiKey, { offset: 0, append: false })}>
              刷新
            </Button>
          </div>
        </div>

        {historyError ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{historyError}</div>
        ) : null}

        <div className="mt-4 space-y-3">
          {history.length === 0 && !isLoadingHistory ? (
            <div className="rounded border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
              暂无生成记录
            </div>
          ) : null}

          {history.map((task) => (
            <Card key={task.id} className="border-neutral-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusTone(task.status)}>{task.status}</Badge>
                    <span className="text-xs text-neutral-500">{formatDate(task.created_at)}</span>
                    {task.duration_ms ? (
                      <span className="text-xs text-neutral-500">耗时：{formatDuration(task.duration_ms)}</span>
                    ) : null}
                  </div>
                  <div className="text-sm font-medium text-neutral-900">{task.prompt}</div>
                  <div className="text-xs text-neutral-500">模型：{task.model_identifier}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveDialog({ task, open: true })}>
                    查看详情
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={task.status === "PROCESSING" || task.status === "PENDING"}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-neutral-500">
          <div>
            共 {historyMeta.total} 条记录 · 当前 {history.length} 条
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={!historyMeta.hasMore || isLoadingHistory}
          >
            {historyMeta.hasMore ? (isLoadingHistory ? "加载中..." : "加载更多") : "没有更多了"}
          </Button>
        </div>
      </Card>

      <Dialog open={!!activeDialog?.open} onOpenChange={(open) => setActiveDialog((prev) => (prev ? { ...prev, open } : null))}>
        {activeDialog ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>生成任务详情</DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                任务 ID：{activeDialog.task.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Badge className={getStatusTone(activeDialog.task.status)}>{activeDialog.task.status}</Badge>
                <span className="text-neutral-500">创建：{formatDate(activeDialog.task.created_at)}</span>
                <span className="text-neutral-500">完成：{formatDate(activeDialog.task.completed_at)}</span>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-neutral-500">提示词</div>
                <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm">
                  {activeDialog.task.prompt}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-neutral-500">参数</div>
                <pre className="max-h-64 overflow-auto rounded border border-neutral-200 bg-neutral-900 p-3 text-xs text-green-200">
{JSON.stringify(activeDialog.task.parameters, null, 2)}
                </pre>
              </div>

              {activeDialog.task.results ? (
                <div className="space-y-2">
                  <div className="text-xs text-neutral-500">结果</div>
                  <div className="space-y-3">
                    {activeDialog.task.results.map((result, index) => (
                      <div key={`${result.url}-${index}`} className="rounded border border-neutral-200 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-neutral-800">
                            {result.type} · 结果 {index + 1}
                          </div>
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            打开
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeDialog.task.error_message ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  错误：{activeDialog.task.error_message}
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">关闭</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
