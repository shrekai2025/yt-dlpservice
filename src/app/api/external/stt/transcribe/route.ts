import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import * as path from 'path';
import { db } from '~/server/db';
import { validateExternalApiKey } from '~/lib/utils/auth';
import { getAudioFileInfo } from '~/lib/services/audio-utils';
import { audioCompressor } from '~/lib/services/audio-compressor';
import { Logger } from '~/lib/utils/logger';
import { z } from 'zod';

// 请求验证Schema
const transcribeRequestSchema = z.object({
  provider: z.enum(['google', 'doubao', 'doubao-small']).default('doubao-small'),
  languageCode: z.enum(['cmn-Hans-CN', 'en-US']).optional(),
  compressionPreset: z.enum(['none', 'light', 'standard', 'heavy']).default('standard')
});

/**
 * POST /api/external/stt/transcribe
 *
 * 音频文件STT转录REST API
 *
 * 支持:
 * - 文件上传 (multipart/form-data)
 * - 多STT提供商 (google, doubao, doubao-small)
 * - 异步处理
 * - 音频压缩
 * - API Key认证
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证API Key
    const authResult = validateExternalApiKey(request);
    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: authResult.error
        },
        { status: 401 }
      );
    }

    // 2. 解析multipart/form-data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const providerParam = formData.get('provider') as string | null;
    const languageCodeParam = formData.get('languageCode') as string | null;
    const compressionPresetParam = formData.get('compressionPreset') as string | null;

    if (!audioFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: '缺少音频文件，请使用 "audio" 字段上传文件'
        },
        { status: 400 }
      );
    }

    // 3. 验证参数
    const validationResult = transcribeRequestSchema.safeParse({
      provider: providerParam || 'doubao-small',
      languageCode: languageCodeParam || undefined,
      compressionPreset: compressionPresetParam || 'standard'
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: '参数验证失败',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { provider, languageCode, compressionPreset } = validationResult.data;

    // 4. 验证Google STT语言参数
    if (provider === 'google' && !languageCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: 'Google STT需要指定 languageCode 参数 (cmn-Hans-CN 或 en-US)'
        },
        { status: 400 }
      );
    }

    Logger.info(`📥 收到STT转录请求:`);
    Logger.info(`  - 文件名: ${audioFile.name}`);
    Logger.info(`  - 文件大小: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`);
    Logger.info(`  - 提供商: ${provider}`);
    Logger.info(`  - 语言: ${languageCode || 'N/A'}`);
    Logger.info(`  - 压缩预设: ${compressionPreset}`);

    // 5. 检查文件大小（最大512MB）
    const maxSize = 512 * 1024 * 1024; // 512MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: `文件过大，最大支持 512MB，当前文件: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`
        },
        { status: 400 }
      );
    }

    // 6. 检查文件类型
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/m4a'];
    if (!allowedTypes.includes(audioFile.type) && !audioFile.name.match(/\.(mp3|wav|ogg|m4a|mp4)$/i)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: '不支持的音频格式，请上传 MP3、WAV、OGG、M4A 或 MP4 格式'
        },
        { status: 400 }
      );
    }

    // 7. 保存上传的音频文件
    const tempDir = path.join(process.cwd(), 'data', 'temp', 'stt-api');
    await mkdir(tempDir, { recursive: true });

    const timestamp = Date.now();
    const fileExt = path.extname(audioFile.name);
    const safeFileName = `stt-${timestamp}${fileExt}`;
    const audioPath = path.join(tempDir, safeFileName);

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(audioPath, buffer);

    Logger.info(`✅ 音频文件已保存: ${audioPath}`);

    // 8. 获取音频信息
    let duration: number | null = null;
    const originalFileSize = audioFile.size;

    try {
      const audioInfo = await getAudioFileInfo(audioPath);
      duration = audioInfo.duration ?? null;
      if (duration) {
        Logger.info(`🎵 音频时长: ${duration.toFixed(2)}秒`);
      }
    } catch (error) {
      Logger.warn(`⚠️ 无法获取音频时长: ${error}`);
    }

    // 9. 音频压缩（如果需要）
    let finalAudioPath = audioPath;
    let compressedFileSize: number | null = null;
    let compressionRatio: number | null = null;

    if (compressionPreset !== 'none') {
      try {
        Logger.info(`🗜️ 开始音频压缩 (${compressionPreset})...`);
        const compressionResult = await audioCompressor.compressAudio({ inputPath: audioPath, outputPath: audioPath, preset: compressionPreset as any });

        finalAudioPath = compressionResult.compressedPath || audioPath;
        compressedFileSize = compressionResult.compressedSize ?? null;
        compressionRatio = compressionResult.compressionRatio ?? null;

        Logger.info(`✅ 音频压缩完成:`);
        Logger.info(`  - 原始大小: ${(originalFileSize / 1024 / 1024).toFixed(2)}MB`);
        if (compressedFileSize) {
          Logger.info(`  - 压缩后: ${(compressedFileSize / 1024 / 1024).toFixed(2)}MB`);
        }
        if (compressionRatio) {
          Logger.info(`  - 压缩比: ${(compressionRatio * 100).toFixed(2)}%`);
        }
      } catch (error: any) {
        Logger.error(`❌ 音频压缩失败: ${error.message}`);
        // 压缩失败，使用原始文件
        finalAudioPath = audioPath;
      }
    }

    // 10. 创建STT任务记录
    const sttJob = await db.sttJob.create({
      data: {
        audioPath: finalAudioPath,
        originalName: audioFile.name,
        fileSize: audioFile.size,
        duration: duration,
        provider: provider,
        languageCode: languageCode,
        compressionPreset: compressionPreset,
        originalFileSize: originalFileSize,
        compressedFileSize: compressedFileSize,
        compressionRatio: compressionRatio,
        status: 'PENDING',
        metadata: JSON.stringify({
          uploadedAt: new Date().toISOString(),
          originalPath: audioPath
        })
      }
    });

    Logger.info(`✅ STT任务已创建: ${sttJob.id}`);

    // 11. 立即开始处理任务（异步）
    processSTTJobAsync(sttJob.id).catch((error) => {
      Logger.error(`❌ STT任务处理失败 (${sttJob.id}): ${error.message}`);
    });

    // 12. 返回任务ID和状态
    return NextResponse.json(
      {
        success: true,
        data: {
          jobId: sttJob.id,
          status: 'PENDING',
          message: '任务已创建，正在处理中',
          metadata: {
            fileName: audioFile.name,
            fileSize: audioFile.size,
            fileSizeMB: (audioFile.size / 1024 / 1024).toFixed(2),
            duration: duration ? `${duration.toFixed(2)}s` : null,
            provider: provider,
            languageCode: languageCode,
            compressionPreset: compressionPreset,
            originalFileSize: originalFileSize,
            originalFileSizeMB: (originalFileSize / 1024 / 1024).toFixed(2),
            compressedFileSize: compressedFileSize,
            compressedFileSizeMB: compressedFileSize ? (compressedFileSize / 1024 / 1024).toFixed(2) : null,
            compressionRatio: compressionRatio ? `${(compressionRatio * 100).toFixed(2)}%` : null
          }
        }
      },
      { status: 202 } // 202 Accepted
    );

  } catch (error: any) {
    Logger.error(`❌ STT API错误: ${error.message}`);
    Logger.error(error.stack);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: error.message || '服务器内部错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 异步处理STT任务
 */
