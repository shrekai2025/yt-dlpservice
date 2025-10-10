/**
 * GenAPIHub Adapter System - Type Definitions
 *
 * Unified interfaces for multi-provider AI generation services
 */

import { z } from 'zod'

// ============================================
// Generation Types
// ============================================

export type GenerationType = 'image' | 'video' | 'stt'

export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'

// ============================================
// Generation Result
// ============================================

export interface GenerationResult {
  type: 'image' | 'video' | 'audio' | 'text'
  url: string
  metadata?: Record<string, unknown>
}

// ============================================
// Unified Generation Request
// ============================================

export const UnifiedGenerationRequestSchema = z.object({
  model_identifier: z.string(),
  prompt: z.string(),
  input_images: z.array(z.string()).optional().default([]),
  number_of_outputs: z.number().int().positive().optional().default(1),
  parameters: z.record(z.unknown()).optional().default({}),
})

export type UnifiedGenerationRequest = z.infer<typeof UnifiedGenerationRequestSchema>

// ============================================
// Unified Generation Response
// ============================================

export interface UnifiedGenerationResponse {
  status: GenerationStatus
  results?: GenerationResult[]
  message?: string
  task_id?: string
}

// ============================================
// Provider Configuration
// ============================================

export interface ProviderConfig {
  id: string
  name: string
  modelIdentifier: string
  adapterName: string
  type: GenerationType
  provider: string | null
  apiEndpoint: string
  apiFlavor: string
  encryptedAuthKey: string | null
  isActive: boolean
  uploadToS3: boolean
  s3PathPrefix: string | null
  modelVersion: string | null
}

// ============================================
// Adapter Response
// ============================================

export interface AdapterResponse {
  status: 'SUCCESS' | 'PROCESSING' | 'ERROR'
  results?: GenerationResult[]
  message?: string
  task_id?: string
  error?: {
    code: string
    message: string
    details?: any
    isRetryable: boolean
  }
}

// ============================================
// Task Status Response (for polling)
// ============================================

export interface TaskStatusResponse {
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  output?: string[]       // URLs to generated content
  error?: string          // Error message if failed
  progress?: number       // Progress percentage (0-100)
}

// ============================================
// HTTP Client Configuration
// ============================================

export interface HttpClientConfig {
  headers?: Record<string, string>
  timeout?: number
}
