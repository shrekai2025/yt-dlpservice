# YT-DLP Service Puppeteer 集成指南

## 🎯 概述

为了解决 YouTube 登录认证问题，YT-DLP Service 现已集成 **专用 Chromium 浏览器** 功能。通过 Puppeteer 控制的独立浏览器实例，您可以安全地登录 YouTube，无需在主浏览器中授权。

## 🌟 特性

- **🔐 安全隔离**: 专用 Chromium 实例，与您的主浏览器完全隔离
- **🍪 Cookies 管理**: 自动提取和保存 YouTube 登录状态
- **🔄 会话持久化**: 登录状态保存在专用数据目录中
- **⚙️ 环境适配**: 支持开发环境（可视化）和生产环境（headless）
- **🚀 自动集成**: 与 yt-dlp 无缝集成，自动使用登录状态

## 🏗️ 技术架构

### 核心组件

1. **BrowserManager** (`src/lib/services/browser-manager.ts`)
   - 管理 Chromium 浏览器实例
   - 处理 YouTube 登录流程
   - 提取和保存 Cookies

2. **Browser API Router** (`src/server/api/routers/browser.ts`)
   - 提供浏览器管理的 tRPC API
   - 支持登录状态查询、启动登录、刷新等操作

3. **Enhanced VideoDownloader** (`src/lib/services/video-downloader.ts`)
   - 自动检测并使用专用浏览器的 Cookies
   - 与传统 yt-dlp 命令无缝集成

### 数据流程

```
用户触发登录 → BrowserManager 启动 Chromium → 用户在专用浏览器中登录 YouTube → 
自动提取 Cookies → 保存到文件 → yt-dlp 使用 Cookies 下载视频
```

## 📋 使用指南

### 开发环境

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **访问管理面板**
   - 打开 http://localhost:3000/admin
   - 找到"YouTube 登录管理"部分

3. **完成登录**
   ```
   初始化浏览器 → 启动登录 → 在弹出的浏览器中登录 → 确认登录状态
   ```

4. **使用登录状态**
   - 创建 YouTube 视频任务
   - 系统自动使用专用浏览器的登录状态下载

### 生产环境部署

1. **环境变量配置**
   ```env
   # 生产环境使用 headless 模式
   PUPPETEER_HEADLESS=true
   PUPPETEER_ARGS=--no-sandbox --disable-setuid-sandbox
   BROWSER_DATA_DIR=./data/browser_data
   ```

2. **服务器要求**
   - 安装 Chromium 依赖（部署脚本已包含）
   - 确保有足够的内存（推荐 2GB+）

3. **Headless 模式登录**
   - 可以先在开发环境登录并导出 Cookies
   - 或使用 X11 转发在服务器上进行图形化登录

## 🔧 API 接口

### Browser Management APIs

```typescript
// 获取登录状态
const status = await api.browser.getLoginStatus.useQuery()

// 启动登录流程
const result = await api.browser.startLogin.useMutation()

// 刷新登录状态
const refreshed = await api.browser.refreshLogin.useMutation()

// 关闭浏览器
await api.browser.closeBrowser.useMutation()

// 测试浏览器功能
await api.browser.testBrowser.useMutation()
```

### 管理界面功能

- **登录状态显示**: 实时显示 YouTube 登录状态和登录时间
- **一键登录**: 点击按钮即可启动专用浏览器登录
- **状态刷新**: 手动刷新登录状态
- **浏览器控制**: 关闭和重启浏览器实例

## 📁 文件结构

```
yt-dlpservice/
├── src/lib/services/
│   ├── browser-manager.ts      # 浏览器管理核心服务
│   └── video-downloader.ts     # 增强的视频下载器
├── src/server/api/routers/
│   └── browser.ts              # 浏览器管理 API
├── data/browser_data/          # 专用浏览器数据目录
│   ├── Default/                # Chromium 用户配置
│   └── youtube_cookies.txt     # 提取的 YouTube Cookies
└── deploy/
    └── install.sh              # 包含 Puppeteer 依赖安装
```

## 🛠️ 配置选项

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PUPPETEER_HEADLESS` | `false` | 是否使用无头模式 |
| `PUPPETEER_ARGS` | `--no-sandbox --disable-setuid-sandbox` | Chromium 启动参数 |
| `BROWSER_DATA_DIR` | `./data/browser_data` | 浏览器数据目录 |

### Chromium 启动参数

- `--no-sandbox`: 禁用沙盒（服务器环境需要）
- `--disable-setuid-sandbox`: 禁用 setuid 沙盒
- `--disable-dev-shm-usage`: 减少内存使用
- `--disable-background-timer-throttling`: 防止后台限制

## 🔍 故障排除

### 常见问题

#### 1. 浏览器启动失败
```bash
# 检查依赖是否安装
apt list --installed | grep libgtk

# 重新安装依赖
sudo apt install -y libgtk-3-0 libnss3 libatk-bridge2.0-0
```

#### 2. 无法显示浏览器窗口（服务器）
```bash
# 启用 X11 转发
ssh -X username@server

# 或使用 headless 模式
PUPPETEER_HEADLESS=true
```

#### 3. Cookies 无效
```bash
# 清理浏览器数据重新登录
rm -rf data/browser_data/*
```

#### 4. 内存不足
```bash
# 检查内存使用
free -h

# 增加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 日志调试

```bash
# 查看浏览器相关日志
pm2 logs yt-dlpservice | grep -i "browser\|puppeteer\|chromium"

# 查看登录流程日志
pm2 logs yt-dlpservice | grep -i "login\|youtube\|cookies"
```

## 🔐 安全考虑

1. **数据隔离**: 专用浏览器数据与主系统完全隔离
2. **临时文件**: Cookies 文件定期清理，不长期保存敏感信息
3. **权限控制**: 浏览器以非 root 权限运行
4. **网络限制**: 可配置只访问必要的域名

## 🚀 性能优化

1. **资源控制**: 限制浏览器内存使用
2. **按需启动**: 仅在需要时启动浏览器实例
3. **会话复用**: 保持登录状态，避免重复登录
4. **自动清理**: 定期清理临时文件和无用会话

## 📈 未来增强

- [ ] 支持多账户管理
- [ ] 自动 Cookies 续期
- [ ] 批量账户切换
- [ ] 高级代理配置
- [ ] 自定义登录脚本

---

**注意**: 请确保遵守 YouTube 的使用条款，仅将此功能用于合法目的。 