import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

/**
 * Server-side entity search for the command palette.
 * Will query orders, quotes, customers, suppliers, products tables with text search.
 * Currently returns empty array -- real entity search wired in Phase 16+.
 */
export const searchEntities = createServerFn({ method: 'GET' })
  .inputValidator(
    z.object({
      query: z.string().min(1).max(100),
    }),
  )
  .handler(async ({ data: _input }) => {
    // Will query orders, quotes, customers, suppliers, products tables with text search
    return [] as {
      id: string
      type: 'order' | 'quote' | 'customer' | 'supplier' | 'product'
      label: string
      sublabel?: string
    }[]
  })
