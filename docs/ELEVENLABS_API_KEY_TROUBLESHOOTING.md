# ElevenLabs API Key 故障排查指南

## 🔍 常见问题：401 Unauthorized 错误

如果您遇到 `401 Unauthorized` 或 `AUTHENTICATION_ERROR` 错误，这意味着 API Key 认证失败。

---

## ✅ 解决步骤

### 第 1 步：检查 API Key 格式

ElevenLabs API Key 应该是以下格式之一：
- 以 `sk_` 开头（新格式）
- 或者是 32-64 个字符的十六进制字符串（旧格式）

**示例**：
```
✓ 正确: sk_d7f35a50b107b706172a4e778ddde7dea47674531dbae8dd
✓ 正确: d7f35a50b107b706172a4e778ddde7dea47674531dbae8dd
✗ 错误: YOUR_API_KEY
✗ 错误: elevenlabs_api_key
```

---

### 第 2 步：验证 API Key 是否有效

1. 访问 ElevenLabs 控制台：https://elevenlabs.io/app/settings/api-keys
2. 检查您的 API Key 是否：
   - ✅ 存在且处于活动状态
   - ✅ 未被删除或禁用
   - ✅ 有足够的权限（需要 TTS 权限）

---

### 第 3 步：检查账户状态

访问 ElevenLabs 账户页面：https://elevenlabs.io/app/settings/billing

确认：
- ✅ 账户状态正常（未被暂停）
- ✅ 有可用的字符配额
- ✅ 订阅计划未过期

---

### 第 4 步：正确配置 API Key

#### 方式一：环境变量（推荐开发环境）

在 `.env.local` 文件中：
```bash
AI_PROVIDER_ELEVENLABS_TTS_API_KEY="sk_your_actual_api_key_here"
```

**注意事项**：
- ✅ 使用双引号包裹 API Key
- ✅ 不要有多余的空格
- ✅ 确保 `.env.local` 文件在项目根目录
- ✅ 修改后需要重启开发服务器

**验证环境变量**：
```bash
# 在终端运行
echo $AI_PROVIDER_ELEVENLABS_TTS_API_KEY
```

#### 方式二：数据库配置（推荐生产环境）

1. 访问管理后台的供应商管理页面
2. 找到 "ElevenLabs TTS" 供应商
3. 在 "API Key" 字段填入您的密钥
4. 保存

**数据库配置优先级更高**，如果同时配置了环境变量和数据库，将使用数据库中的值。

---

### 第 5 步：测试 API Key

创建测试脚本 `test-api-key.ts`：

```typescript
import axios from 'axios'

const API_KEY = 'sk_your_api_key_here' // 替换为您的实际 API Key

async function testApiKey() {
  try {
    const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': API_KEY,
      },
    })

    console.log('✅ API Key 有效！')
    console.log('可用语音数量:', response.data.voices.length)
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('❌ API Key 无效或已过期')
    } else if (error.response?.status === 402) {
      console.error('❌ 账户配额不足')
    } else {
      console.error('❌ 错误:', error.message)
    }
  }
}

testApiKey()
```

运行测试：
```bash
npx tsx test-api-key.ts
```

---

## 🔐 API Key 最佳实践

### 安全性
- ❌ **不要**将 API Key 提交到 Git 仓库
- ❌ **不要**在前端代码中暴露 API Key
- ✅ **使用** `.env.local` 文件（已在 `.gitignore` 中）
- ✅ **使用**环境变量或数据库加密存储

### 管理
- ✅ 定期轮换 API Key
- ✅ 为不同环境使用不同的 API Key
- ✅ 限制 API Key 的权限（仅 TTS）
- ✅ 监控 API 使用量

---

## 🐛 常见错误和解决方案

### 错误 1: "Missing API key for ElevenLabs"

**原因**：未配置 API Key

**解决**：
```bash
# .env.local
AI_PROVIDER_ELEVENLABS_TTS_API_KEY="sk_your_api_key"
```

重启开发服务器：
```bash
npm run dev
```

---

### 错误 2: "401 Unauthorized"

**原因**：API Key 无效、过期或权限不足

**解决**：
1. 检查 API Key 格式是否正确
2. 在 ElevenLabs 控制台验证 API Key 状态
3. 确保账户有 TTS 权限
4. 尝试创建新的 API Key

---

### 错误 3: "402 Payment Required" 或 "quota_exceeded"

**原因**：账户字符配额已用完

**解决**：
1. 访问 https://elevenlabs.io/app/settings/billing
2. 查看当前配额使用情况
3. 升级订阅计划或购买额外配额

---

### 错误 4: "429 Too Many Requests"

**原因**：请求速率超限

**解决**：
1. 等待几分钟后重试
2. 减少并发请求数量
3. 升级到更高级别的订阅计划（提高速率限制）

---

## 📝 调试检查清单

使用以下清单逐项检查：

```
□ API Key 格式正确（sk_ 开头或 32-64 字符十六进制）
□ API Key 已正确配置到 .env.local 或数据库
□ 开发服务器已重启（修改环境变量后）
□ 在 ElevenLabs 控制台确认 API Key 存在且活跃
□ 账户状态正常，未被暂停
□ 有可用的字符配额（Free/Starter/Pro 计划）
□ API Key 有 TTS 权限
□ 没有网络代理或防火墙阻止 api.elevenlabs.io
□ 使用的是最新的 API 端点（https://api.elevenlabs.io）
```

---

## 🧪 快速测试

运行调试脚本：
```bash
npx tsx scripts/debug-elevenlabs.ts
```

查看输出中的 "🔑 检查 API Key 配置" 部分。

---

## 📞 获取帮助

### ElevenLabs 官方支持
- **文档**: https://elevenlabs.io/docs
- **控制台**: https://elevenlabs.io/app
- **API 状态**: https://status.elevenlabs.io
- **支持**: https://help.elevenlabs.io

### 本地调试
1. 查看开发服务器控制台日志
2. 运行 `npx tsx scripts/debug-elevenlabs.ts`
3. 检查 `[ElevenLabsTTSAdapter]` 相关日志
4. 查看详细错误信息和 HTTP 状态码

---

## ✅ 验证成功

如果配置正确，您应该看到：

```bash
# 运行调试脚本
npx tsx scripts/debug-elevenlabs.ts

# 预期输出
🔑 检查 API Key 配置...
✓ 环境变量 API Key: 已配置
# 或
✓ 数据库 API Key: 已配置 (优先使用)
```

在管理界面使用 TTS 功能时，应该能成功生成音频文件。

---

**最后更新**: 2025-01-20
**适用版本**: ElevenLabs API v1
