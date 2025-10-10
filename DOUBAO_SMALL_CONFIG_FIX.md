# 豆包录音文件识别（小模型版）配置修复说明

## 问题描述

在 `/admin/tools` 的"语音服务状态总览"中，豆包录音文件识别（小模型版）显示：
```
❌ 服务不可用: 豆包小模型服务配置不完整
```

## 根本原因

1. **状态检查逻辑不完善**：原来的 `checkServiceStatus()` 方法在配置验证失败时，错误消息不够明确
2. **环境变量缺失**：`.env.example` 文件中缺少豆包小模型相关的环境变量示例

## 已修复的问题

### 1. 优化状态检查逻辑

**文件**：`src/lib/services/doubao-small-stt.ts` (第 702-767 行)

**改进点**：
- 在检查状态时，**不抛出异常**，而是返回详细的配置缺失信息
- 明确显示缺少哪些具体配置项
- 区分配置加载失败、配置不完整、网络异常等不同错误

**修改前**：
```typescript
public async checkServiceStatus(): Promise<{available: boolean, message: string}> {
  try {
    await this.ensureInitialized();
    this.validateConfiguration(); // 会抛出异常
    // ...
  } catch (error: any) {
    return {
      available: false,
      message: `服务不可用: ${error.message}` // 错误消息不明确
    };
  }
}
```

**修改后**：
```typescript
public async checkServiceStatus(): Promise<{available: boolean, message: string}> {
  try {
    const missingConfigs: string[] = [];
    await this.loadConfiguration();
    
    // 检查必需配置
    if (!this.appId) missingConfigs.push('DOUBAO_SMALL_APP_ID');
    if (!this.token) missingConfigs.push('DOUBAO_SMALL_TOKEN');
    if (!this.cluster) missingConfigs.push('DOUBAO_SMALL_CLUSTER');
    if (!this.tosAccessKeyId) missingConfigs.push('TOS_ACCESS_KEY_ID');
    if (!this.tosSecretAccessKey) missingConfigs.push('TOS_SECRET_ACCESS_KEY');
    
    if (missingConfigs.length > 0) {
      return {
        available: false,
        message: `配置不完整，缺少: ${missingConfigs.join(', ')}` // 明确显示缺失项
      };
    }
    // ...
  }
}
```

### 2. 补充环境变量示例

**文件**：`.env.example`

**新增配置**：

```bash
# 豆包录音文件识别（小模型版）API配置
DOUBAO_SMALL_APP_ID=""
DOUBAO_SMALL_TOKEN=""
DOUBAO_SMALL_CLUSTER=""
DOUBAO_SMALL_ENDPOINT="openspeech.bytedance.com"

# 火山引擎TOS对象存储配置（豆包小模型需要）
TOS_ACCESS_KEY_ID=""
TOS_SECRET_ACCESS_KEY=""
TOS_REGION="ap-southeast-1"
TOS_BUCKET_NAME="stt-small-01"
TOS_ENDPOINT="tos-ap-southeast-1.volces.com"
```

## 如何配置豆包小模型服务

### 1. 复制环境变量模板

```bash
cp .env.example .env.local
```

### 2. 填写豆包小模型配置

在 `.env.local` 中填入以下信息：

```bash
# 豆包录音文件识别（小模型版）API配置
DOUBAO_SMALL_APP_ID="your_app_id"           # 豆包小模型应用ID
DOUBAO_SMALL_TOKEN="your_token"              # 豆包小模型Token
DOUBAO_SMALL_CLUSTER="your_cluster"          # 豆包小模型集群
DOUBAO_SMALL_ENDPOINT="openspeech.bytedance.com"

# 火山引擎TOS对象存储配置
TOS_ACCESS_KEY_ID="your_access_key_id"       # TOS访问密钥ID
TOS_SECRET_ACCESS_KEY="your_secret_key"      # TOS访问密钥
TOS_REGION="ap-southeast-1"                  # TOS区域
TOS_BUCKET_NAME="your_bucket_name"           # TOS存储桶名称
TOS_ENDPOINT="tos-ap-southeast-1.volces.com"
```

### 3. 重启服务

```bash
npm run dev
```

### 4. 验证配置

访问 `/admin/tools` 页面，查看"语音服务状态总览"：

- ✅ **配置正确**：显示 "豆包小模型服务可用"
- ❌ **配置不完整**：显示 "配置不完整，缺少: XXX, YYY"

## 必需的配置项

豆包录音文件识别（小模型版）需要以下 5 个必需配置：

| 配置项 | 说明 | 来源 |
|-------|------|------|
| `DOUBAO_SMALL_APP_ID` | 豆包小模型应用ID | 豆包开放平台 |
| `DOUBAO_SMALL_TOKEN` | 豆包小模型Token | 豆包开放平台 |
| `DOUBAO_SMALL_CLUSTER` | 豆包小模型集群 | 豆包开放平台 |
| `TOS_ACCESS_KEY_ID` | 火山引擎TOS访问密钥ID | 火山引擎控制台 |
| `TOS_SECRET_ACCESS_KEY` | 火山引擎TOS访问密钥 | 火山引擎控制台 |

## 可选配置项（有默认值）

| 配置项 | 默认值 | 说明 |
|-------|--------|------|
| `DOUBAO_SMALL_ENDPOINT` | `openspeech.bytedance.com` | 豆包API端点 |
| `TOS_REGION` | `ap-southeast-1` | TOS区域 |
| `TOS_BUCKET_NAME` | `stt-small-01` | TOS存储桶名称 |
| `TOS_ENDPOINT` | `tos-ap-southeast-1.volces.com` | TOS端点 |

## 状态消息说明

| 状态消息 | 说明 | 解决方案 |
|---------|------|---------|
| `豆包小模型服务可用` | ✅ 服务正常 | 无需操作 |
| `配置不完整，缺少: XXX` | ❌ 缺少必需配置 | 在 `.env.local` 中添加缺失的配置项 |
| `配置加载失败: XXX` | ❌ 配置加载错误 | 检查数据库连接或文件权限 |
| `网络连接异常: XXX` | ❌ 网络问题 | 检查网络连接和防火墙设置 |
| `服务检查失败: XXX` | ❌ 其他错误 | 查看日志详细信息 |

## 相关文档

- [豆包小模型API使用示例](./DOUBAO_SMALL_API_EXAMPLES.md)
- [语音服务配置指南](./docs/voice-service-config.md)
- [环境变量配置](./docs/environment-variables.md)

## 修复效果

**修复前**：
```
豆包录音文件识别（小模型版）
❌ 豆包小模型服务配置不完整
```

**修复后**：
```
豆包录音文件识别（小模型版）
❌ 配置不完整，缺少: DOUBAO_SMALL_APP_ID, DOUBAO_SMALL_TOKEN, DOUBAO_SMALL_CLUSTER
```

现在用户可以清楚地知道需要配置哪些环境变量！
