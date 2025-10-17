# 当前已配置的供应商和模型列表

本文档列出了系统中已配置的所有 AI 供应商和模型。

## 📊 统计概览

- **平台数量**: 3 个
- **供应商数量**: 5 个
- **模型数量**: 39 个
  - 图像生成: 11 个
  - 视频生成: 28 个

---

## 🏢 平台（Platforms）

### 1. TuZi
- **描述**: 兔子API - 第三方AI服务聚合平台
- **网站**: https://tuzi.com
- **供应商**: TuZi

### 2. Replicate
- **描述**: Run AI models with an API
- **网站**: https://replicate.com
- **供应商**: Replicate

### 3. Pollo
- **描述**: Pollo AI Platform
- **网站**: https://pollo.ai
- **供应商**: Pollo AI

---

## 🤖 供应商（Providers）

### 1. Kie.ai（官方供应商）
- **Slug**: `kie-ai`
- **API 端点**: https://api.kie.ai
- **状态**: ✅ 启用
- **模型数量**: 31 个
- **平台**: 官方（无第三方平台）

### 2. TuZi
- **Slug**: `tuzi`
- **API 端点**: https://api.tuzi.com
- **状态**: ✅ 启用
- **模型数量**: 2 个
- **平台**: TuZi

### 3. Replicate
- **Slug**: `replicate`
- **API 端点**: https://api.replicate.com
- **状态**: ✅ 启用
- **模型数量**: 2 个
- **平台**: Replicate

### 4. OpenAI（官方供应商）
- **Slug**: `openai`
- **API 端点**: https://api.openai.com
- **状态**: ✅ 启用
- **模型数量**: 1 个
- **平台**: 官方（无第三方平台）

### 5. Pollo AI
- **Slug**: `pollo`
- **API 端点**: https://pollo.ai/api/platform/generation
- **状态**: ✅ 启用
- **模型数量**: 2 个
- **平台**: Pollo

---

## 🎨 模型列表（Models）

### Kie.ai 模型（31个）

#### 图像生成模型（10个）

1. **4o Image** (`kie-4o-image`)
   - 类型: IMAGE
   - 适配器: KieImageAdapter
   - 功能: 文生图、图生图
   - 定价: 1张: 6 Credits ($0.03) | 2张: 7 Credits ($0.035) | 4张: 8 Credits ($0.04)
   - 状态: ✅ 启用

2. **Flux Kontext** (`kie-flux-kontext`)
   - 类型: IMAGE
   - 适配器: KieFluxKontextAdapter
   - 功能: 文生图
   - 定价: Pro: 5 Credits ($0.025) | Max: 10 Credits ($0.05)
   - 状态: ✅ 启用

3. **Midjourney** (`kie-midjourney-image`)
   - 类型: IMAGE
   - 适配器: KieMidjourneyAdapter
   - 功能: 文生图、图生图
   - 定价: Relax: 3 Credits ($0.015) | Fast: 8 Credits ($0.04) | Turbo: 16 Credits ($0.08)
   - 状态: ✅ 启用

4. **Nano Banana** (`kie-nano-banana`)
   - 类型: IMAGE
   - 适配器: KieNanoBananaAdapter
   - 功能: 文生图
   - 定价: 4 Credits/张 ($0.02)
   - 状态: ✅ 启用

5. **Nano Banana Edit** (`kie-nano-banana-edit`)
   - 类型: IMAGE
   - 适配器: KieNanoBananaEditAdapter
   - 功能: 图像编辑、图生图
   - 定价: 4 Credits/张 ($0.02)
   - 状态: ✅ 启用

6. **Nano Banana Upscale** (`kie-nano-banana-upscale`)
   - 类型: IMAGE
   - 适配器: KieNanoBananaUpscaleAdapter
   - 功能: 图像放大、面部增强
   - 定价: 1 Credit/张 ($0.005)
   - 状态: ✅ 启用

