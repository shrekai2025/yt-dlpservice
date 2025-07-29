import { createTRPCRouter } from "~/server/api/trpc"
import { taskRouter } from "~/server/api/routers/task"
import { configRouter } from "~/server/api/routers/config"
import { browserRouter } from "~/server/api/routers/browser"
import { cleanupRouter } from "~/server/api/routers/cleanup"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  task: taskRouter,
  config: configRouter,
  browser: browserRouter,
  cleanup: cleanupRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter 