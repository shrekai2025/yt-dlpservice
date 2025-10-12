"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
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
type ParameterFieldType = 'string' | 'number' | 'boolean' | 'select' | 'string-array'

interface ParameterFieldOption {
  label: string
  value: string | number
}

interface ParameterField {
  key: string
  label: string
  type: ParameterFieldType
  defaultValue?: unknown
  options?: ParameterFieldOption[]
  helperText?: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

const PARAMETER_FIELDS_BY_PROVIDER: Record<string, ParameterField[]> = {
  'flux-pro': [
    { key: 'size_or_ratio', label: '尺寸 / 比例', type: 'string', defaultValue: '1:1', helperText: '支持 1:1、4:3、16:9 或 1024x1024 这类尺寸' },
    { key: 'seed', label: 'Seed', type: 'number', helperText: '可选，非负整数' },
    { key: 'prompt_upsampling', label: '提示词增强', type: 'boolean', defaultValue: false },
    { key: 'safety_tolerance', label: '安全等级', type: 'number', min: 0, max: 6, step: 1, helperText: '0-6 之间的整数' },
  ],
  'flux-dev': [
    { key: 'size_or_ratio', label: '尺寸 / 比例', type: 'string', defaultValue: '1:1', helperText: '支持 1:1、4:3、16:9 或 1024x1024 这类尺寸' },
    { key: 'seed', label: 'Seed', type: 'number', helperText: '可选，非负整数' },
    { key: 'prompt_upsampling', label: '提示词增强', type: 'boolean', defaultValue: false },
    { key: 'safety_tolerance', label: '安全等级', type: 'number', min: 0, max: 6, step: 1, helperText: '0-6 之间的整数' },
  ],
  'tuzi-openai-dalle': [
    { key: 'size_or_ratio', label: '尺寸 / 比例', type: 'string', defaultValue: '1024x1024', helperText: '默认 1024x1024，可填写 1024x1536 等' },
    { key: 'seed', label: 'Seed', type: 'number', helperText: '可选，非负整数' },
    { key: 'n', label: '生成张数 (n)', type: 'number', min: 1, max: 10, step: 1, helperText: '1-10 之间的整数' },
    { key: 'quality', label: '质量', type: 'select', options: [{ label: 'Standard', value: 'standard' }, { label: 'HD', value: 'hd' }] },
    { key: 'style', label: '风格', type: 'select', options: [{ label: 'Vivid', value: 'vivid' }, { label: 'Natural', value: 'natural' }] },
  ],
  mj_relax_imagine: [
    { key: 'botType', label: '模型类型', type: 'select', defaultValue: 'MID_JOURNEY', options: [{ label: 'Midjourney', value: 'MID_JOURNEY' }, { label: 'Niji Journey', value: 'NIJI_JOURNEY' }] },
    { key: 'noStorage', label: '返回官方链接 (noStorage)', type: 'boolean', defaultValue: false },
    { key: 'notifyHook', label: '回调地址', type: 'string', placeholder: 'https://example.com/webhook' },
    { key: 'accountFilter.modes', label: '账号模式', type: 'string-array', defaultValue: ['FAST'], helperText: '每行一个模式值，例如 FAST、RELAX' },
    { key: 'state', label: '自定义参数 (state)', type: 'string' },
    { key: 'base64Array', label: '垫图 Base64 列表', type: 'string-array', helperText: '纯 base64 字符串，每行一条。上传图片后可自动填充。' },
  ],
  mj_relax_video: [
    { key: 'videoType', label: '视频模型', type: 'select', defaultValue: 'vid_1.1_i2v_720', options: [{ label: 'vid_1.1_i2v_480', value: 'vid_1.1_i2v_480' }, { label: 'vid_1.1_i2v_720', value: 'vid_1.1_i2v_720' }] },
    { key: 'motion', label: '运动幅度', type: 'select', defaultValue: 'low', options: [{ label: 'Low', value: 'low' }, { label: 'High', value: 'high' }] },
    { key: 'image', label: '首帧图片 (URL 或 Base64)', type: 'string', placeholder: 'https://example.com/image.png' },
    { key: 'endImage', label: '尾帧图片', type: 'string', placeholder: '可选，URL 或 Base64' },
    { key: 'loop', label: '循环播放', type: 'boolean', defaultValue: false },
    { key: 'batchSize', label: '批量生成数量', type: 'select', defaultValue: 4, options: [{ label: '1', value: 1 }, { label: '2', value: 2 }, { label: '4', value: 4 }] },
    { key: 'action', label: '任务操作', type: 'select', options: [{ label: 'Extend', value: 'extend' }], helperText: '扩展现有任务时使用' },
    { key: 'index', label: '视频索引 (action 时必填)', type: 'number', min: 0, max: 3, step: 1 },
    { key: 'taskId', label: '父任务 ID (action 时必填)', type: 'string' },
    { key: 'state', label: '自定义参数 (state)', type: 'string' },
    { key: 'notifyHook', label: '回调地址', type: 'string', placeholder: 'https://example.com/webhook' },
    { key: 'noStorage', label: '返回官方链接 (noStorage)', type: 'boolean', defaultValue: false },
  ],
  'kling-v1': [
    { key: 'size_or_ratio', label: '尺寸 / 比例', type: 'string', defaultValue: '1024x1024', helperText: '自动转换为 Kling 支持的比例' },
    { key: 'duration', label: '时长 (秒)', type: 'select', defaultValue: 5, options: [{ label: '5 秒', value: 5 }, { label: '10 秒', value: 10 }] },
    { key: 'mode', label: '模式', type: 'select', defaultValue: 'pro', options: [{ label: 'Standard', value: 'standard' }, { label: 'Pro', value: 'pro' }] },
  ],
  'pollo-veo3': [
    { key: 'duration', label: '视频时长 (秒)', type: 'number', defaultValue: 8, min: 1, max: 30, helperText: '1-30 之间的整数' },
    { key: 'generateAudio', label: '生成音频', type: 'boolean', defaultValue: true },
    { key: 'negative_prompt', label: '反向提示词', type: 'string', placeholder: '可选' },
    { key: 'seed', label: 'Seed', type: 'number', helperText: '可选，非负整数' },
  ],
  'pollo-kling': [
    { key: 'duration', label: '视频时长 (秒)', type: 'select', defaultValue: 5, options: [{ label: '5 秒', value: 5 }, { label: '10 秒', value: 10 }] },
    { key: 'strength', label: '风格强度', type: 'number', defaultValue: 50, min: 0, max: 100, step: 1 },
    { key: 'negative_prompt', label: '反向提示词', type: 'string', placeholder: '可选' },
  ],
  'replicate-minimax': [
    { key: 'duration', label: '视频时长 (秒)', type: 'number', min: 1, max: 30, helperText: '可选，1-30 之间的整数' },
    { key: 'aspect_ratio', label: '画面比例', type: 'select', options: [{ label: '16:9', value: '16:9' }, { label: '9:16', value: '9:16' }, { label: '1:1', value: '1:1' }] },
    { key: 'seed', label: 'Seed', type: 'number', helperText: '可选，非负整数' },
  ],
}

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

function getParameterFields(modelIdentifier: string | null | undefined): ParameterField[] {
  if (!modelIdentifier) return []
  return PARAMETER_FIELDS_BY_PROVIDER[modelIdentifier] || []
}

function cloneParameters<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? {}))
}

