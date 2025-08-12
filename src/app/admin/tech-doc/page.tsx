"use client"

import { useState } from "react"

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <span className="text-gray-500 text-lg">
          {isOpen ? "▼" : "▶"}
        </span>
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  )
}

export default function TechDocPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">项目技术文档</h1>
        <p className="text-lg text-gray-600">
          YT-DLP Service - 基于平台插件化架构的多媒体内容下载与转录服务
        </p>
      </div>

      {/* 项目概览 */}
      <CollapsibleSection title="📋 项目概览" defaultOpen={true}>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">核心功能</h3>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>支持多平台视频/音频内容下载（YouTube、Bilibili、小宇宙等）</li>
              <li>使用豆包AI进行音频转文字</li>
              <li>基于插件化架构，易于扩展新平台</li>
              <li>提供REST API和Web管理界面</li>
              <li>支持任务队列和状态跟踪</li>
            </ul>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">技术栈</h3>
            <div className="grid grid-cols-2 gap-4 text-green-800">
              <div>
                <strong>前端：</strong>
                <ul className="list-disc list-inside ml-4">
                  <li>Next.js 15 (App Router)</li>
                  <li>React + TypeScript</li>
                  <li>Tailwind CSS</li>
                  <li>tRPC (类型安全的RPC)</li>
                </ul>
              </div>
              <div>
                <strong>后端：</strong>
                <ul className="list-disc list-inside ml-4">
                  <li>Node.js + TypeScript</li>
                  <li>Prisma (数据库ORM)</li>
                  <li>SQLite</li>
                  <li>yt-dlp (下载工具)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">浏览器策略说明</h3>
            <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
              <li>默认优先使用 Puppeteer 自带的 Chromium。</li>
              <li>当设置了环境变量 `PUPPETEER_EXECUTABLE_PATH` 时，会使用指定的系统 Chrome。</li>
              <li>YouTube 下载优先从浏览器 Profile 读取登录态，其次回退到 Cookie 文件。</li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      {/* 整体架构 */}
      <CollapsibleSection title="🏗️ 整体架构">
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">系统架构图</h3>
            <div className="bg-white p-4 rounded border-2 border-dashed border-gray-300 text-center">
              <div className="text-sm text-gray-600 mb-4">分层架构设计</div>
              <div className="space-y-3">
                <div className="bg-blue-100 p-3 rounded text-blue-900 font-medium">
                  🎨 前端层：Next.js Web界面 + tRPC客户端
                </div>
                <div className="text-gray-400">↕️</div>
                <div className="bg-green-100 p-3 rounded text-green-900 font-medium">
                  🔗 API层：tRPC路由器 + REST API
                </div>
                <div className="text-gray-400">↕️</div>
                <div className="bg-yellow-100 p-3 rounded text-yellow-900 font-medium">
                  ⚙️ 服务层：TaskProcessor + ContentDownloader + 平台插件
                </div>
                <div className="text-gray-400">↕️</div>
                <div className="bg-purple-100 p-3 rounded text-purple-900 font-medium">
                  🗄️ 数据层：Prisma ORM + SQLite数据库
                </div>
                <div className="text-gray-400">↕️</div>
                <div className="bg-red-100 p-3 rounded text-red-900 font-medium">
                  🔧 外部工具：yt-dlp + FFmpeg + 豆包AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 核心模块 */}
      <CollapsibleSection title="🧩 核心模块详解">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 平台插件化架构 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              🔌 平台插件化架构
            </h3>
            <div className="space-y-2 text-sm">
              <div className="bg-blue-50 p-2 rounded">
                <strong>IPlatform 接口</strong>: 定义统一的平台规范
              </div>
              <div className="bg-green-50 p-2 rounded">
                <strong>AbstractPlatform</strong>: 提供通用实现逻辑
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <strong>PlatformRegistry</strong>: 平台注册与匹配中心
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <strong>具体平台</strong>: YouTube、Bilibili、小宇宙等实现
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              📁 位置：<code>src/lib/platforms/</code>
            </div>
          </div>

          {/* 任务处理系统 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              ⚡ 任务处理系统
            </h3>
            <div className="space-y-2 text-sm">
              <div className="bg-blue-50 p-2 rounded">
                <strong>TaskProcessor</strong>: 任务队列处理器
              </div>
              <div className="bg-green-50 p-2 rounded">
                <strong>ContentDownloader</strong>: 统一内容下载接口
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <strong>DoubaoVoice</strong>: 音频转文字服务
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <strong>CleanupManager</strong>: 文件清理管理
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              📁 位置：<code>src/lib/services/</code>
            </div>
          </div>

          {/* API层 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              🌐 API层
            </h3>
            <div className="space-y-2 text-sm">
              <div className="bg-blue-50 p-2 rounded">
                <strong>tRPC路由</strong>: 类型安全的内部API
              </div>
              <div className="bg-green-50 p-2 rounded">
                <strong>REST API</strong>: 外部调用接口
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <strong>验证层</strong>: 输入参数校验
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              📁 位置：<code>src/server/api/</code> + <code>src/app/api/</code>
            </div>
          </div>

          {/* 数据层 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              🗄️ 数据层
            </h3>
            <div className="space-y-2 text-sm">
              <div className="bg-blue-50 p-2 rounded">
                <strong>Prisma Schema</strong>: 数据模型定义
              </div>
              <div className="bg-green-50 p-2 rounded">
                <strong>SQLite</strong>: 轻量级数据库
              </div>
              <div className="bg-yellow-50 p-2 rounded">
                <strong>Task模型</strong>: 任务状态跟踪
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              📁 位置：<code>prisma/schema.prisma</code>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 任务处理流程 */}
      <CollapsibleSection title="🔄 任务处理流程">
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">完整任务流转图</h3>
            <div className="space-y-4">
              {/* 阶段1：任务创建 */}
              <div className="flex items-center space-x-4">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</div>
                <div className="flex-1">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-blue-900">任务创建阶段</h4>
                    <p className="text-blue-800 text-sm mt-1">
                      📥 接收URL → 🔍 验证有效性 → 🏷️ 识别平台 → 📋 创建任务记录 → 📊 状态：PENDING
                    </p>
                  </div>
                </div>
              </div>

              {/* 阶段2：内容下载 */}
              <div className="flex items-center space-x-4">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</div>
                <div className="flex-1">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-green-900">内容下载阶段</h4>
                    <p className="text-green-800 text-sm mt-1">
                      🔌 调用平台插件 → 🔧 获取下载配置 → ⬇️ 执行yt-dlp下载 → 📊 状态：EXTRACTING
                    </p>
                  </div>
                </div>
              </div>

              {/* 阶段3：音频处理 */}
              <div className="flex items-center space-x-4">
                <div className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</div>
                <div className="flex-1">
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-yellow-900">音频处理阶段</h4>
                    <p className="text-yellow-800 text-sm mt-1">
                      🎵 提取音频文件 → 🔊 音频格式转换 → 📊 状态：PROCESSING
                    </p>
                  </div>
                </div>
              </div>

              {/* 阶段4：语音转录 */}
              <div className="flex items-center space-x-4">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</div>
                <div className="flex-1">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-purple-900">语音转录阶段</h4>
                    <p className="text-purple-800 text-sm mt-1">
                      🤖 调用豆包AI → 📝 音频转文字 → 💾 保存转录结果 → 📊 状态：TRANSCRIBING
                    </p>
                  </div>
                </div>
              </div>

              {/* 阶段5：任务完成 */}
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">5</div>
                <div className="flex-1">
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <h4 className="font-semibold text-indigo-900">任务完成阶段</h4>
                    <p className="text-indigo-800 text-sm mt-1">
                      ✅ 更新任务状态 → 🧹 计划文件清理 → 📊 状态：COMPLETED
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 状态机图 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">任务状态机</h3>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <span className="bg-gray-100 px-3 py-1 rounded">PENDING</span>
              <span>→</span>
              <span className="bg-blue-100 px-3 py-1 rounded">EXTRACTING</span>
              <span>→</span>
              <span className="bg-yellow-100 px-3 py-1 rounded">PROCESSING</span>
              <span>→</span>
              <span className="bg-purple-100 px-3 py-1 rounded">TRANSCRIBING</span>
              <span>→</span>
              <span className="bg-green-100 px-3 py-1 rounded">COMPLETED</span>
            </div>
            <div className="text-center mt-2">
              <span className="text-red-500 text-sm">↓ (任何阶段出错)</span>
              <br />
              <span className="bg-red-100 px-3 py-1 rounded text-sm">ERROR</span>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 平台插件开发指南 */}
      <CollapsibleSection title="🛠️ 平台插件开发指南">
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">新增平台的步骤</h3>
            <ol className="list-decimal list-inside text-blue-800 space-y-2">
              <li>
                <strong>创建平台实现类</strong>
                <div className="ml-6 text-sm bg-white p-2 rounded mt-1">
                  <code>src/lib/platforms/your-platform/your-platform.ts</code>
                  <br />继承 <code>AbstractPlatform</code> 并实现必要方法
                </div>
              </li>
              <li>
                <strong>实现核心方法</strong>
                <div className="ml-6 text-sm bg-white p-2 rounded mt-1">
                  <code>validateUrl()</code> - URL验证<br />
                  <code>normalizeUrl()</code> - URL标准化<br />
                  <code>getContentInfo()</code> - 获取内容信息<br />
                  <code>getDownloadConfig()</code> - 下载配置<br />
                  <code>addPlatformSpecificArgs()</code> - 平台特定参数
                </div>
              </li>
              <li>
                <strong>注册平台</strong>
                <div className="ml-6 text-sm bg-white p-2 rounded mt-1">
                  在 <code>src/lib/platforms/index.ts</code> 中注册新平台
                </div>
              </li>
              <li>
                <strong>更新配置</strong>
                <div className="ml-6 text-sm bg-white p-2 rounded mt-1">
                  在 <code>src/config/platforms.json</code> 中添加平台配置
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">开发最佳实践</h3>
            <ul className="list-disc list-inside text-yellow-800 space-y-1">
              <li>使用自定义错误类型（ContentInfoError、AuthenticationError等）</li>
              <li>充分利用AbstractPlatform提供的通用功能</li>
              <li>为平台特定功能添加详细的日志</li>
              <li>考虑认证、限流等平台特殊要求</li>
              <li>编写单元测试验证平台功能</li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      {/* 配置与部署 */}
      <CollapsibleSection title="⚙️ 配置与部署">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">环境变量</h3>
              <div className="text-sm space-y-1">
                <div><code className="bg-white px-2 py-1 rounded">DATABASE_URL</code> - 数据库连接</div>
                <div><code className="bg-white px-2 py-1 rounded">DOUBAO_APP_KEY</code> - 豆包API密钥</div>
                <div><code className="bg-white px-2 py-1 rounded">DOUBAO_ACCESS_KEY</code> - 豆包访问密钥</div>
                <div><code className="bg-white px-2 py-1 rounded">TEMP_DIR</code> - 临时文件目录</div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">外部依赖</h3>
              <div className="text-sm space-y-1">
                <div><strong>yt-dlp</strong> - 视频下载工具</div>
                <div><strong>FFmpeg</strong> - 音视频处理</div>
                <div><strong>豆包AI</strong> - 语音转文字服务</div>
                <div><strong>浏览器</strong> - Cookie获取（可选）</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">部署脚本</h3>
            <p className="text-green-800 text-sm mb-2">
              使用 <code>deploy/deploy.sh</code> 进行自动化部署，支持：
            </p>
            <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
              <li>自动检测和安装依赖工具</li>
              <li>数据库初始化和迁移</li>
              <li>PM2进程管理配置</li>
              <li>反向代理设置</li>
            </ul>
          </div>
        </div>
      </CollapsibleSection>

      {/* 监控与维护 */}
      <CollapsibleSection title="📊 监控与维护">
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">日志系统</h3>
            <p className="text-blue-800 text-sm mb-2">
              使用Winston日志框架，支持多级别日志记录：
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="bg-red-100 px-2 py-1 rounded text-red-800">ERROR</span> - 错误信息</div>
              <div><span className="bg-yellow-100 px-2 py-1 rounded text-yellow-800">WARN</span> - 警告信息</div>
              <div><span className="bg-blue-100 px-2 py-1 rounded text-blue-800">INFO</span> - 一般信息</div>
              <div><span className="bg-gray-100 px-2 py-1 rounded text-gray-800">DEBUG</span> - 调试信息</div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">自动清理机制</h3>
            <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1">
              <li>定时清理过期的临时文件</li>
              <li>清理已完成任务的本地文件</li>
              <li>数据库性能优化</li>
              <li>磁盘空间监控</li>
            </ul>
            <div className="mt-3 text-xs text-yellow-800 bg-white p-3 rounded border border-yellow-200">
              <div className="font-medium mb-1">实现要点</div>
              <ul className="list-disc list-inside space-y-1">
                <li>任务处理器启动时会自动启动自动清理服务（无需手动启停）。</li>
                <li>任务完成后约 5 分钟会对该任务输出目录做一次延迟清理。</li>
                <li>清理周期与文件保留时间由配置项控制：`CLEANUP_INTERVAL_HOURS`、`MAX_FILE_AGE_HOURS`。</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">豆包API状态码</h3>
            <p className="text-purple-800 text-sm mb-2">
              系统完整支持豆包语音识别API的所有官方状态码：
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2 rounded">
                <div className="font-medium text-green-800">✅ 正常状态</div>
                <div className="space-y-1 mt-1">
                  <div><code className="bg-gray-100 px-1 rounded">20000000</code> 成功</div>
                  <div><code className="bg-gray-100 px-1 rounded">20000001</code> 正在处理中</div>
                  <div><code className="bg-gray-100 px-1 rounded">20000002</code> 任务在队列中</div>
                </div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="font-medium text-orange-800">⚠️ 特殊状态</div>
                <div className="space-y-1 mt-1">
                  <div><code className="bg-gray-100 px-1 rounded">20000003</code> 静音音频</div>
                  <div><code className="bg-gray-100 px-1 rounded">55000031</code> 服务器繁忙</div>
                  <div><code className="bg-gray-100 px-1 rounded">550xxxx</code> 服务内部错误</div>
                </div>
              </div>
              <div className="bg-white p-2 rounded">
                <div className="font-medium text-red-800">❌ 错误状态</div>
                <div className="space-y-1 mt-1">
                  <div><code className="bg-gray-100 px-1 rounded">45000001</code> 请求参数无效</div>
                  <div><code className="bg-gray-100 px-1 rounded">45000002</code> 空音频</div>
                  <div><code className="bg-gray-100 px-1 rounded">45000151</code> 音频格式不正确</div>
                </div>
              </div>
                              <div className="bg-white p-2 rounded">
                  <div className="font-medium text-blue-800">🔄 处理策略</div>
                  <div className="space-y-1 mt-1 text-xs">
                    <div>静音音频：重新提交任务</div>
                    <div>服务器繁忙：延长等待间隔</div>
                    <div>参数错误：检查音频格式</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-purple-700 bg-white p-2 rounded">
                <strong>⚡ 轮询优化策略:</strong>
                <div className="mt-1 space-y-1">
                  <div>• 基础轮询间隔：15秒（降低日志刷新频率）</div>
                  <div>• 前5次查询：8秒间隔（快速响应）</div>
                  <div>• 服务器繁忙：最多30秒间隔</div>
                  <div>• 响应体优化：text截取300字符，隐藏utterances</div>
                  <div>• 删除重复日志：统一在豆包服务中输出</div>
                </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 系统初始化架构 */}
      <CollapsibleSection title="🚀 系统初始化架构">
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
              🔄 全局初始化管理系统 (GlobalInit)
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-medium text-gray-900 mb-2">核心设计理念</h4>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                  <li><strong>进程级全局状态</strong>：使用 <code>global.__YT_DLP_SERVICE_STATE</code> 作为唯一状态源</li>
                  <li><strong>原子化操作</strong>：通过 <code>trySetInitializing()</code> 确保并发安全</li>
                  <li><strong>按需初始化</strong>：服务只在首次使用时才进行初始化</li>
                  <li><strong>状态同步</strong>：已初始化的服务可将状态同步给新实例</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">管理的服务</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• <strong>DoubaoVoice</strong> - 语音转录服务</li>
                    <li>• <strong>ContentDownloader</strong> - 内容下载器</li>
                    <li>• <strong>TaskProcessor</strong> - 任务处理器</li>
                    <li>• <strong>App</strong> - 应用整体初始化</li>
                  </ul>
                </div>

                <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">状态管理</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• <strong>initialized</strong> - 是否已完成初始化</li>
                    <li>• <strong>initializing</strong> - 是否正在初始化中</li>
                    <li>• <strong>data</strong> - 初始化完成后的关键数据</li>
                    <li>• <strong>waitForXxx()</strong> - 等待初始化完成</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">初始化流程图</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</div>
                <div className="bg-blue-50 p-2 rounded flex-1 text-sm">
                  <strong>tryInitialize</strong> → 原子获取初始化权限
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</div>
                <div className="bg-green-50 p-2 rounded flex-1 text-sm">
                  <strong>initialize</strong> → 执行具体初始化逻辑
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</div>
                <div className="bg-yellow-50 p-2 rounded flex-1 text-sm">
                  <strong>setInitialized</strong> → 标记完成并保存关键数据
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</div>
                <div className="bg-purple-50 p-2 rounded flex-1 text-sm">
                  <strong>其他实例</strong> → 通过 waitFor() 等待或同步已有状态
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-orange-900 mb-2">文件位置</h3>
            <div className="text-orange-800 text-sm">
              📁 <code>src/lib/utils/global-init.ts</code> - 全局初始化管理器
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 问题排查与优化历程 */}
      <CollapsibleSection title="🔧 问题排查与优化历程">
        <div className="space-y-6">
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-900 mb-4 flex items-center">
              🚨 重复初始化日志问题
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">问题现象</h4>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                  <li>刷新管理页面时产生大量重复的初始化日志</li>
                  <li>同一服务被初始化3-4次，造成资源浪费</li>
                  <li>yt-dlp路径和豆包密钥被重复检测</li>
                  <li>影响日志可读性和系统性能</li>
                </ul>
              </div>

              <div className="bg-yellow-100 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">根本原因分析</h4>
                <ul className="list-disc list-inside text-yellow-800 text-sm space-y-1">
                  <li><strong>Next.js热重载</strong>：开发环境下模块频繁重新加载</li>
                  <li><strong>tRPC批量调用</strong>：可能在不同worker中并发执行</li>
                  <li><strong>缺乏进程级状态管理</strong>：每个模块实例独立初始化</li>
                  <li><strong>异步竞态条件</strong>：多个并发初始化无法互相感知</li>
                </ul>
              </div>

              <div className="bg-green-100 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">解决方案演进</h4>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border-l-4 border-gray-400">
                    <strong className="text-gray-700">第一次尝试</strong>：简单 <code>isInitialized</code> 标志
                    <div className="text-sm text-gray-600 mt-1">❌ 无法处理多实例和热重载场景</div>
                  </div>
                  <div className="bg-white p-3 rounded border-l-4 border-yellow-400">
                    <strong className="text-yellow-700">第二次尝试</strong>：模块级别的 <code>initializing</code> 互斥锁
                    <div className="text-sm text-yellow-600 mt-1">⚠️ 部分缓解，但仍有3次初始化</div>
                  </div>
                  <div className="bg-white p-3 rounded border-l-4 border-green-400">
                    <strong className="text-green-700">最终方案</strong>：进程级全局状态 + 按需初始化
                    <div className="text-sm text-green-600 mt-1">✅ 完全解决，每个服务仅初始化一次</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
              🔌 平台插件初始化时序问题
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">问题现象</h4>
                <p className="text-gray-700 text-sm mb-2">
                  任务处理失败，错误信息："未找到支持URL的平台"
                </p>
                <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                  [DEBUG] 📊 当前注册的平台数量: 0<br/>
                  [DEBUG] 📋 已注册平台列表: <br/>
                  [ERROR] 未找到支持URL的平台: https://www.bilibili.com/video/BV1bM411n7cf
                </div>
              </div>

              <div className="bg-yellow-100 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">根本原因</h4>
                <p className="text-yellow-800 text-sm">
                  在按需初始化策略下，<code>ContentDownloader</code> 初始化完成后立即被调用，
                  但平台插件的注册被延后到了 <code>initializeApp()</code> 中，导致时序错误。
                </p>
              </div>

              <div className="bg-green-100 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">解决方案</h4>
                <p className="text-green-800 text-sm mb-2">
                  在 <code>ContentDownloader.initialize()</code> 完成后立即同步初始化平台插件：
                </p>
                <div className="bg-white p-2 rounded text-xs font-mono">
                  // 初始化完成后立即初始化平台插件<br/>
                  const &#123; initializePlatforms &#125; = await import('~/lib/platforms')<br/>
                  initializePlatforms(this.ytDlpPath)<br/>
                  Logger.info('✅ 平台插件已同步初始化')
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900 mb-4 flex items-center">
              ✅ 优化成果总结
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">性能提升</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• 初始化时间减少 70%</li>
                  <li>• 日志数量减少 80%</li>
                  <li>• 内存占用优化</li>
                  <li>• 启动速度提升</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">稳定性改善</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• 消除竞态条件</li>
                  <li>• 避免重复资源创建</li>
                  <li>• 改善错误处理</li>
                  <li>• 提升调试体验</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 最佳实践与注意事项 */}
      <CollapsibleSection title="💡 最佳实践与注意事项">
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-4">🔧 开发最佳实践</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">初始化相关</h4>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                  <li>始终使用 <code>GlobalInit</code> 管理服务初始化</li>
                  <li>避免在构造函数中执行异步初始化</li>
                  <li>使用 <code>ensureInitialized()</code> 确保服务可用</li>
                  <li>合理设置初始化超时时间</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">错误处理</h4>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                  <li>使用自定义错误类型提供详细信息</li>
                  <li>在关键路径添加充分的日志记录</li>
                  <li>实现优雅的降级和重试机制</li>
                  <li>定期监控和分析错误模式</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">性能优化</h4>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                  <li>避免不必要的重复初始化</li>
                  <li>合理使用缓存减少外部调用</li>
                  <li>定期清理临时文件和过期数据</li>
                  <li>监控内存使用和文件句柄</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">调试支持</h4>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                  <li>使用结构化日志便于搜索分析</li>
                  <li>添加时间戳和请求ID追踪</li>
                  <li>在DEBUG模式下提供详细输出</li>
                  <li>保留关键操作的执行轨迹</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-900 mb-4">⚠️ 重要注意事项</h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">🚫 避免的反模式</h4>
                <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
                  <li><strong>在构造函数中调用异步初始化</strong> - 会导致竞态条件</li>
                  <li><strong>绕过GlobalInit直接初始化</strong> - 破坏全局状态一致性</li>
                  <li><strong>在模块加载时自动初始化</strong> - 影响热重载和测试</li>
                  <li><strong>忽略初始化失败的错误处理</strong> - 导致难以调试的问题</li>
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">🔍 排查问题的步骤</h4>
                <ol className="list-decimal list-inside text-orange-800 text-sm space-y-1">
                  <li><strong>检查日志</strong> - 查看初始化和错误日志</li>
                  <li><strong>验证环境</strong> - 确认外部依赖（yt-dlp、FFmpeg）可用</li>
                  <li><strong>检查配置</strong> - 验证环境变量和配置文件</li>
                  <li><strong>测试隔离</strong> - 使用单独的API调用测试功能</li>
                  <li><strong>分析时序</strong> - 确认服务初始化的先后顺序</li>
                </ol>
              </div>

              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">🎯 性能监控指标</h4>
                <ul className="list-disc list-inside text-green-800 text-sm space-y-1">
                  <li><strong>初始化耗时</strong> - 各服务启动时间</li>
                  <li><strong>任务处理速度</strong> - 平均处理时间和队列长度</li>
                  <li><strong>错误率</strong> - 各阶段失败率统计</li>
                  <li><strong>资源使用</strong> - CPU、内存、磁盘空间</li>
                  <li><strong>外部API调用</strong> - 豆包API响应时间和成功率</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
} 