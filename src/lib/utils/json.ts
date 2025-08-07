import { Logger } from './logger'
import type { PlatformExtraMetadata } from '~/types/task'

/**
 * 安全地解析extraMetadata JSON字符串
 * @param jsonString JSON字符串
 * @param fallback 解析失败时的默认值
 * @returns 解析后的对象或默认值
 */
export function safeParseExtraMetadata(
  jsonString: string | null, 
  fallback: PlatformExtraMetadata | null = null
): PlatformExtraMetadata | null {
  if (!jsonString) {
    return fallback
  }
  
  try {
    const parsed = JSON.parse(jsonString)
    // 基本类型检查，确保解析出的是对象
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as PlatformExtraMetadata
    } else {
      Logger.warn(`extraMetadata解析结果不是对象: ${typeof parsed}`)
      return fallback
    }
  } catch (error: any) {
    Logger.error(`extraMetadata JSON解析失败: ${error.message}, 原始数据: ${jsonString?.substring(0, 100)}...`)
    return fallback
  }
}

/**
 * 为任务对象安全地解析extraMetadata字段
 * @param task 包含extraMetadata字段的任务对象
 * @returns 包含解析后extraMetadata的任务对象
 */
export function parseTaskExtraMetadata<T extends { extraMetadata?: string | null }>(
  task: T
): Omit<T, 'extraMetadata'> & { extraMetadata: PlatformExtraMetadata | null } {
  return {
    ...task,
    extraMetadata: safeParseExtraMetadata(task.extraMetadata || null)
  }
}

/**
 * 为任务数组安全地解析extraMetadata字段
 * @param tasks 包含extraMetadata字段的任务对象数组
 * @returns 包含解析后extraMetadata的任务对象数组
 */
export function parseTasksExtraMetadata<T extends { extraMetadata?: string | null }>(
  tasks: T[]
): Array<Omit<T, 'extraMetadata'> & { extraMetadata: PlatformExtraMetadata | null }> {
  return tasks.map(task => parseTaskExtraMetadata(task))
}