# 远程服务器登录问题排查指南

## 常见问题及解决方案

### 问题 1: Cookie 的 `secure` 标志导致 HTTP 下无法设置

**症状**:
- 登录请求返回 200 OK
- 响应头中有 `Set-Cookie`
- 但浏览器没有保存 cookie
- 控制台可能显示 cookie 被阻止的警告

**原因**:
生产环境下 `secure: true` 要求必须使用 HTTPS，HTTP 下 cookie 会被浏览器拒绝。

**解决方案 A - 推荐**: 配置反向代理使用 HTTPS
```nginx
# Nginx 配置示例
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**解决方案 B**: 使用环境变量控制 `secure` 标志
修改 `src/app/api/login/route.ts` 第 62 行：
```typescript
secure: process.env.FORCE_SECURE_COOKIE === 'true'
        ? true
        : process.env.NODE_ENV === "production",
```

然后在 `.env.local` 或 `.env.production` 中设置：
```bash
# 如果使用 HTTP，设置为 false
FORCE_SECURE_COOKIE=false

# 如果使用 HTTPS，设置为 true
# FORCE_SECURE_COOKIE=true
```

---

### 问题 2: `sameSite` 设置导致跨域请求 cookie 丢失

**症状**:
- 前端和后端域名不同（如前端 `app.example.com`，后端 `api.example.com`）
- 登录成功但后续请求没有携带 cookie

**原因**:
`sameSite: 'lax'` 在跨站请求中不发送 cookie。

**解决方案**:
修改 `src/app/api/login/route.ts` 第 61 行：
```typescript
sameSite: process.env.ALLOW_CROSS_SITE_COOKIE === 'true' ? 'none' : 'lax',
```

注意：`sameSite: 'none'` **必须**配合 `secure: true` 使用，因此这要求 HTTPS。

---

### 问题 3: 反向代理未正确传递 cookie

**症状**:
- 登录请求成功
- 但后续请求 Next.js 收不到 cookie

**检查**:
```bash
# 在远程服务器上测试
curl -i -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"adminyt","password":"a2885828"}' \
  -c cookies.txt

# 检查 cookies.txt 是否包含 admin_auth

# 测试带 cookie 访问
curl -i http://localhost:3000/admin -b cookies.txt
```

**解决方案**:
确保 Nginx/Apache 配置传递所有请求头：
```nginx
proxy_set_header Cookie $http_cookie;
proxy_pass_header Set-Cookie;
```

---

### 问题 4: 数据库文件权限问题

**症状**:
- 登录请求返回 500 错误
- 日志显示 SQLite 数据库访问错误

**检查**:
```bash
ls -la prisma/dev.db
# 确保运行 Next.js 的用户有读写权限
```

**解决方案**:
```bash
chmod 664 prisma/dev.db
chmod 775 prisma/
```

---

### 问题 5: 生产构建缓存问题

**症状**:
- 使用 `npm run build && npm run start`
- 但代码更改没有生效

**解决方案**:
```bash
# 清除构建缓存
rm -rf .next
npm run build
npm run start
```

---

## 诊断步骤

### 1. 检查登录 API 响应
```bash
# 在远程服务器执行
curl -i -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"adminyt","password":"a2885828"}'
```

**期望输出**:
```
HTTP/1.1 200 OK
Set-Cookie: admin_auth=e1f436e9cbe04da6c694c47d5bf94252921834a6b76636a3849f460d7aa23cc1; Path=/; Max-Age=2592000; HttpOnly; SameSite=lax
Content-Type: application/json

{"success":true}
```

### 2. 检查浏览器控制台
打开浏览器开发者工具：
- **Network 标签**: 检查 login 请求的响应头是否有 `Set-Cookie`
- **Application/Storage 标签**: 检查 Cookies 部分是否有 `admin_auth`
- **Console 标签**: 检查是否有 cookie 相关的警告/错误

### 3. 检查环境变量
```bash
# 在远程服务器执行
echo $NODE_ENV
# 应该输出: production

# 检查 .env 文件
cat .env.production
```

### 4. 检查服务器日志
```bash
# 如果使用 PM2
pm2 logs

# 如果使用 systemd
journalctl -u your-service-name -f

# 或直接运行时的输出
npm run start
```

---

## 快速修复方案（临时）

如果需要快速让远程服务器工作，可以临时禁用 secure 标志：

```typescript
// src/app/api/login/route.ts 第 62 行
secure: false, // 临时禁用，仅用于测试
```

**警告**: 这会降低安全性，生产环境应该使用 HTTPS + secure: true。

---

## 推荐的生产配置

1. **使用 HTTPS**（必须）
2. **使用环境变量控制 cookie 设置**
3. **正确配置反向代理**
4. **使用 `npm run build && npm run start`** 而不是 `npm run dev`

示例 `.env.production`:
```bash
NODE_ENV=production
# 如果使用 HTTPS
FORCE_SECURE_COOKIE=true
# 如果前后端同域
ALLOW_CROSS_SITE_COOKIE=false
```