async function processSTTJobAsync(jobId: string): Promise<void> {
  try {
    // 更新任务状态为处理中
    await db.sttJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' }
    });

    Logger.info(`🚀 开始处理STT任务: ${jobId}`);

    // 获取任务详情
    const job = await db.sttJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      throw new Error(`任务不存在: ${jobId}`);
    }

    // 根据provider调用对应的STT服务
    let transcription: string;

    if (job.provider === 'google') {
      const GoogleSpeechService = (await import('~/lib/services/google-stt')).default;
      const googleSttService = GoogleSpeechService.getInstance();
      transcription = await googleSttService.speechToText(job.audioPath, undefined, job.languageCode || undefined);
    } else if (job.provider === 'doubao') {
      const { doubaoVoiceService } = await import('~/lib/services/doubao-voice');
      transcription = await doubaoVoiceService.speechToText(job.audioPath);
    } else if (job.provider === 'doubao-small') {
      const doubaoSmallSTTService = (await import('~/lib/services/doubao-small-stt')).default;
      transcription = await doubaoSmallSTTService.speechToText(job.audioPath);
    } else {
      throw new Error(`不支持的STT提供商: ${job.provider}`);
    }

    // 更新任务为完成状态
    await db.sttJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        transcription: transcription,
        completedAt: new Date()
      }
    });

    Logger.info(`✅ STT任务完成: ${jobId}`);
    Logger.info(`  - 转录长度: ${transcription.length}字符`);

  } catch (error: any) {
    Logger.error(`❌ STT任务处理失败 (${jobId}): ${error.message}`);

    // 更新任务为失败状态
    await db.sttJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: error.message || '未知错误',
        completedAt: new Date()
      }
    });
  }
}
