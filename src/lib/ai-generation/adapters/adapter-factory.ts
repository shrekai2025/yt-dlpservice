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
import { KieNanoBananaAdapter } from './kie/kie-nano-banana-adapter'
import { KieNanoBananaEditAdapter } from './kie/kie-nano-banana-edit-adapter'
import { KieNanoBananaUpscaleAdapter } from './kie/kie-nano-banana-upscale-adapter'
import { KieSeedreamV4Adapter } from './kie/kie-seedream-v4-adapter'
import { KieSeedreamV4EditAdapter } from './kie/kie-seedream-v4-edit-adapter'
import { KieQwenImageEditAdapter } from './kie/kie-qwen-image-edit-adapter'

import { TuziKlingAdapter } from './tuzi/tuzi-kling-adapter'
import { TuziMidjourneyAdapter } from './tuzi/tuzi-midjourney-adapter'

import { ReplicateFluxAdapter } from './replicate/replicate-flux-adapter'
import { ReplicateMinimaxAdapter } from './replicate/replicate-minimax-adapter'

import { OpenAIDalleAdapter } from './openai/openai-dalle-adapter'

import { PolloVeo3Adapter } from './pollo/pollo-veo3-adapter'
import { PolloKlingAdapter } from './pollo/pollo-kling-adapter'

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
  KieNanoBananaAdapter,
  KieNanoBananaEditAdapter,
  KieNanoBananaUpscaleAdapter,
  KieSeedreamV4Adapter,
  KieSeedreamV4EditAdapter,
  KieQwenImageEditAdapter,

  // TuZi
  TuziKlingAdapter,
  TuziMidjourneyAdapter,

  // Replicate
  ReplicateFluxAdapter,
  ReplicateMinimaxAdapter,

  // OpenAI
  OpenAIDalleAdapter,

  // Pollo
  PolloVeo3Adapter,
  PolloKlingAdapter,
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
