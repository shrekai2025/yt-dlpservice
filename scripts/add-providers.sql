-- AI 生成供应商配置初始化脚本
-- 使用方法: sqlite3 data/app.db < scripts/add-providers.sql

-- 1. FLUX Pro (图像生成)
INSERT OR REPLACE INTO api_providers (
  id, name, modelIdentifier, adapterName, type, provider,
  apiEndpoint, apiFlavor, encryptedAuthKey,
  isActive, uploadToS3, s3PathPrefix,
  createdAt, updatedAt
) VALUES (
  'flux-pro-001',
  'FLUX Pro',
  'flux-pro',
  'FluxAdapter',
  'image',
  'TuZi',
  'https://api.tu-zi.com/flux/pro',
  'openai',
  'REPLACE_WITH_YOUR_TUZI_API_KEY',
  1,
  0,
  'flux-images',
  datetime('now'),
  datetime('now')
);

-- 2. FLUX Dev (图像生成)
INSERT OR REPLACE INTO api_providers (
  id, name, modelIdentifier, adapterName, type, provider,
  apiEndpoint, apiFlavor, encryptedAuthKey,
  isActive, uploadToS3, s3PathPrefix,
  createdAt, updatedAt
) VALUES (
  'flux-dev-001',
  'FLUX Dev',
  'flux-dev',
  'FluxAdapter',
  'image',
  'TuZi',
  'https://api.tu-zi.com/flux/dev',
  'openai',
  'REPLACE_WITH_YOUR_TUZI_API_KEY',
  1,
  0,
  'flux-images',
  datetime('now'),
  datetime('now')
);

-- 3. Kling v1 (视频生成)
INSERT OR REPLACE INTO api_providers (
  id, name, modelIdentifier, adapterName, type, provider,
  apiEndpoint, apiFlavor, encryptedAuthKey,
  isActive, uploadToS3, s3PathPrefix,
  createdAt, updatedAt
) VALUES (
  'kling-v1-001',
  'Kling Video v1',
  'kling-v1',
  'KlingAdapter',
  'video',
  'TuZi',
  'https://api.tu-zi.com/kling/v1',
  'custom',
  'REPLACE_WITH_YOUR_TUZI_API_KEY',
  1,
  0,
  'kling-videos',
  datetime('now'),
  datetime('now')
);

-- 4. Pollo Veo3 (视频生成)
INSERT OR REPLACE INTO api_providers (
  id, name, modelIdentifier, adapterName, type, provider,
  apiEndpoint, apiFlavor, encryptedAuthKey,
  isActive, uploadToS3, s3PathPrefix,
  createdAt, updatedAt
) VALUES (
  'pollo-veo3-001',
  'Pollo Veo3',
  'pollo-veo3',
  'PolloAdapter',
  'video',
  'Pollo',
  'https://api.pollo.ai/v1/generations',
  'custom',
  'REPLACE_WITH_YOUR_POLLO_API_KEY',
  1,
  0,
  'pollo-videos',
  datetime('now'),
  datetime('now')
);

-- 5. Replicate Minimax (视频生成)
INSERT OR REPLACE INTO api_providers (
  id, name, modelIdentifier, adapterName, type, provider,
  apiEndpoint, apiFlavor, encryptedAuthKey, modelVersion,
  isActive, uploadToS3, s3PathPrefix,
  createdAt, updatedAt
) VALUES (
  'replicate-minimax-001',
  'Replicate Minimax',
  'replicate-minimax',
  'ReplicateAdapter',
  'video',
  'Replicate',
  'https://api.replicate.com/v1',
  'custom',
  'REPLACE_WITH_YOUR_REPLICATE_API_KEY',
  'minimax/video-01',
  1,
  0,
  'replicate-videos',
  datetime('now'),
  datetime('now')
);

-- 6. Tuzi OpenAI (图像生成)
INSERT OR REPLACE INTO api_providers (
  id, name, modelIdentifier, adapterName, type, provider,
  apiEndpoint, apiFlavor, encryptedAuthKey,
  isActive, uploadToS3, s3PathPrefix,
  createdAt, updatedAt
) VALUES (
  'tuzi-openai-001',
  'Tuzi OpenAI DALL-E',
  'tuzi-openai-dalle',
  'TuziOpenAIAdapter',
  'image',
  'TuZi',
  'https://api.tu-zi.com/v1',
  'openai',
  'REPLACE_WITH_YOUR_TUZI_API_KEY',
  1,
  0,
  'tuzi-images',
  datetime('now'),
  datetime('now')
);

-- 7. Tuzi Midjourney Imagine (图像生成)
INSERT OR REPLACE INTO api_providers (
  id, name, modelIdentifier, adapterName, type, provider,
  apiEndpoint, apiFlavor, encryptedAuthKey,
  isActive, uploadToS3, s3PathPrefix,
  createdAt, updatedAt
) VALUES (
  'tuzi-midjourney-imagine-001',
  'Tuzi Midjourney Imagine',
  'mj_relax_imagine',
  'TuziMidjourneyImagineAdapter',
  'image',
  'TuZi',
  'https://api.tu-zi.com',
  'custom',
  'REPLACE_WITH_YOUR_TUZI_API_KEY',
  1,
  0,
  'midjourney-images',
  datetime('now'),
  datetime('now')
);

-- 8. Tuzi Midjourney Video (视频生成)
INSERT OR REPLACE INTO api_providers (
  id, name, modelIdentifier, adapterName, type, provider,
  apiEndpoint, apiFlavor, encryptedAuthKey,
  isActive, uploadToS3, s3PathPrefix,
  createdAt, updatedAt
) VALUES (
  'tuzi-midjourney-video-001',
  'Tuzi Midjourney Video',
  'mj_relax_video',
  'TuziMidjourneyVideoAdapter',
  'video',
  'TuZi',
  'https://api.tu-zi.com',
  'custom',
  'REPLACE_WITH_YOUR_TUZI_API_KEY',
  1,
  0,
  'midjourney-videos',
  datetime('now'),
  datetime('now')
);

-- 查看添加结果
SELECT
  name,
  modelIdentifier,
  type,
  provider,
  CASE
    WHEN encryptedAuthKey LIKE 'REPLACE_WITH%' THEN '❌ 需要配置'
    ELSE '✅ 已配置'
  END as api_key_status,
  CASE WHEN isActive = 1 THEN '✅' ELSE '❌' END as active
FROM api_providers
ORDER BY type, name;
