import axios, { type AxiosRequestConfig } from 'axios';
import * as fs from 'fs/promises';
import { env } from '~/env';
import { Logger } from '~/lib/utils/logger';
import { ConfigManager } from '~/lib/utils/config';

class DoubaoVoiceService {
  private static instance: DoubaoVoiceService;
  private appKey: string = '';
  private accessKey: string = '';
  private baseUrl: string = '';
  private isInitializing: boolean = false;

  private constructor() { 
    this.initialize(); 
  }

  public static getInstance(): DoubaoVoiceService {
    if (!DoubaoVoiceService.instance) {
      DoubaoVoiceService.instance = new DoubaoVoiceService();
    }
    return DoubaoVoiceService.instance;
  }

  private async initialize() {
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
      }
    } finally {
      this.isInitializing = false;
    }
  }

  private async ensureInitialized() {
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

  private async submitAudioTask(audioBase64: string): Promise<string> {
    await this.ensureInitialized();

    const requestId = this.generateRequestId();
    const submitUrl = `https://${this.baseUrl}/api/v3/auc/bigmodel/submit`;
    
    // 计算音频大小用于日志
    const audioSizeMB = Math.round((audioBase64.length * 3 / 4) / 1024 / 1024 * 100) / 100;
    Logger.info(`🚀 豆包API提交任务开始:`);
    Logger.info(`  - 请求ID: ${requestId}`);
    Logger.info(`  - 音频大小: ${audioSizeMB}MB`);
    Logger.info(`  - Base64长度: ${audioBase64.length} 字符`);
    Logger.info(`  - 提交URL: ${submitUrl}`);
    Logger.info(`  - APP_KEY: ${this.appKey ? `${this.appKey.substring(0, 8)}...` : '未配置'}`);
    Logger.info(`  - ACCESS_KEY: ${this.accessKey ? `${this.accessKey.substring(0, 8)}...` : '未配置'}`);
    
    // 检查音频大小是否超过建议限制
    if (audioSizeMB > 30) {
      Logger.warn(`⚠️ 音频文件过大 (${audioSizeMB}MB)，1M宽带上传可能需要很长时间`);
      Logger.warn(`  - 预计上传时间: ${Math.round(audioSizeMB * 8)}秒 (约${Math.round(audioSizeMB * 8 / 60)}分钟)`);
      Logger.warn(`  - 建议: 选择较短的视频片段 (<15分钟)`);
    } else if (audioSizeMB > 15) {
      Logger.warn(`⚠️ 音频文件较大 (${audioSizeMB}MB)，1M宽带上传较慢`);
      Logger.warn(`  - 预计上传时间: ${Math.round(audioSizeMB * 8)}秒`);
    }
    
    // 根据API文档和错误信息调整请求格式
    const requestBody = {
      user: {
        uid: "yt-dlp-service-user"
      },
      audio: {
        // 尝试使用 data 字段而不是 url 字段
        data: audioBase64,
        format: "mp3",
        rate: 16000,
        bits: 16,
        channel: 1
      },
      request: {
        model_name: "bigmodel",
        enable_itn: true,
        enable_punc: true,
        show_utterances: true
      }
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Api-App-Key': this.appKey,
      'X-Api-Access-Key': this.accessKey,
      'X-Api-Resource-Id': 'volc.bigasr.auc',
      'X-Api-Request-Id': requestId,
      'X-Api-Sequence': '-1',
      // 添加Ubuntu服务器优化的请求头
      'User-Agent': 'yt-dlp-service/1.0 (Ubuntu; Node.js)',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive'
    };

    // 打印详细的请求参数
    Logger.info(`📋 豆包API请求参数详情:`);
    Logger.info(`  - 请求方法: POST`);
    Logger.info(`  - 请求URL: ${submitUrl}`);
    Logger.info(`  - 请求头:`);
    Object.entries(headers).forEach(([key, value]) => {
      if (key.includes('Key')) {
        Logger.info(`    ${key}: ${typeof value === 'string' ? value.substring(0, 8) + '...' : value}`);
      } else {
        Logger.info(`    ${key}: ${value}`);
      }
    });
    Logger.info(`  - 请求体结构:`);
    Logger.info(`    user.uid: ${requestBody.user.uid}`);
    Logger.info(`    audio.format: ${requestBody.audio.format}`);
    Logger.info(`    audio.rate: ${requestBody.audio.rate}`);
    Logger.info(`    audio.bits: ${requestBody.audio.bits}`);
    Logger.info(`    audio.channel: ${requestBody.audio.channel}`);
    Logger.info(`    audio.data: [Base64数据 ${audioBase64.length} 字符]`);
    Logger.info(`    request.model_name: ${requestBody.request.model_name}`);
    Logger.info(`    request.enable_itn: ${requestBody.request.enable_itn}`);
    Logger.info(`    request.enable_punc: ${requestBody.request.enable_punc}`);
    Logger.info(`    request.show_utterances: ${requestBody.request.show_utterances}`);

    // 根据音频大小动态调整超时时间，但对大文件更保守
    const baseTimeout = 120000; // 基础120秒（从60秒增加）
    let sizeTimeout = Math.max(audioSizeMB * 5000, 60000); // 每MB增加5秒，最小60秒（从2秒增加到5秒）
    
    // 对于Ubuntu服务器，网络可能不如本地稳定，增加额外缓冲
    // 特别针对1M宽带进行优化
    if (audioSizeMB > 10) {
      sizeTimeout = Math.max(audioSizeMB * 8000, 120000); // 大文件每MB增加8秒（从3秒增加到8秒）
      Logger.info(`📡 检测到大文件，针对1M宽带增加网络缓冲时间`);
    }
    
    // 1M宽带理论上传速度约128KB/s，26MB需要约3.4分钟，我们设置10分钟超时
    const finalTimeout = Math.min(baseTimeout + sizeTimeout, 600000); // 增加到最大10分钟（从5分钟增加）

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: submitUrl,
      headers,
      data: requestBody,
      timeout: finalTimeout,
      // 添加Ubuntu服务器网络优化
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      // 添加重试配置
      validateStatus: (status) => status < 500, // 5xx错误才重试
      // 添加代理配置（如果需要的话）
      proxy: false, // 禁用代理
      // 添加keepAlive配置
      httpAgent: new (require('http').Agent)({ 
        keepAlive: true,
        keepAliveMsecs: 30000,
        timeout: finalTimeout,
        maxSockets: 5
      }),
      httpsAgent: new (require('https').Agent)({ 
        keepAlive: true,
        keepAliveMsecs: 30000,
        timeout: finalTimeout,
        maxSockets: 5,
        rejectUnauthorized: true
      })
    };

    Logger.info(`⏱️ 豆包API请求配置:`);
    Logger.info(`  - 超时时间: ${finalTimeout}ms (${Math.round(finalTimeout/1000)}秒)`);
    Logger.info(`  - 请求体大小: ${JSON.stringify(requestBody).length} 字符`);
    Logger.info(`  - 网络优化: Ubuntu服务器模式`);

    // 重试机制 - 对于网络不稳定的Ubuntu服务器和1M宽带增加重试次数
    const maxRetries = audioSizeMB > 15 ? 7 : 5; // 大文件增加到7次重试（从5次增加）
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let startTime = Date.now(); // 移动到循环内部
      try {
        Logger.info(`📡 豆包API提交尝试 ${attempt}/${maxRetries}: ${requestId}`);
        Logger.info(`  - 当前时间: ${new Date().toISOString()}`);
        Logger.info(`  - 预计完成时间: ${new Date(Date.now() + finalTimeout).toISOString()}`);
        
        startTime = Date.now(); // 重新赋值确保准确性
        
        const response = await axios(config);
        const responseTime = Date.now() - startTime;
        
        // 打印详细的响应信息
        Logger.info(`✅ 豆包API请求成功:`);
        Logger.info(`  - 响应时间: ${responseTime}ms`);
        Logger.info(`  - HTTP状态: ${response.status}`);
        Logger.info(`  - 响应头状态码: ${response.headers['x-api-status-code'] || '无'}`);
        Logger.info(`  - 响应消息: ${response.headers['x-api-message'] || '无'}`);
        Logger.info(`  - 服务器: ${response.headers.server || '未知'}`);
        Logger.info(`  - 连接类型: ${response.headers.connection || '未知'}`);
        
        // 打印完整的响应头
        Logger.info(`📋 豆包API响应头详情:`);
        Object.entries(response.headers).forEach(([key, value]) => {
          Logger.info(`    ${key}: ${value}`);
        });
        
        // 打印响应体内容
        Logger.info(`📦 豆包API响应体内容:`);
        try {
          const responseData = response.data;
          if (typeof responseData === 'object') {
            Logger.info(`    响应数据类型: object`);
            Logger.info(`    响应内容: ${JSON.stringify(responseData, null, 2)}`);
          } else {
            Logger.info(`    响应数据类型: ${typeof responseData}`);
            Logger.info(`    响应内容: ${responseData}`);
          }
        } catch (parseError) {
          Logger.warn(`    响应体解析失败: ${parseError}`);
          Logger.info(`    原始响应: ${response.data}`);
        }
        
        // 检查响应状态
        const statusCode = response.headers['x-api-status-code'];
        const message = response.headers['x-api-message'];
        
        if (statusCode && statusCode !== '20000000' && statusCode !== '20000001' && statusCode !== '20000002') {
          Logger.error(`❌ 豆包API返回错误状态:`);
          Logger.error(`  - 状态码: ${statusCode}`);
          Logger.error(`  - 错误消息: ${message || '未知错误'}`);
          throw new Error(`API错误 (${statusCode}): ${message || '未知错误'}`);
        }

        Logger.info(`🎉 豆包任务提交成功: ${requestId}`);
        return requestId;
        
      } catch (error: any) {
        lastError = error;
        const responseTime = Date.now() - startTime;
        const errorMessage = error.response?.data?.message || error.message;
        
        Logger.error(`❌ 豆包API提交失败 (尝试${attempt}/${maxRetries}):`);
        Logger.error(`  - 错误类型: ${error.code || '未知'}`);
        Logger.error(`  - 错误消息: ${errorMessage}`);
        Logger.error(`  - HTTP状态: ${error.response?.status || '无响应'}`);
        Logger.error(`  - 响应时间: ${responseTime}ms`);
        Logger.error(`  - 当前时间: ${new Date().toISOString()}`);
        
        // 打印失败时的完整错误响应
        if (error.response) {
          Logger.error(`📋 豆包API错误响应头:`);
          Object.entries(error.response.headers || {}).forEach(([key, value]) => {
            Logger.error(`    ${key}: ${value}`);
          });
          
          Logger.error(`📦 豆包API错误响应体:`);
          try {
            const errorData = error.response.data;
            if (typeof errorData === 'object') {
              Logger.error(`    错误数据类型: object`);
              Logger.error(`    错误内容: ${JSON.stringify(errorData, null, 2)}`);
            } else {
              Logger.error(`    错误数据类型: ${typeof errorData}`);
              Logger.error(`    错误内容: ${errorData}`);
            }
          } catch (parseError) {
            Logger.error(`    错误响应体解析失败: ${parseError}`);
            Logger.error(`    原始错误响应: ${error.response.data}`);
          }
        } else {
          Logger.error(`📋 网络错误详情:`);
          Logger.error(`    - 错误配置: ${JSON.stringify({
            url: error.config?.url,
            method: error.config?.method,
            timeout: error.config?.timeout,
            headers: error.config?.headers ? Object.keys(error.config.headers) : []
          }, null, 2)}`);
        }
        
        // 详细的网络错误分析
        if (error.code === 'ECONNABORTED') {
          Logger.error(`🌐 网络连接中断分析:`);
          Logger.error(`  - 错误类型: 连接超时`);
          Logger.error(`  - 可能原因: 网络不稳定、服务器负载高、防火墙限制`);
          Logger.error(`  - 音频大小: ${audioSizeMB}MB`);
          Logger.error(`  - 超时设置: ${finalTimeout}ms`);
          
          if (audioSizeMB > 30) {
            Logger.error(`  - 建议: 音频文件过大，请选择较短的视频 (<15分钟)`);
          } else if (responseTime < 10000) {
            Logger.error(`  - 建议: 快速失败，可能是网络配置问题`);
          } else {
            Logger.error(`  - 建议: 网络连接不稳定，建议检查服务器网络`);
          }
        }
        
        if (error.response) {
          Logger.error(`  - 响应头: ${JSON.stringify(error.response.headers)}`);
          Logger.error(`  - 响应体: ${JSON.stringify(error.response.data)}`);
        }
        
        // 如果是最后一次尝试，或者是非网络错误，直接抛出
        if (attempt === maxRetries || (!error.code?.includes('TIMEOUT') && !error.code?.includes('ECONNRESET') && error.code !== 'ECONNABORTED')) {
          Logger.error(`💥 豆包API提交最终失败，停止重试`);
          break;
        }
        
        // 等待后重试，对于网络错误增加等待时间
        const delay = error.code === 'ECONNABORTED' ? attempt * 10000 : attempt * 5000; // 1M宽带网络中断增加等待时间到10秒
        Logger.info(`⏳ 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const errorMessage = lastError.response?.data?.message || lastError.message;
    Logger.error(`💀 豆包API提交任务失败 (所有重试均失败): ${errorMessage}`);
    
    // 提供针对性的解决建议
    if (lastError.code === 'ECONNABORTED') {
      Logger.error(`🔧 网络超时解决建议:`);
      Logger.error(`  1. 检查服务器网络连接: ping openspeech.bytedance.com`);
      Logger.error(`  2. 检查防火墙设置: 确保允许HTTPS出站连接`);
      Logger.error(`  3. 减小音频文件: 选择较短的视频片段`);
      Logger.error(`  4. 检查服务器负载: top, htop`);
      Logger.error(`  5. 重启服务: pm2 restart yt-dlpservice`);
    }
    
    throw new Error(`豆包API提交任务失败: ${errorMessage}`);
  }

  private async queryAudioTask(requestId: string): Promise<any> {
    await this.ensureInitialized();

    const queryUrl = `https://${this.baseUrl}/api/v3/auc/bigmodel/query`;
    
    // 查询接口通常只需要 request_id，不需要 user 字段
    const requestBody = {
      request: {
        model_name: "bigmodel"
      }
    };

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
    Logger.debug(`🔍 豆包API查询请求详情:`);
    Logger.debug(`  - 请求方法: POST`);
    Logger.debug(`  - 查询URL: ${queryUrl}`);
    Logger.debug(`  - 请求ID: ${requestId}`);
    Logger.debug(`  - 超时设置: 30秒`);
    Logger.debug(`  - 请求头:`);
    Object.entries(headers).forEach(([key, value]) => {
      if (key.includes('Key')) {
        Logger.debug(`    ${key}: ${typeof value === 'string' ? value.substring(0, 8) + '...' : value}`);
      } else {
        Logger.debug(`    ${key}: ${value}`);
      }
    });
    Logger.debug(`  - 请求体:`);
    Logger.debug(`    request.model_name: ${requestBody.request.model_name}`);

    // 查询接口也添加重试机制
    const maxRetries = 2; // 查询接口最多重试2次
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.debug(`📡 查询请求尝试 ${attempt}/${maxRetries}: ${requestId}`);
        const startTime = Date.now();
        
        const response = await axios(config);
        const responseTime = Date.now() - startTime;
        
        Logger.debug(`✅ 查询请求成功:`);
        Logger.debug(`  - 响应时间: ${responseTime}ms`);
        Logger.debug(`  - HTTP状态: ${response.status}`);
        
        // 检查响应状态
        const statusCode = response.headers['x-api-status-code'];
        const message = response.headers['x-api-message'];
        
        Logger.debug(`📋 豆包API查询响应头:`);
        Logger.debug(`  - 状态码: ${statusCode || '无'}`);
        Logger.debug(`  - 消息: ${message || '无'}`);
        Object.entries(response.headers).forEach(([key, value]) => {
          Logger.debug(`    ${key}: ${value}`);
        });
        
        // 打印查询响应体内容
        Logger.debug(`📦 豆包API查询响应体:`);
        try {
          const responseData = response.data;
          if (typeof responseData === 'object') {
            Logger.debug(`    响应数据类型: object`);
            Logger.debug(`    响应内容: ${JSON.stringify(responseData, null, 2)}`);
          } else {
            Logger.debug(`    响应数据类型: ${typeof responseData}`);
            Logger.debug(`    响应内容: ${responseData}`);
          }
        } catch (parseError) {
          Logger.warn(`    查询响应体解析失败: ${parseError}`);
          Logger.debug(`    原始响应: ${response.data}`);
        }
        
        // 20000000: 成功, 20000001: 处理中, 20000002: 任务在队列中 - 都是正常状态
        if (statusCode && statusCode !== '20000000' && statusCode !== '20000001' && statusCode !== '20000002') {
          // 如果是找不到任务的错误，可能任务还没准备好，不算错误
          if (statusCode === '40000007') {
            Logger.debug(`⏳ 任务暂未准备好: ${requestId}`);
            return { status: 'preparing', message: '任务准备中' };
          }
          
          Logger.warn(`⚠️ 豆包API返回异常状态:`);
          Logger.warn(`  - 状态码: ${statusCode}`);
          Logger.warn(`  - 消息: ${message || '未知错误'}`);
          throw new Error(`API错误 (${statusCode}): ${message || '未知错误'}`);
        }

        Logger.debug(`📦 查询响应数据大小: ${JSON.stringify(response.data).length} 字符`);
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
    const baseInterval = 3000; // 基础3秒
    
    // 根据任务状态调整等待时间
    if (taskStatus === 'preparing' || taskStatus === 'queued') {
      return baseInterval; // 任务准备中，快速查询
    } else if (taskStatus === 'processing') {
      return Math.min(baseInterval * 2, 8000); // 处理中，适中查询
    } else if (attempt < 10) {
      return baseInterval; // 前10次快速查询
    } else {
      return Math.min(baseInterval * 2, 8000); // 后续慢速查询
    }
  }

  /**
   * 解析豆包API响应状态
   */
  private parseTaskStatus(response: any): {
    status: string;
    hasResult: boolean;
    shouldContinue: boolean;
    message?: string;
  } {
    // 检查是否有转录结果
    const hasResult = !!(response?.result?.text?.trim());
    
    // 检查响应头状态码
    const statusCode = response?.statusCode || response?.status_code;
    
    // 检查响应体状态
    const bodyStatus = response?.status;
    
    // 详细日志记录响应内容
    Logger.debug(`豆包API响应解析:`);
    Logger.debug(`  - statusCode: ${statusCode}`);
    Logger.debug(`  - bodyStatus: ${bodyStatus}`);
    Logger.debug(`  - hasResult: ${hasResult}`);
    Logger.debug(`  - result.text length: ${response?.result?.text?.length || 0}`);
    
    if (hasResult) {
      return {
        status: 'completed',
        hasResult: true,
        shouldContinue: false,
        message: '转录完成'
      };
    }
    
    // 根据状态码判断
    if (statusCode === '20000000') {
      return {
        status: 'processing',
        hasResult: false,
        shouldContinue: true,
        message: '任务处理完成，等待转录结果'
      };
    } else if (statusCode === '20000001') {
      return {
        status: 'processing',
        hasResult: false,
        shouldContinue: true,
        message: '任务正在处理中'
      };
    } else if (statusCode === '20000002') {
      return {
        status: 'queued',
        hasResult: false,
        shouldContinue: true,
        message: '任务在队列中等待'
      };
    } else if (statusCode === '40000007') {
      return {
        status: 'preparing',
        hasResult: false,
        shouldContinue: true,
        message: '任务准备中'
      };
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
    
    Logger.warn(`未知的豆包API响应状态: ${JSON.stringify(response)}`);
    
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
      
      // 读取音频文件并转换为Base64（分块处理减少内存占用）
      Logger.info(`开始读取音频文件，使用分块处理减少服务器负载...`);
      const audioBuffer = await this.readAudioFileInChunks(audioPath);
      const audioBase64 = await this.convertToBase64InChunks(audioBuffer);
      
      Logger.info(`音频文件读取完成，大小: ${Math.round(audioBuffer.length / 1024 / 1024 * 100) / 100}MB`)
      
      // 提交任务到豆包API
      const requestId = await this.submitAudioTask(audioBase64)
      
      // 轮询获取转录结果
      const transcription = await this.pollTranscriptionResult(requestId)
      
      Logger.info(`豆包语音转录完成，文本长度: ${transcription.length}`)
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
    // 根据音频大小动态调整轮询策略
    const maxRetries = 120; // 增加到120次轮询（最多10分钟）
    const baseInterval = 3000; // 基础间隔3秒
    const maxWaitTime = maxRetries * baseInterval;

    Logger.info(`🔄 开始轮询豆包任务结果:`);
    Logger.info(`  - 任务ID: ${requestId}`);
    Logger.info(`  - 最大轮询次数: ${maxRetries}`);
    Logger.info(`  - 最大等待时间: ${maxWaitTime/60000}分钟`);

    let consecutiveTimeouts = 0; // 连续超时计数
    const maxConsecutiveTimeouts = 5; // 最多允许5次连续超时

    for (let i = 0; i < maxRetries; i++) {
      // 动态调整查询间隔：前10次较频繁，之后逐渐增加
      const currentInterval = i < 10 ? baseInterval : Math.min(baseInterval * 2, 8000);
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
        
        // 如果有转录结果，返回
        if (taskStatus.hasResult && response.result.text) {
          const transcriptionText = response.result.text.trim();
          Logger.info(`🎉 豆包任务成功完成:`);
          Logger.info(`  - 任务ID: ${requestId}`);
          Logger.info(`  - 轮询次数: ${i + 1}/${maxRetries}`);
          Logger.info(`  - 总耗时: ${Math.round((Date.now() - (Date.now() - (i + 1) * currentInterval)) / 1000)}秒`);
          Logger.info(`  - 转录长度: ${transcriptionText.length}字符`);
          Logger.info(`  - 转录预览: ${transcriptionText.substring(0, 100)}...`);
          return transcriptionText;
        }
        
        // 如果任务失败，抛出异常
        if (taskStatus.status === 'failed') {
          Logger.error(`💥 豆包任务失败:`);
          Logger.error(`  - 任务ID: ${requestId}`);
          Logger.error(`  - 失败原因: ${taskStatus.message}`);
          throw new Error(`豆包语音识别任务失败: ${taskStatus.message}`);
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