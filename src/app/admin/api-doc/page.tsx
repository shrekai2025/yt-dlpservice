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
  url: string,                    // 视频URL
  downloadType: enum,             // 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'BOTH'
  compressionPreset?: enum,       // 'none' | 'light' | 'standard' | 'heavy' (可选)
  sttProvider?: enum              // 'google' | 'doubao' | 'doubao-small' | 'tingwu' (可选)
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
  audioData: string,   // Base64编码的音频数据
  fileName: string     // 文件名（用于日志/提示）
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-medium text-orange-900">config.testDoubaoSmallAPI</h3>
                  <p className="text-sm text-gray-600 mb-2">测试豆包录音文件识别（小模型版）API</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  audioData: string,   // Base64编码的音频数据
  fileName: string     // 文件名（用于日志/提示）
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-cyan-500 pl-4">
                  <h3 className="font-medium text-cyan-900">config.diagnoseDoubaoSmallAPI</h3>
                  <p className="text-sm text-gray-600 mb-2">诊断豆包小模型API服务状态</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>返回示例:</strong>
                    <pre className="mt-1">{`{
  success: true,
  data: {
    available: boolean,
    message: string,
    provider: "doubao-small"
  }
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-teal-500 pl-4">
                  <h3 className="font-medium text-teal-900">config.testVoiceService</h3>
                  <p className="text-sm text-gray-600 mb-2">测试语音服务（支持多提供商）</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>输入参数:</strong>
                    <pre className="mt-1">{`{
  provider?: "doubao" | "doubao-small" | "tingwu" | "google"  // 可选，默认: "doubao"
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-indigo-500 pl-4">
                  <h3 className="font-medium text-indigo-900">config.getAllVoiceServiceStatus</h3>
                  <p className="text-sm text-gray-600 mb-2">获取所有语音服务状态</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>返回示例:</strong>
                    <pre className="mt-1">{`{
  success: true,
  data: [
    {
      provider: "doubao",
      name: "豆包语音服务",
      available: boolean,
      message: string
    },
    {
      provider: "doubao-small",
      name: "豆包录音文件识别（小模型版）",
      available: boolean,
      message: string
    },
    // ... 其他服务
  ]
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

            {/* 清理管理API */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">清理管理 API (cleanup)</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-blue-900">cleanup.status</h3>
                  <p className="text-sm text-gray-600 mb-2">获取自动清理服务状态</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>返回示例:</strong>
                    <pre className="mt-1">{`{
  success: true,
  data: {
    autoCleanupEnabled: boolean,
    isRunning: boolean
  }
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-medium text-green-900">cleanup.manual</h3>
                  <p className="text-sm text-gray-600 mb-2">立即执行一次清理（需要登录）</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>返回示例:</strong>
                    <pre className="mt-1">{`{
  success: true,
  message: string,
  data: {
    tempFiles: number,
    completedTasks: number,
    totalSizeCleared: number,
    formattedSize: string
  }
}`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="font-medium text-yellow-900">cleanup.startAuto</h3>
                  <p className="text-sm text-gray-600 mb-2">启动自动清理服务（需要登录）</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>返回示例:</strong>
                    <pre className="mt-1">{`{ success: true, message: "自动清理服务已启动" }`}</pre>
                  </div>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-medium text-red-900">cleanup.stopAuto</h3>
                  <p className="text-sm text-gray-600 mb-2">停止自动清理服务（需要登录）</p>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>返回示例:</strong>
                    <pre className="mt-1">{`{ success: true, message: "自动清理服务已停止" }`}</pre>
                  </div>
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

            {/* 语音转录服务 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">语音转录服务</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  AI集成
                </span>
              </div>
              
              <div className="space-y-6">
                {/* Google Speech-to-Text */}
                <div className="border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2 text-blue-700">Google Speech-to-Text</h3>
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-medium mb-1">主要功能:</h4>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-2">
                        <li>智能同步/异步识别（3分钟自动切换）</li>
                        <li>支持中英日等多语言自动检测</li>
                        <li>JWT认证，企业级安全</li>
                        <li>自动标点符号和格式优化</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">认证方式:</h4>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-2">
                        <li>Google Cloud服务账户密钥</li>
                        <li>OAuth 2.0 JWT Bearer认证</li>
                        <li>Base64音频内容直传（&lt;10MB）</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 豆包语音 */}
                <div className="border border-purple-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2 text-purple-700">豆包语音识别</h3>
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-medium mb-1">主要功能:</h4>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-2">
                        <li>字节跳动豆包大模型语音识别</li>
                        <li>异步任务处理，支持长音频</li>
                        <li>智能标点和语音识别优化</li>
                        <li>16kHz单声道音频优化</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">认证方式:</h4>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-2">
                        <li>X-Api-App-Key / X-Api-Access-Key 认证</li>
                        <li>Base64音频数据传输</li>
                        <li>状态轮询机制，实时获取处理进度</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 豆包小模型语音 */}
                <div className="border border-orange-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2 text-orange-700">豆包录音文件识别（小模型版）</h3>
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-medium mb-1">主要功能:</h4>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-2">
                        <li>字节跳动豆包小模型录音文件识别</li>
                        <li>异步任务处理，支持长音频（&lt;5小时）</li>
                        <li>火山引擎TOS对象存储集成</li>
                        <li>支持多种音频格式（MP3, WAV, OGG, MP4）</li>
                        <li>智能标点和数字归一化</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">认证方式:</h4>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-2">
                        <li>Token认证: Bearer; {'<token>'}</li>
                        <li>音频通过TOS对象存储上传</li>
                        <li>预签名URL访问（2小时有效期）</li>
                        <li>任务提交和查询分离机制</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">技术特点:</h4>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-2">
                        <li>使用官方TOS SDK (@volcengine/tos-sdk)</li>
                        <li>自动文件清理和错误恢复</li>
                        <li>支持音频文件大小&lt;512MB</li>
                        <li>轮询策略参考豆包API设定</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">通用特性:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>支持多种音频格式 (MP3, WAV, M4A等)</li>
                    <li>自动音频格式转换和优化</li>
                    <li>错误重试和超时处理机制</li>
                    <li>统一的服务状态检查和诊断</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">文件位置:</h3>
                  <div className="space-y-1">
                    <div><code className="text-sm">src/lib/services/google-stt.ts</code></div>
                    <div><code className="text-sm">src/lib/services/doubao-voice.ts</code></div>
                    <div><code className="text-sm">src/lib/services/doubao-small-stt.ts</code></div>
                    <div><code className="text-sm">src/lib/services/task-processor.ts</code></div>
                  </div>
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

            {/* 音频压缩器 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">音频压缩器</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  文件处理
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">主要功能:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>智能音频压缩，支持多种预设</li>
                    <li>FFmpeg集成，高质量音频编码</li>
                    <li>自动文件大小检测和跳过逻辑</li>
                    <li>压缩后文件完整性验证</li>
                    <li>豆包API格式优化（16kHz, 单声道）</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">压缩策略:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>轻度压缩：128k比特率，保持较高质量</li>
                    <li>标准压缩：64k比特率，平衡质量与大小</li>
                    <li>高度压缩：32k比特率，最大程度减小文件</li>
                    <li>智能跳过：小文件自动跳过压缩</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">文件位置:</h3>
                  <div className="space-y-1 text-sm">
                    <div><code>src/lib/services/audio-compressor.ts</code> - 核心压缩逻辑</div>
                    <div><code>src/lib/services/compression-presets.ts</code> - 压缩预设配置</div>
                    <div><code>src/lib/services/audio-utils.ts</code> - 音频工具函数</div>
                  </div>
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
  "downloadType": "AUDIO_ONLY",  // AUDIO_ONLY | VIDEO_ONLY | BOTH
  "compressionPreset": "standard",  // none | light | standard | heavy (可选)
  "sttProvider": "doubao-small"  // google | doubao | doubao-small | tingwu (可选)
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
    "compressionPreset": "standard",
    "sttProvider": "doubao-small",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "任务创建成功，下载类型：仅音频，压缩设置：标准压缩"
}`}</code></pre>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">参数说明</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>url</strong> (必需): 视频链接，支持YouTube、Bilibili、小宇宙、Apple Podcasts等平台</div>
                      <div><strong>downloadType</strong> (可选): 下载类型
                        <ul className="ml-4 mt-1 list-disc text-xs text-gray-600">
                          <li><code>AUDIO_ONLY</code> - 仅下载音频（默认）</li>
                          <li><code>VIDEO_ONLY</code> - 仅下载视频</li>
                          <li><code>BOTH</code> - 同时下载视频和音频</li>
                        </ul>
                      </div>
                      <div><strong>compressionPreset</strong> (可选): 音频压缩设置
                        <ul className="ml-4 mt-1 list-disc text-xs text-gray-600">
                          <li><code>none</code> - 无压缩（默认）</li>
                          <li><code>light</code> - 轻度压缩，减少30-50%文件大小</li>
                          <li><code>standard</code> - 标准压缩，减少50-70%文件大小</li>
                          <li><code>heavy</code> - 高度压缩，减少70-85%文件大小</li>
                        </ul>
                      </div>
                      <div><strong>sttProvider</strong> (可选): 语音识别服务提供商
                        <ul className="ml-4 mt-1 list-disc text-xs text-gray-600">
                          <li><code>google</code> - Google Speech-to-Text（高精度，支持多语言）</li>
                          <li><code>doubao</code> - 豆包语音API（实时版）</li>
                          <li><code>doubao-small</code> - 豆包录音识别API（小模型版）</li>
                          <li><code>tingwu</code> - 通义听悟API</li>
                          <li>留空则使用系统默认配置</li>
                        </ul>
                      </div>
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
                        <div><code>platform</code> - 平台过滤 (youtube, bilibili, xiaoyuzhou, applepodcasts)</div>
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
      "compressionPreset": "standard",
      "originalFileSize": 84840000,
      "compressedFileSize": 25452000,
      "compressionRatio": 0.30,
      "transcription": "转录文本内容...",
      "duration": 300,
      "fileSize": 25452000,
      "extraMetadata": {
        "title": "视频标题",
        "author": "作者名称",
        "authorAvatar": "https://example.com/avatar.jpg",
        "duration": 300,
        "publishDate": "2024-01-01",
        "description": "视频描述内容...",
        "platformData": {
          "viewCount": 50000,
          "likeCount": 1200
        },
        "comments": [
          {
            "author": "观众A",
            "content": "很棒的视频！",
            "replies": [
              {
                "author": "作者",
                "content": "谢谢支持！"
              }
            ]
          }
        ]
      },
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
    "compressionPreset": "standard",
    "originalFileSize": 84840000,
    "compressedFileSize": 25452000,
    "compressionRatio": 0.30,
    "compressionDuration": 8500,
    "videoPath": "/path/to/video.mp4",
    "audioPath": "/path/to/audio_compressed.mp3",
    "transcription": "完整的转录文本内容...",
    "tingwuTaskId": "tingwu_task_123",
    "duration": 300,
    "fileSize": 25452000,
    "retryCount": 0,
    "errorMessage": null,
    "extraMetadata": {
      "title": "视频标题",
      "author": "作者名称",
      "authorAvatar": "https://example.com/avatar.jpg",
      "duration": 300,
      "publishDate": "2024-01-01",
      "description": "视频描述内容...",
      "platformData": {
        "viewCount": 50000,
        "likeCount": 1200
      },
      "comments": [
        {
          "author": "观众A",
          "content": "很棒的视频！",
          "replies": [
            {
              "author": "作者",
              "content": "谢谢支持！"
            }
          ]
        }
      ]
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:01:00.000Z"
  }
}`}</code></pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 元数据增强功能 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">🕷️ 元数据增强功能</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  智能爬取
                </span>
              </div>
              
              <div className="space-y-6">
                {/* 功能概述 */}
                <div>
                  <h3 className="font-medium mb-3">功能概述</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    系统会自动为每个任务爬取平台特定的元数据信息，包括播放量、点赞数、评论等。
                    优先使用yt-dlp获取基础信息，然后通过Puppeteer爬取额外数据。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-red-900">Bilibili</h4>
                      <p className="text-xs text-red-700 mt-1">播放量、点赞、硬币、转发、收藏、评论</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-green-900">YouTube</h4>
                      <p className="text-xs text-green-700 mt-1">播放量、点赞数、评论</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-purple-900">小宇宙</h4>
                      <p className="text-xs text-purple-700 mt-1">播放量、评论数、评论</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900">Apple播客</h4>
                      <p className="text-xs text-blue-700 mt-1">评分、评分数量、评论数、分类信息</p>
                    </div>
                  </div>
                </div>

                {/* extraMetadata字段结构 */}
                <div>
                  <h3 className="font-medium mb-3">extraMetadata 字段结构</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto"><code>{`{
  "extraMetadata": {
    // 公共字段（所有平台）
    "title": "内容标题",
    "author": "作者名称", 
    "authorAvatar": "作者头像URL",
    "duration": 1800,
    "publishDate": "2024-01-01",
    "description": "内容描述",
    "progress": "73%", // Google STT转录进度，如"73%"，无进度时为空
    
    // 平台特定数据
    "platformData": {
      // Bilibili示例
      "playCount": 10000,
      "likeCount": 500,
      "coinCount": 100,
      "shareCount": 50,
      "favoriteCount": 200,
      "commentCount": 80
    },
    
    // 评论数据（一级评论 + 回复）
    "comments": [
      {
        "author": "评论者",
        "content": "评论内容", 
        "replies": [
          {
            "author": "回复者",
            "content": "回复内容"
          }
        ]
      }
    ]
  }
}`}</code></pre>
                  </div>
                </div>

                {/* 获取策略 */}
                <div>
                  <h3 className="font-medium mb-3">数据获取策略</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 shrink-0"></div>
                      <span className="text-sm"><strong>yt-dlp优先:</strong> 优先使用yt-dlp获取准确的核心元数据（如标题、时长、播放量、点赞数），并立即存入数据库。</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></div>
                      <span className="text-sm"><strong>爬虫补充:</strong> 异步使用Puppeteer爬虫补充yt-dlp无法获取的数据（如Bilibili的硬币数、转发数、收藏数以及各平台的评论）。</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 shrink-0"></div>
                      <span className="text-sm"><strong>数据合并:</strong> 将爬虫数据合并到现有数据中，但不覆盖yt-dlp提供的更准确的核心字段。</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 shrink-0"></div>
                      <span className="text-sm"><strong>容错处理:</strong> 爬虫失败不影响任务的 `COMPLETED` 状态。</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 shrink-0"></div>
                      <span className="text-sm"><strong>评论限制:</strong> 一级评论最多100条，总评论数（含回复）最多300条。</span>
                    </div>
                  </div>
                </div>

                {/* 注意事项 */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ 注意事项</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• extraMetadata 可能为 null（爬虫未执行或失败）</li>
                    <li>• 新创建的任务可能暂时没有 extraMetadata 数据</li>
                    <li>• 不同平台的 platformData 结构不同</li>
                    <li>• 爬虫超时时间为120秒</li>
                    <li>• progress 字段仅在使用Google STT转录且为长时间运行任务时才会有值</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 音频压缩功能 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">🗜️ 音频压缩功能</h2>
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  智能压缩
                </span>
              </div>
              
              <div className="space-y-6">
                {/* 功能概述 */}
                <div>
                  <h3 className="font-medium mb-3">功能概述</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    系统提供智能音频压缩功能，解决大音频文件超出豆包API 80MB限制的问题。
                    通过FFmpeg实现高质量压缩，确保转录准确性的同时大幅减小文件大小。
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-green-900">轻度压缩</h4>
                      <p className="text-xs text-green-700 mt-1">128k比特率，减小30-50%</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900">标准压缩</h4>
                      <p className="text-xs text-blue-700 mt-1">64k比特率，减小50-70%</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-orange-900">高度压缩</h4>
                      <p className="text-xs text-orange-700 mt-1">32k比特率，减小70-85%</p>
                    </div>
                  </div>
                </div>

                {/* 压缩参数说明 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-3">压缩预设参数</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">预设</th>
                          <th className="px-3 py-2 text-left font-medium">比特率</th>
                          <th className="px-3 py-2 text-left font-medium">采样率</th>
                          <th className="px-3 py-2 text-left font-medium">声道</th>
                          <th className="px-3 py-2 text-left font-medium">预期压缩率</th>
                          <th className="px-3 py-2 text-left font-medium">适用场景</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-3 py-2 font-mono text-gray-600">none</td>
                          <td className="px-3 py-2">原始</td>
                          <td className="px-3 py-2">原始</td>
                          <td className="px-3 py-2">原始</td>
                          <td className="px-3 py-2">0%</td>
                          <td className="px-3 py-2">小文件，无需压缩</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-green-600">light</td>
                          <td className="px-3 py-2">128k</td>
                          <td className="px-3 py-2">16kHz</td>
                          <td className="px-3 py-2">单声道</td>
                          <td className="px-3 py-2">30-50%</td>
                          <td className="px-3 py-2">保持较高质量</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-blue-600">standard</td>
                          <td className="px-3 py-2">64k</td>
                          <td className="px-3 py-2">16kHz</td>
                          <td className="px-3 py-2">单声道</td>
                          <td className="px-3 py-2">50-70%</td>
                          <td className="px-3 py-2">推荐用于语音转录</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-orange-600">heavy</td>
                          <td className="px-3 py-2">32k</td>
                          <td className="px-3 py-2">16kHz</td>
                          <td className="px-3 py-2">单声道</td>
                          <td className="px-3 py-2">70-85%</td>
                          <td className="px-3 py-2">严重超标的文件</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 使用示例 */}
                <div>
                  <h3 className="font-medium mb-3">使用示例</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">创建带压缩的任务</h4>
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto"><code>{`curl -X POST http://localhost:3000/api/external/tasks \\
  -H "X-API-Key: textget-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.xiaoyuzhoufm.com/episode/example",
    "downloadType": "AUDIO_ONLY",
    "compressionPreset": "standard"
  }'`}</code></pre>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">压缩信息返回示例</h4>
                      <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto"><code>{`{
  "success": true,
  "data": {
    "id": "clxxxxx",
    "status": "COMPLETED",
    "compressionPreset": "standard",
    "originalFileSize": 84840000,      // 原始文件大小 (约81MB)
    "compressedFileSize": 25452000,    // 压缩后大小 (约24MB)
    "compressionRatio": 0.30,          // 压缩比 (30%，减小70%)
    "compressionDuration": 8500,       // 压缩耗时 (毫秒)
    "transcription": "完整转录文本..."
  }
}`}</code></pre>
                    </div>
                  </div>
                </div>

                {/* 压缩策略 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">💡 智能压缩策略</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>自动跳过</strong>：文件小于80MB且压缩预设为"none"时跳过压缩</li>
                    <li>• <strong>格式标准化</strong>：所有压缩输出统一为MP3格式，16kHz采样率</li>
                    <li>• <strong>元数据清理</strong>：移除所有元数据，避免格式兼容性问题</li>
                    <li>• <strong>豆包API优化</strong>：参数完全符合豆包语音识别要求</li>
                    <li>• <strong>错误恢复</strong>：压缩失败时自动使用原文件</li>
                  </ul>
                </div>

                {/* 技术说明 */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium mb-2">🔧 技术实现</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>压缩引擎</strong>：FFmpeg + libmp3lame编码器</p>
                    <p><strong>处理流程</strong>：下载 → 压缩 → 验证 → 替换原文件 → 转录</p>
                    <p><strong>文件验证</strong>：压缩后自动验证音频文件完整性</p>
                    <p><strong>性能优化</strong>：支持大文件处理，内存占用可控</p>
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
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto"><code>{`# 创建音频下载任务（无压缩）
curl -X POST http://localhost:3000/api/external/tasks \\
  -H "X-API-Key: textget-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "downloadType": "AUDIO_ONLY"
  }'

