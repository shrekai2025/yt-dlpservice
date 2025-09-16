# 豆包小模型STT API使用示例

## 📋 API接口总览

### 1. 配置管理API (tRPC)

| 接口名称 | 描述 | 输入参数 | 返回值 |
|---------|------|---------|-------|
| `config.testVoiceService` | 测试语音服务 | `{provider?: "doubao-small"}` | 服务状态信息 |
| `config.testDoubaoSmallAPI` | 测试豆包小模型API | `{audioData: string, fileName: string}` | 转录结果 |
| `config.diagnoseDoubaoSmallAPI` | 诊断豆包小模型服务 | 无 | 诊断信息 |
| `config.getAllVoiceServiceStatus` | 获取所有语音服务状态 | 无 | 所有服务状态列表 |

## 🔧 管理界面使用

### 1. 访问管理界面

```
http://localhost:3000/admin/tools
```

### 2. 语音服务状态总览

在管理界面中，你可以看到：

- ✅ **豆包语音服务** (doubao) - 原有豆包API
- ✅ **豆包录音文件识别（小模型版）** (doubao-small) - 新增服务  
- ✅ **Google Speech-to-Text** (google) - Google STT服务
- ⏳ **通义听悟** (tingwu) - 计划中

### 3. 测试音频文件

1. **选择音频文件**：支持 MP3, WAV, M4A 等格式
2. **点击"测试豆包小模型"**：直接测试新的API
3. **查看测试结果**：转录文本和详细信息

## 💻 代码示例

### 1. React/Next.js 中使用 tRPC

```typescript
import { api } from "~/components/providers/trpc-provider"

function VoiceServiceComponent() {
  // 获取所有语音服务状态
  const { data: servicesStatus } = api.config.getAllVoiceServiceStatus.useQuery()
  
  // 测试豆包小模型API
  const testDoubaoSmall = api.config.testDoubaoSmallAPI.useMutation()
  
  // 诊断豆包小模型服务
  const diagnoseDoubaoSmall = api.config.diagnoseDoubaoSmallAPI.useMutation()

  const handleTest = async (audioFile: File) => {
    // 转换文件为Base64
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string
      const base64 = base64Data.split(',')[1] // 移除data:audio前缀
      
      try {
        const result = await testDoubaoSmall.mutateAsync({
          audioData: base64,
          fileName: audioFile.name
        })
        
        if (result.success) {
          console.log('转录结果:', result.data.transcription)
        }
      } catch (error) {
        console.error('测试失败:', error)
      }
    }
    reader.readAsDataURL(audioFile)
  }

  const handleDiagnose = async () => {
    try {
      const result = await diagnoseDoubaoSmall.mutateAsync()
      console.log('诊断结果:', result.data)
    } catch (error) {
      console.error('诊断失败:', error)
    }
  }

  return (
    <div>
      {/* 服务状态显示 */}
      {servicesStatus?.success && (
        <div className="grid grid-cols-2 gap-4">
          {servicesStatus.data.map((service) => (
            <div key={service.provider} className={`p-4 rounded ${
              service.available ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <h3>{service.name}</h3>
              <p>{service.message}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* 测试按钮 */}
      <input 
        type="file" 
        accept="audio/*" 
        onChange={(e) => e.target.files?.[0] && handleTest(e.target.files[0])}
      />
      <button onClick={handleDiagnose}>诊断服务</button>
    </div>
  )
}
```

### 2. 直接调用示例（Node.js/服务端）

```typescript
import doubaoSmallSTTService from '~/lib/services/doubao-small-stt'

async function testDoubaoSmallService() {
  try {
    // 1. 检查服务状态
    const status = await doubaoSmallSTTService.checkServiceStatus()
    console.log('服务状态:', status)
    
    if (!status.available) {
      throw new Error(`服务不可用: ${status.message}`)
    }
    
    // 2. 进行语音转录
    const audioPath = '/path/to/audio.mp3'
    const transcription = await doubaoSmallSTTService.speechToText(audioPath)
    console.log('转录结果:', transcription)
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}
```

## 🚀 实际应用场景

### 1. 视频转录任务

当创建任务时设置语音服务提供商为 `doubao-small`：

```typescript
// 在环境变量中设置
VOICE_SERVICE_PROVIDER="doubao-small"

// 或在数据库配置中设置
await ConfigManager.set({
  key: 'VOICE_SERVICE_PROVIDER',
  value: 'doubao-small'
})
```

### 2. 外部API调用

```bash
# 创建使用豆包小模型的任务
curl -X POST http://localhost:3000/api/external/tasks \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.xiaoyuzhoufm.com/episode/example",
    "downloadType": "AUDIO_ONLY",
    "compressionPreset": "standard"
  }'
```

## 🔍 调试和排错

### 1. 检查服务状态

在管理界面中点击"刷新状态"或"诊断豆包小模型"查看详细状态信息。

### 2. 查看日志

```bash
# 检查应用日志
tail -f logs/app.log

# 或在Next.js控制台中查看实时日志
```

### 3. 常见问题解决

#### ❌ TOS上传失败
- 检查TOS访问密钥是否正确
- 确认网络连接正常
- 验证音频文件格式和大小

#### ❌ 豆包API认证失败  
- 确认TOKEN是否最新有效
- 检查APP_ID和CLUSTER配置
- 验证Authorization header格式

#### ❌ 音频格式不支持
- 转换为MP3格式
- 确保文件大小<512MB
- 检查音频时长<5小时

## 📚 相关文档

- [豆包小模型STT使用指南](./DOUBAO_SMALL_STT_GUIDE.md)
- [API完整文档](./src/app/admin/api-doc/page.tsx)
- [环境变量配置](./README.md#环境变量配置)

## 🎯 性能建议

1. **文件压缩**：对于大音频文件，建议使用压缩预设
2. **批量处理**：避免同时进行多个大文件转录
3. **错误重试**：网络异常时系统会自动重试
4. **状态监控**：定期检查服务状态确保可用性
