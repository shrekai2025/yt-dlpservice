-- 更新模型的 inputCapabilities 字段
-- 根据各个模型的 API 文档，标记哪些模型支持图片输入

-- IMAGE 模型 - 图片编辑类（需要图片输入）
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-flux-kontext'; -- Flux Kontext 支持图生图
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-nano-banana-edit'; -- Nano Banana Edit 需要图片输入
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-nano-banana-upscale'; -- Nano Banana Upscale 需要图片输入
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-qwen-image-edit'; -- Qwen Image Edit 需要图片输入
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-seedream-v4-edit'; -- SeeDream V4 Edit 需要图片输入
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-4o-image'; -- Kie 4o 支持图生图

-- VIDEO 模型 - 图生视频（需要图片输入）
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug LIKE '%image-to-video%'; -- 所有图生视频模型
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-kling-v21-master-'; -- Kling v2.1 Master 图生视频
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-kling-v21-pro'; -- Kling v2.1 Pro 支持图生视频
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-bytedance-v1-pro-'; -- ByteDance V1 Pro 图生视频
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-sora-2-'; -- Sora 2 图生视频
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-sora-2-pro-'; -- Sora 2 Pro 图生视频
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-wan-25-'; -- Wan 2.5 图生视频
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-wan-22-turbo'; -- Wan 2.2 图生视频 Turbo

-- VIDEO 模型 - 视频扩展（需要视频输入，但通常也接受图片）
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-runway-extend'; -- Runway Extend
UPDATE ai_models SET inputCapabilities = '["image-input"]' WHERE slug = 'kie-veo-31-extend'; -- Veo 3.1 Extend

-- 验证更新结果
SELECT name, slug, inputCapabilities FROM ai_models WHERE inputCapabilities IS NOT NULL AND inputCapabilities != '' ORDER BY outputType, name;
