/**
 * 音频扩展服务
 * 使用ffmpeg在音频前后添加静音，扩展音频长度
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { nanoid } from 'nanoid'
import axios from 'axios'

const execAsync = promisify(exec)

interface ExtendAudioOptions {
  inputUrl: string // 输入音频URL（可以是远程URL或本地路径）
  prefixDuration?: number // 前置静音时长（秒），默认2秒
  suffixDuration?: number // 后置静音时长（秒），默认2秒
}

interface ExtendAudioResult {
  success: boolean
  outputUrl?: string // 输出音频的公开访问URL
  localPath?: string // 输出音频的本地路径
  error?: string
}

export class AudioExtenderService {
  private readonly outputDir: string
  private readonly publicUrlPrefix: string

  constructor() {
    this.outputDir = path.join(process.cwd(), 'public', 'ai-generated', 'extended-audio')
    this.publicUrlPrefix = '/ai-generated/extended-audio'
  }

  /**
   * 扩展音频长度
   */
  async extendAudio(options: ExtendAudioOptions): Promise<ExtendAudioResult> {
    const { inputUrl, prefixDuration = 2, suffixDuration = 2 } = options

    try {
      // 1. 确保输出目录存在
      await fs.mkdir(this.outputDir, { recursive: true })

      // 2. 下载或定位输入音频文件
      const inputPath = await this.getInputAudioPath(inputUrl)

      // 3. 生成输出文件名
      const outputFileName = `extended-${nanoid()}.mp3`
      const outputPath = path.join(this.outputDir, outputFileName)

      // 4. 使用ffmpeg扩展音频
      // 方法：使用 adelay 和 apad 过滤器
      // adelay: 在开头添加延迟（静音）
      // apad: 在结尾添加静音填充
      const prefixMs = prefixDuration * 1000
      const suffixMs = suffixDuration * 1000

      const ffmpegCommand = [
        'ffmpeg',
        '-i', `"${inputPath}"`,
        '-af', `"adelay=${prefixMs}|${prefixMs},apad=pad_dur=${suffixDuration}"`,
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        '-y', // 覆盖输出文件
        `"${outputPath}"`
      ].join(' ')

      console.log(`[AudioExtender] Executing: ${ffmpegCommand}`)

      const { stdout, stderr } = await execAsync(ffmpegCommand)

      if (stderr && !stderr.includes('Lsize=')) {
        console.warn(`[AudioExtender] ffmpeg stderr:`, stderr)
      }

      // 5. 验证输出文件存在
      await fs.access(outputPath)

      // 6. 清理临时输入文件（如果是下载的）
      if (inputUrl.startsWith('http') || inputUrl.startsWith('https')) {
        await fs.unlink(inputPath).catch(() => {}) // 忽略删除错误
      }

      const publicUrl = `${this.publicUrlPrefix}/${outputFileName}`

      return {
        success: true,
        outputUrl: publicUrl,
        localPath: outputPath,
      }
    } catch (error) {
      console.error('[AudioExtender] Error extending audio:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 获取输入音频的本地路径
   * 如果是URL，先下载到临时目录
   */
  private async getInputAudioPath(inputUrl: string): Promise<string> {
    // 如果是本地路径（以/开头或public/开头）
    if (inputUrl.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', inputUrl)
      await fs.access(localPath) // 验证文件存在
      return localPath
    }

    // 如果是远程URL，下载到临时目录
    if (inputUrl.startsWith('http://') || inputUrl.startsWith('https://')) {
      const tempDir = path.join(process.cwd(), 'temp', 'audio-downloads')
      await fs.mkdir(tempDir, { recursive: true })

      const tempFileName = `temp-${nanoid()}.mp3`
      const tempPath = path.join(tempDir, tempFileName)

      console.log(`[AudioExtender] Downloading audio from ${inputUrl}`)

      const response = await axios.get(inputUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60秒超时
      })

      await fs.writeFile(tempPath, Buffer.from(response.data))

      return tempPath
    }

    throw new Error(`Unsupported input URL format: ${inputUrl}`)
  }

  /**
   * 删除扩展的音频文件
   */
  async deleteExtendedAudio(audioUrl: string): Promise<boolean> {
    try {
      if (!audioUrl) return false

      // 从URL提取本地路径
      let localPath: string
      if (audioUrl.startsWith(this.publicUrlPrefix)) {
        const fileName = audioUrl.replace(this.publicUrlPrefix + '/', '')
        localPath = path.join(this.outputDir, fileName)
      } else if (audioUrl.startsWith('/')) {
        localPath = path.join(process.cwd(), 'public', audioUrl)
      } else {
        return false
      }

      await fs.unlink(localPath)
      console.log(`[AudioExtender] Deleted extended audio: ${localPath}`)
      return true
    } catch (error) {
      console.error('[AudioExtender] Error deleting extended audio:', error)
      return false
    }
  }

  /**
   * 批量删除扩展的音频文件
   */
  async deleteMultipleExtendedAudio(audioUrls: string[]): Promise<number> {
    let deletedCount = 0
    for (const url of audioUrls) {
      const success = await this.deleteExtendedAudio(url)
      if (success) deletedCount++
    }
    return deletedCount
  }
}

// 导出单例实例
export const audioExtenderService = new AudioExtenderService()
