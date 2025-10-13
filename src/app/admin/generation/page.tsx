"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GenerationPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/generation/unigen-ui')
  }, [router])

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-neutral-500">正在跳转到 UniGen UI...</div>
    </div>
  )
}
