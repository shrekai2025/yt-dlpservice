/**
 * API Keys tRPC Router
 *
 * Manages API keys for external authentication
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { createApiKey, listApiKeys, revokeApiKey } from '~/lib/auth/api-key'

export const apiKeysRouter = createTRPCRouter({
  /**
   * List all API keys
   */
  list: publicProcedure.query(async () => {
    return await listApiKeys()
  }),

  /**
   * Create a new API key
   */
  create: publicProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ input }) => {
      const result = await createApiKey(input.name)
      return result
    }),

  /**
   * Revoke an API key
   */
  revoke: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await revokeApiKey(input.id)
      return { success: true }
    }),
})
