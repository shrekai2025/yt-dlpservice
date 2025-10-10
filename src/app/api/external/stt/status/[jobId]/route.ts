import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { validateExternalApiKey } from '~/lib/utils/auth';
import { Logger } from '~/lib/utils/logger';

/**
 * GET /api/external/stt/status/:jobId
 *
 * 查询STT任务状态和结果
 *
 * 支持:
 * - 任务状态查询
 * - 转录结果获取
 * - API Key认证
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

    // 2. 获取jobId参数
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: '缺少 jobId 参数'
        },
        { status: 400 }
      );
    }

    Logger.info(`🔍 查询STT任务状态: ${jobId}`);

    // 3. 从数据库查询任务
    const job = await db.sttJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: `任务不存在: ${jobId}`
        },
        { status: 404 }
      );
    }

    // 4. 构建响应数据
    const responseData: any = {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() || null,
      metadata: {
        fileName: job.originalName,
        fileSize: job.fileSize,
        fileSizeMB: (job.fileSize / 1024 / 1024).toFixed(2),
        duration: job.duration ? `${job.duration.toFixed(2)}s` : null,
        provider: job.provider,
        languageCode: job.languageCode,
        compressionPreset: job.compressionPreset,
        originalFileSize: job.originalFileSize,
        originalFileSizeMB: job.originalFileSize ? (job.originalFileSize / 1024 / 1024).toFixed(2) : null,
        compressedFileSize: job.compressedFileSize,
        compressedFileSizeMB: job.compressedFileSize ? (job.compressedFileSize / 1024 / 1024).toFixed(2) : null,
        compressionRatio: job.compressionRatio ? `${(job.compressionRatio * 100).toFixed(2)}%` : null
      }
    };

    // 5. 根据状态添加额外信息
    if (job.status === 'COMPLETED') {
      responseData.transcription = job.transcription;
      responseData.transcriptionLength = job.transcription?.length || 0;

      // 计算处理时长
      if (job.completedAt && job.createdAt) {
        const processingTime = job.completedAt.getTime() - job.createdAt.getTime();
        responseData.processingTimeMs = processingTime;
        responseData.processingTime = `${(processingTime / 1000).toFixed(2)}s`;
      }

      Logger.info(`✅ 任务完成: ${jobId}, 转录长度: ${responseData.transcriptionLength}字符`);

    } else if (job.status === 'FAILED') {
      responseData.errorMessage = job.errorMessage;

      Logger.warn(`❌ 任务失败: ${jobId}, 错误: ${job.errorMessage}`);

    } else if (job.status === 'PROCESSING') {
      responseData.message = '任务正在处理中，请稍后再次查询';

      Logger.info(`⏳ 任务处理中: ${jobId}`);

    } else if (job.status === 'PENDING') {
      responseData.message = '任务等待处理中';

      Logger.info(`⏳ 任务等待中: ${jobId}`);
    }

    // 6. 返回响应
    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    Logger.error(`❌ 查询STT任务状态失败: ${error.message}`);
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
