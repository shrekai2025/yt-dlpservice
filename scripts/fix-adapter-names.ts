import { db } from '../src/server/db';

// 可用的适配器列表
const AVAILABLE_ADAPTERS = new Set([
  'KieImageAdapter',
  'KieFluxKontextAdapter',
  'KieMidjourneyAdapter',
  'KieSoraAdapter',
  'KieSora2Adapter',
  'KieSora2ImageToVideoAdapter',
  'KieSora2ProAdapter',
  'KieSora2ProImageToVideoAdapter',
  'KieVeo3Adapter',
  'KieVeo31Adapter',
  'KieVeo31ExtendAdapter',
  'KieNanoBananaAdapter',
  'KieNanoBananaEditAdapter',
  'KieNanoBananaUpscaleAdapter',
  'KieSeedreamV4Adapter',
  'KieSeedreamV4EditAdapter',
  'KieQwenImageEditAdapter',
  'KieSoraWatermarkRemoverAdapter',
  'KieKlingV2MasterImageToVideoAdapter',
  'KieKlingV2MasterTextToVideoAdapter',
  'KieKlingV2StandardAdapter',
  'KieKlingV2ProAdapter',
  'KieKlingV25TurboProAdapter',
  'KieKlingV25TurboTextToVideoProAdapter',
  'KieWan22A14bTextToVideoTurboAdapter',
  'KieWan22A14bImageToVideoTurboAdapter',
  'KieWan25TextToVideoAdapter',
  'KieWan25ImageToVideoAdapter',
  'KieByteDanceV1ProTextToVideoAdapter',
  'KieByteDanceV1ProImageToVideoAdapter',
  'KieRunwayAdapter',
  'KieRunwayExtendAdapter',
  'TuziKlingAdapter',
  'TuziMidjourneyAdapter',
  'ReplicateFluxAdapter',
  'ReplicateMinimaxAdapter',
  'OpenAIDalleAdapter',
  'PolloVeo3Adapter',
  'PolloKlingAdapter',
  'ElevenLabsTTSAdapter',
  'JimengTextToImageAdapter',
  'Jimeng40Adapter',
  'JimengVideo30Adapter'
]);

