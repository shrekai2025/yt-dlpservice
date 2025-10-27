/**
 * Adapter Factory
 *
 * 根据模型配置创建对应的适配器实例
 */

import { BaseAdapter } from './base-adapter'
import type { ModelConfig } from './types'

// 导入所有适配器
import { KieImageAdapter } from './kie/kie-image-adapter'
import { KieFluxKontextAdapter } from './kie/kie-flux-kontext-adapter'
import { KieMidjourneyAdapter } from './kie/kie-midjourney-adapter'
import { KieSoraAdapter } from './kie/kie-sora-adapter'
import { KieSora2Adapter } from './kie/kie-sora2-adapter'
import { KieSora2ImageToVideoAdapter } from './kie/kie-sora2-image-to-video-adapter'
import { KieSora2ProAdapter } from './kie/kie-sora2-pro-adapter'
import { KieSora2ProImageToVideoAdapter } from './kie/kie-sora2-pro-image-to-video-adapter'
import { KieVeo3Adapter } from './kie/kie-veo3-adapter'
import { KieVeo31Adapter } from './kie/kie-veo3-1-adapter'
import { KieVeo31ExtendAdapter } from './kie/kie-veo3-1-extend-adapter'
import { KieNanoBananaAdapter } from './kie/kie-nano-banana-adapter'
import { KieNanoBananaEditAdapter } from './kie/kie-nano-banana-edit-adapter'
import { KieNanoBananaUpscaleAdapter } from './kie/kie-nano-banana-upscale-adapter'
import { KieSeedreamV4Adapter } from './kie/kie-seedream-v4-adapter'
import { KieSeedreamV4EditAdapter } from './kie/kie-seedream-v4-edit-adapter'
import { KieQwenImageEditAdapter } from './kie/kie-qwen-image-edit-adapter'
import { KieSoraWatermarkRemoverAdapter } from './kie/kie-sora-watermark-remover-adapter'
import { KieKlingV2MasterImageToVideoAdapter } from './kie/kie-kling-v2-master-image-to-video-adapter'
import { KieKlingV2MasterTextToVideoAdapter } from './kie/kie-kling-v2-master-text-to-video-adapter'
import { KieKlingV2StandardAdapter } from './kie/kie-kling-v2-standard-adapter'
import { KieKlingV2ProAdapter } from './kie/kie-kling-v2-pro-adapter'
import { KieKlingV25TurboI2VProAdapter } from './kie/kie-kling-v2-5-turbo-i2v-pro-adapter'
import { KieWan22A14bTextToVideoTurboAdapter } from './kie/kie-wan-2-2-a14b-text-to-video-turbo-adapter'
import { KieWan22A14bImageToVideoTurboAdapter } from './kie/kie-wan-2-2-a14b-image-to-video-turbo-adapter'
import { KieWan25TextToVideoAdapter } from './kie/kie-wan-2-5-text-to-video-adapter'
import { KieWan25ImageToVideoAdapter } from './kie/kie-wan-2-5-image-to-video-adapter'
import { KieByteDanceV1ProTextToVideoAdapter } from './kie/kie-bytedance-v1-pro-text-to-video-adapter'
import { KieByteDanceV1ProImageToVideoAdapter } from './kie/kie-bytedance-v1-pro-image-to-video-adapter'
import { KieRunwayAdapter } from './kie/kie-runway-adapter'
import { KieRunwayExtendAdapter } from './kie/kie-runway-extend-adapter'

import { TuziKlingAdapter } from './tuzi/tuzi-kling-adapter'
import { TuziMidjourneyAdapter } from './tuzi/tuzi-midjourney-adapter'
import { TuziNanoBananaEditAdapter } from './tuzi/tuzi-nano-banana-edit-adapter'

import { ReplicateFluxAdapter } from './replicate/replicate-flux-adapter'
import { ReplicateMinimaxAdapter } from './replicate/replicate-minimax-adapter'

