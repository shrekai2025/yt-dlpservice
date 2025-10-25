"use client"

export const dynamic = 'force-dynamic'

import React, { useEffect, useMemo, useState } from 'react'

import { api } from '~/components/providers/trpc-provider'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils/cn'
import platformsConfig from '~/config/platforms.json'

export default function ConfigToolsPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'chromium' | 'youtube' | 'yt-dlp' | 'file-cleanup' | 'stt-status' | 'platforms' | 'config' | 'proxy' | 'database-backup'>('chromium')
  const { data: downloaderStatus, refetch: refetchDownloaderStatus } = api.task.checkDownloader.useQuery()
  const [toast, setToast] = useState<{ message: string; tone?: 'default' | 'success' | 'error' } | null>(null)
  const showToast = (message: string, tone: 'default' | 'success' | 'error' = 'default') => {
    setToast({ message, tone })
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <main className="space-y-8">

      {toast && (
        <div
          className={cn(
            'flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm shadow-sm',
            toast.tone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : toast.tone === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-neutral-200 bg-white text-neutral-600',
          )}
        >
          <span className="leading-relaxed">{toast.message}</span>
          <Button size="sm" variant="ghost" onClick={() => setToast(null)}>
            关闭
          </Button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="grid gap-6 lg:grid-cols-[220px_1fr]"
      >
        <TabsList className="sticky top-24 flex h-fit max-h-[calc(100vh-6rem)] flex-col gap-2 self-start overflow-y-auto rounded-md border border-neutral-200 bg-white p-2">
          <TabsTrigger
            value="chromium"
            className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            Chromium 下载器
          </TabsTrigger>
          <TabsTrigger
            value="youtube"
            className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            YouTube
          </TabsTrigger>
          <TabsTrigger
            value="yt-dlp"
            className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            yt-dlp
          </TabsTrigger>
          <TabsTrigger
            value="file-cleanup"
            className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            文件清理
          </TabsTrigger>
          <TabsTrigger
            value="stt-status"
            className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            STT服务状态
          </TabsTrigger>
          <TabsTrigger
            value="platforms"
            className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            支持的平台
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            系统配置
          </TabsTrigger>
          <TabsTrigger
            value="proxy"
            className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            代理配置
          </TabsTrigger>
          <TabsTrigger
            value="database-backup"
            className="justify-start rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            数据库备份
          </TabsTrigger>
        </TabsList>

        <div className="space-y-6">
          <TabsContent value="chromium" className="mt-0">
            <ChromiumDownloaderSection downloaderStatus={downloaderStatus} showToast={showToast} />
          </TabsContent>
          <TabsContent value="youtube" className="mt-0">
            <YouTubeCookieSection />
          </TabsContent>
          <TabsContent value="yt-dlp" className="mt-0">
            <YtDlpConfigSection downloaderStatus={downloaderStatus} onRefresh={() => void refetchDownloaderStatus()} />
          </TabsContent>
          <TabsContent value="file-cleanup" className="mt-0">
            <FileCleanupSection />
          </TabsContent>
          <TabsContent value="stt-status" className="mt-0">
            <STTServiceStatusSection />
          </TabsContent>
          <TabsContent value="platforms" className="mt-0">
            <PlatformsSection />
          </TabsContent>
          <TabsContent value="config" className="mt-0">
            <ConfigManagementSection showToast={showToast} />
          </TabsContent>
          <TabsContent value="proxy" className="mt-0">
            <ProxyConfigSection showToast={showToast} />
          </TabsContent>
          <TabsContent value="database-backup" className="mt-0">
            <DatabaseBackupSection showToast={showToast} />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  )
}

type ChromiumDownloaderSectionProps = {
  downloaderStatus?: {
    available?: boolean
    version?: string
  }
  showToast: (message: string, tone?: 'default' | 'success' | 'error') => void
}

function ChromiumDownloaderSection({ downloaderStatus, showToast }: ChromiumDownloaderSectionProps): React.ReactElement {
  const { data: browserStatus, refetch: refetchBrowserStatus } = api.browser.getStatus.useQuery()
  const cleanupBrowser = api.browser.cleanup.useMutation({
    onSuccess: (data: { message?: string } | undefined) => {
      showToast(data?.message ?? '浏览器资源清理成功', 'success')
      void refetchBrowserStatus()
    },
    onError: (error: unknown) => {
      showToast(error instanceof Error ? error.message : '清理浏览器资源失败', 'error')
    },
  })
  const testBrowser = api.browser.testBrowser.useMutation({
    onSuccess: (data: { message?: string } | undefined) => {
      showToast(data?.message ?? '浏览器测试成功', 'success')
    },
    onError: (error: unknown) => {
      showToast(error instanceof Error ? error.message : '浏览器测试失败', 'error')
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chromium 下载器状态</CardTitle>
        <CardDescription>监控下载器与浏览器运行状况，执行常见维护操作。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>系统状态</CardTitle>
              <CardDescription>实时监控下载器与浏览器维护操作。</CardDescription>
            </div>
            {downloaderStatus?.version && (
              <Badge variant="outline" className="tracking-tight">
                yt-dlp v{downloaderStatus.version}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium uppercase text-neutral-500">下载器状态</span>
                <Badge variant={downloaderStatus?.available ? 'success' : 'danger'}>
                  {downloaderStatus?.available ? '可用' : '不可用'}
                </Badge>
              </div>
              <p className="text-sm text-neutral-500">
                {downloaderStatus?.available
                  ? '服务保持运行，可处理新的抓取与转录任务。'
                  : '下载器不可用，请检查服务器依赖或重新启动服务。'}
              </p>
            </div>
            <div className="space-y-3">
              <span className="text-xs font-medium uppercase text-neutral-500">维护操作</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/maintenance/update', { method: 'POST' })
                      const data = await res.json()
                      if (data?.success) {
                        showToast('已开始更新，完成后将自动刷新', 'success')
                        const poll = async () => {
                          for (let i = 0; i < 30; i++) {
                            await new Promise((r) => setTimeout(r, 2000))
                            const s = await fetch('/api/admin/maintenance/update-status')
                            const j = await s.json()
                            if (j?.status === 'OK' || j?.status === 'FAIL') {
                              if (j?.status === 'OK') {
                                location.reload()
                              } else {
                                showToast('更新失败，请查看日志', 'error')
                              }
                              return
                            }
                          }
                        }
                        void poll()
                      } else {
                        showToast(`触发更新失败：${data?.error || 'Unknown error'}`, 'error')
                      }
                    } catch (e: any) {
                      showToast(`触发更新异常：${e.message}`, 'error')
                    }
                  }}
                >
                  更新服务
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/maintenance/tmux')
                      const data = await res.json()
                      const text = data?.output || '无输出'
                      const w = window.open('', '_blank', 'width=720,height=480')
                      if (w) {
                        w.document.write(
                          '<pre style="white-space:pre-wrap;word-break:break-all;padding:12px;">' +
                            String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;') +
                            '</pre>',
                        )
                        w.document.title = 'tmux 会话列表'
                      }
                    } catch (e: any) {
                      showToast(`检查失败：${e.message}`, 'error')
                    }
                  }}
                >
                  检查 Chromium 运行
                </Button>

                <Button
                  size="sm"
                  variant="subtle"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/maintenance/login-setup', { method: 'POST' })
                      const data = await res.json()
                      if (!data?.success) {
                        showToast(`启动登录流程失败：${data?.error || 'Unknown error'}`, 'error')
                        return
                      }
                      const guide = data.guidance
                      const w = window.open('', '_blank', 'width=820,height=680')
                      if (w) {
                        w.document.title = '重新登录账号 - 操作指南'
                        const html = `
                          <div style="padding:16px; font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
                            <h2>重新登录账号 - 操作指南</h2>
                            <ol>
                              <li>在你的本地电脑执行（保持窗口不关闭）：<pre>ssh -N -L 9222:localhost:9222 &lt;user&gt;@&lt;服务器IP&gt;</pre></li>
                              <li>打开本机 Chrome 输入 <code>chrome://inspect/#devices</code>，点击 <b>Configure…</b>，添加 <code>localhost:9222</code></li>
                              <li>在 Remote Target 中点击 <b>inspect</b>，在弹出的页面访问 <code>https://www.youtube.com</code> 完成登录（含二步验证）</li>
                              <li>服务器验证命令：
                                <pre>yt-dlp --cookies-from-browser "${guide?.cookiesFromBrowser || 'chromium:/home/<user>/chrome-profile/Default'}" --dump-json &lt;YouTubeURL&gt; | head -c 200</pre>
                              </li>
                            </ol>
                            <p>你可随时在此页面查看登录流程日志：</p>
                            <button onclick="(async()=>{const r=await fetch('/api/admin/maintenance/login-setup-status');const j=await r.json();const pre=document.getElementById('log');pre.textContent=j.logTail||'无日志';document.getElementById('status').textContent=j.status||'IDLE';})();" style="padding:6px 10px;">刷新登录日志</button>
                            <div style="margin-top:8px;">状态：<span id="status">等待中</span></div>
                            <pre id="log" style="white-space:pre-wrap;border:1px solid #ddd;padding:10px;border-radius:6px;max-height:260px;overflow:auto;"></pre>
                          </div>`
                        w.document.write(html)
                      } else {
                        showToast('请允许弹窗以查看操作指南', 'error')
                      }
                    } catch (e: any) {
                      showToast(`启动登录流程异常：${e.message}`, 'error')
                    }
                  }}
                >
                  重新登录账号
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <BrowserManagementSection
          browserStatus={browserStatus}
          onRefresh={() => void refetchBrowserStatus()}
          onCleanup={() => cleanupBrowser.mutate()}
          onTest={() => testBrowser.mutate()}
          cleanupPending={cleanupBrowser.isPending}
          testPending={testBrowser.isPending}
        />
      </CardContent>
    </Card>
  )
}

