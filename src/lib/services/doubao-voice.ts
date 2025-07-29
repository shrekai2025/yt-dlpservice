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
      // 优先从数据库获取配置，失败时使用环境变量
      let dbAppKey = '';
      let dbAccessKey = '';
      let dbEndpoint = '';
      
      try {
        dbAppKey = await ConfigManager.get('doubao_app_key');
      } catch { /* 使用环境变量 */ }
      
      try {
        dbAccessKey = await ConfigManager.get('doubao_access_key');
      } catch { /* 使用环境变量 */ }

      try {
        dbEndpoint = await ConfigManager.get('doubao_endpoint');
      } catch { /* 使用环境变量 */ }
      
      this.appKey = dbAppKey || env.DOUBAO_APP_KEY || '';
      this.accessKey = dbAccessKey || env.DOUBAO_ACCESS_KEY || '';
      
      const endpointValue = dbEndpoint || env.DOUBAO_ENDPOINT || 'openspeech.bytedance.com';
      this.baseUrl = endpointValue.replace(/^https?:\/\//, ''); // 移除协议头
      
      if (!this.appKey || !this.accessKey) {
        Logger.warn('豆包语音API密钥未配置，服务不可用。');
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
    Logger.info(`豆包API提交任务: ${requestId}, 音频大小: ${audioSizeMB}MB`);
    
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
      'X-Api-Sequence': '-1'
    };

    // 根据音频大小动态调整超时时间
    const baseTimeout = 60000; // 基础60秒
    const sizeTimeout = Math.max(audioSizeMB * 2000, 30000); // 每MB增加2秒，最小30秒
    const finalTimeout = Math.min(baseTimeout + sizeTimeout, 180000); // 最大3分钟

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: submitUrl,
      headers,
      data: requestBody,
      timeout: finalTimeout,
      // 添加重试配置
      validateStatus: (status) => status < 500, // 5xx错误才重试
    };

    Logger.info(`豆包API请求超时设置: ${finalTimeout}ms`);

    // 重试机制
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.info(`豆包API提交尝试 ${attempt}/${maxRetries}: ${requestId}`);
        
        const response = await axios(config);
        
        // 检查响应状态
        const statusCode = response.headers['x-api-status-code'];
        const message = response.headers['x-api-message'];
        
        if (statusCode && statusCode !== '20000000' && statusCode !== '20000001' && statusCode !== '20000002') {
          throw new Error(`API错误 (${statusCode}): ${message || '未知错误'}`);
        }

        Logger.info(`豆包任务提交成功: ${requestId}`);
        return requestId;
        
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.response?.data?.message || error.message;
        
        Logger.warn(`豆包API提交失败 (尝试${attempt}/${maxRetries}): ${errorMessage}`);
        
        // 如果是最后一次尝试，或者是非网络错误，直接抛出
        if (attempt === maxRetries || (!error.code?.includes('TIMEOUT') && !error.code?.includes('ECONNRESET'))) {
          break;
        }
        
        // 等待后重试
        const delay = attempt * 2000; // 递增延迟
        Logger.info(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const errorMessage = lastError.response?.data?.message || lastError.message;
    Logger.error(`豆包API提交任务失败 (所有重试均失败): ${errorMessage}`);
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

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: queryUrl,
      headers,
      data: requestBody,
      timeout: 15000 // 查询接口增加到15秒
    };

    try {
      const response = await axios(config);
      
      // 检查响应状态
      const statusCode = response.headers['x-api-status-code'];
      const message = response.headers['x-api-message'];
      
      // 20000000: 成功, 20000001: 处理中, 20000002: 任务在队列中 - 都是正常状态
      if (statusCode && statusCode !== '20000000' && statusCode !== '20000001' && statusCode !== '20000002') {
        throw new Error(`API错误 (${statusCode}): ${message || '未知错误'}`);
      }

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      
      // 区分不同类型的错误
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        Logger.warn(`豆包API查询超时: ${requestId}`);
        throw new Error(`豆包API查询超时: ${errorMessage}`);
      }
      
      Logger.error(`豆包API查询任务失败: ${errorMessage}`, error.response?.data);
      throw new Error(`豆包API查询任务失败: ${errorMessage}`);
    }
  }

  public async speechToText(audioPath: string): Promise<string> {
    // 检查音频文件
    await this.validateAudioFile(audioPath);
    
    const audioBuffer = await fs.readFile(audioPath);
    const audioBase64 = audioBuffer.toString('base64');

    // 提交任务
    const requestId = await this.submitAudioTask(audioBase64);
    
    // 轮询结果
    return this.pollTranscriptionResult(requestId);
  }

  /**
   * 验证音频文件
   */
  private async validateAudioFile(audioPath: string): Promise<void> {
    try {
      const stats = await fs.stat(audioPath);
      const fileSizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
      
      Logger.info(`音频文件检查: ${audioPath}, 大小: ${fileSizeMB}MB`);
      
      // 检查文件大小限制（豆包API通常限制在100MB以内）
      if (stats.size > 100 * 1024 * 1024) {
        throw new Error(`音频文件过大: ${fileSizeMB}MB，请使用小于100MB的文件`);
      }
      
      if (stats.size === 0) {
        throw new Error('音频文件为空');
      }
      
      // 检查文件是否可读
      await fs.access(audioPath, fs.constants.R_OK);
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`音频文件不存在: ${audioPath}`);
      }
      if (error.code === 'EACCES') {
        throw new Error(`音频文件无法读取: ${audioPath}`);
      }
      throw error;
    }
  }

  private async pollTranscriptionResult(requestId: string): Promise<string> {
    const maxRetries = 60; // 最多轮询60次
    const interval = 5000;  // 每5秒查询一次
    const maxWaitTime = maxRetries * interval; // 最大等待5分钟

    Logger.info(`开始轮询豆包任务结果: ${requestId}, 最大等待时间: ${maxWaitTime/1000}秒`);

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      Logger.info(`查询豆包任务状态 (${i + 1}/${maxRetries}): ${requestId}`);
      
      try {
        const response = await this.queryAudioTask(requestId);
        
        // 检查是否有转录结果
        if (response && response.result && response.result.text) {
          const transcriptionText = response.result.text.trim();
          if (transcriptionText.length > 0) {
            Logger.info(`豆包任务成功: ${requestId}, 转录长度: ${transcriptionText.length}`);
            return transcriptionText;
          } else {
            Logger.warn(`豆包任务返回空结果: ${requestId}`);
          }
        }
        
        // 检查任务状态
        if (response && response.status) {
          Logger.debug(`豆包任务状态: ${response.status}`);
          
          // 如果任务失败
          if (response.status === 'failed' || response.status === 'error') {
            const errorMsg = response.error || response.message || '任务处理失败';
            throw new Error(`豆包语音识别任务失败: ${errorMsg}`);
          }
        }
        
        // 如果有错误信息，抛出异常
        if (response && response.error) {
          throw new Error(`豆包语音识别任务失败: ${response.error}`);
        }
        
      } catch (error: any) {
        // 如果是查询超时，继续重试
        if (error.message.includes('豆包API查询超时')) {
          Logger.warn(`查询超时，继续重试: ${requestId}`);
          continue;
        }
        
        // 如果是其他API错误，直接抛出
        if (!error.message.includes('timeout') && !error.message.includes('ECONNRESET')) {
          Logger.error(`豆包任务处理失败: ${requestId}, 错误: ${error.message}`);
          throw error;
        }
        
        // 网络错误，记录并继续重试
        Logger.warn(`网络错误，继续重试: ${error.message}`);
      }
    }
    
    Logger.error(`豆包语音识别任务超时: ${requestId}, 已轮询${maxRetries}次`);
    throw new Error(`豆包语音识别任务超时，已等待${maxWaitTime/1000}秒`);
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
    }
  }> {
    const details = {
      configStatus: '',
      networkStatus: '',
      apiTest: '',
      suggestions: [] as string[]
    };

    try {
      // 1. 检查配置
      await this.ensureInitialized();
      if (!this.appKey || !this.accessKey) {
        details.configStatus = '❌ API密钥未配置';
        details.suggestions.push('请在管理页面配置豆包API密钥');
        return {
          success: false,
          message: '豆包API配置不完整',
          details
        };
      } else {
        details.configStatus = '✅ API密钥已配置';
      }

      // 2. 检查网络连接
      try {
        const testUrl = `https://${this.baseUrl}`;
        const response = await axios.get(testUrl, { 
          timeout: 10000,
          validateStatus: () => true // 接受所有HTTP状态码
        });
        details.networkStatus = `✅ 网络连接正常 (${response.status})`;
      } catch (error: any) {
        if (error.code === 'ECONNABORTED') {
          details.networkStatus = '❌ 网络连接超时';
          details.suggestions.push('检查服务器网络连接和DNS解析');
        } else {
          details.networkStatus = `❌ 网络连接失败: ${error.message}`;
          details.suggestions.push('检查防火墙和网络配置');
        }
      }

      // 3. 测试API认证
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

        const response = await axios.post(testUrl, {
          request: { model_name: "bigmodel" }
        }, {
          headers,
          timeout: 10000
        });

        const statusCode = response.headers['x-api-status-code'];
        if (statusCode && statusCode !== '40000007') { // 40000007是找不到任务的正常错误
          details.apiTest = `❌ API认证失败 (${statusCode})`;
          details.suggestions.push('检查API密钥是否正确');
        } else {
          details.apiTest = '✅ API认证正常';
        }
      } catch (error: any) {
        if (error.response?.status === 403) {
          details.apiTest = '❌ API认证失败: 权限被拒绝';
          details.suggestions.push('检查API密钥是否有效');
        } else if (error.code === 'ECONNABORTED') {
          details.apiTest = '❌ API测试超时';
          details.suggestions.push('豆包API服务响应缓慢，请稍后重试');
        } else {
          details.apiTest = `❌ API测试失败: ${error.message}`;
          details.suggestions.push('检查API端点和密钥配置');
        }
      }

      // 4. 生成建议
      if (details.suggestions.length === 0) {
        details.suggestions.push('配置正常，可以尝试重新提交任务');
        details.suggestions.push('如果仍有问题，可能是音频文件过大或格式不支持');
      }

      const success = details.configStatus.includes('✅') && 
                     details.networkStatus.includes('✅') && 
                     details.apiTest.includes('✅');

      return {
        success,
        message: success ? '豆包API诊断通过' : '发现问题，请查看详细信息',
        details
      };

    } catch (error: any) {
      return {
        success: false,
        message: `诊断过程失败: ${error.message}`,
        details: {
          ...details,
          suggestions: ['诊断工具异常，请检查系统日志']
        }
      };
    }
  }
}

export const doubaoVoiceService = DoubaoVoiceService.getInstance();