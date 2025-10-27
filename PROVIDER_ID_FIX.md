# Provider ID 修复

## 问题

在添加即梦 T2I v3.1 模型后，前端报错：

```
Inconsistent query result: Field provider is required to return data, got `null` instead.
```

## 根本原因

新添加的模型使用了硬编码的 `providerId = 'jimeng_ai_provider_001'`，但数据库中实际的 provider ID 是 `cmh46yx9x000232xvgjsx9fiy`。

## 解决方案

### 1. 立即修复（已执行）

```sql
-- 更新即梦 T2I v3.1 的 providerId
UPDATE ai_models
SET providerId = (SELECT id FROM ai_providers WHERE slug = 'jimeng' LIMIT 1)
WHERE slug = 'jimeng-text-to-image-v31';
```

### 2. 更新 Migration 文件

已将 `add_jimeng_t2i_v31_model.sql` 更新为使用动态查询：

```sql
INSERT INTO ai_models (...)
SELECT
  'jimeng_t2i_v31',
  '即梦AI - 文生图3.1',
  'jimeng-text-to-image-v31',
  ...,
  (SELECT id FROM ai_providers WHERE slug = 'jimeng' LIMIT 1),  -- 动态获取
  ...
WHERE NOT EXISTS (
  SELECT 1 FROM ai_models WHERE slug = 'jimeng-text-to-image-v31'
);
```

## 验证

```bash
sqlite3 data/app.db "
SELECT
  m.slug,
  m.name,
  p.slug as provider_slug,
  p.name as provider_name
FROM ai_models m
LEFT JOIN ai_providers p ON m.providerId = p.id
WHERE m.slug LIKE '%jimeng%';
"
```

**结果**：
```
ai-jimeng-40             | Jimeng 4.0           | jimeng | 即梦AI ✅
ai-jimeng-21-            | Jimeng 2.1 文生图      | jimeng | 即梦AI ✅
ai-jimeng-video-30       | Jimeng Video 3.0     | jimeng | 即梦AI ✅
jimeng-text-to-image-v31 | 即梦AI - 文生图3.1     | jimeng | 即梦AI ✅
```

## 教训

❌ **不要使用硬编码的 ID**
```sql
-- 错误方式
VALUES ('jimeng_ai_provider_001', ...)
```

✅ **使用子查询动态获取 ID**
```sql
-- 正确方式
SELECT (SELECT id FROM ai_providers WHERE slug = 'jimeng' LIMIT 1), ...
```

## 状态

✅ 已修复 - 刷新浏览器页面即可
