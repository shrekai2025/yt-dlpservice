-- 添加即梦AI 4.0图像生成和视频生成3.0模型到数据库
-- 创建时间: 2025-10-23

-- 1. 添加即梦AI 4.0 图像生成模型
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
  'jimeng_40',
  '即梦AI 4.0',
  'jimeng-40',
  '火山引擎即梦AI 4.0 - 支持文生图、图生图、图像编辑、多图组合。最多输入10张图片，输出1-15张图片，支持4K超高清',
  'jimeng_ai_provider_001',
  'IMAGE',
  'Jimeng40Adapter',
  '["text-input", "image-input"]',
  '["image-output"]',
  '["high-quality", "4k", "batch-output", "multi-input", "composite-editing"]',
  '["text-to-image", "image-to-image", "image-editing", "multi-image-composition"]',
  1,     -- 激活状态
  2,     -- 排序顺序
  datetime('now'),
  datetime('now')
);

-- 2. 添加即梦AI 视频生成3.0 1080P模型（融合3种模式）
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
  'jimeng_video_30',
  '即梦AI - 视频生成3.0 1080P',
  'jimeng-video-30',
  '火山引擎即梦AI视频生成3.0 1080P - 智能融合三种模式：文生视频、图生视频(首帧)、图生视频(首尾帧)。系统根据输入图片数量自动选择模式：无图片=文生视频，1张图=首帧生成，2张图=首尾帧生成。支持5秒/10秒高清输出',
  'jimeng_ai_provider_001',
  'VIDEO',
  'JimengVideo30Adapter',
  '["text-input", "image-input"]',
  '["video-output"]',
  '["1080p", "high-quality", "flexible-duration", "auto-mode-detection"]',
  '["text-to-video", "image-to-video", "first-frame", "first-tail-frames"]',
  1,     -- 激活状态
  3,     -- 排序顺序
  datetime('now'),
  datetime('now')
);

-- 验证插入结果
SELECT 'Jimeng 4.0 Model added:' as status, * FROM ai_models WHERE slug = 'jimeng-40';
SELECT 'Jimeng Video 3.0 Model added:' as status, * FROM ai_models WHERE slug = 'jimeng-video-30';
