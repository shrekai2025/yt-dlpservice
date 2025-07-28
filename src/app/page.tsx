export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          YT-DLP Service
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          在线视频内容提取工具
        </p>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-4">支持的功能</h2>
          <ul className="text-left space-y-2">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              YouTube 视频下载
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              B站视频下载
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              音频提取
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              语音转文字
            </li>
          </ul>
          <div className="mt-6">
            <a 
              href="/admin" 
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              进入管理面板
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 