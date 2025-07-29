# 环境变量配置说明

## 📁 文件结构

```
yt-dlpservice/
├── .env                 # 基础配置（已提交到Git，不含敏感信息）
├── .env.local          # 本地配置（不提交Git，包含敏感信息）
├── .env.example        # 配置模板（已提交到Git）
└── .env.production     # 生产环境配置
```

## 🔧 配置优先级

Next.js 环境变量加载优先级（从高到低）：
1. `.env.local` - 本地开发配置（最高优先级）
2. `.env.production` - 生产环境配置
3. `.env` - 基础配置（最低优先级）

## 🚀 快速开始

### 方法一：使用 .env 文件（推荐）

1. **编辑 `.env` 文件**，填入您的API密钥：
```bash
# 豆包语音API配置
DOUBAO_ACCESS_KEY_ID="你的AccessKeyID"
DOUBAO_ACCESS_KEY_SECRET="你的AccessKeySecret"

# 语音服务选择
VOICE_SERVICE_PROVIDER="doubao"
```

2. **重启开发服务器**：
```bash
npm run dev
```

### 方法二：使用 .env.local 文件（更安全）

1. **创建 `.env.local` 文件**：
```bash
cp .env.example .env.local
```

2. **编辑 `.env.local` 文件**，只覆盖需要的配置：
```bash
# 豆包语音API配置
DOUBAO_ACCESS_KEY_ID="你的AccessKeyID"
DOUBAO_ACCESS_KEY_SECRET="你的AccessKeySecret"
VOICE_SERVICE_PROVIDER="doubao"
```

## 📋 完整配置项

### 必需配置

```bash
# 数据库
DATABASE_URL="file:./data/app.db"

# 豆包语音API（使用豆包时必需）
DOUBAO_ACCESS_KEY_ID="你的AccessKeyID"
DOUBAO_ACCESS_KEY_SECRET="你的AccessKeySecret"
DOUBAO_REGION="cn-beijing"
DOUBAO_ENDPOINT="https://openspeech.bytedance.com"

# 通义听悟API（使用通义时必需）
TINGWU_ACCESS_KEY_ID="你的AccessKeyID"
TINGWU_ACCESS_KEY_SECRET="你的AccessKeySecret"
TINGWU_REGION="cn-beijing"

# 语音服务选择
VOICE_SERVICE_PROVIDER="doubao"  # doubao 或 tingwu
```

### 可选配置

```bash
# 应用配置
MAX_CONCURRENT_TASKS="10"
TEMP_DIR="/tmp/yt-dlpservice"
AUDIO_FORMAT="mp3"
AUDIO_BITRATE="128k"

# 文件清理
MAX_FILE_AGE_HOURS="1"
CLEANUP_INTERVAL_HOURS="24"

# 浏览器配置
PUPPETEER_HEADLESS="false"
PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"
BROWSER_DATA_DIR="./data/browser_data"
```

## 🔒 安全建议

1. **生产环境**：使用 `.env.production` 或环境变量
2. **开发环境**：使用 `.env.local` 覆盖敏感信息
3. **团队协作**：只提交 `.env` 和 `.env.example`，不提交包含真实密钥的文件

## 🛠️ 验证配置

运行以下命令验证配置：
```bash
npm run build
```

如果配置正确，构建应该成功完成。 