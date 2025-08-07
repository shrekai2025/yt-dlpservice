# YouTube Cookie 设置解决方案

## 问题描述

当遇到以下错误时，说明需要设置YouTube Cookie：

```
ERROR: [youtube] qtYt88z_tdw: Sign in to confirm you're not a bot
```

## 解决方案

### 方案1: Web界面设置（推荐）

1. **在本地浏览器获取Cookie**
   - 在Chrome/Firefox中访问 https://www.youtube.com 并登录
   - 按 F12 打开开发者工具
   - 转到 Network 标签页
   - 刷新页面，找到任意请求
   - 右键点击请求 → Copy → Copy as cURL (bash)
   - 从cURL命令中复制 `-H 'cookie: ...'` 部分的cookie值

2. **在Web管理界面设置**
   - 访问 `http://your-server:3000/admin/youtube-auth`
   - 将复制的Cookie内容粘贴到文本框中
   - 点击"设置Cookie"按钮
   - 点击"测试Cookie"验证是否有效

### 方案2: 命令行设置

```bash
# SSH登录到服务器
ssh user@your-server

# 进入项目目录
cd yt-dlpservice

# 运行Cookie设置工具
npm run youtube:auth -- --set-cookie

# 按提示粘贴Cookie内容
```

### 方案3: 手动创建Cookie文件

1. **创建Cookie目录**
   ```bash
   mkdir -p data/cookies
   ```

2. **创建Cookie文件**
   ```bash
   nano data/cookies/youtube_cookies.txt
   ```

3. **粘贴Cookie内容**（Netscape格式）
   ```
   # Netscape HTTP Cookie File
   .youtube.com	TRUE	/	TRUE	1735689600	VISITOR_INFO1_LIVE	your_value_here
   .youtube.com	TRUE	/	TRUE	1735689600	YSC	your_value_here
   # 更多Cookie行...
   ```

## Cookie格式说明

### 浏览器格式（推荐）
```
key1=value1; key2=value2; key3=value3
```

### Netscape格式
```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	TRUE	1735689600	cookie_name	cookie_value
```

## 重要提醒

- **Cookie会过期**：通常24-48小时后需要重新设置
- **保持登录**：确保在获取Cookie的浏览器中保持YouTube登录状态
- **定期更新**：建议设置定期任务更新Cookie

## 测试Cookie有效性

### Web界面测试
访问 `/admin/youtube-auth` 页面，点击"测试Cookie"按钮

### 命令行测试
```bash
npm run youtube:auth -- --test
```

### 手动测试
```bash
yt-dlp --cookies "data/cookies/youtube_cookies.txt" --dump-json "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## 故障排除

### 1. 权限问题
```bash
chmod 644 data/cookies/youtube_cookies.txt
chown $USER:$USER data/cookies/youtube_cookies.txt
```

### 2. 目录不存在
```bash
mkdir -p data/cookies
```

### 3. Cookie格式错误
- 确保Cookie内容完整
- 检查是否包含必要的字段
- 重新从浏览器获取

### 4. 重启服务
```bash
pm2 restart yt-dlpservice
```

## 安全建议

- 不要在公共场所获取Cookie
- 定期更换YouTube密码
- 使用独立的Google账号
- 监控异常登录活动

## 服务器自动化脚本

创建定期更新Cookie的提醒脚本：

```bash
#!/bin/bash
# 检查Cookie年龄，超过20小时发送提醒
COOKIE_FILE="data/cookies/youtube_cookies.txt"
if [ -f "$COOKIE_FILE" ]; then
    AGE=$((($(date +%s) - $(stat -c %Y "$COOKIE_FILE")) / 3600))
    if [ $AGE -gt 20 ]; then
        echo "⚠️ YouTube Cookie已使用${AGE}小时，建议更新"
        # 可以发送邮件或其他通知
    fi
fi
```

## API接口

### 设置Cookie
```bash
curl -X POST http://localhost:3000/api/youtube/auth \
  -H "Content-Type: application/json" \
  -d '{"cookies":"your_cookie_string_here"}'
```

### 测试Cookie
```bash
curl -X PUT http://localhost:3000/api/youtube/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"test","testUrl":"https://www.youtube.com/watch?v=qtYt88z_tdw"}'
```

### 清除Cookie
```bash
curl -X DELETE http://localhost:3000/api/youtube/auth
```