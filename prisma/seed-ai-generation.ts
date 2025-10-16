/**
 * Prisma Seed Script - AI Generation
 *
 * 初始化 AI 生成服务的平台、供应商和模型数据
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding AI Generation data...')

  // ==================== 平台 ====================
  console.log('Creating platforms...')

  const tuziPlatform = await prisma.aIPlatform.upsert({
    where: { slug: 'tuzi' },
    update: {},
    create: {
      name: 'TuZi',
      slug: 'tuzi',
      description: '兔子API - 第三方AI服务聚合平台',
      website: 'https://tuzi.com',
    },
  })

  const replicatePlatform = await prisma.aIPlatform.upsert({
    where: { slug: 'replicate' },
    update: {},
    create: {
      name: 'Replicate',
      slug: 'replicate',
      description: 'Run AI models with an API',
      website: 'https://replicate.com',
    },
  })

  const polloPlatform = await prisma.aIPlatform.upsert({
    where: { slug: 'pollo' },
    update: {},
    create: {
      name: 'Pollo',
      slug: 'pollo',
      description: 'Pollo AI Platform',
      website: 'https://pollo.ai',
    },
  })

  console.log('✓ Platforms created')

  // ==================== 供应商 ====================
  console.log('Creating providers...')

  // Kie.ai (官方)
  const kieProvider = await prisma.aIProvider.upsert({
    where: { slug: 'kie-ai' },
    update: {},
    create: {
      name: 'Kie.ai',
      slug: 'kie-ai',
      description: 'Kie.ai 官方 AI 服务',
      apiEndpoint: 'https://api.kie.ai',
      isActive: true,
      sortOrder: 1,
    },
  })

  // TuZi (第三方平台)
  const tuziProvider = await prisma.aIProvider.upsert({
    where: { slug: 'tuzi' },
    update: {},
    create: {
      name: 'TuZi',
      slug: 'tuzi',
      description: 'TuZi API 服务',
      platformId: tuziPlatform.id,
      apiEndpoint: 'https://api.tuzi.com',
      isActive: true,
      sortOrder: 2,
    },
  })

  // Replicate (第三方平台)
  const replicateProvider = await prisma.aIProvider.upsert({
    where: { slug: 'replicate' },
    update: {},
    create: {
      name: 'Replicate',
      slug: 'replicate',
      description: 'Replicate AI Platform',
      platformId: replicatePlatform.id,
      apiEndpoint: 'https://api.replicate.com',
      isActive: true,
      sortOrder: 3,
    },
  })

  console.log('✓ Providers created')

  // ==================== 模型 ====================
  console.log('Creating models...')

  // Kie.ai 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-4o-image' },
    update: {},
    create: {
      name: '4o Image',
      slug: 'kie-4o-image',
      description: 'GPT-4o 图像生成',
      providerId: kieProvider.id,
      outputType: 'IMAGE',
      adapterName: 'KieImageAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['high-quality', 'fast']),
      functionTags: JSON.stringify(['text-to-image', 'image-to-image']),
      pricingInfo: '1张: 6 Credits ($0.03) | 2张: 7 Credits ($0.035) | 4张: 8 Credits ($0.04)',
      isActive: true,
      sortOrder: 1,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'kie-flux-kontext' },
    update: {},
    create: {
      name: 'Flux Kontext',
      slug: 'kie-flux-kontext',
      description: 'Flux Kontext 高质量图像生成',
      providerId: kieProvider.id,
      outputType: 'IMAGE',
      adapterName: 'KieFluxKontextAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['high-quality', '4k']),
      functionTags: JSON.stringify(['text-to-image']),
      pricingInfo: 'Pro: 5 Credits ($0.025) | Max: 10 Credits ($0.05)',
      isActive: true,
      sortOrder: 2,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'kie-midjourney-image' },
    update: {},
    create: {
      name: 'Midjourney',
      slug: 'kie-midjourney-image',
      description: 'Kie.ai Midjourney 图像生成',
      providerId: kieProvider.id,
      outputType: 'IMAGE',
      adapterName: 'KieMidjourneyAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['high-quality', 'artistic']),
      functionTags: JSON.stringify(['text-to-image', 'image-to-image']),
      pricingInfo: 'Relax: 3 Credits ($0.015) | Fast: 8 Credits ($0.04) | Turbo: 16 Credits ($0.08)',
      isActive: true,
      sortOrder: 3,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'kie-midjourney-video' },
    update: {},
    create: {
      name: 'Midjourney Video',
      slug: 'kie-midjourney-video',
      description: 'Kie.ai Midjourney 视频生成',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieMidjourneyAdapter',
      inputCapabilities: JSON.stringify(['image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '标清 1视频: 15 Credits ($0.075) | HD 1视频: 45 Credits ($0.225) | 支持批量生成',
      isActive: true,
      sortOrder: 4,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'kie-nano-banana' },
    update: {},
    create: {
      name: 'Nano Banana',
      slug: 'kie-nano-banana',
      description: 'Google Nano Banana 图像生成',
      providerId: kieProvider.id,
      outputType: 'IMAGE',
      adapterName: 'KieNanoBananaAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['fast', 'flexible-ratios']),
      functionTags: JSON.stringify(['text-to-image']),
      pricingInfo: '4 Credits/张 ($0.02)',
      isActive: true,
      sortOrder: 5,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'kie-nano-banana-edit' },
    update: {},
    create: {
      name: 'Nano Banana Edit',
      slug: 'kie-nano-banana-edit',
      description: 'Google Nano Banana 图像编辑',
      providerId: kieProvider.id,
      outputType: 'IMAGE',
      adapterName: 'KieNanoBananaEditAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['fast', 'flexible-ratios', 'image-editing']),
      functionTags: JSON.stringify(['image-to-image', 'image-editing']),
      pricingInfo: '4 Credits/张 ($0.02)',
      isActive: true,
      sortOrder: 6,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'kie-nano-banana-upscale' },
    update: {},
    create: {
      name: 'Nano Banana Upscale',
      slug: 'kie-nano-banana-upscale',
      description: 'Nano Banana 图像放大 - 支持最高4倍放大和面部增强',
      providerId: kieProvider.id,
      outputType: 'IMAGE',
      adapterName: 'KieNanoBananaUpscaleAdapter',
      inputCapabilities: JSON.stringify(['image-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['upscale', 'face-enhance', 'high-quality']),
      functionTags: JSON.stringify(['image-upscale', 'image-enhancement']),
      pricingInfo: '1 Credit/张 ($0.005)',
      isActive: true,
      sortOrder: 7,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'kie-seedream-v4' },
    update: {},
    create: {
      name: 'Seedream V4',
      slug: 'kie-seedream-v4',
      description: 'ByteDance Seedream V4 文生图 - 支持多种尺寸和分辨率（1K-4K）',
      providerId: kieProvider.id,
      outputType: 'IMAGE',
      adapterName: 'KieSeedreamV4Adapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['high-quality', 'flexible-ratios', '1k', '2k', '4k']),
      functionTags: JSON.stringify(['text-to-image']),
      pricingInfo: '3.5 Credits/张 ($0.018)',
      isActive: true,
      sortOrder: 8,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'kie-seedream-v4-edit' },
    update: {},
    create: {
      name: 'Seedream V4 Edit',
      slug: 'kie-seedream-v4-edit',
      description: 'ByteDance Seedream V4 图像编辑 - 支持多图输入和多种尺寸（1K-4K）',
      providerId: kieProvider.id,
      outputType: 'IMAGE',
      adapterName: 'KieSeedreamV4EditAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['high-quality', 'flexible-ratios', '1k', '2k', '4k', 'image-editing']),
      functionTags: JSON.stringify(['image-to-image', 'image-editing']),
      pricingInfo: '3.5 Credits/张 ($0.018)',
      isActive: true,
      sortOrder: 9,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'kie-qwen-image-edit' },
    update: {},
    create: {
      name: 'Qwen Image Edit',
      slug: 'kie-qwen-image-edit',
      description: 'Qwen 图像编辑 - 支持快速图像编辑和多种参数调节',
      providerId: kieProvider.id,
      outputType: 'IMAGE',
      adapterName: 'KieQwenImageEditAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['fast', 'image-editing', 'acceleration', 'safety-checker']),
      functionTags: JSON.stringify(['image-to-image', 'image-editing']),
      pricingInfo: '512x512: 1 Credit ($0.005) | 1024x1024: 3.5 Credits ($0.018) | 其他尺寸: 2-2.5 Credits',
      isActive: true,
      sortOrder: 10,
    },
  })

  // TuZi 模型
  await prisma.aIModel.upsert({
    where: { slug: 'tuzi-kling' },
    update: {},
    create: {
      name: 'Kling Video',
      slug: 'tuzi-kling',
      description: 'TuZi Kling 视频生成',
      providerId: tuziProvider.id,
      outputType: 'VIDEO',
      adapterName: 'TuziKlingAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['fast', 'hd']),
      functionTags: JSON.stringify(['text-to-video', 'image-to-video']),
      isActive: true,
      sortOrder: 1,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'tuzi-midjourney' },
    update: {},
    create: {
      name: 'Midjourney',
      slug: 'tuzi-midjourney',
      description: 'TuZi Midjourney 图像生成',
      providerId: tuziProvider.id,
      outputType: 'IMAGE',
      adapterName: 'TuziMidjourneyAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['high-quality', 'artistic']),
      functionTags: JSON.stringify(['text-to-image']),
      isActive: true,
      sortOrder: 2,
    },
  })

  // OpenAI 模型
  const openaiProvider = await prisma.aIProvider.upsert({
    where: { slug: 'openai' },
    update: {},
    create: {
      name: 'OpenAI',
      slug: 'openai',
      description: 'OpenAI Official API',
      apiEndpoint: 'https://api.openai.com',
      isActive: true,
      sortOrder: 4,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'openai-dalle-3' },
    update: {},
    create: {
      name: 'DALL-E 3',
      slug: 'openai-dalle-3',
      description: 'OpenAI DALL-E 3 高质量图像生成',
      providerId: openaiProvider.id,
      outputType: 'IMAGE',
      adapterName: 'OpenAIDalleAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['high-quality', 'hd', 'creative']),
      functionTags: JSON.stringify(['text-to-image']),
      isActive: true,
      sortOrder: 1,
    },
  })

  // Pollo 平台和供应商
  const polloProvider = await prisma.aIProvider.upsert({
    where: { slug: 'pollo' },
    update: {},
    create: {
      name: 'Pollo AI',
      slug: 'pollo',
      description: 'Pollo AI Platform',
      platformId: polloPlatform.id,
      apiEndpoint: 'https://pollo.ai/api/platform/generation',
      isActive: true,
      sortOrder: 5,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'pollo-veo3' },
    update: {},
    create: {
      name: 'Veo 3',
      slug: 'pollo-veo3',
      description: 'Google Veo 3 视频生成（通过Pollo）',
      providerId: polloProvider.id,
      outputType: 'VIDEO',
      adapterName: 'PolloVeo3Adapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality', 'hd', 'with-audio']),
      functionTags: JSON.stringify(['text-to-video', 'image-to-video']),
      isActive: true,
      sortOrder: 1,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'pollo-kling' },
    update: {},
    create: {
      name: 'Kling 1.5',
      slug: 'pollo-kling',
      description: 'Kling 1.5 图生视频（通过Pollo）',
      providerId: polloProvider.id,
      outputType: 'VIDEO',
      adapterName: 'PolloKlingAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['fast', 'hd']),
      functionTags: JSON.stringify(['image-to-video']),
      isActive: true,
      sortOrder: 2,
    },
  })

  // Kie Sora 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-sora' },
    update: {},
    create: {
      name: 'Sora',
      slug: 'kie-sora',
      description: 'OpenAI Sora 视频生成（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieSoraAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality', '4k', 'long-duration']),
      functionTags: JSON.stringify(['text-to-video', 'image-to-video']),
      isActive: false, // 默认禁用，等API可用后启用
      sortOrder: 7,
    },
  })

  // Kie Sora 2 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-sora2' },
    update: {},
    create: {
      name: 'Sora 2',
      slug: 'kie-sora2',
      description: 'OpenAI Sora 2 文生视频（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieSora2Adapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality', 'latest', 'no-watermark']),
      functionTags: JSON.stringify(['text-to-video']),
      pricingInfo: '30 Credits/10秒 ($0.15)',
      isActive: true, // 默认启用
      sortOrder: 8,
    },
  })

  // Kie Sora 2 Image to Video 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-sora2-image-to-video' },
    update: {},
    create: {
      name: 'Sora 2 Image to Video',
      slug: 'kie-sora2-image-to-video',
      description: 'OpenAI Sora 2 图生视频（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieSora2ImageToVideoAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality', 'latest', 'no-watermark', 'image-to-video']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '30 Credits/10秒 ($0.15)',
      isActive: true, // 默认启用
      sortOrder: 9,
    },
  })

  // Kie Sora 2 Pro 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-sora2-pro' },
    update: {},
    create: {
      name: 'Sora 2 Pro',
      slug: 'kie-sora2-pro',
      description: 'OpenAI Sora 2 Pro 高质量文生视频（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieSora2ProAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality', 'latest', 'no-watermark', 'pro', 'long-duration']),
      functionTags: JSON.stringify(['text-to-video']),
      pricingInfo: '标准: 90 Credits/10秒 ($0.45) | 高清: 200 Credits/10秒 ($1.00) | 15秒可选',
      isActive: true, // 默认启用
      sortOrder: 10,
    },
  })

  // Kie Sora 2 Pro Image to Video 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-sora2-pro-image-to-video' },
    update: {},
    create: {
      name: 'Sora 2 Pro Image to Video',
      slug: 'kie-sora2-pro-image-to-video',
      description: 'OpenAI Sora 2 Pro 高质量图生视频（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieSora2ProImageToVideoAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality', 'latest', 'no-watermark', 'pro', 'image-to-video', 'long-duration']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '标准: 90 Credits/10秒 ($0.45) | 高清: 200 Credits/10秒 ($1.00) | 15秒可选',
      isActive: true, // 默认启用
      sortOrder: 11,
    },
  })

  // Kie Veo 3 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-veo3' },
    update: {},
    create: {
      name: 'Veo 3',
      slug: 'kie-veo3',
      description: 'Google Veo 3 高质量视频生成（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieVeo3Adapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality', '1080p', 'fallback', 'translation']),
      functionTags: JSON.stringify(['text-to-video', 'image-to-video']),
      pricingInfo: '250 Credits ($1.25)',
      isActive: true, // 默认启用
      sortOrder: 12,
    },
  })

  // Kie Veo 3 Fast 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-veo3-fast' },
    update: {},
    create: {
      name: 'Veo 3 Fast',
      slug: 'kie-veo3-fast',
      description: 'Google Veo 3 Fast 快速视频生成（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieVeo3Adapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['fast', '1080p', 'fallback', 'translation']),
      functionTags: JSON.stringify(['text-to-video', 'image-to-video']),
      pricingInfo: '100 Credits ($0.50)',
      isActive: true, // 默认启用
      sortOrder: 13,
    },
  })

  // Replicate 模型
  await prisma.aIModel.upsert({
    where: { slug: 'replicate-flux-pro' },
    update: {},
    create: {
      name: 'Flux Pro',
      slug: 'replicate-flux-pro',
      description: 'Replicate Flux Pro 图像生成',
      providerId: replicateProvider.id,
      outputType: 'IMAGE',
      adapterName: 'ReplicateFluxAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['image-output']),
      featureTags: JSON.stringify(['high-quality', '4k']),
      functionTags: JSON.stringify(['text-to-image', 'image-to-image']),
      isActive: true,
      sortOrder: 1,
    },
  })

  await prisma.aIModel.upsert({
    where: { slug: 'replicate-minimax' },
    update: {},
    create: {
      name: 'Minimax Video',
      slug: 'replicate-minimax',
      description: 'Replicate Minimax 视频生成',
      providerId: replicateProvider.id,
      outputType: 'VIDEO',
      adapterName: 'ReplicateMinimaxAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['hd']),
      functionTags: JSON.stringify(['text-to-video']),
      isActive: true,
      sortOrder: 2,
    },
  })

  console.log('✓ Models created')

  console.log('✅ Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
