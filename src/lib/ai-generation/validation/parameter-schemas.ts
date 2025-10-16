/**
 * Parameter Validation Schemas
 *
 * 使用Zod定义每个模型的参数验证规则
 */

import { z } from 'zod'

// ==================== 通用Schema ====================

const BaseParametersSchema = z.object({}).passthrough() // 允许任意字段

// ==================== Kie.ai ====================

export const Kie4oImageParametersSchema = z.object({
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
  style: z.enum(['natural', 'vivid']).default('vivid'),
  quality: z.enum(['standard', 'hd']).default('standard'),
})

export const KieFluxKontextParametersSchema = z
  .object({
    enableTranslation: z.boolean().default(true),
    uploadCn: z.boolean().default(false),
    inputImage: z.string().url().optional(),
    aspectRatio: z.enum(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']).default('16:9'),
    outputFormat: z.enum(['jpeg', 'png']).default('jpeg'),
    promptUpsampling: z.boolean().default(false),
    model: z.enum(['flux-kontext-pro', 'flux-kontext-max']).default('flux-kontext-pro'),
    callBackUrl: z.string().url().optional(),
    safetyTolerance: z.number().int().min(0).max(6).default(2),
    watermark: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.inputImage && data.safetyTolerance > 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'safetyTolerance must be between 0 and 2 when editing an image',
        path: ['safetyTolerance'],
      })
    }
  })

export const KieMidjourneyParametersSchema = z.object({
  aspect_ratio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2']).default('1:1'),
  model_version: z.enum(['v6', 'v5.2', 'v5.1', 'v5', 'niji']).default('v6'),
  stylize: z.number().int().min(0).max(1000).optional(),
  chaos: z.number().int().min(0).max(100).optional(),
  quality: z.number().min(0.25).max(2).optional(),
  seed: z.number().int().min(0).optional(),
})

export const KieMidjourneyVideoParametersSchema = z.object({
  duration: z.number().int().min(2).max(10).default(4),
  fps: z.number().int().min(12).max(30).default(24),
  motion_intensity: z.number().int().min(0).max(10).default(5),
})

export const KieSoraParametersSchema = z.object({
  duration: z.enum(['5s', '10s', '15s', '20s', '30s', '60s']).default('10s'),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1', '4:3', '3:4']).default('16:9'),
  resolution: z.enum(['720p', '1080p', '4k']).default('1080p'),
  style: z.enum(['cinematic', 'natural', 'animated', 'documentary']).optional(),
  camera_motion: z.enum(['static', 'pan', 'zoom', 'dolly', 'dynamic']).optional(),
  seed: z.number().int().min(0).optional(),
})

export const KieSora2ParametersSchema = z.object({
  aspect_ratio: z.enum(['portrait', 'landscape']).default('landscape'),
  remove_watermark: z.boolean().default(true),
  callBackUrl: z.string().url().optional(),
})

export const KieSora2ImageToVideoParametersSchema = z.object({
  aspect_ratio: z.enum(['portrait', 'landscape']).default('landscape'),
  remove_watermark: z.boolean().default(true),
  callBackUrl: z.string().url().optional(),
})

export const KieSora2ProParametersSchema = z.object({
  aspect_ratio: z.enum(['portrait', 'landscape']).default('landscape'),
  n_frames: z.enum(['10', '15']).default('10'),
  size: z.enum(['standard', 'high']).default('high'),
  remove_watermark: z.boolean().default(true),
  callBackUrl: z.string().url().optional(),
})

export const KieSora2ProImageToVideoParametersSchema = z.object({
  aspect_ratio: z.enum(['portrait', 'landscape']).default('landscape'),
  n_frames: z.enum(['10', '15']).default('10'),
  size: z.enum(['standard', 'high']).default('standard'),
  remove_watermark: z.boolean().default(true),
  callBackUrl: z.string().url().optional(),
})

export const KieVeo3ParametersSchema = z.object({
  model: z.enum(['veo3', 'veo3_fast']).optional(),
  aspectRatio: z.enum(['16:9', '9:16', 'Auto']).default('16:9'),
  seeds: z.number().int().min(10000).max(99999).optional(),
  enableFallback: z.boolean().default(false),
  enableTranslation: z.boolean().default(true),
  watermark: z.string().optional(),
  callBackUrl: z.string().url().optional(),
})

// ==================== OpenAI ====================

export const OpenAIDalle3ParametersSchema = z.object({
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  style: z.enum(['vivid', 'natural']).default('vivid'),
})

// ==================== TuZi ====================

export const TuziMidjourneyParametersSchema = z.object({
  aspect_ratio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).default('1:1'),
  version: z.enum(['v6', 'v5.2', 'v5.1']).default('v6'),
})

export const TuziKlingVideoParametersSchema = z.object({
  duration: z.number().int().min(5).max(10).default(5),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  mode: z.enum(['standard', 'pro']).default('standard'),
})

// ==================== Replicate ====================

export const ReplicateFluxProParametersSchema = z.object({
  aspect_ratio: z.enum(['1:1', '16:9', '21:9', '3:2', '2:3', '4:5', '5:4', '9:16']).default('1:1'),
  num_outputs: z.number().int().min(1).max(4).default(1),
  guidance: z.number().min(1.5).max(5).default(3),
  num_inference_steps: z.number().int().min(1).max(50).default(28),
  seed: z.number().int().min(0).optional(),
  output_format: z.enum(['webp', 'jpg', 'png']).default('webp'),
  output_quality: z.number().int().min(0).max(100).default(90),
})

