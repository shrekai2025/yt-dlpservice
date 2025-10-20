/**
 * Chat tRPC Router
 * AI对话功能的 tRPC 接口
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { LLMAdapterFactory } from '~/server/services/llm/adapter-factory'

// ==================== 供应商相关 ====================

/**
 * 列出可用的AI供应商
 */
export const chatRouter = createTRPCRouter({
  listProviders: publicProcedure.query(async ({ ctx }) => {
    // 从数据库读取 LLM 供应商配置
    const dbProviders = await ctx.db.lLMProvider.findMany({
      where: {
        isActive: true,
      },
      include: {
        endpoints: {
          where: {
            isActive: true,
          },
          include: {
            models: {
              where: {
                isActive: true,
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })

    // 转换为前端需要的格式
    const providerList = dbProviders.map((provider) => {
      // 获取所有模型（从所有端点）
      const allModels = provider.endpoints.flatMap((endpoint) =>
        endpoint.models.map((model) => model.name)
      )

      // 默认模型是第一个
      const defaultModel = allModels[0] || ''

      // 检查是否配置了 API Key
      const isConfigured = !!provider.apiKey

      return {
        provider: provider.slug,
        label: provider.name,
        models: allModels,
        defaultModel,
        isConfigured,
        supportsWebSearch: false, // 暂时禁用，后续可从数据库配置
      }
    })

    return providerList
  }),

  // ==================== 消息发送 ====================

  /**
   * 发送消息并获取AI回复
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string().optional(),
        provider: z.string(),
        model: z.string(),
        message: z.string().min(1),
        systemInstruction: z.string().optional(),
        enableWebSearch: z.boolean().optional(),
        history: z
          .array(
            z.object({
              role: z.enum(['user', 'assistant']),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        conversationId,
        provider,
        model,
        message,
        systemInstruction,
        enableWebSearch,
        history = [],
      } = input

      console.log('[chat.sendMessage] Request received:', {
        provider,
        model,
        messageLength: message.length,
        systemInstructionLength: systemInstruction?.length,
        historyLength: history.length,
      })

      // 从数据库加载供应商配置
      const dbProvider = await ctx.db.lLMProvider.findUnique({
        where: { slug: provider },
        include: {
          endpoints: {
            where: { isActive: true },
            include: {
              models: {
                where: {
                  name: model,
                  isActive: true,
                },
              },
            },
          },
        },
      })

      console.log('[chat.sendMessage] Provider loaded:', {
        found: !!dbProvider,
        hasApiKey: !!dbProvider?.apiKey,
        endpointsCount: dbProvider?.endpoints.length,
      })

      if (!dbProvider) {
        throw new Error(`供应商不存在: ${provider}`)
      }

      if (!dbProvider.apiKey) {
        throw new Error(`供应商 ${provider} 未配置 API Key`)
      }

      // 找到匹配的端点和模型
      const endpoint = dbProvider.endpoints.find((ep) =>
        ep.models.some((m) => m.name === model)
      )

      if (!endpoint) {
        throw new Error(`未找到模型 ${model} 的端点`)
      }

      // 使用适配器根据 endpoint type 调用相应的 API
      const adapter = LLMAdapterFactory.createAdapter(endpoint.type)
      console.log('[chat.sendMessage] Using adapter type:', endpoint.type)

      // 构建消息
      const messages = [
        ...history.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user' as const, content: message },
      ]

      console.log('[chat.sendMessage] Calling LLM API...')
      const startTime = Date.now()

      // 调用适配器
      const llmResponse = await adapter.sendMessage({
        apiUrl: endpoint.url,
        apiKey: dbProvider.apiKey,
        model,
        messages,
        systemInstruction,
        temperature: 0.7,
      })

      const duration = Date.now() - startTime
      console.log('[chat.sendMessage] LLM API responded:', {
        duration: `${duration}ms`,
        contentLength: llmResponse.content?.length,
        hasUsage: !!llmResponse.usage,
      })

      // 构建元数据
      const metadata = llmResponse.usage
        ? {
            usage: llmResponse.usage,
            provider,
            model,
          }
        : undefined

      const response = { content: llmResponse.content }

      // 保存到数据库（事务）
      const result = await ctx.db.$transaction(async (tx) => {
        let conversation = conversationId
          ? await tx.chatConversation.findUnique({
              where: { id: conversationId },
            })
          : null

        // 创建或更新对话
        if (conversation) {
          conversation = await tx.chatConversation.update({
            where: { id: conversation.id },
            data: {
              provider,
              model,
              systemInstruction: systemInstruction || null,
              enableWebSearch: enableWebSearch ?? false,
            },
          })
        } else {
          conversation = await tx.chatConversation.create({
            data: {
              provider,
              model,
              systemInstruction: systemInstruction || null,
              enableWebSearch: enableWebSearch ?? false,
            },
          })
        }

        // 保存用户消息
        const userMessage = await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'user',
            content: message,
          },
        })

        // 保存AI回复消息
        const assistantMessage = await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'assistant',
            content: response.content,
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        })

        return {
          conversationId: conversation.id,
          userMessageId: userMessage.id,
          assistantMessageId: assistantMessage.id,
          reply: response.content,
          metadata: metadata || null,
        }
      })

      return result
    }),

  // ==================== 对话管理 ====================

  /**
   * 列出所有对话（带第一条消息预览）
   */
  listConversations: publicProcedure.query(async ({ ctx }) => {
    const conversations = await ctx.db.chatConversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            content: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    })

    return conversations.map((conv) => ({
      id: conv.id,
      provider: conv.provider,
      model: conv.model,
      systemInstruction: conv.systemInstruction,
      enableWebSearch: conv.enableWebSearch,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      firstMessagePreview: conv.messages[0]?.content || '',
      messageCount: conv._count.messages,
    }))
  }),

  /**
   * 获取单个对话详情（包含所有消息）
   */
  getConversation: publicProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await ctx.db.chatConversation.findUnique({
        where: { id: input.conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (!conversation) {
        throw new Error(`对话不存在: ${input.conversationId}`)
      }

      return {
        id: conversation.id,
        provider: conversation.provider,
        model: conversation.model,
        systemInstruction: conversation.systemInstruction,
        enableWebSearch: conversation.enableWebSearch,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: conversation.messages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
          createdAt: msg.createdAt.toISOString(),
        })),
      }
    }),

  /**
   * 删除对话（级联删除所有消息）
   */
  deleteConversation: publicProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.chatConversation.delete({
        where: { id: input.conversationId },
      })

      return { success: true }
    }),

  // ==================== 消息管理 ====================

  /**
   * 删除单条消息
   */
  deleteMessage: publicProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.chatMessage.delete({
        where: { id: input.messageId },
      })

      return { success: true }
    }),
})
