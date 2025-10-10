/**
 * Common Validation Schemas
 *
 * Shared schemas used across different adapter types
 */

import { z } from 'zod'

export const PromptSchema = z.string()
  .min(1, 'Prompt cannot be empty')
  .max(2000, 'Prompt too long (max 2000 characters)')

export const ImageUrlSchema = z.string()
  .refine(
    (val) => {
      // Allow http/https URLs
      if (val.startsWith('http://') || val.startsWith('https://')) {
        try {
          new URL(val)
          return true
        } catch {
          return false
        }
      }
      // Allow base64 data URIs
      if (val.startsWith('data:image/')) {
        return /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(val)
      }
      return false
    },
    'Must be a valid URL or base64 data URI'
  )

export const NumberOfOutputsSchema = z.number()
  .int('Number of outputs must be an integer')
  .min(1, 'Number of outputs must be at least 1')
  .max(10, 'Number of outputs cannot exceed 10')
  .default(1)

export const SeedSchema = z.number()
  .int('Seed must be an integer')
  .min(0, 'Seed must be non-negative')
  .optional()

export const BaseGenerationRequestSchema = z.object({
  prompt: PromptSchema,
  input_images: z.array(ImageUrlSchema).optional().default([]),
  number_of_outputs: NumberOfOutputsSchema,
  parameters: z.record(z.any()).optional().default({}),
})

export type BaseGenerationRequest = z.infer<typeof BaseGenerationRequestSchema>
