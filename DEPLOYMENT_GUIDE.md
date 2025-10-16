# 远程服务器部署指南

## 快速修复：无法登录问题

如果在远程服务器上无法登录，最可能的原因是 **cookie 的 secure 标志在 HTTP 下被浏览器拒绝**。

### 解决方案

#### 方法 1：设置环境变量（推荐）

在远程服务器上创建 `.env.production` 或 `.env.local` 文件：

```bash
# 在项目根目录执行
cat > .env.production << 'EOF'
NODE_ENV=production
# 如果使用 HTTP，设置为 false；如果使用 HTTPS，删除此行
FORCE_SECURE_COOKIE=false
DATABASE_URL="file:./prisma/dev.db"
EOF
```

然后重启服务：
```bash
# 如果使用 PM2
pm2 restart all

# 或者重新构建和启动
npm run build
npm run start
```

#### 方法 2：配置 HTTPS（推荐用于生产环境）

使用 Let's Encrypt 获取免费 SSL 证书：

```bash
# 安装 certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

然后在 Nginx 配置中添加：
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 完整部署步骤

### 1. 准备服务器环境

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2（进程管理器）
sudo npm install -g pm2

# 克隆项目（如果尚未完成）
git clone <your-repo-url>
cd yt-dlpservice
```

### 2. 配置环境变量

```bash
# 复制环境变量示例
cp .env.production.example .env.production

# 编辑配置
nano .env.production
```

根据你的环境修改：
```bash
NODE_ENV=production

# 如果使用 HTTP
FORCE_SECURE_COOKIE=false

# 如果使用 HTTPS
# FORCE_SECURE_COOKIE=true  # 或删除此行

DATABASE_URL="file:./prisma/dev.db"
```

### 3. 安装依赖和初始化数据库

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push

# 创建初始用户
npx tsx prisma/seed-user.ts
```

你应该看到：
```
✅ 初始管理员用户已创建：adminyt / a2885828
```

### 4. 构建项目

```bash
# 构建生产版本
npm run build
```

### 5. 启动服务

**选项 A：使用 PM2（推荐）**
```bash
# 启动
pm2 start npm --name "yt-dlp-service" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs yt-dlp-service

# 设置开机自启
pm2 startup
pm2 save
```

**选项 B：使用 systemd**

创建服务文件：
```bash
sudo nano /etc/systemd/system/yt-dlp-service.service
```

内容：
```ini
[Unit]
Description=YT-DLP Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/yt-dlpservice
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl start yt-dlp-service
sudo systemctl enable yt-dlp-service
sudo systemctl status yt-dlp-service
```

### 6. 配置 Nginx 反向代理（可选但推荐）

```bash
sudo nano /etc/nginx/sites-available/yt-dlp-service
```

内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 修改为你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 增加超时时间（用于长时间运行的任务）
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/yt-dlp-service /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 验证部署

### 1. 测试登录 API

在服务器上：
```bash
curl -i -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"adminyt","password":"a2885828"}'
```

期望响应：
```
HTTP/1.1 200 OK
Set-Cookie: admin_auth=...
Content-Type: application/json

{"success":true}
```

### 2. 在浏览器测试

1. 打开 `http://your-domain.com` 或 `http://your-server-ip:3000`
2. 输入用户名：`adminyt`，密码：`a2885828`
3. 点击登录
4. 应该重定向到 `/admin` 页面

### 3. 检查浏览器控制台

打开开发者工具 → Application/Storage → Cookies，应该看到：
- Name: `admin_auth`
- Value: 64 个字符的哈希值
- Path: `/`
- HttpOnly: ✓
- Secure: 根据你的配置（HTTP 下应该为空，HTTPS 下应该为 ✓）

---

## 常见问题排查

### 问题：登录后立即被重定向回登录页

**可能原因**：
1. Cookie 未被设置（查看浏览器 Network 标签的 Set-Cookie 头）
2. Cookie 被浏览器拒绝（查看 Console 标签的警告）

**解决**：
```bash
# 确保设置了环境变量
echo "FORCE_SECURE_COOKIE=false" >> .env.production

# 重启服务
pm2 restart yt-dlp-service
```

### 问题：数据库错误

**可能原因**：
1. 数据库文件不存在
2. 权限不足

**解决**：
```bash
# 重新初始化数据库
npx prisma db push
npx tsx prisma/seed-user.ts

# 检查权限
ls -la prisma/dev.db
chmod 664 prisma/dev.db
```

### 问题：端口已被占用

**解决**：
```bash
# 查找占用 3000 端口的进程
lsof -ti:3000

# 杀死进程
kill -9 $(lsof -ti:3000)

# 或使用不同端口
PORT=3001 npm start
```

---

## 更新部署

```bash
# 拉取最新代码
git pull

# 安装新依赖（如果有）
npm install

# 更新数据库（如果有变化）
npx prisma db push

# 重新构建
npm run build

# 重启服务
pm2 restart yt-dlp-service

# 或使用 systemd
sudo systemctl restart yt-dlp-service
```

---

## 安全建议

1. **始终使用 HTTPS** - 获取免费的 Let's Encrypt 证书
2. **修改默认密码** - 登录后立即在 `/admin/users` 页面修改
3. **设置防火墙** - 只开放必要的端口（80, 443）
4. **定期备份数据库** - `prisma/dev.db` 文件
5. **监控日志** - 使用 `pm2 logs` 或 `journalctl -f`

---

## 初始登录凭证

- **用户名**: `adminyt`
- **密码**: `a2885828`

**重要**：首次登录后，请立即访问 `/admin/users` 页面添加新用户或修改密码。
