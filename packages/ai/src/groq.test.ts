import {
	clearInstalledRuntimeEnv,
	installRuntimeEnv,
} from '@hyperquote/runtime/env'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	completeChat,
	completeChatWithTools,
	isAIEnabled,
	runtimeEnvValue,
	streamChat,
} from './groq'

const ENV_KEYS = [
	'GROQ_API_KEY',
	'GROQ_MODEL',
	'GROQ_URL',
	'USE_AI',
	'VITE_USE_AI',
] as const

const originalEnv = new Map(
	ENV_KEYS.map((key) => [key, process.env[key]] as const),
)

afterEach(() => {
	vi.restoreAllMocks()
	clearInstalledRuntimeEnv()
	for (const key of ENV_KEYS) {
		const value = originalEnv.get(key)
		if (value === undefined) {
			delete process.env[key]
		} else {
			process.env[key] = value
		}
	}
})

describe('Groq runtime env', () => {
	it('reads runtime secret bindings', async () => {
		await expect(
			runtimeEnvValue({
				get: async () => 'store-secret',
			}),
		).resolves.toBe('store-secret')
	})

	it('enables AI from normal runtime Groq env', async () => {
		process.env.GROQ_API_KEY = 'normal-key'
		process.env.USE_AI = '1'

		await expect(isAIEnabled()).resolves.toBe(true)
	})

	it('enables AI from installed runtime env', async () => {
		installRuntimeEnv({
			GROQ_API_KEY: { get: async () => 'runtime-key' },
			USE_AI: { get: async () => '1' },
		})

		await expect(isAIEnabled()).resolves.toBe(true)
	})

	it('keeps explicit AI disable stronger than configured keys', async () => {
		process.env.GROQ_API_KEY = 'normal-key'
		process.env.USE_AI = '0'

		await expect(isAIEnabled()).resolves.toBe(false)
	})

	it('uses configured key and model for completions', async () => {
		process.env.GROQ_API_KEY = 'operator-key'
		process.env.GROQ_MODEL = 'openai/gpt-oss-120b'
		process.env.GROQ_URL = 'https://groq.test/openai/v1/chat/completions'

		const fetchMock = vi.fn<typeof fetch>(async () =>
			Response.json({
				choices: [{ message: { content: 'ok' } }],
			}),
		)
		vi.stubGlobal('fetch', fetchMock)

		await expect(completeChat([], 'system')).resolves.toBe('ok')
		expect(fetchMock).toHaveBeenCalledWith(
			'https://groq.test/openai/v1/chat/completions',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer operator-key',
				}),
			}),
		)
	})

	it('returns Groq tool calls from non-streaming completions', async () => {
		process.env.GROQ_API_KEY = 'operator-key'
		process.env.GROQ_MODEL = 'openai/gpt-oss-120b'
		process.env.GROQ_URL = 'https://groq.test/openai/v1/chat/completions'

		const fetchMock = vi.fn<typeof fetch>(async () =>
			Response.json({
				choices: [
					{
						message: {
							content: null,
							tool_calls: [
								{
									function: {
										arguments: '{"entity_types":["order"],"query":""}',
										name: 'search_internal_records',
									},
									id: 'call_orders',
									type: 'function',
								},
							],
						},
					},
				],
			}),
		)
		vi.stubGlobal('fetch', fetchMock)

		const completion = await completeChatWithTools(
			[{ role: 'user', content: 'get me orororordersss homie' }],
			'system',
			[
				{
					function: {
						description: 'Search records',
						name: 'search_internal_records',
						parameters: {
							properties: {
								entity_types: {
									items: { enum: ['order'], type: 'string' },
									type: 'array',
								},
							},
							type: 'object',
						},
					},
					type: 'function',
				},
			],
		)

		expect(completion.toolCalls).toHaveLength(1)
		expect(completion.toolCalls[0]?.function.name).toBe(
			'search_internal_records',
		)
		expect(
			JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)),
		).toMatchObject({
			stream: false,
			tool_choice: 'auto',
			tools: [
				{
					function: {
						name: 'search_internal_records',
					},
					type: 'function',
				},
			],
		})
	})

	it('falls back to a non-streaming completion when streaming drops before text', async () => {
		process.env.GROQ_API_KEY = 'normal-key'
		process.env.GROQ_MODEL = 'openai/gpt-oss-120b'
		process.env.GROQ_URL = 'https://groq.test/openai/v1/chat/completions'

		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response(
					new ReadableStream({
						start(controller) {
							controller.error(new Error('Network connection lost.'))
						},
					}),
					{
						headers: { 'Content-Type': 'text/event-stream' },
						status: 200,
					},
				),
			)
			.mockResolvedValueOnce(
				Response.json({
					choices: [{ message: { content: 'Recovered answer.' } }],
				}),
			)
		vi.stubGlobal('fetch', fetchMock)

		const chunks = []
		for await (const chunk of streamChat(
			[{ role: 'user', content: 'hi' }],
			'system',
		)) {
			chunks.push(chunk)
		}

		expect(
			chunks
				.filter((chunk) => chunk.type === 'TEXT_MESSAGE_CONTENT')
				.map((chunk) => chunk.delta)
				.join(''),
		).toBe('Recovered answer.')
		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(
			JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)),
		).toMatchObject({ stream: true })
		expect(
			JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)),
		).toMatchObject({ stream: false })
	})
})
