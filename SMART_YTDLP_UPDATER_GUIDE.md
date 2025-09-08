# 🤖 智能YT-DLP自动更新系统

## 📋 概述

这是一个智能的YT-DLP自动更新系统，能够：

- ✅ **任务感知**：检测正在执行的下载任务，避免更新冲突
- ⏰ **定时更新**：每天凌晨3点自动检查并更新
- 🔄 **智能重试**：如果有任务执行，等待并重试
- 📊 **状态跟踪**：完整的更新历史和状态监控
- 🛡️ **安全机制**：强制更新、服务重启等保障措施

## 🚀 快速部署

### 1. 运行测试

首先运行系统测试，确保所有组件正常：

```bash
# 进入项目目录
cd /Users/uniteyoo/Documents/yt-dlpservice

# 运行完整测试
node scripts/test-updater-system.js
```

### 2. 部署到PM2

如果测试通过，按照以下步骤部署：

```bash
# 停止现有服务
pm2 stop all

# 使用新配置启动服务
pm2 start ecosystem.config.cjs --env production

# 保存PM2配置
pm2 save

# 设置PM2开机自启
pm2 startup
```

### 3. 验证部署

```bash
# 查看服务状态
pm2 list

# 查看更新器日志
pm2 logs yt-dlp-auto-updater

# 手动测试任务检查
node scripts/task-status-checker.js

# 查看更新状态
node scripts/update-status-tracker.js --status
```

## 🔧 系统组件

### 1. 任务状态检查器 (`task-status-checker.js`)

**功能**：检测是否有正在执行的任务

**检测方法**：
- 数据库状态检查（PENDING、EXTRACTING、TRANSCRIBING任务）
- 进程检查（yt-dlp、ffmpeg进程）
- 文件系统检查（临时目录活跃文件）

**使用方法**：
```bash
# 详细检查
node scripts/task-status-checker.js

# 简单输出
node scripts/task-status-checker.js --simple

# JSON格式
node scripts/task-status-checker.js --json

# 退出码模式（0=空闲，1=繁忙）
node scripts/task-status-checker.js --exit-code
```

### 2. 智能更新器 (`smart-ytdlp-updater.js`)

**功能**：智能执行YT-DLP更新

**特性**：
- 🕐 时间窗口：只在凌晨3-9点执行
- ⏳ 智能等待：最多等待6小时寻找安全更新窗口
- 🔥 强制更新：超过72小时强制更新
- 🔄 服务重启：更新后自动重启服务

**使用方法**：
```bash
# 正常执行
node scripts/smart-ytdlp-updater.js

# 强制更新
node scripts/smart-ytdlp-updater.js --force

# 仅检查任务状态
node scripts/smart-ytdlp-updater.js --check-only

# 测试模式
node scripts/smart-ytdlp-updater.js --test

# 查看帮助
node scripts/smart-ytdlp-updater.js --help
```

### 3. 状态跟踪器 (`update-status-tracker.js`)

**功能**：记录和监控更新状态

**特性**：
- 📝 状态记录：记录每次更新的详细信息
- 📊 统计分析：成功率、更新频率等统计
- 🏥 健康检查：评估更新系统健康度
- 📚 历史管理：自动清理旧记录

**使用方法**：
```bash
# 查看当前状态
node scripts/update-status-tracker.js --status

# 查看更新历史
node scripts/update-status-tracker.js --history 20

# 生成详细报告
node scripts/update-status-tracker.js --report

# 健康检查
node scripts/update-status-tracker.js --health

# 手动记录状态
node scripts/update-status-tracker.js --record success "手动更新完成"
```

### 4. 系统测试器 (`test-updater-system.js`)

**功能**：全面测试更新系统

**测试项目**：
- 任务状态检查器功能
- 状态跟踪器功能
- PM2配置验证
- 系统集成测试

**使用方法**：
```bash
# 运行完整测试
node scripts/test-updater-system.js

# JSON格式输出
node scripts/test-updater-system.js --json
```

## ⚙️ 配置说明

### PM2配置 (`ecosystem.config.cjs`)

新增的更新任务配置：

```javascript
{
  name: 'yt-dlp-auto-updater',
  script: 'node',
  args: 'scripts/smart-ytdlp-updater.js',
  cron_restart: '0 3 * * *',    // 每天凌晨3点执行
  autorestart: false,           // 执行完成后不重启
  // ... 其他配置
}
```

### 时间配置

可以在 `smart-ytdlp-updater.js` 中修改以下参数：

```javascript
const CONFIG = {
  MAX_WAIT_HOURS: 6,           // 最大等待时间（小时）
  RETRY_INTERVAL_MINUTES: 30,  // 重试间隔（分钟）
  FORCE_UPDATE_HOURS: 72,      // 强制更新间隔（小时）
  UPDATE_WINDOW_START: 3,      // 更新窗口开始时间
  UPDATE_WINDOW_END: 9,        // 更新窗口结束时间
}
```

