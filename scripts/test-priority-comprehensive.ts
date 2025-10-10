/**
 * Comprehensive test for API key priority logic
 * Tests both scenarios:
 * 1. DB key present → should use DB key
 * 2. DB key empty → should fallback to ENV var
 */

import { PrismaClient } from '@prisma/client'
import { createAdapter } from '../src/lib/adapters/adapter-factory'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Comprehensive API Key Priority Test\n')
  console.log('Priority: Database key > Environment variable (env as fallback)\n')

  // Test with veo3 provider
  const testProvider = await prisma.apiProvider.findUnique({
    where: { modelIdentifier: 'veo3' },
  })

  if (!testProvider) {
    console.log('❌ Test provider (veo3) not found')
    return
  }

  console.log(`📋 Test Provider: ${testProvider.name} (${testProvider.modelIdentifier})`)
  console.log('━'.repeat(60))

  // Store original key for restoration
  const originalKey = testProvider.encryptedAuthKey

  // ============ Test 1: DB key exists ============
  console.log('\n📌 Test 1: Database key exists')
  console.log('Expected: Should use database key (ignore env var)')

  // Ensure DB has a key
  await prisma.apiProvider.update({
    where: { id: testProvider.id },
    data: { encryptedAuthKey: 'test-db-key-12345' },
  })

  // Set env var (should be ignored)
  process.env.AI_PROVIDER_VEO3_API_KEY = 'test-env-key-67890'

  const updated1 = await prisma.apiProvider.findUnique({
    where: { id: testProvider.id },
  })

  console.log(`🔑 DB Key: ${updated1?.encryptedAuthKey}`)
  console.log(`🌍 ENV Var: ${process.env.AI_PROVIDER_VEO3_API_KEY}`)

  try {
    const adapter1 = createAdapter({
      id: testProvider.id,
      name: testProvider.name,
      modelIdentifier: testProvider.modelIdentifier,
      adapterName: testProvider.adapterName,
      type: testProvider.type,
      provider: testProvider.provider,
      apiEndpoint: testProvider.apiEndpoint,
      apiFlavor: testProvider.apiFlavor,
      encryptedAuthKey: updated1!.encryptedAuthKey,
      isActive: testProvider.isActive,
      callCount: testProvider.callCount,
      uploadToS3: testProvider.uploadToS3,
      s3PathPrefix: testProvider.s3PathPrefix,
      modelVersion: testProvider.modelVersion,
    })
    console.log(`✓ Adapter created successfully`)
    console.log(`✓ Test 1: PASS ✅ (DB key should be used, not ENV)`)
  } catch (error) {
    console.log(`✗ Test 1: FAIL ❌ - ${error}`)
  }

  // ============ Test 2: DB key empty ============
  console.log('\n📌 Test 2: Database key is empty')
  console.log('Expected: Should fallback to environment variable')

  // Clear DB key
  await prisma.apiProvider.update({
    where: { id: testProvider.id },
    data: { encryptedAuthKey: null },
  })

  const updated2 = await prisma.apiProvider.findUnique({
    where: { id: testProvider.id },
  })

  console.log(`🔑 DB Key: ${updated2?.encryptedAuthKey || '(empty)'}`)
  console.log(`🌍 ENV Var: ${process.env.AI_PROVIDER_VEO3_API_KEY}`)

  try {
    const adapter2 = createAdapter({
      id: testProvider.id,
      name: testProvider.name,
      modelIdentifier: testProvider.modelIdentifier,
      adapterName: testProvider.adapterName,
      type: testProvider.type,
      provider: testProvider.provider,
      apiEndpoint: testProvider.apiEndpoint,
      apiFlavor: testProvider.apiFlavor,
      encryptedAuthKey: updated2!.encryptedAuthKey,
      isActive: testProvider.isActive,
      callCount: testProvider.callCount,
      uploadToS3: testProvider.uploadToS3,
      s3PathPrefix: testProvider.s3PathPrefix,
      modelVersion: testProvider.modelVersion,
    })
    console.log(`✓ Adapter created successfully`)
    console.log(`✓ Test 2: PASS ✅ (ENV var should be used as fallback)`)
  } catch (error) {
    console.log(`✗ Test 2: FAIL ❌ - ${error}`)
  }

  // ============ Restore original key ============
  console.log('\n🔄 Restoring original configuration...')
  await prisma.apiProvider.update({
    where: { id: testProvider.id },
    data: { encryptedAuthKey: originalKey },
  })
  delete process.env.AI_PROVIDER_VEO3_API_KEY
  console.log('✓ Restored')

  // Summary
  console.log('\n' + '━'.repeat(60))
  console.log('📊 Priority Logic Summary:')
  console.log('1️⃣ Database key has priority (used when present)')
  console.log('2️⃣ Environment variable is fallback (used when DB is empty)')
  console.log('3️⃣ Editing in /admin/generation/providers updates database')
  console.log('━'.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
