import { db } from '../src/server/db';

// 工具函数：生成slug
function slugify(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function seedAllAIProviders() {
  console.log('开始填充所有AI生成供应商和模型...\n');

  const modelData = [
    // KIE - 视频模型
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-sora', name: 'Sora', adapterName: 'KieSoraAdapter', type: 'VIDEO', description: '文生视频（基于Sora模型）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-sora2', name: 'Sora 2', adapterName: 'KieSora2Adapter', type: 'VIDEO', description: '文生视频（基于Sora 2模型）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-sora2-image-to-video', name: 'Sora 2 图生视频', adapterName: 'KieSora2ImageToVideoAdapter', type: 'VIDEO', description: '图生视频（基于Sora 2模型）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-sora2-pro', name: 'Sora 2 Pro', adapterName: 'KieSora2ProAdapter', type: 'VIDEO', description: '文生视频（Sora 2 Pro，支持更多参数）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-sora2-pro-image-to-video', name: 'Sora 2 Pro 图生视频', adapterName: 'KieSora2ProImageToVideoAdapter', type: 'VIDEO', description: '图生视频（Sora 2 Pro，支持更多参数）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-sora-watermark-remover', name: 'Sora 水印移除', adapterName: 'KieSoraWatermarkRemoverAdapter', type: 'VIDEO', description: '移除 Sora 2 视频水印' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-veo3', name: 'Veo 3', adapterName: 'KieVeo3Adapter', type: 'VIDEO', description: '文生视频和图生视频（Google Veo 3模型）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-veo3-fast', name: 'Veo 3 Fast', adapterName: 'KieVeo3Adapter', type: 'VIDEO', description: '文生视频和图生视频（Google Veo 3快速版）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-veo3-1', name: 'Veo 3.1', adapterName: 'KieVeo31Adapter', type: 'VIDEO', description: '文生视频和图生视频（Google Veo 3.1模型）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-veo3-1-extend', name: 'Veo 3.1 Extend', adapterName: 'KieVeo31ExtendAdapter', type: 'VIDEO', description: '基于已生成的视频进行扩展' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-kling-v2-5-turbo-pro', name: 'Kling v2.5 Turbo Pro', adapterName: 'KieKlingV25TurboProAdapter', type: 'VIDEO', description: '图生视频（v2.5 Turbo Pro）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-kling-v2-5-turbo-text-to-video-pro', name: 'Kling v2.5 Turbo Pro 文生视频', adapterName: 'KieKlingV25TurboTextToVideoProAdapter', type: 'VIDEO', description: '文生视频（v2.5 Turbo Pro）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-kling-v2-1-master-text-to-video', name: 'Kling v2.1 Master 文生视频', adapterName: 'KieKlingV2MasterTextToVideoAdapter', type: 'VIDEO', description: '文生视频（Master版本）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-kling-v2-1-master-image-to-video', name: 'Kling v2.1 Master 图生视频', adapterName: 'KieKlingV2MasterImageToVideoAdapter', type: 'VIDEO', description: '图生视频（支持首帧/尾帧输入）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-kling-v2-1-pro', name: 'Kling v2.1 Pro', adapterName: 'KieKlingV2ProAdapter', type: 'VIDEO', description: '图生视频（Pro专业质量）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-kling-v2-1-standard', name: 'Kling v2.1 Standard', adapterName: 'KieKlingV2StandardAdapter', type: 'VIDEO', description: '图生视频（Standard标准质量）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-runway', name: 'Runway', adapterName: 'KieRunwayAdapter', type: 'VIDEO', description: '视频生成和扩展（Runway）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-runway-extend', name: 'Runway Extend', adapterName: 'KieRunwayExtendAdapter', type: 'VIDEO', description: '视频扩展（基于已有视频继续生成）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-bytedance-v1-pro-text-to-video', name: 'ByteDance V1 Pro 文生视频', adapterName: 'KieByteDanceV1ProTextToVideoAdapter', type: 'VIDEO', description: '文生视频（ByteDance Seedance V1 Pro）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-bytedance-v1-pro-image-to-video', name: 'ByteDance V1 Pro 图生视频', adapterName: 'KieByteDanceV1ProImageToVideoAdapter', type: 'VIDEO', description: '图生视频（ByteDance Seedance V1 Pro）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-wan-2-2-a14b-text-to-video-turbo', name: 'Wan 2.2 文生视频 Turbo', adapterName: 'KieWan22A14bTextToVideoTurboAdapter', type: 'VIDEO', description: '文生视频（Turbo快速生成）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-wan-2-2-a14b-image-to-video-turbo', name: 'Wan 2.2 图生视频 Turbo', adapterName: 'KieWan22A14bImageToVideoTurboAdapter', type: 'VIDEO', description: '图生视频（Turbo快速生成）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-wan-2-5-text-to-video', name: 'Wan 2.5 文生视频', adapterName: 'KieWan25TextToVideoAdapter', type: 'VIDEO', description: '文生视频（Wan 2.5，支持720p/1080p）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-wan-2-5-image-to-video', name: 'Wan 2.5 图生视频', adapterName: 'KieWan25ImageToVideoAdapter', type: 'VIDEO', description: '图生视频（Wan 2.5，支持720p/1080p）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-midjourney-video', name: 'Midjourney Video', adapterName: 'KieMidjourneyAdapter', type: 'VIDEO', description: '图生视频（Midjourney）' },

    // KIE - 图像模型
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-flux-kontext', name: 'Flux Kontext', adapterName: 'KieFluxKontextAdapter', type: 'IMAGE', description: '高质量文生图' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-4o-image', name: 'Kie 4o Image', adapterName: 'KieImageAdapter', type: 'IMAGE', description: '文生图、图生图' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-midjourney-image', name: 'Midjourney Image', adapterName: 'KieMidjourneyAdapter', type: 'IMAGE', description: '文生图、图生图（Midjourney）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-nano-banana', name: 'Nano Banana', adapterName: 'KieNanoBananaAdapter', type: 'IMAGE', description: '图像生成（Google Nano Banana）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-nano-banana-edit', name: 'Nano Banana Edit', adapterName: 'KieNanoBananaEditAdapter', type: 'IMAGE', description: '图像编辑（Google Nano Banana）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'kie-nano-banana-upscale', name: 'Nano Banana Upscale', adapterName: 'KieNanoBananaUpscaleAdapter', type: 'IMAGE', description: '图像放大（Nano Banana）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'qwen/image-edit', name: 'Qwen Image Edit', adapterName: 'KieQwenImageEditAdapter', type: 'IMAGE', description: '图像编辑（Qwen）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'bytedance/seedream-v4-text-to-image', name: 'SeeDream V4 文生图', adapterName: 'KieSeedreamV4Adapter', type: 'IMAGE', description: '文生图（ByteDance SeeDream V4）' },
    { provider: 'Kie', platform: 'Kie.ai', slug: 'kie', modelId: 'bytedance/seedream-v4-edit', name: 'SeeDream V4 Edit', adapterName: 'KieSeedreamV4EditAdapter', type: 'IMAGE', description: '图生图编辑（ByteDance SeeDream V4）' },

    // TUZI
    { provider: 'TuZi AI', platform: 'TuZi', slug: 'tuzi', modelId: 'tuzi-kling', name: 'TuZi Kling', adapterName: 'TuziKlingAdapter', type: 'VIDEO', description: '文生视频、图生视频' },
    { provider: 'TuZi AI', platform: 'TuZi', slug: 'tuzi', modelId: 'tuzi-midjourney-image', name: 'TuZi Midjourney Image', adapterName: 'TuziMidjourneyAdapter', type: 'IMAGE', description: 'Midjourney图像生成' },
    { provider: 'TuZi AI', platform: 'TuZi', slug: 'tuzi', modelId: 'tuzi-midjourney-video', name: 'TuZi Midjourney Video', adapterName: 'TuziMidjourneyAdapter', type: 'VIDEO', description: 'Midjourney视频生成' },

    // JIMENG
    { provider: '即梦AI', platform: '即梦', slug: 'jimeng', modelId: 'jimeng-4.0', name: 'Jimeng 4.0', adapterName: 'Jimeng40Adapter', type: 'IMAGE', description: '文生图、图生图、图像编辑、多图组合' },
    { provider: '即梦AI', platform: '即梦', slug: 'jimeng', modelId: 'jimeng-text-to-image-v21', name: 'Jimeng 2.1 文生图', adapterName: 'JimengTextToImageAdapter', type: 'IMAGE', description: '文生图（高质量）' },
    { provider: '即梦AI', platform: '即梦', slug: 'jimeng', modelId: 'jimeng-video-30', name: 'Jimeng Video 3.0', adapterName: 'JimengVideo30Adapter', type: 'VIDEO', description: '文生视频、图生视频，支持1080P' },

    // ELEVENLABS
    { provider: 'ElevenLabs', platform: 'ElevenLabs', slug: 'elevenlabs', modelId: 'elevenlabs-tts-v3', name: 'ElevenLabs TTS v3', adapterName: 'ElevenLabsTTSAdapter', type: 'AUDIO', description: '文本转语音（高情感表达，Eleven v3 Alpha）' },

    // OPENAI
    { provider: 'OpenAI', platform: 'OpenAI', slug: 'openai', modelId: 'openai-dalle-3', name: 'DALL-E 3', adapterName: 'OpenAIDalleAdapter', type: 'IMAGE', description: '文生图（高质量，DALL-E 3）' },

    // POLLO
    { provider: 'Pollo AI', platform: 'Pollo', slug: 'pollo', modelId: 'pollo-veo3', name: 'Pollo Veo3', adapterName: 'PolloVeo3Adapter', type: 'VIDEO', description: '文生视频、图生视频（Google Veo3）' },
    { provider: 'Pollo AI', platform: 'Pollo', slug: 'pollo', modelId: 'pollo-kling', name: 'Pollo Kling', adapterName: 'PolloKlingAdapter', type: 'VIDEO', description: '图生视频（基于kling-ai/kling-1-5）' },

    // REPLICATE
    { provider: 'Replicate', platform: 'Replicate', slug: 'replicate', modelId: 'replicate-flux-pro', name: 'Flux Pro', adapterName: 'ReplicateFluxAdapter', type: 'IMAGE', description: '高质量文生图（Flux Pro）' },
    { provider: 'Replicate', platform: 'Replicate', slug: 'replicate', modelId: 'replicate-flux-dev', name: 'Flux Dev', adapterName: 'ReplicateFluxAdapter', type: 'IMAGE', description: '高质量文生图（Flux Dev）' },
    { provider: 'Replicate', platform: 'Replicate', slug: 'replicate', modelId: 'replicate-minimax', name: 'Minimax', adapterName: 'ReplicateMinimaxAdapter', type: 'VIDEO', description: '文生视频（Minimax）' },
  ];

  // 获取所有唯一的平台
  const platforms = [...new Set(modelData.map(m => ({ name: m.platform, slug: m.slug })))];

  for (const platform of platforms) {
    await db.aIPlatform.upsert({
      where: { slug: platform.slug },
      create: {
        name: platform.name,
        slug: platform.slug,
        description: `${platform.name} AI生成平台`,
      },
      update: {
        description: `${platform.name} AI生成平台`,
      }
    });
    console.log(`✓ 平台: ${platform.name}`);
  }

  // 获取所有唯一的供应商
  const providers = [...new Set(modelData.map(m => ({
    name: m.provider,
    platformName: m.platform,
    platformSlug: m.slug,
    apiEndpoint: m.slug === 'kie' ? 'https://api.kie.ai' :
                 m.slug === 'jimeng' ? 'https://visual.volcengineapi.com' :
                 m.slug === 'elevenlabs' ? 'https://api.elevenlabs.io' :
                 m.slug === 'openai' ? 'https://api.openai.com' :
                 m.slug === 'pollo' ? 'https://pollo.ai/api/platform/generation' :
                 m.slug === 'replicate' ? 'https://api.replicate.com' :
                 ''
  })))];

  for (const provider of providers) {
    const platform = await db.aIPlatform.findUnique({ where: { slug: provider.platformSlug } });
    if (!platform) continue;

    await db.aIProvider.upsert({
      where: { slug: slugify(provider.name) },
      create: {
        name: provider.name,
        slug: slugify(provider.name),
        platformId: platform.id,
        apiEndpoint: provider.apiEndpoint,
        description: `${provider.name} AI生成服务`,
      },
      update: {
        platformId: platform.id,
        apiEndpoint: provider.apiEndpoint,
        description: `${provider.name} AI生成服务`,
      }
    });
    console.log(`✓ 供应商: ${provider.name}`);
  }

  // 创建所有模型
  for (const model of modelData) {
    const platform = await db.aIPlatform.findUnique({ where: { slug: model.slug } });
    if (!platform) continue;

    const provider = await db.aIProvider.findFirst({
      where: {
        name: model.provider,
        platformId: platform.id
      }
    });
    if (!provider) continue;

    await db.aIModel.upsert({
      where: { slug: slugify(`${model.provider}-${model.name}`) },
      create: {
        providerId: provider.id,
        name: model.name,
        slug: slugify(`${model.provider}-${model.name}`),
        outputType: model.type,
        adapterName: model.modelId, // 用modelId作为adapterName
        description: model.description,
      },
      update: {
        providerId: provider.id,
        name: model.name,
        outputType: model.type,
        adapterName: model.modelId, // 用modelId作为adapterName
        description: model.description,
      }
    });
    console.log(`  ✓ 模型: ${model.name} (${model.type})`);
  }

  // 统计信息
  console.log('\n=== 统计信息 ===');
  const platformsCount = await db.aIPlatform.count();
  const providersCount = await db.aIProvider.count();
  const modelsCount = await db.aIModel.count();
  const videoModels = await db.aIModel.count({ where: { outputType: 'VIDEO' } });
  const imageModels = await db.aIModel.count({ where: { outputType: 'IMAGE' } });
  const audioModels = await db.aIModel.count({ where: { outputType: 'AUDIO' } });

  console.log(`AI平台: ${platformsCount}`);
  console.log(`AI供应商: ${providersCount}`);
  console.log(`AI模型总数: ${modelsCount}`);
  console.log(`  - 视频模型: ${videoModels}`);
  console.log(`  - 图像模型: ${imageModels}`);
  console.log(`  - 音频模型: ${audioModels}`);

  console.log('\n✓ 所有AI生成供应商和模型填充完成！');
}

seedAllAIProviders()
  .catch((error) => {
    console.error('错误:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });