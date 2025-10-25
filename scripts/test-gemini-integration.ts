/**
 * Test Script for Gemini 2.5 Flash Image Integration
 *
 * This script tests:
 * 1. Database configuration
 * 2. Adapter registration
 * 3. Model parameter configuration
 *
 * Usage:
 *   npx tsx scripts/test-gemini-integration.ts
 */

import { PrismaClient } from '@prisma/client';
import { createAdapter, isAdapterAvailable } from '../src/lib/ai-generation/adapters/adapter-factory';
import { getModelParameters } from '../src/lib/ai-generation/config/model-parameters';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Gemini 2.5 Flash Image Integration\n');

  // Test 1: Check database entries
  console.log('1️⃣ Checking database entries...');

  const platform = await prisma.aIPlatform.findUnique({
    where: { slug: 'google' },
  });
  console.log(`   Platform: ${platform ? '✅ Found - ' + platform.name : '❌ Not found'}`);

  const provider = await prisma.aIProvider.findUnique({
    where: { slug: 'gemini-official' },
    include: { platform: true },
  });
  console.log(`   Provider: ${provider ? '✅ Found - ' + provider.name : '❌ Not found'}`);
  if (provider) {
    console.log(`      - API Endpoint: ${provider.apiEndpoint}`);
    console.log(`      - Has API Key: ${provider.apiKey ? 'Yes (***' + provider.apiKey.slice(-4) + ')' : 'No - Please configure'}`);
    console.log(`      - Active: ${provider.isActive ? 'Yes' : 'No'}`);
  }

  const model = await prisma.aIModel.findUnique({
    where: { slug: 'gemini-2.5-flash-image' },
    include: { provider: true },
  });
  console.log(`   Model: ${model ? '✅ Found - ' + model.name : '❌ Not found'}`);
  if (model) {
    console.log(`      - Adapter Name: ${model.adapterName}`);
    console.log(`      - Output Type: ${model.outputType}`);
    console.log(`      - Input Capabilities: ${model.inputCapabilities}`);
    console.log(`      - Active: ${model.isActive ? 'Yes' : 'No'}`);
  }
  console.log('');

  // Test 2: Check adapter registration
  console.log('2️⃣ Checking adapter registration...');
  const adapterName = 'GeminiFlashImageAdapter';
  const isRegistered = isAdapterAvailable(adapterName);
  console.log(`   Adapter "${adapterName}": ${isRegistered ? '✅ Registered' : '❌ Not registered'}`);
  console.log('');

  // Test 3: Check model parameters
  console.log('3️⃣ Checking model parameters configuration...');
  const modelSlug = 'gemini-2.5-flash-image';
  const parameters = getModelParameters(modelSlug);
  console.log(`   Parameters for "${modelSlug}": ${parameters.length > 0 ? '✅ Found (' + parameters.length + ' fields)' : '❌ Not found'}`);
  if (parameters.length > 0) {
    parameters.forEach(param => {
      console.log(`      - ${param.label} (${param.key}): ${param.type}`);
    });
  }
  console.log('');

  // Test 4: Try to create adapter instance (without calling API)
  console.log('4️⃣ Testing adapter instantiation...');
  if (model && provider) {
    try {
      const adapterConfig = {
        id: model.id,
        slug: model.slug,
        name: model.name,
        provider: {
          id: provider.id,
          slug: provider.slug,
          name: provider.name,
          apiKey: provider.apiKey || undefined,
          apiKeyId: provider.apiKeyId || undefined,
          apiKeySecret: provider.apiKeySecret || undefined,
          apiEndpoint: provider.apiEndpoint || undefined,
        },
        outputType: model.outputType as 'IMAGE' | 'VIDEO' | 'AUDIO',
        adapterName: model.adapterName,
      };

      const adapter = createAdapter(adapterConfig);
      console.log(`   Adapter instance: ✅ Created successfully`);
      console.log(`      - Class name: ${adapter.constructor.name}`);
    } catch (error) {
      console.log(`   Adapter instance: ❌ Failed to create`);
      console.error(`      - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    console.log('   ⚠️  Skipped - Model or Provider not found in database');
  }
  console.log('');

  // Summary
  console.log('📊 Test Summary:');
  const allGood = platform && provider && model && isRegistered && parameters.length > 0;
  if (allGood) {
    console.log('   ✅ All checks passed!');
    console.log('');
    console.log('🎉 Gemini 2.5 Flash Image is ready to use!');
    console.log('');
    console.log('Next steps:');
    console.log('   1. Make sure API key is configured (if not already)');
    console.log('   2. Start the dev server: npm run dev');
    console.log('   3. Test in admin panel: http://localhost:3000/admin/ai-generation');
    console.log('   4. Test in studio: Create a shot and generate frames');
  } else {
    console.log('   ❌ Some checks failed. Please review the output above.');
  }
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Test failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
