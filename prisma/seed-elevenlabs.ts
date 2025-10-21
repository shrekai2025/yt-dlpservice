/**
 * Prisma Seed Script - ElevenLabs TTS
 *
 * 初始化 ElevenLabs Text-to-Speech 服务的平台、供应商和模型数据
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding ElevenLabs TTS data...')

  // ==================== 平台 ====================
  console.log('Creating ElevenLabs platform...')

  const elevenlabsPlatform = await prisma.aIPlatform.upsert({
    where: { slug: 'elevenlabs' },
    update: {},
    create: {
      name: 'ElevenLabs',
      slug: 'elevenlabs',
      description: 'Professional AI voice generation and text-to-speech platform',
      website: 'https://elevenlabs.io',
    },
  })

  console.log('✓ ElevenLabs platform created')

  // ==================== 供应商 ====================
  console.log('Creating ElevenLabs TTS provider...')

  const elevenlabsProvider = await prisma.aIProvider.upsert({
    where: { slug: 'elevenlabs-tts' },
    update: {},
    create: {
      name: 'ElevenLabs TTS',
      slug: 'elevenlabs-tts',
      description: 'ElevenLabs Text-to-Speech API',
      platformId: elevenlabsPlatform.id,
      apiEndpoint: 'https://api.elevenlabs.io',
      uploadToS3: false, // 本地存储
      isActive: true,
      sortOrder: 100,
    },
  })

  console.log('✓ ElevenLabs TTS provider created')

  // ==================== 模型 ====================
  console.log('Creating ElevenLabs models...')

  // Eleven v3 (Alpha)
  await prisma.aIModel.upsert({
    where: { slug: 'elevenlabs-tts-v3' },
    update: {},
    create: {
      name: 'ElevenLabs - Eleven v3 (Alpha)',
      slug: 'elevenlabs-tts-v3',
      description:
        '最先进的情感表达式语音合成模型，支持 70+ 语言。具有丰富的情感表现力和上下文理解能力。',
      providerId: elevenlabsProvider.id,
      outputType: 'AUDIO',
      adapterName: 'ElevenLabsTTSAdapter',
      inputCapabilities: JSON.stringify({
        text: true,
        maxCharacters: 3000,
        supportedLanguages: [
          'en', 'zh', 'ja', 'es', 'fr', 'de', 'ko', 'pt', 'it', 'ru',
          'ar', 'hi', 'nl', 'tr', 'pl', 'sv', 'da', 'fi', 'no', 'cs',
          // ... 70+ 语言
        ],
      }),
      outputCapabilities: JSON.stringify({
        format: 'mp3',
        sampleRate: '44100',
        bitrate: '128',
      }),
      featureTags: JSON.stringify([
        'TTS',
        'TEXT_TO_SPEECH',
        'MULTILINGUAL',
        'EMOTIONAL',
        'HIGH_QUALITY',
        'ALPHA',
      ]),
      functionTags: JSON.stringify([
        '语音合成',
        '文本转语音',
        '多语言',
        '情感表达',
      ]),
      pricingInfo: JSON.stringify({
        model: 'elevenlabs-tts-v3',
        pricing: 'character-based',
        notes: 'ElevenLabs 按字符计费，v3 为 alpha 版本，字符限制 3,000',
        characterLimit: 3000,
      }),
      isActive: true,
      sortOrder: 1,
    },
  })

  console.log('✓ ElevenLabs models created')

  console.log('✅ ElevenLabs TTS seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding ElevenLabs TTS data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
