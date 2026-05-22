import { isAIEnabled, LYON_WEBSITE, streamChat } from '@hyperquote/ai'
import {
	createSupabaseServiceRoleClient,
	resolveSupabaseWorkerConfig,
} from '@hyperquote/auth/server'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	buildPublicDocsContext,
	buildWebsiteDocsPrompt,
	publicDocsExtractiveResponse,
	publicDocsNoAnswerResponse,
	publicDocsPolicyRefusal,
	retrieveWebsiteDocs,
} from './docs-retrieval'

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
		const refusal = publicDocsPolicyRefusal(userText)
		let readEntities = ['website_index']

		if (refusal) {
			for await (const chunk of textOnlyStream(refusal)) {
				chunks.push(chunk)
			}
		} else {
			const docs = retrieveWebsiteDocs(userText)
			if (!docs.hasHighConfidence) {
				for await (const chunk of textOnlyStream(
					publicDocsNoAnswerResponse(docs.locale),
				)) {
					chunks.push(chunk)
				}
			} else if (isAIEnabled()) {
				readEntities = ['public_docs']
				const groundedPrompt = buildWebsiteDocsPrompt(
					LYON_WEBSITE,
					buildPublicDocsContext(docs.chunks),
				)
				for await (const chunk of streamChat(input.messages, groundedPrompt)) {
					chunks.push(chunk as WebsiteStreamChunk)
				}
			} else {
				readEntities = ['public_docs']
				for await (const chunk of textOnlyStream(
					publicDocsExtractiveResponse(docs.chunks, docs.locale),
				)) {
					chunks.push(chunk)
				}
			}
		}

		await recordWebsiteAiAudit(userText, chunks, readEntities).catch(
			() => undefined,
		)

		return chunks
	})

async function recordWebsiteAiAudit(
	userText: string,
	chunks: WebsiteStreamChunk[],
	readEntities: string[],
) {
	const config = await resolveSupabaseWorkerConfig(process.env)
	if (!config) return
	const client = await createSupabaseServiceRoleClient(process.env)
	if (!client) return
	const response = chunks
		.filter((chunk) => chunk.type === 'TEXT_MESSAGE_CONTENT')
		.map((chunk) => chunk.delta)
		.join('')
	await client.rpc('record_ai_tool_call', {
		p_agent_scope: 'website',
		p_approved_by_user: false,
		p_input_summary: { prompt: userText.slice(0, 240) },
		p_output_summary: { response: response.slice(0, 240) },
		p_read_entities: readEntities,
		p_tool_name: 'website_public_chat',
		p_write_entity_id: null,
		p_write_entity_type: null,
	})
}
