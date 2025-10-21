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

  // Kie Veo 3.1 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-veo3-1' },
    update: {},
    create: {
      name: 'Veo 3.1',
      slug: 'kie-veo3-1',
      description: 'Google Veo 3.1 最新视频生成（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieVeo31Adapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['latest', '1080p', 'translation', 'multi-mode']),
      functionTags: JSON.stringify(['text-to-video', 'image-to-video', 'first-last-frame', 'reference']),
      pricingInfo: 'Quality: 250 Credits ($1.25) | Fast: 60 Credits ($0.30) | 1080P: +5 Credits ($0.025)',
      isActive: true, // 默认启用
      sortOrder: 14,
    },
  })

  // Kie Veo 3.1 Extend 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-veo3-1-extend' },
    update: {},
    create: {
      name: 'Veo 3.1 Extend',
      slug: 'kie-veo3-1-extend',
      description: 'Google Veo 3.1 视频扩展（基于已生成视频）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieVeo31ExtendAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'video-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['extend', 'video-continuation', 'latest']),
      functionTags: JSON.stringify(['video-extend', 'video-continuation']),
      pricingInfo: '60 Credits ($0.30) 每次扩展',
      isActive: true, // 默认启用
      sortOrder: 15,
    },
  })

  // Kie Sora Watermark Remover 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-sora-watermark-remover' },
    update: {},
    create: {
      name: 'Sora Watermark Remover',
      slug: 'kie-sora-watermark-remover',
      description: 'Sora 2 视频水印移除工具（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieSoraWatermarkRemoverAdapter',
      inputCapabilities: JSON.stringify(['url-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['watermark-removal', 'video-processing', 'sora']),
      functionTags: JSON.stringify(['video-processing', 'watermark-removal']),
      pricingInfo: '10 Credits ($0.05)',
      isActive: true, // 默认启用
      sortOrder: 14,
    },
  })

  // Kie Kling v2-1 Master Image to Video 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-kling-v2-1-master-image-to-video' },
    update: {},
    create: {
      name: 'Kling v2.1 Master Image to Video',
      slug: 'kie-kling-v2-1-master-image-to-video',
      description: 'Kling v2.1 Master 图生视频（支持首帧/尾帧输入）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieKlingV2MasterImageToVideoAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input', 'multi-image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality', 'image-to-video', 'first-last-frame', 'master']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '5秒: 160 Credits ($0.80) | 10秒: 320 Credits ($1.60)',
      isActive: true, // 默认启用
      sortOrder: 15,
    },
  })

  // Kie Kling v2-1 Master Text to Video 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-kling-v2-1-master-text-to-video' },
    update: {},
    create: {
      name: 'Kling v2.1 Master Text to Video',
      slug: 'kie-kling-v2-1-master-text-to-video',
      description: 'Kling v2.1 Master 文生视频（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieKlingV2MasterTextToVideoAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['high-quality', 'text-to-video', 'master', 'aspect-ratio']),
      functionTags: JSON.stringify(['text-to-video']),
      pricingInfo: '5秒: 160 Credits ($0.80) | 10秒: 320 Credits ($1.60)',
      isActive: true, // 默认启用
      sortOrder: 16,
    },
  })

  // Kie Kling v2-1 Standard 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-kling-v2-1-standard' },
    update: {},
    create: {
      name: 'Kling v2.1 Standard Image to Video',
      slug: 'kie-kling-v2-1-standard',
      description: 'Kling v2.1 Standard 图生视频（标准质量，经济实惠）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieKlingV2StandardAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['standard-quality', 'image-to-video', 'economical']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '5秒: 25 Credits ($0.125) | 10秒: 50 Credits ($0.25)',
      isActive: true, // 默认启用
      sortOrder: 17,
    },
  })

  // Kie Kling v2-1 Pro 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-kling-v2-1-pro' },
    update: {},
    create: {
      name: 'Kling v2.1 Pro Image to Video',
      slug: 'kie-kling-v2-1-pro',
      description: 'Kling v2.1 Pro 图生视频（专业质量，支持首帧/尾帧输入）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieKlingV2ProAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input', 'multi-image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['pro-quality', 'image-to-video', 'first-last-frame']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '5秒: 50 Credits ($0.25) | 10秒: 100 Credits ($0.50)',
      isActive: true, // 默认启用
      sortOrder: 18,
    },
  })

  // Kie Kling v2.5 Turbo Pro 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-kling-v2-5-turbo-pro' },
    update: {},
    create: {
      name: 'Kling v2.5 Turbo Pro Image to Video',
      slug: 'kie-kling-v2-5-turbo-pro',
      description: 'Kling v2.5 Turbo Pro 图生视频（快速生成，专业质量）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieKlingV25TurboProAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['turbo', 'pro-quality', 'image-to-video', 'fast-generation']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '5秒: 42 Credits ($0.21) | 10秒: 84 Credits ($0.42)',
      isActive: true, // 默认启用
      sortOrder: 19,
    },
  })

  // Kie Kling v2.5 Turbo Text to Video Pro 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-kling-v2-5-turbo-text-to-video-pro' },
    update: {},
    create: {
      name: 'Kling v2.5 Turbo Pro Text to Video',
      slug: 'kie-kling-v2-5-turbo-text-to-video-pro',
      description: 'Kling v2.5 Turbo Pro 文生视频（快速生成，专业质量，支持宽高比）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieKlingV25TurboTextToVideoProAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['turbo', 'pro-quality', 'text-to-video', 'fast-generation', 'aspect-ratio']),
      functionTags: JSON.stringify(['text-to-video']),
      pricingInfo: '5秒: 42 Credits ($0.21) | 10秒: 84 Credits ($0.42)',
      isActive: true, // 默认启用
      sortOrder: 20,
    },
  })

  // Kie Wan 2.2 A14B Text to Video Turbo 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-wan-2-2-a14b-text-to-video-turbo' },
    update: {},
    create: {
      name: 'Wan 2.2 A14B Turbo Text to Video',
      slug: 'kie-wan-2-2-a14b-text-to-video-turbo',
      description: 'Wan 2.2 A14B Turbo 文生视频（快速生成，多分辨率支持）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieWan22A14bTextToVideoTurboAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['turbo', 'text-to-video', 'fast-generation', 'multi-resolution', 'aspect-ratio', 'prompt-expansion']),
      functionTags: JSON.stringify(['text-to-video']),
      pricingInfo: '720p: 12 Credits ($0.06) | 580p: 9 Credits ($0.045) | 480p: 6 Credits ($0.03)',
      isActive: true, // 默认启用
      sortOrder: 21,
    },
  })

  // Kie Wan 2.2 A14B Image to Video Turbo 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-wan-2-2-a14b-image-to-video-turbo' },
    update: {},
    create: {
      name: 'Wan 2.2 A14B Turbo Image to Video',
      slug: 'kie-wan-2-2-a14b-image-to-video-turbo',
      description: 'Wan 2.2 A14B Turbo 图生视频（快速生成，多分辨率支持）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieWan22A14bImageToVideoTurboAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['turbo', 'image-to-video', 'fast-generation', 'multi-resolution', 'auto-aspect-ratio', 'prompt-expansion']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '720p: 12 Credits ($0.06) | 580p: 9 Credits ($0.045) | 480p: 6 Credits ($0.03)',
      isActive: true, // 默认启用
      sortOrder: 22,
    },
  })

  // Kie Wan 2.5 Text to Video 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-wan-2-5-text-to-video' },
    update: {},
    create: {
      name: 'Wan 2.5 Text to Video',
      slug: 'kie-wan-2-5-text-to-video',
      description: 'Wan 2.5 文生视频（支持720p/1080p，按秒计费）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieWan25TextToVideoAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['text-to-video', '1080p', 'aspect-ratio', 'prompt-expansion', 'negative-prompt', 'per-second-pricing']),
      functionTags: JSON.stringify(['text-to-video']),
      pricingInfo: '720p: 12 Credits/秒 ($0.06/秒) | 1080p: 20 Credits/秒 ($0.10/秒)',
      isActive: true, // 默认启用
      sortOrder: 23,
    },
  })

  // Kie Wan 2.5 Image to Video 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-wan-2-5-image-to-video' },
    update: {},
    create: {
      name: 'Wan 2.5 Image to Video',
      slug: 'kie-wan-2-5-image-to-video',
      description: 'Wan 2.5 图生视频（支持720p/1080p，按秒计费，5秒/10秒）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieWan25ImageToVideoAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['image-to-video', '1080p', 'prompt-expansion', 'negative-prompt', 'per-second-pricing', 'duration-control']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '720p: 12 Credits/秒 ($0.06/秒) | 1080p: 20 Credits/秒 ($0.10/秒)',
      isActive: true, // 默认启用
      sortOrder: 24,
    },
  })

  // Kie ByteDance V1 Pro Text to Video 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-bytedance-v1-pro-text-to-video' },
    update: {},
    create: {
      name: 'ByteDance Seedance V1 Pro Text to Video',
      slug: 'kie-bytedance-v1-pro-text-to-video',
      description: 'ByteDance Seedance V1 Pro 文生视频（支持多宽高比，480p/720p/1080p）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieByteDanceV1ProTextToVideoAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['text-to-video', '1080p', 'multi-aspect-ratio', 'camera-control', 'safety-checker', 'long-prompt']),
      functionTags: JSON.stringify(['text-to-video']),
      pricingInfo: '480p: 2.8 Credits/秒 ($0.014/秒) | 720p: 6 Credits/秒 ($0.03/秒) | 1080p: 14 Credits/秒 ($0.07/秒)',
      isActive: true, // 默认启用
      sortOrder: 25,
    },
  })

  // Kie ByteDance V1 Pro Image to Video 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-bytedance-v1-pro-image-to-video' },
    update: {},
    create: {
      name: 'ByteDance Seedance V1 Pro Image to Video',
      slug: 'kie-bytedance-v1-pro-image-to-video',
      description: 'ByteDance Seedance V1 Pro 图生视频（支持480p/720p/1080p）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieByteDanceV1ProImageToVideoAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['image-to-video', '1080p', 'camera-control', 'safety-checker', 'long-prompt']),
      functionTags: JSON.stringify(['image-to-video']),
      pricingInfo: '480p: 2.8 Credits/秒 ($0.014/秒) | 720p: 6 Credits/秒 ($0.03/秒) | 1080p: 14 Credits/秒 ($0.07/秒)',
      isActive: true, // 默认启用
      sortOrder: 26,
    },
  })

  // Kie Runway 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-runway' },
    update: {},
    create: {
      name: 'Runway',
      slug: 'kie-runway',
      description: 'Runway 视频生成（支持文生视频和图生视频，720p/1080p）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieRunwayAdapter',
      inputCapabilities: JSON.stringify(['text-input', 'image-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['text-to-video', 'image-to-video', '1080p', 'watermark', 'aspect-ratio']),
      functionTags: JSON.stringify(['text-to-video', 'image-to-video']),
      pricingInfo: '5秒720p: 12 Credits ($0.06) | 5秒1080p: 30 Credits ($0.15) | 10秒720p: 30 Credits ($0.15)',
      isActive: true, // 默认启用
      sortOrder: 27,
    },
  })

  // Kie Runway Extend 模型
  await prisma.aIModel.upsert({
    where: { slug: 'kie-runway-extend' },
    update: {},
    create: {
      name: 'Runway Extend',
      slug: 'kie-runway-extend',
      description: 'Runway 视频扩展（基于已有视频继续生成，固定5秒扩展）（通过Kie.ai）',
      providerId: kieProvider.id,
      outputType: 'VIDEO',
      adapterName: 'KieRunwayExtendAdapter',
      inputCapabilities: JSON.stringify(['text-input']),
      outputCapabilities: JSON.stringify(['video-output']),
      featureTags: JSON.stringify(['video-extend', '1080p', 'watermark', 'task-based']),
      functionTags: JSON.stringify(['video-extend']),
      pricingInfo: '720p: 12 Credits/5秒 ($0.06) | 1080p: 30 Credits/5秒 ($0.15)',
      isActive: true, // 默认启用
      sortOrder: 28,
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
