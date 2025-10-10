/**
 * Migrate providers from genapihub database to new generation system
 *
 * Run with: npx tsx scripts/migrate-genapihub-providers.ts
 */

import { db } from '~/server/db'
import { execSync } from 'child_process'

interface GenAPIHubProvider {
  id: number
  name: string
  model_identifier: string
  adapter_name: string
  type: 'image' | 'video'
  provider: string | null
  api_endpoint: string
  api_flavor: string
  encrypted_auth_key: string | null
  is_active: boolean
  call_count: number
  upload_to_s3: boolean
  s3_path_prefix: string | null
  model_version: string | null
}

const GENAPIHUB_DB_PATH = './genapihub-main/genapihub.db'

async function migrateProviders() {
  console.log('🔄 Starting provider migration from genapihub...')

  // 1. Query genapihub database using sqlite3 command
  const query = `SELECT id, name, model_identifier, adapter_name, type, provider, api_endpoint, api_flavor, encrypted_auth_key, is_active, call_count, upload_to_s3, s3_path_prefix, model_version FROM api_sources ORDER BY id;`

  const result = execSync(`sqlite3 ${GENAPIHUB_DB_PATH} "${query}"`, { encoding: 'utf-8' })
  const lines = result.trim().split('\n')

  // 2. Parse providers
  const providers: GenAPIHubProvider[] = lines.map(line => {
    const parts = line.split('|')
    return {
      id: parseInt(parts[0] || '0'),
      name: parts[1] || '',
      model_identifier: parts[2] || '',
      adapter_name: parts[3] || '',
      type: (parts[4] || 'image') as 'image' | 'video',
      provider: parts[5] || null,
      api_endpoint: parts[6] || '',
      api_flavor: parts[7] || '',
      encrypted_auth_key: parts[8] || null,
      is_active: parts[9] === '1',
      call_count: parseInt(parts[10] || '0'),
      upload_to_s3: parts[11] === '1',
      s3_path_prefix: parts[12] || null,
      model_version: parts[13] || null,
    }
  })

  console.log(`📊 Found ${providers.length} providers in genapihub database`)

  try {
    // 3. Migrate each provider
    let migratedCount = 0
    let skippedCount = 0

    for (const provider of providers) {
      console.log(`\n📦 Processing: ${provider.name} (${provider.model_identifier})`)

      // Check if already exists
      const existing = await db.apiProvider.findUnique({
        where: { modelIdentifier: provider.model_identifier }
      })

      if (existing) {
        console.log(`   ⏭️  Already exists, skipping...`)
        skippedCount++
        continue
      }

      // Create new provider
      await db.apiProvider.create({
        data: {
          name: provider.name,
          modelIdentifier: provider.model_identifier,
          adapterName: provider.adapter_name,
          type: provider.type,
          provider: provider.provider || provider.adapter_name,
          apiEndpoint: provider.api_endpoint,
          apiFlavor: provider.api_flavor,
          encryptedAuthKey: provider.encrypted_auth_key,
          isActive: provider.is_active,
          callCount: provider.call_count,
          uploadToS3: provider.upload_to_s3,
          s3PathPrefix: provider.s3_path_prefix,
          modelVersion: provider.model_version,
        }
      })

      console.log(`   ✅ Migrated successfully`)
      migratedCount++
    }

    console.log(`\n\n✅ Migration completed!`)
    console.log(`   📊 Total providers: ${providers.length}`)
    console.log(`   ✅ Migrated: ${migratedCount}`)
    console.log(`   ⏭️  Skipped (already exist): ${skippedCount}`)

    // 4. Display migrated providers
    console.log(`\n📋 Current providers in new database:`)
    const allProviders = await db.apiProvider.findMany({
      orderBy: { id: 'asc' }
    })

    for (const p of allProviders) {
      console.log(`   ${p.id}. ${p.name} | ${p.modelIdentifier} | ${p.type} | ${p.provider} | ${p.isActive ? '✓' : '✗'}`)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Provider mapping reference
console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                     GenAPIHub Provider Migration                           ║
╚════════════════════════════════════════════════════════════════════════════╝

From genapihub database:
1. Tuzi OpenAI-Style Image API      → gpt-image-1-vip    (image)
2. Flux Image API                   → flux-kontext-pro   (image)
3. Tuzi-Kling 视频生成API            → kling-video-v1    (video)
4. Replicate veo3 视频生成API        → veo3              (video)
5. Pollo veo3 视频生成API            → pollo-veo3        (video)
6. Pollo AI Kling 1.5               → pollo-kling        (video)

Note: Only basic provider metadata will be migrated.
      Adapter implementations need to be ported separately.
`)

// Run migration
migrateProviders()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error)
    process.exit(1)
  })
