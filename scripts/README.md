# 开发工具脚本

## 缓存清理脚本

### 问题场景
开发时遇到以下问题：
- `Internal Server Error`
- 页面显示不正常
- 修改代码后不生效
- tRPC 报错但代码正确

### 解决方案

运行清理脚本：

```bash
# 方式 1: 直接运行
./scripts/clean-cache.sh

# 方式 2: 使用 bash
bash scripts/clean-cache.sh
```

### 脚本功能

1. **停止所有 Next.js 进程**
   - 杀死 `next-server` 进程
   - 杀死 `npm run dev` 进程

2. **清理缓存目录**
   - `.next/` - Next.js 构建缓存
   - `node_modules/.cache/` - 模块缓存
   - `.turbo/` - Turbopack 缓存

3. **自动重启服务器**
   - 清理完成后自动运行 `npm run dev`

### 手动清理步骤

如果脚本无法删除 `.next` 目录（权限问题），请手动运行：

```bash
# 1. 停止开发服务器 (Ctrl+C)

# 2. 清理缓存
sudo rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# 3. 重启服务器
npm run dev
```

### 快速命令

添加到 `package.json` 的 scripts：

```json
{
  "scripts": {
    "clean": "bash scripts/clean-cache.sh",
    "clean:cache": "rm -rf .next node_modules/.cache .turbo",
    "dev:clean": "npm run clean:cache && npm run dev"
  }
}
```

使用：
```bash
npm run clean        # 清理并重启
npm run clean:cache  # 仅清理缓存
npm run dev:clean    # 清理后启动
```

### 预防措施

1. **定期清理**: 重大修改后运行清理脚本
2. **Git 忽略**: 确保 `.next/` 已在 `.gitignore` 中
3. **重启习惯**: 修改 tRPC/API 路由后重启服务器

### 常见问题

**Q: 为什么会出现缓存问题？**
A: Next.js Turbopack 会缓存编译结果，有时修改代码后缓存未更新导致。

**Q: 多久需要清理一次？**
A: 通常不需要，只在遇到问题时清理。

**Q: 清理会影响 node_modules 吗？**
A: 不会，只清理缓存，不会删除依赖包。
