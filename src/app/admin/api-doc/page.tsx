'use client'

import { useEffect, useRef, useState, type ReactElement } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'

type SectionId = 'overview' | 'tech' | 'stt-tech' | 'stt-apis' | 'unigen-apis'

type Section = {
  id: SectionId
  label: string
  title: string
  description: string
  icon: string
  render: () => ReactElement
}

const sections: Section[] = [
  {
    id: 'overview',
    label: 'Overview',
    title: 'Overview · 项目综述',
    description: '快速了解系统能力、定位与流程',
    icon: '📘',
    render: OverviewSection,
  },
  {
    id: 'tech',
    label: '技术栈',
    title: '技术栈 · 架构与依赖',
    description: '前后端协作、服务边界与基础设施',
    icon: '🛠️',
    render: TechStackSection,
  },
  {
    id: 'stt-tech',
    label: 'URL2STT 技术',
    title: 'URL2STT 技术 · 下载与转写',
    description: '关键模块、下载策略、元数据增强、音频压缩',
    icon: '🎙️',
    render: SttTechSection,
  },
  {
    id: 'stt-apis',
    label: 'URL2STT APIs',
    title: 'URL2STT APIs · REST 接入',
    description: 'URL 下载、转写、存储接口',
    icon: '🎤',
    render: SttApiSection,
  },
  {
    id: 'unigen-apis',
    label: 'UniGen APIs',
    title: 'UniGen APIs · AI 生成服务',
    description: '统一 AI 生成接口（图像、视频）',
    icon: '🔗',
    render: UniGenApiSection,
  },
]

