# AI 生成供应商配置指南

本文档说明如何配置 AI 生成服务供应商的 API 密钥。

## 目录
- [配置方式对比](#配置方式对比)
- [方式1: 环境变量配置（推荐）](#方式1-环境变量配置推荐)
- [方式2: 数据库配置](#方式2-数据库配置)
- [支持的供应商列表](#支持的供应商列表)
- [测试配置](#测试配置)

---

## 配置方式对比

| 配置方式 | 优点 | 缺点 | 适用场景 |
|---------|------|------|---------|
| **环境变量** | ✅ 更安全（不存储在数据库）<br>✅ 易于部署（Docker/云环境）<br>✅ 支持多环境（dev/staging/prod） | ❌ 需要重启服务生效 | 🏆 **推荐用于生产环境** |
| **数据库** | ✅ 无需重启即可更改<br>✅ 支持动态管理多个密钥 | ❌ 密钥存储在数据库中 | 开发环境或需要频繁更换密钥时 |

**优先级：** 环境变量 > 数据库配置

---

## 方式1: 环境变量配置（推荐）

### 1.1 环境变量命名规则

格式：`AI_PROVIDER_{MODEL_IDENTIFIER}_API_KEY`

转换规则：
- 将 `modelIdentifier` 转为大写
- 将连字符 `-` 替换为下划线 `_`

**示例：**
```bash
flux-pro              → AI_PROVIDER_FLUX_PRO_API_KEY
kling-v1              → AI_PROVIDER_KLING_V1_API_KEY
pollo-veo3            → AI_PROVIDER_POLLO_VEO3_API_KEY
replicate-minimax     → AI_PROVIDER_REPLICATE_MINIMAX_API_KEY
tuzi-openai-dalle     → AI_PROVIDER_TUZI_OPENAI_DALLE_API_KEY
```

### 1.2 配置步骤

#### 步骤 1: 编辑 `.env.local` 文件

```bash
# 如果没有 .env.local 文件，先复制模板
cp .env.example .env.local

# 编辑文件
vim .env.local
# 或
nano .env.local
```

#### 步骤 2: 添加你的 API 密钥

在 `.env.local` 文件中添加：

```bash
# ============================================
# AI 生成服务供应商 API 密钥
# ============================================

# FLUX 图像生成 (TuZi平台)
AI_PROVIDER_FLUX_PRO_API_KEY="sk-tuzi-xxxxxxxxxxxxxxxxxxxxxxxx"
AI_PROVIDER_FLUX_DEV_API_KEY="sk-tuzi-xxxxxxxxxxxxxxxxxxxxxxxx"

# Kling 视频生成 (TuZi平台)
AI_PROVIDER_KLING_V1_API_KEY="sk-tuzi-xxxxxxxxxxxxxxxxxxxxxxxx"

# Pollo 视频生成 (Pollo平台)
AI_PROVIDER_POLLO_VEO3_API_KEY="sk-pollo-xxxxxxxxxxxxxxxxxxxxxxxx"

# Replicate 视频生成 (Replicate平台)
AI_PROVIDER_REPLICATE_MINIMAX_API_KEY="r8_xxxxxxxxxxxxxxxxxxxxxxxx"
AI_PROVIDER_REPLICATE_LTX_API_KEY="r8_xxxxxxxxxxxxxxxxxxxxxxxx"

# TuZi OpenAI 风格图像生成
AI_PROVIDER_TUZI_OPENAI_DALLE_API_KEY="sk-tuzi-xxxxxxxxxxxxxxxxxxxxxxxx"
```

#### 步骤 3: 重启服务

```bash
# 开发环境
npm run dev

# 生产环境
npm run build
npm start
```

### 1.3 Docker 环境配置

在 `docker-compose.yml` 中添加：

```yaml
services:
  app:
    environment:
      - AI_PROVIDER_FLUX_PRO_API_KEY=${AI_PROVIDER_FLUX_PRO_API_KEY}
      - AI_PROVIDER_KLING_V1_API_KEY=${AI_PROVIDER_KLING_V1_API_KEY}
      - AI_PROVIDER_POLLO_VEO3_API_KEY=${AI_PROVIDER_POLLO_VEO3_API_KEY}
```

或直接运行：

```bash
docker run -e AI_PROVIDER_FLUX_PRO_API_KEY="sk-tuzi-xxx" \
           -e AI_PROVIDER_KLING_V1_API_KEY="sk-tuzi-xxx" \
           your-image
```

---

## 方式2: 数据库配置

### 2.1 使用 SQL 脚本添加供应商

```bash
# 1. 编辑脚本，替换 API key
vim scripts/add-providers.sql

# 2. 执行脚本
sqlite3 data/app.db < scripts/add-providers.sql
```

### 2.2 手动更新单个供应商的 API key

```bash
# 更新 FLUX Pro
sqlite3 data/app.db "
UPDATE api_providers
SET encryptedAuthKey='sk-tuzi-your-real-key-here'
WHERE modelIdentifier='flux-pro';
"

# 更新 Kling v1
sqlite3 data/app.db "
UPDATE api_providers
SET encryptedAuthKey='sk-tuzi-your-real-key-here'
WHERE modelIdentifier='kling-v1';
"

# 查看所有供应商
sqlite3 data/app.db "
SELECT name, modelIdentifier,
       CASE WHEN encryptedAuthKey IS NULL OR encryptedAuthKey = ''
            THEN '❌ 未配置'
            ELSE '✅ 已配置'
       END as key_status
FROM api_providers;
"
```

### 2.3 手动插入新供应商

```bash
sqlite3 data/app.db << 'EOF'
INSERT INTO api_providers (
  id, name, modelIdentifier, adapterName, type,
  apiEndpoint, apiFlavor, encryptedAuthKey, isActive,
  createdAt, updatedAt
) VALUES (
  lower(hex(randomblob(16))),
  'FLUX Pro',
  'flux-pro',
  'FluxAdapter',
  'image',
  'https://api.tu-zi.com/flux/pro',
  'openai',
  'sk-tuzi-your-api-key-here',
  1,
  datetime('now'),
  datetime('now')
);
EOF
```

---

## 支持的供应商列表

### 图像生成

| 供应商名称 | Model Identifier | 适配器 | 平台 | 环境变量名 |
|-----------|-----------------|--------|------|-----------|
| FLUX Pro | `flux-pro` | FluxAdapter | TuZi | `AI_PROVIDER_FLUX_PRO_API_KEY` |
| FLUX Dev | `flux-dev` | FluxAdapter | TuZi | `AI_PROVIDER_FLUX_DEV_API_KEY` |
| Tuzi OpenAI DALL-E | `tuzi-openai-dalle` | TuziOpenAIAdapter | TuZi | `AI_PROVIDER_TUZI_OPENAI_DALLE_API_KEY` |

### 视频生成

| 供应商名称 | Model Identifier | 适配器 | 平台 | 环境变量名 |
|-----------|-----------------|--------|------|-----------|
| Kling Video v1 | `kling-v1` | KlingAdapter | TuZi | `AI_PROVIDER_KLING_V1_API_KEY` |
| Pollo Veo3 | `pollo-veo3` | PolloAdapter | Pollo | `AI_PROVIDER_POLLO_VEO3_API_KEY` |
| Pollo-Kling Hybrid | `pollo-kling` | PolloKlingAdapter | Pollo | `AI_PROVIDER_POLLO_KLING_API_KEY` |
| Replicate Minimax | `replicate-minimax` | ReplicateAdapter | Replicate | `AI_PROVIDER_REPLICATE_MINIMAX_API_KEY` |
| Replicate LTX | `replicate-ltx` | ReplicateAdapter | Replicate | `AI_PROVIDER_REPLICATE_LTX_API_KEY` |

---

## 测试配置

### 方法1: 使用测试脚本

```bash
# 测试环境变量是否生效
AI_PROVIDER_FLUX_PRO_API_KEY="your-test-key" npx tsx scripts/test-env-provider.ts
```

**预期输出：**
```
🎉 SUCCESS: Environment variable was used!
```

### 方法2: 访问管理界面

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 访问供应商管理页面：
   ```
   http://localhost:3000/admin/generation/providers
   ```

3. 检查供应商列表是否显示正确

### 方法3: 测试 API 调用

```bash
# 测试 FLUX Pro 图像生成
curl -X POST http://localhost:3000/api/external/generation \
  -H "Content-Type: application/json" \
  -d '{
    "modelIdentifier": "flux-pro",
    "prompt": "A beautiful sunset over the ocean",
    "parameters": {
      "width": 1024,
      "height": 1024
    }
  }'
```

---

## 常见问题

### Q1: 环境变量配置后不生效？

**A:** 确保已重启服务：
```bash
# 停止当前服务 (Ctrl+C)
# 重新启动
npm run dev
```

### Q2: 如何查看当前使用的是环境变量还是数据库配置？

**A:** 运行测试脚本：
```bash
AI_PROVIDER_FLUX_PRO_API_KEY="test" npx tsx scripts/test-env-provider.ts
```

查看输出中的 "API Key Source" 字段。

### Q3: 可以同时使用环境变量和数据库配置吗？

**A:** 可以。不同的供应商可以用不同方式配置：
- `flux-pro` 使用环境变量：`AI_PROVIDER_FLUX_PRO_API_KEY="xxx"`
- `kling-v1` 使用数据库配置（不设置环境变量）

### Q4: 环境变量名称写错了怎么办？

**A:** 确保遵循命名规则：
1. 前缀固定为 `AI_PROVIDER_`
2. 中间部分是 `modelIdentifier` 的大写形式
3. `-` 替换为 `_`
4. 后缀固定为 `_API_KEY`

**正确示例：**
- ✅ `AI_PROVIDER_FLUX_PRO_API_KEY`
- ❌ `FLUX_PRO_API_KEY` (缺少前缀)
- ❌ `AI_PROVIDER_FLUX-PRO_API_KEY` (包含连字符)

---

## 安全建议

1. ✅ **生产环境使用环境变量**，不要将密钥写入数据库
2. ✅ **`.env.local` 已被 gitignore 忽略**，不会提交到版本控制
3. ✅ **定期轮换 API 密钥**
4. ❌ **不要在代码中硬编码密钥**
5. ❌ **不要将 `.env.local` 文件提交到 Git**

---

## 获取 API 密钥

### TuZi 平台
- 官网：https://www.tu-zi.com
- 注册账号后在"API Keys"页面获取

### Pollo AI
- 官网：https://www.pollo.ai
- 注册账号后在设置页面获取 API key

### Replicate
- 官网：https://replicate.com
- 登录后访问 https://replicate.com/account/api-tokens

---

## 相关文件

- **环境变量模板**: [.env.example](.env.example)
- **供应商初始化脚本**: [scripts/add-providers.sql](scripts/add-providers.sql)
- **测试脚本**: [scripts/test-env-provider.ts](scripts/test-env-provider.ts)
- **适配器工厂**: [src/lib/adapters/adapter-factory.ts](src/lib/adapters/adapter-factory.ts)
