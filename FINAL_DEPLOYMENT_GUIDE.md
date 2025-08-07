# 🚀 YouTube Cookie 问题 - 最终部署指南

## ✅ **问题解决状态**
- ✅ **构建成功** - 所有TypeScript错误已修复
- ✅ **Cookie管理页面** - Web界面已就绪
- ✅ **API接口完善** - 支持设置、测试、清除Cookie
- ✅ **CLI工具修复** - 命令行工具正常工作

## 🚀 **立即部署到远程服务器**

### **步骤1: 更新服务器代码**
```bash
# SSH登录到服务器
ssh ubuntu@your-server

# 进入项目目录
cd yt-dlpservice

# 备份当前更改（如有）
git stash

# 强制拉取最新代码
git fetch origin
git reset --hard origin/main

# 如果Git同步有问题，手动拉取
# git pull origin main --force
```

### **步骤2: 重新构建和部署**
```bash
# 安装依赖（如有更新）
npm install

# 构建应用
npm run build

# 重启服务
pm2 restart yt-dlpservice

# 检查服务状态
pm2 logs yt-dlpservice --lines 10
```

### **步骤3: 设置YouTube Cookie**

#### **方法A: Web界面（推荐）**
1. 访问：`http://your-server:3000/admin`
2. 找到 **"🍪 YouTube Cookie管理"** 区域
3. 点击 **"🔧 设置YouTube Cookie"** 按钮
4. 按照页面指南获取Cookie并粘贴
5. 点击 **"🧪 测试Cookie"** 验证有效性

#### **方法B: CLI工具**
```bash
# 使用CLI设置Cookie
npm run youtube:setup

# 检查Cookie状态
npm run youtube:status

# 测试Cookie有效性
npm run youtube:test
```

## 📋 **获取Cookie的详细步骤**

### **Chrome浏览器方法**
1. **登录YouTube**：在Chrome中访问 https://www.youtube.com 并登录
2. **打开开发者工具**：按 `F12`
3. **进入Network标签**：点击 "Network" 标签页
4. **刷新页面**：按 `F5` 刷新YouTube页面
5. **复制请求**：找到任意请求，右键 → Copy → Copy as cURL (bash)
6. **提取Cookie**：从cURL命令中找到 `-H 'cookie: ...'` 部分，复制cookie值

### **示例Cookie格式**
```
VISITOR_INFO1_LIVE=abc123; YSC=def456; PREF=ghi789; LOGIN_INFO=jkl012
```

## 🎯 **验证部署成功**

### **1. 检查Web界面**
- 访问：`http://your-server:3000/admin`
- 应该看到蓝色的Cookie管理提示框
- 点击按钮应该能跳转到Cookie设置页面

### **2. 测试YouTube下载**
```bash
# 在管理界面创建一个YouTube任务
# 观察日志，应该不再出现 "Sign in to confirm you're not a bot" 错误
pm2 logs yt-dlpservice --follow
```

### **3. 验证Cookie功能**
```bash
# 检查Cookie文件
ls -la data/cookies/youtube_cookies.txt

# 测试Cookie
npm run youtube:test
```

## 🔧 **故障排除**

### **如果构建失败**
```bash
# 清理构建缓存
npm run clean

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run build
```

### **如果Cookie设置页面404**
```bash
# 检查路由文件是否存在
ls -la src/app/admin/youtube-auth/page.tsx

# 重新构建
npm run build
pm2 restart yt-dlpservice
```

### **如果Cookie测试失败**
1. 确保Cookie是最新的（24小时内获取）
2. 确保从已登录的YouTube页面获取
3. 检查Cookie格式是否正确
4. 重新获取并设置Cookie

## 📊 **监控和维护**

### **定期检查**
```bash
# 每天检查Cookie状态
npm run youtube:status

# 查看服务日志
pm2 logs yt-dlpservice --lines 50

# 检查磁盘空间
df -h
```

### **Cookie过期处理**
- **自动监控**：观察日志中的认证错误
- **手动更新**：每24-48小时更新一次Cookie
- **批量处理**：可以设置定时任务提醒更新

## 🎉 **预期结果**

部署成功后，你应该能够：
- ✅ 通过Web界面轻松设置YouTube Cookie
- ✅ YouTube视频下载不再出现认证错误
- ✅ 支持需要登录的YouTube视频
- ✅ 完整的Cookie管理和测试功能

## 📞 **获取支持**

如果遇到问题，请提供：
1. **服务器日志**：`pm2 logs yt-dlpservice --lines 50`
2. **构建输出**：`npm run build` 的完整输出
3. **Cookie测试结果**：`npm run youtube:test` 的输出
4. **错误截图**：Web界面的错误信息

---

**🎯 部署完成后，YouTube "Sign in to confirm you're not a bot" 问题将彻底解决！**