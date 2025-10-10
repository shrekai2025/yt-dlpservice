# STT REST API 文档

## 概述

本项目提供音频转文字（Speech-to-Text）REST API，支持异步处理音频文件并返回转录文本。

## 认证

所有API请求需要提供API Key进行认证。支持两种方式：

### 方式1: X-API-Key 请求头
```bash
curl -H "X-API-Key: your-api-key-here" ...
```

### 方式2: Authorization Bearer 请求头
```bash
curl -H "Authorization: Bearer your-api-key-here" ...
```

API Key配置在环境变量 `TEXTGET_API_KEY` 中。

---

## API端点

### 1. 提交转录任务

提交音频文件进行转录，返回任务ID。

**端点:** `POST /api/external/stt/transcribe`

**Content-Type:** `multipart/form-data`

**请求参数:**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `audio` | File | ✅ | - | 音频文件 (支持 MP3, WAV, OGG, M4A, MP4) |
| `provider` | String | ❌ | `doubao-small` | STT提供商: `google`, `doubao`, `doubao-small` |
| `languageCode` | String | 条件必填 | - | 语言代码: `cmn-Hans-CN`(简体中文), `en-US`(英语) <br/>**仅当 provider=google 时必填** |
| `compressionPreset` | String | ❌ | `standard` | 压缩预设: `none`, `light`, `standard`, `heavy` |

**文件限制:**
- 最大文件大小: 512MB
- 支持格式: MP3, WAV, OGG, M4A, MP4

**响应 (HTTP 202 Accepted):**

```json
{
  "success": true,
  "data": {
    "jobId": "clxxxxxxxxxxxxxxxxxx",
    "status": "PENDING",
    "message": "任务已创建，正在处理中",
    "metadata": {
      "fileName": "example.mp3",
      "fileSize": 1234567,
      "fileSizeMB": "1.18",
      "duration": "65.43s",
      "provider": "doubao-small",
      "languageCode": null,
      "compressionPreset": "standard",
      "originalFileSize": 1234567,
      "originalFileSizeMB": "1.18",
      "compressedFileSize": 617283,
      "compressedFileSizeMB": "0.59",
      "compressionRatio": "50.00%"
    }
  }
}
```

**错误响应:**

```json
{
  "success": false,
  "error": "Bad Request",
  "message": "缺少音频文件，请使用 \"audio\" 字段上传文件"
}
```

---

### 2. 查询任务状态

查询转录任务的状态和结果。

**端点:** `GET /api/external/stt/status/:jobId`

**URL参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `jobId` | String | ✅ | 任务ID (由提交接口返回) |

**响应 (HTTP 200 OK) - 处理中:**

```json
{
  "success": true,
  "data": {
    "jobId": "clxxxxxxxxxxxxxxxxxx",
    "status": "PROCESSING",
    "message": "任务正在处理中，请稍后再次查询",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:05.000Z",
    "completedAt": null,
    "metadata": {
      "fileName": "example.mp3",
      "fileSize": 1234567,
      "fileSizeMB": "1.18",
      "duration": "65.43s",
      "provider": "doubao-small",
      "languageCode": null,
      "compressionPreset": "standard",
      "originalFileSize": 1234567,
      "originalFileSizeMB": "1.18",
      "compressedFileSize": 617283,
      "compressedFileSizeMB": "0.59",
      "compressionRatio": "50.00%"
    }
  }
}
```

**响应 (HTTP 200 OK) - 已完成:**

```json
{
  "success": true,
  "data": {
    "jobId": "clxxxxxxxxxxxxxxxxxx",
    "status": "COMPLETED",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:05:30.000Z",
    "completedAt": "2025-01-15T10:05:30.000Z",
    "transcription": "这是转录的文本内容...",
    "transcriptionLength": 1234,
    "processingTimeMs": 330000,
    "processingTime": "330.00s",
    "metadata": {
      "fileName": "example.mp3",
      "fileSize": 1234567,
      "fileSizeMB": "1.18",
      "duration": "65.43s",
      "provider": "doubao-small",
      "languageCode": null,
      "compressionPreset": "standard",
      "originalFileSize": 1234567,
      "originalFileSizeMB": "1.18",
      "compressedFileSize": 617283,
      "compressedFileSizeMB": "0.59",
      "compressionRatio": "50.00%"
    }
  }
}
```

**响应 (HTTP 200 OK) - 失败:**

```json
{
  "success": true,
  "data": {
    "jobId": "clxxxxxxxxxxxxxxxxxx",
    "status": "FAILED",
    "errorMessage": "音频文件格式不支持",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:10.000Z",
    "completedAt": "2025-01-15T10:00:10.000Z",
    "metadata": { ... }
  }
}
```

