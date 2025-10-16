import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import { TRPCError } from "@trpc/server"

export const userRouter = createTRPCRouter({
  /**
   * 获取所有用户（不返回密码）
   */
  list: publicProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    return users
  }),

  /**
   * 创建新用户
   */
  create: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "用户名不能为空"),
        password: z.string().min(1, "密码不能为空"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查用户名是否已存在
      const existingUser = await ctx.db.user.findUnique({
        where: { username: input.username },
      })

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "用户名已存在",
        })
      }

      // 创建用户（明文存储密码）
      const newUser = await ctx.db.user.create({
        data: {
          username: input.username,
          password: input.password,
        },
      })

      return {
        id: newUser.id,
        username: newUser.username,
        createdAt: newUser.createdAt,
      }
    }),

  /**
   * 删除用户
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 检查是否为最后一个用户
      const userCount = await ctx.db.user.count()

      if (userCount <= 1) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无法删除最后一个管理员",
        })
      }

      // 删除用户
      await ctx.db.user.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
})
