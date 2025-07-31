import axios, { type AxiosRequestConfig } from 'axios';
import * as fs from 'fs/promises';
import { env } from '~/env';
import { Logger } from '~/lib/utils/logger';
import { ConfigManager } from '~/lib/utils/config';
import { GlobalInit } from '~/lib/utils/global-init';

class DoubaoVoiceService {
  private static instance: DoubaoVoiceService;
  private appKey: string = '';
  private accessKey: string = '';
  private baseUrl: string = '';
  private isInitializing: boolean = false;

  private constructor() { 
    // 移除自动初始化，改为按需初始化
  }

  public static getInstance(): DoubaoVoiceService {
    if (!DoubaoVoiceService.instance) {
      DoubaoVoiceService.instance = new DoubaoVoiceService();
    }
    return DoubaoVoiceService.instance;
  }

  private async initialize() {
    // 尝试获取初始化权限
    if (!GlobalInit.tryInitializeDoubaoVoice()) {
      // 如果没有获取到权限，等待其他实例完成初始化
      await GlobalInit.waitForDoubaoVoice();
      return;
    }
    
    if (this.isInitializing) return;
    this.isInitializing = true;
    try {
      Logger.info('开始初始化豆包语音服务...');
      
      // 优先从数据库获取配置，失败时使用环境变量
      let dbAppKey = '';
      let dbAccessKey = '';
      let dbEndpoint = '';
      
      try {
        dbAppKey = await ConfigManager.get('doubao_app_key');
        Logger.debug(`从数据库获取 doubao_app_key: ${dbAppKey ? '已配置' : '未配置'}`);
      } catch { 
        Logger.debug('数据库中未找到 doubao_app_key，使用环境变量');
      }
      
      try {
        dbAccessKey = await ConfigManager.get('doubao_access_key');
        Logger.debug(`从数据库获取 doubao_access_key: ${dbAccessKey ? '已配置' : '未配置'}`);
      } catch { 
        Logger.debug('数据库中未找到 doubao_access_key，使用环境变量');
      }

      try {
        dbEndpoint = await ConfigManager.get('doubao_endpoint');
        Logger.debug(`从数据库获取 doubao_endpoint: ${dbEndpoint || '未配置'}`);
      } catch { 
        Logger.debug('数据库中未找到 doubao_endpoint，使用环境变量');
      }
      
      this.appKey = dbAppKey || env.DOUBAO_APP_KEY || '';
      this.accessKey = dbAccessKey || env.DOUBAO_ACCESS_KEY || '';
      
      const endpointValue = dbEndpoint || env.DOUBAO_ENDPOINT || 'openspeech.bytedance.com';
      this.baseUrl = endpointValue.replace(/^https?:\/\//, ''); // 移除协议头
      
      // 详细的配置状态日志
      Logger.info(`豆包API配置状态:`);
      Logger.info(`  - APP_KEY: ${this.appKey ? `已配置 (${this.appKey.substring(0, 8)}...)` : '❌ 未配置'}`);
      Logger.info(`  - ACCESS_KEY: ${this.accessKey ? `已配置 (${this.accessKey.substring(0, 8)}...)` : '❌ 未配置'}`);
      Logger.info(`  - ENDPOINT: ${this.baseUrl}`);
      Logger.info(`  - 环境变量 DOUBAO_APP_KEY: ${env.DOUBAO_APP_KEY ? '已配置' : '未配置'}`);
      Logger.info(`  - 环境变量 DOUBAO_ACCESS_KEY: ${env.DOUBAO_ACCESS_KEY ? '已配置' : '未配置'}`);
      
      if (!this.appKey || !this.accessKey) {
        Logger.error('❌ 豆包语音API密钥未配置，服务不可用！');
        Logger.error('请检查以下配置：');
        Logger.error('1. 环境变量 DOUBAO_APP_KEY 和 DOUBAO_ACCESS_KEY');
        Logger.error('2. 或在管理页面配置 doubao_app_key 和 doubao_access_key');
      } else {
        Logger.info('✅ 豆包语音API配置完成');
        GlobalInit.setDoubaoVoiceInitialized({
          appKey: this.appKey,
          accessKey: this.accessKey,
          endpoint: this.baseUrl
        });
      }
    } catch (error) {
      GlobalInit.setDoubaoVoiceInitializationFailed();
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async ensureInitialized() {
    if (GlobalInit.isDoubaoVoiceInitialized()) {
      // 全局已初始化，同步实例状态
      if (!this.appKey || !this.accessKey) {
        const savedData = GlobalInit.getDoubaoVoiceData();
        if (savedData && savedData.appKey && savedData.accessKey) {
          this.appKey = savedData.appKey;
          this.accessKey = savedData.accessKey;
          this.baseUrl = savedData.endpoint || 'openspeech.bytedance.com';
        }
      }
      return;
    }
    
    if ((!this.appKey || !this.accessKey) && !this.isInitializing) {
      await this.initialize();
    }
    if (!this.appKey || !this.accessKey) {
      throw new Error('豆包语音服务未初始化或配置不正确。');
    }
  }

  private generateRequestId(): string {
    return `yt-dlp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 提交音频任务到豆包API
   */
     async submitAudioTask(audioPath: string): Promise<string> {
     const startTime = Date.now()
     Logger.info(`🎤 开始提交音频到豆包API: ${audioPath}`)
     
     // 预定义变量，用于错误处理
     let timeoutSeconds = 600 // 默认10分钟
     
     try {
      // 检查音频文件是否存在
      const audioExists = await fs.access(audioPath, fs.constants.F_OK).then(() => true).catch(() => false)
      if (!audioExists) {
        throw new Error(`音频文件不存在: ${audioPath}`)
      }

      // 获取文件信息
      const stats = await fs.stat(audioPath)
      const audioSizeMB = Math.round((stats.size / 1024 / 1024) * 100) / 100

      Logger.info(`📊 音频文件信息:`)
      Logger.info(`  - 文件路径: ${audioPath}`)
      Logger.info(`  - 文件大小: ${audioSizeMB}MB (${stats.size} bytes)`)

      // 检查文件大小限制（豆包API限制512MB）
      if (stats.size > 512 * 1024 * 1024) {
        throw new Error(`音频文件过大 (${audioSizeMB}MB)，超过512MB限制。请使用音频压缩功能。`)
      }

      // 读取音频文件并转换为Base64
      Logger.info(`📖 正在读取音频文件...`)
      const audioBuffer = await fs.readFile(audioPath)
      
      // 确保Base64编码正确，不包含换行符
      const audioBase64 = audioBuffer.toString('base64').replace(/\n/g, '')
      
      Logger.info(`✅ 音频文件读取完成，Base64长度: ${audioBase64.length} 字符`)

             // 生成唯一请求ID
       const requestId = `yt-dlp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
       const submitUrl = `https://${this.baseUrl}/api/v3/auc/bigmodel/submit`

      Logger.info(`🔑 API认证信息:`)
      Logger.info(`  - APP_KEY: ${this.appKey ? `${this.appKey.substring(0, 8)}...` : '未配置'}`)
      Logger.info(`  - ACCESS_KEY: ${this.accessKey ? `${this.accessKey.substring(0, 8)}...` : '未配置'}`)
      
      // 检查音频大小是否超过建议限制
      if (audioSizeMB > 30) {
        Logger.warn(`⚠️ 音频文件过大 (${audioSizeMB}MB)，1M宽带上传可能需要很长时间`)
        Logger.warn(`  - 预计上传时间: ${Math.round(audioSizeMB * 8)}秒 (约${Math.round(audioSizeMB * 8 / 60)}分钟)`)
        Logger.warn(`  - 建议: 选择较短的视频片段 (<15分钟)`)
      } else if (audioSizeMB > 15) {
        Logger.warn(`⚠️ 音频文件较大 (${audioSizeMB}MB)，1M宽带上传较慢`)
        Logger.warn(`  - 预计上传时间: ${Math.round(audioSizeMB * 8)}秒`)
      }
      
      // 根据火山引擎豆包API文档格式构建请求体
      const requestBody = {
        user: {
          uid: "yt-dlp-service-user"
        },
        audio: {
          // 只保留必要的data字段，移除可能导致格式冲突的format字段
          data: audioBase64
        },
        request: {
          // 只保留必填的model_name，移除可能导致冲突的其他字段
          model_name: "bigmodel"
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        'X-Api-App-Key': this.appKey,
        'X-Api-Access-Key': this.accessKey,
        'X-Api-Resource-Id': 'volc.bigasr.auc',
        'X-Api-Request-Id': requestId,
        'X-Api-Sequence': '-1',
        // 添加标准的HTTP请求头
        'User-Agent': 'yt-dlp-service/1.0 (Ubuntu; Node.js)',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }

      // 打印详细的请求参数（调试用）
      Logger.info(`📋 豆包API请求参数详情:`)
      Logger.info(`  - 请求方法: POST`)
      Logger.info(`  - 请求URL: ${submitUrl}`)
      Logger.info(`  - 请求头:`)
      Object.entries(headers).forEach(([key, value]) => {
        if (key.includes('Key')) {
          Logger.info(`    ${key}: ${typeof value === 'string' ? value.substring(0, 8) + '...' : value}`)
        } else {
          Logger.info(`    ${key}: ${value}`)
        }
      })
      Logger.info(`  - 请求体结构:`)
      Logger.info(`    user.uid: ${requestBody.user.uid}`)
      Logger.info(`    audio.data: [Base64数据 ${audioBase64.length} 字符]`)
      Logger.info(`    request.model_name: ${requestBody.request.model_name}`)

             // 根据音频大小动态调整超时时间
       const baseTimeout = 120000 // 基础120秒
       let sizeTimeout = Math.max(audioSizeMB * 5000, 60000) // 每MB增加5秒，最小60秒
       
       // 对于大文件，增加额外缓冲时间
       if (audioSizeMB > 10) {
         sizeTimeout = Math.max(audioSizeMB * 8000, 120000) // 大文件每MB增加8秒
         Logger.info(`📡 检测到大文件，增加网络缓冲时间`)
       }
       
       // 最大超时时间限制为10分钟
       const finalTimeout = Math.min(baseTimeout + sizeTimeout, 600000)
       timeoutSeconds = Math.round(finalTimeout / 1000) // 更新用于错误处理

      const config: AxiosRequestConfig = {
        method: 'POST',
        url: submitUrl,
        headers,
        data: requestBody,
        timeout: finalTimeout,
        // 设置请求体大小限制
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        // 禁用自动重试，避免重复提交
        validateStatus: (status) => status < 500,
        // 添加响应类型
        responseType: 'json'
      }

      Logger.info(`⏱️ 请求超时设置: ${finalTimeout}ms (${Math.round(finalTimeout / 1000)}秒)`)
      Logger.info(`🚀 开始发送请求到豆包API...`)

      const response = await axios(config)
      const endTime = Date.now()
      const duration = endTime - startTime

      Logger.info(`📦 豆包API提交响应:`)
      Logger.info(`  - HTTP状态码: ${response.status}`)
      Logger.info(`  - 响应时间: ${duration}ms`)
      Logger.info(`  - 响应头:`, response.headers)

      // 检查HTTP状态码
      if (response.status !== 200) {
        Logger.error(`❌ HTTP状态码错误: ${response.status}`)
        Logger.error(`  - 响应数据:`, response.data)
        throw new Error(`HTTP请求失败: ${response.status} ${response.statusText}`)
      }

      const responseData = response.data
      Logger.info(`📋 响应数据结构:`, responseData)

      // 检查响应头中的状态码
      const apiStatusCode = response.headers['x-api-status-code']
      const apiMessage = response.headers['x-api-message']
      const apiRequestId = response.headers['x-api-request-id']

      Logger.info(`📋 豆包API响应头状态:`)
      Logger.info(`  - API状态码: ${apiStatusCode}`)
      Logger.info(`  - API消息: ${apiMessage}`)
      Logger.info(`  - API请求ID: ${apiRequestId}`)

      // 检查API状态码
      if (!apiStatusCode || apiStatusCode !== '20000000') {
        const errorMsg = apiMessage || '未知错误'
        Logger.error(`❌ 豆包API返回错误状态码: ${apiStatusCode}`)
        Logger.error(`  - 错误消息: ${errorMsg}`)
        throw new Error(`豆包API错误 (${apiStatusCode}): ${errorMsg}`)
      }

      // 从响应头中提取任务ID（豆包API通过x-api-request-id返回任务ID）
      const taskId = apiRequestId
      if (!taskId) {
        Logger.error(`❌ 响应头中未找到任务ID`)
        Logger.error(`  - 响应头:`, response.headers)
        throw new Error('豆包API响应头中缺少任务ID')
      }

      Logger.info(`✅ 音频任务提交成功!`)
      Logger.info(`  - 任务ID: ${taskId}`)
      Logger.info(`  - 请求ID: ${requestId}`)
      Logger.info(`  - 提交耗时: ${duration}ms`)

      return taskId

    } catch (error: any) {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      Logger.error(`💥 豆包API提交任务失败:`)
      Logger.error(`  - 错误类型: ${error.constructor.name}`)
      Logger.error(`  - 错误消息: ${error.message}`)
      Logger.error(`  - 请求耗时: ${duration}ms`)
      
      if (error.response) {
        Logger.error(`  - HTTP状态: ${error.response.status}`)
        Logger.error(`  - 响应数据:`, error.response.data)
        Logger.error(`  - 响应头:`, error.response.headers)
      } else if (error.request) {
        Logger.error(`  - 网络错误: 无响应`)
        Logger.error(`  - 请求配置:`, {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        })
      }
      
             // 根据错误类型提供更具体的错误信息
       if (error.code === 'ECONNABORTED') {
         throw new Error(`豆包API请求超时 (${timeoutSeconds}秒): 请检查网络连接或减小音频文件大小`)
       } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error(`豆包API连接失败: 请检查网络连接和API地址`)
      } else if (error.response?.status === 401) {
        throw new Error(`豆包API认证失败: 请检查APP_KEY和ACCESS_KEY配置`)
      } else if (error.response?.status === 413) {
        throw new Error(`音频文件过大: 豆包API不支持超过512MB的文件`)
      } else {
        throw new Error(`豆包API提交任务失败: ${error.message}`)
      }
    }
  }

  private async queryAudioTask(requestId: string): Promise<any> {
    await this.ensureInitialized();

    const queryUrl = `https://${this.baseUrl}/api/v3/auc/bigmodel/query`;
    
    // 根据API文档，查询接口使用空的请求体
    const requestBody = {}

    const headers = {
      'Content-Type': 'application/json',
      'X-Api-App-Key': this.appKey,
      'X-Api-Access-Key': this.accessKey,
      'X-Api-Resource-Id': 'volc.bigasr.auc',
      'X-Api-Request-Id': requestId
    };

    // 增加查询接口的超时时间到30秒
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: queryUrl,
      headers,
      data: requestBody,
      timeout: 30000, // 从15秒增加到30秒
      // 添加重试配置
      validateStatus: (status) => status < 500, // 5xx错误才重试
    };

    // 打印查询请求的详细信息
    Logger.info(`🔍 豆包API查询请求详情:`);
    Logger.info(`  - 请求方法: POST`);
    Logger.info(`  - 查询URL: ${queryUrl}`);
    Logger.info(`  - 请求ID: ${requestId}`);
    Logger.info(`  - 超时设置: 30秒`);
    Logger.info(`  - 请求头:`);
    Object.entries(headers).forEach(([key, value]) => {
      if (key.includes('Key')) {
        Logger.info(`    ${key}: ${typeof value === 'string' ? value.substring(0, 8) + '...' : value}`);
      } else {
        Logger.info(`    ${key}: ${value}`);
      }
    });
    Logger.info(`  - 请求体: {} (空)`);

    // 查询接口也添加重试机制
    const maxRetries = 2; // 查询接口最多重试2次
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.info(`📡 查询请求尝试 ${attempt}/${maxRetries}: ${requestId}`);
        const startTime = Date.now();
        
        const response = await axios(config);
        const responseTime = Date.now() - startTime;
        
        Logger.info(`✅ 查询请求成功:`);
        Logger.info(`  - 响应时间: ${responseTime}ms`);
        Logger.info(`  - HTTP状态: ${response.status}`);
        
        // 检查响应状态
        const statusCode = response.headers['x-api-status-code'];
        const message = response.headers['x-api-message'];
        
        Logger.info(`📋 豆包API查询响应头:`);
        Logger.info(`  - 状态码: ${statusCode || '无'}`);
        Logger.info(`  - 消息: ${message || '无'}`);
        Object.entries(response.headers).forEach(([key, value]) => {
          Logger.info(`    ${key}: ${value}`);
        });
        
        // 打印查询响应体内容（优化版本）
        Logger.info(`📦 豆包API查询响应体:`);
        try {
          const responseData = response.data;
          if (typeof responseData === 'object') {
            Logger.info(`    响应数据类型: object`);
            
            // 🔧 完全移除数据截断逻辑，只记录数据统计信息
            Logger.info(`    响应数据统计:`);
            
            if (responseData.result?.text) {
              const textLength = responseData.result.text.length;
              Logger.info(`      - 转录文本长度: ${textLength} 字符`);
              Logger.info(`      - 转录文本预览: ${responseData.result.text.substring(0, 200)}...`);
            }
            
            if (responseData.result?.utterances) {
              Logger.info(`      - utterances数量: ${responseData.result.utterances.length} 条`);
            }
            
            if (responseData.audio_info) {
              Logger.info(`      - 音频信息: ${JSON.stringify(responseData.audio_info, null, 2)}`);
            }
            
            // 显示其他非敏感字段的完整内容
            const safeFields = { ...responseData };
            if (safeFields.result) {
              safeFields.result = {
                ...safeFields.result,
                text: safeFields.result.text ? `[${safeFields.result.text.length} 字符]` : undefined,
                utterances: safeFields.result.utterances ? `[${safeFields.result.utterances.length} 条]` : undefined
              };
            }
            
            Logger.info(`    响应结构: ${JSON.stringify(safeFields, null, 2)}`);
          } else {
            Logger.info(`    响应数据类型: ${typeof responseData}`);
            Logger.info(`    响应内容: ${responseData}`);
          }
        } catch (parseError) {
          Logger.warn(`    查询响应体解析失败: ${parseError}`);
          Logger.info(`    原始响应: ${response.data}`);
        }
        
        // 检查状态码 - 正常查询状态码包括成功、处理中、队列中等
        const normalStatusCodes = [
          '20000000', // 成功
          '20000001', // 处理中
          '20000002', // 队列中
          '20000003', // 静音音频 - 也需要返回给上层处理
          '40000007'  // 任务准备中
        ];
        
        if (statusCode && !normalStatusCodes.includes(statusCode)) {
          // 根据状态码给出具体处理
          switch (statusCode) {
            case '45000001':
              Logger.error(`❌ 请求参数无效: ${message}`);
              throw new Error(`请求参数无效 (${statusCode}): ${message || '请求参数缺失必需字段、字段值无效或重复请求'}`);
            
            case '45000002':
              Logger.error(`❌ 空音频文件: ${message}`);
              throw new Error(`空音频文件 (${statusCode}): ${message || '音频文件为空'}`);
            
            case '45000151':
              Logger.error(`❌ 音频格式不正确: ${message}`);
              throw new Error(`音频格式不正确 (${statusCode}): ${message || '请确保音频为MP3格式，16kHz采样率，单声道'}`);
            
            case '55000031':
              Logger.warn(`⚠️ 服务器繁忙，将继续重试: ${message}`);
              // 服务器繁忙不抛出异常，让上层继续重试
              return { statusCode, status: 'server_busy', message: message || '服务器繁忙，服务过载' };
            
            default:
              if (statusCode.startsWith('550')) {
                Logger.error(`❌ 服务内部错误: ${statusCode} - ${message}`);
                throw new Error(`服务内部错误 (${statusCode}): ${message || '服务内部处理错误'}`);
              } else {
                Logger.warn(`⚠️ 豆包API返回未知状态:`);
                Logger.warn(`  - 状态码: ${statusCode}`);
                Logger.warn(`  - 消息: ${message || '未知错误'}`);
                throw new Error(`API未知状态 (${statusCode}): ${message || '未知错误'}`);
              }
          }
        }
        
        // 特殊处理：任务准备中
        if (statusCode === '40000007') {
          Logger.debug(`⏳ 任务暂未准备好: ${requestId}`);
          return { statusCode, status: 'preparing', message: '任务准备中' };
        }

        Logger.debug(`📦 查询响应数据大小: ${JSON.stringify(response.data).length} 字符`);
        
        // 🔍 调试：检查原始API响应中的转录文本长度
        if (response.data?.result?.text) {
          const originalTextLength = response.data.result.text.length;
          const hasMarker = response.data.result.text.includes('[共') && response.data.result.text.includes('字符]');
          Logger.debug(`🔍 原始API转录文本长度: ${originalTextLength} 字符，包含截断标记: ${hasMarker}`);
          if (hasMarker) {
            Logger.error(`❌ 豆包API返回的数据本身就被截断了！这不应该发生。`);
          }
        }
        
        return response.data;
        
      } catch (error: any) {
        lastError = error;
        const responseTime = Date.now() - (error.config?.metadata?.startTime || Date.now());
        const errorMessage = error.response?.data?.message || error.message;
        
        Logger.debug(`❌ 查询请求失败 (尝试${attempt}/${maxRetries}):`);
        Logger.debug(`  - 错误类型: ${error.code || '未知'}`);
        Logger.debug(`  - 响应时间: ${responseTime}ms`);
        
        // 区分不同类型的错误
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          Logger.warn(`⏰ 豆包API查询超时 (尝试${attempt}/${maxRetries}): ${requestId}`);
          
          // 如果是最后一次尝试，抛出超时错误
          if (attempt === maxRetries) {
            Logger.error(`💀 查询最终超时: ${errorMessage}`);
            throw new Error(`豆包API查询超时: ${errorMessage}`);
          }
          
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // 网络连接错误，重试
        if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
          Logger.warn(`🌐 网络连接错误 (尝试${attempt}/${maxRetries}): ${errorMessage}`);
          
          if (attempt === maxRetries) {
            Logger.error(`💀 网络连接最终失败: ${errorMessage}`);
            throw new Error(`网络连接失败: ${errorMessage}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        
        // 其他错误直接抛出
        Logger.error(`💥 豆包API查询任务失败:`);
        Logger.error(`  - 错误类型: ${error.code || '未知'}`);
        Logger.error(`  - 错误消息: ${errorMessage}`);
        Logger.error(`  - HTTP状态: ${error.response?.status || '无响应'}`);
        if (error.response?.data) {
          Logger.error(`  - 响应体: ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`豆包API查询任务失败: ${errorMessage}`);
      }
    }

    // 如果所有重试都失败了
    const errorMessage = lastError.response?.data?.message || lastError.message;
    Logger.error(`💀 豆包API查询失败 (所有重试均失败): ${errorMessage}`);
    throw new Error(`豆包API查询失败 (所有重试均失败): ${errorMessage}`);
  }