import { OpenAIDalleAdapter } from './openai/openai-dalle-adapter'

import { PolloVeo3Adapter } from './pollo/pollo-veo3-adapter'
import { PolloKlingAdapter } from './pollo/pollo-kling-adapter'

import { ElevenLabsTTSAdapter } from './elevenlabs/elevenlabs-tts-adapter'

import { JimengTextToImageAdapter } from './jimeng/jimeng-text-to-image-adapter'
import { JimengTextToImageV31Adapter } from './jimeng/jimeng-text-to-image-v31-adapter'
import { Jimeng40Adapter } from './jimeng/jimeng-40-adapter'
import { JimengVideo30Adapter } from './jimeng/jimeng-video-30-adapter'

import { GeminiFlashImageAdapter } from './google/gemini-flash-image-adapter'

/**
 * 适配器注册表
 * key: adapterName
 * value: 适配器类
 */
const ADAPTER_REGISTRY: Record<string, new (config: ModelConfig) => BaseAdapter> = {
  // Kie.ai
  KieImageAdapter,
  KieFluxKontextAdapter,
  KieMidjourneyAdapter,
  KieSoraAdapter,
  KieSora2Adapter,
  KieSora2ImageToVideoAdapter,
  KieSora2ProAdapter,
  KieSora2ProImageToVideoAdapter,
  KieVeo3Adapter,
  KieVeo31Adapter,
  KieVeo31ExtendAdapter,
  KieNanoBananaAdapter,
  KieNanoBananaEditAdapter,
  KieNanoBananaUpscaleAdapter,
  KieSeedreamV4Adapter,
  KieSeedreamV4EditAdapter,
  KieQwenImageEditAdapter,
  KieSoraWatermarkRemoverAdapter,
  KieKlingV2MasterImageToVideoAdapter,
  KieKlingV2MasterTextToVideoAdapter,
  KieKlingV2StandardAdapter,
  KieKlingV2ProAdapter,
  KieKlingV25TurboI2VProAdapter,
  KieWan22A14bTextToVideoTurboAdapter,
  KieWan22A14bImageToVideoTurboAdapter,
  KieWan25TextToVideoAdapter,
  KieWan25ImageToVideoAdapter,
  KieByteDanceV1ProTextToVideoAdapter,
  KieByteDanceV1ProImageToVideoAdapter,
  KieRunwayAdapter,
  KieRunwayExtendAdapter,

  // TuZi
  TuziKlingAdapter,
  TuziMidjourneyAdapter,
  TuziNanoBananaEditAdapter,

  // Replicate
  ReplicateFluxAdapter,
  ReplicateMinimaxAdapter,

  // OpenAI
  OpenAIDalleAdapter,

  // Pollo
  PolloVeo3Adapter,
  PolloKlingAdapter,

  // ElevenLabs
  ElevenLabsTTSAdapter,

  // Jimeng AI (火山引擎即梦AI)
  JimengTextToImageAdapter,
  JimengTextToImageV31Adapter,
  Jimeng40Adapter,
  JimengVideo30Adapter,

  // Google Gemini
  GeminiFlashImageAdapter,
}

/**
 * 创建适配器实例
 */
export function createAdapter(config: ModelConfig): BaseAdapter {
  const AdapterClass = ADAPTER_REGISTRY[config.adapterName]

  if (!AdapterClass) {
    const availableAdapters = Object.keys(ADAPTER_REGISTRY).join(', ')
    throw new Error(
      `Unknown adapter: ${config.adapterName}. Available adapters: ${availableAdapters}`
    )
  }

  return new AdapterClass(config)
}

/**
 * 获取所有可用的适配器名称
 */
export function getAvailableAdapters(): string[] {
  return Object.keys(ADAPTER_REGISTRY)
}

/**
 * 检查适配器是否可用
 */
export function isAdapterAvailable(adapterName: string): boolean {
  return adapterName in ADAPTER_REGISTRY
}