export default function DocumentationPage(): ReactElement {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeSection])

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <Tabs
        value={activeSection}
        onValueChange={(value) => setActiveSection(value as SectionId)}
        className="grid gap-6 lg:grid-cols-[220px_1fr]"
      >
        <TabsList className="flex h-fit flex-col gap-2 self-start rounded-md border border-neutral-200 bg-white p-2 sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
          {sections.map((section) => (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
            >
              <span className="mr-2 text-base" aria-hidden>
                {section.icon}
              </span>
              <span>{section.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div ref={contentRef} className="space-y-6">
          {sections.map((section) => (
            <TabsContent key={section.id} value={section.id} className="mt-0">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-sm leading-relaxed text-neutral-700">
                  {section.render()}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}

function OverviewSection(): ReactElement {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="text-base font-semibold text-neutral-900">产品亮点</h3>
          <ul className="mt-3 space-y-2 list-disc list-inside">
            <li>多平台视频/播客下载 + AI 内容生成，支持图像、视频、STT 三大类能力。</li>
            <li>URL2STT：豆包、通义听悟、Google STT，多种压缩预设兼顾文件大小。</li>
            <li>AI 生成：FLUX 图像、Kling/Pollo 视频、Replicate 等多供应商统一接入。</li>
            <li>Web 管理台 + tRPC/REST API，实时掌握任务、日志与供应商配置。</li>
            <li>自动维护：yt-dlp 更新、临时文件清理、PM2 守护与部署脚本。</li>
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h3 className="text-base font-semibold text-neutral-900">典型处理流程</h3>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-sm font-semibold text-neutral-900">URL2STT 流程：</div>
              <ol className="mt-1 space-y-1 text-xs text-neutral-700">
                <li>1. 创建任务 → URL 标准化（短链解析、平台识别），记录为 PENDING。</li>
                <li>2. <code className="rounded bg-neutral-100 px-1">ContentDownloader</code> 根据平台选择 yt-dlp 或自定义提取器。</li>
                <li>3. 可选音频压缩（FFmpeg 预设），控制文件大小落入语音服务阈值。</li>
                <li>4. 触发 STT 服务转写，并在 extraMetadata 中补充元数据与评论。</li>
                <li>5. 任务完成后延迟清理临时文件，保留数据库记录与日志。</li>
              </ol>
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900">AI 生成流程：</div>
              <ol className="mt-1 space-y-1 text-xs text-neutral-700">
                <li>1. 通过 API 提交生成请求（prompt、参数）。</li>
                <li>2. AdapterFactory 根据 modelIdentifier 创建对应适配器。</li>
                <li>3. 适配器调用第三方 API，支持同步返回或异步轮询。</li>
                <li>4. 可选 S3 上传，统一管理生成结果 URL。</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-base font-semibold text-neutral-900">运维能力</h3>
          <ul className="mt-2 space-y-1 text-neutral-700">
            <li>PM2 守护进程、日志轮转与资源限制。</li>
            <li><code className="rounded bg-neutral-100 px-1">smart-ytdlp-updater</code> 智能升级 yt-dlp。</li>
            <li>一键部署脚本：安装依赖、配置环境变量、执行构建/迁移。</li>
            <li>环境变量优先级：支持 AI 供应商密钥从 .env 加载。</li>
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-base font-semibold text-neutral-900">典型场景</h3>
          <ul className="mt-2 space-y-1 text-neutral-700">
            <li>自媒体团队整理多平台音视频与转写稿。</li>
            <li>教育 / 知识付费团队制作课程笔记与摘要。</li>
            <li>调研 / 数据分析团队收集节目互动指标与评论。</li>
            <li>内容创作者使用 AI 生成图像、视频素材。</li>
            <li>应用集成语音转文本、文本转图像等 AI 能力。</li>
          </ul>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h3 className="text-base font-semibold text-neutral-900">关键依赖</h3>
          <ul className="mt-2 space-y-1 text-neutral-700">
            <li>Node.js ≥ 18、Python ≥ 3.8、FFmpeg、yt-dlp。</li>
            <li>SQLite + Prisma ORM 负责结构化存储。</li>
            <li>Puppeteer Chromium / 浏览器 Profile，维持登录态与网页解析。</li>
            <li>第三方 AI API：TuZi、Pollo、Replicate、豆包、Google 等。</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function TechStackSection(): ReactElement {
  const cards = [
    {
      title: '前端体验层',
      icon: '🎨',
      bullets: [
        'Next.js 15 App Router 构建响应式管理台界面。',
        'React 19 + TypeScript 提供端到端类型安全。',
        'Tailwind CSS 4 + shadcn/ui 组件，快速搭建现代化 UI。',
        'React Query 管理数据缓存，配合 tRPC 客户端实现类型无缝传递。',
      ],
    },
    {
      title: '服务与任务编排',
      icon: '⚙️',
      bullets: [
        'TaskProcessor 统一调度下载、压缩、转写与清理流程。',
        'ContentDownloader 利用平台插件与 yt-dlp/自定义提取器完成多源下载。',
        'AdapterFactory + BaseAdapter 统一 AI 生成服务接入（图像、视频、STT）。',
        'Puppeteer BrowserManager 统一管理 headless Chromium 资源。',
        'CleanupManager 周期清理临时文件，防止磁盘膨胀。',
      ],
    },
    {
      title: '数据与基础设施',
      icon: '🗄️',
      bullets: [
        'Prisma + SQLite 保存任务、配置、AI 供应商与生成记录。',
        'ConfigManager 支持环境变量、数据库配置与默认值三级合并。',
        'GlobalInit 防止多实例重复初始化，协调下载器与转写服务。',
        'PM2 进程编排 + Docker / Shell 部署脚本保证上线一致性。',
        'AWS S3 集成，支持生成结果自动上传与 URL 管理。',
      ],
    },
  ]

  return (
    <div className="space-y-8 text-sm leading-relaxed">
      <div className="grid gap-5 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <span>{card.icon}</span>
              <span>{card.title}</span>
            </div>
            <ul className="mt-4 space-y-2 list-disc list-inside text-neutral-700">
              {card.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">架构视角</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4">
            <h4 className="text-sm font-semibold text-neutral-900">接口层</h4>
            <p className="mt-2 text-xs text-neutral-700">
              tRPC + Next.js Route Handler 提供内部 RPC 与 REST API，统一校验与错误格式。支持 API Key 认证与流量控制。
            </p>
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-4">
            <h4 className="text-sm font-semibold text-purple-900">任务层</h4>
            <p className="mt-2 text-xs text-purple-800">
              TaskProcessor 维护状态机与重试逻辑，使用 Prisma 原子更新确保一致性。AI 生成通过 GenerationRouter 统一调度。
            </p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
            <h4 className="text-sm font-semibold text-teal-900">扩展层</h4>
            <p className="mt-2 text-xs text-teal-800">
              平台插件（YouTube、Bilibili、小宇宙、Apple Podcasts）与 AI 适配器（FluxAdapter、KlingAdapter 等）通过统一接口注册与调用。
            </p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
            <h4 className="text-sm font-semibold text-rose-900">运维层</h4>
            <p className="mt-2 text-xs text-rose-800">
              PM2、智能更新脚本、Pino 结构化日志与错误监控帮助定位问题、自动恢复服务。
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">依赖矩阵</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-neutral-800">运行环境</h4>
            <ul className="mt-2 space-y-1 text-xs text-neutral-600">
              <li>• Node.js ≥ 18、npm ≥ 8</li>
              <li>• Python ≥ 3.8（yt-dlp 安装备选）</li>
              <li>• FFmpeg （音频提取与压缩）</li>
              <li>• Google Chrome / Chromium（Puppeteer）</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-800">主要第三方库</h4>
            <ul className="mt-2 space-y-1 text-xs text-neutral-600">
              <li>• <code>@trpc/*</code>、<code>@tanstack/react-query</code>、<code>superjson</code></li>
              <li>• <code>prisma</code> + <code>@prisma/client</code></li>
              <li>• <code>puppeteer</code>、<code>fluent-ffmpeg</code>、<code>axios</code></li>
              <li>• <code>@volcengine/*</code>、<code>@google-cloud/speech</code>、<code>@aws-sdk/client-s3</code></li>
              <li>• <code>zod</code>、<code>pino</code>、<code>pm2</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function SttTechSection(): ReactElement {
  return (
    <div className="space-y-10 text-sm leading-relaxed">
      {/* 关键模块 */}
      <div>
        <h2 className="text-xl font-bold text-neutral-900 border-b border-neutral-200 pb-3">关键模块 · 核心能力剖析</h2>
        <p className="mt-2 text-sm text-neutral-600">任务编排、下载、转写与治理能力</p>
        {KeyModulesContent()}
      </div>

      {/* 下载策略 */}
      <div>
        <h2 className="text-xl font-bold text-neutral-900 border-b border-neutral-200 pb-3">下载策略 · 平台适配</h2>
        <p className="mt-2 text-sm text-neutral-600">格式选择、降级策略与文件规范</p>
        {DownloadStrategyContent()}
      </div>

      {/* 元数据增强 */}
      <div>
        <h2 className="text-xl font-bold text-neutral-900 border-b border-neutral-200 pb-3">元数据增强 · 智能爬取</h2>
        <p className="mt-2 text-sm text-neutral-600">平台指标、评论聚合与字段结构</p>
        {MetadataContent()}
      </div>

      {/* 音频压缩 */}
      <div>
        <h2 className="text-xl font-bold text-neutral-900 border-b border-neutral-200 pb-3">音频压缩 · 智能预设</h2>
        <p className="mt-2 text-sm text-neutral-600">文件体积控制、策略与返回结构</p>
        {AudioCompressionContent()}
      </div>
    </div>
  )
}

function KeyModulesContent(): ReactElement {
  const modules = [
    {
      title: 'TaskProcessor',
      icon: '⚡',
      description: '统一的任务状态机，负责下载、转写、清理的串联调度。',
      bullets: [
        '维护 PENDING → EXTRACTING → TRANSCRIBING → COMPLETED/FAILED 状态流转。',
        '缓存 yt-dlp 元数据，便于与后续爬虫结果合并。',
        '将错误写入 ErrorLogger，叠加至任务记录的 JSON 错误栈。',
      ],
      files: ['src/lib/services/task-processor.ts'],
    },
    {
      title: 'ContentDownloader',
      icon: '⬇️',
      description: '平台无关的内容下载入口，自动选择 yt-dlp 或网页解析方案。',
      bullets: [
        'GlobalInit 保证单例初始化，避免重复检测 yt-dlp / FFmpeg。',
        '平台注册表定位对应策略，支持 URL 标准化与下载配置。',
        '必要时调用 webBasedDownloader + Puppeteer 执行定制提取。',
      ],
      files: ['src/lib/services/content-downloader.ts', 'src/lib/platforms/index.ts'],
    },
    {
      title: '语音服务适配层',
      icon: '🗣️',
      description: '统一封装豆包、Google、通义等 STT 服务，按需切换。',
      bullets: [
        '根据任务配置或全局默认选择 provider。',
        '豆包小模型支持火山 TOS 上传，Google 支持 GCS + 进度轮询。',
        'GlobalInit 记录初始化状态，避免重复鉴权。',
      ],
      files: ['src/lib/services/doubao-voice.ts', 'src/lib/services/doubao-small-stt.ts', 'src/lib/services/google-stt.ts'],
    },
    {
      title: 'MetadataScraper',
      icon: '🕷️',
      description: '补充平台特定元数据与评论，合并至统一 extraMetadata。',
      bullets: [
        '基于 Puppeteer 抓取评论、互动指标，支持平台差异化处理。',
        '优先保留 yt-dlp 结果，爬虫仅补空缺或增量字段。',
        '评论数量设定上限（一级 100，总计 300）保障性能。',
      ],
      files: ['src/lib/services/metadata-scraper/index.ts', 'src/lib/services/metadata-scraper/scrapers/*'],
    },
    {
      title: '音频压缩与清理',
      icon: '🗜️',
      description: 'FFmpeg 压缩 + 清理任务目录，保证磁盘与 API 限制。',
      bullets: [
        '多预设压缩（none/light/standard/heavy），输出大小与比例记录在任务表。',
        'AudioUtils 验证文件、统计比特率与持续时间。',
        'CleanupManager 定时扫描过期临时文件，并可通过 API 手动触发。',
      ],
      files: ['src/lib/services/audio-compressor.ts', 'src/lib/services/audio-utils.ts', 'src/lib/services/cleanup-manager.ts'],
    },
  ]

  return (
    <div className="space-y-6 mt-6 text-sm leading-relaxed">
      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((module) => (
          <div key={module.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <span>{module.icon}</span>
              <span>{module.title}</span>
            </div>
            <p className="mt-3 text-sm text-neutral-600">{module.description}</p>
            <ul className="mt-4 space-y-2 text-xs text-neutral-600">
              {module.bullets.map((bullet) => (
                <li key={bullet}>• {bullet}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-neutral-500">
              {module.files.map((file) => (
                <code key={file} className="rounded bg-neutral-100 px-2 py-1">{file}</code>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6 text-xs text-indigo-800">
        <h3 className="text-sm font-semibold text-indigo-900">扩展指引</h3>
        <ul className="mt-2 space-y-1">
          <li>• 新平台：实现 <code className="bg-white/70 px-1">AbstractPlatform</code> 并在 <code className="bg-white/70 px-1">initializePlatforms</code> 中注册。</li>
          <li>• 新 STT 服务：复用 TaskProcessor 的 provider 选择逻辑，确保 <code className="bg-white/70 px-1">ConfigManager</code> 提供必要配置。</li>
          <li>• 新任务类型：在 Prisma schema 与任务状态机中扩展，保持清理与压缩逻辑的兼容性。</li>
        </ul>
      </div>
    </div>
  )
}

function DownloadStrategyContent(): ReactElement {
  return (
    <div className="space-y-8 text-sm leading-relaxed">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">总体策略</h3>
        <p className="mt-3 text-sm text-neutral-600">
          系统以 <code className="rounded bg-neutral-100 px-1">yt-dlp</code> 为核心，通过平台适配与自动降级保障成功率：优先选择最佳音频流，若不可用则回退至视频流后提取音轨，并结合 Cookie / 浏览器
          Profile 获得授权内容。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 text-neutral-700">
            <h4 className="text-sm font-semibold text-neutral-900">音频优先</h4>
            <p className="mt-2 text-xs">默认 <code>bestaudio/best</code>，在确保质量的前提下压缩文件体积。</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50/70 p-4 text-green-800">
            <h4 className="text-sm font-semibold text-green-900">平台优化</h4>
            <p className="mt-2 text-xs">Bilibili 支持短链展开、伪装头与 API 优先，Apple Podcasts 则采用 RSS 解析。</p>
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4 text-purple-800">
            <h4 className="text-sm font-semibold text-purple-900">降级与容错</h4>
            <p className="mt-2 text-xs">格式不可用、HTTP 错误或反爬时记录错误并安全回退，不阻塞后续任务。</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-6">
          <h3 className="text-base font-semibold text-neutral-900">格式选择</h3>
          <ul className="mt-3 space-y-2 text-neutral-700">
            <li>• 通用：<code>bestaudio/best</code>，首选独立音频流，不可用时回退至最佳综合格式。</li>
            <li>• Bilibili：携带真实 UA、Referer、<code>video_info_prefer_api_over_html=true</code>，并自动处理分 P。</li>
            <li>• Apple Podcasts：调用 iTunes API 获取 RSS，选择 128kbps MP3，保持地区信息。</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6">
          <h3 className="text-base font-semibold text-amber-900">文件与命名</h3>
          <p className="mt-3 text-sm text-amber-800">
            每个任务拥有独立临时目录，保存原始与压缩后的音频/视频。
          </p>
          <div className="mt-3 rounded-xl border border-amber-200 bg-white p-4 font-mono text-[11px] text-neutral-700">
            temp/<br />
            ├── [taskId]/<br />
            │   ├── [videoId]_audio.mp3<br />
            │   └── [videoId]_video.mp4<br />
            └── cleanup_logs/
          </div>
          <ul className="mt-3 space-y-1 text-xs text-amber-700">
            <li>• 文件命名遵循 <code>[videoId]_(audio|video).ext</code>。</li>
            <li>• 压缩后文件覆盖原音频路径，同时写入 original/compressed size。</li>
            <li>• 清理器默认 5 分钟后处理完成任务，亦可通过 API 手动清理。</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-6">
        <h3 className="text-base font-semibold text-rose-900">容错与监控</h3>
        <ul className="mt-3 space-y-2 text-xs text-rose-800">
          <li>• 常见错误（格式不可用、403、反爬）被捕获并写入 ErrorLogger，前端展示易读信息。</li>
          <li>• 超出限制（文件过大、音频过长）使用 TaskLimitError 提示，避免重复重试浪费资源。</li>
          <li>• 下载与爬虫阶段均输出详细日志，便于在 <code>logs/app.log</code> 定位问题。</li>
        </ul>
      </div>
    </div>
  )
}

function SttApiSection(): ReactElement {
  const [expandedApis, setExpandedApis] = useState<Set<string>>(new Set())
  const [copiedApi, setCopiedApi] = useState<string | null>(null)

  const toggleApi = (apiId: string) => {
    setExpandedApis(prev => {
      const newSet = new Set(prev)
      if (newSet.has(apiId)) {
        newSet.delete(apiId)
      } else {
        newSet.add(apiId)
      }
      return newSet
    })
  }

  const copyApiDoc = async (apiId: string, endpoint: any) => {
    const doc = `# ${endpoint.method} ${endpoint.path}

${endpoint.purpose}

## 请求示例
${endpoint.request}

## 响应示例
${endpoint.response}

${endpoint.notes ? `## 说明\n${endpoint.notes}` : ''}`

    try {
      await navigator.clipboard.writeText(doc)
      setCopiedApi(apiId)
      setTimeout(() => setCopiedApi(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const taskApis = [
    {
      id: 'task-create',
      method: 'POST',
      path: '/api/external/tasks',
      purpose: '创建下载/转写任务',
      request: `{
  "url": "https://www.youtube.com/watch?v=example",
  "downloadType": "AUDIO_ONLY",
  "compressionPreset": "standard",
  "sttProvider": "google",
  "googleSttLanguage": "cmn-Hans-CN"
}`,
      response: `{
  "success": true,
  "data": {
    "id": "clxxxx",
    "platform": "youtube",
    "downloadType": "AUDIO_ONLY",
    "compressionPreset": "standard",
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "任务创建成功，下载类型：仅音频，压缩设置：标准压缩"
}`,
      notes: `参数说明：
- url: 视频/音频URL（必填）
- downloadType: AUDIO_ONLY | VIDEO_ONLY | BOTH（默认：AUDIO_ONLY）
- compressionPreset: none | light | standard | heavy（默认：none）
  - none: 不压缩
  - light: 轻度压缩，128k比特率，减小30-50%
  - standard: 标准压缩，64k比特率，减小50-70%
  - heavy: 高度压缩，32k比特率，减小70-85%
- sttProvider: google | doubao | doubao-small | tingwu（可选）
- googleSttLanguage: cmn-Hans-CN | en-US（Google STT专用，可选）
  - cmn-Hans-CN: 简体中文（默认）
  - en-US: 英语
  - 仅当 sttProvider 为 "google" 时使用此参数
  - 不同语言使用不同的区域端点和模型进行识别

任务状态说明：
- PENDING: 等待处理 - 任务已创建，等待系统处理
- EXTRACTING: 提取中 - 正在下载并提取音频文件
- TRANSCRIBING: 转录中 - 语音识别服务正在处理
- COMPLETED: 已完成 - 转录完成，可获取文本结果
- FAILED: 失败 - 处理过程中出现错误`
    },
    {
      id: 'task-list',
      method: 'GET',
      path: '/api/external/tasks',
      purpose: '分页查询任务列表',
      request: `?status=COMPLETED&platform=youtube&limit=20&offset=0`,
      response: `{
  "success": true,
  "data": [
    {
      "id": "clxxxx",
      "title": "视频标题",
      "status": "COMPLETED",
      "downloadType": "AUDIO_ONLY",
      "compressionPreset": "standard",
      "transcription": "...",
      "extraMetadata": { "viewCount": 50000, "platformData": {...} }
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}`,
      notes: `查询参数：
- status: PENDING | EXTRACTING | TRANSCRIBING | COMPLETED | FAILED
  - PENDING: 等待处理
  - EXTRACTING: 提取中 - 正在下载并提取音频
  - TRANSCRIBING: 转录中 - 语音识别处理中
  - COMPLETED: 已完成
  - FAILED: 失败
- platform: youtube | bilibili | xiaoyuzhou | apple-podcasts
- limit: 每页数量（默认：10，最大：100）
- offset: 偏移量（默认：0）

返回字段说明：
- downloadType: AUDIO_ONLY | VIDEO_ONLY | BOTH
- compressionPreset: none | light | standard | heavy（包含压缩比）
- extraMetadata: 统一结构，包含 title、author、duration、platformData、评论等
- errorMessage: JSON数组（新格式）或字符串（兼容旧格式）`
    },
    {
      id: 'task-detail',
      method: 'GET',
      path: '/api/external/tasks/:id',
      purpose: '获取任务详情',
      request: `GET /api/external/tasks/clxxxx`,
      response: `{
  "success": true,
  "data": {
    "id": "clxxxx",
    "url": "https://www.youtube.com/watch?v=example",
    "status": "COMPLETED",
    "videoPath": "/path/to/video.mp4",
    "audioPath": "/path/to/audio.mp3",
    "compressionRatio": 0.3,
    "extraMetadata": {
      "title": "视频标题",
      "comments": [ { "author": "观众", "content": "很棒！" } ]
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}`,
      notes: `返回字段说明：
- status: 任务状态
  - PENDING: 等待处理
  - EXTRACTING: 提取中 - 正在下载并提取音频
  - TRANSCRIBING: 转录中 - 语音识别处理中
  - COMPLETED: 已完成 - 转录完成，可获取文本结果
  - FAILED: 失败 - 处理过程中出现错误
- downloadType: AUDIO_ONLY | VIDEO_ONLY | BOTH
- compressionPreset: none | light | standard | heavy
- compressionRatio: 压缩比例（0-1）
- extraMetadata: 统一结构，包含：
  - title: 内容标题
  - author: 作者名称
  - duration: 时长（秒）
  - platformData: 平台特定数据（播放量、点赞等）
  - comments: 评论数据
- transcription: 转录文本（仅COMPLETED状态）
- errorMessage: 错误信息（JSON数组或字符串）`
    },
  ]

  const sttApis = [
    {
      id: 'stt-transcribe',
      method: 'POST',
      path: '/api/external/stt/transcribe',
      purpose: '提交音频STT转录任务',
      request: `Content-Type: multipart/form-data

audio=@example.mp3
provider=doubao-small
languageCode=cmn-Hans-CN
compressionPreset=standard`,
      response: `HTTP 202 Accepted
{
  "success": true,
  "data": {
    "jobId": "clxxxx",
    "status": "PENDING",
    "message": "任务已创建，正在处理中",
    "metadata": {
      "fileName": "example.mp3",
      "fileSize": 1234567,
      "fileSizeMB": "1.18",
      "duration": "65.43s",
      "provider": "doubao-small",
      "compressionPreset": "standard",
      "compressedFileSizeMB": "0.59",
      "compressionRatio": "50.00%"
    }
  }
}`,
      notes: `参数说明：
- audio: 音频文件（必填，最大512MB）
  - 支持格式: MP3, WAV, OGG, M4A, MP4
- provider: google | doubao | doubao-small（默认：doubao-small）
- languageCode: cmn-Hans-CN | en-US（Google STT必填）
- compressionPreset: none | light | standard | heavy（默认：standard）
  - none: 不压缩
  - light: 轻度压缩，128k比特率，减小30-50%
  - standard: 标准压缩，64k比特率，减小50-70%
  - heavy: 高度压缩，32k比特率，减小70-85%

提供商选择：
- google: 小文件(<10MB, <60s)同步模式，速度最快
  - 需要指定languageCode参数
  - 支持: cmn-Hans-CN(简体中文), en-US(英语)
- doubao: 中等文件，Base64直传，最大80MB
  - 仅支持中文
- doubao-small: 大文件，TOS对象存储，最大512MB（默认）
  - 仅支持中文

任务状态：
- PENDING: 等待处理
- PROCESSING: 处理中
- COMPLETED: 已完成
- FAILED: 失败

注意事项：
- 异步任务记录保存在数据库，不会自动清理
- 任务失败不会自动重试，需重新提交`
    },
    {
      id: 'stt-status',
      method: 'GET',
      path: '/api/external/stt/status/:jobId',
      purpose: '查询STT任务状态',
      request: `GET /api/external/stt/status/clxxxx`,
      response: `{
  "success": true,
  "data": {
    "jobId": "clxxxx",
    "status": "COMPLETED",
    "transcription": "转录的文本内容...",
    "transcriptionLength": 1234,
    "processingTime": "330.00s",
    "metadata": {
      "fileName": "example.mp3",
      "duration": "65.43s",
      "provider": "doubao-small"
    }
  }
}`,
      notes: `任务状态：
- PENDING: 等待处理 - 任务已创建，等待系统处理
- PROCESSING: 处理中 - 音频转录正在进行
- COMPLETED: 已完成 - 转录完成（包含transcription字段）
- FAILED: 失败 - 处理过程中出现错误（查看errorMessage字段）

返回字段说明：
- transcription: 转录文本（仅COMPLETED状态）
- transcriptionLength: 转录文本长度
- processingTime: 处理耗时
- metadata: 包含文件名、时长、提供商等信息

轮询建议：
- Google: 每5秒查询一次（小文件同步模式响应快）
- Doubao: 每30秒查询一次（异步处理）
- Doubao-small: 每200秒查询一次（TOS上传+异步处理，耗时较长）

注意事项：
- 任务记录永久保存，不会自动清理
- 失败任务不会自动重试`
    },
  ]

  const storageApis = [
    {
      id: 'storage-upload',
      method: 'POST',
      path: '/api/external/storage/upload',
      purpose: '上传文件到 S3 存储',
      request: `方式1：JSON格式（base64编码）
Content-Type: application/json
X-API-Key: your-api-key

{
  "fileData": "base64_encoded_file_content",
  "fileName": "my-custom-name",
  "pathPrefix": "uploads",
  "contentType": "image/png"
}

方式2：multipart/form-data（文件上传）
Content-Type: multipart/form-data
X-API-Key: your-api-key

file=@image.png
fileName=custom-name
pathPrefix=images`,
      response: `{
  "success": true,
  "url": "https://bucket.s3.region.amazonaws.com/uploads/my-custom-name.png",
  "message": "File uploaded successfully"
}`,
      notes: `鉴权方式：
- 请求头：X-API-Key 或 Authorization: Bearer <API-KEY>
- API Key 可在管理后台创建

参数说明：
方式1 - JSON（适合程序化上传）：
- fileData: base64编码的文件内容（必填）
- fileName: 自定义文件名（可选，不含扩展名）
- pathPrefix: S3路径前缀（可选，默认：uploads）
- contentType: MIME类型（可选，自动检测）

方式2 - Form Data（适合浏览器上传）：
- file: 文件对象（必填）
- fileName: 自定义文件名（可选，默认使用上传文件名）
- pathPrefix: S3路径前缀（可选，默认：uploads）

配置要求：
- 需要配置环境变量：
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_REGION
  - AWS_S3_BUCKET

返回字段：
- url: S3文件的完整URL
- success: 上传是否成功
- message: 操作消息

注意事项：
- 如果未配置S3，将返回503错误
- 自定义文件名会自动添加扩展名
- 重复文件名会被覆盖
- 支持的文件类型：图片、音频、视频、文档等`
    },
  ]

  const renderApiBlock = (title: string, description: string, apis: any[]) => (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {apis.map((endpoint) => (
          <div
            key={endpoint.id}
            className={`rounded-xl border ${
              expandedApis.has(endpoint.id)
                ? 'border-neutral-300 bg-neutral-50'
                : 'border-neutral-200 bg-white'
            }`}
          >
            {/* API Header */}
            <div
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-neutral-50/50"
              onClick={() => toggleApi(endpoint.id)}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    endpoint.method === 'POST'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {endpoint.method}
                </span>
                <code className="text-xs font-mono text-neutral-700">{endpoint.path}</code>
                <span className="text-xs text-neutral-500">{endpoint.purpose}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyApiDoc(endpoint.id, endpoint)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    copiedApi === endpoint.id
                      ? 'bg-green-100 text-green-700'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {copiedApi === endpoint.id ? '✓ 已复制' : '📋 复制'}
                </button>
                <span className="text-neutral-400">
                  {expandedApis.has(endpoint.id) ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {/* API Details (Collapsible) */}
            {expandedApis.has(endpoint.id) && (
              <div className="border-t border-neutral-200 p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 mb-2">请求示例</h4>
                    <pre className="max-h-60 overflow-auto rounded-lg bg-neutral-900 p-3 font-mono text-[11px] text-neutral-100">
{endpoint.request}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 mb-2">响应示例</h4>
                    <pre className="max-h-60 overflow-auto rounded-lg bg-neutral-900 p-3 font-mono text-[11px] text-neutral-100">
{endpoint.response}
                    </pre>
                  </div>
                </div>

                {endpoint.notes && (
                  <div className="rounded-lg bg-neutral-100 p-4">
                    <h4 className="text-xs font-semibold text-neutral-700 mb-2">说明</h4>
                    <pre className="whitespace-pre-wrap text-xs text-neutral-600 font-sans">
{endpoint.notes}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8 text-sm leading-relaxed">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">认证与安全</h3>
        <p className="mt-3 text-sm text-neutral-600">
          所有外部 REST 接口采用 API Key 认证。在请求头中通过 <code className="rounded bg-neutral-100 px-1">X-API-Key</code> 或 <code className="rounded bg-neutral-100 px-1">Authorization: Bearer</code>
          传递。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 font-mono text-xs text-neutral-900">
            curl -H "X-API-Key: textget-api-key-demo" \
            <br />
            &nbsp;&nbsp;https://your-domain.com/api/external/tasks
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4 font-mono text-xs text-purple-900">
            curl -H "Authorization: Bearer textget-api-key-demo" \
            <br />
            &nbsp;&nbsp;https://your-domain.com/api/external/tasks
          </div>
        </div>
        <p className="mt-4 text-xs text-neutral-500">
          在服务器环境变量中配置 <code className="rounded bg-neutral-100 px-1">TEXTGET_API_KEY</code> 以启用认证；可配合中间层做流量限制与审计。
        </p>
      </div>

      {/* Task APIs */}
      {renderApiBlock(
        '📹 视频下载与转写 API',
        '用于创建和管理视频下载/转写任务，支持多平台视频URL解析',
        taskApis
      )}

      {/* STT APIs */}
      {renderApiBlock(
        '🎤 音频转录 API (STT)',
        '直接上传音频文件进行转录，支持多STT提供商，无需视频URL',
        sttApis
      )}

      {/* Storage APIs */}
      {renderApiBlock(
        '☁️ 文件存储 API (S3)',
        '上传文件到AWS S3存储，支持自定义文件名和路径前缀',
        storageApis
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">HTTP 状态码参考</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-3">状态码</th>
                <th className="px-6 py-3">含义</th>
                <th className="px-6 py-3">描述</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['200', '成功', '请求成功处理'],
                ['202', '已接受', '任务已创建，正在异步处理（STT API）'],
                ['400', '请求错误', '请求参数无效或格式错误'],
                ['401', '认证失败', 'API Key 无效或缺失'],
                ['404', '资源不存在', '请求的任务或资源不存在'],
                ['500', '服务器错误', '服务器内部错误'],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-neutral-100">
                  {row.map((cell, idx) => (
                    <td key={idx} className="px-6 py-3 text-[11px] text-neutral-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-neutral-900">最佳实践</h3>
          <div className="mt-3 space-y-4 text-xs text-neutral-700">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span>🔄</span>
                <span>任务状态轮询</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                <li>• 创建任务后，使用轮询方式检查任务状态。</li>
                <li>• 建议轮询间隔：5-10 秒，并设置 5-10 分钟超时。</li>
                <li>• 处理 FAILED 状态，参考 <code>errorMessage</code> 获取原因。</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span>🛡️</span>
                <span>错误处理</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                <li>• 始终检查响应中的 <code>success</code> 字段。</li>
                <li>• 妥善处理网络错误和超时，必要时重试。</li>
                <li>• 401 错误：确认 API Key 是否正确配置。</li>
                <li>• 400 错误：检查请求参数类型与格式。</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span>⚡</span>
                <span>性能优化</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                <li>• 获取大量任务时启用分页，建议 <code>limit=10-50</code>。</li>
                <li>• 缓存已完成任务的数据，减少重复请求。</li>
                <li>• 避免频繁请求同一任务详情，合理设置间隔。</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span>🔐</span>
                <span>安全建议</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                <li>• 妥善保管 API Key，避免在客户端暴露。</li>
                <li>• 生产环境使用 HTTPS 保护数据传输。</li>
                <li>• 定期轮换 API Key，并记录访问日志。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetadataContent(): ReactElement {
  return (
    <div className="space-y-8 mt-6 text-sm leading-relaxed">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">智能爬取概述</h3>
        <p className="mt-3 text-sm text-neutral-600">
          系统会自动为每个任务爬取平台特定的元数据信息，包括播放量、点赞数、评论等。优先使用
          <code className="mx-1 rounded bg-neutral-100 px-1">yt-dlp</code>
          获取基础信息，然后通过 Puppeteer 爬取额外数据。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: 'Bilibili',
            bg: 'bg-pink-50/70',
            border: 'border-pink-100',
            text: 'text-pink-800',
            items: ['播放量', '点赞', '硬币', '转发', '收藏', '评论'],
          },
          {
            title: 'YouTube',
            bg: 'bg-neutral-100',
            border: 'border-neutral-200',
            text: 'text-neutral-700',
            items: ['播放量', '点赞数', '评论'],
          },
          {
            title: '小宇宙',
            bg: 'bg-emerald-50/70',
            border: 'border-emerald-100',
            text: 'text-emerald-800',
            items: ['播放量', '评论数', '评论内容'],
          },
          {
            title: 'Apple 播客',
            bg: 'bg-amber-50/70',
            border: 'border-amber-100',
            text: 'text-amber-800',
            items: ['评分', '评分数量', '评论数', '分类信息'],
          },
        ].map((card) => (
          <div key={card.title} className={`rounded-2xl border ${card.border} ${card.bg} p-5`}>
            <h4 className={`text-sm font-semibold ${card.text}`}>{card.title}</h4>
            <ul className={`mt-3 space-y-1 text-xs ${card.text}`}>
              {card.items.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">extraMetadata 字段结构</h3>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-[11px] leading-relaxed text-neutral-100">
{`{
  "extraMetadata": {
    // 公共字段（所有平台）
    "title": "内容标题",
    "author": "作者名称",
    "authorAvatar": "作者头像URL",
    "duration": 1800,
    "publishDate": "2024-01-01",
    "description": "内容描述",
    "progress": "73%",

    // 平台特定数据
    "platformData": {
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
}`}
        </pre>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-6">
        <h3 className="text-base font-semibold text-neutral-900">数据获取策略</h3>
        <ul className="mt-3 space-y-2 text-xs text-neutral-700">
          <li>• <strong>yt-dlp 优先</strong>：优先获取标题、时长、播放量、点赞数并立即入库。</li>
          <li>• <strong>爬虫补充</strong>：Puppeteer 异步补全硬币、转发、收藏以及多平台评论。</li>
          <li>• <strong>数据合并</strong>：合并爬虫结果，但不会覆盖 yt-dlp 提供的核心字段。</li>
          <li>• <strong>容错处理</strong>：爬虫失败时任务仍可进入 COMPLETED，仅日志提示。</li>
          <li>• <strong>评论限制</strong>：一级评论≤100 条，总评论（含回复）≤300 条。</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-6">
        <h3 className="text-base font-semibold text-rose-900">⚠️ 注意事项</h3>
        <ul className="mt-3 space-y-2 text-xs text-rose-800">
          <li>• <code>extraMetadata</code> 可能为 null（爬虫未执行或失败）。</li>
          <li>• 新创建任务可能暂时没有 <code>extraMetadata</code> 数据。</li>
          <li>• 不同平台的 <code>platformData</code> 结构不同，请按需解析。</li>
          <li>• 爬虫超时时间约为 120 秒，超时会记录日志。</li>
          <li>• <code>progress</code> 仅在使用 Google STT 且任务耗时时才会出现。</li>
        </ul>
      </div>
    </div>
  )
}

function AudioCompressionContent(): ReactElement {
  return (
    <div className="space-y-8 mt-6 text-sm leading-relaxed">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">智能压缩概述</h3>
        <p className="mt-3 text-sm text-neutral-600">
          系统提供智能音频压缩功能，解决大音频文件超出豆包 API 80MB 限制的问题。
          通过 FFmpeg 实现高质量压缩，在保证语音可读性的同时大幅减小文件体积。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: '轻度压缩',
            description: '128k 比特率，减小 30-50%',
            classes: 'border-sky-100 bg-sky-50/70 text-sky-800',
          },
          {
            title: '标准压缩',
            description: '64k 比特率，减小 50-70%',
            classes: 'border-emerald-100 bg-emerald-50/70 text-emerald-800',
          },
          {
            title: '高度压缩',
            description: '32k 比特率，减小 70-85%',
            classes: 'border-amber-100 bg-amber-50/70 text-amber-800',
          },
        ].map((item) => (
          <div key={item.title} className={`rounded-2xl border p-5 ${item.classes}`}>
            <h4 className="text-sm font-semibold">{item.title}</h4>
            <p className="mt-2 text-xs">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50 px-6 py-4">
          <h3 className="text-base font-semibold text-neutral-900">压缩预设参数</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-3">预设</th>
                <th className="px-6 py-3">比特率</th>
                <th className="px-6 py-3">采样率</th>
                <th className="px-6 py-3">声道</th>
                <th className="px-6 py-3">预期压缩率</th>
                <th className="px-6 py-3">适用场景</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['none', '原始', '原始', '原始', '0%', '小文件，无需压缩'],
                ['light', '128k', '16kHz', '单声道', '30-50%', '保持较高质量'],
                ['standard', '64k', '16kHz', '单声道', '50-70%', '推荐用于语音转录'],
                ['heavy', '32k', '16kHz', '单声道', '70-85%', '严重超标的文件'],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-neutral-100">
                  {row.map((cell, idx) => (
                    <td key={idx} className="px-6 py-3 text-[11px] text-neutral-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-neutral-900">创建带压缩的任务</h3>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-[11px] leading-relaxed text-neutral-100">
{`curl -X POST http://localhost:3000/api/external/tasks \\
  -H "X-API-Key: textget-api-key-demo" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.xiaoyuzhoufm.com/episode/example",
    "downloadType": "AUDIO_ONLY",
    "compressionPreset": "standard"
  }'
`}
          </pre>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-neutral-900">压缩信息返回示例</h3>
          <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-neutral-950 p-4 text-[11px] leading-relaxed text-neutral-100">
{`{
  "success": true,
  "data": {
    "id": "clxxxxx",
    "status": "COMPLETED",
    "compressionPreset": "standard",
    "originalFileSize": 84840000,
    "compressedFileSize": 25452000,
    "compressionRatio": 0.30,
    "compressionDuration": 8500,
    "transcription": "完整转录文本..."
  }
}`}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6">
        <h3 className="text-base font-semibold text-indigo-900">💡 智能压缩策略</h3>
        <ul className="mt-3 space-y-2 text-xs text-indigo-800">
          <li>• 自动跳过：文件小于 80MB 且预设为 "none" 时跳过压缩。</li>
          <li>• 格式标准化：所有压缩输出统一为 MP3、16kHz 采样率。</li>
          <li>• 元数据清理：移除音频元数据，确保跨平台兼容性。</li>
          <li>• 豆包 API 优化：满足上传尺寸与格式要求，避免二次处理。</li>
          <li>• 错误恢复：压缩失败会回退使用原始音频，任务继续执行。</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-6">
        <h3 className="text-base font-semibold text-rose-900">🔧 技术实现</h3>
        <ul className="mt-3 space-y-2 text-xs text-rose-800">
          <li>• 压缩引擎：FFmpeg + libmp3lame 编码器，支持大文件稳定处理。</li>
          <li>• 处理流程：下载 → 压缩 → 验证 → 替换原文件 → 转录。</li>
          <li>• 文件验证：压缩后自动校验音频可读性与文件存在。</li>
          <li>• 性能优化：流式写入与临时目录管理，控制内存占用。</li>
        </ul>
      </div>
    </div>
  )
}

function UniGenApiSection(): ReactElement {
  const [expandedApis, setExpandedApis] = useState<Set<string>>(new Set())
  const [copiedApi, setCopiedApi] = useState<string | null>(null)

  const toggleApi = (apiId: string) => {
    setExpandedApis(prev => {
      const newSet = new Set(prev)
      if (newSet.has(apiId)) {
        newSet.delete(apiId)
      } else {
        newSet.add(apiId)
      }
      return newSet
    })
  }

  const copyApiDoc = async (apiId: string, endpoint: any) => {
    const doc = `# ${endpoint.method} ${endpoint.path}

${endpoint.purpose}

## 请求示例
${endpoint.request}

## 响应示例
${endpoint.response}

${endpoint.notes ? `## 说明\n${endpoint.notes}` : ''}`

    try {
      await navigator.clipboard.writeText(doc)
      setCopiedApi(apiId)
      setTimeout(() => setCopiedApi(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const tuziOpenAiOpenApiSpec = String.raw`# 创建图像

## OpenAPI Specification

\`\`\`yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/images/generations:
    post:
      summary: 创建图像
      deprecated: false
      description: |+
        [图片](https://platform.openai.com/docs/api-reference/images)

        给定提示和/或输入图像，模型将生成新图像。

        相关指南：[图像生成](https://platform.openai.com/docs/guides/images)

        根据提示创建图像。

      tags:
        - openai/图像（Images）
      parameters:
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{YOUR_API_KEY}}
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  description: 用于图像生成的模型。
                prompt:
                  type: string
                  description: 所需图像的文本描述。最大长度为 1000 个字符。
                'n':
                  type: integer
                  description: 要生成的图像数。必须介于 1 和 10 之间。
                size:
                  type: string
                  description: 生成图像的大小。必须是256x256、512x512或 1024x1024之一。
                quality:
                  type: string
                  description: 将生成的图像的质量。\`hd\`创建具有更精细细节和更高一致性的图像。此参数仅支持\`dall-e-3\`.
                response_format:
                  type: string
                  description: 返回生成的图像的格式。必须是 或url之一b64_json。
                style:
                  type: string
                  description: >-
                    生成图像的大小。必须是\`256x256\`、\`512x512\`或\`1024x1024\`for之一\`dall-e-2\`。对于模型来说，必须是\`1024x1024\`、\`1792x1024\`、
                    或之一。\`1024x1792\`\`dall-e-3\`
                user:
                  type: string
                  description: >-
                    生成图像的风格。必须是
                    或\`vivid\`之一\`natural\`。生动使模型倾向于生成超真实和戏剧性的图像。自然使模型生成更自然、不太真实的图像。此参数仅支持\`dall-e-3\`.
              required:
                - prompt
              x-apifox-orders:
                - prompt
                - model
                - 'n'
                - quality
                - response_format
                - style
                - user
                - size
            example:
              model: gpt-4o-image-vip
              prompt: 画一副清明上河图
              'n': 1
              size: 1024x1024
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  created:
                    type: integer
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        url:
                          type: string
                      required:
                        - url
                      x-apifox-orders:
                        - url
                required:
                  - created
                  - data
                x-apifox-orders:
                  - created
                  - data
              example:
                created: 1589478378
                data:
                  - url: https://...
                  - url: https://...
          headers: {}
          x-apifox-name: Create image
      security:
        - bearer: []
      x-apifox-folder: openai/图像（Images）
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7040782/apis/api-343647071-run
components:
  schemas: {}
  securitySchemes:
    bearer:
      type: http
      scheme: bearer
servers:
  - url: https://api.tu-zi.com
    description: api.tu-zi.com
security:
  - bearer: []
\`\`\``

  const generationApis = [
    {
      id: 'generation-create',
      method: 'POST',
      path: '/api/external/generation/generate',
      purpose: '提交 AI 生成请求（图像/视频）',
      request: `Content-Type: application/json
X-API-Key: your-api-key

{
  "modelIdentifier": "flux-kontext-pro",
  "prompt": "A beautiful sunset over mountains",
  "numberOfOutputs": 1,
  "parameters": {
    "width": 1024,
    "height": 1024,
    "guidance_scale": 7.5
  }
}`,
      response: `{
  "success": true,
  "data": {
    "requestId": "clxxxx",
    "status": "PENDING",
    "modelIdentifier": "flux-kontext-pro",
    "prompt": "A beautiful sunset over mountains",
    "numberOfOutputs": 1
  }
}`,
      notes: `参数说明：
- modelIdentifier: 模型标识符（必填）
  - 图像模型：flux-kontext-pro, flux-dev, gpt-4o-image-vip
  - 视频模型：kling-video-v1, pollo-veo3, minimax-video, ltx-video
- prompt: 生成提示词（必填，最大5000字符）
- numberOfOutputs: 生成数量（可选，默认：1，范围：1-4）
- parameters: 模型特定参数（可选，JSON对象）
  - 图像参数示例：width, height, guidance_scale, num_inference_steps
  - 视频参数示例：duration, fps, aspect_ratio

可用模型列表：
图像生成：
- flux-kontext-pro: FLUX Pro 高质量图像生成（Tuzi）
- flux-dev: FLUX Dev 快速图像生成（Tuzi）
- gpt-4o-image-vip: GPT-4o 风格图像生成（Tuzi）

视频生成：
- kling-video-v1: Kling 1.5 图像转视频（Tuzi）
- pollo-veo3: Pollo AI Veo 3 视频生成（Pollo）
- minimax-video: MiniMax Video 视频生成（Replicate）
- ltx-video: LTX Video 高速视频生成（Replicate）

任务状态：
- PENDING: 等待处理
- PROCESSING: 处理中
- SUCCESS: 成功
- FAILED: 失败

注意事项：
- 异步任务需要轮询查询结果
- 部分模型支持图像输入（视频生成）
- 可配置自动上传到 S3`
    },
    {
      id: 'generation-status',
      method: 'GET',
      path: '/api/external/generation/status/:requestId',
      purpose: '查询生成任务状态',
      request: `GET /api/external/generation/status/clxxxx
X-API-Key: your-api-key`,
      response: `{
  "success": true,
  "data": {
    "requestId": "clxxxx",
    "status": "SUCCESS",
    "modelIdentifier": "flux-kontext-pro",
    "prompt": "A beautiful sunset over mountains",
    "results": [
      {
        "url": "https://example.com/image1.png"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:01:30.000Z"
  }
}`,
      notes: `任务状态：
- PENDING: 等待处理 - 任务已创建，等待供应商处理
- PROCESSING: 处理中 - 供应商正在生成内容
- SUCCESS: 成功 - 生成完成（包含 results 字段）
- FAILED: 失败 - 处理失败（查看 errorMessage 字段）

返回字段说明：
- results: 生成结果数组
  - url: 生成内容的 URL（图像/视频）
  - 如果配置了 S3 上传，URL 为 S3 地址
- createdAt: 创建时间
- completedAt: 完成时间（仅 SUCCESS/FAILED 状态）
- errorMessage: 错误信息（仅 FAILED 状态）

轮询建议：
- FLUX/图像生成: 每 10 秒查询一次
- 视频生成: 每 30-60 秒查询一次
- 设置合理的超时时间（图像：5分钟，视频：15分钟）

注意事项：
- 任务记录永久保存在数据库
- 失败任务不会自动重试
- 生成的 URL 可能有时效性（取决于供应商）`
    },
    {
      id: 'generation-providers',
      method: 'GET',
      path: '/api/external/generation/providers',
      purpose: '获取可用的 AI 供应商列表',
      request: `GET /api/external/generation/providers?type=image
X-API-Key: your-api-key`,
      response: `{
  "success": true,
  "data": [
    {
      "id": "clxxxx",
      "name": "Flux Image API",
      "modelIdentifier": "flux-kontext-pro",
      "type": "image",
      "provider": "Tuzi",
      "isActive": true,
      "callCount": 22
    },
    {
      "id": "clyyyy",
      "name": "Tuzi GPT-4o Image API",
      "modelIdentifier": "gpt-4o-image-vip",
      "type": "image",
      "provider": "Tuzi",
      "isActive": true,
      "callCount": 10
    }
  ]
}`,
      notes: `查询参数：
- type: 筛选类型（可选）
  - image: 图像生成模型
  - video: 视频生成模型
  - stt: 语音转文本模型
  - 不传则返回所有类型

返回字段说明：
- name: 供应商名称
- modelIdentifier: 模型标识符（用于生成请求）
- type: 模型类型（image/video/stt）
- provider: 第三方平台（Tuzi/Pollo/Replicate）
- isActive: 是否激活
- callCount: 调用次数统计

使用场景：
- 获取可用模型列表供用户选择
- 检查模型是否在线
- 查看模型调用统计`
    },
  ]

  const renderApiBlock = (title: string, description: string, apis: any[]) => (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {apis.map((endpoint) => (
          <div
            key={endpoint.id}
            className={`rounded-xl border ${
              expandedApis.has(endpoint.id)
                ? 'border-neutral-300 bg-neutral-50'
                : 'border-neutral-200 bg-white'
            }`}
          >
            {/* API Header */}
            <div
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-neutral-50/50"
              onClick={() => toggleApi(endpoint.id)}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    endpoint.method === 'POST'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {endpoint.method}
                </span>
                <code className="text-xs font-mono text-neutral-700">{endpoint.path}</code>
                <span className="text-xs text-neutral-500">{endpoint.purpose}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    copyApiDoc(endpoint.id, endpoint)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    copiedApi === endpoint.id
                      ? 'bg-green-100 text-green-700'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {copiedApi === endpoint.id ? '✓ 已复制' : '📋 复制'}
                </button>
                <span className="text-neutral-400">
                  {expandedApis.has(endpoint.id) ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {/* API Details (Collapsible) */}
            {expandedApis.has(endpoint.id) && (
              <div className="border-t border-neutral-200 p-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 mb-2">请求示例</h4>
                    <pre className="max-h-60 overflow-auto rounded-lg bg-neutral-900 p-3 font-mono text-[11px] text-neutral-100">
{endpoint.request}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 mb-2">响应示例</h4>
                    <pre className="max-h-60 overflow-auto rounded-lg bg-neutral-900 p-3 font-mono text-[11px] text-neutral-100">
{endpoint.response}
                    </pre>
                  </div>
                </div>

                {endpoint.notes && (
                  <div className="rounded-lg bg-neutral-100 p-4">
                    <h4 className="text-xs font-semibold text-neutral-700 mb-2">说明</h4>
                    <pre className="whitespace-pre-wrap text-xs text-neutral-600 font-sans">
{endpoint.notes}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8 text-sm leading-relaxed">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">UniGen API 概述</h3>
        <p className="mt-3 text-sm text-neutral-600">
          UniGen API 提供统一的 AI 内容生成接口，支持图像生成、视频生成等多种 AI 能力。
          通过统一的接口接入多个第三方 AI 供应商（Tuzi、Pollo、Replicate 等），简化 AI 服务集成。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4 text-purple-800">
            <h4 className="text-sm font-semibold text-purple-900">🎨 图像生成</h4>
            <p className="mt-2 text-xs">FLUX Pro/Dev、DALL-E 风格等多种图像生成模型</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-blue-800">
            <h4 className="text-sm font-semibold text-blue-900">🎬 视频生成</h4>
            <p className="mt-2 text-xs">Kling、Pollo、MiniMax 等视频生成与图像转视频</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50/70 p-4 text-green-800">
            <h4 className="text-sm font-semibold text-green-900">🔄 统一接口</h4>
            <p className="mt-2 text-xs">一套 API 接入多个供应商，支持动态切换与负载均衡</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">认证与安全</h3>
        <p className="mt-3 text-sm text-neutral-600">
          UniGen API 使用与 STT API 相同的认证方式。在请求头中通过 <code className="rounded bg-neutral-100 px-1">X-API-Key</code> 或 <code className="rounded bg-neutral-100 px-1">Authorization: Bearer</code>
          传递 API Key。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-neutral-100 p-4 font-mono text-xs text-neutral-900">
            curl -H "X-API-Key: your-api-key" \
            <br />
            &nbsp;&nbsp;https://your-domain.com/api/external/generation/providers
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4 font-mono text-xs text-purple-900">
            curl -H "Authorization: Bearer your-api-key" \
            <br />
            &nbsp;&nbsp;https://your-domain.com/api/external/generation/generate
          </div>
        </div>
      </div>

      {/* Generation APIs */}
      {renderApiBlock(
        '🤖 AI 生成 API',
        '统一的 AI 内容生成接口，支持图像、视频等多种生成任务',
        generationApis
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">Tuzi GPT-4o Image API</h3>
        <p className="mt-3 text-sm text-neutral-600">
          Tuzi OpenAI 风格图像生成接口示例。Base URL 为 <code className="rounded bg-neutral-100 px-1">https://api.tu-zi.com</code>，
          生成请求需携带 Bearer Token。
        </p>
        <div className="mt-4">
          <pre className="max-h-[560px] overflow-auto rounded-lg bg-neutral-900 p-4 font-mono text-[11px] text-neutral-100 leading-snug">
{tuziOpenAiOpenApiSpec}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900">最佳实践</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="space-y-4 text-xs text-neutral-700">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span>🔄</span>
                <span>异步轮询</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                <li>• 生成任务为异步处理，需要轮询查询状态。</li>
                <li>• 图像生成建议 10 秒轮询间隔，超时时间 5 分钟。</li>
                <li>• 视频生成建议 30-60 秒轮询，超时时间 15 分钟。</li>
                <li>• 处理 FAILED 状态，参考 errorMessage 定位问题。</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span>⚙️</span>
                <span>模型选择</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                <li>• 先调用 /providers 接口获取可用模型列表。</li>
                <li>• 检查 isActive 字段确认模型是否在线。</li>
                <li>• 根据 type 字段筛选图像或视频生成模型。</li>
                <li>• 不同模型支持的 parameters 参数不同。</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4 text-xs text-neutral-700">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span>💡</span>
                <span>参数优化</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                <li>• prompt 应清晰描述期望结果，避免模糊表述。</li>
                <li>• numberOfOutputs 建议为 1-2，避免过多消耗配额。</li>
                <li>• 图像生成建议尺寸 1024x1024 或 512x512。</li>
                <li>• 视频生成注意 duration 和 fps 参数限制。</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <span>🔐</span>
                <span>安全建议</span>
              </div>
              <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                <li>• 生成的内容 URL 可能有时效性，及时保存。</li>
                <li>• 配置 S3 上传可获得永久存储的 URL。</li>
                <li>• 定期检查供应商配额和调用次数。</li>
                <li>• 生产环境使用 HTTPS 保护数据传输。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-6">
        <h3 className="text-base font-semibold text-amber-900">⚠️ 注意事项</h3>
        <ul className="mt-3 space-y-2 text-xs text-amber-800">
          <li>• 生成任务耗时较长（图像：30秒-3分钟，视频：3-15分钟）。</li>
          <li>• 部分模型需要特定的输入格式（如视频生成需要图像输入）。</li>
          <li>• 供应商 API 可能有配额限制或速率限制。</li>
          <li>• 生成失败不会自动重试，需要重新提交请求。</li>
          <li>• 如未配置供应商 API Key，相关模型将不可用。</li>
        </ul>
      </div>
    </div>
  )
}
