"use client"

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
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
  DialogTrigger,
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

const fluxParameterFields: ParameterField[] = [
  {
    key: 'size',
    label: '尺寸 / 比例',
    type: 'string',
    defaultValue: '1:1',
    helperText: '支持 1:1、4:3、16:9 或 1024x1024 这类尺寸',
  },
  { key: 'seed', label: 'Seed', type: 'number', helperText: '可选，非负整数' },
  { key: 'prompt_upsampling', label: '提示词增强', type: 'boolean', defaultValue: false },
  {
    key: 'safety_tolerance',
    label: '安全等级',
    type: 'number',
    min: 0,
    max: 6,
    step: 1,
    helperText: '0-6 之间的整数',
  },
]

const tuziOpenAiParameterFields: ParameterField[] = [
  {
    key: 'size',
    label: '尺寸',
    type: 'select',
    defaultValue: 'auto',
    options: [
      { label: '自动', value: 'auto' },
      { label: '1024 x 1024', value: '1024x1024' },
      { label: '1024 x 1536（纵向）', value: '1024x1536' },
      { label: '1536 x 1024（横向）', value: '1536x1024' },
    ],
    helperText: 'gpt-image-1 支持 auto / 1024x1024 / 1024x1536 / 1536x1024',
  },
  {
    key: 'output_format',
    label: '输出格式（png/webp/jpeg）',
    type: 'select',
    defaultValue: 'png',
    options: [
      { label: 'PNG', value: 'png' },
      { label: 'JPEG', value: 'jpeg' },
      { label: 'WebP', value: 'webp' },
    ],
  },
  {
    key: 'output_compression',
    label: '压缩质量 0-100（WebP/JPEG 有效）',
    type: 'number',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 100,
  },
  {
    key: 'background',
    label: '背景（透明/不透明/自动）',
    type: 'select',
    defaultValue: 'auto',
    options: [
      { label: '自动', value: 'auto' },
      { label: '透明', value: 'transparent' },
      { label: '不透明', value: 'opaque' },
    ],
    helperText: '透明背景需配合 png 或 webp 使用',
  },
  {
    key: 'moderation',
    label: '内容审核（auto/low）',
    type: 'select',
    defaultValue: 'auto',
    options: [
      { label: '自动', value: 'auto' },
      { label: '低', value: 'low' },
    ],
  },
  {
    key: 'quality',
    label: '质量（auto/high/medium/low）',
    type: 'select',
    defaultValue: 'auto',
    options: [
      { label: '自动', value: 'auto' },
      { label: '高', value: 'high' },
      { label: '中', value: 'medium' },
      { label: '低', value: 'low' },
    ],
  },
  {
    key: 'partial_images',
    label: '分阶段图（0-3，小字：流式调试用）',
    type: 'number',
    min: 0,
    max: 3,
    defaultValue: 0,
  },
  {
    key: 'stream',
    label: '启用流式生成（gpt-image-1 专用）',
    type: 'boolean',
    defaultValue: false,
  },
  { key: 'seed', label: 'Seed', type: 'number', helperText: '可选，非负整数' },
  {
    key: 'user',
    label: 'User（可选终端用户标识）',
    type: 'string',
    helperText: '用于风控与审计场景',
  },
  {
    key: 'response_format',
    label: '响应格式（dall-e 专用参数）',
    type: 'select',
    options: [
      { label: 'URL', value: 'url' },
      { label: 'Base64 JSON', value: 'b64_json' },
    ],
    helperText: '仅对 dall-e-2/3 生效，gpt-image-1 固定返回 base64',
  },
]

const kieParameterFields: ParameterField[] = [
  {
    key: 'size',
    label: '尺寸比例',
    type: 'select',
    defaultValue: '1:1',
    options: [
      { label: '1:1 (正方形)', value: '1:1' },
      { label: '3:2 (横向)', value: '3:2' },
      { label: '2:3 (纵向)', value: '2:3' },
    ],
    helperText: 'Kie 4o Image 支持 1:1、3:2、2:3',
  },
  {
    key: 'maskUrl',
    label: 'Mask 图片 URL',
    type: 'string',
    placeholder: 'https://example.com/mask.png',
    helperText: '可选，黑色区域将被修改，白色区域将被保留',
  },
  {
    key: 'isEnhance',
    label: '提示词增强',
    type: 'boolean',
    defaultValue: false,
    helperText: '在特定场景下（如 3D 渲染）提供更精细的输出',
  },
  {
    key: 'uploadCn',
    label: '使用中国服务器上传',
    type: 'boolean',
    defaultValue: false,
    helperText: 'true 使用中国服务器，false 使用非中国服务器',
  },
  {
    key: 'enableFallback',
    label: '启用备用模型',
    type: 'boolean',
    defaultValue: false,
    helperText: '当 GPT-4o 不可用时自动切换到备用模型',
  },
  {
    key: 'fallbackModel',
    label: '备用模型',
    type: 'select',
    defaultValue: 'FLUX_MAX',
    options: [
      { label: 'GPT Image 1', value: 'GPT_IMAGE_1' },
      { label: 'Flux Max', value: 'FLUX_MAX' },
    ],
    helperText: 'enableFallback 为 true 时生效',
  },
  {
    key: 'callBackUrl',
    label: '回调地址',
    type: 'string',
    placeholder: 'https://your-callback-url.com/callback',
    helperText: '可选，任务完成后将结果 POST 到此 URL',
  },
]

