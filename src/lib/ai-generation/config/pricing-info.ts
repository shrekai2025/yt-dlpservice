/**
 * Model Pricing Information Configuration
 *
 * 每个模型的费用说明配置
 * 用于在生成按钮下方显示费用预估
 */

/**
 * 模型费用说明配置表
 * key: model slug
 * value: 费用说明文本（支持根据参数动态计算）
 */
export const MODEL_PRICING_INFO: Record<string, string | ((params: Record<string, unknown>) => string)> = {
  // ==================== Kie.ai ====================

  'kie-4o-image': (params) => {
    const outputs = params.numberOfOutputs as number || 1
    let credits = 0

    if (outputs === 1) {
      credits = 6
    } else if (outputs === 2) {
      credits = 7
    } else if (outputs >= 4) {
      credits = 8
    }

    const cost = (credits * 0.005).toFixed(3)
    return `${credits} Credits ≈ $${cost}`
  },

  'kie-flux-kontext': (params) => {
    const model = params.model as string || 'flux-kontext-pro'
    const credits = model === 'flux-kontext-max' ? 10 : 5
    const cost = (credits * 0.005).toFixed(3)
    return `${credits} Credits ≈ $${cost}`
  },

  'kie-midjourney-image': (params) => {
    const speed = params.speed as string || 'relaxed'
    let credits = 3 // relaxed

    if (speed === 'fast') {
      credits = 8
    } else if (speed === 'turbo') {
      credits = 16
    }

    const cost = (credits * 0.005).toFixed(3)
    return `${credits} Credits ≈ $${cost}`
  },

  'kie-nano-banana': '4 Credits/张 ≈ $0.020',

  'kie-nano-banana-edit': '4 Credits/张 ≈ $0.020',

  'kie-nano-banana-upscale': '1 Credit/张 ≈ $0.005',

  'kie-seedream-v4': '3.5 Credits/张 ≈ $0.018',

  'kie-seedream-v4-edit': '3.5 Credits/张 ≈ $0.018',

  'kie-qwen-image-edit': (params) => {
    // 根据不同分辨率计算费用
    const size = params.size as string || '1024x1024'

    const pricingMap: Record<string, { credits: number; cost: string }> = {
      '512x512': { credits: 1, cost: '0.005' },
      '1024x1024': { credits: 3.5, cost: '0.018' },
      '768x1024': { credits: 2.5, cost: '0.013' },
      '576x1024': { credits: 2, cost: '0.010' },
      '1024x768': { credits: 2.5, cost: '0.013' },
      '1024x576': { credits: 2, cost: '0.010' },
    }

    const pricing = pricingMap[size] || { credits: 3.5, cost: '0.018' }
    return `${pricing.credits} Credits ≈ $${pricing.cost}`
  },

  // ==================== Video Models ====================

  'kie-midjourney-video': (params) => {
    const taskType = params.taskType as string || 'mj_video'
    const videoBatchSize = params.videoBatchSize as number || 1

    let creditsPerVideo = 15 // Standard
    if (taskType === 'mj_video_hd') {
      creditsPerVideo = 45 // HD
    }

    const totalCredits = creditsPerVideo * videoBatchSize
    const cost = (totalCredits * 0.005).toFixed(2)

    if (taskType === 'mj_video_hd') {
      return `HD ${videoBatchSize}视频: ${totalCredits} Credits ≈ $${cost}`
    }
    return `标清 ${videoBatchSize}视频: ${totalCredits} Credits ≈ $${cost}`
  },

  'kie-sora2': (params) => {
    // Sora 2 普通版: 30 credits ($0.15) per 10-second video
    return '30 Credits/10秒 ≈ $0.15'
  },

  'kie-sora2-image-to-video': (params) => {
    // Sora 2 Image to Video: 同样是 30 credits per 10-second video
    return '30 Credits/10秒 ≈ $0.15'
  },

  'kie-sora2-pro': (params) => {
    const nFrames = params.n_frames as string || '10'
    const size = params.size as string || 'standard'

    if (size === 'high') {
      // 高清版
      if (nFrames === '15') {
        return '400 Credits/15秒 ≈ $2.00 (高清)'
      }
      return '200 Credits/10秒 ≈ $1.00 (高清)'
    } else {
      // 标准版
      if (nFrames === '15') {
        return '135 Credits/15秒 ≈ $0.675'
      }
      return '90 Credits/10秒 ≈ $0.45'
    }
  },

  'kie-sora2-pro-image-to-video': (params) => {
    const nFrames = params.n_frames as string || '10'
    const size = params.size as string || 'standard'

    if (size === 'high') {
      // 高清版
      if (nFrames === '15') {
        return '400 Credits/15秒 ≈ $2.00 (高清)'
      }
      return '200 Credits/10秒 ≈ $1.00 (高清)'
    } else {
      // 标准版
      if (nFrames === '15') {
        return '135 Credits/15秒 ≈ $0.675'
      }
      return '90 Credits/10秒 ≈ $0.45'
    }
  },

  'kie-veo3': '250 Credits ≈ $1.25 (Quality)',

  'kie-veo3-fast': '100 Credits ≈ $0.50 (Fast)',
}

/**
 * 获取模型的费用说明
 * @param modelSlug 模型slug
 * @param params 当前参数（包含 numberOfOutputs 等）
 * @returns 费用说明文本，如果没有配置则返回 null
 */
export function getModelPricingInfo(
  modelSlug: string,
  params: Record<string, unknown> = {}
): string | null {
  const pricingConfig = MODEL_PRICING_INFO[modelSlug]

  if (!pricingConfig) {
    return null
  }

  if (typeof pricingConfig === 'function') {
    return pricingConfig(params)
  }

  return pricingConfig
}

/**
 * 检查模型是否有费用说明配置
 */
export function hasModelPricingInfo(modelSlug: string): boolean {
  return modelSlug in MODEL_PRICING_INFO
}
