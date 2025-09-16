import axios, { type AxiosRequestConfig } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { TosClient, TosClientError, TosServerError, ACLType, DataTransferType } from '@volcengine/tos-sdk';
import { env } from '~/env';
import { Logger } from '~/lib/utils/logger';
import { ConfigManager } from '~/lib/utils/config';
import { GlobalInit } from '~/lib/utils/global-init';

/**
 * 豆包录音文件识别（小模型版）服务
 * 
 * 功能特性：
 * - 火山引擎TOS音频文件上传
 * - 豆包小模型API任务提交和轮询
 * - Token认证方式（简单安全）
 * - 自动文件清理
 * - 错误重试机制
 */
class DoubaoSmallSTTService {
  private static instance: DoubaoSmallSTTService;
  private appId: string = '';
  private token: string = '';
  private cluster: string = '';
  private endpoint: string = '';
  private tosAccessKeyId: string = '';
  private tosSecretAccessKey: string = '';
  private tosRegion: string = '';
  private tosBucketName: string = '';
  private tosEndpoint: string = '';
  private tosClient: TosClient | null = null;
  private isInitializing: boolean = false;

  private constructor() {
    // 按需初始化
  }

  public static getInstance(): DoubaoSmallSTTService {
    if (!DoubaoSmallSTTService.instance) {
      DoubaoSmallSTTService.instance = new DoubaoSmallSTTService();
    }
    return DoubaoSmallSTTService.instance;
  }

