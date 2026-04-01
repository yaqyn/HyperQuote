import { createAPIFileRoute } from '@tanstack/react-start/api'
import { z } from 'zod'
import { toServerSentEventsResponse } from '@tanstack/ai'

// ============================================================================
// Input Schema
// ============================================================================

const chatRequestBody = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
})

// ============================================================================
// Mock responses for development — real AI backend in Phase 30
// ============================================================================

const MOCK_RESPONSES: Record<string, string> = {
  default:
    "I'm HyperQuote's assistant. I can help you find building materials, get quotes, and track orders. What are you looking for today?",
  quote:
    "I'd be happy to help you get a quote! You can start by telling me what materials you need, or use our Material List Builder for a more detailed request.",
  price:
    "We don't publish exact prices -- they depend on quantity, delivery location, and current market conditions. Request a quote and you'll get a response within 4 hours!",
  delivery:
    'Delivery times depend on your location and the materials ordered. Most orders within Cairo are delivered within 24-48 hours. Would you like to place an order?',
  cement:
    'We carry a full range of cement products including Portland CEM I 42.5N, CEM II, and specialty cements. Would you like to see our catalog or get a quote?',
}

function getMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase()
  if (lower.includes('quote') || lower.includes('\u0639\u0631\u0636 \u0633\u0639\u0631'))
    return MOCK_RESPONSES.quote
  if (lower.includes('price') || lower.includes('\u0633\u0639\u0631'))
    return MOCK_RESPONSES.price
  if (lower.includes('deliver') || lower.includes('\u062a\u0648\u0635\u064a\u0644'))
    return MOCK_RESPONSES.delivery
  if (lower.includes('cement') || lower.includes('\u0627\u0633\u0645\u0646\u062a'))
    return MOCK_RESPONSES.cement
  return MOCK_RESPONSES.default
}

// ============================================================================
// Mock AG-UI stream generator
// ============================================================================

async function* mockAGUIStream(
  userMessage: string,
): AsyncIterable<import('@tanstack/ai').StreamChunk> {
  const response = getMockResponse(userMessage)
  const words = response.split(' ')
  const runId = crypto.randomUUID()
  const messageId = crypto.randomUUID()

  yield {
    type: 'RUN_STARTED' as const,
    timestamp: Date.now(),
    runId,
  }

  yield {
    type: 'TEXT_MESSAGE_START' as const,
    timestamp: Date.now(),
    messageId,
    role: 'assistant' as const,
  }

  for (const word of words) {
    yield {
      type: 'TEXT_MESSAGE_CONTENT' as const,
      timestamp: Date.now(),
      messageId,
      delta: word + ' ',
    }
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 50))
  }

  yield {
    type: 'TEXT_MESSAGE_END' as const,
    timestamp: Date.now(),
    messageId,
  }

  yield {
    type: 'RUN_FINISHED' as const,
    timestamp: Date.now(),
    runId,
    finishReason: 'stop' as const,
  }
}

// ============================================================================
// POST /api/chat — SSE streaming endpoint
// fetchServerSentEvents from @tanstack/ai-react connects here
// ============================================================================

export const APIRoute = createAPIFileRoute('/api/chat')({
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const parsed = chatRequestBody.safeParse(body)

      if (!parsed.success) {
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const lastMessage = parsed.data.messages[parsed.data.messages.length - 1]
      const stream = mockAGUIStream(lastMessage?.content ?? '')

      return toServerSentEventsResponse(stream)
    } catch {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
