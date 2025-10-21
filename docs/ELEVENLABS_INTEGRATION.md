# ElevenLabs Text-to-Speech 集成文档

## 📖 概述

ElevenLabs Text-to-Speech (TTS) 已成功集成到 AI 生成服务中。本文档介绍如何配置和使用该服务。

---

## 🚀 快速开始

### 1. 配置 API Key

有两种方式配置 ElevenLabs API Key：

#### 方式一：环境变量（推荐用于开发）

在 `.env.local` 文件中添加：

```bash
AI_PROVIDER_ELEVENLABS_TTS_API_KEY="sk_your_elevenlabs_api_key_here"
```

#### 方式二：数据库配置（推荐用于生产）

在管理后台的 AI 生成服务供应商管理页面中，找到 "ElevenLabs TTS" 供应商，填入 API Key。

**优先级**：数据库配置 > 环境变量

---

### 2. 初始化数据库

如果尚未运行种子脚本，执行：

```bash
npx tsx prisma/seed-elevenlabs.ts
```

这将创建：
- ✅ ElevenLabs Platform
- ✅ ElevenLabs TTS Provider
- ✅ Eleven v3 (Alpha) Model

---

### 3. 使用 TTS 服务

访问管理后台的 AI 生成页面 (`/admin/ai-generation`)，选择 **ElevenLabs - Eleven v3 (Alpha)** 模型。

---

## 📋 功能特性

### ✨ 主要特性

- ✅ **Eleven v3 (Alpha) 模型**：最先进的情感表达式语音合成
- ✅ **70+ 语言支持**：包括中文、英语、日语、西班牙语等
- ✅ **3 个预制语音**：Mark (男性)、Zara (女性)、Allison (女性)
- ✅ **自定义 Voice ID**：支持使用任何 ElevenLabs 语音库中的语音
- ✅ **高级参数调整**：Stability、Similarity Boost、Style、Speaker Boost
- ✅ **字符限制验证**：3,000 字符限制（Eleven v3）
- ✅ **本地存储**：生成的音频保存在 `public/ai-generated/audio/`
- ✅ **MP3 格式**：44.1kHz 采样率，128kbps 比特率

---

## ⚙️ 参数说明

### 预制语音 (voice_id)

| 语音名称 | Voice ID | 描述 |
|---------|----------|------|
| Mark | `UgBBYS2sOqTuMpoF3BR0` | 男性英语语音 |
| Zara | `jqcCZkN6Knx8BJ5TBdYR` | 女性英语语音 |
| Allison | `xctasy8XvGp2cVO9HL9k` | 女性英语语音 |

### 自定义 Voice ID (custom_voice_id)

