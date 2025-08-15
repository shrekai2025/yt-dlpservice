# 部署和更新指南

本文档介绍如何在远程 Ubuntu 服务器上部署和更新 yt-dlpservice 项目。

## 🚀 快速更新（推荐方式）

### 方法一：使用项目脚本更新

在远程服务器上，进入项目目录并运行：

```bash
# 进入项目目录
cd ~/yt-dlpservice

# 完整更新（包括代码、依赖、yt-dlp）
./deploy/update.sh

# 如果需要数据库迁移
./deploy/update.sh --migrate
```

### 方法二：仅更新 yt-dlp

```bash
# 使用 npm 脚本更新
npm run update:ytdlp

# 或直接使用更新脚本
./scripts/update-ytdlp.sh

# 更新后重启服务
./scripts/update-ytdlp.sh --restart-service
```

### 方法三：使用 npm 生命周期

```bash
# 更新项目依赖（会自动更新 yt-dlp）
npm install

# 手动触发 yt-dlp 设置
npm run setup:ytdlp
```

## 📋 可用的 npm 脚本

| 脚本 | 功能 |
|------|------|
| `npm run setup:ytdlp` | 安装/设置 yt-dlp |
| `npm run update:ytdlp` | 更新 yt-dlp 到最新版本 |
| `npm run deploy:setup` | 完整部署设置（依赖+yt-dlp+数据库） |

## 🔧 手动更新步骤

如果自动脚本失败，可以按以下步骤手动更新：

### 1. 更新 yt-dlp

```bash
# 方法1: 使用 pipx（推荐）
pipx upgrade yt-dlp

# 方法2: 使用 pip（如果 pipx 不可用）
python3 -m pip install --upgrade yt-dlp --break-system-packages

# 方法3: 使用 apt（可能版本较旧）
sudo apt update && sudo apt install yt-dlp
```

### 2. 验证更新

```bash
# 检查版本
yt-dlp --version
# 或
python3 -m yt_dlp --version

# 测试功能
yt-dlp --get-title "https://www.youtube.com/watch?v=fDDqHDSxvqs"
```

### 3. 重启服务

```bash
# PM2
pm2 restart yt-dlpservice

# systemd
sudo systemctl restart yt-dlpservice

# 手动启动
npm start
```

## 🏗️ 首次部署

### 1. 安装系统依赖

```bash
# 运行依赖安装脚本
./deploy/install-dependencies.sh
```

### 2. 设置项目

```bash
# 安装 Node.js 依赖并设置 yt-dlp
npm run deploy:setup
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

### 4. 启动服务

```bash
# 使用 PM2
pm2 start ecosystem.config.cjs
pm2 save

# 或使用 npm
npm start
```

## 🐛 故障排除

### yt-dlp 安装失败

```bash
# 如果遇到 "externally-managed-environment" 错误
# 使用以下任一方法：

# 方法1: 安装 pipx
sudo apt install pipx
pipx install yt-dlp

# 方法2: 使用 --break-system-packages
python3 -m pip install --upgrade yt-dlp --break-system-packages

# 方法3: 创建虚拟环境
python3 -m venv ~/yt-dlp-env
source ~/yt-dlp-env/bin/activate
pip install yt-dlp
```

### 服务无法启动

```bash
# 检查日志
pm2 logs yt-dlpservice
# 或
sudo journalctl -u yt-dlpservice -f

# 检查端口占用
sudo lsof -i :3000

# 检查依赖
npm install
npm run db:generate
```

### yt-dlp 路径问题

项目会自动检测 yt-dlp 路径，支持以下位置：
- `/usr/local/bin/yt-dlp`
- `/usr/bin/yt-dlp`
- `~/.local/bin/yt-dlp` (pipx 安装位置)
- `python3 -m yt_dlp`

如果仍有问题，可以手动指定路径：

```bash
# 找到 yt-dlp 位置
which yt-dlp
# 或
find /usr -name yt-dlp 2>/dev/null
```

## 📊 监控和维护

### 检查服务状态

```bash
# PM2 状态
pm2 status
pm2 monit

# systemd 状态
sudo systemctl status yt-dlpservice
```

### 定期维护

建议每月执行一次：

```bash
# 更新系统包
sudo apt update && sudo apt upgrade

# 更新项目
./deploy/update.sh

# 清理日志
pm2 flush
```

### 版本检查

```bash
# 检查所有相关版本
echo "yt-dlp: $(yt-dlp --version 2>/dev/null || python3 -m yt_dlp --version 2>/dev/null || echo '未安装')"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "FFmpeg: $(ffmpeg -version 2>/dev/null | head -1 || echo '未安装')"
```

## 🔄 自动化更新

可以设置 cron 任务自动更新 yt-dlp：

```bash
# 编辑 crontab
crontab -e

# 添加每周更新任务（每周日凌晨2点）
0 2 * * 0 cd /path/to/yt-dlpservice && npm run update:ytdlp >/dev/null 2>&1
```

## 📞 获取帮助

如果遇到问题：

1. 查看项目日志：`pm2 logs yt-dlpservice`
2. 检查系统日志：`sudo journalctl -u yt-dlpservice -f`
3. 验证依赖：`npm run setup:ytdlp`
4. 重启服务：`pm2 restart yt-dlpservice`

更多问题请查看项目 README.md 或提交 issue。