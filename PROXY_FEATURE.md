# 代理功能扩展文档

## 概述

本次更新为系统添加了完整的代理支持功能，允许通过本地HTTP代理访问国际API服务（如Google API和各种AI生成服务）。

## 功能特性

### 1. 两种代理配置类型

- **AI生成服务代理** (`AI_GENERATION_PROXY`)
  - 应用于所有AI生成服务（图像、视频、音频等）
  - 覆盖范围：
    - AI生成独立页面 (`/admin/ai-generation`)
    - Studio镜头制作页面（图像/视频生成）
    - 所有第三方AI平台API调用

- **Google API代理** (`GOOGLE_API_PROXY`)
  - 应用于Google相关服务
  - 覆盖范围：
    - Google Speech-to-Text API
    - Google Cloud Storage
    - Google Gemini API

### 2. 配置方式

支持两种配置方式，优先级从高到低：

1. **数据库配置**（运行时动态配置，推荐）
   - 通过运维工具页面 `/admin/config-tools` 的"代理配置"选项卡设置
   - 实时生效，无需重启服务
   - 配置存储在 `Config` 表中

2. **环境变量配置**（静态配置，作为fallback）
   - 在 `.env` 文件中配置
   - 需要重启服务才能生效

## 环境变量配置

### AI生成服务代理

```bash
# AI生成服务代理配置
AI_GENERATION_PROXY_ENABLED="false"  # true 启用 / false 禁用
AI_GENERATION_PROXY_HOST="127.0.0.1"  # 代理主机地址
AI_GENERATION_PROXY_PORT="7890"       # 代理端口
```

### Google API代理

```bash
# Google API代理配置
GOOGLE_API_PROXY_ENABLED="false"  # true 启用 / false 禁用
GOOGLE_API_PROXY_HOST="127.0.0.1"  # 代理主机地址
GOOGLE_API_PROXY_PORT="7890"       # 代理端口
```

## UI配置指南

### 访问配置页面

1. 登录管理后台
2. 进入"运维工具" (`/admin/config-tools`)
3. 点击左侧菜单的"代理配置"选项卡

### 配置AI生成服务代理

1. 勾选"启用代理"复选框
2. 输入代理主机地址（如 `127.0.0.1`）
3. 输入代理端口（如 `7890`）
4. 点击"测试连接"验证代理可用性（可选）
5. 点击"保存配置"

### 配置Google API代理

与AI生成服务代理配置相同。

## 技术实现

### 1. 核心文件

#### 代理配置工具
- **文件**: `src/lib/utils/proxy-config.ts`
- **功能**: 统一管理代理配置的读写
- **主要函数**:
  - `getProxyConfig(type)`: 获取代理配置
  - `setProxyConfig(type, config)`: 设置代理配置
  - `getAxiosProxyConfig(type)`: 获取axios格式的代理配置

#### BaseAdapter扩展
- **文件**: `src/lib/ai-generation/adapters/base-adapter.ts`
- **新增方法**:
  - `applyProxyConfig(requestConfig)`: 应用代理配置
  - `post(url, data, config)`: 自动应用代理的POST请求
  - `get(url, config)`: 自动应用代理的GET请求
  - `request(config)`: 自动应用代理的通用请求

#### tRPC路由
- **文件**: `src/server/api/routers/proxy.ts`
- **端点**:
  - `proxy.getConfig`: 获取单个代理配置
  - `proxy.getAllConfigs`: 获取所有代理配置
  - `proxy.setConfig`: 设置代理配置
  - `proxy.testConnection`: 测试代理连接

#### UI组件
- **文件**: `src/app/admin/config-tools/page.tsx`
- **新增**: `ProxyConfigSection` 组件

### 2. 适配器使用示例

在适配器中使用代理：

```typescript
// 旧方式（不支持代理）
const response = await this.httpClient.post<ResponseType>(
  url,
  payload,
  {
    headers: this.getAuthHeaders(),
    timeout: 120000,
  }
);
const data = response.data;

// 新方式（自动应用代理）
const data = await this.post<ResponseType>(
  url,
  payload,
  {
    headers: this.getAuthHeaders(),
    timeout: 120000,
  }
);
```

