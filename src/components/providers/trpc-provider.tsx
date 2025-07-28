"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink, loggerLink } from "@trpc/client"
import { createTRPCReact } from "@trpc/react-query"
import { useState, type ReactNode } from "react"
import superjson from "superjson"

import { type AppRouter } from "~/server/api/root"

const createTRPCClient = () => {
  const getBaseUrl = () => {
    if (typeof window !== "undefined") return "" // 浏览器环境
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // Vercel
    return `http://localhost:${process.env.PORT ?? 3000}` // 开发环境
  }

  return {
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),
    ],
  }
}

export const api = createTRPCReact<AppRouter>()

export function TRPCReactProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() => api.createClient(createTRPCClient()))

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </api.Provider>
    </QueryClientProvider>
  )
} 