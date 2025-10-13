/**
 * API Key Authentication Utilities
 *
 * Handles API key validation and management
 */

import crypto from 'crypto'
import { db } from '~/server/db'

const GENERATED_KEY_PREFIX = 'genapi_'
const STORED_PREFIX_LENGTH = 6

/**
 * Hash API key using SHA256
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Extract key prefix (first 6 random characters for lookups)
 */
export function extractKeyPrefix(apiKey: string): string {
  const trimmed = apiKey.trim()

  if (
    trimmed.startsWith(GENERATED_KEY_PREFIX) &&
    trimmed.length >= GENERATED_KEY_PREFIX.length + STORED_PREFIX_LENGTH
  ) {
    return trimmed.substring(
      GENERATED_KEY_PREFIX.length,
      GENERATED_KEY_PREFIX.length + STORED_PREFIX_LENGTH
    )
  }

  return trimmed.substring(0, STORED_PREFIX_LENGTH)
}

/**
 * Extract the legacy prefix that was previously stored (the literal "genapi")
 * so old keys created before the fix continue to validate.
 */
function extractLegacyPrefix(apiKey: string): string | null {
  const trimmed = apiKey.trim()

  if (trimmed.startsWith(GENERATED_KEY_PREFIX)) {
    // Legacy implementation stored the first 6 characters of the literal prefix.
    return GENERATED_KEY_PREFIX.substring(0, STORED_PREFIX_LENGTH)
  }

  return null
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
  const prefixes = new Set<string>()
  const currentPrefix = extractKeyPrefix(apiKey)
  prefixes.add(currentPrefix)

  const legacyPrefix = extractLegacyPrefix(apiKey)
  if (legacyPrefix) {
    prefixes.add(legacyPrefix)
  }

  // Find key by possible prefixes (current + legacy)
  const keyRecords = await db.apiKey.findMany({
    where: {
      keyPrefix: {
        in: Array.from(prefixes),
      },
      isActive: true,
    },
  })

  if (!keyRecords.length) {
    return null
  }

  // Verify hash
  const hash = hashApiKey(apiKey)

  for (const keyRecord of keyRecords) {
    if (hash === keyRecord.hashedKey) {
      return {
        id: keyRecord.id,
        name: keyRecord.name,
      }
    }
  }

  return null
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
