import type { StreamChunk } from '@tanstack/ai'
import type { RichContent } from './chat-types'

export function extractPortalRichContent(chunks: StreamChunk[]): RichContent[] {
	const rich: RichContent[] = []
	for (const chunk of chunks) {
		if (chunk.type !== 'CUSTOM' || chunk.name !== 'rich_message') continue
		const value = chunk.value as RichContent | undefined
		if (value) rich.push(value)
	}
	return rich
}

export function assistantMessageIdFromChunks(
	chunks: StreamChunk[],
): string | null {
	for (const chunk of chunks) {
		if (chunk.type !== 'TEXT_MESSAGE_START' || chunk.role !== 'assistant') {
			continue
		}
		return chunk.messageId
	}
	return null
}

export function portalChatErrorChunks(
	content = 'Something went wrong. Please try again.',
): StreamChunk[] {
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()
	const timestamp = Date.now()
	return [
		{
			type: 'RUN_STARTED',
			timestamp,
			runId,
		},
		{
			type: 'TEXT_MESSAGE_START',
			timestamp,
			messageId,
			role: 'assistant',
		},
		{
			type: 'TEXT_MESSAGE_CONTENT',
			timestamp,
			messageId,
			delta: content,
		},
		{
			type: 'TEXT_MESSAGE_END',
			timestamp,
			messageId,
		},
		{
			type: 'RUN_FINISHED',
			timestamp,
			runId,
			finishReason: 'stop',
		},
	]
}
