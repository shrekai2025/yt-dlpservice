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
              <button
                onClick={() => setActiveTab('download-strategy')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'download-strategy'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                下载策略
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
                  <code className="text-sm">src/lib/services/content-downloader.ts</code>
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
                    <li>根据下载类型调用content-downloader，使用平台插件化架构</li>
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
            {/* REST API 认证说明 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">REST API 认证</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  已实现
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">认证方式</h3>
                  <p className="text-sm text-gray-600 mb-3">外部 REST API 使用 API Key 进行认证，支持两种传递方式：</p>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">方式 1: X-API-Key 请求头</h4>
                      <div className="bg-gray-900 text-gray-100 p-3 rounded-md text-sm font-mono mt-2">
                        curl -H "X-API-Key: textget-api-key-demo" \<br/>
                        &nbsp;&nbsp;http://your-domain.com/api/external/tasks
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">方式 2: Authorization Bearer</h4>
                      <div className="bg-gray-900 text-gray-100 p-3 rounded-md text-sm font-mono mt-2">
                        curl -H "Authorization: Bearer textget-api-key-demo" \<br/>
                        &nbsp;&nbsp;http://your-domain.com/api/external/tasks
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">环境变量配置</h3>
                  <p className="text-sm text-gray-600 mb-2">在 .env 文件中添加：</p>
                  <code className="text-sm bg-white p-2 rounded border block">TEXTGET_API_KEY=textget-api-key-demo</code>
                </div>
              </div>
            </div>

            {/* API 接口文档 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">API 接口</h2>
              
              <div className="space-y-6">
                {/* 创建任务 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">POST</span>
                    <code className="font-mono text-sm">/api/external/tasks</code>
                    <span className="text-gray-600 text-sm">创建下载任务</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">请求体</h4>
                      <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto"><code>{`{
  "url": "https://www.youtube.com/watch?v=example",
  "downloadType": "AUDIO_ONLY"  // AUDIO_ONLY | VIDEO_ONLY | BOTH
}`}</code></pre>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">响应示例</h4>
                      <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto"><code>{`{
  "success": true,
  "data": {
    "id": "clxxxxx",
    "url": "https://www.youtube.com/watch?v=example",
    "platform": "youtube",
    "downloadType": "AUDIO_ONLY",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "任务创建成功，下载类型：仅音频"
}`}</code></pre>
                    </div>
                  </div>
                </div>

                {/* 获取任务列表 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">GET</span>
                    <code className="font-mono text-sm">/api/external/tasks</code>
                    <span className="text-gray-600 text-sm">获取任务列表</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">查询参数</h4>
                      <div className="space-y-1 text-sm">
                                                    <div><code>status</code> - 任务状态过滤 (PENDING, EXTRACTING, TRANSCRIBING, COMPLETED, FAILED)</div>
                        <div><code>platform</code> - 平台过滤 (youtube, bilibili)</div>
                        <div><code>limit</code> - 每页数量 (1-100, 默认20)</div>
                        <div><code>offset</code> - 偏移量 (默认0)</div>
                        <div><code>orderBy</code> - 排序字段 (createdAt, updatedAt)</div>
                        <div><code>orderDirection</code> - 排序方向 (asc, desc)</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">响应示例</h4>
                      <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto"><code>{`{
  "success": true,
  "data": [
    {
      "id": "clxxxxx",
      "url": "https://www.youtube.com/watch?v=example",
      "platform": "youtube",
      "title": "视频标题",
      "status": "COMPLETED",
      "downloadType": "AUDIO_ONLY",
      "transcription": "转录文本内容...",
      "duration": 300,
      "fileSize": 5242880,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:01:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}`}</code></pre>
                    </div>
                  </div>
                </div>

                {/* 获取任务详情 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">GET</span>
                    <code className="font-mono text-sm">/api/external/tasks/:id</code>
                    <span className="text-gray-600 text-sm">获取任务详情</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">响应示例</h4>
                      <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto"><code>{`{
  "success": true,
  "data": {
    "id": "clxxxxx",
    "url": "https://www.youtube.com/watch?v=example",
    "platform": "youtube",
    "title": "视频标题",
    "status": "COMPLETED",
    "downloadType": "AUDIO_ONLY",
    "videoPath": "/path/to/video.mp4",
    "audioPath": "/path/to/audio.mp3",
    "transcription": "完整的转录文本内容...",
    "tingwuTaskId": "tingwu_task_123",
    "duration": 300,
    "fileSize": 5242880,
    "retryCount": 0,
    "errorMessage": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:01:00.000Z"
  }
}`}</code></pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 错误响应 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">错误响应</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">认证失败 (401)</h3>
                  <pre className="bg-red-50 p-3 rounded text-sm"><code>{`{
  "success": false,
  "error": "Invalid API key",
  "message": "Authentication failed"
}`}</code></pre>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">请求参数错误 (400)</h3>
                  <pre className="bg-yellow-50 p-3 rounded text-sm"><code>{`{
  "success": false,
  "error": "Invalid request data",
  "details": [
    {
      "code": "invalid_url",
      "message": "请提供有效的视频URL"
    }
  ]
}`}</code></pre>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">资源不存在 (404)</h3>
                  <pre className="bg-gray-50 p-3 rounded text-sm"><code>{`{
  "success": false,
  "error": "Task not found",
  "message": "任务不存在"
}`}</code></pre>
                </div>
              </div>
            </div>

            {/* 完整请求示例 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">完整请求示例</h2>
              
              <div className="space-y-6">
                {/* cURL 示例 */}
                <div>
                  <h3 className="font-medium mb-3">cURL 命令示例</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">创建任务</h4>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto"><code>{`# 创建音频下载任务
curl -X POST http://localhost:3000/api/external/tasks \\
  -H "X-API-Key: textget-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "downloadType": "AUDIO_ONLY"
  }'

# 创建视频+音频任务
curl -X POST http://localhost:3000/api/external/tasks \\
  -H "Authorization: Bearer textget-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.bilibili.com/video/BV1xx411c7mu",
    "downloadType": "BOTH"
  }'`}</code></pre>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">查询任务</h4>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto"><code>{`# 获取所有任务
curl -H "X-API-Key: textget-api-key-demo" \\
  http://localhost:3000/api/external/tasks

# 获取已完成的任务（分页）
curl -H "X-API-Key: textget-api-key-demo" \\
  "http://localhost:3000/api/external/tasks?status=COMPLETED&limit=10&offset=0"

# 获取特定任务详情
curl -H "X-API-Key: textget-api-key-demo" \\
  http://localhost:3000/api/external/tasks/clxxxxx`}</code></pre>
                    </div>
                  </div>
                </div>

                {/* JavaScript/Node.js 示例 */}
                <div>
                  <h3 className="font-medium mb-3">JavaScript/Node.js 示例</h3>
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto"><code>{`// 使用 fetch API
const API_BASE = 'http://localhost:3000/api/external';
const API_KEY = 'textget-api-key-demo';

// 创建任务
async function createTask(url, downloadType = 'AUDIO_ONLY') {
  const response = await fetch(\`\${API_BASE}/tasks\`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url, downloadType })
  });
  
  return await response.json();
}

// 获取任务列表
async function getTasks(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(\`\${API_BASE}/tasks?\${query}\`, {
    headers: { 'X-API-Key': API_KEY }
  });
  
  return await response.json();
}

// 获取任务详情
async function getTask(taskId) {
  const response = await fetch(\`\${API_BASE}/tasks/\${taskId}\`, {
    headers: { 'X-API-Key': API_KEY }
  });
  
  return await response.json();
}

// 使用示例
(async () => {
  // 创建任务
  const task = await createTask('https://www.youtube.com/watch?v=example');
  console.log('Task created:', task);
  
  // 轮询任务状态
  const taskId = task.data.id;
  let status = 'PENDING';
  
  while (status !== 'COMPLETED' && status !== 'FAILED') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒
    const result = await getTask(taskId);
    status = result.data.status;
    console.log('Task status:', status);
  }
  
  if (status === 'COMPLETED') {
    console.log('Transcription:', result.data.transcription);
  }
})();`}</code></pre>
                </div>

                {/* Python 示例 */}
                <div>
                  <h3 className="font-medium mb-3">Python 示例</h3>
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto"><code>{`import requests
import time
import json

API_BASE = 'http://localhost:3000/api/external'
API_KEY = 'textget-api-key-demo'

class TextGetAPI:
    def __init__(self, api_key, base_url=API_BASE):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_task(self, url, download_type='AUDIO_ONLY'):
        """创建下载任务"""
        data = {
            'url': url,
            'downloadType': download_type
        }
        response = requests.post(
            f'{self.base_url}/tasks',
            headers=self.headers,
            json=data
        )
        return response.json()
    
    def get_tasks(self, **params):
        """获取任务列表"""
        response = requests.get(
            f'{self.base_url}/tasks',
            headers={'X-API-Key': self.api_key},
            params=params
        )
        return response.json()
    
    def get_task(self, task_id):
        """获取任务详情"""
        response = requests.get(
            f'{self.base_url}/tasks/{task_id}',
            headers={'X-API-Key': self.api_key}
        )
        return response.json()
    
    def wait_for_completion(self, task_id, timeout=300):
        """等待任务完成"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            result = self.get_task(task_id)
            
            if not result['success']:
                raise Exception(f"获取任务失败: {result['error']}")
            
            status = result['data']['status']
            print(f"任务状态: {status}")
            
            if status == 'COMPLETED':
                return result['data']
            elif status == 'FAILED':
                raise Exception(f"任务失败: {result['data'].get('errorMessage')}")
            
            time.sleep(5)  # 等待5秒后重试
        
        raise TimeoutError("任务超时")

# 使用示例
if __name__ == "__main__":
    api = TextGetAPI(API_KEY)
    
    # 创建任务
    result = api.create_task('https://www.youtube.com/watch?v=example')
    task_id = result['data']['id']
    print(f"任务创建成功: {task_id}")
    
    # 等待完成
    try:
        task_data = api.wait_for_completion(task_id)
        print(f"转录结果: {task_data['transcription']}")
    except Exception as e:
        print(f"任务处理失败: {e}")`}</code></pre>
                </div>
              </div>
            </div>

            {/* 状态码参考 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">HTTP 状态码参考</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">状态码</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">含义</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b">描述</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono text-green-600 border-b">200</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border-b">成功</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-b">请求成功处理</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono text-yellow-600 border-b">400</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border-b">请求错误</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-b">请求参数无效或格式错误</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono text-red-600 border-b">401</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border-b">认证失败</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-b">API Key 无效或缺失</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono text-orange-600 border-b">404</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border-b">资源不存在</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-b">请求的任务或资源不存在</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm font-mono text-red-600 border-b">500</td>
                      <td className="px-4 py-2 text-sm text-gray-900 border-b">服务器错误</td>
                      <td className="px-4 py-2 text-sm text-gray-600 border-b">服务器内部错误</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 任务状态说明 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">任务状态说明</h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">PENDING</span>
                  <span className="text-sm text-gray-600">等待处理 - 任务已创建，等待系统处理</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-mono">EXTRACTING</span>
                  <span className="text-sm text-gray-600">提取中 - 正在下载并提取音频文件</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm font-mono">TRANSCRIBING</span>
                  <span className="text-sm text-gray-600">转录中 - 语音识别服务正在处理</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-mono">COMPLETED</span>
                  <span className="text-sm text-gray-600">已完成 - 转录完成，可获取文本结果</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-mono">FAILED</span>
                  <span className="text-sm text-gray-600">失败 - 处理过程中出现错误</span>
                </div>
              </div>
            </div>

            {/* 最佳实践 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">最佳实践</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">🔄 任务状态轮询</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>创建任务后，使用轮询方式检查任务状态</li>
                    <li>建议轮询间隔：5-10秒</li>
                    <li>设置合理的超时时间（建议5-10分钟）</li>
                    <li>处理 FAILED 状态，检查 errorMessage 字段</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">🛡️ 错误处理</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>始终检查响应中的 success 字段</li>
                    <li>妥善处理网络错误和超时</li>
                    <li>对于 401 错误，检查 API Key 配置</li>
                    <li>对于 400 错误，检查请求参数格式</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">⚡ 性能优化</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>使用分页获取大量任务数据</li>
                    <li>合理设置 limit 参数（建议 10-50）</li>
                    <li>缓存不变的任务数据（已完成的任务）</li>
                    <li>避免频繁请求同一任务详情</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">🔐 安全建议</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>妥善保管 API Key，避免在客户端暴露</li>
                    <li>使用 HTTPS 进行生产环境通信</li>
                    <li>定期轮换 API Key</li>
                    <li>实施请求日志监控</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 测试工具推荐 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">测试工具推荐</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2">🌐 Postman</h3>
                  <p className="text-sm text-gray-600 mb-2">图形化 API 测试工具</p>
                  <a href="https://www.postman.com/" target="_blank" className="text-blue-600 text-sm hover:underline">
                    下载 Postman →
                  </a>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2">⚡ Insomnia</h3>
                  <p className="text-sm text-gray-600 mb-2">轻量级 REST 客户端</p>
                  <a href="https://insomnia.rest/" target="_blank" className="text-blue-600 text-sm hover:underline">
                    下载 Insomnia →
                  </a>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2">💻 cURL</h3>
                  <p className="text-sm text-gray-600 mb-2">命令行 HTTP 客户端</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">curl --version</code>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2">🔧 HTTPie</h3>
                  <p className="text-sm text-gray-600 mb-2">用户友好的命令行工具</p>
                  <a href="https://httpie.io/" target="_blank" className="text-blue-600 text-sm hover:underline">
                    了解 HTTPie →
                  </a>
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

        {/* 下载策略内容 */}
        {activeTab === 'download-strategy' && (
          <div className="space-y-8">
            {/* 概述 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">🎯 下载策略概述</h2>
              <p className="text-gray-600 mb-4">
                本系统基于 <code className="bg-gray-100 px-1 rounded">yt-dlp</code> 实现智能下载策略，支持多平台视频/音频获取，
                采用分层降级机制确保最大兼容性和成功率。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">🎵 音频优先</h3>
                  <p className="text-sm text-blue-700">智能选择最佳音频格式，确保高质量转录</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">🌐 多平台支持</h3>
                  <p className="text-sm text-green-700">针对B站、YouTube等平台优化</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-900 mb-2">⚡ 自动降级</h3>
                  <p className="text-sm text-purple-700">格式不可用时自动切换备选方案</p>
                </div>
              </div>
            </div>

            {/* 格式选择策略 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">📊 格式选择策略</h2>
              
              <div className="space-y-6">
                {/* 通用策略 */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-blue-900 mb-2">🌍 通用平台策略</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2"><strong>格式选择:</strong> <code>bestaudio/best</code></p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>bestaudio</strong>: 优先选择最佳音频流（无视频，文件更小）</li>
                      <li>• <strong>best</strong>: 如无独立音频流，选择最佳质量视频（后续提取音频）</li>
                    </ul>
                  </div>
                </div>

                {/* B站特殊策略 */}
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-medium text-red-900 mb-2">📺 B站专用策略</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2"><strong>格式选择:</strong> <code>bestaudio/best</code></p>
                    <p className="text-sm text-gray-600 mb-2"><strong>特殊优化:</strong></p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>请求头伪装</strong>: 添加真实浏览器User-Agent和Referer</li>
                      <li>• <strong>API优先</strong>: 使用 <code>video_info_prefer_api_over_html=true</code></li>
                      <li>• <strong>URL标准化</strong>: 短链接自动解析为标准桌面端URL</li>
                      <li>• <strong>Cookie支持</strong>: 自动获取浏览器Cookie（可选）</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* yt-dlp 参数详解 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">⚙️ yt-dlp 参数配置</h2>
              
              <div className="space-y-6">
                {/* 音频下载参数 */}
                <div>
                  <h3 className="font-medium mb-3">🎵 音频下载命令</h3>
                  <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="mb-2">
                      <span className="text-yellow-400"># 基础命令结构</span>
                    </div>
                    <div>
                      yt-dlp --no-warnings -f "bestaudio/best" \<br/>
                      &nbsp;&nbsp;--extract-audio --audio-format mp3 --audio-quality 5 \<br/>
                      &nbsp;&nbsp;-o "temp/[taskId]/%(id)s_audio.mp3" \<br/>
                      &nbsp;&nbsp;--no-check-certificate \<br/>
                      &nbsp;&nbsp;--postprocessor-args "ffmpeg:-ar 16000 -ac 1 -b:a 32k" \<br/>
                      &nbsp;&nbsp;[URL]
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="text-sm">
                      <strong className="text-blue-600">参数说明:</strong>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• <code>--no-warnings</code>: 隐藏警告信息，简化输出</li>
                      <li>• <code>-f "bestaudio/best"</code>: 格式选择策略</li>
                      <li>• <code>--extract-audio</code>: 从视频中提取音频</li>
                      <li>• <code>--audio-format mp3</code>: 强制输出MP3格式</li>
                      <li>• <code>--audio-quality 5</code>: 音频质量等级（0-9，5为平衡点）</li>
                      <li>• <code>--postprocessor-args</code>: FFmpeg后处理参数</li>
                      <li>&nbsp;&nbsp;• <code>-ar 16000</code>: 采样率16kHz（豆包API标准）</li>
                      <li>&nbsp;&nbsp;• <code>-ac 1</code>: 单声道（减小文件大小）</li>
                      <li>&nbsp;&nbsp;• <code>-b:a 32k</code>: 音频比特率32kbps</li>
                    </ul>
                  </div>
                </div>

                {/* B站特殊参数 */}
                <div>
                  <h3 className="font-medium mb-3">📺 B站专用参数</h3>
                  <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <div className="mb-2">
                      <span className="text-yellow-400"># B站附加参数</span>
                    </div>
                    <div>
                      --add-header "User-Agent: Mozilla/5.0..." \<br/>
                      --add-header "Referer: https://www.bilibili.com/" \<br/>
                      --extractor-args "bilibili:video_info_prefer_api_over_html=true" \<br/>
                      --cookies "browser_cookies.txt"  <span className="text-gray-500"># 可选</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 文件路径和命名规则 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">📁 文件路径与命名</h2>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2">🗂️ 目录结构</h3>
                  <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                    temp/<br/>
                    ├── [taskId]/<br/>
                    │&nbsp;&nbsp;&nbsp;├── [videoId]_audio.mp3<br/>
                    │&nbsp;&nbsp;&nbsp;└── [videoId]_video.mp4<br/>
                    └── cleanup_logs/
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2">📝 命名规则</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>音频文件</strong>: <code>[videoId]_audio.mp3</code></li>
                    <li>• <strong>视频文件</strong>: <code>[videoId]_video.mp4</code></li>
                    <li>• <strong>任务目录</strong>: <code>cmd[随机字符串]</code></li>
                    <li>• <strong>清理策略</strong>: 任务完成后自动清理，支持手动清理</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 错误处理和故障排除 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">🚨 错误处理与排障</h2>
              
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-900 mb-2">❌ 常见错误类型</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• <code>Requested format is not available</code> - 格式不可用</li>
                    <li>• <code>Failed to parse JSON</code> - 网页解析失败（反爬虫）</li>
                    <li>• <code>HTTP Error 403</code> - 访问被拒绝</li>
                    <li>• <code>timeout of Xms exceeded</code> - 网络超时</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-2">🔧 排障命令</h3>
                  <div className="font-mono text-sm bg-yellow-100 p-2 rounded">
                    yt-dlp --list-formats "[URL]"
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">查看视频可用格式列表，用于诊断格式问题</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">💡 优化建议</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 优先使用桌面端URL，避免移动端和短链接</li>
                    <li>• 网络较慢时，系统会自动调整超时时间</li>
                    <li>• B站视频建议登录后获取Cookie以提高成功率</li>
                    <li>• 大文件处理时系统会分块处理避免内存占用过高</li>
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