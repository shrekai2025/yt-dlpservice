"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { cn } from '~/lib/utils/cn'

type NavGroup = {
  id: string
  label: string
  items: Array<{ id: string; label: string; href: string }>
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'ai-generation',
    label: 'AI生成',
    items: [
      { id: 'generation', label: '生成', href: '/admin/ai-generation' },
      { id: 'generation-tasks', label: '任务历史', href: '/admin/ai-generation/tasks' },
      { id: 'generation-providers', label: '供应商管理', href: '/admin/ai-generation/providers' },
    ],
  },
  {
    id: 'text-extraction',
    label: '文案提取',
    items: [
      { id: 'url2stt', label: 'URL2STT', href: '/admin' },
      { id: 'standalone-stt', label: '独立STT', href: '/admin/standalone-stt' },
      { id: 'info-fetch', label: '视频信息预览', href: '/admin/info-fetch' },
    ],
  },
  {
    id: 'file-library',
    label: '文件库',
    items: [
      { id: 'media-browser', label: '媒体浏览器', href: '/admin/media-browser' },
      { id: 'storage', label: 'AWS S3存储', href: '/admin/storage' },
    ],
  },
]

const SINGLE_NAV_ITEMS = [
  { id: 'config-tools', label: '运维工具', href: '/admin/config-tools' },
  { id: 'users', label: '用户管理', href: '/admin/users' },
  { id: 'api-doc', label: 'API文档', href: '/admin/api-doc' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // 推断当前展开的分组和激活的项
  const { activeGroup, activeItem } = useMemo(() => {
    // 首先收集所有的item及其所属group
    const allItems: Array<{ item: { id: string; href: string }; groupId: string | null }> = []

    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        allItems.push({ item, groupId: group.id })
      }
    }

    for (const item of SINGLE_NAV_ITEMS) {
      allItems.push({ item, groupId: null })
    }

    // 按照href长度降序排序，确保更长的路径先匹配
    allItems.sort((a, b) => b.item.href.length - a.item.href.length)

    // 找到第一个匹配的项
    for (const { item, groupId } of allItems) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        return { activeGroup: groupId, activeItem: item.id }
      }
    }

    return { activeGroup: null, activeItem: null }
  }, [pathname])

  // 展开状态管理
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(activeGroup ? [activeGroup] : [])
  )

  useEffect(() => {
    if (activeGroup) {
      setExpandedGroups((prev) => new Set([...prev, activeGroup]))
    }
  }, [activeGroup])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    try {
      setIsLoggingOut(true)
      await fetch('/api/logout', { method: 'POST' })
      router.replace('/')
      router.refresh()
    } catch (error) {
      console.error('Failed to logout:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white/95 pb-6 pt-8 max-h-screen overflow-y-auto">
        <div className="px-6">
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wider text-neutral-900">多媒体工作站</span>
            <span className="text-xs text-neutral-500">原yt-dlpservice</span>
          </div>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-0.5 px-3">
          {/* 分组导航 */}
          {NAV_GROUPS.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            return (
              <div key={group.id} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    activeGroup === group.id
                      ? 'bg-neutral-100 text-neutral-900'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900',
                  )}
                >
                  <span>{group.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-neutral-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-500" />
                  )}
                </button>
                {isExpanded && (
                  <div className="mt-0.5 space-y-0.5 pl-3">
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          'flex items-center rounded-md px-3 py-1.5 text-sm transition-colors',
                          activeItem === item.id
                            ? 'bg-neutral-900 text-white font-medium shadow-sm'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* 单独的导航项 */}
          {SINGLE_NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeItem === item.id
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-600"
          >
            {isLoggingOut ? '退出中...' : '退出登录'}
          </button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto px-8 py-10" role="main">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
