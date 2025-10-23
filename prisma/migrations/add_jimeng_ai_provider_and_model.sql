-- 添加即梦AI供应商和模型到数据库
-- 创建时间: 2025-10-23

-- 1. 添加即梦AI供应商
INSERT INTO ai_providers (
  id,
  name,
  slug,
  description,
  platformId,
  apiEndpoint,
  apiKey,
  uploadToS3,
  s3PathPrefix,
  isActive,
  sortOrder,
  createdAt,
  updatedAt
)
VALUES (
  'jimeng_ai_provider_001',
  '即梦AI (火山引擎)',
  'jimeng',
  '火山引擎即梦AI - 高质量文生图、视频生成服务',
  NULL,
  'https://visual.volcengineapi.com',
  NULL,  -- API Key应该通过环境变量 AI_PROVIDER_JIMENG_API_KEY 设置
  1,     -- 开启S3上传
  'ai-generation/jimeng/',
  1,     -- 激活状态
  45,    -- 排序顺序
  datetime('now'),
  datetime('now')
);

-- 2. 添加即梦AI文生图2.1模型
INSERT INTO ai_models (
  id,
  name,
  slug,
  description,
  providerId,
  outputType,
  adapterName,
  inputCapabilities,
  outputCapabilities,
  featureTags,
  functionTags,
  isActive,
  sortOrder,
  createdAt,
  updatedAt
)
VALUES (
  'jimeng_text_to_image_v21',
  '即梦AI - 文生图2.1',
  'jimeng-text-to-image-v21',
  '火山引擎即梦AI文生图2.1模型 - 支持中英文提示词、超分、水印等功能。推荐512x512基础尺寸，支持超分至1024x1024',
  'jimeng_ai_provider_001',
  'IMAGE',
  'JimengTextToImageAdapter',
  '["text-input"]',
  '["image-output"]',
  '["high-quality", "fast", "chinese-support", "super-resolution"]',
  '["text-to-image", "prompt-enhancement", "watermark"]',
  1,     -- 激活状态
  1,     -- 排序顺序
  datetime('now'),
  datetime('now')
);

-- 验证插入结果
SELECT 'Provider added:' as status, * FROM ai_providers WHERE slug = 'jimeng';
SELECT 'Model added:' as status, * FROM ai_models WHERE slug = 'jimeng-text-to-image-v21';
