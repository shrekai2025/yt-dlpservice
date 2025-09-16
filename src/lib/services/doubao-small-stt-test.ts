/**
 * 豆包小模型STT服务测试
 * 这个文件用于测试服务的基本功能，验证配置和连接性
 */

import doubaoSmallSTTService from './doubao-small-stt';
import { Logger } from '~/lib/utils/logger';

/**
 * 测试豆包小模型服务状态
 */
export async function testDoubaoSmallService() {
  try {
    Logger.info('🧪 开始测试豆包小模型服务...');
    
    // 测试服务状态
    const status = await doubaoSmallSTTService.checkServiceStatus();
    
    Logger.info('📊 豆包小模型服务测试结果:');
    Logger.info(`  - 可用性: ${status.available ? '✅ 可用' : '❌ 不可用'}`);
    Logger.info(`  - 状态消息: ${status.message}`);
    
    if (status.available) {
      Logger.info('🎉 豆包小模型服务测试通过！');
      return true;
    } else {
      Logger.warn('⚠️ 豆包小模型服务不可用，请检查配置');
      return false;
    }
    
  } catch (error: any) {
    Logger.error(`❌ 豆包小模型服务测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 打印配置状态
 */
export function printConfigurationStatus() {
  Logger.info('🔧 豆包小模型服务配置状态:');
  
  const configs = [
    { name: 'DOUBAO_SMALL_APP_ID', value: process.env.DOUBAO_SMALL_APP_ID },
    { name: 'DOUBAO_SMALL_TOKEN', value: process.env.DOUBAO_SMALL_TOKEN },
    { name: 'DOUBAO_SMALL_CLUSTER', value: process.env.DOUBAO_SMALL_CLUSTER },
    { name: 'DOUBAO_SMALL_ENDPOINT', value: process.env.DOUBAO_SMALL_ENDPOINT },
    { name: 'TOS_ACCESS_KEY_ID', value: process.env.TOS_ACCESS_KEY_ID },
    { name: 'TOS_SECRET_ACCESS_KEY', value: process.env.TOS_SECRET_ACCESS_KEY },
    { name: 'TOS_REGION', value: process.env.TOS_REGION },
    { name: 'TOS_BUCKET_NAME', value: process.env.TOS_BUCKET_NAME },
    { name: 'TOS_ENDPOINT', value: process.env.TOS_ENDPOINT }
  ];
  
  configs.forEach(config => {
    const status = config.value ? '✅ 已配置' : '❌ 未配置';
    const valueDisplay = config.value ? 
      (config.name.includes('SECRET') || config.name.includes('TOKEN') ? 
        `${config.value.substring(0, 8)}...` : config.value) : 
      '未设置';
    Logger.info(`  - ${config.name}: ${status} (${valueDisplay})`);
  });
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  async function runTest() {
    printConfigurationStatus();
    await testDoubaoSmallService();
  }
  
  runTest().catch(console.error);
}
