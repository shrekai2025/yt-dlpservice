import { createTRPCRouter } from "~/server/api/trpc"
import { taskRouter } from "~/server/api/routers/task"
import { configRouter } from "~/server/api/routers/config"
import { browserRouter } from "~/server/api/routers/browser"
import { cleanupRouter } from "~/server/api/routers/cleanup"
import { sttRouter } from "~/server/api/routers/stt"
import { aiGenerationRouter } from "~/server/api/routers/ai-generation"
import { apiKeysRouter } from "~/server/api/routers/api-keys"
import { storageRouter } from "~/server/api/routers/storage"
import { storageAdminRouter } from "~/server/api/routers/storage-admin"
import { userRouter } from "~/server/api/routers/user"
import { mediaBrowserRouter } from "~/server/api/routers/media-browser"

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
  stt: sttRouter,
  aiGeneration: aiGenerationRouter,
  apiKeys: apiKeysRouter,
  storage: storageRouter,
  storageAdmin: storageAdminRouter,
  user: userRouter,
  mediaBrowser: mediaBrowserRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter 