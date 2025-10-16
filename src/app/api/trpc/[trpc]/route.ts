import { fetchRequestHandler } from "@trpc/server/adapters/fetch"

import { env } from "~/env.js"
import { appRouter } from "~/server/api/root"
import { createTRPCContext } from "~/server/api/trpc"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req: req as any, res: {} as any }),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }: { path?: string; error: any }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            )
          }
        : undefined,
  })

export { handler as GET, handler as POST } 