const kieFluxKontextParameterFields: ParameterField[] = [
  {
    key: 'enableTranslation',
    label: '启用自动翻译',
    type: 'boolean',
    defaultValue: true,
    helperText: '非英文提示词会自动翻译成英文',
  },
  {
    key: 'aspectRatio',
    label: '输出比例',
    type: 'select',
    defaultValue: '16:9',
    options: [
      { label: '21:9 超宽', value: '21:9' },
      { label: '16:9 宽屏', value: '16:9' },
      { label: '4:3 标准', value: '4:3' },
      { label: '1:1 正方形', value: '1:1' },
      { label: '3:4 竖版', value: '3:4' },
      { label: '9:16 手机竖屏', value: '9:16' },
    ],
  },
  {
    key: 'outputFormat',
    label: '输出格式',
    type: 'select',
    defaultValue: 'jpeg',
    options: [
      { label: 'JPEG', value: 'jpeg' },
      { label: 'PNG', value: 'png' },
    ],
  },
  {
    key: 'promptUpsampling',
    label: '提示词增强',
    type: 'boolean',
    defaultValue: false,
    helperText: '开启后提示词会自动润色，但会稍微增加耗时',
  },
  {
    key: 'model',
    label: '模型版本',
    type: 'select',
    defaultValue: 'flux-kontext-pro',
    options: [
      { label: 'Flux Kontext Pro', value: 'flux-kontext-pro' },
      { label: 'Flux Kontext Max', value: 'flux-kontext-max' },
    ],
  },
  {
    key: 'safetyTolerance',
    label: '安全等级 (0-6)',
    type: 'number',
    min: 0,
    max: 6,
    step: 1,
    defaultValue: 2,
  },
  {
    key: 'uploadCn',
    label: '使用中国区上传',
    type: 'boolean',
    defaultValue: false,
    helperText: '位于中国大陆时可开启以提升上传速度',
  },
  {
    key: 'inputImage',
    label: '编辑模式输入图 URL',
    type: 'string',
    placeholder: 'https://example.com/input.jpg',
    helperText: '可选，启用图像编辑时提供原始图',
  },
  {
    key: 'callBackUrl',
    label: '回调地址',
    type: 'string',
    placeholder: 'https://your-callback-url.com/callback',
  },
  {
    key: 'watermark',
    label: '水印 ID',
    type: 'string',
    placeholder: '可选',
  },
]

