/**
 * Adapter Factory
 *
 * Creates adapter instances based on provider configuration
 */

import { BaseAdapter } from './base-adapter'
import type { ProviderConfig } from './types'

// Import adapters (will add as we implement them)
import { FluxAdapter } from './flux-adapter'
import { TuziOpenAIAdapter } from './tuzi-openai-adapter'
import { KlingAdapter } from './kling-adapter'
import { PolloAdapter } from './pollo-adapter'
import { PolloKlingAdapter } from './pollo-kling-adapter'
import { ReplicateAdapter } from './replicate-adapter'

/**
 * Adapter registry mapping adapter names to their classes
 */
const ADAPTER_REGISTRY: Record<string, new (config: ProviderConfig) => BaseAdapter> = {
  FluxAdapter,
  TuziOpenAIAdapter,
  KlingAdapter,
  PolloAdapter,
  PolloKlingAdapter,
  ReplicateAdapter,
  // GoogleSTTAdapter,
  // DoubaoSmallSTTAdapter,
}

/**
 * Get API key from environment variable for a given model identifier
 * Environment variable format: AI_PROVIDER_{MODEL_IDENTIFIER}_API_KEY
 * Example: AI_PROVIDER_FLUX_PRO_API_KEY for modelIdentifier "flux-pro"
 */
function getApiKeyFromEnv(modelIdentifier: string): string | null {
  // Convert modelIdentifier to env var format: flux-pro → FLUX_PRO
  const envVarSuffix = modelIdentifier.toUpperCase().replace(/-/g, '_')
  const envVarName = `AI_PROVIDER_${envVarSuffix}_API_KEY`

  const apiKey = process.env[envVarName]
  return apiKey && apiKey.trim() !== '' ? apiKey : null
}

/**
 * Merges provider config with environment variables
 * Priority: Database config > Environment variables (env as fallback)
 */
function mergeConfigWithEnv(config: ProviderConfig): ProviderConfig {
  // If database has a valid API key, use it
  if (config.encryptedAuthKey && config.encryptedAuthKey.trim() !== '') {
    return config
  }

  // Otherwise, try to get from environment variable as fallback
  const envApiKey = getApiKeyFromEnv(config.modelIdentifier)

  if (envApiKey) {
    return {
      ...config,
      encryptedAuthKey: envApiKey,
    }
  }

  return config
}

/**
 * Creates an adapter instance based on the provider configuration
 */
export function createAdapter(config: ProviderConfig): BaseAdapter {
  const AdapterClass = ADAPTER_REGISTRY[config.adapterName]

  if (!AdapterClass) {
    throw new Error(
      `Unknown adapter: ${config.adapterName}. Available adapters: ${Object.keys(
        ADAPTER_REGISTRY
      ).join(', ')}`
    )
  }

  // Merge environment variables with config (database key takes priority, env as fallback)
  const finalConfig = mergeConfigWithEnv(config)

  return new AdapterClass(finalConfig)
}

/**
 * Get list of available adapter names
 */
export function getAvailableAdapters(): string[] {
  return Object.keys(ADAPTER_REGISTRY)
}

/**
 * Check if an adapter is available
 */
export function isAdapterAvailable(adapterName: string): boolean {
  return adapterName in ADAPTER_REGISTRY
}
