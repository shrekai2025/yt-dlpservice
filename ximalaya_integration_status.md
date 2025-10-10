# 喜马拉雅集成现状说明

## 背景
- 目标：在现有下载与 STT 流程里增加喜马拉雅平台，支持普通公开单集（含 `m.ximalaya.com` 分享链接与 `xima.tv` 短链接）。
- 已完成：梳理现有平台架构、调研喜马拉雅移动端分享页使用的接口与前端脚本。

## 调研结果
1. **接口探查**
   - `https://m.ximalaya.com/mobile-playpage/track/share/queryBaseInfo`、`…/queryExtInfo` 可以直接访问，返回节目基础信息、专辑信息、引导文案等。
   - 核心音频接口为 `https://m.ximalaya.com/mobile-playpage/track/v3/baseInfo/{timestamp}`，请求体 `device=selfshare&trackId={id}&trackQualityLevel=0`。该接口返回 `playUrlList`，其中的 URL 需要进一步解密。
2. **直链解密逻辑**
   - 页面打包资源 `10ebbc.js` 暴露 `getAudioSrc`，内部调用 `(0,l.decrypt)(url)` 得到直链。
   - 关联的 CryptoJS 代码与 `decrypt` 方法位于其他 chunk（例如 `4a00f2.js`）中。
3. **签名要求**
   - 请求 `track/v3/baseInfo` 需附带 `xm-sign` 请求头。头部值由 `dwsGetBrowserId()` 与 `dwsGetSessionID()` 运行时生成。
   - 这些工具函数位于运行时加载的 chunk 中；离线保存的 `10ebbc.js` 中只看到引用，未包含具体实现。
4. **运行时复用尝试**
   - 通过 Puppeteer 访问分享页，确认全局存在 `award_e3f28` webpack runtime。
   - 但 `award_e3f28.m` 中的模块 ID 被进一步懒加载，无法直接 `loader(451)` 取得 `getAudioSrc`；`loader.u` 返回 `''`，推测实际 chunk 清单在运行时通过异步脚本 `e464df839.js` 注入，需要原生浏览器环境才能完成。
   - 由于模块未加载，无法在页面上下文复用已有 `decrypt` 与 `xm-sign` 逻辑。

## 当前阻塞
1. **xm-sign 计算方式缺失**  
   访问 `track/v3/baseInfo` 时，如果缺少正确的 `xm-sign`，接口返回 `{"ret":-1,"msg":"亲，系统出错啦，等等再试好不？"}`。在 Node 环境暂未拿到可用的签名生成方法。
2. **直链解密算法未复刻**  
   `playUrlList` 返回的 URL 需要调用 `(0,l.decrypt)` 才能使用，现有打包代码仅在浏览器环境下可获取。
3. **付费/受限内容识别**  
   部分节目（示例 `trackId=904088164`）标记为 `paid=true`，即使接口返回元数据，也无法正常获取音频直链。需要在流程中判定并直接报错。

## 建议下一步
1. **解析官方脚本**  
   - 下载完整运行时 chunk（`e464df839.js`、`4a00f2.js` 等），定位 `dwsGetSessionID` / `dwsGetBrowserId`、`decrypt` 实现。
   - 将相关逻辑移植到 Node 侧（可能依赖 CryptoJS、MD5/HMAC 等算法）。
2. **签名复刻或代理复用**  
   - 方案 A：纯算法方式在服务端复刻 `xm-sign` 计算流程，使 axios 请求可直接访问接口。  
   - 方案 B：在浏览器环境（Puppeteer）内获取签名与解密结果，再传回 Node（成本较高、复杂度大）。
3. **平台适配策略**  
   - 确认仅支持 `isAuthorized=true` 的公开免费单集；对付费或 VIP 节目直接返回「不支持」错误。
4. **短链解析**  
   - `https://xima.tv/{code}` 可通过 HTTP 302 拿到 `m.ximalaya.com/selfshare/sound/{trackId}`，短链支持可在 URL 标准化流程里做一次跳转解析。

## 附录：测试记录
| 操作 | 结果 |
|------|------|
| `curl https://m.ximalaya.com/mobile-playpage/track/share/queryBaseInfo?trackId=904088164` | 返回节目基础信息（`ret=0`，但 `paid=true`） |
| `curl https://m.ximalaya.com/mobile-playpage/track/v3/baseInfo/{ts}`（无 `xm-sign`） | `ret=-1`，提示系统错误 |
| Puppeteer 调用 `fetch` 访问 `track/v3/baseInfo` | 同样返回 `ret=-1` |
| Puppeteer 扫描 `award_e3f28.m` 模块 | 未找到包含 `getAudioSrc` 的模块（chunk 未加载） |

> 以上说明截至 2025-10-09，若后续有新的突破请更新本文档。
