/**
 * Internal AI chat server function.
 *
 * Streams assistant replies via Ollama (USE_OLLAMA=1 and OLLAMA_API_KEY set
 * in .env.local) or a minimal stub when Ollama is not available.
 *
 * Accumulates chunks into a StreamChunk[] that the client walks to fill the
 * assistant message in the Zustand store. Not true streaming yet — that's
 * a later pass once API routes are wired.
 */

import { isAIEnabled, OPS_ASSISTANT, streamChat } from '@hyperquote/ai'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const internalChatInput = z.object({
	messages: z.array(
		z.object({
			role: z.enum(['user', 'assistant']),
			content: z.string(),
		}),
	),
})

async function* stubStream(): AsyncGenerator<StreamChunk> {
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()
	yield { type: 'RUN_STARTED', timestamp: Date.now(), runId }
	yield {
		type: 'TEXT_MESSAGE_START',
		timestamp: Date.now(),
		messageId,
		role: 'assistant',
	}
	yield {
		type: 'TEXT_MESSAGE_CONTENT',
		timestamp: Date.now(),
		messageId,
		delta: 'Ollama is not configured on this server.',
	}
	yield { type: 'TEXT_MESSAGE_END', timestamp: Date.now(), messageId }
	yield {
		type: 'RUN_FINISHED',
		timestamp: Date.now(),
		runId,
		finishReason: 'stop',
	}
}

export const internalChatFn = createServerFn()
	.inputValidator(internalChatInput)
	.handler(async ({ data: input }) => {
		const chunks: StreamChunk[] = []
		const source = isAIEnabled()
			? streamChat(input.messages, OPS_ASSISTANT)
			: stubStream()
		for await (const chunk of source) {
			chunks.push(chunk)
		}
		// biome-ignore lint/complexity/noBannedTypes: TanStack server-fn type contract uses `{}` explicitly.
		return chunks as unknown as Array<{ [k: string]: {} }>
	})