  /**
   * 初始化服务配置
   */
  private async initialize(): Promise<void> {
    // 尝试获取初始化权限
    if (!GlobalInit.tryInitializeDoubaoSmall()) {
      // 如果没有获取到权限，等待其他实例完成初始化
      await GlobalInit.waitForDoubaoSmall();
      return;
    }
    
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      Logger.info('🎤 开始初始化豆包录音文件识别服务（小模型版）...');
      
      // 从数据库获取配置，失败时使用环境变量
      await this.loadConfiguration();
      
      // 验证配置完整性
      this.validateConfiguration();
      
      // 初始化TOS客户端
      this.initializeTOSClient();
      
      Logger.info('✅ 豆包录音文件识别服务（小模型版）初始化完成');
      GlobalInit.setDoubaoSmallInitialized({
        appId: this.appId,
        token: this.token,
        cluster: this.cluster,
        endpoint: this.endpoint
      });
      
    } catch (error) {
      GlobalInit.setDoubaoSmallInitializationFailed();
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 加载配置信息
   */
  private async loadConfiguration(): Promise<void> {
    // 豆包小模型API配置
    try {
      this.appId = await ConfigManager.get('doubao_small_app_id');
    } catch {
      this.appId = env.DOUBAO_SMALL_APP_ID || '';
    }
    
    try {
      this.token = await ConfigManager.get('doubao_small_token');
    } catch {
      this.token = env.DOUBAO_SMALL_TOKEN || '';
    }
    
    try {
      this.cluster = await ConfigManager.get('doubao_small_cluster');
    } catch {
      this.cluster = env.DOUBAO_SMALL_CLUSTER || '';
    }
    
    try {
      this.endpoint = await ConfigManager.get('doubao_small_endpoint');
    } catch {
      this.endpoint = env.DOUBAO_SMALL_ENDPOINT || 'openspeech.bytedance.com';
    }

    // TOS配置
    try {
      this.tosAccessKeyId = await ConfigManager.get('tos_access_key_id');
    } catch {
      this.tosAccessKeyId = env.TOS_ACCESS_KEY_ID || '';
    }
    
    try {
      this.tosSecretAccessKey = await ConfigManager.get('tos_secret_access_key');
    } catch {
      this.tosSecretAccessKey = env.TOS_SECRET_ACCESS_KEY || '';
    }
    
    try {
      this.tosRegion = await ConfigManager.get('tos_region');
    } catch {
      this.tosRegion = env.TOS_REGION || 'ap-southeast-1';
    }
    
    try {
      this.tosBucketName = await ConfigManager.get('tos_bucket_name');
    } catch {
      this.tosBucketName = env.TOS_BUCKET_NAME || 'stt-small-01';
    }
    
    try {
      this.tosEndpoint = await ConfigManager.get('tos_endpoint');
    } catch {
      this.tosEndpoint = env.TOS_ENDPOINT || 'tos-ap-southeast-1.volces.com';
    }

    Logger.info('🔧 豆包小模型API配置状态:');
    Logger.info(`  - APP_ID: ${this.appId ? '已配置' : '❌ 未配置'}`);
    Logger.info(`  - TOKEN: ${this.token ? '已配置' : '❌ 未配置'}`);
    Logger.info(`  - CLUSTER: ${this.cluster ? '已配置' : '❌ 未配置'}`);
    Logger.info(`  - ENDPOINT: ${this.endpoint}`);
    
    Logger.info('🔧 TOS配置状态:');
    Logger.info(`  - ACCESS_KEY_ID: ${this.tosAccessKeyId ? '已配置' : '❌ 未配置'}`);
    Logger.info(`  - SECRET_ACCESS_KEY: ${this.tosSecretAccessKey ? '已配置' : '❌ 未配置'}`);
    Logger.info(`  - REGION: ${this.tosRegion}`);
    Logger.info(`  - BUCKET: ${this.tosBucketName}`);
    Logger.info(`  - ENDPOINT: ${this.tosEndpoint}`);
  }

  /**
   * 初始化TOS客户端
   */
  private initializeTOSClient(): void {
    try {
      Logger.info('🔧 初始化TOS客户端...');
      
      this.tosClient = new TosClient({
        accessKeyId: this.tosAccessKeyId,
        accessKeySecret: this.tosSecretAccessKey,
        region: this.tosRegion,
        endpoint: this.tosEndpoint, // SDK会自动添加https://协议
        requestTimeout: 300000, // 5分钟超时
        connectionTimeout: 30000, // 30秒连接超时
        maxRetryCount: 3, // 最大重试3次
        enableCRC: true // 启用CRC校验
      });
      
      Logger.info('✅ TOS客户端初始化完成');
      
    } catch (error: any) {
      Logger.error(`❌ TOS客户端初始化失败: ${error.message}`);
      throw new Error(`TOS客户端初始化失败: ${error.message}`);
    }
  }

  /**
   * 验证配置完整性
   */
  private validateConfiguration(): void {
    const missingConfigs: string[] = [];
    
    if (!this.appId) missingConfigs.push('DOUBAO_SMALL_APP_ID');
    if (!this.token) missingConfigs.push('DOUBAO_SMALL_TOKEN');
    if (!this.cluster) missingConfigs.push('DOUBAO_SMALL_CLUSTER');
    if (!this.tosAccessKeyId) missingConfigs.push('TOS_ACCESS_KEY_ID');
    if (!this.tosSecretAccessKey) missingConfigs.push('TOS_SECRET_ACCESS_KEY');
    
    if (missingConfigs.length > 0) {
      Logger.error('❌ 豆包小模型服务配置不完整！');
      Logger.error(`缺少配置: ${missingConfigs.join(', ')}`);
      Logger.error('请检查 .env.local 文件或数据库配置');
      throw new Error(`豆包小模型服务配置不完整: ${missingConfigs.join(', ')}`);
    }
  }

  /**
   * 确保服务已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.appId || !this.token || !this.cluster) {
      await this.initialize();
    }
  }


  /**
   * 上传音频文件到TOS
   */
  private async uploadAudioToTOS(audioPath: string, taskId: string): Promise<string> {
    try {
      if (!this.tosClient) {
        throw new Error('TOS客户端未初始化');
      }

      Logger.info(`📤 开始上传音频文件到TOS: ${audioPath}`);
      
      // 生成唯一的对象键
      const timestamp = Date.now();
      const fileExt = path.extname(audioPath);
      const objectKey = `audio/${taskId}-${timestamp}${fileExt}`;
      
      // 获取文件信息
      const stats = await fs.stat(audioPath);
      const fileSizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
      
      Logger.info(`📊 音频文件信息:`);
      Logger.info(`  - 大小: ${fileSizeMB}MB`);
      Logger.info(`  - 对象键: ${objectKey}`);
      
      const startTime = Date.now();
      
      // 使用SDK上传文件
      const result = await this.tosClient.putObjectFromFile({
        bucket: this.tosBucketName,
        key: objectKey,
        filePath: audioPath,
        contentType: this.getContentType(fileExt),
        acl: ACLType.ACLPrivate, // 私有访问
        // 配置进度回调
        dataTransferStatusChange: (event) => {
          if (event.type === DataTransferType.Rw) {
            const percent = ((event.consumedBytes / event.totalBytes) * 100).toFixed(1);
            Logger.debug(`📤 上传进度: ${percent}%`);
          }
        }
      });
      
      const uploadTime = Date.now() - startTime;
      
      Logger.info(`✅ TOS上传成功:`);
      Logger.info(`  - 状态码: ${result.statusCode}`);
      Logger.info(`  - 耗时: ${uploadTime}ms`);
      Logger.info(`  - 对象键: ${objectKey}`);
      
      // 生成预签名URL (2小时有效)
      const preSignedUrl = this.tosClient.getPreSignedUrl({
        bucket: this.tosBucketName,
        key: objectKey,
        method: 'GET', // GET方法用于下载
        expires: 2 * 60 * 60 // 2小时
      });
      
      Logger.info(`🔗 音频文件预签名URL已生成 (有效期: 2小时)`);
      return preSignedUrl;
      
    } catch (error: any) {
      // 处理TOS SDK错误
      if (error instanceof TosClientError) {
        Logger.error(`❌ TOS客户端错误: ${error.message}`);
        Logger.error(`  - 错误堆栈: ${error.stack}`);
        throw new Error(`TOS客户端错误: ${error.message}`);
      } else if (error instanceof TosServerError) {
        Logger.error(`❌ TOS服务器错误:`);
        Logger.error(`  - 请求ID: ${error.requestId}`);
        Logger.error(`  - 状态码: ${error.statusCode}`);
        Logger.error(`  - 错误码: ${error.code}`);
        Logger.error(`  - 错误消息: ${error.message}`);
        Logger.error(`  - 响应头: ${JSON.stringify(error.headers)}`);
        throw new Error(`TOS服务器错误 (${error.code}): ${error.message}`);
      } else {
        Logger.error(`❌ TOS上传失败: ${error.message}`);
        throw new Error(`TOS上传失败: ${error.message}`);
      }
    }
  }

  /**
   * 根据文件扩展名获取Content-Type
   */
  private getContentType(fileExt: string): string {
    const contentTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.mp4': 'audio/mp4'
    };
    
    return contentTypes[fileExt.toLowerCase()] || 'audio/mpeg';
  }

