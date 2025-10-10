/**
 * API Key Authentication Utilities
 *
 * Handles API key validation and management
 */

import crypto from 'crypto'
import { db } from '~/server/db'

/**
 * Hash API key using SHA256
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Extract key prefix (first 6 characters)
 */
export function extractKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 6)
}

/**
 * Generate a new API key
 * Format: genapi_<32 random hex characters>
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(16).toString('hex')
  return `genapi_${randomBytes}`
}

/**
 * Validate API key against database
 * Returns the API key record if valid, null otherwise
 */
export async function validateApiKey(
  apiKey: string
): Promise<{ id: string; name: string } | null> {
  // Extract prefix for fast lookup
  const prefix = extractKeyPrefix(apiKey)

  // Find key by prefix
  const keyRecord = await db.apiKey.findFirst({
    where: {
      keyPrefix: prefix,
      isActive: true,
    },
  })

  if (!keyRecord) {
    return null
  }

  // Verify hash
  const hash = hashApiKey(apiKey)
  if (hash !== keyRecord.hashedKey) {
    return null
  }

  return {
    id: keyRecord.id,
    name: keyRecord.name,
  }
}

/**
 * Create a new API key in the database
 */
export async function createApiKey(name: string): Promise<{
  key: string
  id: string
  prefix: string
}> {
  const apiKey = generateApiKey()
  const prefix = extractKeyPrefix(apiKey)
  const hash = hashApiKey(apiKey)

  const record = await db.apiKey.create({
    data: {
      name,
      keyPrefix: prefix,
      hashedKey: hash,
      isActive: true,
    },
  })

  return {
    key: apiKey,
    id: record.id,
    prefix,
  }
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  await db.apiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  })
}

/**
 * List all API keys (without revealing actual keys)
 */
export async function listApiKeys(): Promise<
  Array<{
    id: string
    name: string
    prefix: string
    isActive: boolean
    createdAt: Date
  }>
> {
  const keys = await db.apiKey.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.keyPrefix,
    isActive: k.isActive,
    createdAt: k.createdAt,
  }))
}
