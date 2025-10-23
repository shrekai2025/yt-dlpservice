/**
 * Model Parameters Configuration
 *
 * 每个模型的参数配置（硬编码）
 * 用于前端动态渲染参数表单
 */

export type ParameterFieldType = 'string' | 'number' | 'boolean' | 'select' | 'textarea'

export interface ParameterFieldOption {
  label: string
  value: string | number
}

export interface ParameterField {
  key: string
  label: string
  type: ParameterFieldType
  defaultValue?: unknown
  options?: ParameterFieldOption[]
  helperText?: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

/**
 * 模型参数配置表
 * key: model slug
 * value: 参数字段数组
 */
export const MODEL_PARAMETERS: Record<string, ParameterField[]> = {
  // ==================== Kie.ai ====================

  'kie-4o-image': [
    {
      key: 'size',
      label: '图片尺寸',
      type: 'select',
      defaultValue: '1024x1024',
      options: [
        { label: '1024x1024', value: '1024x1024' },
        { label: '1792x1024', value: '1792x1024' },
        { label: '1024x1792', value: '1024x1792' },
      ],
      helperText: 'Kie 4o Image 支持的图片尺寸',
    },
    {
      key: 'isEnhance',
      label: '提示词增强',
      type: 'boolean',
      defaultValue: false,
      helperText: '在特定场景下（如 3D 渲染）提供更精细的输出',
    },
    {
      key: 'uploadCn',
      label: '使用中国服务器上传',
      type: 'boolean',
      defaultValue: false,
      helperText: 'true 使用中国服务器，false 使用非中国服务器',
    },
    {
      key: 'enableFallback',
      label: '启用备用模型',
      type: 'boolean',
      defaultValue: false,
      helperText: '当 GPT-4o 不可用时自动切换到备用模型',
    },
    {
      key: 'fallbackModel',
      label: '备用模型',
      type: 'select',
      defaultValue: 'FLUX_MAX',
      options: [
        { label: 'GPT Image 1', value: 'GPT_IMAGE_1' },
        { label: 'Flux Max', value: 'FLUX_MAX' },
      ],
      helperText: 'enableFallback 为 true 时生效',
    },
  ],

  'kie-flux-kontext': [
    {
      key: 'enableTranslation',
      label: '启用自动翻译',
      type: 'boolean',
      defaultValue: true,
      helperText: '非英文提示词会自动翻译成英文',
    },
    {
      key: 'aspectRatio',
      label: '输出比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '21:9 超宽', value: '21:9' },
        { label: '16:9 宽屏', value: '16:9' },
        { label: '4:3 标准', value: '4:3' },
        { label: '1:1 正方形', value: '1:1' },
        { label: '3:4 竖版', value: '3:4' },
        { label: '9:16 手机竖屏', value: '9:16' },
      ],
    },
    {
      key: 'outputFormat',
      label: '输出格式',
      type: 'select',
      defaultValue: 'jpeg',
      options: [
        { label: 'JPEG', value: 'jpeg' },
        { label: 'PNG', value: 'png' },
      ],
    },
    {
      key: 'promptUpsampling',
      label: '提示词增强',
      type: 'boolean',
      defaultValue: false,
      helperText: '开启后提示词会自动润色，但会稍微增加耗时',
    },
    {
      key: 'model',
      label: '模型版本',
      type: 'select',
      defaultValue: 'flux-kontext-pro',
      options: [
        { label: 'Flux Kontext Pro', value: 'flux-kontext-pro' },
        { label: 'Flux Kontext Max', value: 'flux-kontext-max' },
      ],
    },
    {
      key: 'safetyTolerance',
      label: '安全等级 (0-6)',
      type: 'number',
      min: 0,
      max: 6,
      step: 1,
      defaultValue: 2,
      helperText: '数值越高对内容限制越宽松；编辑模式下（上传原图）需保持在 0-2。',
    },
    {
      key: 'uploadCn',
      label: '使用中国区上传',
      type: 'boolean',
      defaultValue: false,
      helperText: '位于中国大陆时可开启以提升上传速度',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-callback.example.com/flux-kontext',
      helperText: '可选。生成完成后会以 POST 回调该地址，应支持 JSON 负载。',
    },
    {
      key: 'watermark',
      label: '水印标识',
      type: 'string',
      placeholder: '自定义水印标识，例如 your-watermark-id',
      helperText: '可选。填写后生成的图片将附带对应水印。',
    },
  ],