function getValueAtPath(source: Record<string, unknown> | undefined, path: string): unknown {
  if (!source) return undefined
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[segment]
    }
    return undefined
  }, source)
}

function pruneEmpty(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => pruneEmpty(item))
      .filter((item) => item !== undefined)
    return items.length > 0 ? items : undefined
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, pruneEmpty(item)] as const)
      .filter(([, item]) => item !== undefined)

    if (entries.length === 0) {
      return undefined
    }

    return Object.fromEntries(entries)
  }

  return value
}

function setValueAtPath(
  source: Record<string, unknown>,
  path: string,
  rawValue: unknown
): Record<string, unknown> {
  const cloned = cloneParameters(source)
  const segments = path.split('.')
  const lastKey = segments.pop()

  if (!lastKey) return cloned

  let cursor: Record<string, unknown> = cloned
  for (const segment of segments) {
    const next = cursor[segment]
    if (typeof next === 'object' && next !== null) {
      cursor = next as Record<string, unknown>
    } else {
      cursor[segment] = {}
      cursor = cursor[segment] as Record<string, unknown>
    }
  }

  let value = rawValue
  if (typeof value === 'string') {
    value = value.trim()
    if (value === '') {
      value = undefined
    }
  }
  if (typeof value === 'number' && Number.isNaN(value)) {
    value = undefined
  }
  if (Array.isArray(value) && value.length === 0) {
    value = undefined
  }

  if (value === undefined) {
    delete cursor[lastKey]
  } else {
    cursor[lastKey] = value
  }

  return (pruneEmpty(cloned) as Record<string, unknown>) || {}
}