  /**
   * 提交转录任务到豆包API
   */
  private async submitTranscriptionTask(audioUrl: string): Promise<string> {
    try {
      Logger.info(`📝 提交转录任务到豆包API...`);
      
      const submitUrl = `https://${this.endpoint}/api/v1/auc/submit`;
      
      const requestBody = {
        app: {
          appid: this.appId,
          token: this.token,
          cluster: this.cluster
        },
        user: {
          uid: `yt-dlpservice-${Date.now()}`
        },
        audio: {
          format: "mp3",
          url: audioUrl
        },
        additions: {
          use_itn: "True",
          use_punc: "True", 
          use_ddc: "False",
          with_speaker_info: "False",
          language: "zh-CN"
        }
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer; ${this.token}`
      };
      
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: submitUrl,
        headers,
        data: requestBody,
        timeout: 60000 // 1分钟超时
      };
      
      Logger.info(`🚀 发送请求到: ${submitUrl}`);
      Logger.info(`📤 请求体:`, JSON.stringify(requestBody, null, 2));
      
      const response = await axios(config);
      
      Logger.info(`📥 豆包API响应:`, JSON.stringify(response.data, null, 2));
      
      if (response.data?.resp?.code === 1000) {
        const taskId = response.data.resp.id;
        Logger.info(`✅ 任务提交成功，任务ID: ${taskId}`);
        return taskId;
      } else {
        const errorMsg = response.data?.resp?.message || '未知错误';
        Logger.error(`❌ 任务提交失败: ${errorMsg}`);
        throw new Error(`豆包API任务提交失败: ${errorMsg}`);
      }
      
    } catch (error: any) {
      Logger.error(`❌ 豆包API任务提交失败: ${error.message}`);
      if (error.response) {
        Logger.error(`  - 状态码: ${error.response.status}`);
        Logger.error(`  - 响应: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * 轮询获取转录结果
   */
  private async pollTranscriptionResult(taskId: string): Promise<string> {
    // 参考现有豆包API的轮询策略：80次轮询，30秒间隔，最多40分钟
    const maxRetries = 80;
    const baseInterval = 30000; // 30秒
    const maxWaitTime = maxRetries * baseInterval;

    Logger.info(`🔄 开始轮询豆包小模型任务结果:`);
    Logger.info(`  - 任务ID: ${taskId}`);
    Logger.info(`  - 最大轮询次数: ${maxRetries}`);
    Logger.info(`  - 轮询间隔: ${baseInterval/1000}秒`);
    Logger.info(`  - 最大等待时间: ${Math.round(maxWaitTime/60000)}分钟`);

    let consecutiveTimeouts = 0;
    const maxConsecutiveTimeouts = 5;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const currentInterval = baseInterval;
        
        Logger.info(`🔍 第${i + 1}/${maxRetries}次查询任务状态: ${taskId}`);
        
        const result = await this.queryTaskResult(taskId);
        
        // 重置连续超时计数
        consecutiveTimeouts = 0;
        
        if (result.code === 1000) {
          // 任务完成
          const transcriptionText = result.text || '';
          const totalElapsedTime = (i + 1) * currentInterval;
          
          Logger.info(`🎉 豆包小模型任务转录完成:`);
          Logger.info(`  - 任务ID: ${taskId}`);
          Logger.info(`  - 轮询次数: ${i + 1}/${maxRetries}`);
          Logger.info(`  - 总耗时: ${Math.round(totalElapsedTime / 1000)}秒`);
          Logger.info(`  - 转录长度: ${transcriptionText.length}字符`);
          Logger.info(`  - 转录预览: ${transcriptionText.substring(0, 300)}${transcriptionText.length > 300 ? '...' : ''}`);
          
          return transcriptionText;
          
        } else if (result.code === 2000 || result.code === 2001) {
          // 任务处理中或排队中
          Logger.info(`⏳ 任务${result.code === 2000 ? '处理中' : '排队中'}: ${result.message || 'Processing...'}`);
          
        } else if (result.code < 2000) {
          // 任务失败
          Logger.error(`💥 豆包小模型任务失败:`);
          Logger.error(`  - 任务ID: ${taskId}`);
          Logger.error(`  - 错误码: ${result.code}`);
          Logger.error(`  - 错误消息: ${result.message || '未知错误'}`);
          throw new Error(`豆包小模型任务失败 (${result.code}): ${result.message || '未知错误'}`);
        }
        
        // 如果不是最后一次轮询，等待指定时间
        if (i < maxRetries - 1) {
          Logger.info(`⏱️ 等待${currentInterval/1000}秒后继续查询...`);
          await new Promise(resolve => setTimeout(resolve, currentInterval));
        }
        
      } catch (error: any) {
        Logger.warn(`⚠️ 第${i + 1}次查询出错: ${error.message}`);
        
        // 如果是查询超时，记录并继续重试
        if (error.message.includes('豆包小模型API查询超时')) {
          consecutiveTimeouts++;
          Logger.warn(`⏰ 查询超时 (连续${consecutiveTimeouts}次):`);
          Logger.warn(`  - 任务ID: ${taskId}`);
          Logger.warn(`  - 当前轮询: ${i + 1}/${maxRetries}`);
          
          // 如果连续超时次数过多，可能是网络问题
          if (consecutiveTimeouts >= maxConsecutiveTimeouts) {
            Logger.error(`🌐 连续超时${consecutiveTimeouts}次，疑似网络问题:`);
            Logger.error(`  - 任务ID: ${taskId}`);
            Logger.error(`建议检查网络连接或稍后重试`);
          }
          continue;
        }
        
        // 如果是其他API错误，直接抛出
        if (!error.message.includes('timeout') && !error.message.includes('ECONNRESET') && !error.message.includes('ECONNREFUSED')) {
          Logger.error(`💥 豆包小模型任务处理失败:`);
          Logger.error(`  - 任务ID: ${taskId}`);
          Logger.error(`  - 错误类型: ${error.constructor.name}`);
          Logger.error(`  - 错误消息: ${error.message}`);
          Logger.error(`  - 当前轮询: ${i + 1}/${maxRetries}`);
          throw error;
        }
        
        // 网络错误，记录并继续重试
        Logger.warn(`🌐 网络错误 (第${i + 1}次查询):`);
        Logger.warn(`  - 错误: ${error.message}`);
        Logger.warn(`继续重试...`);
        
        // 网络错误时等待时间稍短一些
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒
        }
      }
    }
    
    Logger.error(`💀 豆包小模型语音识别任务超时:`);
    Logger.error(`  - 任务ID: ${taskId}`);
    Logger.error(`  - 已轮询次数: ${maxRetries}`);
    Logger.error(`  - 总等待时间: ${maxWaitTime/60000}分钟`);
    Logger.error(`  - 最后状态: 轮询超时`);
    throw new Error(`豆包小模型语音识别任务超时，已等待${maxWaitTime/60000}分钟`);
  }

