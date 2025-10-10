/**
 * Video Generation Validation Schemas
 */

import { z } from 'zod'
import { SeedSchema } from './common-schemas'
import { ImageSizeSchema } from './image-schemas'

export const VideoDurationSchema = z.number()
  .int('Duration must be an integer')
  .min(1, 'Duration must be at least 1 second')
  .max(30, 'Duration cannot exceed 30 seconds')

// Kling Adapter Schema
export const KlingRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  input_images: z.array(z.string()).optional().default([]),
  number_of_outputs: z.number().int().min(1).max(10).default(1),
  parameters: z.object({
    size_or_ratio: ImageSizeSchema.optional(),
    duration: z.union([z.literal(5), z.literal(10)]).default(5),
    mode: z.enum(['standard', 'pro']).default('pro'),
  }).optional().default({}),
})

export type KlingRequest = z.infer<typeof KlingRequestSchema>

// Pollo Adapter Schema
export const PolloRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  input_images: z.array(z.string()).optional().default([]),
  number_of_outputs: z.number().int().min(1).max(10).default(1),
  parameters: z.object({
    duration: VideoDurationSchema.default(8),
    generateAudio: z.boolean().default(true),
    negative_prompt: z.string().optional(),
    seed: SeedSchema,
  }).optional().default({}),
})

export type PolloRequest = z.infer<typeof PolloRequestSchema>

// Pollo Kling Adapter Schema
export const PolloKlingRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  input_images: z.array(z.string()).optional().default([]),
  number_of_outputs: z.number().int().min(1).max(10).default(1),
  parameters: z.object({
    duration: z.union([z.literal(5), z.literal(10)]).default(5),
    strength: z.number().int().min(0).max(100).default(50),
    negative_prompt: z.string().optional(),
  }).optional().default({}),
})

export type PolloKlingRequest = z.infer<typeof PolloKlingRequestSchema>

// Replicate Adapter Schema
export const ReplicateRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  input_images: z.array(z.string()).optional().default([]),
  number_of_outputs: z.number().int().min(1).max(10).default(1),
  parameters: z.object({
    duration: VideoDurationSchema.optional(),
    aspect_ratio: z.enum(['16:9', '9:16', '1:1']).optional(),
    seed: SeedSchema,
  }).optional().default({}),
})

export type ReplicateRequest = z.infer<typeof ReplicateRequestSchema>