// 模型ID到适配器名称的映射
const MODEL_ID_TO_ADAPTER: Record<string, string> = {
  // KIE - Video models
  'kie-sora': 'KieSoraAdapter',
  'kie-sora2': 'KieSora2Adapter',
  'kie-sora2-image-to-video': 'KieSora2ImageToVideoAdapter',
  'kie-sora2-pro': 'KieSora2ProAdapter',
  'kie-sora2-pro-image-to-video': 'KieSora2ProImageToVideoAdapter',
  'kie-sora-watermark-remover': 'KieSoraWatermarkRemoverAdapter',
  'kie-veo3': 'KieVeo3Adapter',
  'kie-veo3-fast': 'KieVeo3Adapter',
  'kie-veo3-1': 'KieVeo31Adapter',
  'kie-veo3-1-extend': 'KieVeo31ExtendAdapter',
  'kie-kling-v2-5-turbo-pro': 'KieKlingV25TurboProAdapter',
  'kie-kling-v2-5-turbo-text-to-video-pro': 'KieKlingV25TurboTextToVideoProAdapter',
  'kie-kling-v2-1-master-text-to-video': 'KieKlingV2MasterTextToVideoAdapter',
  'kie-kling-v2-1-master-image-to-video': 'KieKlingV2MasterImageToVideoAdapter',
  'kie-kling-v2-1-pro': 'KieKlingV2ProAdapter',
  'kie-kling-v2-1-standard': 'KieKlingV2StandardAdapter',
  'kie-runway': 'KieRunwayAdapter',
  'kie-runway-extend': 'KieRunwayExtendAdapter',
  'kie-bytedance-v1-pro-text-to-video': 'KieByteDanceV1ProTextToVideoAdapter',
  'kie-bytedance-v1-pro-image-to-video': 'KieByteDanceV1ProImageToVideoAdapter',
  'kie-wan-2-2-a14b-text-to-video-turbo': 'KieWan22A14bTextToVideoTurboAdapter',
  'kie-wan-2-2-a14b-image-to-video-turbo': 'KieWan22A14bImageToVideoTurboAdapter',
  'kie-wan-2-5-text-to-video': 'KieWan25TextToVideoAdapter',
  'kie-wan-2-5-image-to-video': 'KieWan25ImageToVideoAdapter',
  'kie-midjourney-video': 'KieMidjourneyAdapter',

  // KIE - Image models
  'kie-flux-kontext': 'KieFluxKontextAdapter',
  'kie-4o-image': 'KieImageAdapter',
  'kie-midjourney-image': 'KieMidjourneyAdapter',
  'kie-nano-banana': 'KieNanoBananaAdapter',
  'kie-nano-banana-edit': 'KieNanoBananaEditAdapter',
  'kie-nano-banana-upscale': 'KieNanoBananaUpscaleAdapter',
  'qwen/image-edit': 'KieQwenImageEditAdapter',
  'bytedance/seedream-v4-text-to-image': 'KieSeedreamV4Adapter',
  'bytedance/seedream-v4-edit': 'KieSeedreamV4EditAdapter',

  // TUZI
  'tuzi-kling': 'TuziKlingAdapter',
  'tuzi-midjourney-image': 'TuziMidjourneyAdapter',
  'tuzi-midjourney-video': 'TuziMidjourneyAdapter',

  // JIMENG
  'jimeng-4.0': 'Jimeng40Adapter',
  'jimeng-text-to-image-v21': 'JimengTextToImageAdapter',
  'jimeng-video-30': 'JimengVideo30Adapter',

  // ELEVENLABS
  'elevenlabs-tts-v3': 'ElevenLabsTTSAdapter',

  // OPENAI
  'openai-dalle-3': 'OpenAIDalleAdapter',

  // POLLO
  'pollo-veo3': 'PolloVeo3Adapter',
  'pollo-kling': 'PolloKlingAdapter',

  // REPLICATE
  'replicate-flux-pro': 'ReplicateFluxAdapter',
  'replicate-flux-dev': 'ReplicateFluxAdapter',
  'replicate-minimax': 'ReplicateMinimaxAdapter',
};

async function fixAdapterNames() {
  console.log('开始修正AI模型的adapterName字段...\n');

  // 获取所有模型
  const models = await db.aIModel.findMany();

  console.log(`找到 ${models.length} 个模型需要检查`);

  let fixedCount = 0;
  let errorCount = 0;

  for (const model of models) {
    const modelId = model.adapterName; // 现在adapterName存储的是modelId
    const correctAdapterName = MODEL_ID_TO_ADAPTER[modelId];

    if (!correctAdapterName) {
      console.log(`❌ 无法找到模型 "${model.name}" 的适配器 (modelId: ${modelId})`);
      errorCount++;
      continue;
    }

    if (!AVAILABLE_ADAPTERS.has(correctAdapterName)) {
      console.log(`❌ 适配器 "${correctAdapterName}" 不在可用列表中 (model: ${model.name})`);
      errorCount++;
      continue;
    }

    if (model.adapterName !== correctAdapterName) {
      await db.aIModel.update({
        where: { id: model.id },
        data: { adapterName: correctAdapterName }
      });

      console.log(`✓ 修正: ${model.name} -> ${correctAdapterName}`);
      fixedCount++;
    } else {
      console.log(`✓ 正确: ${model.name} -> ${correctAdapterName}`);
    }
  }

  console.log(`\n=== 修正完成 ===`);
  console.log(`总计检查: ${models.length} 个模型`);
  console.log(`成功修正: ${fixedCount} 个模型`);
  console.log(`错误: ${errorCount} 个模型`);

  // 验证修正后的数据
  console.log('\n=== 验证修正结果 ===');
  const fixedModels = await db.aIModel.findMany();
  const adapterCounts = new Map<string, number>();

  fixedModels.forEach(model => {
    adapterCounts.set(model.adapterName, (adapterCounts.get(model.adapterName) || 0) + 1);
  });

  console.log('各适配器对应的模型数量:');
  Array.from(adapterCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([adapter, count]) => {
      console.log(`  ${adapter}: ${count} 个模型`);
    });
}

fixAdapterNames()
  .catch((error) => {
    console.error('错误:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
