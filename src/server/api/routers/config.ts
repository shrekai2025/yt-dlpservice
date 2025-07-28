import { z } from 'zod'
import { TRPCError } from '@trpc/server'

import { createTRPCRouter, loggedProcedure } from '~/server/api/trpc'
import { configSchema } from '~/lib/utils/validation'
import { ConfigManager } from '~/lib/utils/config'

export const configRouter = createTRPCRouter({
  /**
   * 获取单个配置值
   */
  get: loggedProcedure
    .input(z.object({
      key: z.string().min(1, '配置键不能为空'),
    }))
    .query(async ({ input }) => {
      try {
        const value = await ConfigManager.get(input.key)
        return { key: input.key, value }
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: error instanceof Error ? error.message : '配置不存在',
        })
      }
    }),

  /**
   * 获取所有配置
   */
  getAll: loggedProcedure
    .query(async () => {
      const configs = await ConfigManager.getAll()
      return Object.entries(configs).map(([key, value]) => ({
        key,
        value,
      }))
    }),

  /**
   * 获取类型化的配置
   */
  getTyped: loggedProcedure
    .query(async () => {
      return await ConfigManager.getTyped()
    }),

  /**
   * 设置配置值
   */
  set: loggedProcedure
    .input(configSchema)
    .mutation(async ({ input }) => {
      try {
        await ConfigManager.set(input)
        return { 
          success: true, 
          message: `配置 ${input.key} 设置成功`,
          config: input
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '配置设置失败',
        })
      }
    }),

  /**
   * 删除配置
   */
  delete: loggedProcedure
    .input(z.object({
      key: z.string().min(1, '配置键不能为空'),
    }))
    .mutation(async ({ input }) => {
      try {
        await ConfigManager.delete(input.key)
        return { 
          success: true, 
          message: `配置 ${input.key} 删除成功` 
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '配置删除失败',
        })
      }
    }),

  /**
   * 清空配置缓存
   */
  clearCache: loggedProcedure
    .mutation(async () => {
      ConfigManager.clearCache()
      return { 
        success: true, 
        message: '配置缓存已清空' 
      }
    }),

  /**
   * 预热配置缓存
   */
  warmupCache: loggedProcedure
    .mutation(async () => {
      await ConfigManager.warmup()
      return { 
        success: true, 
        message: '配置缓存预热完成' 
      }
    }),

  /**
   * 测试数据库连接
   */
  testDatabase: loggedProcedure
    .mutation(async ({ ctx }) => {
      try {
        // 测试写入
        const testConfig = await ctx.db.config.create({
          data: {
            key: 'DB_TEST_' + Date.now(),
            value: 'test_value'
          }
        })

        // 测试读取
        const readTest = await ctx.db.config.findUnique({
          where: { key: testConfig.key }
        })

        // 测试删除
        await ctx.db.config.delete({
          where: { key: testConfig.key }
        })

        // 验证删除成功
        const deletedTest = await ctx.db.config.findUnique({
          where: { key: testConfig.key }
        })

        if (readTest && !deletedTest) {
          return {
            success: true,
            message: '数据库连接测试成功！读写和删除操作均正常',
            details: {
              writeTest: !!testConfig,
              readTest: !!readTest,
              deleteTest: !deletedTest,
              testKey: testConfig.key
            }
          }
        } else {
          throw new Error('数据库操作验证失败')
        }
      } catch (error) {
        return {
          success: false,
          message: `数据库连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
          details: null
        }
      }
    }),
}) 