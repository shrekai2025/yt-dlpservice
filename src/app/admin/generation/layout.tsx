"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '~/lib/utils/cn'

type GenNavKey = 'providers' | 'requests' | 'api-keys' | 'unigen'

const GEN_NAV_ITEMS: Array<{ key: GenNavKey; label: string; href: string }> = [
  { key: 'providers', label: '供应商', href: '/admin/generation/providers' },
  { key: 'requests', label: '生成记录', href: '/admin/generation/requests' },
  { key: 'api-keys', label: 'API密钥', href: '/admin/generation/api-keys' },
  { key: 'unigen', label: 'UniGen UI', href: '/admin/generation/unigen-ui' },
]

export default function GenerationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const inferredKey: GenNavKey = useMemo(() => {
    if (pathname.includes('/providers')) return 'providers'
    if (pathname.includes('/requests')) return 'requests'
    if (pathname.includes('/api-keys')) return 'api-keys'
    if (pathname.includes('/unigen-ui')) return 'unigen'
    return 'providers'
  }, [pathname])

  const [active, setActive] = useState<GenNavKey>(inferredKey)

  useEffect(() => {
    setActive(inferredKey)
  }, [inferredKey])

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex gap-1">
          {GEN_NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setActive(item.key)}
              className={cn(
                'inline-flex items-center border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                active === item.key
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Content */}
      {children}
    </div>
  )
}
