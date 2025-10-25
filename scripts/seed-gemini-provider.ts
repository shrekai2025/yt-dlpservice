/**
 * Database Seed Script for Google Gemini Provider
 *
 * This script creates:
 * 1. Google platform (if not exists)
 * 2. Gemini Official provider
 * 3. Gemini 2.5 Flash Image model
 *
 * Usage:
 *   npx tsx scripts/seed-gemini-provider.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Gemini provider seed...\n');

  // 1. Create or get Google platform
  console.log('1️⃣ Creating Google platform...');
  const googlePlatform = await prisma.aIPlatform.upsert({
    where: { slug: 'google' },
    update: {},
    create: {
      id: 'plat_google',
      name: 'Google',
      slug: 'google',
    },
  });
  console.log(`✅ Platform: ${googlePlatform.name} (${googlePlatform.id})\n`);

  // 2. Create Gemini Official provider
  console.log('2️⃣ Creating Gemini Official provider...');
  const geminiProvider = await prisma.aIProvider.upsert({
    where: { slug: 'gemini-official' },
    update: {
      name: 'Gemini Official',
      platformId: googlePlatform.id,
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      isActive: true,
      sortOrder: 0,
    },
    create: {
      id: 'prov_gemini_official',
      name: 'Gemini Official',
      slug: 'gemini-official',
      platformId: googlePlatform.id,
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      apiKey: process.env.AI_PROVIDER_GEMINI_OFFICIAL_API_KEY || '',
      uploadToS3: false,
      isActive: true,
      sortOrder: 0,
    },
  });
  console.log(`✅ Provider: ${geminiProvider.name} (${geminiProvider.id})`);
  console.log(`   API Endpoint: ${geminiProvider.apiEndpoint}`);
  console.log(`   API Key: ${geminiProvider.apiKey ? '***' + geminiProvider.apiKey.slice(-4) : '[NOT SET - Please configure in admin panel]'}\n`);

  // 3. Create Gemini 2.5 Flash Image model
  console.log('3️⃣ Creating Gemini 2.5 Flash Image model...');
  const geminiModel = await prisma.aIModel.upsert({
    where: { slug: 'gemini-2.5-flash-image' },
    update: {
      name: 'Gemini 2.5 Flash (Image)',
      providerId: geminiProvider.id,
      outputType: 'IMAGE',
      adapterName: 'GeminiFlashImageAdapter',
      inputCapabilities: JSON.stringify(['image-input']),
      outputCapabilities: JSON.stringify(['IMAGE']),
      featureTags: JSON.stringify([
        'text-to-image',
        'image-to-image',
        'image-editing',
        'multi-image-composition',
        'style-transfer',
        'high-fidelity-text',
        'fast',
        'official',
      ]),
      isActive: true,
      sortOrder: 0,
    },
    create: {
      id: 'mdl_gemini_2_5_flash_image',
      name: 'Gemini 2.5 Flash (Image)',
      slug: 'gemini-2.5-flash-image',
      providerId: geminiProvider.id,
      outputType: 'IMAGE',
      adapterName: 'GeminiFlashImageAdapter',
      inputCapabilities: JSON.stringify(['image-input']),
      outputCapabilities: JSON.stringify(['IMAGE']),
      featureTags: JSON.stringify([
        'text-to-image',
        'image-to-image',
        'image-editing',
        'multi-image-composition',
        'style-transfer',
        'high-fidelity-text',
        'fast',
        'official',
      ]),
      isActive: true,
      sortOrder: 0,
    },
  });
  console.log(`✅ Model: ${geminiModel.name} (${geminiModel.id})`);
  console.log(`   Adapter: ${geminiModel.adapterName}`);
  console.log(`   Output Type: ${geminiModel.outputType}`);
  console.log(`   Input Capabilities: ${geminiModel.inputCapabilities}`);
  console.log(`   Output Capabilities: ${geminiModel.outputCapabilities}`);
  console.log(`   Feature Tags: ${geminiModel.featureTags}\n`);

  // 4. Summary
  console.log('✨ Seed completed successfully!\n');
  console.log('📋 Summary:');
  console.log(`   Platform: ${googlePlatform.name}`);
  console.log(`   Provider: ${geminiProvider.name}`);
  console.log(`   Model: ${geminiModel.name}`);
  console.log('');
  console.log('⚙️  Next Steps:');
  console.log('   1. Configure API key in admin panel: /admin/ai-generation/providers');
  console.log('   2. Or set environment variable: AI_PROVIDER_GEMINI_OFFICIAL_API_KEY');
  console.log('   3. Test generation in: /admin/ai-generation or Studio');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