**任务状态说明:**

| 状态 | 说明 |
|------|------|
| `PENDING` | 任务已创建，等待处理 |
| `PROCESSING` | 任务正在处理中 |
| `COMPLETED` | 任务已完成，转录成功 |
| `FAILED` | 任务失败，查看 `errorMessage` 了解原因 |

---

## STT提供商说明

### 1. Google STT (`google`)

**特点:**
- 支持同步和异步两种模式
- 同步模式: 音频 ≤ 10MB 且时长 ≤ 60秒
- 异步模式: 音频 > 10MB 或时长 > 60秒
- **必须指定 `languageCode` 参数**

**支持的语言:**
- `cmn-Hans-CN`: 简体中文
- `en-US`: 英语（美国）

**示例:**
```bash
curl -X POST http://localhost:3000/api/external/stt/transcribe \
  -H "X-API-Key: your-api-key" \
  -F "audio=@test.mp3" \
  -F "provider=google" \
  -F "languageCode=cmn-Hans-CN" \
  -F "compressionPreset=standard"
```

---

### 2. Doubao (豆包标准版) (`doubao`)

**特点:**
- 仅异步模式
- Base64编码传输，无需对象存储
- 文件大小限制: 512MB (建议 ≤ 80MB)
- 轮询间隔: 30秒
- 最大等待: 约40分钟

**语言:** 仅支持中文

**示例:**
```bash
curl -X POST http://localhost:3000/api/external/stt/transcribe \
  -H "X-API-Key: your-api-key" \
  -F "audio=@test.mp3" \
  -F "provider=doubao" \
  -F "compressionPreset=standard"
```

---

### 3. Doubao Small (豆包小模型版) (`doubao-small`)

**特点:**
- 仅异步模式
- 使用火山引擎TOS对象存储
- 文件大小限制: 512MB
- 轮询间隔: 200秒
- 最大等待: 约167分钟
- **默认提供商**

**语言:** 仅支持中文

**示例:**
```bash
curl -X POST http://localhost:3000/api/external/stt/transcribe \
  -H "X-API-Key: your-api-key" \
  -F "audio=@test.mp3" \
  -F "provider=doubao-small" \
  -F "compressionPreset=standard"
```

---

## 音频压缩预设

为了减少传输时间和处理时间，API支持自动音频压缩。

| 预设 | 说明 | 比特率 | 压缩比 |
|------|------|--------|--------|
| `none` | 不压缩 | 原始 | 0% |
| `light` | 轻度压缩 | 96 kbps | ~30% |
| `standard` | 标准压缩 (默认) | 64 kbps | ~50% |
| `heavy` | 重度压缩 | 32 kbps | ~75% |

**注意:**
- 压缩会降低音频质量，但通常不影响STT准确度
- 建议使用 `standard` 预设平衡质量和文件大小
- 压缩后的文件大小和比例会在响应的 `metadata` 中返回

---

## 完整示例

### 使用 cURL

```bash
# 1. 提交任务
RESPONSE=$(curl -s -X POST http://localhost:3000/api/external/stt/transcribe \
  -H "X-API-Key: your-api-key" \
  -F "audio=@example.mp3" \
  -F "provider=doubao-small" \
  -F "compressionPreset=standard")

echo "$RESPONSE"

# 提取 jobId
JOB_ID=$(echo "$RESPONSE" | jq -r '.data.jobId')

echo "任务ID: $JOB_ID"

# 2. 轮询任务状态
while true; do
  STATUS_RESPONSE=$(curl -s -X GET "http://localhost:3000/api/external/stt/status/$JOB_ID" \
    -H "X-API-Key: your-api-key")

  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status')

  echo "当前状态: $STATUS"

  if [ "$STATUS" = "COMPLETED" ]; then
    echo "转录完成！"
    echo "$STATUS_RESPONSE" | jq -r '.data.transcription'
    break
  elif [ "$STATUS" = "FAILED" ]; then
    echo "转录失败"
    echo "$STATUS_RESPONSE" | jq -r '.data.errorMessage'
    break
  fi

  echo "等待5秒后继续查询..."
  sleep 5
done
```

### 使用测试脚本

项目提供了便捷的测试脚本 `test-stt-api.sh`：

```bash
# 基本用法
./test-stt-api.sh test.mp3

# 指定提供商
./test-stt-api.sh test.mp3 doubao-small

# Google STT (需要指定语言)
./test-stt-api.sh test.mp3 google cmn-Hans-CN standard

# 不压缩
./test-stt-api.sh test.mp3 doubao-small '' none
```

