"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '~/lib/utils/cn'

type NavKey = 'tasks' | 'info-fetch' | 'standalone-stt' | 'generation' | 'storage' | 'config-tools' | 'docs'

const NAV_ITEMS: Array<{ key: NavKey; label: string; href: string }> = [
  { key: 'tasks', label: '音视频STT', href: '/admin' },
  { key: 'info-fetch', label: '信息获取', href: '/admin/info-fetch' },
  { key: 'standalone-stt', label: '独立STT', href: '/admin/standalone-stt' },
  { key: 'generation', label: 'AI生成', href: '/admin/generation/providers' },
  { key: 'storage', label: 'S3存储', href: '/admin/storage' },
  { key: 'config-tools', label: '配置与工具', href: '/admin/config-tools' },
  { key: 'docs', label: 'API文档', href: '/admin/api-doc' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const inferredKey: NavKey = useMemo(() => {
    if (pathname === '/admin/config-tools') return 'config-tools'
    if (pathname === '/admin/info-fetch') return 'info-fetch'
    if (pathname === '/admin/standalone-stt') return 'standalone-stt'
    if (pathname.startsWith('/admin/generation')) return 'generation'
    if (pathname === '/admin/storage') return 'storage'
    if (pathname === '/admin/api-doc') return 'docs'
    return 'tasks'
  }, [pathname])

  const [active, setActive] = useState<NavKey>(inferredKey)

  useEffect(() => {
    setActive(inferredKey)
  }, [inferredKey])

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wider text-neutral-900">多媒体工作站</span>
              <span className="text-xs text-neutral-500">原yt-dlpservice</span>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setActive(item.key)}
                className={cn(
                  'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors',
                  active === item.key
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10" role="main">
        {children}
      </main>
    </div>
  )
}
