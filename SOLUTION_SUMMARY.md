# YouTube Cookie 问题解决方案总结

## 🎯 问题解决状态

✅ **问题已修复** - YouTube "Sign in to confirm you're not a bot" 错误

## 🔧 主要修复内容

### 1. 统一认证系统
- ✅ 移除了自动刷新机制 (`YouTubeCookieManager`)
- ✅ 统一使用手动Cookie设置 (`YouTubeAuthService`)
- ✅ 更新了所有相关组件使用新的认证服务

### 2. CLI工具修复
- ✅ 修正 `yt-dlp` 命令调用（之前错误使用 `python3 -m yt_dlp`）
- ✅ 统一Cookie文件路径：`data/cookies/youtube_cookies.txt`
- ✅ 改进Cookie格式转换和错误处理

### 3. Web界面增强
- ✅ 优化 `/admin/youtube-auth` 页面UI
- ✅ 添加详细的Cookie获取指南
- ✅ 新增Cookie有效性测试功能
- ✅ 改进用户体验和错误提示

### 4. API接口完善
- ✅ 新增 `PUT /api/youtube/auth` 测试接口
- ✅ 完善错误处理和响应格式

## 🚀 立即部署步骤

### 1. 更新服务器代码
```bash
# 在服务器上执行
cd yt-dlpservice
git pull origin main
npm run build
pm2 restart yt-dlpservice
```

### 2. 设置YouTube Cookie

#### 方法A: Web界面（推荐）
1. 访问 `http://your-server:3000/admin/youtube-auth`
2. 按照页面指南获取Cookie
3. 粘贴Cookie内容并点击"设置Cookie"
4. 点击"测试Cookie"验证有效性

#### 方法B: CLI工具
```bash
npm run youtube:auth -- --set-cookie
```

#### 方法C: API调用
```bash
curl -X POST http://localhost:3000/api/youtube/auth \
  -H "Content-Type: application/json" \
  -d '{"cookies":"your_cookie_string_here"}'
```

## 🧪 验证修复效果

### 1. 测试Cookie状态
```bash
npm run youtube:auth -- --status
```

### 2. 测试YouTube访问
```bash
npm run youtube:auth -- --test
```

### 3. 创建YouTube任务
在管理界面创建一个YouTube下载任务，应该不再出现认证错误。

## 📋 获取Cookie的具体步骤

### Chrome浏览器方法
1. 访问 https://www.youtube.com 并登录
2. 按 F12 打开开发者工具
3. 转到 Network 标签页
4. 刷新页面，找到任意请求
5. 右键点击请求 → Copy → Copy as cURL (bash)
6. 从cURL命令中复制cookie部分

### 使用浏览器扩展（推荐）
1. 安装 "Cookie-Editor" 扩展
2. 访问 YouTube 并登录
3. 点击扩展图标
4. Export → Export as Netscape → Copy
5. 粘贴到Web界面或CLI工具中

## ⚠️ 重要提醒

1. **Cookie会过期**：通常24-48小时后需要重新设置
2. **监控日志**：定期检查 `pm2 logs yt-dlpservice` 是否有认证错误
3. **及时更新**：看到"Sign in to confirm"错误时立即更新Cookie

## 🔍 故障排除

### 如果还是出现认证错误
1. 检查Cookie文件：`ls -la data/cookies/youtube_cookies.txt`
2. 测试Cookie：访问 `/admin/youtube-auth` 点击"测试Cookie"
3. 重新设置Cookie（可能已过期）

### 如果CLI工具不工作
1. 检查yt-dlp：`yt-dlp --version`
2. 检查权限：`chmod +x scripts/youtube-auth-cli.js`

### 如果Web界面异常
1. 重启服务：`pm2 restart yt-dlpservice`
2. 清除浏览器缓存

## 📞 如需支持

如果问题依然存在，请提供：
1. 完整的错误日志（`pm2 logs yt-dlpservice --lines 50`）
2. Cookie设置步骤截图
3. 测试结果截图

---

**✅ 修复完成！现在YouTube视频下载应该能正常工作。**

**📈 预期结果：不再出现 "Sign in to confirm you're not a bot" 错误**