7. **Seedream V4** (`kie-seedream-v4`)
   - 类型: IMAGE
   - 适配器: KieSeedreamV4Adapter
   - 功能: 文生图（1K-4K）
   - 定价: 3.5 Credits/张 ($0.018)
   - 状态: ✅ 启用

8. **Seedream V4 Edit** (`kie-seedream-v4-edit`)
   - 类型: IMAGE
   - 适配器: KieSeedreamV4EditAdapter
   - 功能: 图像编辑（1K-4K）
   - 定价: 3.5 Credits/张 ($0.018)
   - 状态: ✅ 启用

9. **Qwen Image Edit** (`kie-qwen-image-edit`)
   - 类型: IMAGE
   - 适配器: KieQwenImageEditAdapter
   - 功能: 图像编辑
   - 定价: 512x512: 1 Credit ($0.005) | 1024x1024: 3.5 Credits ($0.018)
   - 状态: ✅ 启用

#### 视频生成模型（21个）

10. **Midjourney Video** (`kie-midjourney-video`)
    - 类型: VIDEO
    - 适配器: KieMidjourneyAdapter
    - 功能: 图生视频
    - 定价: 标清: 15 Credits ($0.075) | HD: 45 Credits ($0.225)
    - 状态: ✅ 启用

11. **Sora** (`kie-sora`)
    - 类型: VIDEO
    - 适配器: KieSoraAdapter
    - 功能: 文生视频、图生视频
    - 状态: ⚠️ 禁用（等待 API 可用）

12. **Sora 2** (`kie-sora2`)
    - 类型: VIDEO
    - 适配器: KieSora2Adapter
    - 功能: 文生视频
    - 定价: 30 Credits/10秒 ($0.15)
    - 状态: ✅ 启用

13. **Sora 2 Image to Video** (`kie-sora2-image-to-video`)
    - 类型: VIDEO
    - 适配器: KieSora2ImageToVideoAdapter
    - 功能: 图生视频
    - 定价: 30 Credits/10秒 ($0.15)
    - 状态: ✅ 启用

14. **Sora 2 Pro** (`kie-sora2-pro`)
    - 类型: VIDEO
    - 适配器: KieSora2ProAdapter
    - 功能: 文生视频（高质量）
    - 定价: 标准: 90 Credits/10秒 ($0.45) | 高清: 200 Credits/10秒 ($1.00)
    - 状态: ✅ 启用

15. **Sora 2 Pro Image to Video** (`kie-sora2-pro-image-to-video`)
    - 类型: VIDEO
    - 适配器: KieSora2ProImageToVideoAdapter
    - 功能: 图生视频（高质量）
    - 定价: 标准: 90 Credits/10秒 ($0.45) | 高清: 200 Credits/10秒 ($1.00)
    - 状态: ✅ 启用

16. **Veo 3** (`kie-veo3`)
    - 类型: VIDEO
    - 适配器: KieVeo3Adapter
    - 功能: 文生视频、图生视频
    - 定价: 250 Credits ($1.25)
    - 状态: ✅ 启用

17. **Veo 3 Fast** (`kie-veo3-fast`)
    - 类型: VIDEO
    - 适配器: KieVeo3Adapter
    - 功能: 文生视频、图生视频（快速）
    - 定价: 100 Credits ($0.50)
    - 状态: ✅ 启用

18. **Sora Watermark Remover** (`kie-sora-watermark-remover`)
    - 类型: VIDEO
    - 适配器: KieSoraWatermarkRemoverAdapter
    - 功能: 视频水印移除
    - 定价: 10 Credits ($0.05)
    - 状态: ✅ 启用

19. **Kling v2.1 Master Image to Video** (`kie-kling-v2-1-master-image-to-video`)
    - 类型: VIDEO
    - 适配器: KieKlingV2MasterImageToVideoAdapter
    - 功能: 图生视频（Master 质量）
    - 定价: 5秒: 160 Credits ($0.80) | 10秒: 320 Credits ($1.60)
    - 状态: ✅ 启用

