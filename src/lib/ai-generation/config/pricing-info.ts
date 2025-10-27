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

  'kie-veo3-1': (params) => {
    // Veo 3.1 定价：
    // - Quality (16:9 或 9:16): 250 Credits
    // - Fast (16:9 或 9:16): 60 Credits
    // - 获取1080P视频: +5 Credits (一次性,仅16:9)
    //
    // 注：Quality使用model=veo3, Fast使用model=veo3_fast
    const model = params.model as string || 'veo3_fast'
    const aspectRatio = params.aspectRatio as string || '16:9'

    let credits = 250
    let modelName = 'Quality'

    if (model === 'veo3_fast') {
      credits = 60
      modelName = 'Fast'
    }

    const cost = (credits * 0.005).toFixed(2)

    // 如果是16:9，提示可以获取1080P
    if (aspectRatio === '16:9') {
      return `${credits} Credits ≈ $${cost} (${modelName}, 1080P需额外5 Credits)`
    }

    return `${credits} Credits ≈ $${cost} (${modelName}, ${aspectRatio})`
  },

  'kie-veo3-1-extend': '60 Credits ≈ $0.30 (视频扩展)',

  'kie-sora-watermark-remover': '10 Credits ≈ $0.05',

  'kie-kling-v2-1-master-image-to-video': (params) => {
    const duration = params.duration as string || '5'
    if (duration === '10') {
      return '320 Credits/10秒 ≈ $1.60'
    }
    return '160 Credits/5秒 ≈ $0.80'
  },

  'kie-kling-v2-1-master-text-to-video': (params) => {
    const duration = params.duration as string || '5'
    if (duration === '10') {
      return '320 Credits/10秒 ≈ $1.60'
    }
    return '160 Credits/5秒 ≈ $0.80'
  },

  'kie-kling-v2-1-standard': (params) => {
    const duration = params.duration as string || '5'
    if (duration === '10') {
      return '50 Credits/10秒 ≈ $0.25'
    }
    return '25 Credits/5秒 ≈ $0.125'
  },

  'kie-kling-v2-1-pro': (params) => {
    const duration = params.duration as string || '5'
    if (duration === '10') {
      return '100 Credits/10秒 ≈ $0.50'
    }
    return '50 Credits/5秒 ≈ $0.25'
  },

  'kie-kling-v2-5-turbo-i2v-pro': (params) => {
    const duration = params.duration as string || '5'
    if (duration === '10') {
      return '84 Credits/10秒 ≈ $0.42'
    }
    return '42 Credits/5秒 ≈ $0.21'
  },

  'kie-wan-2-2-a14b-text-to-video-turbo': (params) => {
    const resolution = params.resolution as string || '720p'
    const pricingMap: Record<string, { credits: number; cost: string }> = {
      '720p': { credits: 12, cost: '0.06' },
      '580p': { credits: 9, cost: '0.045' },
      '480p': { credits: 6, cost: '0.03' },
    }
    const pricing = pricingMap[resolution] || { credits: 12, cost: '0.06' }
    return `${pricing.credits} Credits/${resolution} ≈ $${pricing.cost}`
  },

  'kie-wan-2-2-a14b-image-to-video-turbo': (params) => {
    const resolution = params.resolution as string || '720p'
    const pricingMap: Record<string, { credits: number; cost: string }> = {
      '720p': { credits: 12, cost: '0.06' },
      '580p': { credits: 9, cost: '0.045' },
      '480p': { credits: 6, cost: '0.03' },
    }
    const pricing = pricingMap[resolution] || { credits: 12, cost: '0.06' }
    return `${pricing.credits} Credits/${resolution} ≈ $${pricing.cost}`
  },

  'kie-wan-2-5-text-to-video': (params) => {
    const resolution = params.resolution as string || '1080p'
    const pricingMap: Record<string, { creditsPerSec: number; costPerSec: string }> = {
      '720p': { creditsPerSec: 12, costPerSec: '0.06' },
      '1080p': { creditsPerSec: 20, costPerSec: '0.10' },
    }
    const pricing = pricingMap[resolution] || { creditsPerSec: 20, costPerSec: '0.10' }
    return `${pricing.creditsPerSec} Credits/秒 ≈ $${pricing.costPerSec}/秒 (${resolution})`
  },

  'kie-wan-2-5-image-to-video': (params) => {
    const resolution = params.resolution as string || '1080p'
    const pricingMap: Record<string, { creditsPerSec: number; costPerSec: string }> = {
      '720p': { creditsPerSec: 12, costPerSec: '0.06' },
      '1080p': { creditsPerSec: 20, costPerSec: '0.10' },
    }
    const pricing = pricingMap[resolution] || { creditsPerSec: 20, costPerSec: '0.10' }
    return `${pricing.creditsPerSec} Credits/秒 ≈ $${pricing.costPerSec}/秒 (${resolution})`
  },

  'kie-bytedance-v1-pro-text-to-video': (params) => {
    const duration = params.duration as string || '5'
    const resolution = params.resolution as string || '720p'

    // 每秒定价
    const pricingPerSec: Record<string, { creditsPerSec: number; costPerSec: string }> = {
      '480p': { creditsPerSec: 2.8, costPerSec: '0.014' },
      '720p': { creditsPerSec: 6, costPerSec: '0.03' },
      '1080p': { creditsPerSec: 14, costPerSec: '0.07' },
    }

    const pricing = pricingPerSec[resolution] || pricingPerSec['720p']
    const durationNum = duration === '10' ? 10 : 5
    const totalCredits = pricing.creditsPerSec * durationNum
    const totalCost = (parseFloat(pricing.costPerSec) * durationNum).toFixed(2)

    return `${totalCredits} Credits/${durationNum}秒 ≈ $${totalCost} (${resolution})`
  },

  'kie-bytedance-v1-pro-image-to-video': (params) => {
    const duration = params.duration as string || '5'
    const resolution = params.resolution as string || '720p'

    // 每秒定价（与文生视频相同）
    const pricingPerSec: Record<string, { creditsPerSec: number; costPerSec: string }> = {
      '480p': { creditsPerSec: 2.8, costPerSec: '0.014' },
      '720p': { creditsPerSec: 6, costPerSec: '0.03' },
      '1080p': { creditsPerSec: 14, costPerSec: '0.07' },
    }

    const pricing = pricingPerSec[resolution] || pricingPerSec['720p']
    const durationNum = duration === '10' ? 10 : 5
    const totalCredits = pricing.creditsPerSec * durationNum
    const totalCost = (parseFloat(pricing.costPerSec) * durationNum).toFixed(2)

    return `${totalCredits} Credits/${durationNum}秒 ≈ $${totalCost} (${resolution})`
  },

  'kie-runway': (params) => {
    const duration = params.duration as number || 5
    const quality = params.quality as string || '720p'

    // Runway 定价矩阵
    const pricingMatrix: Record<string, Record<string, { credits: number; cost: string }>> = {
      '5': {
        '720p': { credits: 12, cost: '0.06' },
        '1080p': { credits: 30, cost: '0.15' },
      },
      '10': {
        '720p': { credits: 30, cost: '0.15' },
        // 10秒不支持1080p
      },
    }

    const durationKey = String(duration)
    const pricing = pricingMatrix[durationKey]?.[quality] || { credits: 12, cost: '0.06' }

    if (duration === 10 && quality === '1080p') {
      return '10秒不支持1080p，请选择720p'
    }

    return `${pricing.credits} Credits/${duration}秒 ≈ $${pricing.cost} (${quality})`
  },

  'kie-runway-extend': (params) => {
    const quality = params.quality as string || '720p'

    // Runway Extend 定价（固定5秒扩展）
    const pricingMap: Record<string, { credits: number; cost: string }> = {
      '720p': { credits: 12, cost: '0.06' },
      '1080p': { credits: 30, cost: '0.15' },
    }

    const pricing = pricingMap[quality] || pricingMap['720p']
    return `${pricing.credits} Credits/5秒 ≈ $${pricing.cost} (${quality})`
  },

  // ==================== 其他供应商 ====================

  // Tuzi.ai (图子AI) - 暂无官方定价信息
  'tuzi-kling': '暂无定价信息',
  'tuzi-midjourney': '暂无定价信息',

  // Replicate - 根据官方定价
  'replicate-flux-pro': '$0.055/张',
  'replicate-minimax': (params) => {
    // Minimax 视频生成，按秒计费
    const promptOptimization = params.prompt_optimizer as boolean || false
    const basePrice = promptOptimization ? 0.014 : 0.012
    return `$${basePrice}/秒`
  },

  // OpenAI DALL-E 3
  'openai-dalle-3': (params) => {
    const size = params.size as string || '1024x1024'
    const quality = params.quality as string || 'standard'

    if (quality === 'hd') {
      if (size === '1024x1024') return '$0.080/张 (HD)'
      if (size === '1024x1792' || size === '1792x1024') return '$0.120/张 (HD)'
    }

    // Standard quality
    if (size === '1024x1024') return '$0.040/张'
    if (size === '1024x1792' || size === '1792x1024') return '$0.080/张'

    return '$0.040/张'
  },

  // Pollo.ai - 暂无官方定价信息
  'pollo-kling': '暂无定价信息',
  'pollo-veo3': '暂无定价信息',

  // ElevenLabs TTS
  'elevenlabs-tts-v3': (params) => {
    // ElevenLabs 按字符计费，这里给出估算
    // Turbo v3: $0.10 per 1000 characters
    const text = params.text as string || ''
    const charCount = text.length || 100 // 默认100字符
    const cost = (charCount / 1000 * 0.10).toFixed(4)
    return `约 $${cost} (${charCount}字符, $0.10/1k字符)`
  },

  // ==================== Jimeng AI (火山引擎即梦AI) ====================

  'jimeng-text-to-image-v21': (params) => {
    // 即梦AI定价参考火山引擎官方定价
    // 文生图2.1基础版：约 ¥0.02-0.05/张
    const use_sr = params.use_sr as boolean ?? true
    const width = params.width as number ?? 512
    const height = params.height as number ?? 512

    // 基础费用
    let baseCost = 0.008 // 约$0.008/张基础费用

    // 如果开启超分，费用增加
    if (use_sr) {
      baseCost = baseCost * 1.5 // 超分增加50%费用
    }

    // 尺寸影响（大尺寸费用更高）
    const pixelCount = width * height
    if (pixelCount > 512 * 512) {
      const ratio = pixelCount / (512 * 512)
      baseCost = baseCost * ratio
    }

    const finalCost = baseCost.toFixed(4)
    const dimensions = use_sr ? `${width * 2}x${height * 2}` : `${width}x${height}`
    return `约 $${finalCost}/张 (${dimensions}${use_sr ? ', 含超分' : ''})`
  },

  'jimeng-40': (params) => {
    // 即梦4.0定价：根据输出图片数量计费
    // 基础费用参考文生图2.1，但可能输出多张图片
    const size = params.size as number ?? 4194304 // 默认2K
    const force_single = params.force_single as boolean ?? false

    // 计算单张图片基础费用（基于分辨率）
    let baseCostPerImage = 0.01 // 默认1K基础费用

    if (size <= 1048576) {
      // 1K
      baseCostPerImage = 0.01
    } else if (size <= 4194304) {
      // 2K
      baseCostPerImage = 0.015
    } else if (size <= 9437184) {
      // 3K
      baseCostPerImage = 0.025
    } else {
      // 4K
      baseCostPerImage = 0.04
    }

    if (force_single) {
      return `约 $${baseCostPerImage.toFixed(3)}/张 (单图输出)`
    } else {
      // 可能输出多张,给出范围
      const minCost = baseCostPerImage
      const maxCost = baseCostPerImage * 15 // 最多15张
      return `约 $${minCost.toFixed(3)}-$${maxCost.toFixed(2)} (1-15张, 按实际数量计费)`
    }
  },

  'jimeng-video-30': (params) => {
    // 即梦视频生成3.0定价：基于时长计费
    // 参考火山引擎官方定价，根据帧数计算
    const frames = params.frames as number ?? 121 // 默认5秒

    // 基础费用估算（参考行业标准）
    let baseCost = 0.15 // 5秒基础费用

    if (frames === 241) {
      // 10秒视频费用约为5秒的2倍
      baseCost = 0.30
    }

    const duration = frames === 121 ? '5秒' : '10秒'
    return `约 $${baseCost.toFixed(2)}/${duration} (1080P高清)`
  },

  'jimeng-text-to-image-v31': (params) => {
    // 即梦AI文生图3.1定价
    // 基础费用参考火山引擎官方定价
    const width = params.width as number ?? 1328
    const height = params.height as number ?? 1328

    // 计算图片面积（像素）
    const pixelCount = width * height

    // 基础费用（根据分辨率）
    let baseCost = 0.012 // 默认标清1K费用

    if (pixelCount <= 1328 * 1328) {
      // 标清1K（约1.76M像素）
      baseCost = 0.012
    } else if (pixelCount <= 2048 * 2048) {
      // 高清2K（约4.19M像素）
      baseCost = 0.020
    } else {
      // 超出2K范围
      baseCost = 0.025
    }

    const resolution = pixelCount <= 1328 * 1328 ? '标清1K' : '高清2K'
    return `约 $${baseCost.toFixed(3)}/张 (${width}x${height}, ${resolution})`
  },
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

