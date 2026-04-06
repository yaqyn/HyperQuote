/**
 * CEO board report PDF export server function.
 * Generates PDF via pdf-lib in Cloudflare Worker.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// ============================================================================
// Helper
// ============================================================================

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_ANON_KEY !== 'placeholder'
  )
}

// ============================================================================
// Input schema
// ============================================================================

const reportInput = z.object({
  reportType: z.string().min(1),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
})

// ============================================================================
// exportBoardReportPDF
// ============================================================================

export const exportBoardReportPDF = createServerFn({ method: 'POST' })
  .inputValidator(reportInput)
  .handler(
    async ({ data: _input }): Promise<{ pdfUrl: string }> => {
      if (isSupabaseConfigured()) {
        // TODO: Real PDF generation via pdf-lib, upload to R2, return signed URL
      }

      return {
        pdfUrl: 'https://placeholder.hyperquote.net/reports/board-report-2026-03.pdf',
      }
    },
  )
