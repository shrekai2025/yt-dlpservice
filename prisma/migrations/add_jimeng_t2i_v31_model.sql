-- 添加即梦AI 文生图3.1模型到数据库
-- 创建时间: 2025-01-26
-- 描述: 文生图3.1是即梦同源的文生图能力升级版本，在画面美感塑造、风格精准多样及画面细节丰富度方面提升显著

-- 添加即梦AI 文生图3.1模型
-- 注意: 使用子查询动态获取即梦AI provider的ID
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
SELECT
  'jimeng_t2i_v31',
  '即梦AI - 文生图3.1',
  'jimeng-text-to-image-v31',
  '火山引擎即梦AI文生图3.1 - 画面效果呈现升级，在画面美感塑造、风格精准多样及画面细节丰富度方面提升显著，同时兼具文字响应效果。支持标清1K(1328×1328)和高清2K(2048×2048)，宽高比1:3到3:1',
  (SELECT id FROM ai_providers WHERE slug = 'jimeng' LIMIT 1),  -- 动态获取即梦provider ID
  'IMAGE',
  'JimengTextToImageV31Adapter',
  '["text-input"]',
  '["image-output"]',
  '["high-quality", "2k", "text-enhancement", "aesthetic-upgrade", "style-precision"]',
  '["text-to-image"]',
  1,     -- 激活状态
  4,     -- 排序顺序（在4.0、2.1、Video 3.0之后）
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM ai_models WHERE slug = 'jimeng-text-to-image-v31'
);

-- 验证插入结果
SELECT 'Jimeng T2I v3.1 Model added:' as status, * FROM ai_models WHERE slug = 'jimeng-text-to-image-v31';
