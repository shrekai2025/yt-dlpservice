-- 更新即梦AI模型的输入输出能力配置
-- 创建时间: 2025-01-26
-- 目的: 添加 inputCapabilities 和 outputCapabilities 以便前端正确显示图片上传控件

-- 1. 更新即梦AI 4.0模型
-- 支持文生图、图生图、图像编辑、多图组合
UPDATE ai_models
SET
  inputCapabilities = '["text-input", "image-input"]',
  outputCapabilities = '["image-output"]',
  updatedAt = datetime('now')
WHERE slug = 'ai-jimeng-40';

-- 2. 更新即梦AI 2.1文生图模型
-- 仅支持文生图
UPDATE ai_models
SET
  inputCapabilities = '["text-input"]',
  outputCapabilities = '["image-output"]',
  updatedAt = datetime('now')
WHERE slug = 'ai-jimeng-21-';

-- 3. 更新即梦AI Video 3.0模型
-- 支持文生视频、图生视频（首帧）、图生视频（首尾帧）
UPDATE ai_models
SET
  inputCapabilities = '["text-input", "image-input"]',
  outputCapabilities = '["video-output"]',
  updatedAt = datetime('now')
WHERE slug = 'ai-jimeng-video-30';

-- 验证更新结果
SELECT
  slug,
  name,
  inputCapabilities,
  outputCapabilities
FROM ai_models
WHERE slug LIKE '%jimeng%'
ORDER BY sortOrder;