  /**
   * 智能等待策略：根据任务状态调整等待时间
   */
  private calculateWaitTime(attempt: number, taskStatus?: string): number {
    const baseInterval = 15000; // 基础15秒（原3秒的5倍）
    
    // 根据任务状态调整等待时间
    switch (taskStatus) {
      case 'preparing':
      case 'queued':
        return baseInterval; // 任务准备中/队列中，正常查询间隔
      
      case 'processing':
        return Math.min(baseInterval * 1.2, 20000); // 处理中，稍微增加间隔
      
      case 'server_busy':
        return Math.min(baseInterval * 2, 30000); // 服务器繁忙，延长间隔
      
      case 'completed':
        return Math.max(baseInterval / 2, 8000); // 已完成，快速查询获取结果
      
      case 'unknown':
        return attempt < 3 ? Math.max(baseInterval / 2, 8000) : baseInterval; // 未知状态，前几次快速查询
      
      default:
        // 基于尝试次数的默认策略
        if (attempt < 5) {
          return Math.max(baseInterval / 2, 8000); // 前5次稍快查询（最少8秒）
        } else {
          return baseInterval; // 后续正常查询（15秒）
        }
    }
  }

  /**
   * 解析豆包API响应状态
   * 豆包每次都返回完整结果，简化状态判断逻辑
   */
  private parseTaskStatus(response: any): {
    status: string;
    hasResult: boolean;
    shouldContinue: boolean;
    message?: string;
  } {
    // 检查响应头状态码（优先级最高）
    const statusCode = response?.statusCode || response?.status_code;
    
    // 检查响应体状态
    const bodyStatus = response?.status;
    
    // 检查是否有转录结果
    const hasResult = !!(response?.result?.text?.trim());
    
    // 详细日志记录响应内容
    Logger.debug(`豆包API响应解析:`);
    Logger.debug(`  - statusCode: ${statusCode}`);
    Logger.debug(`  - bodyStatus: ${bodyStatus}`);
    Logger.debug(`  - hasResult: ${hasResult}`);
    Logger.debug(`  - result.text length: ${response?.result?.text?.length || 0}`);
    
    // 🔧 简化逻辑：豆包每次都返回完整结果，有结果就表示任务完成
    if (hasResult) {
      return {
        status: 'completed',
        hasResult: true,
        shouldContinue: false,
        message: '转录完成'
      };
    }
    
    // 根据官方状态码完整判断
    switch (statusCode) {
      // 成功状态码
      case '20000000':
        return {
          status: 'completed',
          hasResult: false,
          shouldContinue: true,
          message: '任务处理完成，等待转录结果'
        };
      
      // 处理中状态码
      case '20000001':
        return {
          status: 'processing',
          hasResult: false,
          shouldContinue: true,
          message: '任务正在处理中'
        };
      
      // 队列中状态码
      case '20000002':
        return {
          status: 'queued',
          hasResult: false,
          shouldContinue: true,
          message: '任务在队列中等待'
        };
      
      // 静音音频 - 特殊处理，需要重新提交
      case '20000003':
        Logger.warn(`⚠️ 检测到静音音频，建议重新提交任务`);
        return {
          status: 'silent_audio',
          hasResult: false,
          shouldContinue: false,
          message: '检测到静音音频，无需重新查询，请直接重新提交任务'
        };
      
      // 请求参数无效
      case '45000001':
        Logger.error(`❌ 请求参数无效: 请求参数缺失必需字段/字段值无效/重复请求`);
        return {
          status: 'failed',
          hasResult: false,
          shouldContinue: false,
          message: '请求参数无效：请求参数缺失必需字段、字段值无效或重复请求'
        };
      
      // 空音频
      case '45000002':
        Logger.error(`❌ 空音频文件`);
        return {
          status: 'failed',
          hasResult: false,
          shouldContinue: false,
          message: '音频文件为空，请检查音频文件是否有效'
        };
      
      // 音频格式不正确
      case '45000151':
        Logger.error(`❌ 音频格式不正确`);
        return {
          status: 'failed',
          hasResult: false,
          shouldContinue: false,
          message: '音频格式不正确，请确保音频为MP3格式，采样率16kHz，单声道'
        };
      
      // 服务器繁忙
      case '55000031':
        Logger.warn(`⚠️ 服务器繁忙，服务过载，无法处理当前请求`);
        return {
          status: 'server_busy',
          hasResult: false,
          shouldContinue: true,
          message: '服务器繁忙，服务过载，请稍后重试'
        };
      
      // 任务准备中 (原有)
      case '40000007':
        return {
          status: 'preparing',
          hasResult: false,
          shouldContinue: true,
          message: '任务准备中'
        };
      
      // 服务内部处理错误 (550xxxx 系列)
      default:
        if (statusCode && statusCode.startsWith('550')) {
          Logger.error(`❌ 服务内部处理错误: ${statusCode}`);
          return {
            status: 'failed',
            hasResult: false,
            shouldContinue: false,
            message: `服务内部处理错误 (${statusCode})，请稍后重试或联系技术支持`
          };
        }
        break;
    }
    
    // 检查响应体状态
    if (bodyStatus === 'failed' || bodyStatus === 'error') {
      return {
        status: 'failed',
        hasResult: false,
        shouldContinue: false,
        message: response.error || response.message || '任务处理失败'
      };
    } else if (bodyStatus === 'completed' || bodyStatus === 'success') {
      return {
        status: 'completed',
        hasResult: false,
        shouldContinue: true,
        message: '任务已完成，等待转录结果'
      };
    }
    
    // 未知状态的详细分析
    const unknownDetails = [];
    if (statusCode) unknownDetails.push(`状态码: ${statusCode}`);
    if (bodyStatus) unknownDetails.push(`状态: ${bodyStatus}`);
    if (response?.message) unknownDetails.push(`消息: ${response.message}`);
    if (response?.error) unknownDetails.push(`错误: ${response.error}`);
    
    const detailMessage = unknownDetails.length > 0 
      ? `任务状态未知 (${unknownDetails.join(', ')})，继续等待`
      : '任务状态未知，继续等待';
    
    Logger.warn(`⚠️ 未知的豆包API响应状态: ${JSON.stringify(response)}`);
    Logger.warn(`📋 支持的状态码列表:`);
    Logger.warn(`  - 20000000: 成功`);
    Logger.warn(`  - 20000001: 正在处理中`);
    Logger.warn(`  - 20000002: 任务在队列中`);
    Logger.warn(`  - 20000003: 静音音频`);
    Logger.warn(`  - 45000001: 请求参数无效`);
    Logger.warn(`  - 45000002: 空音频`);
    Logger.warn(`  - 45000151: 音频格式不正确`);
    Logger.warn(`  - 550xxxx: 服务内部处理错误`);
    Logger.warn(`  - 55000031: 服务器繁忙`);
    
    // 默认继续等待
    return {
      status: 'unknown',
      hasResult: false,
      shouldContinue: true,
      message: detailMessage
    };
  }

