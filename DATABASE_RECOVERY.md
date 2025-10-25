# 数据库恢复总结

## 问题说明

在2025-10-23 23:05开发数字人功能时，执行了 `npx prisma migrate reset --force` 命令，导致数据库被完全清空。

## 恢复操作

### 1. 数据填充脚本

创建了两个数据填充脚本：
- `scripts/seed-database.ts` - 基础版本
- `scripts/seed-database-full.ts` - 完整版本（推荐使用）

### 2. 恢复内容

✅ **AI供应商和模型**
- 即梦AI平台
- 即梦AI供应商
- 即梦 4.0 图像生成模型
- 即梦视频 3.0 模型

✅ **媒体文件**
- 从 `data/media-uploads` 目录递归扫描
- 导入了 97 个媒体文件
  - 视频: 69个
  - 图片: 18个
  - 音频: 10个
- 创建了默认文件夹

✅ **LLM供应商**
- DeepSeek供应商
- DeepSeek API端点
- DeepSeek Chat模型

## 当前数据库状态

```
📊 数据库统计 (2025-10-24)
├─ 用户: 1 (adminyt)
├─ AI平台: 1
├─ AI供应商: 1
├─ AI模型: 2
├─ 媒体文件夹: 1
├─ 媒体文件: 97
│  ├─ 视频: 69
│  ├─ 图片: 18
│  └─ 音频: 10
├─ LLM供应商: 1
├─ LLM端点: 1
└─ LLM模型: 1
```

## 未恢复的数据

由于数据库重置，以下数据无法恢复：
- ❌ Studio项目和Episode数据
- ❌ AI生成任务历史
- ❌ 媒体文件的元数据（标签、备注、分类等）
- ❌ 自定义文件夹和组织结构
- ❌ 用户偏好设置

## 重新使用说明

1. **登录系统**
   ```
   用户名: adminyt
   密码: a2885828
   ```

2. **访问媒体浏览器**
   - 所有本地媒体文件已导入
   - 可以在媒体浏览器中查看和管理

3. **AI生成功能**
   - 即梦AI已配置完成
   - 需要设置环境变量：
     ```bash
     AI_PROVIDER_JIMENG_ACCESS_KEY_ID=your_key
     AI_PROVIDER_JIMENG_SECRET_ACCESS_KEY=your_secret
     ```

4. **Studio功能**
   - 可以创建新的项目和Episode
   - 之前的项目数据已丢失

## 预防措施

为避免将来再次发生数据丢失，建议：

1. **定期备份数据库**
   ```bash
   # 创建备份脚本
   cp data/app.db data/backups/app-$(date +%Y%m%d-%H%M%S).db
   ```

2. **使用Git忽略但本地备份**
   ```bash
   # 可以在 .git/hooks/pre-commit 添加自动备份
   ```

3. **谨慎使用migrate reset**
   - ⚠️ 永远不要在生产环境使用 `--force`
   - 建议使用 `prisma migrate dev` 代替
   - 如果必须reset，先手动备份数据库

4. **考虑使用数据库快照**
   ```bash
   # SQLite支持在线备份
   sqlite3 data/app.db ".backup data/app-backup.db"
   ```

## 数据填充命令

如果需要重新填充数据：

```bash
# 完整填充（推荐）
npx tsx scripts/seed-database-full.ts

# 基础填充
npx tsx scripts/seed-database.ts
```

## 数据库路径

主数据库: `/Users/uniteyoo/Documents/yt-dlpservice/data/app.db`

---
**恢复完成时间**: 2025-10-24 09:48
**状态**: ✅ 基础数据已恢复，系统可正常使用
