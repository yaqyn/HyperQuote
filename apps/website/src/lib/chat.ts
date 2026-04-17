import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// AG-UI events carry `rawEvent?: unknown` and some variants a
// `providerMetadata?: Record<string, unknown>`. TanStack Start's server-fn
// transport rejects `unknown` at the return boundary. Restrict to the five
// lifecycle events the mock emits and strip the `rawEvent` escape hatch so
// the serialisation signature is precise without a blanket cast.
type LifecycleType =
	| 'RUN_STARTED'
	| 'RUN_FINISHED'
	| 'TEXT_MESSAGE_START'
	| 'TEXT_MESSAGE_CONTENT'
	| 'TEXT_MESSAGE_END'

type MockedStreamChunk =
	Extract<StreamChunk, { type: LifecycleType }> extends infer E
		? E extends { rawEvent?: unknown }
			? Omit<E, 'rawEvent'>
			: E
		: never

// ============================================================================
// Input Schema
// ============================================================================

const chatInput = z.object({
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
		"We don't publish exact prices -- they depend on quantity, delivery location, and current market conditions. Request a quote and we'll source pricing from multiple suppliers for you.",
	delivery:
		'Delivery times depend on your location and the materials ordered. Most orders within Cairo are delivered within 24-48 hours. Would you like to place an order?',
	cement:
		'We carry a full range of cement products including Portland CEM I 42.5N, CEM II, and specialty cements. Would you like to see our catalog or get a quote?',
}

function getMockResponse(userMessage: string): string {
	const lower = userMessage.toLowerCase()
	if (
		lower.includes('quote') ||
		lower.includes('\u0639\u0631\u0636 \u0633\u0639\u0631')
	)
		return MOCK_RESPONSES.quote
	if (lower.includes('price') || lower.includes('\u0633\u0639\u0631'))
		return MOCK_RESPONSES.price
	if (
		lower.includes('deliver') ||
		lower.includes('\u062a\u0648\u0635\u064a\u0644')
	)
		return MOCK_RESPONSES.delivery
	if (
		lower.includes('cement') ||
		lower.includes('\u0627\u0633\u0645\u0646\u062a')
	)
		return MOCK_RESPONSES.cement
	return MOCK_RESPONSES.default
}

// ============================================================================
// Mock AG-UI stream generator
// Emits proper AG-UI protocol events that TanStack AI client expects
// ============================================================================

async function* mockAGUIStream(
	userMessage: string,
): AsyncGenerator<MockedStreamChunk> {
	const response = getMockResponse(userMessage)
	const words = response.split(' ')
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()

	// RUN_STARTED
	yield {
		type: 'RUN_STARTED' as const,
		timestamp: Date.now(),
		runId,
	}

	// TEXT_MESSAGE_START
	yield {
		type: 'TEXT_MESSAGE_START' as const,
		timestamp: Date.now(),
		messageId,
		role: 'assistant' as const,
	}

	// TEXT_MESSAGE_CONTENT — token-by-token streaming
	for (const word of words) {
		yield {
			type: 'TEXT_MESSAGE_CONTENT' as const,
			timestamp: Date.now(),
			messageId,
			delta: `${word} `,
		}
		// Simulate token delay (50-100ms)
		await new Promise((r) => setTimeout(r, 50 + Math.random() * 50))
	}

	// TEXT_MESSAGE_END
	yield {
		type: 'TEXT_MESSAGE_END' as const,
		timestamp: Date.now(),
		messageId,
	}

	// RUN_FINISHED
	yield {
		type: 'RUN_FINISHED' as const,
		timestamp: Date.now(),
		runId,
		finishReason: 'stop' as const,
	}
}

// ============================================================================
// chatStreamFn — Server function that returns AG-UI stream chunks as array
// The stream() adapter in useAIChat wraps this for the useChat hook
// Phase 30 swaps mockAGUIStream with real AI model call
// ============================================================================

export const chatStreamFn = createServerFn()
	.inputValidator(chatInput)
	.handler(async ({ data: input }): Promise<MockedStreamChunk[]> => {
		const lastMessage = input.messages[input.messages.length - 1]
		const chunks: MockedStreamChunk[] = []

		for await (const chunk of mockAGUIStream(lastMessage?.content ?? '')) {
			chunks.push(chunk)
		}

		return chunks
	})
