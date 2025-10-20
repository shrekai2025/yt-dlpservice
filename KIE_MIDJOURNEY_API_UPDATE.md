# KIE Midjourney API 更新说明

## 更新日期
2025-10-14

## 问题描述
KIE Midjourney 接口报错 "不能为空",原因是 API 更新后,`taskType` 成为必需参数,但之前的代码没有正确设置该参数。

## API 变更内容

### 1. 端点变更
- **创建任务**: `/api/v1/midjourney/submit-task` → `/api/v1/mj/generate`
- **查询状态**: `/api/v1/midjourney/record-info` → `/api/v1/mj/record-info`

### 2. 请求参数变更

#### 必需参数
- **`taskType`**: 新增为必需参数,可选值:
  - `mj_txt2img`: 文生图
  - `mj_img2img`: 图生图
  - `mj_style_reference`: 风格参考
  - `mj_omni_reference`: 全能参考
  - `mj_video`: 图生标清视频
  - `mj_video_hd`: 图生高清视频

#### 图片输入参数
- **推荐使用**: `fileUrls` (数组格式)
- **向后兼容**: 保留 `fileUrl` (单个 URL)
- 适配器现在同时发送两个参数以确保兼容性

### 3. 响应结构变更

#### 状态查询响应
```typescript
// 旧结构
{
  response: {
    resultUrls: string[]
    videoUrls: string[]
  }
}

// 新结构
{
  resultInfoJson: {
    resultUrls: Array<{
      resultUrl: string
    }>
  }
}
```

## 代码修改

### 1. 适配器更新 (`kie-midjourney-adapter.ts`)

#### 1.1 接口定义更新
```typescript
interface KieMjStatusResponse {
  code: number
  msg: string
  data?: {
    taskId: string
    taskType: string
    paramJson: string
    completeTime: string
    resultInfoJson?: {
      resultUrls?: Array<{
        resultUrl: string
      }>
    }
    successFlag: number
    createTime: string
    errorCode: number | null
    errorMessage: string | null
  }
}
```

#### 1.2 必需参数 `taskType` 处理
```typescript
// 任务类型 (必需参数,默认为文生图)
// 根据是否有输入图片自动判断
const defaultTaskType = request.inputImages && request.inputImages.length > 0 
  ? 'mj_img2img'  // 有输入图片,默认为图生图
  : 'mj_txt2img'  // 无输入图片,默认为文生图

payload.taskType = request.parameters?.taskType || defaultTaskType
```

#### 1.3 图片输入参数更新
```typescript
// 输入图片 - 使用 fileUrls (推荐) 或 fileUrl (向后兼容)
if (request.inputImages && request.inputImages.length > 0) {
  payload.fileUrls = request.inputImages
  // 向后兼容,同时提供 fileUrl
  payload.fileUrl = request.inputImages[0]
}
```

#### 1.4 API 端点更新
```typescript
// 创建任务
const response = await this.httpClient.post<KieMjTaskResponse>(
  '/api/v1/mj/generate',  // 新端点
  payload,
  {
    baseURL: this.getApiEndpoint() || 'https://api.kie.ai',
  }
)

// 查询状态
const response = await this.httpClient.get<KieMjStatusResponse>(
  '/api/v1/mj/record-info',  // 新端点
  {
    baseURL: this.getApiEndpoint() || 'https://api.kie.ai',
    params: { taskId },
  }
)
```

#### 1.5 结果解析更新
```typescript
const { successFlag, resultInfoJson, errorMessage } = data

if (successFlag === 1 && resultInfoJson) {
  const results: GenerationResult[] = []

  if (resultInfoJson.resultUrls && resultInfoJson.resultUrls.length > 0) {
    resultInfoJson.resultUrls.forEach((item) => {
      const url = item.resultUrl
      const isVideo = url.toLowerCase().match(/\.(mp4|mov|avi|webm)$/)
      
      results.push({
        type: isVideo ? 'video' : 'image',
        url,
      })
    })
  }
}
```

### 2. 模型参数配置更新 (`model-parameters.ts`)

#### 2.1 `kie-midjourney-image` 配置
新增 `taskType` 参数(必需):
```typescript
{
  key: 'taskType',
  label: '任务类型',
  type: 'select',
  defaultValue: 'mj_txt2img',
  options: [
    { label: '文生图', value: 'mj_txt2img' },
    { label: '图生图', value: 'mj_img2img' },
    { label: '风格参考', value: 'mj_style_reference' },
    { label: '全能参考', value: 'mj_omni_reference' },
  ],
  helperText: '选择生成模式。有输入图片时建议选择图生图或参考模式',
}
```

