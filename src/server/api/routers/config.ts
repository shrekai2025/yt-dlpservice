import { z } from 'zod'
import { createTRPCRouter, publicProcedure, loggedProcedure } from '~/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { db } from '~/server/db'
import { ConfigManager } from '~/lib/utils/config'
import { doubaoVoiceService } from '~/lib/services/doubao-voice'
import GoogleSpeechService from '~/lib/services/google-stt'
import doubaoSmallSTTService from '~/lib/services/doubao-small-stt'
import { Logger } from '~/lib/utils/logger'
import * as fs from 'fs/promises'

export const configRouter = createTRPCRouter({
  // 获取所有配置
  getAll: publicProcedure.query(async () => {
    try {
      const configs = await ConfigManager.getAll()
      return {
        success: true,
        data: configs
      }
    } catch (error) {
      Logger.error(`获取配置失败: ${error}`)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `获取配置失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }),

  // 获取单个配置
  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      try {
        const value = await ConfigManager.get(input.key)
        return {
          success: true,
          data: { key: input.key, value }
        }
      } catch (error) {
        Logger.error(`获取配置失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `获取配置失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 设置配置
  set: publicProcedure
    .input(z.object({
      key: z.string(),
      value: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        await ConfigManager.set({ key: input.key, value: input.value })
        Logger.info(`配置已设置: ${input.key} = ${input.value}`)
        return {
          success: true,
          message: '配置设置成功'
        }
      } catch (error) {
        Logger.error(`设置配置失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `设置配置失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 删除配置
  delete: publicProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await ConfigManager.delete(input.key)
        Logger.info(`配置已删除: ${input.key}`)
        return {
          success: true,
          message: '配置删除成功'
        }
      } catch (error) {
        Logger.error(`删除配置失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `删除配置失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 测试语音服务
  testVoiceService: publicProcedure
    .input(z.object({
      provider: z.enum(['doubao', 'doubao-small', 'tingwu', 'google']).optional()
    }))
    .mutation(async ({ input }) => {
      try {
        const provider = input.provider || 'doubao'
        
        if (provider === 'doubao') {
          const status = await doubaoVoiceService.checkServiceStatus()
          return {
            success: true,
            data: {
              provider: 'doubao',
              available: status.available,
              message: status.message
            }
          }
        } else if (provider === 'doubao-small') {
          const status = await doubaoSmallSTTService.checkServiceStatus()
          return {
            success: true,
            data: {
              provider: 'doubao-small',
              available: status.available,
              message: status.message
            }
          }
        } else if (provider === 'google') {
          const googleSttService = GoogleSpeechService.getInstance()
          const status = await googleSttService.checkServiceStatus()
          return {
            success: true,
            data: {
              provider: 'google',
              available: status.available,
              message: status.message
            }
          }
        } else {
          // 通义听悟测试逻辑
          return {
            success: true,
            data: {
              provider: 'tingwu',
              available: false,
              message: '通义听悟API测试功能开发中'
            }
          }
        }
      } catch (error) {
        Logger.error(`测试语音服务失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `测试语音服务失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 豆包API测试 - 直接调用API
  testDoubaoAPI: publicProcedure
    .input(z.object({
      audioData: z.string(), // Base64 编码的音频数据
      fileName: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        Logger.info(`开始豆包API测试，文件: ${input.fileName}`)
        
        // 将Base64数据写入临时文件
        const tempFile = `/tmp/doubao_test_${Date.now()}.mp3`
        const audioBuffer = Buffer.from(input.audioData, 'base64')
        await fs.writeFile(tempFile, audioBuffer)
        
        // 调用豆包语音服务进行转录
        const transcription = await doubaoVoiceService.speechToText(tempFile)
        
        // 清理临时文件
        try {
          await fs.unlink(tempFile)
        } catch (cleanupError) {
          Logger.warn(`清理临时文件失败: ${cleanupError}`)
        }
        
        return {
          success: true,
          data: {
            transcription,
            message: '豆包API测试成功'
          }
        }
      } catch (error) {
        Logger.error(`豆包API测试失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `豆包API测试失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 诊断豆包API
  diagnoseDoubaoAPI: publicProcedure
    .mutation(async () => {
      try {
        Logger.info('开始豆包API诊断')
        const result = await doubaoVoiceService.diagnoseBaoAPI()
        Logger.info(`豆包API诊断完成: ${result.success ? '成功' : '失败'}`)
        
        return {
          success: true,
          data: result
        }
      } catch (error: any) {
        Logger.error(`豆包API诊断失败: ${error.message}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `豆包API诊断失败: ${error.message}`
        })
      }
    }),

  // Google STT API测试
  testGoogleSTT: publicProcedure
    .input(z.object({
      audioData: z.string(), // Base64 编码的音频数据
      fileName: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        Logger.info(`开始Google STT测试，文件: ${input.fileName}`)
        
        // 将Base64数据写入临时文件
        const tempFile = `/tmp/google_stt_test_${Date.now()}.mp3`
        const audioBuffer = Buffer.from(input.audioData, 'base64')
        await fs.writeFile(tempFile, audioBuffer)
        
        // 调用Google Speech服务进行转录
        const googleSttService = GoogleSpeechService.getInstance()
        const transcription = await googleSttService.speechToText(tempFile)
        
        // 清理临时文件
        try {
          await fs.unlink(tempFile)
        } catch (cleanupError) {
          Logger.warn(`清理临时文件失败: ${cleanupError}`)
        }
        
        return {
          success: true,
          data: {
            transcription,
            message: 'Google STT测试成功'
          }
        }
      } catch (error) {
        Logger.error(`Google STT测试失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Google STT测试失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 诊断Google STT
  diagnoseGoogleSTT: publicProcedure
    .mutation(async () => {
      try {
        Logger.info('开始Google STT诊断')
        const googleSttService = GoogleSpeechService.getInstance()
        const result = await googleSttService.diagnoseService()
        Logger.info(`Google STT诊断完成: ${result.success ? '成功' : '失败'}`)
        
        return {
          success: true,
          data: result
        }
      } catch (error: any) {
        Logger.error(`Google STT诊断失败: ${error.message}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Google STT诊断失败: ${error.message}`
        })
      }
    }),

  // 豆包小模型API测试 - 直接调用API
  testDoubaoSmallAPI: publicProcedure
    .input(z.object({
      audioData: z.string(), // Base64 编码的音频数据
      fileName: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        Logger.info(`开始豆包小模型API测试，文件: ${input.fileName}`)
        
        // 将Base64数据写入临时文件
        const tempFile = `/tmp/doubao_small_test_${Date.now()}.mp3`
        const audioBuffer = Buffer.from(input.audioData, 'base64')
        await fs.writeFile(tempFile, audioBuffer)
        
        // 调用豆包小模型语音服务进行转录
        const transcription = await doubaoSmallSTTService.speechToText(tempFile)
        
        // 清理临时文件
        try {
          await fs.unlink(tempFile)
        } catch (cleanupError) {
          Logger.warn(`清理临时文件失败: ${cleanupError}`)
        }
        
        return {
          success: true,
          data: {
            transcription,
            message: '豆包小模型API测试成功'
          }
        }
      } catch (error) {
        Logger.error(`豆包小模型API测试失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `豆包小模型API测试失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }),

  // 诊断豆包小模型API
  diagnoseDoubaoSmallAPI: publicProcedure
    .mutation(async () => {
      try {
        Logger.info('开始豆包小模型API诊断')
        const result = await doubaoSmallSTTService.checkServiceStatus()
        Logger.info(`豆包小模型API诊断完成: ${result.available ? '成功' : '失败'}`)
        
        return {
          success: true,
          data: {
            available: result.available,
            message: result.message,
            provider: 'doubao-small'
          }
        }
      } catch (error: any) {
        Logger.error(`豆包小模型API诊断失败: ${error.message}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `豆包小模型API诊断失败: ${error.message}`
        })
      }
    }),

  // 获取所有语音服务状态
  getAllVoiceServiceStatus: publicProcedure
    .query(async () => {
      try {
        Logger.info('开始获取所有语音服务状态')
        const services = []

        // 豆包语音服务
        try {
          const doubaoStatus = await doubaoVoiceService.checkServiceStatus()
          services.push({
            provider: 'doubao',
            name: '豆包语音服务',
            available: doubaoStatus.available,
            message: doubaoStatus.message
          })
        } catch (error) {
          services.push({
            provider: 'doubao',
            name: '豆包语音服务',
            available: false,
            message: `服务检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }

        // 豆包小模型服务
        try {
          const doubaoSmallStatus = await doubaoSmallSTTService.checkServiceStatus()
          services.push({
            provider: 'doubao-small',
            name: '豆包录音文件识别（小模型版）',
            available: doubaoSmallStatus.available,
            message: doubaoSmallStatus.message
          })
        } catch (error) {
          services.push({
            provider: 'doubao-small',
            name: '豆包录音文件识别（小模型版）',
            available: false,
            message: `服务检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }

        // Google STT服务
        try {
          const googleSttService = GoogleSpeechService.getInstance()
          const googleStatus = await googleSttService.checkServiceStatus()
          services.push({
            provider: 'google',
            name: 'Google Speech-to-Text',
            available: googleStatus.available,
            message: googleStatus.message
          })
        } catch (error) {
          services.push({
            provider: 'google',
            name: 'Google Speech-to-Text',
            available: false,
            message: `服务检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }

        // 通义听悟（暂未实现）
        services.push({
          provider: 'tingwu',
          name: '通义听悟',
          available: false,
          message: '功能开发中'
        })

        return {
          success: true,
          data: services
        }
      } catch (error) {
        Logger.error(`获取语音服务状态失败: ${error}`)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `获取语音服务状态失败: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    })
}) 