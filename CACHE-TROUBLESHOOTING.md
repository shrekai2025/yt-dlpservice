# Next.js 开发缓存问题解决指南

## 🚨 问题症状

开发时遇到以下问题：
- ✗ `Internal Server Error`
- ✗ 页面显示空白或错误
- ✗ 修改代码后页面不更新
- ✗ tRPC 报错但代码正确
- ✗ 组件无法加载

## ⚡ 快速解决方案

### 方案 1: 使用 npm 命令（推荐）

```bash
# 清理缓存并重启（一键解决）
npm run dev:clean

# 或分步执行
npm run clean:cache  # 仅清理缓存
npm run dev          # 重启服务器
```

### 方案 2: 使用清理脚本

```bash
# 自动清理并重启
./scripts/clean-cache.sh

# 或使用 npm
npm run clean:full
```

### 方案 3: 手动清理

```bash
# 1. 停止开发服务器
Ctrl+C  # 或 Cmd+C (Mac)

# 2. 清理所有缓存
rm -rf .next node_modules/.cache .turbo

# 3. 重启服务器
npm run dev
```

## 📋 可用命令清单

| 命令 | 说明 |
|------|------|
| `npm run dev:clean` | 清理缓存并启动开发服务器 |
| `npm run clean:cache` | 清理 .next、node_modules/.cache、.turbo |
| `npm run clean:full` | 运行完整清理脚本（含自动重启） |
| `npm run clean` | 清理 .next 和 tsconfig.tsbuildinfo |

## 🔍 问题诊断

### 1. 检查缓存目录

```bash
# 查看缓存目录大小
du -sh .next node_modules/.cache .turbo 2>/dev/null

# 查看进程
ps aux | grep next
```

### 2. 查看开发服务器日志

```bash
# 日志保存在
tail -f /tmp/dev.log
```

### 3. 验证服务器状态

```bash
# 检查端口
lsof -i :3000

# 测试访问
curl http://localhost:3000
```

## 🛠️ 高级解决方案

### 完全重置开发环境

```bash
# 停止所有进程
pkill -f "next-server"
pkill -f "npm run dev"

# 清理所有缓存和依赖
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
rm -rf node_modules
rm -rf .pnpm-store  # 如果使用 pnpm

# 重新安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 清理 Turbopack 缓存

```bash
# Turbopack 特定缓存
rm -rf .turbo
rm -rf .next/cache

# 清理并启动
npm run dev:clean
```

## 🔄 预防措施

### 1. Git 忽略配置

确保 `.gitignore` 包含：

```gitignore
# Next.js
.next/
.turbo/
.vercel/

# Cache
node_modules/.cache/
tsconfig.tsbuildinfo

# Logs
*.log
npm-debug.log*
```

### 2. 开发习惯

- ✅ **修改 API 路由后** → 重启服务器
- ✅ **修改 tRPC 定义后** → 运行 `npm run dev:clean`
- ✅ **遇到奇怪错误** → 先尝试清理缓存
- ✅ **拉取新代码后** → 运行 `npm install && npm run dev:clean`

### 3. 定期维护

```bash
# 每周清理一次（可选）
npm run clean:cache

# 重大更新后
npm run clean:full
```

## 🐛 常见问题 FAQ

### Q: 为什么会出现缓存问题？

**A:** Next.js 和 Turbopack 会缓存编译结果以提高性能，但有时修改代码后缓存未正确更新。

### Q: 清理缓存会删除 node_modules 吗？

**A:** 不会。清理命令只删除缓存目录，不会删除依赖包。

### Q: 多久需要清理一次？

**A:** 通常不需要定期清理，只在遇到问题时清理即可。

### Q: Internal Server Error 一定是缓存问题吗？

**A:** 不一定。先检查：
1. 代码语法错误
2. TypeScript 类型错误（`npm run typecheck`）
3. 依赖缺失（`npm install`）
4. 如果都没问题，再清理缓存

### Q: 清理后仍然有问题？

**A:** 尝试完全重置：
```bash
rm -rf .next node_modules
npm install
npm run dev
```

## 📚 相关文档

- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Turbopack](https://turbo.build/pack/docs)
- [项目脚本说明](./scripts/README.md)

## 💡 快速参考

```bash
# 遇到问题时的标准流程
1. Ctrl+C                    # 停止服务器
2. npm run clean:cache       # 清理缓存
3. npm run dev              # 重启服务器

# 一键解决
npm run dev:clean
```

---

**最后更新**: 2025-10-06
**维护者**: Claude Code Assistant