  /**
   * 查询单次任务结果
   */
  private async queryTaskResult(taskId: string): Promise<{code: number, message: string, text?: string}> {
    const queryUrl = `https://${this.endpoint}/api/v1/auc/query`;
    
    const requestBody = {
      appid: this.appId,
      token: this.token,
      cluster: this.cluster,
      id: taskId
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer; ${this.token}`
    };
    
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: queryUrl,
      headers,
      data: requestBody,
      timeout: 30000 // 30秒超时
    };
    
    const response = await axios(config);
    
    const result = response.data?.resp;
    if (!result) {
      throw new Error('豆包小模型API返回格式异常');
    }
    
    return {
      code: result.code,
      message: result.message || '',
      text: result.text
    };
  }

  /**
   * 从TOS删除音频文件
   */
  private async deleteAudioFromTOS(audioUrl: string): Promise<void> {
    try {
      if (!this.tosClient) {
        Logger.warn(`⚠️ TOS客户端未初始化，跳过文件删除`);
        return;
      }

      Logger.info(`🗑️ 删除TOS音频文件: ${audioUrl}`);
      
      // 从预签名URL中提取对象键
      let objectKey: string;
      
      if (audioUrl.includes('?')) {
        // 预签名URL格式: https://bucket.endpoint/objectKey?queryParams
        const url = new URL(audioUrl);
        objectKey = url.pathname.substring(1); // 移除开头的 '/'
      } else {
        // 普通URL格式: https://bucket.endpoint/objectKey
        const url = new URL(audioUrl);
        objectKey = url.pathname.substring(1);
      }
      
      Logger.info(`🗑️ 删除对象键: ${objectKey}`);
      
      // 使用SDK删除文件
      await this.tosClient.deleteObject({
        bucket: this.tosBucketName,
        key: objectKey
      });
      
      Logger.info(`✅ TOS文件删除成功: ${objectKey}`);
      
    } catch (error: any) {
      // 处理TOS SDK错误
      if (error instanceof TosClientError) {
        Logger.warn(`⚠️ TOS客户端删除错误: ${error.message}`);
      } else if (error instanceof TosServerError) {
        Logger.warn(`⚠️ TOS服务器删除错误 (${error.code}): ${error.message}`);
      } else {
        Logger.warn(`⚠️ TOS文件删除失败: ${error.message}`);
      }
      // 删除失败不影响主流程，只记录警告
    }
  }

  /**
   * 任务完成后清理文件
   */
  private async cleanupAfterTask(audioUrl: string, audioPath?: string): Promise<void> {
    try {
      Logger.info(`🧹 开始清理任务文件...`);
      
      // 1. 删除TOS中的音频文件
      await this.deleteAudioFromTOS(audioUrl);
      
      // 2. 删除本地临时文件（如果存在）
      if (audioPath) {
        try {
          await fs.access(audioPath);
          await fs.unlink(audioPath);
          Logger.info(`✅ 本地文件删除成功: ${audioPath}`);
        } catch {
          // 文件可能已经不存在，忽略
        }
      }
      
      Logger.info(`✅ 任务文件清理完成`);
      
    } catch (error: any) {
      Logger.warn(`⚠️ 文件清理失败: ${error.message}`);
      // 清理失败不影响主流程
    }
  }

  /**
   * 主入口：语音转文字
   */
  public async speechToText(audioPath: string): Promise<string> {
    let audioUrl: string | null = null;
    
    try {
      Logger.info(`🎤 开始豆包小模型语音识别: ${audioPath}`);
      
      // 初始化服务
      await this.ensureInitialized();
      
      // 验证音频文件
      await this.validateAudioFile(audioPath);
      
      // 生成任务ID用于文件命名
      const taskId = crypto.randomUUID();
      
      // 1. 上传音频文件到TOS
      audioUrl = await this.uploadAudioToTOS(audioPath, taskId);
      
      // 2. 提交转录任务
      const taskId_api = await this.submitTranscriptionTask(audioUrl);
      
      // 3. 轮询获取转录结果
      const transcription = await this.pollTranscriptionResult(taskId_api);
      
      if (!transcription || transcription.trim().length === 0) {
        Logger.error(`❌ 豆包小模型识别结果为空`);
        throw new Error('语音识别结果为空');
      }
      
      Logger.info(`✅ 豆包小模型语音识别成功 - 文本长度: ${transcription.length}字符`);
      
      // 4. 清理文件
      await this.cleanupAfterTask(audioUrl, audioPath);
      
      return transcription;
      
    } catch (error: any) {
      Logger.error(`❌ 豆包小模型语音转录失败: ${error.message}`);
      
      // 失败时也要清理文件
      if (audioUrl) {
        await this.cleanupAfterTask(audioUrl, audioPath);
      }
      
      throw error;
    }
  }

  /**
   * 验证音频文件
   */
  private async validateAudioFile(audioPath: string): Promise<void> {
    try {
      const stats = await fs.stat(audioPath);
      const fileSizeMB = stats.size / 1024 / 1024;
      
      Logger.info(`📊 音频文件验证:`);
      Logger.info(`  - 路径: ${audioPath}`);
      Logger.info(`  - 大小: ${Math.round(fileSizeMB * 100) / 100}MB`);
      
      // 检查文件大小限制（512MB）
      if (fileSizeMB > 512) {
        throw new Error(`音频文件过大: ${Math.round(fileSizeMB)}MB (限制: 512MB)`);
      }
      
      // 检查文件扩展名
      const ext = path.extname(audioPath).toLowerCase();
      if (!['.mp3', '.wav', '.ogg', '.mp4'].includes(ext)) {
        Logger.warn(`⚠️ 音频格式可能不受支持: ${ext}`);
      }
      
      Logger.info(`✅ 音频文件验证通过`);
      
    } catch (error: any) {
      Logger.error(`❌ 音频文件验证失败: ${error.message}`);
      throw new Error(`音频文件验证失败: ${error.message}`);
    }
  }

  /**
   * 检查服务状态
   */
  public async checkServiceStatus(): Promise<{available: boolean, message: string}> {
    try {
      await this.ensureInitialized();
      
      Logger.info(`🔍 检查豆包小模型服务状态...`);
      
      // 检查配置完整性
      this.validateConfiguration();
      
      // 简单的网络连接测试
      const testUrl = `https://${this.endpoint}`;
      const response = await axios.get(testUrl, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      const isNetworkOk = response.status < 500;
      
      if (isNetworkOk) {
        Logger.info(`✅ 豆包小模型服务状态正常`);
        return {
          available: true,
          message: '豆包小模型服务可用'
        };
      } else {
        Logger.warn(`⚠️ 豆包小模型服务网络异常: ${response.status}`);
        return {
          available: false,
          message: `网络连接异常: ${response.status}`
        };
      }
      
    } catch (error: any) {
      Logger.error(`❌ 豆包小模型服务状态检查失败: ${error.message}`);
      return {
        available: false,
        message: `服务不可用: ${error.message}`
      };
    }
  }
}

export { DoubaoSmallSTTService };
export default DoubaoSmallSTTService.getInstance();
