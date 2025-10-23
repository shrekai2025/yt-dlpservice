-- 为AI供应商添加双密钥字段支持
-- 创建时间: 2025-10-23
-- 用途: 支持火山引擎即梦AI等需要AccessKeyID + SecretAccessKey的供应商

-- 添加 apiKeyId 字段（如火山引擎的AccessKeyID）
ALTER TABLE ai_providers ADD COLUMN apiKeyId TEXT;

-- 添加 apiKeySecret 字段（如火山引擎的SecretAccessKey）
ALTER TABLE ai_providers ADD COLUMN apiKeySecret TEXT;

-- 验证新字段
SELECT 'Added dual credential fields successfully' as status;
PRAGMA table_info(ai_providers);
