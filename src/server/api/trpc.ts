import { initTRPC, TRPCError } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import superjson from 'superjson'
import { ZodError } from 'zod'

import { db } from '~/server/db'

/**
 * 创建tRPC上下文
 * 这里定义了每个请求的共享数据
 */
export const createTRPCContext = (opts: CreateNextContextOptions) => {
  const { req, res } = opts

  return {
    db,
    req,
    res,
  }
}

/**
 * 初始化tRPC
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * 导出可重用的路由器和过程构建器
 */
export const createTRPCRouter = t.router

/**
 * 公共（未经身份验证）过程
 */
export const publicProcedure = t.procedure

/**
 * 带有日志记录的过程
 */
export const loggedProcedure = publicProcedure.use(({ path, type, next }) => {
  const start = Date.now()
  
  return next({
    ctx: {
      // 可以在这里添加额外的上下文
    },
  }).then((result) => {
    const durationMs = Date.now() - start
    console.log(`${type} ${path} - ${durationMs}ms`)
    return result
  })
})

/**
 * 中间件：验证任务存在
 */
export const withTaskValidation = (taskId: string) => 
  loggedProcedure.use(async ({ ctx, next }) => {
    const task = await ctx.db.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `任务 ${taskId} 不存在`,
      })
    }

    return next({
      ctx: {
        ...ctx,
        task,
      },
    })
  }) 