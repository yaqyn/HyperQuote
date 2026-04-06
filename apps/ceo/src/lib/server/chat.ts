/**
 * CEO AI chat server function.
 * Dual AI routing: Analytics AI + RAG AI (invisible to user).
 * Returns mock responses until real AI integration in Phase 30.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ChatMessage } from '../../types/chat'

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
// Mock response
// ============================================================================

function getMockAIResponse(question: string): ChatMessage {
  const lowerQ = question.toLowerCase()
  const id = crypto.randomUUID()
  const timestamp = new Date().toISOString()

  // Analytics-style questions
  if (
    lowerQ.includes('revenue') ||
    lowerQ.includes('sales') ||
    lowerQ.includes('margin')
  ) {
    return {
      id,
      role: 'assistant',
      content:
        'Total revenue for March 2026 is EGP 68,000,000 against a target of EGP 75,000,000 (91% achievement). Cement category led with EGP 28M, followed by Steel at EGP 22M. Average margin is 14.2%, down 0.3pp from February due to steel price increases from El-Nasr.',
      timestamp,
      charts: [
        {
          type: 'bar',
          label: 'Revenue by Category (EGP M)',
          data: [
            { label: 'Cement', value: 28 },
            { label: 'Steel', value: 22 },
            { label: 'Timber', value: 8 },
            { label: 'Other', value: 10 },
          ],
        },
      ],
      citations: [
        { text: 'Revenue data from daily digest', source: 'ceo_digests (Mar 2026)' },
      ],
      entityLinks: [
        { type: 'supplier', id: 'sup-001', label: 'El-Nasr Steel' },
      ],
    }
  }

  // Approval-style questions
  if (lowerQ.includes('approval') || lowerQ.includes('pending')) {
    return {
      id,
      role: 'assistant',
      content:
        'You have 1 pending approval: Al-Masriya Construction is requesting a credit limit increase from EGP 1,200,000 to EGP 2,000,000. Note: they have a recent bounced cheque of EGP 250,000. I recommend reviewing their payment history before approving.',
      timestamp,
      entityLinks: [
        { type: 'customer', id: 'cust-001', label: 'Al-Masriya Construction' },
      ],
    }
  }

  // Default response
  return {
    id,
    role: 'assistant',
    content:
      'Based on the latest data, here is a summary: The business is performing at 91% of revenue target with 14.2% average margin. There are 5 items requiring your attention, including 1 bounced cheque and 1 overdue AR exceeding 90 days. Would you like me to drill into any specific area?',
    timestamp,
    entityLinks: [
      { type: 'customer', id: 'cust-001', label: 'Al-Masriya Construction' },
      { type: 'customer', id: 'cust-004', label: 'Delta Construction Group' },
    ],
  }
}

// ============================================================================
// Input schema
// ============================================================================

const chatInput = z.object({
  question: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
})

// ============================================================================
// askCEOAI
// ============================================================================

export const askCEOAI = createServerFn({ method: 'POST' })
  .inputValidator(chatInput)
  .handler(
    async ({ data: input }): Promise<ChatMessage> => {
      if (isSupabaseConfigured()) {
        // TODO: Real AI dual routing
        // 1. GLM classifies intent (analytics vs document_search)
        // 2. Analytics: pre-computed metrics + text-to-SQL fallback via Groq
        // 3. RAG: pgvector hybrid search + Claude Sonnet synthesis
      }

      return getMockAIResponse(input.question)
    },
  )
