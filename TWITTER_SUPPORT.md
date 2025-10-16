# Twitter/X 媒体下载功能

yt-dlpservice 现已支持从 Twitter/X 下载推文中的媒体内容（视频、图片、GIF等）。

## 功能特性

- ✅ 支持 twitter.com 和 x.com 域名
- ✅ 自动下载推文中的视频和图片
- ✅ 提取推文元数据（点赞、转发、回复数等）
- ✅ 支持音频提取和转录
- ✅ 可选的评论抓取功能

## 支持的URL格式

```
https://twitter.com/username/status/tweet_id
https://x.com/username/status/tweet_id
https://twitter.com/i/status/tweet_id
https://x.com/i/status/tweet_id
https://twitter.com/i/spaces/space_id (Twitter Spaces)
```

## 使用方法

### 1. API调用

**创建下载任务:**

```bash
curl -X POST http://localhost:3000/api/external/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "url": "https://twitter.com/username/status/tweet_id",
    "downloadType": "VIDEO_ONLY"
  }'
```

**下载类型选项:**
- `AUDIO_ONLY` - 仅下载音频（适用于视频推文）
- `VIDEO_ONLY` - 仅下载视频
- `BOTH` - 同时下载视频和提取音频

### 2. 管理界面

1. 访问 `http://localhost:3000/admin`
2. 在任务管理页面输入 Twitter URL
3. 选择下载类型
4. 点击"创建任务"

## 认证说明

### 公开内容

大多数公开的推文可以直接下载，无需登录。

### 需要登录的内容

某些推文可能需要登录才能访问。如果遇到认证错误，有以下解决方案：

#### 方案1: 使用浏览器Cookies（推荐）

```bash
# 从Firefox导入cookies
yt-dlp --cookies-from-browser firefox "https://twitter.com/..."

# 从Chrome导入cookies (需要先禁用锁定)
# 1. 添加到Chrome快捷方式: --disable-features=LockProfileCookieDatabase
# 2. 重启浏览器
# 3. 运行:
yt-dlp --cookies-from-browser chrome "https://twitter.com/..."
```

#### 方案2: 导出Cookies文件

1. 使用浏览器扩展（如"Get cookies.txt"）导出Twitter cookies
2. 保存为 `data/cookies/twitter_cookies.txt`
3. 在代码中配置使用该文件（参考YouTube的cookie配置方式）

## 元数据说明

下载完成后，任务会包含以下Twitter特定的元数据：

```json
{
  "extraMetadata": {
    "title": "推文文本内容...",
    "author": "username",
    "authorAvatar": "https://...",
    "duration": 30,
    "description": "完整推文内容",
    "viewCount": 10000,
    "platformData": {
      "viewCount": 10000,
      "likeCount": 500,
      "retweetCount": 100,
      "replyCount": 50,
      "quoteCount": 20,
      "bookmarkCount": 30
    },
    "comments": [
      {
        "author": "replier_username",
        "content": "评论内容...",
        "replies": []
      }
    ]
  }
}
```

## 常见问题

### Q: 提示"No video could be found in this tweet"

**A:** 该推文不包含视频内容。Twitter/X 推文可能只包含文本、图片或链接。

### Q: 提示"Could not authenticate you"

**A:** 该推文需要登录才能访问。请按照上述"认证说明"配置cookies。

### Q: x.com 域名无法下载

**A:** 系统会自动将 x.com 转换为 twitter.com。如果仍有问题，请尝试手动将URL改为 twitter.com。

### Q: 下载速度慢或失败

**A:** Twitter可能有速率限制。建议：
1. 适当增加超时时间
2. 使用登录状态（cookies）
3. 避免短时间内大量请求

## 技术实现

### 平台架构

- **Platform**: `TwitterPlatform` ([src/lib/platforms/twitter/twitter-platform.ts](src/lib/platforms/twitter/twitter-platform.ts))
- **Scraper**: `TwitterScraper` ([src/lib/services/metadata-scraper/scrapers/twitter.ts](src/lib/services/metadata-scraper/scrapers/twitter.ts))
- **下载工具**: yt-dlp (内置Twitter提取器)

### 下载流程

1. URL验证 → TwitterPlatform识别并验证URL
2. 信息获取 → yt-dlp提取视频信息
3. 媒体下载 → 根据downloadType下载对应内容
4. 元数据采集 → Puppeteer爬虫补充互动数据
5. 可选转录 → 对视频/音频进行语音转文字

## 测试

运行测试脚本验证功能：

```bash
npx tsx scripts/test-twitter-download.ts
```

**注意**: 需要将脚本中的示例URL替换为真实的包含视频的推文URL。

## 限制

1. **反爬虫**: Twitter有严格的反爬虫机制，元数据抓取可能失败
2. **登录要求**: 某些内容必须登录才能访问
3. **速率限制**: 大量请求可能被限制
4. **API变化**: Twitter API经常变化，可能导致临时性问题

## 更新日志

- **2025-10-15**: 新增Twitter/X平台支持
  - 实现TwitterPlatform
  - 实现TwitterScraper元数据爬虫
  - 添加TwitterData类型定义
  - 支持视频、音频、图片下载

## 参考资源

- [yt-dlp Twitter提取器文档](https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/twitter.py)
- [yt-dlp认证指南](https://github.com/yt-dlp/yt-dlp#authentication-with-cookies)
