# YouTube Cookie 配置说明

为了让 `yt-dlp` 能够下载 YouTube 视频（特别是那些需要登录才能访问的视频），您需要从浏览器中导出 YouTube 的 Cookie 并放置在此目录中。

## 方法一：使用浏览器扩展（推荐）

### 1. 安装 Cookie 导出扩展

推荐使用以下 Chrome 扩展之一：
- **Get cookies.txt LOCALLY**（推荐）
- **cookies.txt**
- **Export Cookies**

### 2. 导出 YouTube Cookie

1. 在 Chrome 中访问 [YouTube](https://www.youtube.com) 并确保已登录
2. 点击扩展图标
3. 选择只导出当前站点的 Cookie
4. 下载 `cookies.txt` 文件
5. 将文件重命名为 `youtube_cookies.txt` 并放在此目录中

## 方法二：手动从开发者工具导出

### 1. 打开开发者工具

1. 在 Chrome 中访问 [YouTube](https://www.youtube.com) 并登录
2. 按 `F12` 或右键点击页面选择"检查"
3. 切换到 "Application" 标签页（中文版可能是"应用程序"）
4. 在左侧找到 "Storage" > "Cookies" > "https://www.youtube.com"

### 2. 复制关键 Cookie

找到并复制以下重要的 Cookie 值：
- `VISITOR_INFO1_LIVE`
- `YSC`
- `PREF`
- `LOGIN_INFO`
- `SAPISID`
- `SSID`
- `HSID`
- `SID`

### 3. 创建 Cookie 文件

1. 复制 `youtube_cookies.txt.example` 为 `youtube_cookies.txt`
2. 将示例值替换为您从浏览器复制的实际值
3. 确保时间戳（expiration）是未来的时间（Unix 时间戳格式）

## 方法三：使用命令行工具

如果您有 Python 环境，可以使用以下工具：

```bash
# 安装 browser_cookie3
pip install browser_cookie3

# 创建 Python 脚本导出 Cookie
python3 -c "
import browser_cookie3
import http.cookiejar

# 获取 Chrome 的 YouTube Cookie
cj = browser_cookie3.chrome(domain_name='youtube.com')

# 保存为 Netscape 格式
http.cookiejar.save_cookie_jar = lambda filename: cj.save(filename, ignore_discard=True)
cj.save('./youtube_cookies.txt', ignore_discard=True)
print('YouTube Cookie 已导出到 youtube_cookies.txt')
"
```

## 文件格式要求

Cookie 文件必须是 Netscape 格式，每行包含 7 个字段，用制表符分隔：

```
domain    flag    path    secure    expiration    name    value
```

示例：
```
.youtube.com	TRUE	/	TRUE	1735689600	VISITOR_INFO1_LIVE	your_visitor_info_value
```

## 安全注意事项

⚠️ **重要提醒**：
- Cookie 文件包含您的登录信息，请妥善保管
- 不要将包含真实 Cookie 的文件提交到版本控制系统
- 定期更新 Cookie，因为它们有过期时间
- 在服务器上部署时，确保文件权限设置合理（如 `chmod 600`）

## 验证 Cookie 是否有效

您可以使用以下命令测试 Cookie 是否有效：

```bash
yt-dlp --cookies ./data/cookies/youtube_cookies.txt --dump-json "https://www.youtube.com/watch?v=test_video_id"
```

如果能正常获取视频信息且没有认证错误，说明 Cookie 配置成功。

## 故障排除

### 常见问题

1. **"Sign in to confirm you're not a bot"**
   - Cookie 可能已过期，请重新导出
   - 确保 Cookie 包含了必要的认证字段

2. **"Private video" 或 "Video unavailable"**
   - 确保您的 YouTube 账号有权限访问该视频
   - Cookie 可能来自不同的账号

3. **Cookie 格式错误**
   - 检查文件格式是否为 Netscape 格式
   - 确保字段之间用制表符分隔，不是空格

### 调试技巧

1. 检查 Cookie 文件权限：`ls -la youtube_cookies.txt`
2. 验证文件格式：`head -5 youtube_cookies.txt`
3. 测试特定视频：使用公开视频先测试基本功能