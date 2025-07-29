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

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: submitUrl,
      headers,
      data: requestBody,
      timeout: 30000
    };

    try {
      Logger.info(`提交豆包语音任务: ${requestId}`);
      const response = await axios(config);
      
      // 检查响应状态
      const statusCode = response.headers['x-api-status-code'];
      const message = response.headers['x-api-message'];
      
      // 20000000: 成功, 20000001: 处理中, 20000002: 任务在队列中 - 都是正常状态
      if (statusCode && statusCode !== '20000000' && statusCode !== '20000001' && statusCode !== '20000002') {
        throw new Error(`API错误 (${statusCode}): ${message || '未知错误'}`);
      }

      Logger.info(`豆包语音任务提交成功: ${requestId}`);
      return requestId;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      Logger.error(`豆包API提交任务失败: ${errorMessage}`, error.response?.data);
      throw new Error(`豆包API提交任务失败: ${errorMessage}`);
    }
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
      timeout: 10000
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
      Logger.error(`豆包API查询任务失败: ${errorMessage}`, error.response?.data);
      throw new Error(`豆包API查询任务失败: ${errorMessage}`);
    }
  }

  public async speechToText(audioPath: string): Promise<string> {
    const audioBuffer = await fs.readFile(audioPath);
    const audioBase64 = audioBuffer.toString('base64');

    // 提交任务
    const requestId = await this.submitAudioTask(audioBase64);
    
    // 轮询结果
    return this.pollTranscriptionResult(requestId);
  }

  private async pollTranscriptionResult(requestId: string): Promise<string> {
    const maxRetries = 60;
    const interval = 5000;

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      Logger.info(`查询豆包任务状态 (${i + 1}/${maxRetries}): ${requestId}`);
      
      try {
        const response = await this.queryAudioTask(requestId);
        
        if (response && response.result && response.result.text) {
          Logger.info(`豆包任务成功: ${requestId}`);
          return response.result.text;
        }
        
        // 如果有错误信息，抛出异常
        if (response && response.error) {
          throw new Error(`豆包语音识别任务失败: ${response.error}`);
        }
        
      } catch (error: any) {
        // 如果是查询错误且不是超时，直接抛出
        if (!error.message.includes('timeout')) {
          throw error;
        }
      }
    }
    
    throw new Error('豆包语音识别任务超时。');
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
}

export const doubaoVoiceService = DoubaoVoiceService.getInstance();