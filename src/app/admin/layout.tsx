"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState(() => {
    if (pathname === "/admin") return "tasks"
    if (pathname === "/admin/tools") return "tools"
    if (pathname === "/admin/api-doc") return "api-doc"
    if (pathname === "/admin/platforms") return "platforms"
    if (pathname === "/admin/tech-doc") return "tech-doc"
    return "tasks"
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">YT-DLP Service</h1>
            </div>
            
            {/* 导航标签 */}
            <div className="flex space-x-1">
              <Link
                href="/admin"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "tasks"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("tasks")}
              >
                任务管理
              </Link>
              <Link
                href="/admin/tools"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "tools"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("tools")}
              >
                实用工具
              </Link>
              <Link
                href="/admin/api-doc"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "api-doc"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("api-doc")}
              >
                API文档
              </Link>
              <Link
                href="/admin/platforms"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "platforms"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("platforms")}
              >
                平台配置
              </Link>
              <Link
                href="/admin/tech-doc"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "tech-doc"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("tech-doc")}
              >
                技术文档
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面内容 */}
      <main className="py-8">
        {children}
      </main>
    </div>
  )
} 