import type { StreamChunk } from '@tanstack/ai'
import { describe, expect, it } from 'vitest'
import {
	assistantMessageIdFromChunks,
	extractPortalRichContent,
	portalChatErrorChunks,
} from './portal-chat-stream'

describe('portal chat stream helpers', () => {
	it('keeps rich content scoped to the assistant message id from the stream', () => {
		const chunks: StreamChunk[] = [
			{
				type: 'RUN_STARTED',
				timestamp: 1,
				runId: 'run-1',
			},
			{
				type: 'TEXT_MESSAGE_START',
				timestamp: 1,
				messageId: 'msg-1',
				role: 'assistant',
			},
			{
				type: 'CUSTOM',
				timestamp: 1,
				name: 'rich_message',
				value: {
					type: 'action_button',
					data: { label: 'Open cart', event: 'open_cart' },
				},
			},
		]

		expect(assistantMessageIdFromChunks(chunks)).toBe('msg-1')
		expect(extractPortalRichContent(chunks)).toHaveLength(1)
	})

	it('emits fallback error chunks with one run id and one message id', () => {
		const chunks = portalChatErrorChunks('Failed')
		const runIds = new Set(
			chunks
				.filter(
					(chunk) =>
						chunk.type === 'RUN_STARTED' || chunk.type === 'RUN_FINISHED',
				)
				.map((chunk) => chunk.runId),
		)
		const messageIds = new Set(
			chunks
				.filter(
					(chunk) =>
						chunk.type === 'TEXT_MESSAGE_START' ||
						chunk.type === 'TEXT_MESSAGE_CONTENT' ||
						chunk.type === 'TEXT_MESSAGE_END',
				)
				.map((chunk) => chunk.messageId),
		)

		expect(runIds.size).toBe(1)
		expect(messageIds.size).toBe(1)
	})
})
