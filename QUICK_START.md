# 🚀 YT-DLP Service 快速启动指南

## 📦 Ubuntu 服务器部署（推荐）

### 1️⃣ 一键安装

```bash
# 克隆项目到服务器
git clone https://github.com/your-username/yt-dlpservice.git
cd yt-dlpservice

# 运行安装脚本（安装所有依赖）
chmod +x deploy/install.sh
./deploy/install.sh

# 部署应用
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### 2️⃣ 配置 API 密钥

```bash
# 编辑环境变量
nano .env

# 必须配置的项目：
TINGWU_ACCESS_KEY_ID=your_access_key_id
TINGWU_ACCESS_KEY_SECRET=your_access_key_secret
```

### 3️⃣ 重启服务

```bash
pm2 restart yt-dlpservice
```

### 4️⃣ 访问应用

- **主页**: http://your-server-ip:3000
- **管理面板**: http://your-server-ip:3000/admin

---

## 💻 本地开发

### 前置要求

- Node.js 18+ 
- Python 3.8+
- yt-dlp
- FFmpeg

### 启动步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 初始化数据库
npx prisma db push

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

---

## 🐳 Docker 部署（可选）

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 2. 启动服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f yt-dlpservice
```

---

## 🔧 常用命令

### PM2 管理
```bash
pm2 status                    # 查看服务状态
pm2 logs yt-dlpservice        # 查看日志
pm2 restart yt-dlpservice     # 重启服务
pm2 stop yt-dlpservice        # 停止服务
```

### 数据库操作
```bash
npx prisma studio             # 数据库管理界面
npx prisma db push            # 更新数据库结构
```

### 系统维护
```bash
# 清理临时文件
rm -rf /tmp/yt-dlpservice/*

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

---

## ❗ 常见问题

### 1. yt-dlp 未找到
```bash
which yt-dlp
# 如果没有输出，重新安装：
python3 -m pip install --user --upgrade yt-dlp
```

### 2. FFmpeg 未找到
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# 检查安装
ffmpeg -version
```

### 3. 端口被占用
```bash
# 查看端口占用
sudo netstat -tlnp | grep :3000

# 停止占用进程
sudo kill -9 <PID>
```

### 4. 权限错误
```bash
# 确保目录权限正确
chmod 755 /tmp/yt-dlpservice
chown $USER:$USER ~/yt-dlpservice
```

---

## 📞 获取帮助

1. 查看详细文档: [DEPLOYMENT.md](./DEPLOYMENT.md)
2. 检查应用日志: `pm2 logs yt-dlpservice`
3. 提交 GitHub Issue
4. 检查系统资源: `pm2 monit`

---

## ✅ 部署验证清单

- [ ] 服务器可以访问 3000 端口
- [ ] pm2 status 显示服务运行中
- [ ] 可以访问 http://your-server-ip:3000
- [ ] 管理面板正常加载
- [ ] 数据库连接测试通过
- [ ] 可以创建测试任务
- [ ] 通义 API 密钥已配置

**恭喜！您的 YT-DLP Service 已成功部署！** 🎉 