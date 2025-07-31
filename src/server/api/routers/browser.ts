import { z } from 'zod'
import { createTRPCRouter, publicProcedure, loggedProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { browserManager } from '~/lib/services/browser-manager'
import { Logger } from '~/lib/utils/logger'

export const browserRouter = createTRPCRouter({
  // 获取浏览器状态
  getStatus: publicProcedure.query(async () => {
    try {
      const status = browserManager.getStatus()
      return {
        success: true,
        ...status,
        message: '浏览器状态获取成功'
      }
    } catch (error) {
      Logger.error(`获取浏览器状态失败: ${error}`)
      return {
        success: false,
        browserConnected: false,
        activePagesCount: 0,
        hasIdleTimer: false,
        message: '获取浏览器状态失败'
      }
    }
  }),

  // 清理浏览器资源
  cleanup: loggedProcedure.mutation(async () => {
    try {
      await browserManager.cleanup()
      return {
        success: true,
        message: '浏览器资源清理成功'
      }
    } catch (error) {
      Logger.error(`清理浏览器资源失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `清理浏览器资源失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 测试浏览器功能
  testBrowser: loggedProcedure.mutation(async () => {
    try {
      // 尝试获取一个页面来测试浏览器功能
      const page = await browserManager.getPage({ headless: true, timeout: 10000 })
      await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 10000 })
      const title = await page.title()
      await browserManager.releasePage(page)
      
      return {
        success: true,
        message: `浏览器测试成功，访问了页面: ${title}`
      }
    } catch (error) {
      Logger.error(`浏览器测试失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `浏览器测试失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),
}) 