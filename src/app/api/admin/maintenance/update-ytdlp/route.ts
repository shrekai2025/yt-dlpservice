import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { Logger } from '~/lib/utils/logger'

const execAsync = promisify(exec)

/**
 * POST /api/admin/maintenance/update-ytdlp
 * 更新 yt-dlp 到最新版本
 */
export async function POST() {
  try {
    Logger.info('开始更新 yt-dlp...')

    // 尝试多种更新方式，按优先级排序
    const updateCommands = [
      // 方式1: 使用 pip3 用户安装更新
      'python3 -m pip install --upgrade --user yt-dlp',
      // 方式2: 使用 pip 用户安装更新
      'pip3 install --upgrade --user yt-dlp',
      // 方式3: 使用 Homebrew 更新 (macOS)
      'brew upgrade yt-dlp',
      // 方式4: 使用 pipx 更新
      'pipx upgrade yt-dlp',
    ]

    let updateSuccess = false
    let lastError = ''
    let updateOutput = ''

    for (const cmd of updateCommands) {
      try {
        Logger.info(`尝试更新命令: ${cmd}`)
        const { stdout, stderr } = await execAsync(cmd, {
          timeout: 120000, // 2分钟超时
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        })

        updateOutput = stdout || stderr
        Logger.info(`更新成功: ${cmd}`)
        Logger.debug(`更新输出: ${updateOutput}`)
        updateSuccess = true
        break
      } catch (error: any) {
        lastError = error.message || String(error)
        Logger.debug(`命令 ${cmd} 失败: ${lastError}`)
        // 继续尝试下一个命令
        continue
      }
    }

    if (!updateSuccess) {
      Logger.error(`所有更新方式均失败，最后错误: ${lastError}`)
      return NextResponse.json({
        success: false,
        error: 'Update failed',
        message: '所有更新方式均失败，请手动更新 yt-dlp',
        details: lastError,
      }, { status: 500 })
    }

    // 获取更新后的版本
    let newVersion = ''
    try {
      // 尝试多个可能的 yt-dlp 路径
      const ytdlpPaths = [
        '/Users/uniteyoo/Library/Python/3.9/bin/yt-dlp',
        'yt-dlp',
        '/usr/local/bin/yt-dlp',
        '/opt/homebrew/bin/yt-dlp',
      ]

      for (const path of ytdlpPaths) {
        try {
          const { stdout } = await execAsync(`${path} --version`, { timeout: 5000 })
          newVersion = stdout.trim()
          break
        } catch {
          continue
        }
      }
    } catch {
      Logger.warn('无法获取更新后的版本号')
    }

    Logger.info(`yt-dlp 更新成功${newVersion ? `，新版本: ${newVersion}` : ''}`)

    return NextResponse.json({
      success: true,
      message: `yt-dlp 更新成功${newVersion ? ` (${newVersion})` : ''}`,
      version: newVersion,
      output: updateOutput,
    })
  } catch (error) {
    Logger.error(`更新 yt-dlp 失败: ${error}`)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