type BrowserManagementSectionProps = {
  browserStatus?: {
    success?: boolean
    browserConnected?: boolean
    activePagesCount?: number
    hasIdleTimer?: boolean
    message?: string
  }
  onRefresh: () => void
  onCleanup: () => void
  onTest: () => void
  cleanupPending: boolean
  testPending: boolean
}

function BrowserManagementSection({ browserStatus, onRefresh, onCleanup, onTest, cleanupPending, testPending }: BrowserManagementSectionProps): React.ReactElement {
  return (
    <Card className="border-neutral-200 shadow-sm">
      <CardHeader>
        <CardTitle>浏览器管理</CardTitle>
        <CardDescription>监控由 Puppeteer 启动的独立 Chromium；本机 Chrome 仅用于远程调试登录流程。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1 text-sm text-neutral-600">
              <p>浏览器连接: {browserStatus?.browserConnected ? '✅ 已连接' : '❌ 未连接'}</p>
              <p>活跃页面: {browserStatus?.activePagesCount ?? 0} 个</p>
              <p>闲置定时器: {browserStatus?.hasIdleTimer ? '✅ 已启动' : '❌ 未启动'}</p>
              {browserStatus?.message && <p className="text-xs text-neutral-400">{browserStatus.message}</p>}
            </div>
            <button
              onClick={onRefresh}
              className="self-start rounded-md border border-neutral-300 px-3 py-1 text-sm text-neutral-700 transition hover:bg-neutral-200"
            >
              刷新状态
            </button>
          </div>
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium mb-2">独立 Chromium 智能登录</p>
          <p className="mb-2">
            服务器上的爬虫使用 Puppeteer 随附的 Chromium 实例完成页面采集；遇到认证需求时，会拉起这一实例供你远程调试。本机 Chrome/Edge 只是在需要手动登录时，通过远程调试端口接入这个 Chromium。
          </p>
          <p className="text-blue-600">
            <strong>推荐操作：</strong>首次部署后触发一次“重新登录账号”，按提示用本机 Chrome 连接远程 Chromium 并登录 YouTube，后续任务即可复用该登录态。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onTest}
            disabled={testPending}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testPending ? '测试中...' : '测试浏览器'}
          </button>
          <button
            onClick={onCleanup}
            disabled={cleanupPending}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cleanupPending ? '清理中...' : '清理浏览器资源'}
          </button>
        </div>

        <div className="rounded-md bg-neutral-50 p-4 text-sm text-neutral-600">
          <p className="mb-2 font-medium">使用流程：</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>需要更新登录态时，点击「重新登录账号」并按照弹窗指引触发远程 Chromium。</li>
            <li>在本机终端执行 SSH 端口转发，随后用本机 Chrome/Edge 打开 <code className="bg-neutral-200 px-1">chrome://inspect/#devices</code> 连接远程实例。</li>
            <li>在弹出的调试窗口里访问 YouTube 完成登录或二步验证，关闭窗口后等待脚本完成。</li>
            <li>新创建的任务会自动复用这份登录状态；若遇认证错误，可重复上述步骤刷新登录。</li>
          </ol>
          <p className="mt-2 text-xs text-neutral-500">
            提示：本机浏览器仅做调试入口；真正执行抓取的是服务器端的 Chromium，会在空闲时自动关闭但保留用户数据目录。
          </p>
        </div>

        {browserStatus?.success && (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <div className="flex items-center gap-2">
              <div>✅</div>
              <div>
                <p className="font-medium">浏览器管理器运行正常</p>
                <p>系统将按需启动浏览器实例处理网页解析任务。</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type ConfigManagementSectionProps = {
  showToast: (message: string, tone?: 'default' | 'success' | 'error') => void
}

function ConfigManagementSection({ showToast }: ConfigManagementSectionProps): React.ReactElement {
  const [configKey, setConfigKey] = useState('')
  const [configValue, setConfigValue] = useState('')
  const {
    data: configs,
    refetch: refetchConfigs,
    isFetching,
  } = api.config.getAll.useQuery()
  const setConfigMutation = api.config.set.useMutation({
    onSuccess: () => {
      showToast('配置设置成功', 'success')
      setConfigKey('')
      setConfigValue('')
      void refetchConfigs()
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : '配置设置失败', 'error')
    },
  })

  const configMap = configs?.data?.data ?? {}
  const entries = Object.entries(configMap).sort(([a], [b]) => a.localeCompare(b))

  return (
    <Card>
      <CardHeader>
        <CardTitle>系统配置管理</CardTitle>
        <CardDescription>
          通过覆盖 ConfigManager 配置键值来调整任务运行参数。环境变量优先级最高，其次是这里设置的数据库值，最后才是内置默认值。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium mb-2">功能说明</p>
          <ul className="list-disc list-inside space-y-1">
            <li>适合在无需重启的情况下调整任务并发、临时目录、文件大小等运行参数。</li>
            <li>同名环境变量会覆盖数据库中的值，如需强制使用此处配置，请确保部署时未设置该环境变量。</li>
            <li>支持自定义扩展键，业务代码可通过 <code className="bg-neutral-200 px-1">ConfigManager.get('KEY')</code> 读取。</li>
          </ul>
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (!configKey.trim() || !configValue.trim()) return
            await setConfigMutation.mutateAsync({ key: configKey.trim(), value: configValue.trim() })
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="config-key" className="text-sm font-medium text-neutral-700">
                配置键
              </label>
              <input
                id="config-key"
                type="text"
                value={configKey}
                onChange={(event) => setConfigKey(event.target.value)}
                placeholder="如：MAX_CONCURRENT_TASKS"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="config-value" className="text-sm font-medium text-neutral-700">
                配置值
              </label>
              <input
                id="config-value"
                type="text"
                value={configValue}
                onChange={(event) => setConfigValue(event.target.value)}
                placeholder="如：10 或 /tmp/yt-dlpservice"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={setConfigMutation.isPending}>
              {setConfigMutation.isPending ? '设置中…' : '保存配置'}
            </Button>
            <p className="text-xs text-neutral-500">
              提交后立即生效，并会在配置缓存中更新对应值。
            </p>
          </div>
        </form>

        <div className="rounded-md border border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
            <span className="text-sm font-medium text-neutral-700">当前配置（默认值 + 数据库覆盖）</span>
            <Button variant="outline" size="sm" onClick={() => void refetchConfigs()} disabled={isFetching}>
              {isFetching ? '刷新中…' : '刷新列表'}
            </Button>
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-white text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 text-left">Key</th>
                  <th className="px-4 py-2 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([key, value]) => (
                  <tr key={key} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-neutral-600">{key}</td>
                    <td className="px-4 py-2 text-neutral-800">{String(value)}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-center text-sm text-neutral-500" colSpan={2}>
                      暂无配置数据，提交任意键值后即可在此查看。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function YouTubeCookieSection(): React.ReactElement {
  const [isLocalBrowserLoading, setIsLocalBrowserLoading] = React.useState(false)

  const handleLocalBrowserLogin = async () => {
    try {
      setIsLocalBrowserLoading(true)
      const res = await fetch('/api/admin/maintenance/local-browser-login', { method: 'POST' })
      const data = await res.json()

      if (!data?.success) {
        alert(`启动本地浏览器失败：${data?.error || 'Unknown error'}`)
        return
      }

      const tips = data?.tips ? '\n\n💡 如遇问题：\n' + data.tips.join('\n') : ''
      alert(`✅ 本地浏览器已启动！\n\n请在弹出的浏览器窗口中登录 YouTube。\n登录成功后 Cookie 将自动保存，浏览器会自动关闭。\n\n⏱️ 超时时间：30 分钟${tips}`)
    } catch (error: any) {
      alert('启动失败：' + error.message)
    } finally {
      setIsLocalBrowserLoading(false)
    }
  }

  const handleBrowserLogin = async () => {
    try {
      const res = await fetch('/api/admin/maintenance/login-setup', { method: 'POST' })
      const data = await res.json()
      if (!data?.success) {
        alert(`启动登录流程失败：${data?.error || 'Unknown error'}`)
        return
      }
      const guide = data.guidance
      const w = window.open('', 'youtube-login-guide', 'width=900,height=720')
      if (w) {
        w.document.title = 'YouTube 浏览器登录 - 操作指南'
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>YouTube 浏览器登录指南</title>
            <style>
              body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; max-width: 800px; margin: 0 auto; }
              h2 { color: #1a1a1a; margin-bottom: 16px; }
              ol { line-height: 1.8; }
              pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; border: 1px solid #e0e0e0; }
              code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
              .step { margin-bottom: 20px; }
              .info { background: #e3f2fd; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #2196f3; }
              .success { background: #e8f5e9; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #4caf50; }
              .button { background: #2196f3; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
              .button:hover { background: #1976d2; }
              #log { white-space: pre-wrap; border: 1px solid #ddd; padding: 12px; border-radius: 6px; max-height: 300px; overflow: auto; background: #fafafa; font-size: 12px; }
              .warning { background: #fff3e0; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #ff9800; }
            </style>
          </head>
          <body>
            <h2>🌐 YouTube 浏览器登录指南</h2>

            <div class="info">
              <strong>💡 工作原理：</strong>系统会启动服务器端的 Chromium 浏览器，你通过本地浏览器远程连接并登录 YouTube。登录后的 Cookie 会自动保存到服务器。
            </div>

            <h3>📋 操作步骤：</h3>

            <div class="step">
              <strong>步骤 1: 建立 SSH 隧道</strong>
              <p>在你的本地电脑终端执行以下命令（保持窗口不关闭）：</p>
              <pre>ssh -N -L 9222:localhost:9222 &lt;user&gt;@&lt;服务器IP&gt;</pre>
              <p style="font-size: 12px; color: #666;">💡 将 &lt;user&gt; 和 &lt;服务器IP&gt; 替换为你的实际服务器信息</p>
            </div>

            <div class="step">
              <strong>步骤 2: 配置 Chrome 远程调试</strong>
              <ol>
                <li>打开本地 Chrome 浏览器，在地址栏输入：<code>chrome://inspect/#devices</code></li>
                <li>点击页面上的 <strong>Configure…</strong> 按钮</li>
                <li>在弹出的对话框中添加：<code>localhost:9222</code></li>
                <li>点击 <strong>Done</strong> 保存</li>
              </ol>
            </div>

            <div class="step">
              <strong>步骤 3: 连接并登录</strong>
              <ol>
                <li>在 Chrome 的 Remote Target 区域，找到显示的远程浏览器实例</li>
                <li>点击 <strong>inspect</strong> 按钮，会弹出一个新的调试窗口</li>
                <li>在调试窗口中访问：<code>https://www.youtube.com</code></li>
                <li>正常登录你的 YouTube 账号（包括二步验证）</li>
                <li>登录成功后，关闭调试窗口即可</li>
              </ol>
            </div>

            <div class="success">
              <strong>✅ 验证登录是否成功：</strong><br>
              在服务器上运行以下命令测试：
              <pre style="margin-top: 8px;">yt-dlp --cookies-from-browser "${guide?.cookiesFromBrowser || 'chromium'}" --dump-json &lt;YouTubeURL&gt; | head -c 200</pre>
            </div>

            <div class="warning">
              <strong>⚠️ 注意事项：</strong>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li>登录时可能需要完成 Google 的安全验证</li>
                <li>Cookie 通常 24-48 小时失效，需定期重新登录</li>
                <li>登录后系统会自动保存 Cookie，无需手动复制</li>
              </ul>
            </div>

            <h3>📊 登录状态监控：</h3>
            <button class="button" onclick="refreshLog()">🔄 刷新登录日志</button>
            <div style="margin-top: 12px; font-size: 14px;">
              <strong>状态：</strong><span id="status" style="color: #666;">等待中...</span>
            </div>
            <pre id="log" style="margin-top: 8px;">点击上方按钮刷新日志...</pre>

            <script>
              async function refreshLog() {
                try {
                  const r = await fetch('/api/admin/maintenance/login-setup-status');
                  const j = await r.json();
                  const pre = document.getElementById('log');
                  const status = document.getElementById('status');

                  pre.textContent = j.logTail || '暂无日志';
                  status.textContent = j.status || 'IDLE';
                  status.style.color = j.status === 'OK' ? '#4caf50' : j.status === 'FAIL' ? '#f44336' : '#666';
                } catch (e) {
                  document.getElementById('log').textContent = '获取日志失败: ' + e.message;
                }
              }

              // 自动刷新
              setInterval(refreshLog, 3000);
              refreshLog();
            </script>
          </body>
          </html>`
        w.document.write(html)
      } else {
        alert('请允许弹窗以查看操作指南')
      }
    } catch (e: any) {
      alert(`启动登录流程异常：${e.message}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🍪 YouTube Cookie 管理</CardTitle>
        <CardDescription>通过浏览器登录或手动配置 Cookie 来解决登录验证和受限视频问题。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 推荐方式：本地有头浏览器登录 */}
        <div className="rounded-md border-2 border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <div className="text-green-600 text-2xl">💻</div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">方式 1: 本地浏览器登录（推荐 - 最简单）</h3>
              <p className="text-sm text-green-800 mb-3">
                在本地服务器上直接弹出浏览器窗口，你在窗口中登录 YouTube 后系统自动保存 Cookie。
              </p>
              <Button
                size="sm"
                onClick={handleLocalBrowserLogin}
                disabled={isLocalBrowserLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLocalBrowserLoading ? '⏳ 启动中...' : '🖥️ 启动本地浏览器'}
              </Button>
              <p className="text-xs text-green-700 mt-2">
                💡 最简单直观的方式，适合本地开发环境或有桌面访问权限的服务器
              </p>
            </div>
          </div>
        </div>

        {/* 方式2：远程浏览器登录 */}
        <div className="rounded-md border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-2xl">🌐</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">方式 2: 远程浏览器登录（适合远程服务器）</h3>
              <p className="text-sm text-blue-800 mb-3">
                通过 SSH 隧道和远程调试连接服务器端浏览器，直接登录 YouTube 账号。系统会自动保存 Cookie，无需手动复制。
              </p>
              <Button
                size="sm"
                onClick={handleBrowserLogin}
                className="bg-blue-600 hover:bg-blue-700"
              >
                🚀 启动远程浏览器登录
              </Button>
              <p className="text-xs text-blue-700 mt-2">
                💡 适合无桌面环境的远程服务器，需要通过 SSH 隧道连接
              </p>
            </div>
          </div>
        </div>

        {/* 方式3：手动方式 */}
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-start gap-3">
            <div className="text-neutral-600 text-2xl">📋</div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 mb-2">方式 3: 手动配置 Cookie</h3>
              <p className="text-sm text-neutral-600 mb-3">
                在本地浏览器登录 YouTube 后，使用浏览器扩展导出 Netscape 格式 Cookie 并粘贴到管理页面。
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href="/admin/youtube-auth">📝 手动设置 Cookie</a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open('/admin/youtube-auth', '_blank')}
                >
                  📖 查看详细指南
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
          <div className="flex items-start gap-2">
            <div className="text-yellow-600">⚠️</div>
            <div className="text-yellow-800 space-y-1">
              <p className="font-medium">Cookie 管理提示：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Cookie 通常 24-48 小时后失效，需定期更新</li>
                <li>更新后立即生效，无需重启服务</li>
                <li>如遇"Sign in to confirm you're not a bot"错误，说明 Cookie 已失效</li>
                <li>建议使用浏览器登录方式，更稳定且操作简单</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Cookie 状态检查 */}
        <div className="rounded-md border border-neutral-200 bg-white p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-900">Cookie 文件状态</p>
              <p className="text-xs text-neutral-500 mt-1">
                位置: <code className="bg-neutral-100 px-1">data/cookies/youtube_cookies.txt</code>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/maintenance/login-setup-status')
                  const data = await res.json()
                  alert(`Cookie 状态：${data.status || '未知'}\n\n最近日志：\n${data.logTail || '无日志'}`)
                } catch (e: any) {
                  alert('检查失败: ' + e.message)
                }
              }}
            >
              检查状态
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type YtDlpConfigSectionProps = {
  downloaderStatus?: {
    available?: boolean
    version?: string
    path?: string
    message?: string
  }
  onRefresh: () => void
}

function YtDlpConfigSection({ downloaderStatus, onRefresh }: YtDlpConfigSectionProps): React.ReactElement {
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [updateMessage, setUpdateMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleUpdate = async () => {
    setIsUpdating(true)
    setUpdateMessage(null)

    try {
      const res = await fetch('/api/admin/maintenance/update-ytdlp', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setUpdateMessage({ text: data.message || 'yt-dlp 更新成功', type: 'success' })
        // 延迟1秒后刷新状态
        setTimeout(() => {
          onRefresh()
        }, 1000)
      } else {
        setUpdateMessage({
          text: data.message || '更新失败，请手动更新',
          type: 'error'
        })
      }
    } catch (error: any) {
      setUpdateMessage({
        text: `更新失败: ${error.message || 'Unknown error'}`,
        type: 'error'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>yt-dlp 路径配置</CardTitle>
        <CardDescription>检测下载器可用性，查看搜索路径并获取安装指引。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 text-sm text-neutral-600">
              <p>
                {downloaderStatus?.available
                  ? `✅ yt-dlp 已找到并可用${downloaderStatus.version ? `（版本: ${downloaderStatus.version}）` : ''}`
                  : '❌ yt-dlp 未找到或不可用'}
              </p>
              {downloaderStatus?.path && (
                <p className="font-mono text-blue-600">📍 检测到的路径: {downloaderStatus.path}</p>
              )}
              {!downloaderStatus?.available && downloaderStatus?.message && (
                <p className="text-red-600">{downloaderStatus.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="default"
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? '更新中…' : '更新 yt-dlp'}
              </Button>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                重新检测
              </Button>
            </div>
          </div>
        </div>

        {updateMessage && (
          <div className={cn(
            'rounded-md border px-4 py-3 text-sm',
            updateMessage.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          )}>
            {updateMessage.text}
          </div>
        )}

        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <div className="text-blue-500 mt-0.5">⚙️</div>
            <div className="space-y-3">
              <p className="font-medium">自动搜索路径</p>
              <div>
                <p>系统按照以下顺序查找 yt-dlp 可执行文件：</p>
                <ul className="mt-2 list-disc list-inside space-y-1 font-mono text-xs text-blue-900">
                  <li>yt-dlp（系统 PATH）</li>
                  <li>/usr/local/bin/yt-dlp</li>
                  <li>/usr/bin/yt-dlp</li>
                  <li>/home/ubuntu/.local/bin/yt-dlp</li>
                  <li>/Users/[用户名]/.local/bin/yt-dlp</li>
                  <li>/opt/homebrew/bin/yt-dlp</li>
                  <li>/usr/local/opt/yt-dlp/bin/yt-dlp</li>
                  <li>/Users/[用户名]/Library/Python/3.9/bin/yt-dlp</li>
                </ul>
              </div>
              <div className="rounded border border-blue-200 bg-white p-3 text-xs text-neutral-600">
                <p className="font-medium text-blue-900">自定义路径</p>
                <p className="mt-1">
                  如果需要添加其他候选路径，请修改 <code className="bg-neutral-200 px-1">src/lib/services/content-downloader.ts</code>
                  中 <code className="bg-neutral-200 px-1">detectYtDlpPath()</code> 的 <code className="bg-neutral-200 px-1">possiblePaths</code> 列表。
                </p>
              </div>
            </div>
          </div>
        </div>

        {!downloaderStatus?.available && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            <div className="flex items-start gap-2">
              <div className="text-yellow-600 mt-0.5">💡</div>
              <div className="space-y-2">
                <p className="font-medium">安装指南</p>
                <div className="space-y-2 rounded border border-yellow-200 bg-white p-3">
                  <p className="font-medium">🐍 Python pip 安装（推荐）</p>
                  <code className="block bg-neutral-100 px-2 py-1 text-xs">pip3 install --user yt-dlp</code>
                  <p className="font-medium">🍺 macOS Homebrew 安装</p>
                  <code className="block bg-neutral-100 px-2 py-1 text-xs">brew install yt-dlp</code>
                  <p className="font-medium">📦 Ubuntu/Debian 安装</p>
                  <code className="block bg-neutral-100 px-2 py-1 text-xs">sudo apt update && sudo apt install yt-dlp</code>
                </div>
                <p className="text-xs">安装完成后，点击「重新检测」刷新状态。</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FileCleanupSection(): React.ReactElement {
  // 文件清理相关
  const { data: cleanupStatus, refetch: refetchCleanupStatus } = api.cleanup.status.useQuery()
  const manualCleanup = api.cleanup.manual.useMutation({
    onSuccess: () => {
      void refetchCleanupStatus()
    }
  })
  const startAutoCleanup = api.cleanup.startAuto.useMutation({
    onSuccess: () => {
      void refetchCleanupStatus()
    }
  })
  const stopAutoCleanup = api.cleanup.stopAuto.useMutation({
    onSuccess: () => {
      void refetchCleanupStatus()
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧹 文件清理管理</CardTitle>
        <CardDescription>管理临时文件和已完成任务的自动清理，释放磁盘空间</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 自动清理状态 */}
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-neutral-900">自动清理服务</h3>
              <p className="text-sm text-neutral-600 mt-1">
                {cleanupStatus?.data?.autoCleanupEnabled
                  ? "✅ 自动清理服务已启动"
                  : "❌ 自动清理服务未启动"}
              </p>
              {cleanupStatus?.data?.isRunning && (
                <p className="text-sm text-blue-600 mt-1">🔄 清理任务正在运行中...</p>
              )}
            </div>

            <div className="flex gap-2">
              {!cleanupStatus?.data?.autoCleanupEnabled ? (
                <Button
                  size="sm"
                  onClick={() => startAutoCleanup.mutate()}
                  disabled={startAutoCleanup.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {startAutoCleanup.isPending ? "启动中..." : "启动自动清理"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => stopAutoCleanup.mutate()}
                  disabled={stopAutoCleanup.isPending}
                  variant="destructive"
                >
                  {stopAutoCleanup.isPending ? "停止中..." : "停止自动清理"}
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => void refetchCleanupStatus()}
              >
                刷新状态
              </Button>
            </div>
          </div>
        </div>

        {/* 手动清理 */}
        <div className="rounded-md border-2 border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <div className="text-orange-600 text-2xl">🗑️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">一键清理功能</h3>
              <p className="text-sm text-orange-800 mb-3">
                手动清理所有过期的临时文件、已完成任务的文件和测试文件。清理操作会释放磁盘空间，避免服务器硬盘被填满。
              </p>

              <div className="bg-orange-100 rounded-md p-3 mb-4">
                <p className="text-sm font-medium text-orange-900 mb-2">清理范围包括：</p>
                <ul className="list-disc list-inside text-xs text-orange-800 space-y-1 ml-2">
                  <li>超过保留时间的临时文件</li>
                  <li>已完成任务的视频和音频文件</li>
                  <li>豆包API测试产生的临时文件</li>
                  <li>空的临时目录</li>
                </ul>
              </div>

              <Button
                onClick={() => manualCleanup.mutate()}
                disabled={manualCleanup.isPending || cleanupStatus?.data?.isRunning}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {manualCleanup.isPending ? "清理中..." : "🗑️ 立即清理"}
              </Button>
            </div>
          </div>
        </div>

        {/* 清理结果 */}
        {manualCleanup.data && (
          <div className={cn(
            "rounded-md border p-4",
            manualCleanup.data.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          )}>
            <h3 className={cn(
              "font-semibold mb-2",
              manualCleanup.data.success ? "text-green-900" : "text-red-900"
            )}>
              {manualCleanup.data.success ? '✅ 清理完成' : '❌ 清理失败'}
            </h3>
            <p className="text-sm mb-2">{manualCleanup.data.message}</p>
            {manualCleanup.data.success && manualCleanup.data.data && (
              <div className="text-sm space-y-1 text-green-800">
                <p>📁 清理临时文件: <strong>{manualCleanup.data.data.tempFiles}</strong> 个</p>
                <p>📋 清理完成任务: <strong>{manualCleanup.data.data.completedTasks}</strong> 个</p>
                <p>💾 释放空间: <strong>{manualCleanup.data.data.formattedSize}</strong></p>
              </div>
            )}
          </div>
        )}

        {/* 清理错误 */}
        {manualCleanup.error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <h3 className="font-semibold mb-2 text-red-800">清理失败</h3>
            <p className="text-sm text-red-700">{manualCleanup.error.message}</p>
          </div>
        )}

        {/* 提示信息 */}
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <div className="text-blue-500 mt-0.5">💡</div>
            <div className="space-y-1">
              <p className="font-medium">清理建议</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>建议启用自动清理服务，系统会定期清理过期文件</li>
                <li>手动清理适合在磁盘空间紧张时立即释放空间</li>
                <li>清理操作不会影响正在进行的任务</li>
                <li>已完成的任务文件会在保留期后自动清理</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * STT服务状态组件
 */
function STTServiceStatusSection(): React.ReactElement {
  const getAllVoiceServiceStatus = api.config.getAllVoiceServiceStatus.useQuery()
  const diagnoseDoubaoSmallAPI = api.config.diagnoseDoubaoSmallAPI.useMutation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>STT服务状态总览</CardTitle>
        <CardDescription>
          查看所有语音转文字服务的可用性状态
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 服务状态卡片 */}
        {getAllVoiceServiceStatus.data?.success && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getAllVoiceServiceStatus.data.data.map((service) => (
              <div
                key={service.provider}
                className={`p-4 rounded-lg border-2 ${
                  service.available
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      service.available ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="font-medium text-sm">{service.name}</span>
                </div>
                <div className="text-xs text-gray-600">
                  <div className="mb-1">
                    <span className="font-mono bg-gray-100 px-1 rounded">
                      {service.provider}
                    </span>
                  </div>
                  <div className={service.available ? 'text-green-700' : 'text-red-700'}>
                    {service.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <button
            onClick={() => getAllVoiceServiceStatus.refetch()}
            disabled={getAllVoiceServiceStatus.isRefetching}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            {getAllVoiceServiceStatus.isRefetching ? "检查中..." : "刷新状态"}
          </button>

          <button
            onClick={() => diagnoseDoubaoSmallAPI.mutate()}
            disabled={diagnoseDoubaoSmallAPI.isPending}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
          >
            {diagnoseDoubaoSmallAPI.isPending ? "诊断中..." : "诊断豆包小模型"}
          </button>
        </div>

        {/* 诊断结果 */}
        {diagnoseDoubaoSmallAPI.data && (
          <div className="p-4 bg-gray-50 rounded border">
            <h3 className="font-medium mb-2 text-sm">豆包小模型诊断结果</h3>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(diagnoseDoubaoSmallAPI.data, null, 2)}
            </pre>
          </div>
        )}

        {/* 说明信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="text-blue-500 mt-0.5">💡</div>
            <div className="space-y-1">
              <p className="font-medium text-sm">服务说明</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                <li>绿色表示服务可用，红色表示服务不可用或配置缺失</li>
                <li>点击"刷新状态"可重新检查所有服务的可用性</li>
                <li>豆包小模型诊断会检查配置、网络连通性和API响应</li>
                <li>如果服务不可用，请检查环境变量配置是否完整</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


interface PlatformConfig {
  name: string
  domains: string[]
  urlPatterns: string[]
  contentTypes: string[]
  requiresAuth: boolean
  downloadMethod: string
  note?: string
}

interface PlatformStats {
  totalPlatforms: number
  platformsByType: Record<string, number>
  authRequiredCount: number
}

/**
 * 支持的平台组件
 */
function PlatformsSection(): React.ReactElement {
  // 从配置中计算平台信息和统计
  const { platforms, stats } = useMemo(() => {
    const platformEntries = Object.entries(platformsConfig as Record<string, PlatformConfig>)
    const platformList = platformEntries.map(([key, config]) => ({
      ...config,
      id: key
    }))

    // 计算统计信息
    const platformsByType: Record<string, number> = {}
    let authRequiredCount = 0

    for (const platform of platformList) {
      // 统计内容类型
      if (platform.contentTypes) {
        for (const contentType of platform.contentTypes) {
          platformsByType[contentType] = (platformsByType[contentType] || 0) + 1
        }
      }
      
      // 统计需要认证的平台
      if (platform.requiresAuth) {
        authRequiredCount++
      }
    }

    const stats: PlatformStats = {
      totalPlatforms: platformList.length,
      platformsByType,
      authRequiredCount
    }

    return { platforms: platformList, stats }
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>平台配置</CardTitle>
          <CardDescription>
            查看当前支持的内容平台配置信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 统计信息 */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border p-6">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalPlatforms}
                </div>
                <div className="text-sm text-gray-500">支持的平台数量</div>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <div className="text-2xl font-bold text-green-600">
                  {stats.authRequiredCount}
                </div>
                <div className="text-sm text-gray-500">需要认证的平台</div>
              </div>
              
              <div className="bg-white rounded-lg border p-6">
                <div className="text-sm text-gray-500 mb-2">支持的内容类型</div>
                <div className="space-y-1">
                  {Object.entries(stats.platformsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="capitalize">{type}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 平台列表 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              已注册的平台
            </h3>
            
            {platforms.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                暂无已注册的平台
              </div>
            ) : (
              <div className="space-y-4">
                {platforms.map((platform) => (
                  <div key={platform.name} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 capitalize">
                          {platform.name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            platform.requiresAuth 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {platform.requiresAuth ? '需要认证' : '无需认证'}
                          </span>
                          <span className="text-sm text-gray-500">
                            支持 {platform.contentTypes.join(', ')} 内容
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          支持的域名
                        </h4>
                        <div className="space-y-1">
                          {platform.domains.map((domain: string) => (
                            <div key={domain} className="text-gray-600">
                              • {domain}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          内容类型
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {platform.contentTypes.map((type: string) => (
                            <span 
                              key={type}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 配置文件信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <div className="text-blue-500 mt-0.5">📋</div>
              <div className="space-y-2">
                <p className="font-medium text-sm">配置信息</p>
                <div className="text-xs text-gray-600 space-y-2">
                  <div>
                    <strong>平台配置文件：</strong> 
                    <code className="ml-1 px-2 py-1 bg-blue-100 rounded text-xs">
                      src/config/platforms.json
                    </code>
                  </div>
                  <div>
                    <strong>平台实现代码：</strong> 
                    <code className="ml-1 px-2 py-1 bg-blue-100 rounded text-xs">
                      src/lib/platforms/
                    </code>
                  </div>
                  <div className="mt-3">
                    <strong>添加新平台的步骤：</strong>
                    <ol className="mt-2 ml-4 list-decimal space-y-1">
                      <li>在 <code className="px-1 bg-blue-100 rounded text-xs">src/lib/platforms/</code> 下创建新平台目录</li>
                      <li>实现 <code className="px-1 bg-blue-100 rounded text-xs">IPlatform</code> 接口</li>
                      <li>在 <code className="px-1 bg-blue-100 rounded text-xs">src/lib/platforms/index.ts</code> 中注册平台</li>
                      <li>更新 <code className="px-1 bg-blue-100 rounded text-xs">src/config/platforms.json</code> 配置文件（可选）</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type DatabaseBackupSectionProps = {
  showToast: (message: string, tone?: 'default' | 'success' | 'error') => void
}

function DatabaseBackupSection({ showToast }: DatabaseBackupSectionProps): React.ReactElement {
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false)
  const [restoreType, setRestoreType] = useState<'database-only' | 'full'>('database-only')
  const [isUploading, setIsUploading] = useState(false)
  const [includeMedia, setIncludeMedia] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // 获取完整备份信息（包含媒体文件统计）
  const { data: fullBackupInfo, refetch: refetchFullBackupInfo } = api.databaseBackup.getFullBackupInfo.useQuery()

  // 获取基础备份信息（向后兼容）
  const { data: backupInfo, refetch: refetchBackupInfo } = api.databaseBackup.getBackupInfo.useQuery()

  // 备份操作
  const createBackupMutation = api.databaseBackup.createBackup.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        showToast(data.message, 'success')
        void refetchBackupInfo()
      } else {
        showToast(data.message || '备份失败', 'error')
      }
    },
    onError: (error) => {
      showToast(error.message || '备份失败', 'error')
    },
  })

  // 恢复操作
  const restoreBackupMutation = api.databaseBackup.restoreBackup.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        showToast(data.message, 'success')
        void refetchBackupInfo()
      } else {
        showToast(data.message || '恢复失败', 'error')
      }
    },
    onError: (error) => {
      showToast(error.message || '恢复失败', 'error')
    },
  })

  // 删除备份操作
  const deleteBackupMutation = api.databaseBackup.deleteBackup.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        showToast(data.message, 'success')
        void refetchBackupInfo()
        void refetchFullBackupInfo()
      } else {
        showToast(data.message || '删除失败', 'error')
      }
    },
    onError: (error) => {
      showToast(error.message || '删除失败', 'error')
    },
  })

  // 删除完整备份操作
  const deleteFullBackupMutation = api.databaseBackup.deleteFullBackup.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        showToast(data.message, 'success')
        void refetchFullBackupInfo()
      } else {
        showToast(data.message || '删除失败', 'error')
      }
    },
    onError: (error) => {
      showToast(error.message || '删除失败', 'error')
    },
  })

  const handleCreateBackup = async () => {
    if (!includeMedia) {
      // 仅备份数据库
      createBackupMutation.mutate()
    } else {
      // 创建完整备份（包含媒体）
      setIsCreating(true)
      try {
        const response = await fetch('/api/admin/database/create-full-backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ includeMedia: true }),
        })

        const data = await response.json()

        if (data.success) {
          showToast(data.message, 'success')
          void refetchFullBackupInfo()
        } else {
          showToast(data.message || '创建完整备份失败', 'error')
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : '创建完整备份失败', 'error')
      } finally {
        setIsCreating(false)
      }
    }
  }

  const handleRestoreBackup = (type: 'database-only' | 'full') => {
    setRestoreType(type)
    setIsRestoreConfirmOpen(true)
  }

  const confirmRestoreBackup = async () => {
    setIsRestoreConfirmOpen(false)

    if (restoreType === 'database-only') {
      restoreBackupMutation.mutate()
    } else {
      // 恢复完整备份
      try {
        const response = await fetch('/api/admin/database/restore-full-backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ backupType: 'full' }),
        })

        const data = await response.json()

        if (data.success) {
          showToast(data.message, 'success')
          void refetchFullBackupInfo()
        } else {
          showToast(data.message || '恢复完整备份失败', 'error')
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : '恢复完整备份失败', 'error')
      }
    }
  }

  const handleDeleteBackup = () => {
    deleteBackupMutation.mutate()
  }

  const handleDeleteFullBackup = () => {
    deleteFullBackupMutation.mutate()
  }

  const handleDownloadBackup = (type: 'database' | 'full') => {
    const url = `/api/admin/database/download-backup?type=${type}`
    window.location.href = url
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.db') && !fileName.endsWith('.backup') && !fileName.endsWith('.sqlite')) {
      showToast('文件类型不正确，请上传 .db、.backup 或 .sqlite 文件', 'error')
      event.target.value = ''
      return
    }

    // 验证文件大小（100MB）
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      showToast(`文件过大，最大支持 100MB（当前: ${(file.size / 1024 / 1024).toFixed(2)} MB）`, 'error')
      event.target.value = ''
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/database/upload-backup', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        showToast(data.message, 'success')
        void refetchBackupInfo()
      } else {
        showToast(data.message || '上传失败', 'error')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '上传失败', 'error')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🗄️ 数据库备份管理（增强版）</CardTitle>
        <CardDescription>
          手动备份和恢复 SQLite 数据库及媒体文件，防止数据意外丢失。支持仅数据库备份或包含媒体的完整备份。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 数据统计显示 */}
        {fullBackupInfo?.success && fullBackupInfo.data && (
          <div className="space-y-4">
            {/* 当前数据统计 */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-900">当前数据统计</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600 font-medium">数据库</p>
                    <p className="text-blue-900 text-lg">{fullBackupInfo.data.database.formattedSize}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium">媒体上传</p>
                    <p className="text-blue-900 text-lg">{fullBackupInfo.data.mediaDirectories.uploads.formattedSize}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium">缩略图</p>
                    <p className="text-blue-900 text-lg">{fullBackupInfo.data.mediaDirectories.thumbnails.formattedSize}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium">导出文件</p>
                    <p className="text-blue-900 text-lg">{fullBackupInfo.data.mediaDirectories.exports.formattedSize}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium">总计</p>
                    <p className="text-blue-900 text-lg font-bold">{fullBackupInfo.data.totalSizes.formattedAllData}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 备份文件显示 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 数据库备份 */}
              <Card className={fullBackupInfo.data.dbBackup.exists ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-green-900">数据库备份</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    {fullBackupInfo.data.dbBackup.exists ? (
                      <>
                        <p className="text-green-700">
                          <span className="font-medium">大小:</span> {fullBackupInfo.data.dbBackup.formattedSize}
                        </p>
                        <p className="text-green-700">
                          <span className="font-medium">创建时间:</span>{' '}
                          {fullBackupInfo.data.dbBackup.createdAt ? new Date(fullBackupInfo.data.dbBackup.createdAt).toLocaleString() : '未知'}
                        </p>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadBackup('database')}
                            className="text-xs"
                          >
                            下载
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreBackup('database-only')}
                            className="text-xs"
                          >
                            恢复
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDeleteBackup}
                            className="text-xs text-red-600"
                          >
                            删除
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500">暂无数据库备份</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 完整备份 */}
              <Card className={fullBackupInfo.data.fullBackup.exists ? "border-purple-200 bg-purple-50" : "border-gray-200 bg-gray-50"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-purple-900">完整备份（含媒体）</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    {fullBackupInfo.data.fullBackup.exists ? (
                      <>
                        <p className="text-purple-700">
                          <span className="font-medium">大小:</span> {fullBackupInfo.data.fullBackup.formattedSize}
                        </p>
                        <p className="text-purple-700">
                          <span className="font-medium">创建时间:</span>{' '}
                          {fullBackupInfo.data.fullBackup.createdAt ? new Date(fullBackupInfo.data.fullBackup.createdAt).toLocaleString() : '未知'}
                        </p>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadBackup('full')}
                            className="text-xs"
                          >
                            下载
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestoreBackup('full')}
                            className="text-xs"
                          >
                            恢复
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDeleteFullBackup}
                            className="text-xs text-red-600"
                          >
                            删除
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500">暂无完整备份</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 创建备份区域 */}
        <Card className="border-indigo-200 bg-indigo-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-indigo-900">创建新备份</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 包含媒体开关 */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-indigo-900 font-medium">
                  包含媒体文件（media-uploads, media-thumbnails, exports等）
                </span>
              </label>
            </div>

            {includeMedia && (
              <div className="text-xs text-indigo-700 bg-indigo-100 p-2 rounded">
                将创建完整备份（tar.gz格式），包含数据库和所有媒体文件。
                预计大小: {fullBackupInfo?.data?.totalSizes.formattedAllData || '计算中...'}
              </div>
            )}

            <Button
              onClick={handleCreateBackup}
              disabled={isCreating || createBackupMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 w-full"
            >
              {isCreating || createBackupMutation.isPending ? (
                includeMedia ? '正在创建完整备份...' : '备份中...'
              ) : (
                includeMedia ? '📦 创建完整备份' : '📦 仅备份数据库'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 其他操作按钮 */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {isUploading ? '上传中...' : '📤 上传备份文件'}
          </Button>

          <Button
            onClick={() => {
              void refetchBackupInfo()
              void refetchFullBackupInfo()
            }}
            variant="ghost"
            size="sm"
          >
            🔄 刷新状态
          </Button>
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".db,.backup,.sqlite"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* 恢复确认对话框 */}
        {isRestoreConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-red-600">⚠️ 恢复备份确认</CardTitle>
                <CardDescription>
                  {restoreType === 'full' ? '确认要恢复完整备份吗？' : '确认要恢复数据库备份吗？'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-medium mb-2">恢复操作将会：</p>
                  <ul className="list-disc list-inside space-y-1">
                    {restoreType === 'full' ? (
                      <>
                        <li>将当前数据库和所有媒体文件完全替换为备份状态</li>
                        <li>包括 media-uploads、media-thumbnails、exports 等所有目录</li>
                        <li>备份后产生的所有数据和文件将丢失</li>
                        <li>操作完成后需要刷新页面</li>
                      </>
                    ) : (
                      <>
                        <li>将当前数据库完全替换为备份状态</li>
                        <li>不影响媒体文件</li>
                        <li>备份后产生的数据库记录将丢失</li>
                        <li>操作完成后需要刷新页面</li>
                      </>
                    )}
                  </ul>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>强烈建议：</strong> 恢复前先创建当前状态的备份！
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => setIsRestoreConfirmOpen(false)}
                    variant="outline"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={confirmRestoreBackup}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    确认恢复
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 操作结果提示 */}
        {backupInfo?.success === false && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-medium">获取备份信息失败</p>
            <p>{backupInfo.message}</p>
          </div>
        )}

        {/* 使用说明 */}
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <div className="text-blue-500 mt-0.5">💡</div>
            <div className="space-y-2">
              <p className="font-medium">使用说明</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li><strong>数据库备份：</strong>仅备份 SQLite 数据库文件（约10MB）</li>
                <li><strong>完整备份：</strong>备份数据库 + 所有媒体文件（包括上传、缩略图、导出等）</li>
                <li><strong>下载备份：</strong>将备份文件下载到本地保存</li>
                <li><strong>恢复备份：</strong>用备份文件替换当前数据（需要确认）</li>
                <li><strong>删除备份：</strong>删除服务器上的备份文件释放存储空间</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="font-medium text-blue-900 mb-1">两种备份模式对比：</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                  <div>
                    <p className="font-semibold">数据库备份</p>
                    <ul className="list-disc list-inside">
                      <li>速度快（秒级）</li>
                      <li>文件小（~10MB）</li>
                      <li>仅包含数据记录</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold">完整备份</p>
                    <ul className="list-disc list-inside">
                      <li>耗时较长（分钟级）</li>
                      <li>文件大（GB级别）</li>
                      <li>包含所有数据和文件</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="font-medium text-blue-900 mb-1">最佳实践：</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>日常备份：使用数据库备份（快速、频繁）</li>
                  <li>迁移服务器：使用完整备份（包含所有文件）</li>
                  <li>重大更新前：创建完整备份并下载到本地</li>
                  <li>定期下载：重要备份文件应下载到本地多处保存</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* 安全警告 */}
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <div className="flex items-start gap-2">
            <div className="text-yellow-600 mt-0.5">⚠️</div>
            <div className="space-y-1">
              <p className="font-medium">安全提醒</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                <li>备份文件存储在服务器本地，务必定期下载到本地多处保存</li>
                <li>恢复操作不可逆，执行前请三思并先创建当前状态的备份</li>
                <li>完整备份包含敏感数据（cookies等），请妥善保管备份文件</li>
                <li>恢复完整备份会清空并替换所有媒体目录，确保备份是最新的</li>
                <li>恢复后必须刷新页面重新连接数据库</li>
                <li>如果媒体文件很大（GB级），完整备份和恢复将耗时较长</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 技术说明 */}
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <div className="text-gray-500 mt-0.5">ℹ️</div>
            <div className="space-y-1">
              <p className="font-medium">技术说明</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>数据库备份格式：</strong> SQLite 数据库文件（.db.backup）</li>
                <li><strong>完整备份格式：</strong> tar.gz 压缩包（full-backup.tar.gz）</li>
                <li><strong>包含目录：</strong> media-uploads, media-thumbnails, exports, cookies, temp</li>
                <li><strong>备份存储位置：</strong> data/ 目录下</li>
                <li><strong>恢复机制：</strong> 自动创建临时备份，失败时自动回滚</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 代理配置部分
 */
function ProxyConfigSection({ showToast }: { showToast: (message: string, tone?: "default" | "success" | "error") => void }): React.ReactElement {
  const { data: proxyConfigs, refetch } = api.proxy.getAllConfigs.useQuery()
  const setProxyConfig = api.proxy.setConfig.useMutation()
  const testConnection = api.proxy.testConnection.useMutation()

  const [aiGenerationEnabled, setAiGenerationEnabled] = useState(false)
  const [aiGenerationHost, setAiGenerationHost] = useState("127.0.0.1")
  const [aiGenerationPort, setAiGenerationPort] = useState(7890)

  const [googleApiEnabled, setGoogleApiEnabled] = useState(false)
  const [googleApiHost, setGoogleApiHost] = useState("127.0.0.1")
  const [googleApiPort, setGoogleApiPort] = useState(7890)

  // 同步服务器数据到本地状态
  useEffect(() => {
    if (proxyConfigs) {
      setAiGenerationEnabled(proxyConfigs.aiGeneration.enabled)
      setAiGenerationHost(proxyConfigs.aiGeneration.host || "127.0.0.1")
      setAiGenerationPort(proxyConfigs.aiGeneration.port || 7890)

      setGoogleApiEnabled(proxyConfigs.googleApi.enabled)
      setGoogleApiHost(proxyConfigs.googleApi.host || "127.0.0.1")
      setGoogleApiPort(proxyConfigs.googleApi.port || 7890)
    }
  }, [proxyConfigs])

  const handleSaveAiGeneration = async () => {
    try {
      await setProxyConfig.mutateAsync({
        type: "AI_GENERATION",
        enabled: aiGenerationEnabled,
        host: aiGenerationHost,
        port: aiGenerationPort,
      })
      await refetch()
      showToast("AI生成代理配置已保存", "success")
    } catch (error) {
      showToast("保存失败: " + (error instanceof Error ? error.message : "未知错误"), "error")
    }
  }

  const handleSaveGoogleApi = async () => {
    try {
      await setProxyConfig.mutateAsync({
        type: "GOOGLE_API",
        enabled: googleApiEnabled,
        host: googleApiHost,
        port: googleApiPort,
      })
      await refetch()
      showToast("Google API代理配置已保存", "success")
    } catch (error) {
      showToast("保存失败: " + (error instanceof Error ? error.message : "未知错误"), "error")
    }
  }

  const handleTestConnection = async (host: string, port: number) => {
    try {
      const result = await testConnection.mutateAsync({ host, port })
      if (result.success) {
        showToast(result.message, "success")
      } else {
        showToast(result.message, "error")
      }
    } catch (error) {
      showToast("测试失败: " + (error instanceof Error ? error.message : "未知错误"), "error")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI生成服务代理配置</CardTitle>
          <CardDescription>
            配置AI生成服务（图像、视频、音频等）的HTTP代理，用于访问国际API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="ai-generation-proxy-enabled"
              checked={aiGenerationEnabled}
              onChange={(e) => setAiGenerationEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <label htmlFor="ai-generation-proxy-enabled" className="text-sm font-medium">
              启用代理
            </label>
          </div>

          {aiGenerationEnabled && (
            <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    代理主机
                  </label>
                  <input
                    type="text"
                    value={aiGenerationHost}
                    onChange={(e) => setAiGenerationHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    代理端口
                  </label>
                  <input
                    type="number"
                    value={aiGenerationPort}
                    onChange={(e) => setAiGenerationPort(parseInt(e.target.value) || 7890)}
                    placeholder="7890"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestConnection(aiGenerationHost, aiGenerationPort)}
                  disabled={testConnection.isPending}
                >
                  {testConnection.isPending ? "测试中..." : "测试连接"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSaveAiGeneration}
              disabled={setProxyConfig.isPending}
            >
              {setProxyConfig.isPending ? "保存中..." : "保存配置"}
            </Button>
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">ℹ️</div>
              <div className="space-y-1">
                <p className="font-medium">应用范围</p>
                <p className="text-blue-700">
                  此代理配置将应用于所有AI生成服务，包括：
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 ml-4">
                  <li>AI生成独立页面 (/admin/ai-generation)</li>
                  <li>Studio镜头制作页面 (图像/视频生成)</li>
                  <li>所有第三方AI平台API调用</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google API代理配置</CardTitle>
          <CardDescription>
            配置Google服务（STT、Gemini等）的HTTP代理
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="google-api-proxy-enabled"
              checked={googleApiEnabled}
              onChange={(e) => setGoogleApiEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <label htmlFor="google-api-proxy-enabled" className="text-sm font-medium">
              启用代理
            </label>
          </div>

          {googleApiEnabled && (
            <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    代理主机
                  </label>
                  <input
                    type="text"
                    value={googleApiHost}
                    onChange={(e) => setGoogleApiHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    代理端口
                  </label>
                  <input
                    type="number"
                    value={googleApiPort}
                    onChange={(e) => setGoogleApiPort(parseInt(e.target.value) || 7890)}
                    placeholder="7890"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestConnection(googleApiHost, googleApiPort)}
                  disabled={testConnection.isPending}
                >
                  {testConnection.isPending ? "测试中..." : "测试连接"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSaveGoogleApi}
              disabled={setProxyConfig.isPending}
            >
              {setProxyConfig.isPending ? "保存中..." : "保存配置"}
            </Button>
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <div className="text-blue-600 mt-0.5">ℹ️</div>
              <div className="space-y-1">
                <p className="font-medium">应用范围</p>
                <p className="text-blue-700">
                  此代理配置将应用于Google服务，包括：
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 ml-4">
                  <li>Google Speech-to-Text API</li>
                  <li>Google Cloud Storage</li>
                  <li>Google Gemini API (如果使用)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>代理配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-neutral-700">
            <h4 className="font-medium text-neutral-900">常见代理软件端口：</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Clash: 7890 (HTTP), 7891 (SOCKS5)</li>
              <li>V2Ray: 10809 (HTTP), 10808 (SOCKS5)</li>
              <li>Shadowsocks: 1080 (SOCKS5)</li>
              <li>代理池: 自定义端口</li>
            </ul>
          </div>

          <div className="space-y-2 text-sm text-neutral-700">
            <h4 className="font-medium text-neutral-900">配置优先级：</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>数据库配置（此页面设置）优先级最高</li>
              <li>环境变量配置（.env文件）作为fallback</li>
              <li>未配置时不使用代理</li>
            </ul>
          </div>

          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            <div className="flex items-start gap-2">
              <div className="text-yellow-600 mt-0.5">⚠️</div>
              <div className="space-y-1">
                <p className="font-medium">注意事项</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700 ml-2">
                  <li>代理配置立即生效，无需重启服务</li>
                  <li>请确保代理服务器运行正常</li>
                  <li>建议先使用"测试连接"功能验证代理可用性</li>
                  <li>代理失败时会自动回退到直连</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