  'kie-midjourney-image': [
    {
      key: 'taskType',
      label: '任务类型',
      type: 'select',
      defaultValue: 'mj_txt2img',
      options: [
        { label: '文生图', value: 'mj_txt2img' },
        { label: '图生图', value: 'mj_img2img' },
        { label: '风格参考', value: 'mj_style_reference' },
        { label: '全能参考', value: 'mj_omni_reference' },
      ],
      helperText: '选择生成模式。有输入图片时建议选择图生图或参考模式',
    },
    {
      key: 'speed',
      label: '生成速度',
      type: 'select',
      defaultValue: 'relaxed',
      options: [
        { label: 'Relaxed (慢速)', value: 'relaxed' },
        { label: 'Fast (快速)', value: 'fast' },
        { label: 'Turbo (极速)', value: 'turbo' },
      ],
      helperText: 'Omni Reference 模式不需要此参数',
    },
    {
      key: 'aspectRatio',
      label: '输出比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '2:1 超宽', value: '2:1' },
        { label: '16:9 宽屏', value: '16:9' },
        { label: '4:3 标准', value: '4:3' },
        { label: '3:2 经典', value: '3:2' },
        { label: '1:1 正方形', value: '1:1' },
        { label: '3:4 竖版', value: '3:4' },
        { label: '9:16 手机竖屏', value: '9:16' },
      ],
    },
    {
      key: 'version',
      label: 'MJ 版本',
      type: 'select',
      defaultValue: '7',
      options: [
        { label: 'V7', value: '7' },
        { label: 'V6.1', value: '6.1' },
        { label: 'V6', value: '6' },
        { label: 'Niji 6', value: 'niji6' },
      ],
    },
    {
      key: 'variety',
      label: '多样性 (0-100)',
      type: 'number',
      min: 0,
      max: 100,
      step: 5,
      defaultValue: 0,
      helperText: '数值越高结果越多样化',
    },
    {
      key: 'stylization',
      label: '风格化 (0-1000)',
      type: 'number',
      min: 0,
      max: 1000,
      step: 50,
      defaultValue: 100,
      helperText: '数值越高艺术风格越强',
    },
    {
      key: 'weirdness',
      label: '怪异度 (0-3000)',
      type: 'number',
      min: 0,
      max: 3000,
      step: 100,
      defaultValue: 0,
      helperText: '数值越高结果越奇特',
    },
    {
      key: 'ow',
      label: 'Omni 强度 (1-1000)',
      type: 'number',
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 500,
      helperText: '仅在 Omni Reference 模式下生效。数值越高参考图影响越强',
    },
    {
      key: 'enableTranslation',
      label: '启用自动翻译',
      type: 'boolean',
      defaultValue: false,
      helperText: '非英文提示词会自动翻译成英文',
    },
  ],

  'kie-midjourney-video': [
    {
      key: 'taskType',
      label: '任务类型',
      type: 'select',
      defaultValue: 'mj_video',
      options: [
        { label: '标清视频', value: 'mj_video' },
        { label: '高清视频', value: 'mj_video_hd' },
      ],
      helperText: '选择视频生成质量',
    },
    {
      key: 'aspectRatio',
      label: '输出比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 宽屏', value: '16:9' },
        { label: '1:1 正方形', value: '1:1' },
        { label: '9:16 手机竖屏', value: '9:16' },
      ],
    },
    {
      key: 'videoBatchSize',
      label: '视频数量',
      type: 'select',
      defaultValue: 1,
      options: [
        { label: '1 个视频', value: 1 },
        { label: '2 个视频', value: 2 },
        { label: '4 个视频', value: 4 },
      ],
    },
    {
      key: 'motion',
      label: '运动级别',
      type: 'select',
      defaultValue: 'high',
      options: [
        { label: 'High (高运动)', value: 'high' },
        { label: 'Low (低运动)', value: 'low' },
      ],
    },
  ],

  'kie-nano-banana': [
    {
      key: 'output_format',
      label: '输出格式',
      type: 'select',
      defaultValue: 'png',
      options: [
        { label: 'PNG', value: 'png' },
        { label: 'JPEG', value: 'jpeg' },
      ],
      helperText: '图片输出格式',
    },
    {
      key: 'image_size',
      label: '图片尺寸',
      type: 'select',
      defaultValue: '1:1',
      options: [
        { label: '1:1 正方形', value: '1:1' },
        { label: '9:16 手机竖屏', value: '9:16' },
        { label: '16:9 宽屏', value: '16:9' },
        { label: '3:4 竖版', value: '3:4' },
        { label: '4:3 横版', value: '4:3' },
        { label: '3:2 经典横版', value: '3:2' },
        { label: '2:3 经典竖版', value: '2:3' },
        { label: '5:4 接近正方形', value: '5:4' },
        { label: '4:5 竖版接近正方形', value: '4:5' },
        { label: '21:9 超宽屏', value: '21:9' },
        { label: 'Auto 自动', value: 'auto' },
      ],
      helperText: 'Nano Banana 支持的图片比例',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-callback.example.com/nano-banana',
      helperText: '可选。生成完成后会以 POST 回调该地址，应支持 JSON 负载。',
    },
  ],

  'kie-nano-banana-edit': [
    {
      key: 'output_format',
      label: '输出格式',
      type: 'select',
      defaultValue: 'png',
      options: [
        { label: 'PNG', value: 'png' },
        { label: 'JPEG', value: 'jpeg' },
      ],
      helperText: '图片输出格式',
    },
    {
      key: 'image_size',
      label: '图片尺寸',
      type: 'select',
      defaultValue: '1:1',
      options: [
        { label: '1:1 正方形', value: '1:1' },
        { label: '9:16 手机竖屏', value: '9:16' },
        { label: '16:9 宽屏', value: '16:9' },
        { label: '3:4 竖版', value: '3:4' },
        { label: '4:3 横版', value: '4:3' },
        { label: '3:2 经典横版', value: '3:2' },
        { label: '2:3 经典竖版', value: '2:3' },
        { label: '5:4 接近正方形', value: '5:4' },
        { label: '4:5 竖版接近正方形', value: '4:5' },
        { label: '21:9 超宽屏', value: '21:9' },
        { label: 'Auto 自动', value: 'auto' },
      ],
      helperText: 'Nano Banana Edit 支持的图片比例',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-callback.example.com/nano-banana-edit',
      helperText: '可选。生成完成后会以 POST 回调该地址，应支持 JSON 负载。',
    },
  ],

  'kie-nano-banana-upscale': [
    {
      key: 'scale',
      label: '放大倍数',
      type: 'number',
      min: 1,
      max: 4,
      step: 1,
      defaultValue: 2,
      helperText: '图像放大倍数 (1-4)',
    },
    {
      key: 'face_enhance',
      label: '面部增强',
      type: 'boolean',
      defaultValue: false,
      helperText: '启用 GFPGAN 面部增强功能',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-callback.example.com/nano-banana-upscale',
      helperText: '可选。生成完成后会以 POST 回调该地址，应支持 JSON 负载。',
    },
  ],

  'kie-sora2': [
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: 'landscape',
      options: [
        { label: 'Portrait (竖屏)', value: 'portrait' },
        { label: 'Landscape (横屏)', value: 'landscape' },
      ],
      helperText: '定义视频的宽高比',
    },
    {
      key: 'remove_watermark',
      label: '去除水印',
      type: 'boolean',
      defaultValue: true,
      helperText: '启用后将去除生成视频中的水印',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-sora2-image-to-video': [
    {
      key: 'image_url',
      label: '输入图片 URL',
      type: 'string',
      placeholder: 'https://example.com/image.jpg',
      helperText: '必填。输入图片的公开URL，支持 JPEG/PNG/WebP',
    },
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: 'landscape',
      options: [
        { label: 'Portrait (竖屏)', value: 'portrait' },
        { label: 'Landscape (横屏)', value: 'landscape' },
      ],
      helperText: '定义视频的宽高比',
    },
    {
      key: 'remove_watermark',
      label: '去除水印',
      type: 'boolean',
      defaultValue: true,
      helperText: '启用后将去除生成视频中的水印',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-sora2-pro': [
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: 'landscape',
      options: [
        { label: 'Portrait (竖屏)', value: 'portrait' },
        { label: 'Landscape (横屏)', value: 'landscape' },
      ],
      helperText: '定义视频的宽高比',
    },
    {
      key: 'n_frames',
      label: '视频时长',
      type: 'select',
      defaultValue: '10',
      options: [
        { label: '10秒', value: '10' },
        { label: '15秒', value: '15' },
      ],
      helperText: '生成视频的帧数/时长',
    },
    {
      key: 'size',
      label: '视频质量',
      type: 'select',
      defaultValue: 'high',
      options: [
        { label: 'Standard (标准)', value: 'standard' },
        { label: 'High (高质量)', value: 'high' },
      ],
      helperText: '生成视频的质量等级',
    },
    {
      key: 'remove_watermark',
      label: '去除水印',
      type: 'boolean',
      defaultValue: true,
      helperText: '启用后将去除生成视频中的水印',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-sora2-pro-image-to-video': [
    {
      key: 'image_url',
      label: '输入图片 URL',
      type: 'string',
      placeholder: 'https://example.com/image.jpg',
      helperText: '必填。输入图片的公开URL，支持 JPEG/PNG/WebP',
    },
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: 'landscape',
      options: [
        { label: 'Portrait (竖屏)', value: 'portrait' },
        { label: 'Landscape (横屏)', value: 'landscape' },
      ],
      helperText: '定义视频的宽高比',
    },
    {
      key: 'n_frames',
      label: '视频时长',
      type: 'select',
      defaultValue: '10',
      options: [
        { label: '10秒', value: '10' },
        { label: '15秒', value: '15' },
      ],
      helperText: '生成视频的帧数/时长',
    },
    {
      key: 'size',
      label: '视频质量',
      type: 'select',
      defaultValue: 'standard',
      options: [
        { label: 'Standard (标准)', value: 'standard' },
        { label: 'High (高质量)', value: 'high' },
      ],
      helperText: '生成视频的质量等级',
    },
    {
      key: 'remove_watermark',
      label: '去除水印',
      type: 'boolean',
      defaultValue: true,
      helperText: '启用后将去除生成视频中的水印',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-veo3': [
    {
      key: 'image_url',
      label: '输入图片 URL',
      type: 'string',
      placeholder: 'https://example.com/image.jpg',
      helperText: '可选。图生视频模式下的输入图片URL，支持 JPEG/PNG/WebP',
    },
    {
      key: 'aspectRatio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 (横屏,支持1080P)', value: '16:9' },
        { label: '9:16 (竖屏)', value: '9:16' },
        { label: 'Auto (自动)', value: 'Auto' },
      ],
      helperText: '只有16:9支持1080P高清视频',
    },
    {
      key: 'seeds',
      label: '随机种子',
      type: 'number',
      min: 10000,
      max: 99999,
      step: 1,
      placeholder: '10000-99999',
      helperText: '可选。相同种子生成相似内容,不同种子生成不同内容',
    },
    {
      key: 'enableFallback',
      label: '启用备用模型',
      type: 'boolean',
      defaultValue: false,
      helperText: '当Veo3服务不可用时自动切换到备用模型',
    },
    {
      key: 'enableTranslation',
      label: '自动翻译提示词',
      type: 'boolean',
      defaultValue: true,
      helperText: '将非英文提示词自动翻译为英文以获得更好效果',
    },
    {
      key: 'watermark',
      label: '水印文字',
      type: 'string',
      placeholder: '例如: MyBrand',
      helperText: '可选。在生成的视频中添加水印',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-callback-url.com/complete',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-veo3-fast': [
    {
      key: 'image_url',
      label: '输入图片 URL',
      type: 'string',
      placeholder: 'https://example.com/image.jpg',
      helperText: '可选。图生视频模式下的输入图片URL，支持 JPEG/PNG/WebP',
    },
    {
      key: 'aspectRatio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 (横屏,支持1080P)', value: '16:9' },
        { label: '9:16 (竖屏)', value: '9:16' },
        { label: 'Auto (自动)', value: 'Auto' },
      ],
      helperText: '只有16:9支持1080P高清视频',
    },
    {
      key: 'seeds',
      label: '随机种子',
      type: 'number',
      min: 10000,
      max: 99999,
      step: 1,
      placeholder: '10000-99999',
      helperText: '可选。相同种子生成相似内容,不同种子生成不同内容',
    },
    {
      key: 'enableFallback',
      label: '启用备用模型',
      type: 'boolean',
      defaultValue: false,
      helperText: '当Veo3服务不可用时自动切换到备用模型',
    },
    {
      key: 'enableTranslation',
      label: '自动翻译提示词',
      type: 'boolean',
      defaultValue: true,
      helperText: '将非英文提示词自动翻译为英文以获得更好效果',
    },
    {
      key: 'watermark',
      label: '水印文字',
      type: 'string',
      placeholder: '例如: MyBrand',
      helperText: '可选。在生成的视频中添加水印',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-callback-url.com/complete',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-veo3-1': [
    {
      key: 'model',
      label: '模型版本',
      type: 'select',
      defaultValue: 'veo3_fast',
      options: [
        { label: 'Veo3.1 Quality (250 Credits)', value: 'veo3' },
        { label: 'Veo3.1 Fast (60 Credits)', value: 'veo3_fast' },
      ],
      helperText: 'Quality质量更高但费用较高,Fast速度更快费用较低',
    },
    {
      key: 'image_url',
      label: '输入图片 URL',
      type: 'string',
      placeholder: 'https://example.com/image.jpg',
      helperText: '可选。图生视频模式下的输入图片URL，支持 1-2张图片',
    },
    {
      key: 'aspectRatio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 (横屏,支持1080P)', value: '16:9' },
        { label: '9:16 (竖屏)', value: '9:16' },
        { label: 'Auto (自动)', value: 'Auto' },
      ],
      helperText: '只有16:9支持1080P高清视频',
    },
    {
      key: 'generationType',
      label: '生成模式',
      type: 'select',
      defaultValue: 'TEXT_2_VIDEO',
      options: [
        { label: 'Text to Video (文生视频)', value: 'TEXT_2_VIDEO' },
        { label: 'First & Last Frames (首尾帧生成)', value: 'FIRST_AND_LAST_FRAMES_2_VIDEO' },
        { label: 'Reference to Video (参考图生成)', value: 'REFERENCE_2_VIDEO' },
      ],
      helperText: 'REFERENCE_2_VIDEO仅支持veo3_fast和16:9比例',
    },
    {
      key: 'seeds',
      label: '随机种子',
      type: 'number',
      min: 10000,
      max: 99999,
      step: 1,
      placeholder: '10000-99999',
      helperText: '可选。相同种子生成相似内容,不同种子生成不同内容',
    },
    {
      key: 'enableTranslation',
      label: '自动翻译提示词',
      type: 'boolean',
      defaultValue: true,
      helperText: '将非英文提示词自动翻译为英文以获得更好效果',
    },
    {
      key: 'watermark',
      label: '水印文字',
      type: 'string',
      placeholder: '例如: MyBrand',
      helperText: '可选。在生成的视频中添加水印',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-callback-url.com/complete',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-veo3-1-extend': [
    {
      key: 'parentTaskId',
      label: '原视频任务ID',
      type: 'string',
      placeholder: 'veo_task_abcdef123456',
      helperText: '必需。原始视频生成任务的taskId（来自Veo 3.1生成任务）。注意：1080P生成后的视频无法扩展',
    },
    {
      key: 'seeds',
      label: '随机种子',
      type: 'number',
      min: 10000,
      max: 99999,
      step: 1,
      placeholder: '10000-99999',
      helperText: '可选。相同种子生成相似内容,不同种子生成不同内容',
    },
    {
      key: 'watermark',
      label: '水印文字',
      type: 'string',
      placeholder: '例如: MyBrand',
      helperText: '可选。在生成的视频中添加水印',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-callback-url.com/veo-extend-callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-sora-watermark-remover': [
    {
      key: 'video_url',
      label: 'Sora 视频 URL',
      type: 'string',
      placeholder: 'https://sora.chatgpt.com/p/s_xxxxx',
      helperText: '必填。输入 Sora 2 视频的公开链接 (必须以 sora.chatgpt.com 开头)',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-kling-v2-1-master-image-to-video': [
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: '5',
      options: [
        { label: '5 秒 (160 Credits)', value: '5' },
        { label: '10 秒 (320 Credits)', value: '10' },
      ],
      helperText: '选择生成视频的时长',
    },
    {
      key: 'negative_prompt',
      label: '负面提示词',
      type: 'textarea',
      placeholder: 'blur, distort, and low quality',
      helperText: '可选。排除不想要的元素，最多500字符',
    },
    {
      key: 'cfg_scale',
      label: 'CFG Scale',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
      helperText: '控制模型对提示词的贴合度 (0-1)',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-kling-v2-1-master-text-to-video': [
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: '5',
      options: [
        { label: '5 秒 (160 Credits)', value: '5' },
        { label: '10 秒 (320 Credits)', value: '10' },
      ],
      helperText: '选择生成视频的时长',
    },
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 (横屏)', value: '16:9' },
        { label: '9:16 (竖屏)', value: '9:16' },
        { label: '1:1 (正方形)', value: '1:1' },
      ],
      helperText: '选择视频的宽高比',
    },
    {
      key: 'negative_prompt',
      label: '负面提示词',
      type: 'textarea',
      placeholder: 'blur, distort, and low quality',
      helperText: '可选。排除不想要的元素，最多500字符',
    },
    {
      key: 'cfg_scale',
      label: 'CFG Scale',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
      helperText: '控制模型对提示词的贴合度 (0-1)',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-kling-v2-1-standard': [
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: '5',
      options: [
        { label: '5 秒 (25 Credits)', value: '5' },
        { label: '10 秒 (50 Credits)', value: '10' },
      ],
      helperText: '选择生成视频的时长',
    },
    {
      key: 'negative_prompt',
      label: '负面提示词',
      type: 'textarea',
      placeholder: 'blur, distort, and low quality',
      helperText: '可选。排除不想要的元素，最多500字符',
    },
    {
      key: 'cfg_scale',
      label: 'CFG Scale',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
      helperText: '控制模型对提示词的贴合度 (0-1)',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-kling-v2-1-pro': [
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: '5',
      options: [
        { label: '5 秒 (50 Credits)', value: '5' },
        { label: '10 秒 (100 Credits)', value: '10' },
      ],
      helperText: '选择生成视频的时长',
    },
    {
      key: 'negative_prompt',
      label: '负面提示词',
      type: 'textarea',
      placeholder: 'blur, distort, and low quality',
      helperText: '可选。排除不想要的元素，最多500字符',
    },
    {
      key: 'cfg_scale',
      label: 'CFG Scale',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
      helperText: '控制模型对提示词的贴合度 (0-1)',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-kling-v2-5-turbo-pro': [
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: '5',
      options: [
        { label: '5 秒 (42 Credits)', value: '5' },
        { label: '10 秒 (84 Credits)', value: '10' },
      ],
      helperText: '选择生成视频的时长',
    },
    {
      key: 'negative_prompt',
      label: '负面提示词',
      type: 'textarea',
      placeholder: 'blur, distort, and low quality',
      helperText: '可选。排除不想要的元素，最多2496字符',
    },
    {
      key: 'cfg_scale',
      label: 'CFG Scale',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
      helperText: '控制模型对提示词的贴合度 (0-1)',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-kling-v2-5-turbo-text-to-video-pro': [
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: '5',
      options: [
        { label: '5 秒 (42 Credits)', value: '5' },
        { label: '10 秒 (84 Credits)', value: '10' },
      ],
      helperText: '选择生成视频的时长',
    },
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 (横屏)', value: '16:9' },
        { label: '9:16 (竖屏)', value: '9:16' },
        { label: '1:1 (正方形)', value: '1:1' },
      ],
      helperText: '选择视频的宽高比',
    },
    {
      key: 'negative_prompt',
      label: '负面提示词',
      type: 'textarea',
      placeholder: 'blur, distort, and low quality',
      helperText: '可选。排除不想要的元素，最多2500字符',
    },
    {
      key: 'cfg_scale',
      label: 'CFG Scale',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.1,
      defaultValue: 0.5,
      helperText: '控制模型对提示词的贴合度 (0-1)',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-wan-2-2-a14b-text-to-video-turbo': [
    {
      key: 'resolution',
      label: '视频分辨率',
      type: 'select',
      defaultValue: '720p',
      options: [
        { label: '720p (12 Credits)', value: '720p' },
        { label: '580p (9 Credits)', value: '580p' },
        { label: '480p (6 Credits)', value: '480p' },
      ],
      helperText: '选择视频的分辨率，不同分辨率费用不同',
    },
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 (横屏)', value: '16:9' },
        { label: '9:16 (竖屏)', value: '9:16' },
        { label: '1:1 (正方形)', value: '1:1' },
      ],
      helperText: '选择视频的宽高比',
    },
    {
      key: 'enable_prompt_expansion',
      label: '启用提示词扩展',
      type: 'boolean',
      defaultValue: false,
      helperText: '使用 LLM 自动扩展和优化提示词，提高生成质量',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      min: 0,
      max: 2147483647,
      step: 1,
      placeholder: '0-2147483647',
      helperText: '可选。设置种子以生成可重现的视频结果',
    },
    {
      key: 'acceleration',
      label: '加速模式',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: '不加速', value: 'none' },
        { label: '常规加速', value: 'regular' },
      ],
      helperText: '选择视频生成的加速模式',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-wan-2-2-a14b-image-to-video-turbo': [
    {
      key: 'resolution',
      label: '视频分辨率',
      type: 'select',
      defaultValue: '720p',
      options: [
        { label: '720p (12 Credits)', value: '720p' },
        { label: '580p (9 Credits)', value: '580p' },
        { label: '480p (6 Credits)', value: '480p' },
      ],
      helperText: '选择视频的分辨率，不同分辨率费用不同',
    },
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: 'auto',
      options: [
        { label: '自动 (根据输入图片)', value: 'auto' },
        { label: '16:9 (横屏)', value: '16:9' },
        { label: '9:16 (竖屏)', value: '9:16' },
        { label: '1:1 (正方形)', value: '1:1' },
      ],
      helperText: '选择视频的宽高比，如选择auto则自动根据输入图片确定',
    },
    {
      key: 'enable_prompt_expansion',
      label: '启用提示词扩展',
      type: 'boolean',
      defaultValue: false,
      helperText: '使用 LLM 自动扩展和优化提示词，提高生成质量',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      min: 0,
      max: 2147483647,
      step: 1,
      placeholder: '0-2147483647',
      helperText: '可选。设置种子以生成可重现的视频结果',
    },
    {
      key: 'acceleration',
      label: '加速模式',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: '不加速', value: 'none' },
        { label: '常规加速', value: 'regular' },
      ],
      helperText: '选择视频生成的加速模式',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-wan-2-5-text-to-video': [
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 (横屏)', value: '16:9' },
        { label: '9:16 (竖屏)', value: '9:16' },
        { label: '1:1 (正方形)', value: '1:1' },
      ],
      helperText: '选择视频的宽高比',
    },
    {
      key: 'resolution',
      label: '视频分辨率',
      type: 'select',
      defaultValue: '1080p',
      options: [
        { label: '720p (12 Credits/秒)', value: '720p' },
        { label: '1080p (20 Credits/秒)', value: '1080p' },
      ],
      helperText: '选择视频的分辨率，定价按每秒计费',
    },
    {
      key: 'negative_prompt',
      label: '负面提示词',
      type: 'textarea',
      placeholder: '描述想要避免的内容...',
      helperText: '可选。描述不想要的元素，最多500字符',
    },
    {
      key: 'enable_prompt_expansion',
      label: '启用提示词扩展',
      type: 'boolean',
      defaultValue: true,
      helperText: '使用 LLM 重写提示词。对短提示词效果更好，但会增加处理时间',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      min: 0,
      step: 1,
      placeholder: '留空则随机',
      helperText: '可选。设置种子以生成可重现的视频结果',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-wan-2-5-image-to-video': [
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: '5',
      options: [
        { label: '5 秒', value: '5' },
        { label: '10 秒', value: '10' },
      ],
      helperText: '选择视频时长',
    },
    {
      key: 'resolution',
      label: '视频分辨率',
      type: 'select',
      defaultValue: '1080p',
      options: [
        { label: '720p (12 Credits/秒)', value: '720p' },
        { label: '1080p (20 Credits/秒)', value: '1080p' },
      ],
      helperText: '选择视频的分辨率，定价按每秒计费',
    },
    {
      key: 'negative_prompt',
      label: '负面提示词',
      type: 'textarea',
      placeholder: '描述想要避免的内容...',
      helperText: '可选。描述不想要的元素，最多500字符',
    },
    {
      key: 'enable_prompt_expansion',
      label: '启用提示词扩展',
      type: 'boolean',
      defaultValue: true,
      helperText: '使用 LLM 重写提示词。对短提示词效果更好，但会增加处理时间',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      min: 0,
      step: 1,
      placeholder: '留空则随机',
      helperText: '可选。设置种子以生成可重现的视频结果',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-bytedance-v1-pro-text-to-video': [
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '21:9 (超宽屏)', value: '21:9' },
        { label: '16:9 (横屏)', value: '16:9' },
        { label: '4:3 (标准)', value: '4:3' },
        { label: '1:1 (正方形)', value: '1:1' },
        { label: '3:4 (竖屏)', value: '3:4' },
        { label: '9:16 (手机竖屏)', value: '9:16' },
      ],
      helperText: '选择视频的宽高比',
    },
    {
      key: 'resolution',
      label: '视频分辨率',
      type: 'select',
      defaultValue: '720p',
      options: [
        { label: '480p (快速)', value: '480p' },
        { label: '720p (平衡)', value: '720p' },
        { label: '1080p (高质量)', value: '1080p' },
      ],
      helperText: '480p更快，720p平衡，1080p高质量',
    },
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: '5',
      options: [
        { label: '5 秒', value: '5' },
        { label: '10 秒', value: '10' },
      ],
      helperText: '选择生成视频的时长',
    },
    {
      key: 'camera_fixed',
      label: '固定镜头',
      type: 'boolean',
      defaultValue: false,
      helperText: '开启后将固定摄像机位置，不进行镜头运动',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      min: -1,
      max: 2147483647,
      step: 1,
      defaultValue: -1,
      placeholder: '-1表示随机',
      helperText: '设置种子以生成可重现的视频结果，-1表示随机',
    },
    {
      key: 'enable_safety_checker',
      label: '启用内容安全检查',
      type: 'boolean',
      defaultValue: true,
      helperText: '在Playground中始终启用。仅可通过API设置false禁用',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-bytedance-v1-pro-image-to-video': [
    {
      key: 'resolution',
      label: '视频分辨率',
      type: 'select',
      defaultValue: '720p',
      options: [
        { label: '480p (快速)', value: '480p' },
        { label: '720p (平衡)', value: '720p' },
        { label: '1080p (高质量)', value: '1080p' },
      ],
      helperText: '480p更快，720p平衡，1080p高质量',
    },
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: '5',
      options: [
        { label: '5 秒', value: '5' },
        { label: '10 秒', value: '10' },
      ],
      helperText: '选择生成视频的时长',
    },
    {
      key: 'camera_fixed',
      label: '固定镜头',
      type: 'boolean',
      defaultValue: false,
      helperText: '开启后将固定摄像机位置，不进行镜头运动',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      min: -1,
      max: 2147483647,
      step: 1,
      defaultValue: -1,
      placeholder: '-1表示随机',
      helperText: '设置种子以生成可重现的视频结果，-1表示随机',
    },
    {
      key: 'enable_safety_checker',
      label: '启用内容安全检查',
      type: 'boolean',
      defaultValue: true,
      helperText: '在Playground中始终启用。仅可通过API设置false禁用',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-runway': [
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: 5,
      options: [
        { label: '5 秒', value: 5 },
        { label: '10 秒 (仅720p)', value: 10 },
      ],
      helperText: '选择视频时长。注意：10秒仅支持720p',
    },
    {
      key: 'quality',
      label: '视频质量',
      type: 'select',
      defaultValue: '720p',
      options: [
        { label: '720p', value: '720p' },
        { label: '1080p (仅5秒)', value: '1080p' },
      ],
      helperText: '选择视频质量。注意：1080p仅支持5秒',
    },
    {
      key: 'aspectRatio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 (横屏)', value: '16:9' },
        { label: '4:3 (标准)', value: '4:3' },
        { label: '1:1 (正方形)', value: '1:1' },
        { label: '3:4 (竖屏)', value: '3:4' },
        { label: '9:16 (手机竖屏)', value: '9:16' },
      ],
      helperText: '文生视频必需。图生视频时由图片自动确定',
    },
    {
      key: 'waterMark',
      label: '水印文字',
      type: 'string',
      placeholder: '留空表示无水印',
      helperText: '可选。设置视频右下角的水印文字',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  'kie-runway-extend': [
    {
      key: 'parentTaskId',
      label: '原视频任务ID',
      type: 'string',
      placeholder: '例如：xxx-xxx-xxx',
      helperText: '必需。需要扩展的原视频任务ID（来自Runway生成任务的taskId）',
    },
    {
      key: 'quality',
      label: '视频质量',
      type: 'select',
      defaultValue: '720p',
      options: [
        { label: '720p', value: '720p' },
        { label: '1080p', value: '1080p' },
      ],
      helperText: '选择视频质量。扩展视频固定为5秒',
    },
    {
      key: 'waterMark',
      label: '水印文字',
      type: 'string',
      placeholder: '留空表示无水印',
      helperText: '可选。设置视频右下角的水印文字',
    },
    {
      key: 'callBackUrl',
      label: '回调通知 URL',
      type: 'string',
      placeholder: 'https://your-domain.com/api/callback',
      helperText: '可选。任务完成时系统将向此URL发送POST请求通知',
    },
  ],

  // ==================== TuZi ====================

  'tuzi-kling': [
    {
      key: 'duration',
      label: '视频时长',
      type: 'select',
      defaultValue: 5,
      options: [
        { label: '5 秒', value: 5 },
        { label: '10 秒', value: 10 },
      ],
    },
    {
      key: 'mode',
      label: '生成模式',
      type: 'select',
      defaultValue: 'pro',
      options: [
        { label: 'Standard (标准)', value: 'standard' },
        { label: 'Pro (专业)', value: 'pro' },
      ],
    },
  ],

  'tuzi-midjourney': [
    {
      key: 'botType',
      label: '模型类型',
      type: 'select',
      defaultValue: 'MID_JOURNEY',
      options: [
        { label: 'Midjourney', value: 'MID_JOURNEY' },
        { label: 'Niji Journey', value: 'NIJI_JOURNEY' },
      ],
    },
    {
      key: 'noStorage',
      label: '返回官方链接',
      type: 'boolean',
      defaultValue: false,
      helperText: '开启后返回 Midjourney 官方链接',
    },
  ],

  // ==================== OpenAI ====================

  'openai-dalle-3': [
    {
      key: 'size',
      label: '图片尺寸',
      type: 'select',
      defaultValue: '1024x1024',
      options: [
        { label: '1024x1024 (正方形)', value: '1024x1024' },
        { label: '1792x1024 (横向)', value: '1792x1024' },
        { label: '1024x1792 (纵向)', value: '1024x1792' },
      ],
      helperText: 'DALL-E 3 支持的图片尺寸',
    },
    {
      key: 'quality',
      label: '图片质量',
      type: 'select',
      defaultValue: 'standard',
      options: [
        { label: 'Standard (标准)', value: 'standard' },
        { label: 'HD (高清)', value: 'hd' },
      ],
      helperText: 'HD质量会消耗更多配额',
    },
    {
      key: 'style',
      label: '风格',
      type: 'select',
      defaultValue: 'vivid',
      options: [
        { label: 'Vivid (鲜艳)', value: 'vivid' },
        { label: 'Natural (自然)', value: 'natural' },
      ],
      helperText: 'Vivid风格更加戏剧化，Natural更加真实',
    },
  ],

  // ==================== Replicate ====================

  'replicate-flux-pro': [
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: '1:1',
      options: [
        { label: '1:1', value: '1:1' },
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '4:3', value: '4:3' },
        { label: '3:4', value: '3:4' },
      ],
    },
    {
      key: 'num_outputs',
      label: '输出数量',
      type: 'number',
      min: 1,
      max: 4,
      step: 1,
      defaultValue: 1,
      helperText: '生成图片的数量 (1-4)',
    },
    {
      key: 'seed',
      label: 'Seed',
      type: 'number',
      helperText: '可选，用于复现结果的随机种子',
    },
    {
      key: 'output_format',
      label: '输出格式',
      type: 'select',
      defaultValue: 'webp',
      options: [
        { label: 'WebP', value: 'webp' },
        { label: 'JPEG', value: 'jpg' },
        { label: 'PNG', value: 'png' },
      ],
    },
    {
      key: 'output_quality',
      label: '输出质量',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 80,
      helperText: 'JPEG/WebP 质量 (0-100)',
    },
  ],

  'replicate-minimax': [
    {
      key: 'duration',
      label: '视频时长 (秒)',
      type: 'number',
      defaultValue: 8,
      min: 1,
      max: 30,
      helperText: '生成视频的时长 (1-30秒)',
    },
    {
      key: 'aspect_ratio',
      label: '画面比例',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9', value: '16:9' },
        { label: '9:16', value: '9:16' },
        { label: '1:1', value: '1:1' },
      ],
    },
    {
      key: 'seed',
      label: 'Seed',
      type: 'number',
      helperText: '可选，用于复现结果的随机种子',
    },
  ],

  // ==================== ElevenLabs ====================

  'elevenlabs-tts-v3': [
    {
      key: 'voice_id',
      label: '预制语音',
      type: 'select',
      defaultValue: 'UgBBYS2sOqTuMpoF3BR0',
      options: [
        { label: 'Mark - 男性英语', value: 'UgBBYS2sOqTuMpoF3BR0' },
        { label: 'Zara - 女性英语', value: 'jqcCZkN6Knx8BJ5TBdYR' },
        { label: 'Allison - 女性英语', value: 'xctasy8XvGp2cVO9HL9k' },
      ],
      helperText: '选择预制语音或使用下方自定义 Voice ID',
    },
    {
      key: 'custom_voice_id',
      label: '自定义 Voice ID',
      type: 'string',
      placeholder: '输入 ElevenLabs Voice ID（可选）',
      helperText: '如果填写，将覆盖上方的预制语音选择。可从 ElevenLabs 语音库获取',
    },
    {
      key: 'stability',
      label: 'Stability 稳定性',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.5,
      helperText: '数值越高语音越稳定一致 (0-1)，越低越富有表现力和变化',
    },
    {
      key: 'similarity_boost',
      label: 'Similarity Boost 相似度增强',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.75,
      helperText: '数值越高越接近原始语音特征 (0-1)',
    },
    {
      key: 'style',
      label: 'Style 风格强度',
      type: 'number',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.5,
      helperText: 'v3 模型专属参数，控制语音表现风格的强度 (0-1)',
    },
    {
      key: 'use_speaker_boost',
      label: 'Speaker Boost 扬声器增强',
      type: 'boolean',
      defaultValue: true,
      helperText: '增强语音清晰度和质量，推荐开启',
    },
    {
      key: 'target_language',
      label: '目标语言提示',
      type: 'select',
      defaultValue: 'en',
      options: [
        { label: 'English 英语', value: 'en' },
        { label: '中文 Chinese', value: 'zh' },
        { label: '日本語 Japanese', value: 'ja' },
        { label: 'Español Spanish', value: 'es' },
        { label: 'Français French', value: 'fr' },
        { label: 'Deutsch German', value: 'de' },
        { label: '한국어 Korean', value: 'ko' },
        { label: 'Português Portuguese', value: 'pt' },
        { label: 'Italiano Italian', value: 'it' },
        { label: 'Русский Russian', value: 'ru' },
        { label: 'العربية Arabic', value: 'ar' },
        { label: 'हिन्दी Hindi', value: 'hi' },
      ],
      helperText: '选择目标语言以获得最佳效果。v3 支持 70+ 语言，请确保语音支持该语言',
    },
  ],

  // ==================== Jimeng AI (火山引擎即梦AI) ====================

  'jimeng-text-to-image-v21': [
    {
      key: 'width',
      label: '图片宽度',
      type: 'select',
      defaultValue: 512,
      options: [
        { label: '256', value: 256 },
        { label: '384', value: 384 },
        { label: '512 (推荐)', value: 512 },
        { label: '640', value: 640 },
        { label: '768', value: 768 },
      ],
      helperText: '生成图像的宽度（像素）。建议512，与512差距过大会影响效果和延迟',
    },
    {
      key: 'height',
      label: '图片高度',
      type: 'select',
      defaultValue: 512,
      options: [
        { label: '256', value: 256 },
        { label: '384', value: 384 },
        { label: '512 (推荐)', value: 512 },
        { label: '640', value: 640 },
        { label: '768', value: 768 },
      ],
      helperText: '生成图像的高度（像素）。建议512，与512差距过大会影响效果和延迟',
    },
    {
      key: 'use_sr',
      label: '启用超分',
      type: 'boolean',
      defaultValue: true,
      helperText: '开启后图片尺寸翻倍（如512x512变为1024x1024），但延迟会增加',
    },
    {
      key: 'use_pre_llm',
      label: '提示词扩写',
      type: 'boolean',
      defaultValue: true,
      helperText: 'Prompt较短时建议开启，较长时建议关闭以保证多样性',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      defaultValue: -1,
      min: -1,
      max: 2147483647,
      helperText: '固定种子可生成相似图片。-1表示随机',
    },
    {
      key: 'add_logo',
      label: '添加水印',
      type: 'boolean',
      defaultValue: false,
      helperText: '是否在生成的图片上添加水印',
    },
    {
      key: 'logo_position',
      label: '水印位置',
      type: 'select',
      defaultValue: 0,
      options: [
        { label: '右下角', value: 0 },
        { label: '左下角', value: 1 },
        { label: '左上角', value: 2 },
        { label: '右上角', value: 3 },
      ],
      helperText: '水印的位置（需要启用水印）',
    },
    {
      key: 'logo_language',
      label: '水印语言',
      type: 'select',
      defaultValue: 0,
      options: [
        { label: '中文（AI生成）', value: 0 },
        { label: '英文（Generated by AI）', value: 1 },
      ],
      helperText: '水印的语言（需要启用水印）',
    },
    {
      key: 'logo_opacity',
      label: '水印不透明度',
      type: 'number',
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.1,
      helperText: '水印的不透明度，1表示完全不透明（需要启用水印）',
    },
    {
      key: 'logo_text_content',
      label: '自定义水印文字',
      type: 'string',
      defaultValue: '',
      placeholder: '输入自定义水印内容',
      helperText: '自定义水印文字内容（需要启用水印）',
    },
  ],

  // 即梦AI 4.0
  'jimeng-40': [
    {
      key: 'size',
      label: '图片面积',
      type: 'select',
      defaultValue: 4194304,
      options: [
        { label: '1K (1024x1024)', value: 1048576 },
        { label: '2K (2048x2048) 推荐', value: 4194304 },
        { label: '3K (3072x3072)', value: 9437184 },
        { label: '4K (4096x4096)', value: 16777216 },
      ],
      helperText: '生成图片的面积，模型会根据prompt智能判断宽高比。推荐2K以上避免人脸和文字异常',
    },
    {
      key: 'width',
      label: '图片宽度（高级）',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 6198,
      helperText: '手动指定宽度（需同时指定高度）。留空则使用面积自动计算',
    },
    {
      key: 'height',
      label: '图片高度（高级）',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 4096,
      helperText: '手动指定高度（需同时指定宽度）。留空则使用面积自动计算',
    },
    {
      key: 'scale',
      label: '文本影响程度',
      type: 'number',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      helperText: '值越大文本影响越大，输入图影响越小（图生图时有效）',
    },
    {
      key: 'force_single',
      label: '强制单图输出',
      type: 'boolean',
      defaultValue: false,
      helperText: '强制只输出1张图。开启可减少延迟和成本',
    },
    {
      key: 'min_ratio',
      label: '最小宽高比',
      type: 'number',
      defaultValue: 0.33,
      min: 0.0625,
      max: 16,
      step: 0.01,
      helperText: '生成图片的宽/高 ≥ 此值（默认1/3）',
    },
    {
      key: 'max_ratio',
      label: '最大宽高比',
      type: 'number',
      defaultValue: 3,
      min: 0.0625,
      max: 16,
      step: 0.01,
      helperText: '生成图片的宽/高 ≤ 此值（默认3）',
    },
  ],

  // 即梦AI 视频生成3.0 1080P (融合: 文生视频、图生视频-首帧、图生视频-首尾帧)
  'jimeng-video-30': [
    {
      key: 'frames',
      label: '视频时长',
      type: 'select',
      defaultValue: 121,
      options: [
        { label: '5秒 (121帧)', value: 121 },
        { label: '10秒 (241帧)', value: 241 },
      ],
      helperText: '选择生成视频的时长。121帧约5秒，241帧约10秒',
    },
    {
      key: 'seed',
      label: '随机种子',
      type: 'number',
      defaultValue: -1,
      min: -1,
      max: 2147483647,
      helperText: '固定种子可生成相似视频。-1表示随机',
    },
    {
      key: 'aspect_ratio',
      label: '画面比例（仅文生视频）',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 横屏', value: '16:9' },
        { label: '4:3 标准', value: '4:3' },
        { label: '1:1 正方形', value: '1:1' },
        { label: '3:4 竖版', value: '3:4' },
        { label: '9:16 手机竖屏', value: '9:16' },
        { label: '21:9 超宽屏', value: '21:9' },
      ],
      helperText: '仅文生视频支持。图生视频时由输入图片决定比例',
    },
  ],
}

/**
 * 获取模型的参数配置
 */
export function getModelParameters(modelSlug: string): ParameterField[] {
  return MODEL_PARAMETERS[modelSlug] || []
}

/**
 * 检查模型是否有参数配置
 */
export function hasModelParameters(modelSlug: string): boolean {
  return modelSlug in MODEL_PARAMETERS && MODEL_PARAMETERS[modelSlug]!.length > 0
}
