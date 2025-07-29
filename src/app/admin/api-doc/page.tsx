'use client'

import { useState } from 'react'

export default function ApiDocPage() {
  const [activeTab, setActiveTab] = useState('current-api')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API 文档</h1>
          <p className="text-gray-600">yt-dlpservice 项目的完整API文档和架构说明</p>
        </div>

        {/* 导航标签 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('current-api')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'current-api'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                现有API
              </button>
              <button
                onClick={() => setActiveTab('modules')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'modules'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                关键模块
              </button>
              <button
                onClick={() => setActiveTab('external-api')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'external-api'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                外部API (预留)
              </button>
            </nav>
          </div>
        </div>

        {/* 现有API内容 */}
        {activeTab === 'current-api' && (
          <div className="space-y-8">
            {/* tRPC API概述 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">tRPC API 概述</h2>
              <p className="text-gray-600 mb-4">
                项目使用 tRPC 构建类型安全的API，支持客户端和服务端的端到端类型推导。
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">API 基础路径:</h3>
                <code className="text-sm bg-white px-2 py-1 rounded">
                  /api/trpc/[trpc]
                </code>
              </div>
            </div>

            {/* 任务管理API */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">任务管理 API (task)</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-blue-900">task.create</h3>
                  <p className="text-sm text-gray-600 mb-2">创建新的视频下载任务</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  url: string,          // 视频URL
  downloadType: enum    // 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-medium text-green-900">task.list</h3>
                  <p className="text-sm text-gray-600 mb-2">获取任务列表</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  page?: number,        // 页码 (默认: 1)
  limit?: number,       // 每页数量 (默认: 10)
  status?: string,      // 状态筛选
  platform?: string     // 平台筛选
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="font-medium text-yellow-900">task.process</h3>
                  <p className="text-sm text-gray-600 mb-2">处理指定任务</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  id: string           // 任务ID
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-medium text-red-900">task.delete</h3>
                  <p className="text-sm text-gray-600 mb-2">删除指定任务</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  id: string           // 任务ID
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-medium text-purple-900">task.getVideoInfo</h3>
                  <p className="text-sm text-gray-600 mb-2">获取视频信息预览</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  url: string          // 视频URL
}`}</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* 配置管理API */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">配置管理 API (config)</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-blue-900">config.getAll</h3>
                  <p className="text-sm text-gray-600">获取所有配置项</p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-medium text-green-900">config.get</h3>
                  <p className="text-sm text-gray-600 mb-2">获取单个配置项</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  key: string          // 配置键名
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="font-medium text-yellow-900">config.set</h3>
                  <p className="text-sm text-gray-600 mb-2">设置配置项</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  key: string,         // 配置键名
  value: string        // 配置值
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-medium text-purple-900">config.testDoubaoAPI</h3>
                  <p className="text-sm text-gray-600 mb-2">测试豆包语音API</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  audioBase64: string  // Base64编码的音频数据
}`}</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* 浏览器管理API */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">浏览器管理 API (browser)</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-blue-900">browser.getLoginStatus</h3>
                  <p className="text-sm text-gray-600">获取YouTube登录状态</p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-medium text-green-900">browser.checkChromeInstallation</h3>
                  <p className="text-sm text-gray-600">检查Chrome浏览器安装状态</p>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="font-medium text-yellow-900">browser.installChrome</h3>
                  <p className="text-sm text-gray-600">安装Chrome浏览器 (需要登录权限)</p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-medium text-purple-900">browser.openLoginWindow</h3>
                  <p className="text-sm text-gray-600">打开YouTube登录窗口</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 关键模块内容 */}
        {activeTab === 'modules' && (
          <div className="space-y-8">
            {/* yt-dlp下载器 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">yt-dlp 视频下载器</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  核心模块
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">主要功能:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>支持YouTube、Bilibili等多平台视频下载</li>
                    <li>音频、视频、混合下载模式</li>
                    <li>自动检测yt-dlp安装路径</li>
                    <li>支持Cookie文件进行身份验证</li>
                    <li>FFmpeg音频提取和转换</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">技术特点:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>单例模式设计，全局唯一实例</li>
                    <li>支持直接可执行文件和Python模块两种调用方式</li>
                    <li>自动路径检测：系统PATH、用户目录、包管理器路径</li>
                    <li>配置管理集成，支持动态配置</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">文件位置:</h3>
                  <code className="text-sm">src/lib/services/video-downloader.ts</code>
                </div>
              </div>
            </div>

            {/* 豆包语音服务 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">豆包语音转录服务</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  AI集成
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">主要功能:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>音频文件转文字转录</li>
                    <li>支持多种音频格式 (MP3, WAV, M4A等)</li>
                    <li>异步任务处理，支持长音频</li>
                    <li>智能标点和语音识别优化</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">API特点:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>字节跳动豆包大模型语音识别</li>
                    <li>X-Api-App-Key / X-Api-Access-Key 认证</li>
                    <li>Base64音频数据传输</li>
                    <li>状态轮询机制，实时获取处理进度</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">文件位置:</h3>
                  <code className="text-sm">src/lib/services/doubao-voice.ts</code>
                </div>
              </div>
            </div>

            {/* 任务处理器 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">任务处理器</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  工作流引擎
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">工作流程:</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                    <li>接收任务请求，验证URL有效性</li>
                    <li>根据下载类型调用video-downloader</li>
                    <li>下载完成后提取音频文件</li>
                    <li>调用语音服务进行转录</li>
                    <li>更新任务状态和结果</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">错误处理:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>分层错误捕获和日志记录</li>
                    <li>任务状态自动回滚</li>
                    <li>详细错误信息存储</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">文件位置:</h3>
                  <code className="text-sm">src/lib/services/task-processor.ts</code>
                </div>
              </div>
            </div>

            {/* 浏览器管理器 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">浏览器管理器</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  身份验证
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">主要功能:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>独立Chrome实例管理</li>
                    <li>YouTube登录状态检测</li>
                    <li>Cookie自动保存和加载</li>
                    <li>Puppeteer自动化操作</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">技术实现:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>puppeteer-core + Chrome二进制</li>
                    <li>独立用户数据目录</li>
                    <li>会话状态持久化</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">文件位置:</h3>
                  <code className="text-sm">src/lib/services/browser-manager.ts</code>
                </div>
              </div>
            </div>

            {/* 配置管理器 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">配置管理器</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  系统配置
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">配置层级:</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                    <li>环境变量 (.env, .env.local)</li>
                    <li>数据库配置 (SQLite)</li>
                    <li>默认配置值</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">支持配置项:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>豆包API密钥和端点</li>
                    <li>语音服务提供商选择</li>
                    <li>下载目录配置</li>
                    <li>Puppeteer浏览器路径</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">文件位置:</h3>
                  <code className="text-sm">src/lib/utils/config.ts</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 外部API内容 */}
        {activeTab === 'external-api' && (
          <div className="space-y-8">
            {/* REST API 预留 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">REST API (计划中)</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  开发中
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="border border-dashed border-gray-300 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">计划接口:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="bg-blue-50 p-2 rounded">
                      <strong>POST /api/v1/tasks</strong> - 创建下载任务
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <strong>GET /api/v1/tasks</strong> - 获取任务列表
                    </div>
                    <div className="bg-yellow-50 p-2 rounded">
                      <strong>GET /api/v1/tasks/:id</strong> - 获取任务详情
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <strong>GET /api/v1/tasks/:id/transcription</strong> - 获取转录文本
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">认证方式:</h3>
                  <p className="text-sm text-gray-600">计划支持 API Key 和 JWT Token 两种认证方式</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">实现位置:</h3>
                  <code className="text-sm">src/pages/api/v1/ (待创建)</code>
                </div>
              </div>
            </div>

            {/* WebSocket API 预留 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">WebSocket API (计划中)</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  开发中
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="border border-dashed border-gray-300 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">实时功能:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>任务进度实时推送</li>
                    <li>下载状态变更通知</li>
                    <li>转录进度实时更新</li>
                    <li>系统状态监控</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">连接端点:</h3>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    ws://localhost:3000/api/ws
                  </code>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">实现位置:</h3>
                  <code className="text-sm">src/pages/api/ws.ts (待创建)</code>
                </div>
              </div>
            </div>

            {/* 第三方集成 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">第三方服务集成 (计划中)</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  扩展功能
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="border border-dashed border-gray-300 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">计划集成:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded">
                      <strong>阿里云OSS</strong>
                      <p className="text-gray-600 mt-1">文件存储和CDN加速</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <strong>通义听悟</strong>
                      <p className="text-gray-600 mt-1">备用语音转录服务</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <strong>Redis</strong>
                      <p className="text-gray-600 mt-1">任务队列和缓存</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <strong>Prometheus</strong>
                      <p className="text-gray-600 mt-1">监控和指标收集</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API开发指南 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">API 开发指南</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">添加新的 tRPC 路由:</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                    <li>在 <code>src/server/api/routers/</code> 创建新路由文件</li>
                    <li>在 <code>src/server/api/root.ts</code> 中注册路由</li>
                    <li>更新前端类型定义</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-medium mb-2">添加 REST API:</h3>
                  <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                    <li>在 <code>src/pages/api/</code> 创建API端点</li>
                    <li>实现请求验证和错误处理</li>
                    <li>添加API文档和测试</li>
                  </ol>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">开发建议:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>优先使用 tRPC 进行内部API开发</li>
                    <li>外部API使用标准 REST 风格</li>
                    <li>所有API都应该有完整的错误处理</li>
                    <li>使用 Zod 进行输入验证</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 