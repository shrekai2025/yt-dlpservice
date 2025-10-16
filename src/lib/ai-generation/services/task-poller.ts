/**
 * Task Poller Service
 *
 * 轮询异步任务状态
 */

import { createAdapter } from '../adapters/adapter-factory'
import { taskManager } from './task-manager'
import type { ModelConfig } from '../adapters/types'
import type { PrismaClient } from '@prisma/client'

export interface PollingOptions {
  pollIntervalMs?: number
  maxAttempts?: number
  maxDurationMs?: number // 最大轮询时长（毫秒）
}

const DEFAULT_POLLING_OPTIONS: Required<PollingOptions> = {
  pollIntervalMs: 5000, // 5 秒
  maxAttempts: 180, // 最多 180 次
  maxDurationMs: 1800000, // 最多 30 分钟
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 轮询单个异步任务
 */
export async function pollAsyncTask(
  taskId: string,
  providerTaskId: string,
  modelConfig: ModelConfig,
  db: PrismaClient,
  startedAt: number,
  options: PollingOptions = {}
) {
  const { pollIntervalMs, maxAttempts, maxDurationMs } = {
    ...DEFAULT_POLLING_OPTIONS,
    ...options,
  }

  console.log(`[TaskPoller] Starting polling for task ${taskId} (provider task: ${providerTaskId})`)
  console.log(`[TaskPoller] Config: maxAttempts=${maxAttempts}, maxDuration=${maxDurationMs}ms, interval=${pollIntervalMs}ms`)

  try {
    const adapter = createAdapter(modelConfig)

    // 检查适配器是否支持状态检查
    if (typeof adapter.checkTaskStatus !== 'function') {
      console.warn(
        `[TaskPoller] Adapter ${modelConfig.adapterName} does not support checkTaskStatus`
      )
      await taskManager.updateTask(taskId, {
        status: 'FAILED',
        errorMessage: 'Adapter does not support async polling',
        durationMs: Date.now() - startedAt,
      })
      return
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // 检查是否超时
      const elapsed = Date.now() - startedAt
      if (elapsed > maxDurationMs) {
        console.warn(`[TaskPoller] Task ${taskId} exceeded max duration ${maxDurationMs}ms`)
        await taskManager.updateTask(taskId, {
          status: 'FAILED',
          errorMessage: `Task timeout after ${Math.round(elapsed / 1000)}s (max: ${Math.round(maxDurationMs / 1000)}s)`,
          durationMs: elapsed,
        })
        
        // 记录超时告警
        const { systemAlertService } = await import('./system-alert-service')
        await systemAlertService.alertTaskTimeout(taskId, elapsed, {
          modelConfig: modelConfig.name,
          providerTaskId,
        })
        return
      }

      // 检查任务是否已被删除或状态已改变
      const currentTask = await db.aIGenerationTask.findUnique({
        where: { id: taskId },
        select: { deletedAt: true, status: true },
      })

      if (!currentTask || currentTask.deletedAt) {
        console.log(`[TaskPoller] Task ${taskId} deleted, stop polling`)
        return
      }

      if (currentTask.status !== 'PROCESSING' && currentTask.status !== 'PENDING') {
        console.log(
          `[TaskPoller] Task ${taskId} status changed to ${currentTask.status}, stop polling`
        )
        return
      }

      try {
        // 查询状态
        const status = await adapter.checkTaskStatus(providerTaskId)

        if (!status) {
          await sleep(pollIntervalMs!)
          continue
        }

        // 成功
        if (status.status === 'SUCCESS') {
          await taskManager.updateTask(taskId, {
            status: 'SUCCESS',
            results: JSON.stringify(status.results || []),
            completedAt: new Date(),
            responsePayload: JSON.stringify(status),
            durationMs: Date.now() - startedAt,
            progress: status.progress ?? 1,
          })

          await taskManager.incrementModelUsage(modelConfig.id)

          console.log(`[TaskPoller] Task ${taskId} completed successfully after ${attempt} attempts`)
          return
        }

        // 失败
        if (status.status === 'ERROR') {
          await taskManager.updateTask(taskId, {
            status: 'FAILED',
            errorMessage: status.message || status.error?.message || 'Generation failed',
            responsePayload: JSON.stringify(status),
            durationMs: Date.now() - startedAt,
            progress: status.progress ?? null,
          })

          console.warn(
            `[TaskPoller] Task ${taskId} failed after ${attempt} attempts: ${status.message}`
          )
          return
        }

        // 处理中 - 更新进度
        await taskManager.updateTask(taskId, {
          progress: status.progress ?? null,
          responsePayload: JSON.stringify(status),
        })
      } catch (error) {
        console.warn(`[TaskPoller] Polling error for task ${taskId} (attempt ${attempt})`, error)
        
        // 记录错误日志
        const { errorLogService } = await import('./error-log-service')
        await errorLogService.logError({
          level: 'WARN',
          source: 'TaskPoller',
          message: `Polling error for task ${taskId}`,
          stack: error instanceof Error ? error.stack : undefined,
          context: {
            taskId,
            providerTaskId,
            attempt,
            modelAdapter: modelConfig.adapterName,
          },
        })

        // 如果连续失败多次，标记任务失败
        if (attempt >= 3) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown polling error'
          console.error(`[TaskPoller] Task ${taskId} failed after ${attempt} polling errors`)
          await taskManager.updateTask(taskId, {
            status: 'FAILED',
            errorMessage: `Polling failed: ${errorMessage}`,
            durationMs: Date.now() - startedAt,
          })
          return
        }
      }

      await sleep(pollIntervalMs)
    }

    // 达到最大轮询次数
    console.warn(
      `[TaskPoller] Task ${taskId} did not complete within ${maxAttempts} polling attempts`
    )
    
    const elapsed = Date.now() - startedAt
    await taskManager.updateTask(taskId, {
      status: 'FAILED',
      errorMessage: `Task did not complete after ${maxAttempts} polling attempts (${Math.round(elapsed / 1000)}s)`,
      durationMs: elapsed,
    })
    
    // 记录告警
    const { systemAlertService } = await import('./system-alert-service')
    await systemAlertService.alertTaskTimeout(taskId, elapsed, {
      modelConfig: modelConfig.name,
      providerTaskId,
      maxAttempts,
    })
  } catch (error) {
    console.error(`[TaskPoller] Fatal error polling task ${taskId}`, error)
    
    // 记录严重错误
    const { errorLogService } = await import('./error-log-service')
    await errorLogService.logError({
      level: 'CRITICAL',
      source: 'TaskPoller',
      message: `Fatal polling error for task ${taskId}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        taskId,
        providerTaskId,
        modelAdapter: modelConfig.adapterName,
      },
      taskId,
    })
    
    // 更新任务状态为失败
    try {
      await taskManager.updateTask(taskId, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Fatal polling error',
        durationMs: Date.now() - startedAt,
      })
    } catch (updateError) {
      console.error(`[TaskPoller] Failed to update task status:`, updateError)
    }
  }
}
