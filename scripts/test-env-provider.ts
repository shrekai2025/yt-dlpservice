#!/usr/bin/env npx tsx
/**
 * Test script to verify provider API key loading from environment variables
 *
 * Usage:
 *   AI_PROVIDER_FLUX_PRO_API_KEY="test-key-123" npx tsx scripts/test-env-provider.ts
 */

import { createAdapter } from '../src/lib/adapters/adapter-factory'
import type { ProviderConfig } from '../src/lib/adapters/types'

// Test provider config (without API key)
const testConfig: ProviderConfig = {
  modelIdentifier: 'flux-pro',
  adapterName: 'FluxAdapter',
  apiEndpoint: 'https://api.tu-zi.com/flux/pro',
  apiFlavor: 'openai',
  encryptedAuthKey: null, // No key in DB
  uploadToS3: false,
  s3PathPrefix: null,
  modelVersion: null,
}

console.log('🧪 Testing environment variable API key loading...\n')

console.log('📋 Test Config:')
console.log(`  - Model Identifier: ${testConfig.modelIdentifier}`)
console.log(`  - Adapter Name: ${testConfig.adapterName}`)
console.log(`  - DB API Key: ${testConfig.encryptedAuthKey || '(none)'}\n`)

// Check environment variable
const envVarName = 'AI_PROVIDER_FLUX_PRO_API_KEY'
const envValue = process.env[envVarName]

console.log('🔍 Environment Variable Check:')
console.log(`  - Variable Name: ${envVarName}`)
console.log(`  - Value: ${envValue ? '✅ Set (' + envValue.substring(0, 10) + '...)' : '❌ Not set'}\n`)

// Create adapter
try {
  const adapter = createAdapter(testConfig)
  const sourceInfo = adapter.getSourceInfo()

  console.log('✅ Adapter Created Successfully!\n')
  console.log('📦 Final Configuration:')
  console.log(`  - Model Identifier: ${sourceInfo.modelIdentifier}`)
  console.log(`  - Adapter Name: ${sourceInfo.adapterName}`)
  console.log(`  - API Key Source: ${envValue ? '🌍 Environment Variable' : '💾 Database'}`)
  console.log(`  - API Key: ${sourceInfo.encryptedAuthKey ? sourceInfo.encryptedAuthKey.substring(0, 20) + '...' : '(none)'}\n`)

  if (envValue && sourceInfo.encryptedAuthKey === envValue) {
    console.log('🎉 SUCCESS: Environment variable was used!')
  } else if (!envValue && !sourceInfo.encryptedAuthKey) {
    console.log('⚠️  WARNING: No API key configured (neither env var nor DB)')
  } else if (!envValue && sourceInfo.encryptedAuthKey) {
    console.log('✅ OK: Database API key was used (no env var set)')
  } else {
    console.log('❌ FAILED: Environment variable was not applied correctly')
  }
} catch (error) {
  console.error('❌ Error creating adapter:', error)
  process.exit(1)
}

console.log('\n💡 To test with environment variable:')
console.log(`   AI_PROVIDER_FLUX_PRO_API_KEY="your-key" npx tsx scripts/test-env-provider.ts\n`)
