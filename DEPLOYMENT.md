# YT-DLP Service 部署指南

本文档详细说明如何在 Ubuntu 服务器上部署 YT-DLP Service。

## 📋 系统要求

- **操作系统**: Ubuntu 20.04+ (推荐 Ubuntu 22.04 LTS)
- **内存**: 最少 2GB RAM (推荐 4GB+)
- **存储**: 最少 10GB 可用空间 (用于临时文件)
- **网络**: 稳定的互联网连接
- **权限**: 非 root 用户 (推荐使用 ubuntu 用户)

## 🚀 快速部署

### 1. 准备服务器

```bash
# 连接到您的腾讯云服务器
ssh ubuntu@your-server-ip

# 更新系统 (可选)
sudo apt update && sudo apt upgrade -y
```

### 2. 运行安装脚本

```bash
# 克隆项目
git clone https://github.com/your-username/yt-dlpservice.git
cd yt-dlpservice

# 运行安装脚本
chmod +x deploy/install.sh
./deploy/install.sh
```

安装脚本将自动安装:
- Node.js 20.x LTS
- Python 3 和 pip
- FFmpeg
- yt-dlp
- PM2 进程管理器
- SQLite3

### 3. 部署应用

```bash
# 运行部署脚本
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### 4. 配置环境变量

```bash
# 编辑环境配置文件
cd ~/yt-dlpservice
nano .env
```

**重要配置项**:
```env
# 通义听悟 API (必须配置)
TINGWU_ACCESS_KEY_ID=your_access_key_id
TINGWU_ACCESS_KEY_SECRET=your_access_key_secret
TINGWU_REGION=cn-beijing

# 其他配置 (可选)
MAX_CONCURRENT_TASKS=10
TEMP_DIR=/tmp/yt-dlpservice
```

### 5. 重启服务

```bash
pm2 restart yt-dlpservice
```

## 🔧 详细配置

### 环境变量说明

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `NODE_ENV` | 是 | production | 运行环境 |
| `DATABASE_URL` | 是 | file:./data/app.db | SQLite 数据库路径 |
| `TINGWU_ACCESS_KEY_ID` | 是 | - | 通义听悟 Access Key ID |
| `TINGWU_ACCESS_KEY_SECRET` | 是 | - | 通义听悟 Access Key Secret |
| `TINGWU_REGION` | 否 | cn-beijing | 通义听悟 API 地域 |
| `MAX_CONCURRENT_TASKS` | 否 | 10 | 最大并发任务数 |
| `TEMP_DIR` | 否 | /tmp/yt-dlpservice | 临时文件目录 |
| `AUDIO_FORMAT` | 否 | mp3 | 音频格式 |
| `AUDIO_BITRATE` | 否 | 128k | 音频比特率 |
| `MAX_FILE_AGE_HOURS` | 否 | 1 | 文件最大保存时间(小时) |
| `CLEANUP_INTERVAL_HOURS` | 否 | 24 | 清理任务执行间隔(小时) |

### PM2 配置

PM2 配置文件: `ecosystem.config.js`

关键配置:
- **应用名称**: yt-dlpservice
- **端口**: 3000
- **日志目录**: ./logs/
- **自动重启**: 启用
- **内存限制**: 1GB

### yt-dlp 路径配置

默认 yt-dlp 安装路径: `~/.local/bin/yt-dlp`

如果路径不同，需要修改 `src/lib/services/video-downloader.ts`:
```typescript
private ytDlpPath = '/your/custom/path/to/yt-dlp'
```

### 防火墙配置

```bash
# 允许应用端口
sudo ufw allow 3000/tcp

# 允许 SSH (如果未允许)
sudo ufw allow ssh

# 启用防火墙 (可选)
sudo ufw enable
```

## 📊 服务管理

### PM2 常用命令

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs yt-dlpservice

# 查看最近日志
pm2 logs yt-dlpservice --lines 50

# 重启服务
pm2 restart yt-dlpservice

# 停止服务
pm2 stop yt-dlpservice

# 删除服务
pm2 delete yt-dlpservice

# 重新加载配置
pm2 reload ecosystem.config.js --env production
```

### 日志管理

日志文件位置:
- **应用日志**: `~/yt-dlpservice/logs/app.log`
- **输出日志**: `~/yt-dlpservice/logs/out.log`
- **错误日志**: `~/yt-dlpservice/logs/error.log`

```bash
# 查看应用日志
tail -f ~/yt-dlpservice/logs/app.log

# 查看错误日志
tail -f ~/yt-dlpservice/logs/error.log
```

### 数据库管理

```bash
cd ~/yt-dlpservice

# 查看数据库结构
npx prisma studio

# 重置数据库
npx prisma db push --force-reset

# 备份数据库
cp data/app.db data/app.db.backup.$(date +%Y%m%d_%H%M%S)
```

## 🔍 故障排除

### 常见问题

#### 1. yt-dlp 未找到
```bash
# 检查 yt-dlp 安装
which yt-dlp
~/.local/bin/yt-dlp --version

# 重新安装
python3 -m pip install --user --upgrade yt-dlp
```

#### 2. FFmpeg 未找到
```bash
# 检查 FFmpeg 安装
ffmpeg -version

# 重新安装
sudo apt install -y ffmpeg
```

#### 3. 端口被占用
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000

# 停止占用进程
sudo kill -9 <PID>
```

#### 4. 内存不足
```bash
# 检查内存使用
free -h
pm2 monit

# 减少并发任务数 (编辑 .env)
MAX_CONCURRENT_TASKS=5
```

#### 5. 磁盘空间不足
```bash
# 检查磁盘使用
df -h

# 清理临时文件
rm -rf /tmp/yt-dlpservice/*

# 清理应用日志
pm2 flush yt-dlpservice
```

### 日志分析

#### 应用启动失败
```bash
# 查看启动错误
pm2 logs yt-dlpservice --err

# 检查环境变量
pm2 env 0  # 假设 yt-dlpservice 是 ID 0
```

#### 任务处理失败
```bash
# 查看任务处理日志
pm2 logs yt-dlpservice | grep "Task\|ERROR"

# 检查 yt-dlp 连接
~/.local/bin/yt-dlp --list-extractors | grep youtube
```

## 🔄 更新部署

### 自动更新
```bash
cd ~/yt-dlpservice
./deploy/deploy.sh
```

### 手动更新
```bash
cd ~/yt-dlpservice

# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm install

# 3. 构建应用
npm run build

# 4. 更新数据库
npx prisma db push

# 5. 重启服务
pm2 restart yt-dlpservice
```

## 🔐 安全建议

1. **防火墙**: 只开放必要端口 (3000, 22)
2. **SSH 密钥**: 使用 SSH 密钥登录，禁用密码登录
3. **定期更新**: 定期更新系统和依赖包
4. **访问控制**: 考虑使用 Nginx 反向代理和 SSL
5. **监控**: 设置服务监控和告警

## 📞 技术支持

如遇到问题，请检查:

1. **服务状态**: `pm2 status`
2. **应用日志**: `pm2 logs yt-dlpservice`
3. **系统资源**: `htop` 或 `pm2 monit`
4. **网络连接**: `curl http://localhost:3000`

## 🎯 性能优化

### 服务器优化
- 增加 swap 空间 (如果内存不足)
- 配置 SSD 存储 (提高 I/O 性能)
- 优化网络设置 (提高下载速度)

### 应用优化
- 调整并发任务数 (`MAX_CONCURRENT_TASKS`)
- 优化临时文件清理策略
- 配置 CDN (如有需要)

---

**注意**: 请确保您的服务器有足够的带宽和存储空间来处理视频下载任务。 