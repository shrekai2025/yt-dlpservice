#!/usr/bin/env tsx
/**
 * Twitter下载功能测试脚本
 *
 * 使用方法:
 *   npx tsx scripts/test-twitter-download.ts
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const testUrls = [
  // 使用真实的包含视频的推文URL进行测试
  // 注意: 这些URL可能会过期，建议使用最新的包含视频的推文
  'https://twitter.com/i/status/1234567890', // 示例URL，需要替换为真实的
  'https://x.com/i/status/1234567890',       // x.com域名测试
]

async function testTwitterDownload(url: string) {
  console.log(`\n========================================`)
  console.log(`测试 URL: ${url}`)
  console.log(`========================================\n`)

  try {
    // 测试1: 获取视频信息
    console.log('📋 测试1: 获取视频信息...')
    const infoCommand = `/Users/uniteyoo/Library/Python/3.9/bin/yt-dlp --dump-json --no-playlist "${url}"`

    try {
      const { stdout: infoStdout, stderr: infoStderr } = await execAsync(infoCommand, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      })

      if (infoStderr && infoStderr.includes('ERROR')) {
        console.error('❌ 获取信息失败:', infoStderr)
        return
      }

      const info = JSON.parse(infoStdout)
      console.log('✅ 视频信息:')
      console.log(`   标题: ${info.title || info.description || 'N/A'}`)
      console.log(`   作者: ${info.uploader || info.uploader_id || 'N/A'}`)
      console.log(`   时长: ${info.duration || 0} 秒`)
      console.log(`   观看数: ${info.view_count || 'N/A'}`)
      console.log(`   点赞数: ${info.like_count || 'N/A'}`)
      console.log(`   格式数: ${info.formats?.length || 0}`)

    } catch (error: any) {
      if (error.stderr?.includes('No video could be found')) {
        console.log('⚠️  该推文不包含视频内容')
      } else if (error.stderr?.includes('Could not authenticate')) {
        console.log('⚠️  需要登录才能访问此内容')
        console.log('💡 解决方案: 使用 --cookies-from-browser firefox 或 --cookies cookies.txt')
      } else {
        console.error('❌ 错误:', error.message)
      }
      return
    }

    // 测试2: 列出可用格式
    console.log('\n📋 测试2: 列出可用格式...')
    const formatCommand = `/Users/uniteyoo/Library/Python/3.9/bin/yt-dlp -F "${url}"`

    try {
      const { stdout: formatStdout } = await execAsync(formatCommand, {
        timeout: 30000
      })
      console.log('✅ 可用格式:')
      console.log(formatStdout)
    } catch (error: any) {
      console.log('⚠️  无法列出格式')
    }

    console.log('\n✅ 测试完成!')

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)
  }
}

async function main() {
  console.log('🚀 开始测试 Twitter 下载功能\n')
  console.log('⚠️  注意: 请将 testUrls 中的示例 URL 替换为真实的包含视频的推文 URL')
  console.log('⚠️  某些推文可能需要登录才能下载\n')

  // 测试平台支持
  console.log('========================================')
  console.log('测试 yt-dlp Twitter 提取器支持')
  console.log('========================================\n')

  try {
    const { stdout } = await execAsync('/Users/uniteyoo/Library/Python/3.9/bin/yt-dlp --list-extractors 2>&1 | grep -i twitter')
    console.log('✅ yt-dlp 支持的 Twitter 提取器:')
    console.log(stdout)
  } catch (error) {
    console.error('❌ 无法获取提取器列表')
  }

  // 测试每个URL
  for (const url of testUrls) {
    await testTwitterDownload(url)
  }

  console.log('\n========================================')
  console.log('💡 使用提示:')
  console.log('========================================')
  console.log('1. 找一个包含视频的推文URL进行测试')
  console.log('2. 如果需要登录，可以使用:')
  console.log('   yt-dlp --cookies-from-browser firefox <URL>')
  console.log('3. 或者导出浏览器cookies到文件:')
  console.log('   yt-dlp --cookies twitter_cookies.txt <URL>')
  console.log('========================================\n')
}

main().catch(console.error)
