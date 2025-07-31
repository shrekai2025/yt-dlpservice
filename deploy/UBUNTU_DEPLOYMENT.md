# Ubuntu 服务器部署指南

本指南专门针对 Ubuntu 服务器上的 yt-dlpservice 部署和故障排除。

## 🚀 快速部署

### 1. 系统诊断

在开始部署前，运行系统诊断脚本检查环境：

```bash
# 在项目根目录运行
./deploy/diagnose-system.sh
```

### 2. 安装系统依赖

如果诊断发现缺少依赖，运行自动安装脚本：

```bash
# 安装所有必需的系统依赖
./deploy/install-dependencies.sh
```

### 3. 安装项目依赖

```bash
# 安装 Node.js 依赖
npm install

# 构建项目
npm run build
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 🔧 常见问题解决

### 问题1: M4A 文件下载但压缩失败

**现象:**
```
音频文件格式不是MP3: mov,mp4,m4a,3gp,3g2,mj2
❌ 音频压缩失败: 输入文件无效或不存在
```

**原因:** 小宇宙等平台提供 M4A 格式音频，但音频验证函数过于严格。

**解决方案:** ✅ 已修复
- 扩展了支持的音频格式（MP3, M4A, AAC, WAV, FLAC, OGG）
- 改进了音频文件验证逻辑
- FFmpeg 可以正确处理 M4A 到 MP3 的转换

### 问题2: FFmpeg 未安装或不可用

**现象:**
```
FFmpeg 不可用，无法进行音频压缩
```

**解决方案:**
```bash
# 安装 FFmpeg
sudo apt update
sudo apt install ffmpeg

# 验证安装
ffmpeg -version
```

### 问题3: 音频压缩详细错误诊断

**新增功能:** ✅ 已添加详细错误日志
- 显示输入文件路径和存在性检查
- 显示压缩预设和错误类型
- 显示 FFmpeg 版本和可用性状态

## 📋 系统要求

### 必需依赖

| 组件 | 版本要求 | 安装命令 |
|------|----------|----------|
| Node.js | >= 18.0 | `curl -fsSL https://deb.nodesource.com/setup_18.x \| sudo -E bash - && sudo apt install nodejs` |
| FFmpeg | >= 4.0 | `sudo apt install ffmpeg` |
| yt-dlp | 最新版 | `sudo pip3 install yt-dlp` |
| Chromium | 最新版 | `sudo apt install chromium-browser` |

### 推荐配置

- **内存:** >= 2GB
- **存储:** >= 10GB 可用空间
- **网络:** 稳定的互联网连接

## 🎵 音频处理优化

### 支持的音频格式

**输入格式:**
- M4A (小宇宙、Apple Podcasts)
- MP3 (YouTube、通用)
- AAC (高质量音频)
- WAV (无损音频)
- FLAC (无损压缩)
- OGG (开源格式)

**输出格式:**
- MP3 (统一输出，兼容豆包API)

### 压缩预设

| 预设 | 比特率 | 采样率 | 声道 | 适用场景 |
|------|--------|--------|------|----------|
| light | 128k | 16kHz | 1 | 轻度压缩，保持质量 |
| standard | 64k | 16kHz | 1 | 标准压缩，推荐使用 |
| heavy | 32k | 16kHz | 1 | 高度压缩，最小文件 |

## 🔍 故障排除

### 1. 检查 FFmpeg 功能

```bash
# 测试 FFmpeg 音频处理
ffmpeg -f lavfi -i "sine=frequency=1000:duration=1" -ac 1 -ar 16000 -b:a 32k -f mp3 test.mp3 -y

# 检查输出文件
ls -la test.mp3
rm test.mp3
```

### 2. 检查文件权限

```bash
# 确保临时目录可写
chmod 755 temp/
chmod 755 logs/
chmod 755 data/
```

### 3. 检查网络连接

```bash
# 测试小宇宙网站连接
curl -I https://www.xiaoyuzhoufm.com

# 测试豆包API连接
curl -I https://openspeech.bytedance.com
```

### 4. 查看详细日志

项目现在提供更详细的错误日志：

```bash
# 实时查看日志
tail -f logs/*.log

# 查看压缩相关日志
grep -E "(🗜️|FFmpeg|压缩)" logs/*.log
```

## 🚀 性能优化

### 1. 系统级优化

```bash
# 增加文件描述符限制
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# 优化 Node.js 内存使用
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 2. 应用级优化

- 使用 PM2 进程管理器
- 配置日志轮转
- 设置合适的压缩预设

## 📞 技术支持

如果遇到问题：

1. **运行诊断脚本:** `./deploy/diagnose-system.sh`
2. **检查系统日志:** `journalctl -u yt-dlpservice`
3. **查看应用日志:** `tail -f logs/*.log`
4. **提供诊断报告:** 将诊断脚本输出发送给技术支持

## 🔄 更新日志

### v1.2.0 (当前版本)
- ✅ 修复 M4A 文件压缩问题
- ✅ 扩展音频格式支持
- ✅ 改进 FFmpeg 可用性检查
- ✅ 添加详细错误诊断
- ✅ 提供自动化部署脚本

### 下一版本计划
- 🔄 音频格式自动检测
- 🔄 压缩质量自适应调整
- 🔄 批量音频处理优化 