const kieMidjourneyParameterFields: ParameterField[] = [
  {
    key: 'taskType',
    label: '任务类型',
    type: 'select',
    defaultValue: 'mj_txt2img',
    options: [
      { label: '文生图 (Text to Image)', value: 'mj_txt2img' },
      { label: '图生图 (Image to Image)', value: 'mj_img2img' },
      { label: '风格参考 (Style Reference)', value: 'mj_style_reference' },
      { label: '全向参考 (Omni Reference)', value: 'mj_omni_reference' },
      { label: '图生视频 (Image to Video)', value: 'mj_video' },
      { label: '图生高清视频 (Image to Video HD)', value: 'mj_video_hd' },
    ],
  },
  {
    key: 'speed',
    label: '生成速度',
    type: 'select',
    defaultValue: 'relaxed',
    options: [
      { label: 'Relaxed (慢速)', value: 'relaxed' },
      { label: 'Fast (快速)', value: 'fast' },
      { label: 'Turbo (极速)', value: 'turbo' },
    ],
    helperText: '视频和全向参考任务不支持此参数',
  },
  {
    key: 'aspectRatio',
    label: '输出比例',
    type: 'select',
    defaultValue: '16:9',
    options: [
      { label: '2:1 超宽', value: '2:1' },
      { label: '16:9 宽屏', value: '16:9' },
      { label: '4:3 标准', value: '4:3' },
      { label: '3:2 经典', value: '3:2' },
      { label: '1:1 正方形', value: '1:1' },
      { label: '3:4 竖版', value: '3:4' },
      { label: '5:6 竖版', value: '5:6' },
      { label: '9:16 手机竖屏', value: '9:16' },
      { label: '2:3 竖版', value: '2:3' },
      { label: '6:5 横版', value: '6:5' },
      { label: '1:2 超高', value: '1:2' },
    ],
  },
  {
    key: 'version',
    label: 'MJ 版本',
    type: 'select',
    defaultValue: '7',
    options: [
      { label: 'V7', value: '7' },
      { label: 'V6.1', value: '6.1' },
      { label: 'V6', value: '6' },
      { label: 'V5.2', value: '5.2' },
      { label: 'V5.1', value: '5.1' },
      { label: 'Niji 6', value: 'niji6' },
    ],
  },
  {
    key: 'variety',
    label: '多样性 (0-100)',
    type: 'number',
    min: 0,
    max: 100,
    step: 5,
    defaultValue: 0,
    helperText: '每次递增 5，数值越高结果越多样化',
  },
  {
    key: 'stylization',
    label: '风格化 (0-1000)',
    type: 'number',
    min: 0,
    max: 1000,
    step: 50,
    defaultValue: 100,
    helperText: '建议为 50 的倍数，数值越高艺术风格越强',
  },
  {
    key: 'weirdness',
    label: '怪异度 (0-3000)',
    type: 'number',
    min: 0,
    max: 3000,
    step: 100,
    defaultValue: 0,
    helperText: '建议为 100 的倍数，数值越高结果越奇特',
  },
  {
    key: 'ow',
    label: 'Omni 强度 (1-1000)',
    type: 'number',
    min: 1,
    max: 1000,
    step: 1,
    defaultValue: 500,
    helperText: '仅当任务类型为 Omni Reference 时生效',
  },
  {
    key: 'videoBatchSize',
    label: '视频数量',
    type: 'select',
    defaultValue: 1,
    options: [
      { label: '1 个视频', value: 1 },
      { label: '2 个视频', value: 2 },
      { label: '4 个视频', value: 4 },
    ],
    helperText: '仅当任务类型为视频生成时生效',
  },
  {
    key: 'motion',
    label: '运动级别',
    type: 'select',
    defaultValue: 'high',
    options: [
      { label: 'High (高运动)', value: 'high' },
      { label: 'Low (低运动)', value: 'low' },
    ],
    helperText: '仅当任务类型为视频生成时生效',
  },
  {
    key: 'waterMark',
    label: '水印 ID',
    type: 'string',
    placeholder: '可选',
  },
  {
    key: 'enableTranslation',
    label: '启用自动翻译',
    type: 'boolean',
    defaultValue: false,
    helperText: '非英文提示词会自动翻译成英文',
  },
  {
    key: 'callBackUrl',
    label: '回调地址',
    type: 'string',
    placeholder: 'https://your-callback-url.com/callback',
    helperText: '可选，任务完成后将结果 POST 到此 URL',
  },
]

const mjRelaxImagineParameterFields: ParameterField[] = [
  {
    key: 'botType',
    label: '模型类型',
    type: 'select',
    defaultValue: 'MID_JOURNEY',
    options: [
      { label: 'Midjourney', value: 'MID_JOURNEY' },
      { label: 'Niji Journey', value: 'NIJI_JOURNEY' },
    ],
  },
  { key: 'noStorage', label: '返回官方链接 (noStorage)', type: 'boolean', defaultValue: false },
  { key: 'notifyHook', label: '回调地址', type: 'string', placeholder: 'https://example.com/webhook' },
  {
    key: 'accountFilter.modes',
    label: '账号模式',
    type: 'string-array',
    defaultValue: ['FAST'],
    helperText: '每行一个模式值，例如 FAST、RELAX',
  },
  { key: 'state', label: '自定义参数 (state)', type: 'string' },
  {
    key: 'base64Array',
    label: '垫图 Base64 列表',
    type: 'string-array',
    helperText: '纯 base64 字符串，每行一条。上传图片后可自动填充。',
  },
]

