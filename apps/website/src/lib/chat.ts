import { isAIEnabled, LYON_WEBSITE, streamChat } from '@hyperquote/ai'
import {
	createSupabaseServerClient,
	resolveSupabaseWorkerConfig,
} from '@hyperquote/auth/server'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'

// AG-UI events carry `rawEvent?: unknown` and some variants a
// `providerMetadata?: Record<string, unknown>`. TanStack Start's server-fn
// transport rejects `unknown` at the return boundary. Restrict to the five
// lifecycle events this endpoint returns and strip the `rawEvent` escape hatch
// so the serialisation signature is precise without a blanket cast.
type LifecycleType =
	| 'RUN_STARTED'
	| 'RUN_FINISHED'
	| 'TEXT_MESSAGE_START'
	| 'TEXT_MESSAGE_CONTENT'
	| 'TEXT_MESSAGE_END'

type WebsiteStreamChunk =
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

function publicPolicyRefusal(userMessage: string): string | null {
	const lower = userMessage.toLowerCase()
	if (
		lower.includes('my order') ||
		lower.includes('another customer') ||
		lower.includes('other customer') ||
		lower.includes('internal') ||
		lower.includes('driver location') ||
		lower.includes('supplier cost') ||
		lower.includes('finance') ||
		lower.includes('employee')
	) {
		return 'I can only answer from public HyperQuote website, docs, and catalog information. Sign in to the portal for your account-specific data.'
	}
	return null
}

function publicWebsiteResponse(userMessage: string): string {
	const lower = userMessage.toLowerCase()
	if (lower.includes('what is') && lower.includes('hyperquote')) {
		return 'HyperQuote helps contractors in Egypt send one building-materials request and get one consolidated quote from multiple suppliers.'
	}
	if (
		lower.includes('market') ||
		lower.includes('catalog') ||
		lower.includes('product') ||
		lower.includes('cement') ||
		lower.includes('rebar') ||
		lower.includes('steel')
	) {
		return 'You can browse public building-material listings in Market, compare customer-safe catalog details, and request a quote after signing in.'
	}
	if (
		lower.includes('price') ||
		lower.includes('quote') ||
		lower.includes('cost')
	) {
		return 'Public prices are indicative. Sign in to request a quote so HyperQuote can source current supplier pricing for your quantity and delivery area.'
	}
	return 'I can help with public HyperQuote information, Market browsing, quote requests, account signup, and support. Sign in to the portal for account-specific orders or drafts.'
}

async function* textOnlyStream(
	text: string,
): AsyncGenerator<WebsiteStreamChunk> {
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

	yield {
		type: 'TEXT_MESSAGE_CONTENT' as const,
		timestamp: Date.now(),
		messageId,
		delta: text,
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
// chatStreamFn — Server function that returns AG-UI stream chunks as array
// The stream() adapter in useAIChat wraps this for the useChat hook
// ============================================================================

export const chatStreamFn = createServerFn({ method: 'POST' })
	.inputValidator(chatInput)
	.handler(async ({ data: input }): Promise<WebsiteStreamChunk[]> => {
		const lastMessage = input.messages[input.messages.length - 1]
		const userText = lastMessage?.content ?? ''
		const chunks: WebsiteStreamChunk[] = []
		const refusal = publicPolicyRefusal(userText)

		if (refusal) {
			for await (const chunk of textOnlyStream(refusal)) {
				chunks.push(chunk)
			}
		} else if (isAIEnabled()) {
			for await (const chunk of streamChat(input.messages, LYON_WEBSITE)) {
				chunks.push(chunk as WebsiteStreamChunk)
			}
		} else {
			for await (const chunk of textOnlyStream(
				publicWebsiteResponse(userText),
			)) {
				chunks.push(chunk)
			}
		}

		await recordWebsiteAiAudit(userText, chunks).catch(() => undefined)

		return chunks
	})

async function recordWebsiteAiAudit(
	userText: string,
	chunks: WebsiteStreamChunk[],
) {
	const config = await resolveSupabaseWorkerConfig(process.env)
	if (!config) return
	const request = getRequest()
	const { client } = createSupabaseServerClient({ request, ...config })
	const response = chunks
		.filter((chunk) => chunk.type === 'TEXT_MESSAGE_CONTENT')
		.map((chunk) => chunk.delta)
		.join('')
	await client.rpc('record_ai_tool_call', {
		p_agent_scope: 'website',
		p_approved_by_user: false,
		p_input_summary: { prompt: userText.slice(0, 240) },
		p_output_summary: { response: response.slice(0, 240) },
		p_read_entities: ['website_index', 'published_catalog'],
		p_tool_name: 'website_public_chat',
		p_write_entity_id: null,
		p_write_entity_type: null,
	})
}
