/**
 * 测试Gemini API通过代理的连接
 */

import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY';
const PROXY_HOST = process.env.PROXY_HOST || '127.0.0.1';
const PROXY_PORT = parseInt(process.env.PROXY_PORT || '7897');

async function testGeminiProxy() {
  console.log('🧪 测试Gemini API代理连接');
  console.log(`代理: ${PROXY_HOST}:${PROXY_PORT}`);
  console.log(`API Key: ${GEMINI_API_KEY.substring(0, 10)}...`);
  console.log('');

  // 测试1: 简单的文本生成（不带图片）
  console.log('📝 测试1: 文本生成（无图片）');
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: 'Say hello in Chinese',
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        proxy: {
          host: PROXY_HOST,
          port: PROXY_PORT,
          protocol: 'http',
        },
        timeout: 30000,
      }
    );

    console.log('✅ 文本生成成功');
    console.log('响应:', response.data);
    console.log('');
  } catch (error: any) {
    console.error('❌ 文本生成失败');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误:', error.message);
    }
    console.log('');
  }

  // 测试2: 不使用代理的请求
  console.log('📝 测试2: 不使用代理');
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: 'Say hello in Chinese',
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('✅ 直连成功');
    console.log('响应:', response.data);
    console.log('');
  } catch (error: any) {
    console.error('❌ 直连失败');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('错误:', error.message);
    }
    console.log('');
  }

  // 测试3: 通过代理访问Google（测试代理本身）
  console.log('📝 测试3: 测试代理连接Google');
  try {
    const response = await axios.get('https://www.google.com', {
      proxy: {
        host: PROXY_HOST,
        port: PROXY_PORT,
        protocol: 'http',
      },
      timeout: 10000,
      validateStatus: () => true,
    });

    console.log('✅ 代理连接Google成功');
    console.log('状态码:', response.status);
    console.log('');
  } catch (error: any) {
    console.error('❌ 代理连接Google失败');
    console.error('错误:', error.message);
    console.log('');
  }
}

// 运行测试
testGeminiProxy()
  .then(() => {
    console.log('✅ 所有测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