const mjRelaxVideoParameterFields: ParameterField[] = [
  {
    key: 'videoType',
    label: '视频模型',
    type: 'select',
    defaultValue: 'vid_1.1_i2v_720',
    options: [
      { label: 'vid_1.1_i2v_480', value: 'vid_1.1_i2v_480' },
      { label: 'vid_1.1_i2v_720', value: 'vid_1.1_i2v_720' },
    ],
  },
  {
    key: 'motion',
    label: '运动幅度',
    type: 'select',
    defaultValue: 'low',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'High', value: 'high' },
    ],
  },
  { key: 'image', label: '首帧图片 (URL 或 Base64)', type: 'string', placeholder: 'https://example.com/image.png' },
  { key: 'endImage', label: '尾帧图片', type: 'string', placeholder: '可选，URL 或 Base64' },
  { key: 'loop', label: '循环播放', type: 'boolean', defaultValue: false },
  {
    key: 'batchSize',
    label: '批量生成数量',
    type: 'select',
    defaultValue: 4,
    options: [
      { label: '1', value: 1 },
      { label: '2', value: 2 },
      { label: '4', value: 4 },
    ],
  },
  {
    key: 'action',
    label: '任务操作',
    type: 'select',
    options: [{ label: 'Extend', value: 'extend' }],
    helperText: '扩展现有任务时使用',
  },
  { key: 'index', label: '视频索引 (action 时必填)', type: 'number', min: 0, max: 3, step: 1 },
  { key: 'taskId', label: '父任务 ID (action 时必填)', type: 'string' },
  { key: 'state', label: '自定义参数 (state)', type: 'string' },
  { key: 'notifyHook', label: '回调地址', type: 'string', placeholder: 'https://example.com/webhook' },
  { key: 'noStorage', label: '返回官方链接 (noStorage)', type: 'boolean', defaultValue: false },
]

const klingParameterFields: ParameterField[] = [
  {
    key: 'size_or_ratio',
    label: '尺寸 / 比例',
    type: 'string',
    defaultValue: '1024x1024',
    helperText: '自动转换为 Kling 支持的比例',
  },
  {
    key: 'duration',
    label: '时长 (秒)',
    type: 'select',
    defaultValue: 5,
    options: [
      { label: '5 秒', value: 5 },
      { label: '10 秒', value: 10 },
    ],
  },
  {
    key: 'mode',
    label: '模式',
    type: 'select',
    defaultValue: 'pro',
    options: [
      { label: 'Standard', value: 'standard' },
      { label: 'Pro', value: 'pro' },
    ],
  },
]

const polloVeo3ParameterFields: ParameterField[] = [
  {
    key: 'duration',
    label: '视频时长 (秒)',
    type: 'number',
    defaultValue: 8,
    min: 1,
    max: 30,
    helperText: '1-30 之间的整数',
  },
  { key: 'generateAudio', label: '生成音频', type: 'boolean', defaultValue: true },
  { key: 'negative_prompt', label: '反向提示词', type: 'string', placeholder: '可选' },
  { key: 'seed', label: 'Seed', type: 'number', helperText: '可选，非负整数' },
]

const polloKlingParameterFields: ParameterField[] = [
  {
    key: 'duration',
    label: '视频时长 (秒)',
    type: 'select',
    defaultValue: 5,
    options: [
      { label: '5 秒', value: 5 },
      { label: '10 秒', value: 10 },
    ],
  },
  {
    key: 'strength',
    label: '风格强度',
    type: 'number',
    defaultValue: 50,
    min: 0,
    max: 100,
    step: 1,
  },
  { key: 'negative_prompt', label: '反向提示词', type: 'string', placeholder: '可选' },
]

const replicateMinimaxParameterFields: ParameterField[] = [
  {
    key: 'duration',
    label: '视频时长 (秒)',
    type: 'number',
    min: 1,
    max: 30,
    helperText: '可选，1-30 之间的整数',
  },
  {
    key: 'aspect_ratio',
    label: '画面比例',
    type: 'select',
    options: [
      { label: '16:9', value: '16:9' },
      { label: '9:16', value: '9:16' },
      { label: '1:1', value: '1:1' },
    ],
  },
  { key: 'seed', label: 'Seed', type: 'number', helperText: '可选，非负整数' },
]

const PARAMETER_FIELDS_BY_PROVIDER: Record<string, ParameterField[]> = {
  'flux-pro': fluxParameterFields,
  'flux-dev': fluxParameterFields,
  'flux-kontext-pro': fluxParameterFields,
  'tuzi-openai-dalle': tuziOpenAiParameterFields,
  'gpt-image-1-vip': tuziOpenAiParameterFields,
  'gpt-4o-image-vip': tuziOpenAiParameterFields,
  'tuzi-openai-imagine': tuziOpenAiParameterFields,
  'tuzi-openai imagine': tuziOpenAiParameterFields,
  'kie-4o-image': kieParameterFields,
  'kie-flux-context': kieFluxKontextParameterFields,
  'kie-midjourney': kieMidjourneyParameterFields,
  mj_relax_imagine: mjRelaxImagineParameterFields,
  mj_relax_video: mjRelaxVideoParameterFields,
  'kling-v1': klingParameterFields,
  'kling-video-v1': klingParameterFields,
  'pollo-veo3': polloVeo3ParameterFields,
  veo3: polloVeo3ParameterFields,
  'pollo-kling': polloKlingParameterFields,
  'replicate-minimax': replicateMinimaxParameterFields,
  'minimax-video': replicateMinimaxParameterFields,
  'ltx-video': replicateMinimaxParameterFields,
}

