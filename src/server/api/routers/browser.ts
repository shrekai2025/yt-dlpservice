import { z } from 'zod'
import { createTRPCRouter, publicProcedure, loggedProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { browserManager } from '~/lib/services/browser-manager'
import { Logger } from '~/lib/utils/logger'

export const browserRouter = createTRPCRouter({
  // 获取登录状态
  getLoginStatus: publicProcedure.query(async () => {
    try {
      return await browserManager.getLoginStatus()
    } catch (error) {
      Logger.error(`获取登录状态失败: ${error}`)
      return { isLoggedIn: false }
    }
  }),

  // 检测Chrome安装状态
  checkChromeInstallation: publicProcedure.query(async () => {
    try {
      await browserManager.initialize()
      return {
        success: true,
        installed: true,
        message: 'Chrome 浏览器已安装并可用'
      }
    } catch (error) {
      Logger.error(`Chrome 检测失败: ${error}`)
      return {
        success: false,
        installed: false,
        message: `Chrome 检测失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }),

  // 安装Chrome浏览器
  installChrome: loggedProcedure.mutation(async () => {
    try {
      Logger.info('开始安装 Chrome 浏览器...')
      await browserManager.initialize()
      
      return {
        success: true,
        message: 'Chrome 浏览器安装成功'
      }
    } catch (error) {
      Logger.error(`Chrome 安装失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Chrome 安装失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 启动登录
  startLogin: loggedProcedure.mutation(async () => {
    try {
      const loginResult = await browserManager.promptForLogin()
      
      if (loginResult) {
        return {
          success: true,
          message: 'YouTube 登录成功'
        }
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'YouTube 登录失败或超时'
        })
      }
    } catch (error) {
      Logger.error(`启动登录失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `启动登录失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 刷新登录状态
  refreshLogin: loggedProcedure.mutation(async () => {
    try {
      const refreshResult = await browserManager.refreshLogin()
      
      if (refreshResult) {
        return {
          success: true,
          message: '登录状态刷新成功'
        }
      } else {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '登录状态刷新失败'
        })
      }
    } catch (error) {
      Logger.error(`刷新登录失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `刷新登录失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 获取 Cookies
  getCookies: loggedProcedure.query(async () => {
    try {
      const cookiesFile = await browserManager.getCookiesForYtDlp()
      return {
        success: true,
        cookiesFile,
        message: 'Cookies 获取成功'
      }
    } catch (error) {
      Logger.error(`获取 Cookies 失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `获取 Cookies 失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 关闭浏览器
  closeBrowser: loggedProcedure.mutation(async () => {
    try {
      await browserManager.closeBrowser()
      return {
        success: true,
        message: '浏览器已关闭'
      }
    } catch (error) {
      Logger.error(`关闭浏览器失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `关闭浏览器失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 初始化浏览器
  initialize: loggedProcedure.mutation(async () => {
    try {
      await browserManager.initialize()
      return {
        success: true,
        message: '浏览器初始化成功'
      }
    } catch (error) {
      Logger.error(`浏览器初始化失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `浏览器初始化失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 测试浏览器功能
  testBrowser: loggedProcedure.mutation(async () => {
    try {
      await browserManager.initialize()
      const session = await browserManager.createYouTubeSession()
      
      if (session) {
        return {
          success: true,
          message: 'Chrome 浏览器测试成功'
        }
      } else {
        throw new Error('无法创建浏览器会话')
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