## 📁 文件结构

```
yt-dlpservice/
├── scripts/
│   ├── task-status-checker.js      # 任务状态检查器
│   ├── smart-ytdlp-updater.js      # 智能更新器
│   ├── update-status-tracker.js    # 状态跟踪器
│   ├── test-updater-system.js      # 系统测试器
│   └── update-ytdlp.sh            # 原始更新脚本
├── logs/
│   ├── ytdlp-updater.log          # 更新器日志
│   ├── ytdlp-update-status.json   # 当前状态
│   ├── ytdlp-update-history.json  # 更新历史
│   ├── updater-out.log            # PM2输出日志
│   ├── updater-error.log          # PM2错误日志
│   └── updater-combined.log       # PM2合并日志
└── ecosystem.config.cjs           # PM2配置文件
```

## 🎯 工作流程

### 自动更新流程

1. **定时触发**：PM2在每天凌晨3点启动更新任务
2. **时间检查**：验证是否在更新窗口内（3-9点）
3. **任务检测**：检查数据库、进程、文件系统中的活跃任务
4. **智能等待**：如有任务执行，每30分钟重试一次，最多等待6小时
5. **执行更新**：调用原始更新脚本更新YT-DLP
6. **服务重启**：更新成功后重启主服务
7. **状态记录**：记录更新结果和详细信息

### 任务检测逻辑

```
数据库检查 → 是否有 PENDING/EXTRACTING/TRANSCRIBING 任务？
     ↓
进程检查 → 是否有 yt-dlp/ffmpeg 进程运行？
     ↓  
文件检查 → 临时目录是否有最近修改的文件？
     ↓
综合判断 → 系统是否空闲可以更新？
```

## 🔍 监控和故障排除

### 监控命令

```bash
# 查看PM2服务状态
pm2 list

# 实时查看更新器日志
pm2 logs yt-dlp-auto-updater --lines 50

# 查看更新状态
node scripts/update-status-tracker.js --health

# 检查系统健康度
node scripts/test-updater-system.js
```

### 常见问题

**1. 更新任务不执行**
```bash
# 检查PM2配置
pm2 describe yt-dlp-auto-updater

# 检查cron配置
pm2 logs yt-dlp-auto-updater | grep cron

# 手动触发更新
pm2 restart yt-dlp-auto-updater
```

**2. 更新失败**
```bash
# 查看错误日志
pm2 logs yt-dlp-auto-updater --err

# 检查更新状态
node scripts/update-status-tracker.js --status

# 手动更新测试
bash scripts/update-ytdlp.sh
```

**3. 任务检测不准确**
```bash
# 测试任务检查器
node scripts/task-status-checker.js

# 检查数据库连接
node scripts/test-updater-system.js
```

### 强制更新

如果需要立即更新，不等待任务完成：

```bash
# 方法1：手动执行强制更新
node scripts/smart-ytdlp-updater.js --force

# 方法2：直接执行原始更新脚本
bash scripts/update-ytdlp.sh --restart-service
```

## 📊 状态说明

### 更新状态

- `success`：更新成功
- `failed`：更新失败
- `skipped`：跳过更新（有任务执行）
- `partial`：部分成功（更新成功但服务重启失败）
- `error`：更新过程异常

### 健康状态

- `healthy`：系统正常（80-100分）
- `warning`：需要注意（60-79分）
- `critical`：需要紧急处理（0-59分）

## 🛠️ 高级配置

### 修改更新时间

编辑 `ecosystem.config.cjs`：

```javascript
// 每天凌晨2点
cron_restart: '0 2 * * *'

// 每两天凌晨3点
cron_restart: '0 3 */2 * *'

// 每周日凌晨4点
cron_restart: '0 4 * * 0'
```

### 自定义检查逻辑

可以修改 `task-status-checker.js` 中的检查逻辑：

```javascript
// 调整超时时间
const timeoutThreshold = 15 * 60 * 1000 // 改为15分钟

// 调整文件活跃时间
const recentThreshold = 10 * 60 * 1000 // 改为10分钟
```

### 添加通知

可以在更新成功/失败时发送通知，修改 `smart-ytdlp-updater.js`：

```javascript
// 在更新成功后添加
if (updateResult.success) {
  // 发送成功通知
  await sendNotification('YT-DLP更新成功', details)
}
```

## 🎉 总结

这个智能更新系统确保了：

1. **避免冲突**：智能检测任务状态，不会在下载过程中更新
2. **自动化**：完全自动化的更新流程，无需人工干预
3. **可靠性**：多重检查、重试机制、强制更新保障
4. **可监控**：完整的日志、状态跟踪和健康检查
5. **可维护**：详细的测试、清晰的配置和故障排除指南

部署后，你的YT-DLP将始终保持最新版本，避免因版本过旧导致的下载失败问题！
