"use client"

import { useMemo } from "react"
// 导入平台配置（而不是runtime registry）
import platformsConfig from "~/config/platforms.json"

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

export default function PlatformsPage() {
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
    <div className="container mx-auto px-4">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">平台配置</h1>
          <p className="text-gray-600 mt-2">
            查看当前支持的内容平台配置信息
          </p>
        </div>

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
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              已注册的平台
            </h2>
          </div>
          
          <div className="p-6">
            {platforms.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                暂无已注册的平台
              </div>
            ) : (
              <div className="space-y-6">
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
        </div>

        {/* 配置文件信息 */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            📋 配置信息
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <div>
              <strong>平台配置文件：</strong> 
              <code className="ml-1 px-2 py-1 bg-blue-100 rounded">
                src/config/platforms.json
              </code>
            </div>
            <div>
              <strong>平台实现代码：</strong> 
              <code className="ml-1 px-2 py-1 bg-blue-100 rounded">
                src/lib/platforms/
              </code>
            </div>
            <div className="mt-4">
              <strong>添加新平台的步骤：</strong>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li>在 <code>src/lib/platforms/</code> 下创建新平台目录</li>
                <li>实现 <code>IPlatform</code> 接口</li>
                <li>在 <code>src/lib/platforms/index.ts</code> 中注册平台</li>
                <li>更新 <code>src/config/platforms.json</code> 配置文件（可选）</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 