## 常见代理软件端口

| 代理软件 | HTTP端口 | SOCKS5端口 |
|---------|---------|-----------|
| Clash | 7890 | 7891 |
| V2Ray | 10809 | 10808 |
| Shadowsocks | - | 1080 |
| 自定义代理池 | 自定义 | 自定义 |

**注意**: 本系统目前仅支持HTTP/HTTPS代理，不支持SOCKS5代理。

## 测试步骤

### 1. 测试代理连接

在配置页面使用"测试连接"功能：
- 输入代理主机和端口
- 点击"测试连接"按钮
- 系统会尝试通过代理访问 `https://www.google.com`
- 显示测试结果（成功或失败）

### 2. 测试AI生成服务

1. 启用AI生成代理
2. 进入AI生成页面 (`/admin/ai-generation`)
3. 选择一个模型（如Gemini Flash Image）
4. 提交生成任务
5. 查看日志，应该显示"使用代理: xxx:xxx"

### 3. 测试Google API

1. 启用Google API代理
2. 上传一个音频文件进行STT转录
3. 选择Google STT作为提供商
4. 查看日志，应该显示代理连接信息

## 故障排查

### 代理不生效

1. 检查代理服务器是否运行
2. 检查端口是否正确
3. 查看应用日志，搜索"使用代理"关键字
4. 确认代理配置已保存到数据库

### 代理连接失败

1. 使用"测试连接"功能验证代理
2. 检查防火墙设置
3. 尝试使用curl命令测试代理：
   ```bash
   curl -x http://127.0.0.1:7890 https://www.google.com
   ```

### Gemini API返回400错误

如果Gemini API通过代理返回400错误，可能的原因：

1. **代理类型不兼容**
   - 某些代理软件对HTTPS的CONNECT方法支持不完善
   - 尝试在代理软件中启用"增强模式"或"TUN模式"
   - Clash用户：确保开启了"允许局域网连接"

2. **请求体太大**
   - Gemini会下载并编码图片为base64，可能导致请求体过大
   - 建议使用小尺寸的输入图片（< 1MB）
   - 或者暂时禁用代理，仅对其他服务启用

3. **API Key或区域限制**
   - 某些代理可能修改了请求头
   - 尝试直连测试API Key是否有效

**测试脚本**：

```bash
# 设置环境变量
export GEMINI_API_KEY="your-api-key"
export PROXY_HOST="127.0.0.1"
export PROXY_PORT="7897"

# 运行测试
npx tsx scripts/test-gemini-proxy.ts
```

### 配置不生效

1. 数据库配置优先级高于环境变量
2. 检查数据库中的Config表是否有相应记录
3. 刷新页面重新加载配置

## 注意事项

1. **代理配置立即生效**: 修改代理配置后无需重启服务
2. **配置优先级**: 数据库配置 > 环境变量配置
3. **代理类型**: 仅支持HTTP/HTTPS代理
4. **故障回退**: 如果代理失败，某些服务可能会自动尝试直连
5. **安全性**: 确保代理服务器的安全性，避免流量泄露

## 日志示例

成功使用代理时的日志：

```
[GeminiFlashImageAdapter] 使用代理: 127.0.0.1:7890
[GeminiFlashImageAdapter] Dispatching Gemini 2.5 Flash image generation
```

## 未来扩展

可能的功能扩展：

1. 支持SOCKS5代理
2. 支持代理认证（用户名/密码）
3. 支持每个AI提供商独立配置代理
4. 代理连接池和负载均衡
5. 代理性能监控和统计

## 更新日志

### 2025-10-25
- ✅ 添加AI生成服务代理支持
- ✅ 添加Google API代理支持
- ✅ 创建代理配置UI界面
- ✅ 实现数据库配置存储
- ✅ 添加代理连接测试功能
- ✅ 更新BaseAdapter支持代理
- ✅ 示例: 修改Gemini Flash Image适配器使用代理