如果填写，将覆盖预制语音选择。可从 [ElevenLabs 语音库](https://elevenlabs.io/voice-library) 获取更多语音。

### 高级参数

#### Stability (稳定性) - 0.0 到 1.0
- **默认值**：0.5
- **说明**：数值越高，语音越稳定一致；数值越低，语音越富有表现力和变化
- **推荐**：
  - 朗读稿件：0.7 - 0.9
  - 对话/情感表达：0.3 - 0.6

#### Similarity Boost (相似度增强) - 0.0 到 1.0
- **默认值**：0.75
- **说明**：数值越高，越接近原始语音特征
- **推荐**：通常保持默认值 0.75

#### Style (风格强度) - 0.0 到 1.0
- **默认值**：0.5
- **说明**：v3 模型专属参数，控制语音表现风格的强度
- **推荐**：
  - 自然朗读：0.3 - 0.5
  - 戏剧化表演：0.6 - 1.0

#### Speaker Boost (扬声器增强) - Boolean
- **默认值**：true
- **说明**：增强语音清晰度和质量
- **推荐**：始终开启

#### 目标语言提示 (target_language)
- **默认值**：en (英语)
- **说明**：选择目标语言以获得最佳效果
- **支持语言**：English、中文、日本語、Español、Français、Deutsch、한국어、Português、Italiano、Русский、العربية、हिन्दी 等 70+ 语言
- **注意**：请确保所选语音支持该语言

---

## 📝 使用示例

### 示例 1：基础文本转语音

**配置**：
- 预制语音：Mark
- Stability：0.5
- Similarity Boost：0.75
- Style：0.5
- Speaker Boost：开启

**文本**：
```
Hello! Welcome to our AI generation platform. Today I'm going to introduce you to our new text-to-speech feature powered by ElevenLabs.
```

**输出**：`/ai-generated/audio/elevenlabs-tts-xxxxx.mp3`

---

### 示例 2：中文语音合成

**配置**：
- 自定义 Voice ID：(使用支持中文的语音 ID)
- 目标语言：zh (中文)
- Stability：0.6
- Style：0.4

**文本**：
```
大家好！欢迎来到我们的 AI 生成平台。今天我要为大家介绍我们由 ElevenLabs 提供支持的全新文本转语音功能。
```

---

### 示例 3：情感丰富的对话

**配置**：
- 预制语音：Zara
- Stability：0.3（低稳定性，更有表现力）
- Style：0.7（较高风格强度）
- Speaker Boost：开启

**文本**：
```
Oh my goodness! You won't believe what just happened! This is absolutely incredible - I've never seen anything like it before!
```

---

## ⚠️ 注意事项

### 字符限制
- **Eleven v3 (Alpha)**：最多 **3,000 字符**
- 超过限制将返回错误
- 建议在 UI 中显示字符计数器

### Alpha 版本警告
- Eleven v3 目前是 alpha 版本，可能存在不稳定性
- 不推荐用于生产环境的实时应用（如语音助手）
- 适合用于预生成内容（如视频配音、有声读物等）

### 费用
- ElevenLabs 按字符计费
- 建议在 UI 中显示预估费用
- 查看 [ElevenLabs 定价](https://elevenlabs.io/pricing)

### 语言与语音匹配
- 并非所有语音都支持所有语言
- 请确保选择的语音支持目标语言
- 英语语音对中文效果可能不佳，建议使用支持中文的语音

---

## 🗂️ 文件结构

```
/Users/uniteyoo/Documents/yt-dlpservice/
├── src/lib/ai-generation/
│   ├── adapters/
│   │   ├── elevenlabs/
│   │   │   └── elevenlabs-tts-adapter.ts       # ElevenLabs 适配器
│   │   ├── adapter-factory.ts                  # 适配器工厂 (已注册)
│   │   └── types.ts                            # 类型定义
│   ├── config/
│   │   └── model-parameters.ts                 # 参数配置 (已添加)
│   └── services/
│       └── task-manager.ts                     # 任务管理
├── prisma/
│   └── seed-elevenlabs.ts                      # 数据库种子脚本
├── public/ai-generated/audio/                  # 音频输出目录
└── .env.example                                # 环境变量模板 (已更新)
```

---

## 🔧 故障排查

### 问题 1：API Key 错误
**错误信息**：`Missing API key for ElevenLabs`

**解决方案**：
1. 检查 `.env.local` 中是否配置了 `AI_PROVIDER_ELEVENLABS_TTS_API_KEY`
2. 或在数据库的 AIProvider 表中填入 API Key
3. 重启开发服务器

---

### 问题 2：字符限制错误
**错误信息**：`Text exceeds character limit of 3000`

**解决方案**：
1. 缩短输入文本至 3,000 字符以内
2. 或考虑分段生成多个音频文件

---

### 问题 3：语音不支持目标语言
**症状**：生成的语音发音不准确或有口音

**解决方案**：
1. 确保选择的语音支持目标语言
2. 访问 [ElevenLabs 语音库](https://elevenlabs.io/voice-library)
3. 筛选支持目标语言的语音，复制其 Voice ID
4. 在"自定义 Voice ID"中填入该 ID

---

### 问题 4：音频文件未生成
**症状**：任务状态为 SUCCESS 但找不到音频文件

**解决方案**：
1. 检查 `public/ai-generated/audio/` 目录是否存在
2. 确保应用有权限写入该目录
3. 查看控制台日志获取详细错误信息

---

## 📚 相关资源

- [ElevenLabs 官方文档](https://elevenlabs.io/docs)
- [ElevenLabs API 参考](https://elevenlabs.io/docs/api-reference)
- [ElevenLabs 语音库](https://elevenlabs.io/voice-library)
- [ElevenLabs 定价](https://elevenlabs.io/pricing)
- [ElevenLabs 模型对比](https://elevenlabs.io/docs/models)

---

## 🔄 后续优化（可选）

### 计划中的功能

1. **添加更多模型**
   - Eleven Multilingual v2 (更稳定，10,000 字符限制)
   - Eleven Flash v2.5 (超低延迟，40,000 字符限制)
   - Eleven Turbo v2.5 (质量/速度平衡)

2. **语音克隆**
   - 集成 ElevenLabs Voice Cloning API
   - 支持即时语音克隆和专业语音克隆

3. **语音设计**
   - 支持从文本描述生成语音
   - Voice Designer API 集成

4. **S3 存储**
   - 改为上传到 S3 而非本地存储
   - 支持 CDN 加速

5. **流式响应**
   - 使用 WebSocket 实现实时 TTS
   - 降低首字节延迟 (TTFB)

6. **UI 增强**
   - 字符计数器（实时显示剩余字符数）
   - 音频预览播放器
   - 参数快速预设（平衡、情感丰富、稳定一致等）
   - 费用预估显示

---

## 📞 技术支持

如遇到问题，请：
1. 查看本文档的故障排查章节
2. 查看控制台日志获取详细错误信息
3. 参考 [ElevenLabs 官方文档](https://elevenlabs.io/docs)

---

**最后更新时间**：2025-01-20
**集成版本**：v1.0.0
**ElevenLabs API 版本**：v1