20. **Kling v2.1 Master Text to Video** (`kie-kling-v2-1-master-text-to-video`)
    - 类型: VIDEO
    - 适配器: KieKlingV2MasterTextToVideoAdapter
    - 功能: 文生视频（Master 质量）
    - 定价: 5秒: 160 Credits ($0.80) | 10秒: 320 Credits ($1.60)
    - 状态: ✅ 启用

21. **Kling v2.1 Standard Image to Video** (`kie-kling-v2-1-standard`)
    - 类型: VIDEO
    - 适配器: KieKlingV2StandardAdapter
    - 功能: 图生视频（标准质量）
    - 定价: 5秒: 25 Credits ($0.125) | 10秒: 50 Credits ($0.25)
    - 状态: ✅ 启用

22. **Kling v2.1 Pro Image to Video** (`kie-kling-v2-1-pro`)
    - 类型: VIDEO
    - 适配器: KieKlingV2ProAdapter
    - 功能: 图生视频（Pro 质量）
    - 定价: 5秒: 50 Credits ($0.25) | 10秒: 100 Credits ($0.50)
    - 状态: ✅ 启用

23. **Kling v2.5 Turbo Pro Image to Video** (`kie-kling-v2-5-turbo-pro`)
    - 类型: VIDEO
    - 适配器: KieKlingV25TurboProAdapter
    - 功能: 图生视频（快速生成）
    - 定价: 5秒: 42 Credits ($0.21) | 10秒: 84 Credits ($0.42)
    - 状态: ✅ 启用

24. **Kling v2.5 Turbo Pro Text to Video** (`kie-kling-v2-5-turbo-text-to-video-pro`)
    - 类型: VIDEO
    - 适配器: KieKlingV25TurboTextToVideoProAdapter
    - 功能: 文生视频（快速生成）
    - 定价: 5秒: 42 Credits ($0.21) | 10秒: 84 Credits ($0.42)
    - 状态: ✅ 启用

25. **Wan 2.2 A14B Turbo Text to Video** (`kie-wan-2-2-a14b-text-to-video-turbo`)
    - 类型: VIDEO
    - 适配器: KieWan22A14bTextToVideoTurboAdapter
    - 功能: 文生视频
    - 定价: 720p: 12 Credits ($0.06) | 580p: 9 Credits ($0.045) | 480p: 6 Credits ($0.03)
    - 状态: ✅ 启用

26. **Wan 2.2 A14B Turbo Image to Video** (`kie-wan-2-2-a14b-image-to-video-turbo`)
    - 类型: VIDEO
    - 适配器: KieWan22A14bImageToVideoTurboAdapter
    - 功能: 图生视频
    - 定价: 720p: 12 Credits ($0.06) | 580p: 9 Credits ($0.045) | 480p: 6 Credits ($0.03)
    - 状态: ✅ 启用

27. **Wan 2.5 Text to Video** (`kie-wan-2-5-text-to-video`)
    - 类型: VIDEO
    - 适配器: KieWan25TextToVideoAdapter
    - 功能: 文生视频
    - 定价: 720p: 12 Credits/秒 ($0.06/秒) | 1080p: 20 Credits/秒 ($0.10/秒)
    - 状态: ✅ 启用

28. **ByteDance Seedance V1 Pro Text to Video** (`kie-bytedance-v1-pro-text-to-video`)
    - 类型: VIDEO
    - 适配器: KieByteDanceV1ProTextToVideoAdapter
    - 功能: 文生视频
    - 定价: 480p: 2.8 Credits/秒 | 720p: 6 Credits/秒 | 1080p: 14 Credits/秒
    - 状态: ✅ 启用

29. **ByteDance Seedance V1 Pro Image to Video** (`kie-bytedance-v1-pro-image-to-video`)
    - 类型: VIDEO
    - 适配器: KieByteDanceV1ProImageToVideoAdapter
    - 功能: 图生视频
    - 定价: 480p: 2.8 Credits/秒 | 720p: 6 Credits/秒 | 1080p: 14 Credits/秒
    - 状态: ✅ 启用