# 创建音频任务（标准压缩，使用豆包小模型STT）
curl -X POST http://localhost:3000/api/external/tasks \\
  -H "X-API-Key: textget-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.xiaoyuzhoufm.com/episode/example",
    "downloadType": "AUDIO_ONLY",
    "compressionPreset": "standard",
    "sttProvider": "doubao-small"
  }'

# 创建Apple播客任务（最小音质）
curl -X POST http://localhost:3000/api/external/tasks \\
  -H "X-API-Key: textget-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://podcasts.apple.com/hk/podcast/a16z-podcast/id842818711?i=1000725270034",
    "downloadType": "AUDIO_ONLY",
    "compressionPreset": "none"
  }'

# 创建视频+音频任务（轻度压缩）
curl -X POST http://localhost:3000/api/external/tasks \\
  -H "Authorization: Bearer textget-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.bilibili.com/video/BV1xx411c7mu",
    "downloadType": "BOTH",
    "compressionPreset": "light"
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
async function createTask(url, downloadType = 'AUDIO_ONLY', compressionPreset = 'none') {
  const response = await fetch(\`\${API_BASE}/tasks\`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url, downloadType, compressionPreset })
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
  // 创建Apple播客任务（最小音质，语音转文字优化）
  const task = await createTask('https://podcasts.apple.com/hk/podcast/a16z-podcast/id842818711?i=1000725270034', 'AUDIO_ONLY', 'none');
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
    
    def create_task(self, url, download_type='AUDIO_ONLY', compression_preset='none', stt_provider=None):
        """创建下载任务"""
        data = {
            'url': url,
            'downloadType': download_type,
            'compressionPreset': compression_preset
        }
        if stt_provider:
            data['sttProvider'] = stt_provider
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
    
    # 创建Apple播客任务（最小音质，语音转文字优化）
    result = api.create_task('https://podcasts.apple.com/hk/podcast/a16z-podcast/id842818711?i=1000725270034', 'AUDIO_ONLY', 'none')
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
                    <li>任务失败时检查 errorMessage 字段获取详细信息</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">📏 任务限制</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li><strong>文件大小限制</strong>：单个文件不能超过 300MB（默认）</li>
                    <li><strong>时长限制</strong>：内容时长不能超过 2小时（默认）</li>
                    <li>超出限制的任务会自动失败，错误信息分别为"文件超大"或"内容超长"</li>
                    <li>限制值可通过环境变量 MAX_FILE_SIZE_MB 和 MAX_DURATION_HOURS 调整</li>
                    <li>失败任务的文件会在1小时后自动清理</li>
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

                {/* Apple播客自定义策略 */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-blue-900 mb-2">🎧 Apple播客自定义策略</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2"><strong>下载方式:</strong> <code>自定义RSS解析器</code></p>
                    <p className="text-sm text-gray-600 mb-2"><strong>技术实现:</strong></p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>iTunes API</strong>: 获取播客RSS feed URL</li>
                      <li>• <strong>RSS解析</strong>: 提取单集音频enclosure链接</li>
                      <li>• <strong>最小音质</strong>: 自动选择128kbps MP3格式</li>
                      <li>• <strong>地区保持</strong>: 保留原URL中的地区信息(如hk/us等)</li>
                      <li>• <strong>无需登录</strong>: 直接RSS方式，无需Apple ID</li>
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