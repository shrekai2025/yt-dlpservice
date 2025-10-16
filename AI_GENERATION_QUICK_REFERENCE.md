# AI生成模块快速参考卡

## ✅ 安装状态

- ✅ 数据库迁移完成
- ✅ 模型数据初始化完成
- ✅ 3个平台，5个供应商，12个模型已就绪

---

## 🚀 快速命令

```bash
# 一键安装（新项目使用）
npm run ai:setup

# 初始化模型数据
npm run db:seed

# 启动开发服务器
npm run dev

# 打开数据库管理
npx prisma studio
```

---

## 🔑 API密钥配置

### 方式1: 环境变量（.env）

```bash
# OpenAI DALL-E 3
AI_PROVIDER_OPENAI_API_KEY=sk-proj-xxx

# Pollo AI (Veo3 和 Kling)
AI_PROVIDER_POLLO_API_KEY=your_pollo_api_key

# Kie.ai (所有Kie模型)
AI_PROVIDER_KIE_AI_API_KEY=your_kie_api_key

# TuZi (可选)
AI_PROVIDER_TUZI_API_KEY=your_tuzi_api_key

# Replicate (可选)
AI_PROVIDER_REPLICATE_API_KEY=r8_your_replicate_token
```

### 方式2: 管理页面

访问: `http://localhost:3000/admin/ai-generation/providers`

---

## 📍 重要页面

| 页面 | URL | 功能 |
|------|-----|------|
| **AI生成主页** | `/admin/ai-generation` | 选择模型、生成内容 |
| **供应商管理** | `/admin/ai-generation/providers` | 配置API Key、查看状态 |
| **任务列表** | `/admin/ai-generation/tasks` | 查看所有生成任务 |
| **任务详情** | `/admin/ai-generation/tasks/[id]` | 查看单个任务详情 |

---

## 🤖 可用模型 (12个)

### 图像生成 (6个)

| 模型 | Slug | 特点 |
|------|------|------|
| DALL-E 3 | `openai-dalle-3` | ⭐ 高质量、HD选项 |
| Flux Kontext | `kie-flux-kontext` | 可控性强 |
| Midjourney | `kie-midjourney` | 艺术风格 |
| 4o Image | `kie-4o-image` | GPT-4o |
| TuZi MJ | `tuzi-midjourney` | Midjourney |
| Flux Pro | `replicate-flux-pro` | 专业级 |

### 视频生成 (6个)

| 模型 | Slug | 特点 |
|------|------|------|
| Veo 3 | `pollo-veo3` | ⭐ Google最新 |
| Kling 1.5 | `pollo-kling` | ⭐ 快速、镜头运动 |
| Sora | `kie-sora` | 🔒 框架就绪（待开放） |
| MJ Video | `kie-midjourney-video` | 图生视频 |
| Kling | `tuzi-kling-video` | 可灵 |
| Minimax | `replicate-minimax-video` | 文生视频 |

---

## 🔌 API调用示例

### 创建生成任务

```bash
curl -X POST http://localhost:3000/api/external/ai-generation \
  -H "X-API-Key: sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model_slug": "openai-dalle-3",
    "prompt": "A beautiful sunset",
    "parameters": {
      "size": "1024x1024",
      "quality": "hd",
      "style": "vivid"
    }
  }'
```

### 查询任务状态

```bash
curl http://localhost:3000/api/external/ai-generation/tasks/clxxx... \
  -H "X-API-Key: sk-your-api-key"
```

### 获取模型列表

```bash
curl http://localhost:3000/api/external/ai-generation/models \
  -H "X-API-Key: sk-your-api-key"
```

---

## 🛠️ 常用参数

### DALL-E 3

```json
{
  "size": "1024x1024" | "1792x1024" | "1024x1792",
  "quality": "standard" | "hd",
  "style": "vivid" | "natural"
}
```

### Pollo Veo3

```json
{
  "duration": 5-10,
  "with_audio": true | false,
  "aspect_ratio": "16:9"
}
```

### Pollo Kling

```json
{
  "duration": 5-10,
  "aspect_ratio": "16:9" | "9:16" | "1:1",
  "camera_motion": "zoom_in" | "zoom_out" | "pan_left" | ...
}
```

---

## 🐛 故障排除

### 问题：生成失败

**检查清单:**
```bash
# 1. 验证API Key
curl http://localhost:3000/api/external/ai-generation/models \
  -H "X-API-Key: your-key"

# 2. 查看错误日志
npx prisma studio
# 打开 ErrorLog 表

# 3. 检查供应商状态
# 访问: /admin/ai-generation/providers
```

### 问题：模型不显示

```sql
-- 检查模型状态
SELECT slug, name, isActive FROM ai_models;

-- 检查供应商状态
SELECT slug, name, isActive FROM ai_providers;
```

### 问题：迁移错误

```bash
# 重置数据库（警告：会删除数据）
npx prisma migrate reset

# 重新seed
npm run db:seed
```

---

## 📚 文档索引

| 文档 | 用途 |
|------|------|
| `QUICK_START_AI_GENERATION.md` | 🚀 快速开始 |
| `AI_GENERATION_FINAL_REPORT.md` | 📊 完整报告 |
| `AI_GENERATION_README.md` | 📖 使用说明 |
| `MIGRATION_TO_NEW_AI_GENERATION.md` | 🔄 迁移指南 |
| `CHANGELOG_AI_GENERATION.md` | 📝 变更日志 |

---

## 🎯 下一步

1. ✅ 配置API密钥
2. ✅ 启动服务: `npm run dev`
3. ✅ 访问: `http://localhost:3000/admin/ai-generation`
4. ✅ 选择模型并测试
5. ✅ 查看任务详情和结果

---

**快速参考卡版本:** v1.0  
**最后更新:** 2025-10-14