const STORAGE_KEY_SELECTED_CATEGORY = "unigen_selected_category"
const STORAGE_KEY_SELECTED_PROVIDER = "unigen_selected_provider"

const PROVIDER_SHORT_NAMES: Record<string, string> = {
  'flux-pro': 'Flux Pro',
  'flux-dev': 'Flux Dev',
  'tuzi-openai-dalle': 'GPT-4o Image',
  'gpt-image-1-vip': 'GPT-4o Image',
  'gpt-4o-image-vip': 'GPT-4o Image',
  'kie-4o-image': 'Kie 4o',
  'kie-flux-context': 'Flux Kontext',
  'kie-midjourney': 'Midjourney',
  'mj_relax_imagine': 'MJ Imagine',
  'mj_relax_video': 'MJ Video',
  'kling-v1': 'Kling Video',
  'kling-video-v1': 'Kling Video',
  'pollo-veo3': 'Pollo Veo3',
  'pollo-kling': 'Pollo Kling',
  'replicate-minimax': 'Replicate Minimax',
  'replicate-ltx': 'Replicate LTX',
  veo3: 'Replicate Veo3',
}

const CATEGORY_DEFINITIONS = [
  {
    key: 'imagine' as const,
    label: 'Imagine',
    providerIds: [
      'flux-pro',
      'flux-dev',
      'tuzi-openai-dalle',
      'gpt-image-1-vip',
      'gpt-4o-image-vip',
      'kie-4o-image',
      'kie-flux-context',
      'kie-midjourney',
      'mj_relax_imagine',
    ],
  },
  {
    key: 'video' as const,
    label: 'Video',
    providerIds: [
      'kling-v1',
      'kling-video-v1',
      'mj_relax_video',
      'pollo-veo3',
      'pollo-kling',
      'replicate-minimax',
    ],
  },
] as const

type GenerationCategory = (typeof CATEGORY_DEFINITIONS)[number]['key']

type GenerationStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED"