export const ReplicateMinimaxVideoParametersSchema = z.object({
  duration: z.number().int().min(3).max(6).default(6),
  fps: z.number().int().min(16).max(30).default(25),
})

// ==================== Pollo ====================

export const PolloVeo3ParametersSchema = z.object({
  duration: z.number().int().min(5).max(10).default(8),
  with_audio: z.boolean().default(false),
  aspect_ratio: z.enum(['16:9']).default('16:9'), // Veo3 固定16:9
})

export const PolloKlingParametersSchema = z.object({
  duration: z.number().int().min(5).max(10).default(5),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  camera_motion: z.enum(['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'none']).optional(),
})

// ==================== Schema Map ====================

/**
 * 模型slug到验证schema的映射
 */
export const MODEL_PARAMETER_SCHEMAS: Record<string, z.ZodType> = {
  // Kie.ai
  'kie-4o-image': Kie4oImageParametersSchema,
  'kie-flux-kontext': KieFluxKontextParametersSchema,
  'kie-midjourney': KieMidjourneyParametersSchema,
  'kie-midjourney-video': KieMidjourneyVideoParametersSchema,
  'kie-sora': KieSoraParametersSchema,
  'kie-sora2': KieSora2ParametersSchema,
  'kie-sora2-image-to-video': KieSora2ImageToVideoParametersSchema,
  'kie-sora2-pro': KieSora2ProParametersSchema,
  'kie-sora2-pro-image-to-video': KieSora2ProImageToVideoParametersSchema,
  'kie-veo3': KieVeo3ParametersSchema,
  'kie-veo3-fast': KieVeo3ParametersSchema,

  // OpenAI
  'openai-dalle-3': OpenAIDalle3ParametersSchema,

  // TuZi
  'tuzi-midjourney': TuziMidjourneyParametersSchema,
  'tuzi-kling-video': TuziKlingVideoParametersSchema,

  // Replicate
  'replicate-flux-pro': ReplicateFluxProParametersSchema,
  'replicate-minimax-video': ReplicateMinimaxVideoParametersSchema,

  // Pollo
  'pollo-veo3': PolloVeo3ParametersSchema,
  'pollo-kling': PolloKlingParametersSchema,
}

/**
 * 验证模型参数
 */
export function validateModelParameters(modelSlug: string, parameters: unknown) {
  const schema = MODEL_PARAMETER_SCHEMAS[modelSlug]

  if (!schema) {
    // 如果没有定义schema，使用通用schema（允许任意参数）
    return BaseParametersSchema.parse(parameters)
  }

  return schema.parse(parameters)
}

/**
 * 安全验证模型参数（返回结果而不抛出错误）
 */
export function safeValidateModelParameters(modelSlug: string, parameters: unknown) {
  const schema = MODEL_PARAMETER_SCHEMAS[modelSlug] ?? BaseParametersSchema

  const result = schema.safeParse(parameters)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return {
      success: false,
      error: result.error.format(),
      errors: result.error.errors,
    }
  }
}

/**
 * 获取模型参数的默认值
 */
export function getDefaultParameters(modelSlug: string): Record<string, unknown> {
  const schema = MODEL_PARAMETER_SCHEMAS[modelSlug]

  if (!schema) {
    return {}
  }

  try {
    // 使用空对象解析，让schema返回默认值
    return schema.parse({})
  } catch {
    return {}
  }
}

/**
 * 获取模型参数的schema定义（用于前端生成表单）
 */
export function getParameterSchema(modelSlug: string) {
  return MODEL_PARAMETER_SCHEMAS[modelSlug]
}

// ==================== 类型导出 ====================

export type Kie4oImageParameters = z.infer<typeof Kie4oImageParametersSchema>
export type KieFluxKontextParameters = z.infer<typeof KieFluxKontextParametersSchema>
export type KieMidjourneyParameters = z.infer<typeof KieMidjourneyParametersSchema>
export type KieMidjourneyVideoParameters = z.infer<typeof KieMidjourneyVideoParametersSchema>
export type KieSoraParameters = z.infer<typeof KieSoraParametersSchema>
export type KieSora2Parameters = z.infer<typeof KieSora2ParametersSchema>
export type KieSora2ImageToVideoParameters = z.infer<typeof KieSora2ImageToVideoParametersSchema>
export type KieSora2ProParameters = z.infer<typeof KieSora2ProParametersSchema>
export type KieSora2ProImageToVideoParameters = z.infer<typeof KieSora2ProImageToVideoParametersSchema>
export type KieVeo3Parameters = z.infer<typeof KieVeo3ParametersSchema>
export type OpenAIDalle3Parameters = z.infer<typeof OpenAIDalle3ParametersSchema>
export type TuziMidjourneyParameters = z.infer<typeof TuziMidjourneyParametersSchema>
export type TuziKlingVideoParameters = z.infer<typeof TuziKlingVideoParametersSchema>
export type ReplicateFluxProParameters = z.infer<typeof ReplicateFluxProParametersSchema>
export type ReplicateMinimaxVideoParameters = z.infer<typeof ReplicateMinimaxVideoParametersSchema>
export type PolloVeo3Parameters = z.infer<typeof PolloVeo3ParametersSchema>
export type PolloKlingParameters = z.infer<typeof PolloKlingParametersSchema>
