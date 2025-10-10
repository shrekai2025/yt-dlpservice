#!/bin/bash

# STT REST API 测试脚本
# 用法: ./test-stt-api.sh <audio-file-path> [provider] [languageCode] [compressionPreset]

set -e

# 配置
API_KEY="${TEXTGET_API_KEY:-your-api-key-here}"
BASE_URL="http://localhost:3000"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查参数
if [ -z "$1" ]; then
  echo -e "${RED}错误: 缺少音频文件路径${NC}"
  echo "用法: $0 <audio-file-path> [provider] [languageCode] [compressionPreset]"
  echo ""
  echo "示例:"
  echo "  $0 test.mp3"
  echo "  $0 test.mp3 google cmn-Hans-CN standard"
  echo "  $0 test.mp3 doubao-small '' standard"
  echo ""
  echo "参数说明:"
  echo "  provider: google | doubao | doubao-small (默认: doubao-small)"
  echo "  languageCode: cmn-Hans-CN | en-US (仅Google需要)"
  echo "  compressionPreset: none | light | standard | heavy (默认: standard)"
  exit 1
fi

AUDIO_FILE="$1"
PROVIDER="${2:-doubao-small}"
LANGUAGE_CODE="${3:-}"
COMPRESSION_PRESET="${4:-standard}"

# 检查文件是否存在
if [ ! -f "$AUDIO_FILE" ]; then
  echo -e "${RED}错误: 文件不存在: $AUDIO_FILE${NC}"
  exit 1
fi

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}STT REST API 测试${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${YELLOW}测试配置:${NC}"
echo "  音频文件: $AUDIO_FILE"
echo "  提供商: $PROVIDER"
echo "  语言代码: ${LANGUAGE_CODE:-N/A}"
echo "  压缩预设: $COMPRESSION_PRESET"
echo "  API Key: ${API_KEY:0:20}..."
echo ""

# 1. 提交转录任务
echo -e "${BLUE}[步骤 1/3] 提交转录任务...${NC}"

SUBMIT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/external/stt/transcribe" \
  -H "X-API-Key: $API_KEY" \
  -F "audio=@$AUDIO_FILE" \
  -F "provider=$PROVIDER" \
  -F "languageCode=$LANGUAGE_CODE" \
  -F "compressionPreset=$COMPRESSION_PRESET")

HTTP_CODE=$(echo "$SUBMIT_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$SUBMIT_RESPONSE" | head -n -1)

echo "HTTP状态码: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -ne 202 ]; then
  echo -e "${RED}❌ 任务提交失败${NC}"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  exit 1
fi

echo -e "${GREEN}✅ 任务提交成功${NC}"
echo "$RESPONSE_BODY" | jq '.'

# 提取jobId
JOB_ID=$(echo "$RESPONSE_BODY" | jq -r '.data.jobId')

if [ -z "$JOB_ID" ] || [ "$JOB_ID" = "null" ]; then
  echo -e "${RED}❌ 无法获取 jobId${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}任务ID: $JOB_ID${NC}"
echo ""

# 2. 轮询任务状态
echo -e "${BLUE}[步骤 2/3] 轮询任务状态...${NC}"
echo ""

MAX_RETRIES=60
RETRY_COUNT=0
SLEEP_INTERVAL=5

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))

  echo -e "${YELLOW}查询次数: $RETRY_COUNT/$MAX_RETRIES${NC}"

  STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/external/stt/status/$JOB_ID" \
    -H "X-API-Key: $API_KEY")

  HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n 1)
  RESPONSE_BODY=$(echo "$STATUS_RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${RED}❌ 查询失败 (HTTP $HTTP_CODE)${NC}"
    echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    exit 1
  fi

  # 提取状态
  STATUS=$(echo "$RESPONSE_BODY" | jq -r '.data.status')

  echo "任务状态: $STATUS"

  if [ "$STATUS" = "COMPLETED" ]; then
    echo ""
    echo -e "${GREEN}✅ 任务完成！${NC}"
    echo ""
    echo -e "${BLUE}[步骤 3/3] 转录结果:${NC}"
    echo ""

    # 显示完整结果
    echo "$RESPONSE_BODY" | jq '.'

    # 提取并高亮显示转录文本
    TRANSCRIPTION=$(echo "$RESPONSE_BODY" | jq -r '.data.transcription')
    TRANSCRIPTION_LENGTH=$(echo "$RESPONSE_BODY" | jq -r '.data.transcriptionLength')

    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}转录文本 (共 $TRANSCRIPTION_LENGTH 字符):${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo "$TRANSCRIPTION"
    echo -e "${GREEN}======================================${NC}"

    exit 0
  elif [ "$STATUS" = "FAILED" ]; then
    echo ""
    echo -e "${RED}❌ 任务失败${NC}"
    echo ""
    echo "$RESPONSE_BODY" | jq '.'

    ERROR_MESSAGE=$(echo "$RESPONSE_BODY" | jq -r '.data.errorMessage')
    echo ""
    echo -e "${RED}错误信息: $ERROR_MESSAGE${NC}"

    exit 1
  elif [ "$STATUS" = "PROCESSING" ] || [ "$STATUS" = "PENDING" ]; then
    echo "等待 ${SLEEP_INTERVAL} 秒后继续查询..."
    sleep $SLEEP_INTERVAL
  else
    echo -e "${RED}未知状态: $STATUS${NC}"
    echo "$RESPONSE_BODY" | jq '.'
    exit 1
  fi

  echo ""
done

echo -e "${RED}❌ 超时: 任务在 ${MAX_RETRIES} 次查询后仍未完成${NC}"
exit 1
