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
    Logger.info(`  - 提交URL: ${submitUrl}`);
    Logger.info(`  - APP_KEY: ${this.appKey ? `${this.appKey.substring(0, 8)}...` : '未配置'}`);
    Logger.info(`  - ACCESS_KEY: ${this.accessKey ? `${this.accessKey.substring(0, 8)}...` : '未配置'}`);
    
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

    Logger.info(`⏱️ 豆包API请求配置:`);
    Logger.info(`  - 超时时间: ${finalTimeout}ms (${Math.round(finalTimeout/1000)}秒)`);
    Logger.info(`  - 请求体大小: ${JSON.stringify(requestBody).length} 字符`);

    // 重试机制
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        Logger.info(`📡 豆包API提交尝试 ${attempt}/${maxRetries}: ${requestId}`);
        const startTime = Date.now();
        
        const response = await axios(config);
        const responseTime = Date.now() - startTime;
        
        Logger.info(`✅ 豆包API请求成功:`);
        Logger.info(`  - 响应时间: ${responseTime}ms`);
        Logger.info(`  - HTTP状态: ${response.status}`);
        Logger.info(`  - 响应头状态码: ${response.headers['x-api-status-code'] || '无'}`);
        Logger.info(`  - 响应消息: ${response.headers['x-api-message'] || '无'}`);
        
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
        const responseTime = Date.now() - (error.config?.metadata?.startTime || Date.now());
        const errorMessage = error.response?.data?.message || error.message;
        
        Logger.error(`❌ 豆包API提交失败 (尝试${attempt}/${maxRetries}):`);
        Logger.error(`  - 错误类型: ${error.code || '未知'}`);
        Logger.error(`  - 错误消息: ${errorMessage}`);
        Logger.error(`  - HTTP状态: ${error.response?.status || '无响应'}`);
        Logger.error(`  - 响应时间: ${responseTime}ms`);
        
        if (error.response) {
          Logger.error(`  - 响应头: ${JSON.stringify(error.response.headers)}`);
          Logger.error(`  - 响应体: ${JSON.stringify(error.response.data)}`);
        }
        
        // 如果是最后一次尝试，或者是非网络错误，直接抛出
        if (attempt === maxRetries || (!error.code?.includes('TIMEOUT') && !error.code?.includes('ECONNRESET'))) {
          Logger.error(`💥 豆包API提交最终失败，停止重试`);
          break;
        }
        
        // 等待后重试
        const delay = attempt * 2000; // 递增延迟
        Logger.info(`⏳ 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const errorMessage = lastError.response?.data?.message || lastError.message;
    Logger.error(`💀 豆包API提交任务失败 (所有重试均失败): ${errorMessage}`);
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

    Logger.debug(`🔍 豆包API查询请求:`);
    Logger.debug(`  - 查询URL: ${queryUrl}`);
    Logger.debug(`  - 请求ID: ${requestId}`);
    Logger.debug(`  - 超时设置: 30秒`);

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
        
        Logger.debug(`📋 豆包API响应头:`);
        Logger.debug(`  - 状态码: ${statusCode || '无'}`);
        Logger.debug(`  - 消息: ${message || '无'}`);
        
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