### 使用 Python

```python
import requests
import time

API_KEY = "your-api-key"
BASE_URL = "http://localhost:3000"

# 1. 提交任务
with open("example.mp3", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/api/external/stt/transcribe",
        headers={"X-API-Key": API_KEY},
        files={"audio": f},
        data={
            "provider": "doubao-small",
            "compressionPreset": "standard"
        }
    )

result = response.json()
job_id = result["data"]["jobId"]
print(f"任务ID: {job_id}")

# 2. 轮询任务状态
while True:
    response = requests.get(
        f"{BASE_URL}/api/external/stt/status/{job_id}",
        headers={"X-API-Key": API_KEY}
    )

    result = response.json()
    status = result["data"]["status"]

    print(f"当前状态: {status}")

    if status == "COMPLETED":
        print("转录完成！")
        print(result["data"]["transcription"])
        break
    elif status == "FAILED":
        print("转录失败")
        print(result["data"]["errorMessage"])
        break

    time.sleep(5)
```

### 使用 JavaScript/TypeScript

```typescript
const API_KEY = "your-api-key";
const BASE_URL = "http://localhost:3000";

// 1. 提交任务
async function submitTranscription(audioFile: File) {
  const formData = new FormData();
  formData.append("audio", audioFile);
  formData.append("provider", "doubao-small");
  formData.append("compressionPreset", "standard");

  const response = await fetch(`${BASE_URL}/api/external/stt/transcribe`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
    },
    body: formData,
  });

  const result = await response.json();
  return result.data.jobId;
}

// 2. 轮询任务状态
async function pollJobStatus(jobId: string) {
  while (true) {
    const response = await fetch(
      `${BASE_URL}/api/external/stt/status/${jobId}`,
      {
        headers: {
          "X-API-Key": API_KEY,
        },
      }
    );

    const result = await response.json();
    const status = result.data.status;

    console.log(`当前状态: ${status}`);

    if (status === "COMPLETED") {
      console.log("转录完成！");
      console.log(result.data.transcription);
      return result.data.transcription;
    } else if (status === "FAILED") {
      console.log("转录失败");
      console.error(result.data.errorMessage);
      throw new Error(result.data.errorMessage);
    }

    // 等待5秒
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// 使用示例
const audioFile = document.querySelector('input[type="file"]').files[0];
const jobId = await submitTranscription(audioFile);
const transcription = await pollJobStatus(jobId);
```

---

## 错误码说明

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 成功 |
| 202 | 任务已接受，正在处理 |
| 400 | 请求参数错误 |
| 401 | 未授权，API Key无效 |
| 404 | 任务不存在 |
| 500 | 服务器内部错误 |

---

## 最佳实践

1. **选择合适的提供商:**
   - 小文件 (<10MB, <60s): 使用 `google` 同步模式，速度最快
   - 中等文件: 使用 `doubao` 或 `doubao-small`
   - 大文件 (>100MB): 使用 `doubao-small`，支持TOS对象存储

2. **音频压缩:**
   - 默认使用 `standard` 压缩预设
   - 对于已经是低比特率的音频，可以使用 `none`
   - 网络较慢时，使用 `heavy` 压缩

3. **轮询策略:**
   - Google: 每5秒查询一次
   - Doubao: 每30秒查询一次
   - Doubao Small: 每200秒查询一次

4. **错误处理:**
   - 检查任务状态，处理 `FAILED` 状态
   - 设置合理的超时时间
   - 记录 `errorMessage` 用于调试

5. **异步任务记录:**
   - 所有异步任务都保存在数据库中
   - 任务不会自动清理，需要手动管理
   - 任务失败不会自动重试

---

## 常见问题

### Q: 任务一直处于 PENDING 状态？
A: 检查后端日志，可能是STT服务配置问题或服务未启动。

### Q: 支持哪些音频格式？
A: 支持 MP3, WAV, OGG, M4A, MP4。推荐使用 MP3 格式。

### Q: 文件大小限制是多少？
A: 最大512MB，但建议使用压缩功能减小文件大小。

### Q: 如何获取API Key？
A: API Key配置在环境变量 `TEXTGET_API_KEY` 中，与现有的REST API共用。

### Q: 任务会自动清理吗？
A: 不会。所有任务记录都保存在数据库中，需要手动管理。

### Q: 任务失败会自动重试吗？
A: 不会。任务失败后需要重新提交。

---

## 技术支持

如有问题，请查看：
- 后端日志: `pm2 logs yt-dlpservice`
- 数据库记录: 查询 `stt_jobs` 表
- 配置状态: 访问 `/admin/config-tools` 页面的 "STT服务状态" 标签