type ProviderOption = {
  id: string
  name: string
  model_identifier: string
  type: string
  provider?: string | null
  short_name?: string | null
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
  progress?: number | null
  created_at: string
  updated_at: string
  completed_at: string | null
  duration_ms: number | null
  client_key_prefix?: string | null
  msg?: string | null
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
  const normalized = modelIdentifier.trim()
  return (
    PARAMETER_FIELDS_BY_PROVIDER[normalized] ||
    PARAMETER_FIELDS_BY_PROVIDER[normalized.toLowerCase()] ||
    []
  )
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [isLoadingProviders, setIsLoadingProviders] = useState(false)

  const [selectedCategory, setSelectedCategory] = useState<GenerationCategory>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY_SELECTED_CATEGORY)
      return stored === "video" ? "video" : "imagine"
    }
    return "imagine"
  })

  const [selectedProviderId, setSelectedProviderId] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(STORAGE_KEY_SELECTED_PROVIDER) || ""
    }
    return ""
  })

  const categoryDefinition = useMemo(
    () => CATEGORY_DEFINITIONS.find((category) => category.key === selectedCategory) || CATEGORY_DEFINITIONS[0],
    [selectedCategory]
  )

  const availableProviders = useMemo(() => {
    if (!categoryDefinition) return []
    const order = categoryDefinition.providerIds
    return providers
      .filter((provider) => order.includes(provider.model_identifier))
      .sort((a, b) => order.indexOf(a.model_identifier) - order.indexOf(b.model_identifier))
  }, [providers, categoryDefinition])

  const selectedProvider = useMemo(
    () => availableProviders.find((p) => p.id === selectedProviderId) || null,
    [availableProviders, selectedProviderId]
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY_SELECTED_CATEGORY, selectedCategory)
  }, [selectedCategory])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (selectedProviderId) {
      window.localStorage.setItem(STORAGE_KEY_SELECTED_PROVIDER, selectedProviderId)
    } else {
      window.localStorage.removeItem(STORAGE_KEY_SELECTED_PROVIDER)
    }
  }, [selectedProviderId])

  useEffect(() => {
    if (availableProviders.length === 0) {
      if (selectedProviderId !== "") {
        setSelectedProviderId("")
      }
      return
    }

    const exists = availableProviders.some((provider) => provider.id === selectedProviderId)
    if (!exists) {
      let nextId: string | null = null

      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem(STORAGE_KEY_SELECTED_PROVIDER)
        const storedMatch = availableProviders.find((provider) => provider.id === stored)
        if (storedMatch) {
          nextId = storedMatch.id
        }
      }

      if (!nextId) {
        nextId = availableProviders[0]!.id
      }

      setSelectedProviderId(nextId)
    }
  }, [availableProviders, selectedProviderId])

  const [prompt, setPrompt] = useState("")
  const [numberOfOutputs, setNumberOfOutputs] = useState(1)
  const [inputImagesText, setInputImagesText] = useState("")
  const [uploadedImages, setUploadedImages] = useState<{ url: string; name: string }[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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
      return
    }

    const defaults = buildDefaultParameters(parameterFields)
    setParameters(cloneParameters(defaults))
    parameterDefaultsRef.current = cloneParameters(defaults)
  }, [selectedProvider, parameterFields])
  const [formError, setFormError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)

  const [history, setHistory] = useState<TaskRecord[]>([])
  const [historyMeta, setHistoryMeta] = useState({ total: 0, limit: 20, offset: 0, hasMore: false })
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null)

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
        const mapped =
          data.data?.map((provider) => ({
            ...provider,
            short_name:
              provider.short_name ||
              PROVIDER_SHORT_NAMES[provider.model_identifier] ||
              provider.name,
          })) ?? []

        setProviders(mapped)
        setKeyStatus("valid")

        if (!data.data || data.data.length === 0) {
          setSelectedProviderId("")
          return
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
    []
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

  // Auto-refresh for PROCESSING tasks
  useEffect(() => {
    if (!storedApiKey) return

    const hasProcessingTasks = history.some(
      (task) => task.status === 'PROCESSING' || task.status === 'PENDING'
    )

    if (!hasProcessingTasks) return

    const intervalId = setInterval(() => {
      loadHistory(storedApiKey, { offset: 0, append: false }).catch(console.error)
    }, 3000) // Refresh every 3 seconds

    return () => clearInterval(intervalId)
  }, [storedApiKey, history, loadHistory])

  // Poll newly created tasks to quickly restore generate button state
  useEffect(() => {
    if (!pendingRequestId || !storedApiKey) {
      return
    }

    let attempts = 0
    const maxAttempts = 60
    let intervalId: ReturnType<typeof setInterval> | null = null

    const stopPolling = (refreshHistory: boolean) => {
      if (intervalId) {
        clearInterval(intervalId)
      }
      intervalId = null
      setIsGenerating(false)
      setPendingRequestId(null)
      if (refreshHistory) {
        loadHistory(storedApiKey, { offset: 0, append: false }).catch(console.error)
      }
    }

    intervalId = setInterval(async () => {
      attempts += 1
      try {
        const response = await fetch(`/api/external/generation/tasks/${pendingRequestId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": storedApiKey,
          },
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Status fetch failed ${response.status}`)
        }

        const data = await response.json()
        const status: string | undefined = data?.status

        if (status === 'PROCESSING') {
          stopPolling(false)
        } else if (status && status !== 'PENDING') {
          stopPolling(true)
        }
      } catch (error) {
        console.warn('Task polling failed', error)
        if (attempts >= maxAttempts) {
          stopPolling(false)
        }
      }

      if (attempts >= maxAttempts) {
        stopPolling(false)
      }
    }, 1000)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [pendingRequestId, storedApiKey, loadHistory])

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

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    if (!storedApiKey) {
      setUploadError("请先保存 API 密钥")
      if (!isSettingsOpen) setIsSettingsOpen(true)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const remainingSlots = 5 - uploadedImages.length
    if (remainingSlots <= 0) {
      setUploadError("最多上传 5 张图片")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots)
    setUploadError(null)
    if (files.length > remainingSlots) {
      setUploadError("最多上传 5 张图片，已自动忽略多余文件")
    }
    const uploaded: { url: string; name: string }[] = []
    setIsUploadingImage(true)

    try {
      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`文件 ${file.name} 不是图片类型`)
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/external/storage/upload', {
          method: 'POST',
          headers: {
            'X-API-Key': storedApiKey,
          },
          body: formData,
        })

        const data = await response.json().catch(() => null)

        if (!response.ok || !data?.url) {
          const message = data?.error || data?.message || '上传失败'
          throw new Error(message)
        }

        uploaded.push({ url: data.url as string, name: file.name })
      }

      if (uploaded.length > 0) {
        setUploadedImages((prev) => [...prev, ...uploaded])
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '上传失败')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setIsUploadingImage(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleOpenFilePicker = () => {
    if (uploadedImages.length >= 5) {
      setUploadError("最多上传 5 张图片")
      return
    }
    setUploadError(null)
    fileInputRef.current?.click()
  }

  const handleGenerate = async () => {
    setFormError(null)

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
    const manualImages = inputImagesText
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    const inputImages = [...uploadedImages.map((item) => item.url), ...manualImages]

    setPendingRequestId(null)
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

      // 一旦后端有响应就立即恢复按钮，避免阻塞后续任务
      setIsGenerating(false)

      let data: any = null
      let parseError: Error | null = null
      const responseText = await response.text().catch(() => null)

      if (responseText && responseText.trim().length > 0) {
        try {
          data = JSON.parse(responseText)
        } catch (error) {
          parseError = error instanceof Error ? error : new Error(String(error))
        }
      }

      if (parseError) {
        console.warn("Failed to parse generation response JSON", parseError)
      }

      if (!response.ok) {
        const message = data?.error || data?.message || "生成失败"
        setFormError(message)
        return
      }

      // 任务提交成功，异步刷新历史记录
      loadHistory(storedApiKey, { offset: 0, append: false }).catch(console.error)

      if (data?.id && data?.status === 'PROCESSING') {
        setPendingRequestId(String(data.id))
      } else {
        setIsGenerating(false)
      }
    } catch (error) {
      console.error("Generation failed", error)
      setFormError(error instanceof Error ? error.message : "生成出错")
      setIsGenerating(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!storedApiKey) return

    if (pendingRequestId === taskId) {
      setPendingRequestId(null)
      setIsGenerating(false)
    }
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
      setHistoryMeta((prev) => ({ ...prev, total: Math.max(prev.total - 1, 0) }))
    } catch (error) {
      console.error("Failed to delete task", error)
      alert("删除失败")
    }
  }

  const handleTransferS3 = async (taskId: string) => {
    if (!storedApiKey) return

    // Confirm with user
    if (!confirm("确认要将此任务的图片转存到 S3 吗？")) {
      return
    }

    try {
      const response = await fetch(`/api/external/generation/tasks/${taskId}/transfer-s3`, {
        method: "POST",
        headers: {
          "X-API-Key": storedApiKey,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data?.error || data?.message || "转存失败")
        return
      }

      alert(`成功转存 ${data.transferred} 张图片到 S3`)

      // Refresh history to show updated URLs
      await loadHistory(storedApiKey, { offset: 0, append: false })
    } catch (error) {
      console.error("Failed to transfer to S3", error)
      alert("转存失败：" + (error instanceof Error ? error.message : "未知错误"))
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">UniGen</h1>
        <div className="flex items-center gap-2">
          <Badge className={keyStatusBadge.tone}>{keyStatusBadge.text}</Badge>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                设置
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>API Key 设置</DialogTitle>
                <DialogDescription>密钥保存在浏览器本地，所有请求都会携带此值。</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-neutral-700">API Key</label>
                  <input
                    value={apiKeyInput}
                    onChange={(event) => setApiKeyInput(event.target.value)}
                    placeholder="请输入访问密钥"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-neutral-500">置空并保存可移除本地密钥。</p>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="sm" disabled={isSavingKey}>
                    取消
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    await handleSaveKey()
                    setIsSettingsOpen(false)
                  }}
                  disabled={isSavingKey}
                >
                  {isSavingKey ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <label htmlFor="unigen-category" className="sr-only">
                生成类型
              </label>
              <select
                id="unigen-category"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as GenerationCategory)}
                className="h-9 rounded-md border border-neutral-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {CATEGORY_DEFINITIONS.map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="unigen-provider" className="sr-only">
                模型供应商
              </label>
              <select
                id="unigen-provider"
                value={selectedProviderId}
                onChange={(event) => setSelectedProviderId(event.target.value)}
                disabled={isLoadingProviders || availableProviders.length === 0}
                className="h-9 rounded-md border border-neutral-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableProviders.length === 0 ? (
                  <option value="">{isLoadingProviders ? "加载中..." : "无可用供应商"}</option>
                ) : (
                  availableProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.short_name || PROVIDER_SHORT_NAMES[provider.model_identifier] || provider.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedProvider ? (
              <div className="text-xs text-neutral-500">
                <div className="font-mono">{selectedProvider.model_identifier}</div>
                {selectedProvider.provider ? (
                  <div className="text-neutral-400">{selectedProvider.provider}</div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-700">输入图片</div>
              <div className="space-y-2 rounded border border-neutral-200 bg-neutral-50 p-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenFilePicker}
                  disabled={isUploadingImage || uploadedImages.length >= 5}
                >
                  {isUploadingImage ? "上传中..." : uploadedImages.length >= 5 ? "已达上限" : "选择文件"}
                </Button>
                <p className="text-xs text-neutral-500">支持上传最多 5 张图片，文件将自动保存至 S3。</p>
                {uploadError ? (
                  <div className="rounded border border-red-100 bg-red-50 px-2 py-1 text-xs text-red-600">{uploadError}</div>
                ) : null}
                {uploadedImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedImages.map((image, index) => (
                      <div key={image.url} className="relative overflow-hidden rounded border border-neutral-200 bg-white">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(image.url)}
                          className="block w-full"
                        >
                          <img
                            src={image.url}
                            alt={image.name}
                            className="h-20 w-full object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white"
                        >
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <textarea
                  value={inputImagesText}
                  onChange={(event) => setInputImagesText(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-neutral-200 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="或粘贴图片 URL / Base64，每行一条"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-700">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="描述你希望生成的内容..."
                />
              </div>
              <div className="w-24 space-y-1">
                <label className="text-xs font-medium uppercase text-neutral-500">输出数量</label>
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
                  className="h-9 w-full rounded-md border border-neutral-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {parameterFields.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {parameterFields.map((field) => {
                if ((field.key === 'index' || field.key === 'taskId') && !getValueAtPath(parameters, 'action')) {
                  return null
                }
                const displayValue = getParameterDisplayValue(field)

                return (
                  <div key={field.key} className="space-y-1">
                    <label className="text-sm font-medium text-neutral-700">{field.label}</label>
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
                        className="h-9 w-full rounded-md border border-neutral-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">请选择</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'string-array' ? (
                      <textarea
                        value={displayValue as string}
                        onChange={(event) => handleParameterValueChange(field, event.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={displayValue as string | number}
                        onChange={(event) => {
                          const value =
                            field.type === 'number'
                              ? Number(event.target.value)
                              : event.target.value
                          handleParameterValueChange(field, value)
                        }}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        placeholder={field.placeholder}
                        className="h-9 w-full rounded-md border border-neutral-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}
                    {field.helperText ? (
                      <p className="text-xs text-neutral-500">{field.helperText}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}

          {formError ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetParameters}
              disabled={parameterFields.length === 0}
            >
              恢复参数
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating || !storedApiKey || !selectedProviderId}>
              {isGenerating ? "生成中..." : "开始生成"}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="rounded border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
            新建的生成任务会出现在下方的历史列表中，状态更新后可在详情里查看结果。
          </div>
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
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getStatusTone(task.status)}>{task.status}</Badge>
                    <span className="text-xs text-neutral-500">{formatDate(task.created_at)}</span>
                    {task.duration_ms ? (
                      <span className="text-xs text-neutral-500">耗时：{formatDuration(task.duration_ms)}</span>
                    ) : null}
                    {task.status === "PROCESSING" && task.progress !== null && task.progress !== undefined ? (
                      <span className="text-xs font-medium text-blue-600">
                        进度：{Math.round(task.progress * 100)}%
                      </span>
                    ) : null}
                  </div>
                  {task.status === "PROCESSING" && task.progress !== null && task.progress !== undefined ? (
                    <div className="w-full max-w-md">
                      <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${Math.round(task.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="text-sm font-medium text-neutral-900">{task.prompt}</div>
                  <div className="text-xs text-neutral-500">
                    模型：{task.model_identifier}
                    {task.msg ? <span className="ml-2 text-neutral-400">{task.msg}</span> : null}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setActiveDialog({ task, open: true })}>
                    查看详情
                  </Button>
                  {(task.model_identifier === 'kie-4o-image' ||
                    task.model_identifier === 'kie-flux-context' ||
                    task.model_identifier === 'kie-midjourney') &&
                  task.status === 'SUCCESS' &&
                  task.results ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTransferS3(task.id)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                    >
                      转存 S3
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={!storedApiKey}
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

      <Dialog open={!!previewImage} onOpenChange={(open) => (!open ? setPreviewImage(null) : null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {previewImage ? (
            <img src={previewImage} alt="预览图片" className="max-h-[70vh] w-full object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>

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
                        {result.type === 'image' ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(result.url)}
                            className="mt-3 block w-full overflow-hidden rounded border border-neutral-100 bg-neutral-50"
                          >
                            <img
                              src={result.url}
                              alt={`结果 ${index + 1}`}
                              className="h-48 w-full object-cover"
                            />
                          </button>
                        ) : null}
                        {result.metadata ? (
                          <pre className="mt-3 max-h-48 overflow-auto rounded border border-neutral-100 bg-neutral-900 p-2 text-[11px] text-green-200">
{JSON.stringify(result.metadata, null, 2)}
                          </pre>
                        ) : null}
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