30. **Runway** (`kie-runway`)
    - 类型: VIDEO
    - 适配器: KieRunwayAdapter
    - 功能: 文生视频、图生视频
    - 定价: 5秒720p: 12 Credits ($0.06) | 5秒1080p: 30 Credits ($0.15)
    - 状态: ✅ 启用

31. **Runway Extend** (`kie-runway-extend`)
    - 类型: VIDEO
    - 适配器: KieRunwayExtendAdapter
    - 功能: 视频扩展
    - 定价: 720p: 12 Credits/5秒 | 1080p: 30 Credits/5秒
    - 状态: ✅ 启用

---

### TuZi 模型（2个）

32. **Kling Video** (`tuzi-kling`)
    - 类型: VIDEO
    - 适配器: TuziKlingAdapter
    - 功能: 文生视频、图生视频
    - 状态: ✅ 启用

33. **Midjourney** (`tuzi-midjourney`)
    - 类型: IMAGE
    - 适配器: TuziMidjourneyAdapter
    - 功能: 文生图
    - 状态: ✅ 启用

---

### OpenAI 模型（1个）

34. **DALL-E 3** (`openai-dalle-3`)
    - 类型: IMAGE
    - 适配器: OpenAIDalleAdapter
    - 功能: 文生图
    - 状态: ✅ 启用

---

### Pollo AI 模型（2个）

35. **Veo 3** (`pollo-veo3`)
    - 类型: VIDEO
    - 适配器: PolloVeo3Adapter
    - 功能: 文生视频、图生视频
    - 状态: ✅ 启用

36. **Kling 1.5** (`pollo-kling`)
    - 类型: VIDEO
    - 适配器: PolloKlingAdapter
    - 功能: 图生视频
    - 状态: ✅ 启用

---

### Replicate 模型（2个）

37. **Flux Pro** (`replicate-flux-pro`)
    - 类型: IMAGE
    - 适配器: ReplicateFluxAdapter
    - 功能: 文生图、图生图
    - 状态: ✅ 启用

38. **Minimax Video** (`replicate-minimax`)
    - 类型: VIDEO
    - 适配器: ReplicateMinimaxAdapter
    - 功能: 文生视频
    - 状态: ✅ 启用

---

## 🔧 API Key 配置方式

### 方法 1: 通过管理后台
访问 `/admin/ai-generation/providers` 页面，点击「设置 API Key」按钮。

### 方法 2: 通过环境变量
在 `.env` 文件中设置：

```bash
# Kie.ai
AI_PROVIDER_KIE_AI_API_KEY=your_kie_api_key

# OpenAI
AI_PROVIDER_OPENAI_API_KEY=your_openai_api_key

# TuZi
AI_PROVIDER_TUZI_API_KEY=your_tuzi_api_key

# Replicate
AI_PROVIDER_REPLICATE_API_KEY=your_replicate_api_key

# Pollo
AI_PROVIDER_POLLO_API_KEY=your_pollo_api_key
```

---

## 📝 注意事项

1. **所有模型都已配置完成**，seed 文件包含完整的供应商和模型数据
2. **适配器已全部实现**，所有 39 个模型的适配器代码都已存在
3. **需要设置 API Key** 才能使用相应的供应商服务
4. **Sora (kie-sora) 模型默认禁用**，需要等待 API 可用后手动启用
5. 运行 `npm run db:seed` 可初始化或更新数据库中的供应商和模型信息

---

## 🚀 如何运行 Seed

```bash
# 进入项目目录
cd /path/to/yt-dlpservice

# 运行 seed 脚本
npm run db:seed

# 或直接运行
npx tsx prisma/seed-ai-generation.ts
```

Seed 脚本会自动创建或更新所有平台、供应商和模型数据。

---

生成时间: 2025-10-17
