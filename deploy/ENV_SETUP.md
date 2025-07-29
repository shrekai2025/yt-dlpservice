# 环境配置说明

## 快速解决远程服务器编译问题

如果在远程服务器上遇到 `Module not found: Can't resolve 'axios'` 错误，请按以下步骤操作：

### 1. 运行修复脚本（推荐）

```bash
# 在项目根目录运行
chmod +x deploy/fix-dependencies.sh
./deploy/fix-dependencies.sh
```

### 2. 手动修复步骤

```bash
# 清理现有依赖
rm -rf node_modules package-lock.json .next

# 清理npm缓存
npm cache clean --force

# 重新安装依赖
npm install

# 验证axios安装
node -e "require('axios'); console.log('axios安装成功')"

# 构建项目
npm run build
```

### 3. 环境变量配置

创建 `.env` 文件并配置以下变量：

```bash
# 基础配置
NODE_ENV=production
PORT=3000
DATABASE_URL="file:./data/app.db"

# 语音服务配置（选择一种）
VOICE_SERVICE_PROVIDER=doubao

# 豆包语音API（推荐）
DOUBAO_APP_KEY=你的豆包APP_KEY
DOUBAO_ACCESS_KEY=你的豆包ACCESS_KEY
DOUBAO_ENDPOINT=openspeech.bytedance.com

# 通义听悟API（备用）
TINGWU_ACCESS_KEY_ID=你的通义KEY_ID
TINGWU_ACCESS_KEY_SECRET=你的通义KEY_SECRET
TINGWU_REGION=cn-beijing

# Puppeteer配置
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu
BROWSER_DATA_DIR=./data/browser_data
```

### 4. 完整部署流程

```bash
# 1. 安装系统依赖（首次部署）
chmod +x deploy/install.sh
./deploy/install.sh

# 2. 部署应用
chmod +x deploy/deploy.sh
./deploy/deploy.sh

# 3. 如果遇到依赖问题，运行修复脚本
./deploy/fix-dependencies.sh
```

### 常见问题

**Q: 为什么会出现 axios 找不到的错误？**
A: 通常是因为 `npm install` 没有正确安装所有依赖，或者 node_modules 目录有缓存问题。

**Q: 如何验证依赖是否正确安装？**
A: 运行 `node -e "require('axios'); console.log('OK')"` 来验证。

**Q: 构建仍然失败怎么办？**
A: 检查 Node.js 版本是否 >= 18.0.0，确保所有环境变量都已正确配置。

### 监控和日志

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs yt-dlpservice

# 重启应用
pm2 restart yt-dlpservice
```

## 📋 服务更新注意事项

⚠️ **重要**: 每次从代码仓库更新后，都需要执行数据库同步：

```bash
# 更新后必须执行的数据库操作
npx prisma db push      # 同步数据库结构
npx prisma generate     # 重新生成客户端

# 然后重新构建和重启服务
npm run build
pm2 restart yt-dlpservice
```

如果跳过数据库更新步骤，可能导致应用启动失败或功能异常。 