function buildDefaultParameters(fields: ParameterField[]): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((accumulator, field) => {
    if (field.defaultValue !== undefined) {
      return setValueAtPath(accumulator, field.key, field.defaultValue)
    }
    return accumulator
  }, {})
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
  const [numberOfOutputs, setNumberOfOutputs] = useState(1)
  const [inputImagesText, setInputImagesText] = useState("")
  const [parameters, setParameters] = useState<Record<string, unknown>>({})
  const parameterDefaultsRef = useRef<Record<string, unknown>>({})
  const parameterFields = useMemo(
    () => getParameterFields(selectedProvider?.model_identifier),
    [selectedProvider?.model_identifier]
  )

  useEffect(() => {
    if (!selectedProvider) {
      setParameters({})
      parameterDefaultsRef.current = {}
      setInputImagesText("")
      setNumberOfOutputs(1)
      return
    }

    const defaults = buildDefaultParameters(parameterFields)
    setParameters(cloneParameters(defaults))
    parameterDefaultsRef.current = cloneParameters(defaults)
    setInputImagesText("")
    setNumberOfOutputs(1)
  }, [selectedProvider, parameterFields])
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

  const handleParameterValueChange = useCallback((field: ParameterField, rawValue: unknown) => {
    setParameters((prev) => {
      let normalized: unknown = rawValue

      switch (field.type) {
        case 'number': {
          if (rawValue === '' || rawValue === null || rawValue === undefined) {
            normalized = undefined
          } else {
            const num = typeof rawValue === 'number' ? rawValue : Number(rawValue)
            normalized = Number.isNaN(num) ? undefined : num
          }
          break
        }
        case 'boolean': {
          normalized = Boolean(rawValue)
          break
        }
        case 'select': {
          if (rawValue === '' || rawValue === undefined || rawValue === null) {
            normalized = undefined
          } else if (field.options && field.options.length > 0) {
            const sample = field.options[0]!.value
            if (typeof sample === 'number') {
              normalized = Number(rawValue)
              if (Number.isNaN(normalized)) {
                normalized = undefined
              }
            } else {
              normalized = String(rawValue)
            }
          }
          break
        }
        case 'string-array': {
          if (typeof rawValue !== 'string') {
            normalized = rawValue
            break
          }
          const items = rawValue
            .split('\n')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
          normalized = items.length > 0 ? items : undefined
          break
        }
        default: {
          if (typeof rawValue === 'string') {
            normalized = rawValue
          }
        }
      }

      return setValueAtPath(prev, field.key, normalized)
    })
  }, [])

  const getParameterDisplayValue = useCallback(
    (field: ParameterField) => {
      const value = getValueAtPath(parameters, field.key)

      if (field.type === 'boolean') {
        if (typeof value === 'boolean') return value
        if (typeof field.defaultValue === 'boolean') return field.defaultValue
        return false
      }

      if (field.type === 'string-array') {
        if (Array.isArray(value)) {
          return value.join('\n')
        }
        if (Array.isArray(field.defaultValue)) {
          return (field.defaultValue as string[]).join('\n')
        }
        return ''
      }

      if (field.type === 'number') {
        if (typeof value === 'number') return value
        if (typeof field.defaultValue === 'number') return field.defaultValue
        return ''
      }

      if (field.type === 'select') {
        if (value !== undefined) return value
        if (field.defaultValue !== undefined) return field.defaultValue
        return ''
      }

      return (value as string) ?? (field.defaultValue as string) ?? ''
    },
    [parameters]
  )

  const resetParameters = useCallback(() => {
    setParameters(cloneParameters(parameterDefaultsRef.current))
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

    const cleanedParameters =
      (pruneEmpty(parameters) as Record<string, unknown> | undefined) ?? {}
    const parametersForRequest = cloneParameters(cleanedParameters)
    const inputImages = inputImagesText
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

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
          input_images: inputImages,
          number_of_outputs: numberOfOutputs,
          parameters: parametersForRequest,
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
            input_images: inputImages,
            number_of_outputs: numberOfOutputs,
            parameters: parametersForRequest,
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
              <div className="relative mt-3 h-[320px] w-full">
                <Image
                  src={result.url}
                  alt={`generation-${index}`}
                  fill
                  className="rounded object-contain"
                />
              </div>
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
            <Button
              variant="outline"
              size="sm"
              onClick={resetParameters}
              disabled={parameterFields.length === 0}
            >
              恢复推荐参数
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
              <label className="block text-sm font-medium text-neutral-700">输出数量</label>
              <input
                type="number"
                min={1}
                max={10}
                value={numberOfOutputs}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isNaN(value)) {
                    setNumberOfOutputs(1)
                  } else {
                    setNumberOfOutputs(Math.min(Math.max(value, 1), 10))
                  }
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-neutral-500">1-10 之间的整数</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">输入图片 (可选)</label>
              <textarea
                value={inputImagesText}
                onChange={(event) => setInputImagesText(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="每行一个图片 URL 或 data:image/... 的 Base64"
              />
              <p className="text-xs text-neutral-500">用于垫图、首帧等需求；多张图片请换行填写。</p>
            </div>

            {parameterFields.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm font-medium text-neutral-800">供应商参数</div>
                <div className="grid gap-4">
                  {parameterFields.map((field) => {
                    if ((field.key === 'index' || field.key === 'taskId') && !getValueAtPath(parameters, 'action')) {
                      return null
                    }
                    const displayValue = getParameterDisplayValue(field)

                    return (
                      <div key={field.key} className="space-y-1">
                        <label className="block text-sm font-medium text-neutral-700">{field.label}</label>
                        {field.type === 'boolean' ? (
                          <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={Boolean(displayValue)}
                              onChange={(event) => handleParameterValueChange(field, event.target.checked)}
                              className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{Boolean(displayValue) ? '开启' : '关闭'}</span>
                          </label>
                        ) : field.type === 'select' ? (
                          <select
                            value={displayValue === '' ? '' : String(displayValue)}
                            onChange={(event) => handleParameterValueChange(field, event.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">未选择</option>
                            {field.options?.map((option) => (
                              <option key={option.value} value={String(option.value)}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={displayValue === '' ? '' : Number(displayValue)}
                            onChange={(event) => handleParameterValueChange(field, event.target.value)}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={field.placeholder}
                          />
                        ) : field.type === 'string-array' ? (
                          <textarea
                            value={displayValue as string}
                            onChange={(event) => handleParameterValueChange(field, event.target.value)}
                            rows={4}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <input
                            type="text"
                            value={displayValue as string}
                            onChange={(event) => handleParameterValueChange(field, event.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder={field.placeholder}
                          />
                        )}
                        {field.helperText ? (
                          <p className="text-xs text-neutral-500">{field.helperText}</p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : selectedProvider ? (
              <div className="rounded border border-dashed border-neutral-200 p-4 text-xs text-neutral-500">
                当前模型无需额外参数
              </div>
            ) : null}
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