新增 `ow` 参数(Omni Reference 专用):
```typescript
{
  key: 'ow',
  label: 'Omni 强度 (1-1000)',
  type: 'number',
  min: 1,
  max: 1000,
  step: 1,
  defaultValue: 500,
  helperText: '仅在 Omni Reference 模式下生效。数值越高参考图影响越强',
}
```

#### 2.2 `kie-midjourney-video` 配置
新增 `taskType` 参数(必需):
```typescript
{
  key: 'taskType',
  label: '任务类型',
  type: 'select',
  defaultValue: 'mj_video',
  options: [
    { label: '标清视频', value: 'mj_video' },
    { label: '高清视频', value: 'mj_video_hd' },
  ],
  helperText: '选择视频生成质量',
}
```

## 使用说明

### 图像生成示例

#### 1. 文生图
```json
{
  "taskType": "mj_txt2img",
  "prompt": "一只可爱的猫咪",
  "speed": "relaxed",
  "aspectRatio": "16:9",
  "version": "7"
}
```

#### 2. 图生图
```json
{
  "taskType": "mj_img2img",
  "prompt": "将这张图片转换成油画风格",
  "fileUrls": ["https://example.com/image.jpg"],
  "speed": "fast",
  "aspectRatio": "1:1"
}
```

#### 3. 全能参考 (Omni Reference)
```json
{
  "taskType": "mj_omni_reference",
  "prompt": "一个未来科幻城市",
  "fileUrls": ["https://example.com/reference.jpg"],
  "ow": 500,
  "aspectRatio": "16:9"
}
```

### 视频生成示例

#### 标清视频
```json
{
  "taskType": "mj_video",
  "prompt": "视频描述",
  "fileUrls": ["https://example.com/image.jpg"],
  "motion": "high",
  "videoBatchSize": 1,
  "aspectRatio": "16:9"
}
```

#### 高清视频
```json
{
  "taskType": "mj_video_hd",
  "prompt": "视频描述",
  "fileUrls": ["https://example.com/image.jpg"],
  "motion": "low",
  "videoBatchSize": 2,
  "aspectRatio": "9:16"
}
```

## 兼容性说明

1. **自动判断 taskType**: 如果用户没有指定 `taskType`,适配器会根据是否有输入图片自动选择:
   - 无输入图片 → `mj_txt2img`
   - 有输入图片 → `mj_img2img`

2. **图片输入兼容**: 同时发送 `fileUrls` 和 `fileUrl`,确保新旧 API 都能正常工作

3. **结果类型识别**: 通过 URL 后缀自动判断是图片还是视频

## 测试建议

1. **文生图测试**: 不传入任何图片,验证 `taskType` 默认为 `mj_txt2img`
2. **图生图测试**: 传入图片,验证 `taskType` 默认为 `mj_img2img`
3. **参数覆盖测试**: 手动指定 `taskType`,验证是否正确使用用户指定的值
4. **视频生成测试**: 使用 `mj_video` 和 `mj_video_hd` 生成视频
5. **Omni Reference 测试**: 使用 `mj_omni_reference` 并配置 `ow` 参数

## Bug 修复 (2025-10-18)

### 问题：视频生成时报错 "The speed parameter is incorrect"

**原因**:
- `speed` 参数仅适用于图像生成任务，不适用于视频生成任务
- 适配器之前会无条件发送所有参数，包括不适用的 `speed` 参数

**解决方案**:
在 `kie-midjourney-adapter.ts` 中添加任务类型判断：
```typescript
// 判断任务类型
const isVideoTask = payload.taskType === 'mj_video' || payload.taskType === 'mj_video_hd'

// 只在非视频任务时发送图像专用参数
if (!isVideoTask) {
  // speed, version, variety, stylization, weirdness, ow
}

// 只在视频任务时发送视频专用参数
if (isVideoTask) {
  // videoBatchSize, motion
}
```

## 相关文件

- `/src/lib/ai-generation/adapters/kie/kie-midjourney-adapter.ts`
- `/src/lib/ai-generation/config/model-parameters.ts`

## 参考文档

- [KIE Midjourney Generate API](https://api.kie.ai/docs/mj-api/generate-mj-image)
- [KIE Midjourney Task Details API](https://api.kie.ai/docs/mj-api/get-mj-task-details)



