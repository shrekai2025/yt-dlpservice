/**
 * Image Generation Validation Schemas
 */

import { z } from 'zod'
import { BaseGenerationRequestSchema, SeedSchema } from './common-schemas'

export const AspectRatioSchema = z.enum([
  '1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '9:21'
])

export const SizeStringSchema = z.string().regex(
  /^\d+x\d+$/,
  'Size must be in format: widthxheight (e.g., 1024x1024)'
)

export const ImageSizeSchema = z.union([
  AspectRatioSchema,
  SizeStringSchema,
]).default('1024x1024')

// Flux Adapter Schema
export const FluxRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  input_images: z.array(z.string()).optional().default([]),
  number_of_outputs: z.number().int().min(1).max(10).default(1),
  parameters: z.object({
    size_or_ratio: ImageSizeSchema.optional(),
    seed: SeedSchema,
    prompt_upsampling: z.boolean().optional(),
    safety_tolerance: z.number().min(0).max(6).optional(),
  }).optional().default({}),
})

export type FluxRequest = z.infer<typeof FluxRequestSchema>

// TuziOpenAI Adapter Schema
export const TuziOpenAIRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  input_images: z.array(z.string()).optional().default([]),
  number_of_outputs: z.number().int().min(1).max(10).default(1),
  parameters: z.object({
    size_or_ratio: ImageSizeSchema.optional(),
    seed: SeedSchema,
    n: z.number().int().min(1).max(10).optional(),
    quality: z.enum(['standard', 'hd']).optional(),
    style: z.enum(['vivid', 'natural']).optional(),
  }).optional().default({}),
})

export type TuziOpenAIRequest = z.infer<typeof TuziOpenAIRequestSchema>