/**
 * 计算任务的实际成本（美元）
 * @param modelSlug 模型slug
 * @param params 任务参数
 * @returns 成本（美元），如果无法计算则返回 null
 */
export function calculateTaskCost(
  modelSlug: string,
  params: Record<string, unknown> = {}
): number | null {
  const pricingConfig = MODEL_PRICING_INFO[modelSlug]

  if (!pricingConfig) {
    return null
  }

  try {
    let pricingText: string
    if (typeof pricingConfig === 'function') {
      pricingText = pricingConfig(params)
    } else {
      pricingText = pricingConfig
    }

    // 解析定价文本，提取美元金额
    // 支持的格式:
    // - "30 Credits/10秒 ≈ $0.15"
    // - "$0.055/张"
    // - "约 $0.0010 (100字符, $0.10/1k字符)"
    // - "暂无定价信息"

    if (pricingText.includes('暂无定价信息')) {
      return null
    }

    // 提取 $ 后面的数字
    const dollarMatch = pricingText.match(/\$([0-9]+\.?[0-9]*)/g)
    if (!dollarMatch || dollarMatch.length === 0) {
      return null
    }

    // 获取第一个美元金额（通常是总价）
    const firstDollar = dollarMatch[0].replace('$', '')
    const cost = parseFloat(firstDollar)

    if (isNaN(cost)) {
      return null
    }

    // 特殊处理：如果是按秒或按字符计费的模型，需要乘以实际数量
    if (pricingText.includes('/秒') || pricingText.includes('Credits/秒')) {
      // 对于视频模型，需要获取实际时长
      const duration = extractDurationFromParams(modelSlug, params)
      if (duration > 0) {
        return cost * duration
      }
    }

    return cost
  } catch (error) {
    console.error('Error calculating task cost:', error)
    return null
  }
}

/**
 * 从参数中提取视频时长（秒）
 */
function extractDurationFromParams(modelSlug: string, params: Record<string, unknown>): number {
  // 不同模型的时长参数名称可能不同
  const duration = params.duration as string | number | undefined
  const nFrames = params.n_frames as string | undefined

  if (duration) {
    if (typeof duration === 'number') {
      return duration
    }
    const parsed = parseFloat(duration)
    if (!isNaN(parsed)) {
      return parsed
    }
  }

  if (nFrames) {
    const parsed = parseFloat(nFrames)
    if (!isNaN(parsed)) {
      return parsed
    }
  }

  // 默认时长
  if (modelSlug.includes('sora2')) {
    return 10
  }
  if (modelSlug.includes('kling') || modelSlug.includes('runway')) {
    return 5
  }

  return 5 // 默认5秒
}
