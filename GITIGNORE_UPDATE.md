# .gitignore 更新说明

## 更新时间
2025-10-25

## 更新原因
为了防止数据库和备份文件被意外提交到 Git 仓库，添加了新的备份文件忽略规则。

## 新增规则

### 1. 数据库备份文件
```gitignore
# 数据库备份文件（新增）
/data/*.db.backup
/data/*.db.temp
/data/app.db.backup
/data/app.db.temp
*.db.backup
*.db.old
```

**忽略的文件**：
- `data/app.db.backup` - 数据库备份文件
- `data/app.db.temp` - 恢复时的临时备份
- `*.db.backup` - 所有数据库备份文件
- `*.db.old` - 旧的备份文件

### 2. 完整备份文件
```gitignore
# 完整备份文件（新增）
/data/full-backup.tar.gz
/data/full-backup.tar.gz.old
/data/temp-backup-*.tar.gz
*.tar.gz.backup
```

**忽略的文件**：
- `data/full-backup.tar.gz` - 完整备份压缩包
- `data/full-backup.tar.gz.old` - 旧的完整备份
- `data/temp-backup-*.tar.gz` - 恢复时创建的临时备份
- `*.tar.gz.backup` - 所有备份压缩包

## 验证

使用以下命令验证文件是否被正确忽略：

```bash
git check-ignore -v data/app.db.backup
git check-ignore -v data/full-backup.tar.gz
```

输出示例：
```
.gitignore:89:*.backup    data/app.db.backup
.gitignore:94:/data/full-backup.tar.gz    data/full-backup.tar.gz
```

## Git 状态检查

```bash
git status
```

应该只显示 `.gitignore` 文件被修改，不应该显示任何 `.backup` 或 `.tar.gz` 文件。

## 注意事项

### 已被忽略的敏感文件
- ✅ 数据库文件 (`*.db`)
- ✅ 数据库备份 (`*.db.backup`)
- ✅ 完整备份 (`full-backup.tar.gz`)
- ✅ 临时备份 (`temp-backup-*.tar.gz`)
- ✅ 媒体文件 (`data/media-uploads/*`)
- ✅ 缩略图 (`data/media-thumbnails/*`)
- ✅ Cookie 文件 (`data/cookies/*.txt`)
- ✅ Google 凭证 (`data/mavaeai-cc140-*.json`)

### 仍会被提交的文件
- ✅ `.gitkeep` 文件（保持目录结构）
- ✅ 代码文件
- ✅ 配置模板

## 最佳实践

1. **定期检查**: 使用 `git status` 确保没有敏感文件被跟踪
2. **清理已跟踪的文件**: 如果之前已经提交了备份文件，使用以下命令清理：
   ```bash
   git rm --cached data/app.db.backup
   git rm --cached data/full-backup.tar.gz
   ```
3. **本地备份**: 备份文件应该保存在本地或安全的云存储中，不要提交到 Git

## 相关命令

### 检查哪些文件会被忽略
```bash
git check-ignore -v data/*
```

### 列出所有被忽略的文件
```bash
git status --ignored
```

### 强制添加被忽略的文件（不推荐）
```bash
git add -f data/app.db.backup  # 不要这样做！
```

## 总结

现在所有数据库备份文件和完整备份文件都会被 Git 自动忽略，不会被意外提交到仓库中。这确保了：

- 🔒 敏感数据不会泄露到代码仓库
- 💾 仓库大小保持合理
- 🚀 Git 操作更快速
- ✅ 符合最佳实践

---

**重要**: 如果你发现任何备份文件出现在 `git status` 中，请立即检查 `.gitignore` 配置！
