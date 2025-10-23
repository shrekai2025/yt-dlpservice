# 即梦AI (火山引擎) 接入文档

## 概述

已成功接入火山引擎即梦AI的文生图2.1模型到AI生成系统。

### 供应商信息
- **名称**: 即梦AI (火山引擎)
- **Slug**: `jimeng`
- **API端点**: `https://visual.volcengineapi.com`
- **官方文档**: https://www.volcengine.com/docs/85621/1537648

### 模型信息
- **名称**: 即梦AI - 文生图2.1
- **Slug**: `jimeng-text-to-image-v21`
- **适配器**: `JimengTextToImageAdapter`
- **输出类型**: IMAGE
- **功能特性**:
  - ✅ 文生图（Text-to-Image）
  - ✅ 中英文提示词支持
  - ✅ AI超分（2倍分辨率提升）
  - ✅ 提示词自动扩写
  - ✅ 自定义水印
  - ✅ AIGC隐式标识（符合国家标准）

---

## 配置步骤

### 1. 获取API凭证

访问 [火山引擎控制台](https://console.volcengine.com/) 获取：
- **Access Key ID**
- **Secret Access Key**

### 2. 设置凭证（3种方式任选其一）

#### ✅ 方式1: 分别配置环境变量（推荐）

在项目的 `.env` 文件中添加：

```bash
AI_PROVIDER_JIMENG_ACCESS_KEY_ID="your_access_key_id"
AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY="your_secret_access_key"
```

**优点**: 最清晰、最规范，符合火山引擎官方推荐的方式

#### 方式2: 使用JSON格式

在数据库的 `ai_providers` 表中，设置 `apiKey` 字段为JSON格式：

```sql
UPDATE ai_providers
SET apiKey = '{"accessKeyId":"your_access_key_id","secretAccessKey":"your_secret_access_key"}'
WHERE slug = 'jimeng';
```

或在 `.env` 文件中：

```bash
AI_PROVIDER_JIMENG_API_KEY='{"accessKeyId":"xxx","secretAccessKey":"xxx"}'
```

#### 方式3: 使用冒号分隔格式

```bash
AI_PROVIDER_JIMENG_API_KEY="accessKeyId:secretAccessKey"
```

**注意事项**:
- 系统会按优先级尝试：环境变量（分别配置） > apiKey字段（JSON或冒号分隔）
- Secret Access Key 可能是Base64编码的字符串，直接使用即可，无需手动解码
- 凭证配置完成后会自动被系统识别，无需重启

### 3. 验证配置

运行测试脚本验证配置是否正确：

```bash
npx tsx test-jimeng-adapter.ts
```

---

## 模型参数说明

### 基础参数

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `width` | number | 512 | 图片宽度（256-768），推荐512 |
| `height` | number | 512 | 图片高度（256-768），推荐512 |
| `use_sr` | boolean | true | 是否启用超分（2倍放大） |
| `use_pre_llm` | boolean | true | 是否启用提示词扩写 |
| `seed` | number | -1 | 随机种子（-1为随机） |

### 水印参数（可选）

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `add_logo` | boolean | false | 是否添加水印 |
| `logo_position` | number | 0 | 水印位置（0-3：右下/左下/左上/右上） |
| `logo_language` | number | 0 | 水印语言（0:中文, 1:英文） |
| `logo_opacity` | number | 1 | 水印不透明度（0-1） |
| `logo_text_content` | string | '' | 自定义水印文字 |

### AIGC元数据（可选）

用于符合《人工智能生成合成内容标识办法》：

| 参数 | 类型 | 说明 |
|-----|------|------|
| `content_producer` | string | 内容生成服务ID |
| `producer_id` | string | 内容生成服务商给此图片数据的唯一ID |
| `content_propagator` | string | 内容传播服务商ID |
| `propagate_id` | string | 传播服务商给此图片数据的唯一ID |

---

## 使用示例

### 在AI生成独立功能中使用

1. 访问 `/admin/ai-generation` 页面
2. 选择供应商：**即梦AI (火山引擎)**
3. 选择模型：**即梦AI - 文生图2.1**
4. 输入提示词（中英文均可）
5. 调整参数（尺寸、超分、水印等）
6. 点击"生成"按钮

### 在Studio脚本制作中使用

1. 打开Studio编辑器
2. 选择需要AI生成的镜头
3. 打开"AI生成"面板
4. 选择模型：**jimeng-text-to-image-v21**
5. 配置参数并生成

### 通过API调用

```typescript
import { api } from '~/components/providers/trpc-provider'

const generateMutation = api.aiGeneration.generate.useMutation({
  onSuccess: (data) => {
    console.log('任务已创建:', data.id)
  },
})

generateMutation.mutate({
  modelId: 'jimeng_text_to_image_v21',
  prompt: '一只可爱的小猫在草地上玩耍',
  numberOfOutputs: 1,
  parameters: {
    width: 512,
    height: 512,
    use_sr: true,
    use_pre_llm: true,
    seed: -1,
  },
})
```

---

## 定价说明

即梦AI文生图2.1定价参考：

- **基础费用**: 约 $0.008/张
- **超分费用**: 基础费用的 1.5倍
- **大尺寸**: 费用按像素比例增加

**示例**:
- 512x512（无超分）: 约 $0.008/张
- 512x512（含超分至1024x1024）: 约 $0.012/张
- 768x768（含超分至1536x1536）: 约 $0.027/张

---

## 技术架构

### 新增文件

```
src/lib/ai-generation/
├── adapters/
│   ├── jimeng/
│   │   └── jimeng-text-to-image-adapter.ts    # 即梦AI适配器
│   ├── utils/
│   │   └── volcengine-signer.ts               # 火山引擎签名工具
│   └── adapter-factory.ts                      # 已注册JimengTextToImageAdapter
├── config/
│   ├── model-parameters.ts                     # 已添加参数配置
│   └── pricing-info.ts                         # 已添加定价信息
└── validation/
    └── parameter-schemas.ts                    # 已添加验证规则

prisma/migrations/
└── add_jimeng_ai_provider_and_model.sql       # 数据库配置脚本
```

### 火山引擎签名认证

即梦AI使用火山引擎标准的签名认证机制（HMAC-SHA256），已实现：

- ✅ 动态签名生成（每次请求自动计算）
- ✅ 请求拦截器（自动添加签名头）
- ✅ 符合火山引擎公共参数规范
- ✅ Region: `cn-north-1`
- ✅ Service: `cv`

---

## 错误处理

### 常见错误码

| 错误码 | 说明 | 是否可重试 |
|-------|------|-----------|
| 50411 | 输入图片前审核未通过 | 否 |
| 50511 | 输出图片后审核未通过 | 是 |
| 50412 | 输入文本前审核未通过 | 否 |
| 50413 | 输入文本含敏感词/版权词 | 否 |
| 50429 | QPS超限 | 是 |
| 50430 | 并发超限 | 是 |
| 50500 | 内部错误 | 是 |
| 50501 | 内部算法错误 | 是 |

### 错误处理策略

适配器会自动判断错误是否可重试：
- **可重试错误**: 系统会自动重试（QPS超限、内部错误等）
- **不可重试错误**: 直接返回错误信息（审核不通过、敏感词等）

---

## 最佳实践

### 1. 提示词优化

- **中文提示词**: 支持良好，建议开启提示词扩写
- **英文提示词**: 直接输入即可
- **短提示词**: 建议开启 `use_pre_llm` 进行扩写
- **长提示词**: 可关闭 `use_pre_llm` 保证多样性

### 2. 尺寸选择

推荐尺寸及对应比例：

| 比例 | 不含超分 | 含超分 |
|-----|---------|--------|
| 1:1 | 512x512 | 1024x1024 |
| 4:3 | 512x384 | 1024x768 |
| 3:4 | 384x512 | 768x1024 |
| 3:2 | 512x341 | 1024x682 |
| 2:3 | 341x512 | 682x1024 |
| 16:9 | 512x288 | 1024x576 |
| 9:16 | 288x512 | 576x1024 |

**注意**: 宽高与512差距过大会影响出图效果和延迟。

### 3. 超分使用

- **开启超分**: 图片质量更高，但延迟增加
- **关闭超分**: 快速生成，适合预览
- **推荐**: 正式生成开启，预览可关闭

### 4. 随机种子

- **固定种子**: 相同参数生成相似图片（适合微调）
- **随机种子**: 设为 -1，每次生成不同结果

---

## 测试验证

### 运行测试脚本

```bash
# 设置API Key
export AI_PROVIDER_JIMENG_API_KEY="your_access_key_id:your_secret_access_key"

# 运行测试
npx tsx test-jimeng-adapter.ts
```

### 预期输出

```
=== 测试即梦AI适配器 ===

✓ API Key已设置

--- 配置信息 ---
Provider: 即梦AI (火山引擎)
Model: 即梦AI - 文生图2.1
Endpoint: https://visual.volcengineapi.com

✓ 适配器实例已创建

--- 测试请求 ---
Prompt: 一只可爱的小猫在草地上玩耍
参数: 512x512, 开启超分, 开启提示词扩写

⏳ 正在发送生成请求...

--- 生成结果 ---
状态: SUCCESS
消息: Generation completed

✅ 生成成功!
图片数量: 1

图片 1:
  类型: image
  URL: https://...
  元数据:
    扩写后提示词: ...
    重写后提示词: ...

=== 测试完成 ===
```

---

## 数据库配置

已执行的SQL脚本位于：
```
prisma/migrations/add_jimeng_ai_provider_and_model.sql
```

### Provider记录

- **ID**: `jimeng_ai_provider_001`
- **Name**: 即梦AI (火山引擎)
- **Slug**: `jimeng`
- **上传到S3**: 是
- **S3路径前缀**: `ai-generation/jimeng/`

### Model记录

- **ID**: `jimeng_text_to_image_v21`
- **Name**: 即梦AI - 文生图2.1
- **Slug**: `jimeng-text-to-image-v21`
- **Adapter**: `JimengTextToImageAdapter`

---

## 常见问题

### Q1: 凭证配置错误

**错误**: `Missing or invalid Volcengine credentials`

**解决方法**:
1. 检查环境变量名称是否正确：
   - `AI_PROVIDER_JIMENG_ACCESS_KEY_ID`
   - `AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY`
2. 如使用JSON格式，确保JSON格式正确，包含 `accessKeyId` 和 `secretAccessKey` 字段
3. 如使用冒号分隔格式，确保中间只有一个冒号
4. 确认Secret Access Key是否包含特殊字符（如Base64编码的字符串），直接使用原始值

### Q2: 签名验证失败

**错误**: `SignatureDoesNotMatch`

**可能原因**:
1. Access Key ID 或 Secret Access Key 不正确
2. 系统时间与服务器时间相差过大（超过15分钟）
3. Secret Access Key 使用了错误的编码或格式

**解决方法**:
1. 重新从火山引擎控制台获取凭证并验证
2. 同步系统时间：`sudo ntpdate time.apple.com` (macOS) 或 `sudo ntpdate ntp.ubuntu.com` (Linux)
3. 确保Secret Access Key原样使用，无需手动Base64解码

### Q3: 图片审核不通过

**错误码**: `50411`, `50412`, `50413`

**解决**:
1. 检查提示词是否包含敏感内容
2. 修改提示词后重试
3. 这类错误不会自动重试

### Q4: 生成速度慢

**原因**:
- 开启了超分功能
- 尺寸过大

**优化**:
- 预览时关闭超分
- 使用推荐尺寸（512x512）

---

## 下一步

### 可扩展功能

1. **图编辑功能**: 接入即梦AI的图生图、图编辑模型
2. **视频生成**: 接入即梦AI的视频生成模型
3. **批量生成**: 支持一次生成多张图片
4. **风格迁移**: 接入风格相关模型

### 监控和优化

1. 添加成本追踪
2. 添加生成时长统计
3. 添加错误率监控
4. 优化缓存策略

---

## 参考文档

- [火山引擎即梦AI文档](https://www.volcengine.com/docs/85621/1537648)
- [火山引擎公共参数](https://www.volcengine.com/docs/6348/155534)
- [AI生成系统架构文档](./AI_GENERATION_STRUCTURE.md)
- [AI生成实现指南](./AI_GENERATION_IMPLEMENTATION_GUIDE.md)

---

**接入完成时间**: 2025-10-23
**版本**: v1.0
**状态**: ✅ 已完成并测试