  /**
   * 网络连接预检测
   */
  private async preCheckNetworkConnection(): Promise<boolean> {
    try {
      Logger.info(`🌐 开始网络连接预检测...`);
      const testUrl = `https://${this.baseUrl}`;
      const startTime = Date.now();
      
      const response = await axios.get(testUrl, {
        timeout: 10000,
        validateStatus: () => true, // 接受所有HTTP状态码
        headers: {
          'User-Agent': 'yt-dlp-service/1.0 (Ubuntu; Node.js)'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      Logger.info(`✅ 网络连接预检测成功:`);
      Logger.info(`  - 响应时间: ${responseTime}ms`);
      Logger.info(`  - HTTP状态: ${response.status}`);
      Logger.info(`  - 服务器: ${response.headers.server || '未知'}`);
      
      if (responseTime > 5000) {
        Logger.warn(`⚠️ 网络连接较慢 (${responseTime}ms)，可能影响大文件上传`);
        return false;
      }
      
      return true;
      
    } catch (error: any) {
      Logger.error(`❌ 网络连接预检测失败:`);
      Logger.error(`  - 错误类型: ${error.code || '未知'}`);
      Logger.error(`  - 错误消息: ${error.message}`);
      
      if (error.code === 'ENOTFOUND') {
        Logger.error(`  - DNS解析失败，请检查网络配置`);
      } else if (error.code === 'ECONNREFUSED') {
        Logger.error(`  - 连接被拒绝，请检查防火墙设置`);
      } else if (error.code === 'ECONNABORTED') {
        Logger.error(`  - 连接超时，网络可能不稳定`);
      }
      
      return false;
    }
  }

  public async speechToText(audioPath: string): Promise<string> {
    try {
      Logger.info(`开始豆包语音转录: ${audioPath}`)
      
      // 验证音频文件
      await this.validateAudioFile(audioPath)
      
      // 网络连接预检测
      const networkOk = await this.preCheckNetworkConnection();
      if (!networkOk) {
        Logger.warn(`⚠️ 网络连接不稳定，但继续尝试提交任务...`);
      }
      
      // 提交任务到豆包API（现在直接传递文件路径）
      const requestId = await this.submitAudioTask(audioPath)
      
      // 轮询获取转录结果
      const transcription = await this.pollTranscriptionResult(requestId)
      
      // 删除重复日志 - pollTranscriptionResult中已经输出详细信息
      Logger.info(`✅ 豆包语音转录完成，文本长度: ${transcription.length}字符`)
      return transcription
      
    } catch (error: any) {
      Logger.error(`豆包语音转录失败: ${error.message}`)
      throw error
    }

  }

  /**
   * 分块读取音频文件，减少内存占用
   */
  private async readAudioFileInChunks(audioPath: string): Promise<Buffer> {
    try {
      // 让出事件循环，避免阻塞其他服务
      await new Promise(resolve => setImmediate(resolve));
      
      const audioBuffer = await fs.readFile(audioPath);
      
      // 再次让出事件循环
      await new Promise(resolve => setImmediate(resolve));
      
      return audioBuffer;
    } catch (error: any) {
      Logger.error(`读取音频文件失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 分块转换Base64，避免阻塞事件循环
   */
  private async convertToBase64InChunks(buffer: Buffer): Promise<string> {
    try {
      Logger.info(`开始Base64编码，使用分块处理避免阻塞其他服务...`);
      
      // 如果文件较小，直接转换
      if (buffer.length < 10 * 1024 * 1024) { // 10MB以下
        await new Promise(resolve => setImmediate(resolve));
        return buffer.toString('base64');
      }
      
      // 大文件分块处理
      const chunkSize = 1024 * 1024; // 1MB chunks
      let base64String = '';
      
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize);
        base64String += chunk.toString('base64');
        
        // 每处理一个chunk就让出事件循环
        await new Promise(resolve => setImmediate(resolve));
        
        // 显示进度
        const progress = Math.round((i / buffer.length) * 100);
        if (progress % 20 === 0) {
          Logger.info(`Base64编码进度: ${progress}%`);
        }
      }
      
      Logger.info(`Base64编码完成`);
      return base64String;
      
    } catch (error: any) {
      Logger.error(`Base64编码失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证音频文件
   */
  private async validateAudioFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const fileSizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
      
      Logger.info(`🔍 音频文件验证:`);
      Logger.info(`  - 文件路径: ${filePath}`);
      Logger.info(`  - 文件大小: ${fileSizeMB}MB`);
      
      // 检查文件大小限制（豆包API限制100MB，但我们设置更保守的限制）
      const maxSizeMB = 80; // 设置80MB限制，留出缓冲
      if (fileSizeMB > maxSizeMB) {
        Logger.error(`❌ 音频文件过大:`);
        Logger.error(`  - 当前大小: ${fileSizeMB}MB`);
        Logger.error(`  - 最大限制: ${maxSizeMB}MB`);
        Logger.error(`  - 建议: 压缩音频文件或选择较短的视频片段`);
        throw new Error(`音频文件过大 (${fileSizeMB}MB)，超过${maxSizeMB}MB限制。大文件可能导致API超时，请选择较短的视频或压缩音频文件。`);
      }
      
      // 检查文件是否可读
      await fs.access(filePath, fs.constants.R_OK);
      Logger.debug(`✅ 音频文件验证通过: ${fileSizeMB}MB`);
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        Logger.error(`❌ 音频文件不存在: ${filePath}`);
        throw new Error(`音频文件不存在: ${filePath}`);
      } else if (error.code === 'EACCES') {
        Logger.error(`❌ 无法读取音频文件: ${filePath}`);
        throw new Error(`无法读取音频文件: ${filePath}`);
      } else if (error.message.includes('音频文件过大')) {
        throw error; // 重新抛出我们自定义的错误
      } else {
        Logger.error(`❌ 音频文件验证失败: ${error.message}`);
        throw new Error(`音频文件验证失败: ${error.message}`);
      }
    }
  }

  private async pollTranscriptionResult(requestId: string): Promise<string> {
    // 根据音频大小动态调整轮询策略 - 针对长音频优化
    const maxRetries = 80; // 延长一倍：80次轮询（配合30秒间隔，最多40分钟）
    const baseInterval = 30000; // 延长一倍：基础间隔30秒
    const maxWaitTime = maxRetries * baseInterval;

    Logger.info(`🔄 开始轮询豆包任务结果 (长音频优化):`);
    Logger.info(`  - 任务ID: ${requestId}`);
    Logger.info(`  - 最大轮询次数: ${maxRetries} (针对长音频延长一倍)`);
    Logger.info(`  - 轮询间隔: ${baseInterval/1000}秒 (延长一倍)`);
    Logger.info(`  - 最大等待时间: ${Math.round(maxWaitTime/60000)}分钟`);

    let consecutiveTimeouts = 0; // 连续超时计数
    const maxConsecutiveTimeouts = 5; // 最多允许5次连续超时

    for (let i = 0; i < maxRetries; i++) {
      // 动态调整查询间隔：前5次较频繁，之后正常间隔（针对长音频优化）
      const currentInterval = i < 5 ? Math.max(baseInterval / 2, 15000) : baseInterval;
      await new Promise(resolve => setTimeout(resolve, currentInterval));
      
      const progress = Math.round((i + 1) / maxRetries * 100);
      Logger.info(`📊 查询豆包任务状态 (${i + 1}/${maxRetries}, ${progress}%): ${requestId}, 间隔: ${currentInterval}ms`);
      
      try {
        const startTime = Date.now();
        const response = await this.queryAudioTask(requestId);
        const queryTime = Date.now() - startTime;
        consecutiveTimeouts = 0; // 重置超时计数
        
        Logger.debug(`🔍 查询响应时间: ${queryTime}ms`);
        
        // 使用智能状态解析
        const taskStatus = this.parseTaskStatus(response);
        
        Logger.info(`📈 豆包任务状态: ${taskStatus.status} - ${taskStatus.message} (${i + 1}/${maxRetries})`);
        
        // 豆包API返回完整结果，有结果就表示任务完成
        if (taskStatus.hasResult && response.result.text) {
          // 🔍 确保使用原始未修改的转录文本
          const originalText = response.result.text;
          const transcriptionText = originalText.trim();
          
          // 🔍 调试：验证转录文本的完整性
          const hasMarker = transcriptionText.includes('[共') && transcriptionText.includes('字符]');
          if (hasMarker) {
            Logger.error(`❌ 严重错误：转录文本在返回前已被截断！`);
            Logger.error(`  - 文本长度: ${transcriptionText.length}`);
            Logger.error(`  - 前100字符: ${transcriptionText.substring(0, 100)}`);
            Logger.error(`  - 这表明数据在某个地方被意外修改了`);
          } else {
            Logger.info(`✅ 转录文本完整性验证通过，长度: ${transcriptionText.length} 字符`);
          }
          
          // 计算实际总耗时
          const totalElapsedTime = (i + 1) * currentInterval;
          
          Logger.info(`🎉 豆包任务转录完成:`);
          Logger.info(`  - 任务ID: ${requestId}`);
          Logger.info(`  - 轮询次数: ${i + 1}/${maxRetries}`);
          Logger.info(`  - 总耗时: ${Math.round(totalElapsedTime / 1000)}秒`);
          Logger.info(`  - 转录长度: ${transcriptionText.length}字符`);
          Logger.info(`  - 转录预览: ${transcriptionText.substring(0, 300)}${transcriptionText.length > 300 ? '...' : ''}`);
          
          // 显示音频信息（如果存在）
          if (response.audio_info) {
            Logger.info(`  - 音频信息: 时长=${response.audio_info.duration || 'N/A'}s, 采样率=${response.audio_info.sample_rate || 'N/A'}Hz`);
          }
          
          return transcriptionText;
        }
        
        // 处理各种特殊状态
        if (taskStatus.status === 'failed') {
          Logger.error(`💥 豆包任务失败:`);
          Logger.error(`  - 任务ID: ${requestId}`);
          Logger.error(`  - 失败原因: ${taskStatus.message}`);
          throw new Error(`豆包语音识别任务失败: ${taskStatus.message}`);
        }
        
        // 处理静音音频 - 特殊处理，建议重新提交
        if (taskStatus.status === 'silent_audio') {
          Logger.warn(`🔇 豆包检测到静音音频:`);
          Logger.warn(`  - 任务ID: ${requestId}`);
          Logger.warn(`  - 建议: ${taskStatus.message}`);
          throw new Error(`${taskStatus.message}`);
        }
        
        // 处理服务器繁忙 - 延长等待间隔
        if (taskStatus.status === 'server_busy') {
          const busyWaitTime = this.calculateWaitTime(i, 'server_busy');
          Logger.warn(`🚫 豆包服务器繁忙:`);
          Logger.warn(`  - 任务ID: ${requestId}`);
          Logger.warn(`  - 消息: ${taskStatus.message}`);
          Logger.warn(`  - 延长等待间隔到${Math.round(busyWaitTime/1000)}秒...`);
          
          // 服务器繁忙时延长等待时间
          await new Promise(resolve => setTimeout(resolve, busyWaitTime));
          continue;
        }
        
        // 如果不应该继续，但也没有结果，可能是异常情况
        if (!taskStatus.shouldContinue) {
          Logger.error(`⚠️ 豆包任务异常结束:`);
          Logger.error(`  - 任务ID: ${requestId}`);
          Logger.error(`  - 异常原因: ${taskStatus.message}`);
          throw new Error(`豆包任务异常结束: ${taskStatus.message}`);
        }
        
        // 根据任务状态调整下次查询的等待时间
        const nextInterval = this.calculateWaitTime(i, taskStatus.status);
        if (nextInterval !== currentInterval) {
          Logger.debug(`⚙️ 根据任务状态调整查询间隔: ${nextInterval}ms`);
        }
        
      } catch (error: any) {
        // 如果是查询超时，记录并继续重试
        if (error.message.includes('豆包API查询超时')) {
          consecutiveTimeouts++;
          Logger.warn(`⏰ 查询超时 (连续${consecutiveTimeouts}次):`);
          Logger.warn(`  - 任务ID: ${requestId}`);
          Logger.warn(`  - 当前轮询: ${i + 1}/${maxRetries}`);
          
          // 如果连续超时次数过多，可能是网络问题
          if (consecutiveTimeouts >= maxConsecutiveTimeouts) {
            Logger.error(`🌐 连续超时${consecutiveTimeouts}次，疑似网络问题:`);
            Logger.error(`  - 任务ID: ${requestId}`);
            Logger.error(`  - 将延长等待时间并重置计数`);
            // 延长等待时间但继续重试
            await new Promise(resolve => setTimeout(resolve, 10000)); // 额外等待10秒
            consecutiveTimeouts = 0; // 重置计数
          }
          continue;
        }
        
        // 如果是其他API错误，直接抛出
        if (!error.message.includes('timeout') && !error.message.includes('ECONNRESET') && !error.message.includes('ECONNREFUSED')) {
          Logger.error(`💥 豆包任务处理失败:`);
          Logger.error(`  - 任务ID: ${requestId}`);
          Logger.error(`  - 错误类型: ${error.constructor.name}`);
          Logger.error(`  - 错误消息: ${error.message}`);
          Logger.error(`  - 当前轮询: ${i + 1}/${maxRetries}`);
          throw error;
        }
        
        // 网络错误，记录并继续重试
        Logger.warn(`🌐 网络错误 (第${i + 1}次查询):`);
        Logger.warn(`  - 错误: ${error.message}`);
        Logger.warn(`  - 继续重试...`);
        consecutiveTimeouts++;
        
        // 网络错误时延长等待时间
        if (consecutiveTimeouts >= 3) {
          Logger.info(`⏳ 网络不稳定，延长等待时间: ${requestId}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    Logger.error(`💀 豆包语音识别任务超时:`);
    Logger.error(`  - 任务ID: ${requestId}`);
    Logger.error(`  - 已轮询次数: ${maxRetries}`);
    Logger.error(`  - 总等待时间: ${maxWaitTime/60000}分钟`);
    Logger.error(`  - 最后状态: 轮询超时`);
    throw new Error(`豆包语音识别任务超时，已等待${maxWaitTime/60000}分钟`);
  }

  public async checkServiceStatus(): Promise<{ available: boolean, message: string }> {
    try {
      await this.ensureInitialized();
      
      // 使用一个简单的测试来检查服务状态
      // 由于我们不能使用真实音频，这里只检查配置是否正确
      if (!this.appKey || !this.accessKey) {
        return { 
          available: false, 
          message: '豆包语音API密钥未配置' 
        };
      }
      
      return { 
        available: true, 
        message: '豆包语音服务配置正确' 
      };
    } catch (error: any) {
      return { 
        available: false, 
        message: `服务检查失败: ${error.message}` 
      };
    }
  }

  /**
   * 诊断豆包API连接和配置
   */
  public async diagnoseBaoAPI(): Promise<{
    success: boolean;
    message: string;
    details: {
      configStatus: string;
      networkStatus: string;
      apiTest: string;
      suggestions: string[];
      debugInfo: {
        appKeyMasked: string;
        accessKeyMasked: string;
        endpoint: string;
        userAgent: string;
        timestamp: string;
      }
    }
  }> {
    const details = {
      configStatus: '',
      networkStatus: '',
      apiTest: '',
      suggestions: [] as string[],
      debugInfo: {
        appKeyMasked: '',
        accessKeyMasked: '',
        endpoint: '',
        userAgent: 'yt-dlp-service/1.0',
        timestamp: new Date().toISOString()
      }
    };

    Logger.info(`🔧 开始豆包API诊断...`);

    try {
      // 1. 检查配置
      await this.ensureInitialized();
      if (!this.appKey || !this.accessKey) {
        details.configStatus = '❌ API密钥未配置';
        details.suggestions.push('请在管理页面配置豆包API密钥');
        details.suggestions.push('或检查环境变量 DOUBAO_APP_KEY 和 DOUBAO_ACCESS_KEY');
        
        Logger.error(`💥 豆包API配置检查失败:`);
        Logger.error(`  - APP_KEY: ${this.appKey ? '已配置' : '❌ 未配置'}`);
        Logger.error(`  - ACCESS_KEY: ${this.accessKey ? '已配置' : '❌ 未配置'}`);
        
        return {
          success: false,
          message: '豆包API配置不完整',
          details
        };
      } else {
        details.configStatus = '✅ API密钥已配置';
        details.debugInfo.appKeyMasked = `${this.appKey.substring(0, 8)}...`;
        details.debugInfo.accessKeyMasked = `${this.accessKey.substring(0, 8)}...`;
        details.debugInfo.endpoint = this.baseUrl;
        
        Logger.info(`✅ 豆包API配置检查通过:`);
        Logger.info(`  - APP_KEY: ${details.debugInfo.appKeyMasked}`);
        Logger.info(`  - ACCESS_KEY: ${details.debugInfo.accessKeyMasked}`);
        Logger.info(`  - ENDPOINT: ${details.debugInfo.endpoint}`);
      }

      // 2. 检查网络连接
      Logger.info(`🌐 开始网络连接测试...`);
      try {
        const testUrl = `https://${this.baseUrl}`;
        const startTime = Date.now();
        const response = await axios.get(testUrl, { 
          timeout: 10000,
          validateStatus: () => true // 接受所有HTTP状态码
        });
        const responseTime = Date.now() - startTime;
        
        details.networkStatus = `✅ 网络连接正常 (${response.status}, ${responseTime}ms)`;
        
        Logger.info(`✅ 网络连接测试成功:`);
        Logger.info(`  - 响应状态: ${response.status}`);
        Logger.info(`  - 响应时间: ${responseTime}ms`);
        Logger.info(`  - 服务器: ${response.headers.server || '未知'}`);
        
      } catch (error: any) {
        const errorType = error.code || 'UNKNOWN';
        if (error.code === 'ECONNABORTED') {
          details.networkStatus = '❌ 网络连接超时 (>10秒)';
          details.suggestions.push('检查服务器网络连接和DNS解析');
          details.suggestions.push('尝试: ping openspeech.bytedance.com');
        } else if (error.code === 'ENOTFOUND') {
          details.networkStatus = '❌ DNS解析失败';
          details.suggestions.push('检查DNS配置');
          details.suggestions.push('尝试: nslookup openspeech.bytedance.com');
        } else {
          details.networkStatus = `❌ 网络连接失败: ${errorType}`;
          details.suggestions.push('检查防火墙和网络配置');
        }
        
        Logger.error(`💥 网络连接测试失败:`);
        Logger.error(`  - 错误类型: ${errorType}`);
        Logger.error(`  - 错误消息: ${error.message}`);
      }

      // 3. 测试API认证
      Logger.info(`🔐 开始API认证测试...`);
      try {
        const testRequestId = this.generateRequestId();
        const testUrl = `https://${this.baseUrl}/api/v3/auc/bigmodel/query`;
        
        const headers = {
          'Content-Type': 'application/json',
          'X-Api-App-Key': this.appKey,
          'X-Api-Access-Key': this.accessKey,
          'X-Api-Resource-Id': 'volc.bigasr.auc',
          'X-Api-Request-Id': testRequestId
        };

        const startTime = Date.now();
        const response = await axios.post(testUrl, {
          request: { model_name: "bigmodel" }
        }, {
          headers,
          timeout: 10000
        });
        const responseTime = Date.now() - startTime;

        const statusCode = response.headers['x-api-status-code'];
        const message = response.headers['x-api-message'];
        
        Logger.info(`📡 API认证测试响应:`);
        Logger.info(`  - HTTP状态: ${response.status}`);
        Logger.info(`  - API状态码: ${statusCode || '无'}`);
        Logger.info(`  - API消息: ${message || '无'}`);
        Logger.info(`  - 响应时间: ${responseTime}ms`);
        
        if (statusCode && statusCode !== '40000007') { // 40000007是找不到任务的正常错误
          details.apiTest = `❌ API认证失败 (${statusCode}: ${message})`;
          details.suggestions.push('检查API密钥是否正确');
          details.suggestions.push('确认API密钥权限是否足够');
          
          Logger.error(`💥 API认证失败:`);
          Logger.error(`  - 状态码: ${statusCode}`);
          Logger.error(`  - 错误消息: ${message}`);
        } else {
          details.apiTest = `✅ API认证正常 (${responseTime}ms)`;
          
          Logger.info(`✅ API认证测试通过:`);
          Logger.info(`  - 认证成功，响应时间: ${responseTime}ms`);
        }
      } catch (error: any) {
        const errorType = error.code || 'UNKNOWN';
        const responseTime = Date.now() - (error.config?.metadata?.startTime || Date.now());
        
        if (error.response?.status === 403) {
          details.apiTest = '❌ API认证失败: 权限被拒绝';
          details.suggestions.push('检查API密钥是否有效');
          details.suggestions.push('确认账户是否有语音识别服务权限');
        } else if (error.code === 'ECONNABORTED') {
          details.apiTest = '❌ API测试超时';
          details.suggestions.push('豆包API服务响应缓慢，请稍后重试');
          details.suggestions.push('检查网络延迟和带宽');
        } else {
          details.apiTest = `❌ API测试失败: ${errorType}`;
          details.suggestions.push('检查API端点和密钥配置');
        }
        
        Logger.error(`💥 API认证测试失败:`);
        Logger.error(`  - 错误类型: ${errorType}`);
        Logger.error(`  - HTTP状态: ${error.response?.status || '无响应'}`);
        Logger.error(`  - 响应时间: ${responseTime}ms`);
        Logger.error(`  - 错误消息: ${error.message}`);
      }

      // 4. 生成建议
      if (details.suggestions.length === 0) {
        details.suggestions.push('✅ 配置正常，可以尝试重新提交任务');
        details.suggestions.push('如果仍有问题，可能是音频文件过大或格式不支持');
        details.suggestions.push('建议音频文件小于100MB，格式为MP3');
      }

      // 5. 添加通用排查建议
      details.suggestions.push('');
      details.suggestions.push('🔧 通用排查步骤:');
      details.suggestions.push('1. 检查服务器时间是否正确');
      details.suggestions.push('2. 确认防火墙允许HTTPS出站连接');
      details.suggestions.push('3. 查看详细日志: pm2 logs yt-dlpservice --lines 100');
      details.suggestions.push('4. 重启服务: pm2 restart yt-dlpservice');

      const success = details.configStatus.includes('✅') && 
                     details.networkStatus.includes('✅') && 
                     details.apiTest.includes('✅');

      const resultMessage = success ? '✅ 豆包API诊断全部通过' : '⚠️ 发现问题，请查看详细信息';
      
      Logger.info(`🎯 豆包API诊断完成: ${success ? '成功' : '失败'}`);
      Logger.info(`📋 诊断结果:`);
      Logger.info(`  - 配置状态: ${details.configStatus}`);
      Logger.info(`  - 网络状态: ${details.networkStatus}`);
      Logger.info(`  - API测试: ${details.apiTest}`);

      return {
        success,
        message: resultMessage,
        details
      };

    } catch (error: any) {
      Logger.error(`💀 诊断过程异常失败:`);
      Logger.error(`  - 错误类型: ${error.constructor.name}`);
      Logger.error(`  - 错误消息: ${error.message}`);
      
      return {
        success: false,
        message: `诊断过程失败: ${error.message}`,
        details: {
          ...details,
          suggestions: ['❌ 诊断工具异常，请检查系统日志', '尝试重启服务后再次诊断']
        }
      };
    }
  }
}

export const doubaoVoiceService = DoubaoVoiceService.getInstance();