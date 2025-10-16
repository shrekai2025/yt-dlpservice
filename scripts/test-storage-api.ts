/**
 * Test Storage API
 *
 * Tests S3 upload functionality (requires S3 configuration)
 */

import { s3Uploader } from '~/lib/services/s3-uploader'
import { createApiKey } from '~/lib/auth/api-key'
import { db } from '~/server/db'

async function testStorageAPI() {
  console.log('🧪 Starting Storage API Test\n')

  let apiKeyId: string | undefined

  try {
    // ============================================
    // Step 1: Check S3 Configuration
    // ============================================
    console.log('📝 Step 1: Checking S3 configuration')

    const isConfigured = s3Uploader.isConfigured()

    if (!isConfigured) {
      console.log('⚠️  S3 is NOT configured')
      console.log('ℹ️  To enable S3 storage, set the following environment variables:')
      console.log('   - AWS_ACCESS_KEY_ID')
      console.log('   - AWS_SECRET_ACCESS_KEY')
      console.log('   - AWS_REGION')
      console.log('   - AWS_S3_BUCKET')
      console.log('\n✅ API endpoints are available but will return 503 until configured\n')

      // Still test API key creation
      console.log('🔑 Creating test API key for REST API testing...')
      const { key, id } = await createApiKey('Test Storage API')
      apiKeyId = id

      console.log(`✅ API Key created: ${key}`)
      console.log('\nYou can test the REST API with:')
      console.log(`curl -X POST http://localhost:3000/api/external/storage/upload \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fileData": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "fileName": "test-pixel",
    "pathPrefix": "test"
  }'`)

      // Clean up
      await db.apiKey.delete({ where: { id: apiKeyId } })
      console.log('\n🧹 Cleaned up test API key')

      return
    }

    console.log('✅ S3 is configured and ready\n')

    // ============================================
    // Step 2: Create test API key
    // ============================================
    console.log('🔑 Step 2: Creating test API key')

    const { key, id, prefix } = await createApiKey('Test Storage Upload')
    apiKeyId = id

    console.log(`✅ API Key created: ${key}`)
    console.log(`   - ID: ${id}`)
    console.log(`   - Prefix: ${prefix}\n`)

    // ============================================
    // Step 3: Test buffer upload (1x1 transparent PNG)
    // ============================================
    console.log('📤 Step 3: Testing buffer upload to S3')

    // Create a 1x1 transparent PNG
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const buffer = Buffer.from(pngBase64, 'base64')

    const url1 = await s3Uploader.uploadBuffer(buffer, 'test', 'image/png', 'test-pixel')

    console.log(`✅ File uploaded successfully`)
    console.log(`   - URL: ${url1}\n`)

    // ============================================
    // Step 4: Test upload without custom filename
    // ============================================
    console.log('📤 Step 4: Testing upload without custom filename')

    const url2 = await s3Uploader.uploadBuffer(buffer, 'test', 'image/png')

    console.log(`✅ File uploaded with generated filename`)
    console.log(`   - URL: ${url2}\n`)

    // ============================================
    // Step 5: REST API Example
    // ============================================
    console.log('🌐 Step 5: REST API Usage Example')

    console.log('\nJSON Method:')
    console.log(`curl -X POST http://localhost:3000/api/external/storage/upload \\
  -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fileData": "${pngBase64}",
    "fileName": "my-image",
    "pathPrefix": "uploads",
    "contentType": "image/png"
  }'`)

    console.log('\nForm Data Method:')
    console.log(`curl -X POST http://localhost:3000/api/external/storage/upload \\
  -H "X-API-Key: ${key}" \\
  -F "file=@image.png" \\
  -F "fileName=my-image" \\
  -F "pathPrefix=uploads"`)

    console.log('\n')

    // ============================================
    // Step 6: Cleanup
    // ============================================
    console.log('🧹 Step 6: Cleaning up test data')

    await db.apiKey.delete({ where: { id: apiKeyId } })
    console.log(`✅ Deleted API Key: ${apiKeyId}\n`)

    console.log('🎉 All tests passed!')
    console.log('✨ Storage API is working correctly\n')
  } catch (error) {
    console.error('❌ Test failed:', error)

    // Cleanup on error
    if (apiKeyId) {
      try {
        await db.apiKey.delete({ where: { id: apiKeyId } })
        console.log('Cleaned up API key')
      } catch (e) {
        console.error('Cleanup error:', e)
      }
    }

    throw error
  } finally {
    await db.$disconnect()
  }
}

// Run test
testStorageAPI()
  .then(() => {
    console.log('✅ Test script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test script failed:', error)
    process.exit(1)
  })
