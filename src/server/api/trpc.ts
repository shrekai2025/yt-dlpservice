import { initTRPC, TRPCError } from '@trpc/server'
import { type CreateNextContextOptions } from '@trpc/server/adapters/next'
import superjson from 'superjson'
import { ZodError } from 'zod'

import { db } from '~/server/db'
import { isValidAdminAuthCookie, getUserIdFromCookie, ADMIN_AUTH_COOKIE } from '~/lib/auth/simple-admin-auth'

/**
 * 创建tRPC上下文
 * 这里定义了每个请求的共享数据
 */
export const createTRPCContext = async (opts: CreateNextContextOptions | { req: Request; res: any }) => {
  const { req, res } = opts

  let authCookie: string | undefined

  // 处理两种类型的请求对象
  if (req instanceof Request) {
    // Fetch API Request (用于 App Router)
    const cookieHeader = req.headers.get('cookie')
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        if (key && value) acc[key] = value
        return acc
      }, {} as Record<string, string>)
      authCookie = cookies[ADMIN_AUTH_COOKIE]
    }
  } else {
    // NextApiRequest (用于 Pages Router)
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      if (key && value) acc[key] = value
      return acc
    }, {} as Record<string, string>) ?? {}
    authCookie = cookies[ADMIN_AUTH_COOKIE]
  }

  const userId = await getUserIdFromCookie(authCookie)

  return {
    db,
    req,
    res,
    userId, // 添加 userId 到 context
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
 * 认证中间件
 * 验证用户是否已登录（使用 context 中的 userId）
 */
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  // 检查 context 中是否有 userId（由 createTRPCContext 设置）
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '未授权，请先登录',
    })
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // 确保传递 userId
    },
  })
})

/**
 * 受保护的过程（需要登录）
 */
export const protectedProcedure = publicProcedure.use(authMiddleware)

/**
 * 带 userId 的受保护过程（用于媒体管理等需要用户隔离的功能）
 */
export const userProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '无法获取用户信息',
    })
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // 确保 userId 存在
    },
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