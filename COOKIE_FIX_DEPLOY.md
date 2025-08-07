# YouTube Cookie 问题修复 - 部署说明

## 问题总结

原问题：
```
ERROR: [youtube] qtYt88z_tdw: Sign in to confirm you're not a bot
```

## 修复内容

### 1. 统一认证系统
- ✅ 移除了老的 `YouTubeCookieManager`（自动刷新机制）
- ✅ 统一使用新的 `YouTubeAuthService`（手动设置机制）
- ✅ 更新了 `YouTubePlatform` 使用新的认证服务

### 2. CLI工具修复
- ✅ 修正了 `yt-dlp` 命令（之前错误使用 `python3 -m yt_dlp`）
- ✅ 统一Cookie文件路径为 `data/cookies/youtube_cookies.txt`
- ✅ 改进了Cookie格式转换逻辑

### 3. Web界面增强
- ✅ 优化了 `/admin/youtube-auth` 页面UI
- ✅ 添加了详细的Cookie获取指南
- ✅ 新增Cookie测试功能
- ✅ 改进了错误提示和用户体验

### 4. API接口完善
- ✅ 新增 `PUT /api/youtube/auth` 用于测试Cookie有效性
- ✅ 改进了错误处理和响应格式

## 部署步骤

### 1. 更新代码
```bash
git pull origin main
```

### 2. 安装依赖（如有新增）
```bash
npm install
```

### 3. 重新构建
```bash
npm run build
```

### 4. 重启服务
```bash
pm2 restart yt-dlpservice
```

### 5. 验证修复
```bash
# 测试CLI工具
npm run youtube:auth -- --status

# 测试Cookie功能（如有Cookie）
npm run youtube:auth -- --test
```

## Cookie设置方法

### 方法1: Web界面（推荐）
1. 访问 `http://your-server:3000/admin/youtube-auth`
2. 按照页面指南获取Cookie
3. 粘贴Cookie内容
4. 点击"设置Cookie"
5. 点击"测试Cookie"验证

### 方法2: CLI工具
```bash
npm run youtube:auth -- --set-cookie
```

### 方法3: API调用
```bash
curl -X POST http://localhost:3000/api/youtube/auth \
  -H "Content-Type: application/json" \
  -d '{"cookies":"your_cookie_string_here"}'
```

## 验证修复效果

### 1. 检查服务状态
```bash
pm2 logs yt-dlpservice --lines 20
```

### 2. 测试YouTube下载
在管理界面创建一个YouTube任务，观察日志是否还有认证错误。

### 3. 查看Cookie状态
```bash
npm run youtube:auth -- --status
```

## 重要提醒

1. **Cookie会过期**：通常24-48小时需要重新设置
2. **监控日志**：定期检查是否出现认证错误
3. **及时更新**：看到"Sign in to confirm"错误时立即更新Cookie

## 故障排除

### 1. 如果还是报认证错误
- 检查Cookie文件是否存在：`ls -la data/cookies/youtube_cookies.txt`
- 测试Cookie有效性：`npm run youtube:auth -- --test`
- 重新设置Cookie

### 2. 如果CLI工具不工作
- 检查yt-dlp安装：`yt-dlp --version`
- 检查Node.js版本：`node --version`
- 查看错误信息

### 3. 如果Web界面异常
- 重启服务：`pm2 restart yt-dlpservice`
- 检查日志：`pm2 logs yt-dlpservice`
- 清除浏览器缓存

## 联系支持

如果问题依然存在，请提供：
1. 错误日志（隐藏敏感信息）
2. Cookie设置步骤
3. 服务器环境信息

---

**✅ 修复完成后，YouTube视频下载应该能正常工作。**