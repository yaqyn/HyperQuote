/**
 * Groq chat adapter — streams completions from https://api.groq.com.
 * Uses the OpenAI-compatible `/openai/v1/chat/completions` endpoint; Groq's
 * SSE format is the standard OpenAI event stream.
 *
 * Env:
 *   GROQ_API_KEY   required
 *   GROQ_MODEL     default openai/gpt-oss-120b
 *   GROQ_URL       default https://api.groq.com/openai/v1/chat/completions
 *   GROQ_REASONING_EFFORT optional for Qwen models
 *   USE_AI         1/true forces on, 0/false forces off.
 *                  Default: on in dev (NODE_ENV !== 'production'), off in prod.
 */

import type { StreamChunk } from '@tanstack/ai'

const DEFAULT_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'
const CLASSIFIER_LEAK_BUFFER_CHARACTERS = 120

interface ChatMessage {
	role: 'system' | 'user' | 'assistant'
	content: string
}

interface GroqSSEChunk {
	choices?: Array<{
		delta?: { content?: string }
		finish_reason?: string | null
	}>
	error?: { message?: string } | string
}

interface GroqCompletionResponse {
	choices?: Array<{
		message?: { content?: string }
	}>
	error?: { message?: string } | string
}

interface GroqEnv {
	apiKey: string
	model: string
	reasoningEffort?: string
	url: string
}

interface RuntimeSecretBinding {
	get(): Promise<string | null | undefined> | string | null | undefined
}

type RuntimeEnvValue = RuntimeSecretBinding | string | null | undefined

interface ChatCompletionOptions {
	temperature?: number
}

function processEnvRecord(): Record<string, string | undefined> | undefined {
	return typeof process !== 'undefined'
		? (process.env as Record<string, string | undefined>)
		: undefined
}

async function readWorkersEnv(): Promise<
	Record<string, string | undefined> | undefined
> {
	try {
		const workersModule = 'cloudflare:workers'
		const { env } = await import(/* @vite-ignore */ workersModule)
		if (!env || typeof env !== 'object') return undefined
		const values: Record<string, string | undefined> = {}
		for (const key of [
			'GROQ_API_KEY',
			'GROQ_MODEL',
			'GROQ_REASONING_EFFORT',
			'GROQ_URL',
			'HQ_GROQ_API_KEY',
			'HQ_GROQ_MODEL',
			'HQ_GROQ_REASONING_EFFORT',
			'HQ_GROQ_URL',
			'HQ_USE_AI',
			'USE_AI',
			'VITE_USE_AI',
			'NODE_ENV',
		]) {
			const value = await runtimeEnvValue(
				(env as Record<string, RuntimeEnvValue>)[key],
			)
			if (value !== undefined) values[key] = value
		}
		return values
	} catch {
		return undefined
	}
}

export async function runtimeEnvValue(
	value: RuntimeEnvValue,
): Promise<string | undefined> {
	if (typeof value === 'string') return value
	if (!value || typeof value !== 'object' || !('get' in value)) return undefined
	try {
		const secret = await value.get()
		return typeof secret === 'string' ? secret : undefined
	} catch {
		return undefined
	}
}

async function readRuntimeEnv(): Promise<Record<string, string | undefined>> {
	return {
		...((await readWorkersEnv()) ?? {}),
		...(processEnvRecord() ?? {}),
	}
}

async function readGroqEnv(): Promise<GroqEnv> {
	const env = await readRuntimeEnv()

	const model = env.GROQ_MODEL ?? env.HQ_GROQ_MODEL ?? DEFAULT_GROQ_MODEL
	const supportsReasoningEffort = model.includes('qwen')

	return {
		apiKey: env.GROQ_API_KEY ?? env.HQ_GROQ_API_KEY ?? '',
		model,
		reasoningEffort: supportsReasoningEffort
			? (env.GROQ_REASONING_EFFORT ?? env.HQ_GROQ_REASONING_EFFORT ?? 'none')
			: undefined,
		url: env.GROQ_URL ?? env.HQ_GROQ_URL ?? DEFAULT_GROQ_URL,
	}
}

/**
 * Returns true when the server should call Groq. Default: on in
 * dev, off in prod. Override with USE_AI=1 / USE_AI=0.
 */
export async function isAIEnabled(): Promise<boolean> {
	const env = await readRuntimeEnv()
	const flag = env.USE_AI ?? env.HQ_USE_AI ?? env.VITE_USE_AI
	if (flag === '0' || flag === 'false') return false
	if (!(await readGroqEnv()).apiKey) return false
	if (flag === '1' || flag === 'true') return true
	return env.NODE_ENV !== 'production'
}

/**
 * Streams AG-UI StreamChunks from Groq's OpenAI-compatible endpoint.
 * On failure, emits a visible error message + clean RUN_FINISHED so the UI
 * doesn't hang.
 */
export async function* streamChat(
	messages: { role: 'user' | 'assistant'; content: string }[],
	systemPrompt: string,
): AsyncGenerator<StreamChunk> {
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()
	const groq = await readGroqEnv()
	let emittedText = false

	const textContentChunk = (delta: string): StreamChunk => {
		emittedText = true
		return {
			type: 'TEXT_MESSAGE_CONTENT' as const,
			timestamp: Date.now(),
			messageId,
			delta,
		}
	}

	yield { type: 'RUN_STARTED' as const, timestamp: Date.now(), runId }
	yield {
		type: 'TEXT_MESSAGE_START' as const,
		timestamp: Date.now(),
		messageId,
		role: 'assistant' as const,
	}

	const payload = {
		model: groq.model,
		messages: [
			{ role: 'system', content: systemPrompt } as ChatMessage,
			...messages.map(
				(m) => ({ role: m.role, content: m.content }) as ChatMessage,
			),
		],
		stream: true,
		...(groq.reasoningEffort ? { reasoning_effort: groq.reasoningEffort } : {}),
	}

	try {
		if (!groq.apiKey) {
			throw new Error('GROQ_API_KEY is not set')
		}

		const resp = await fetch(groq.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${groq.apiKey}`,
			},
			body: JSON.stringify(payload),
		})
		if (!resp.ok || !resp.body) {
			const errText = await resp.text().catch(() => '')
			throw new Error(
				`Groq HTTP ${resp.status}${errText ? ` — ${errText}` : ''}`,
			)
		}

		const reader = resp.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''
		let pendingText = ''
		let flushedText = false

		// SSE frames are separated by blank lines ("\n\n"). Each frame has one
		// or more `data: ...` lines. A final `data: [DONE]` marks end-of-stream.
		while (true) {
			const { value, done } = await reader.read()
			if (done) break
			buffer += decoder.decode(value, { stream: true })

			let frameEnd = buffer.indexOf('\n\n')
			while (frameEnd >= 0) {
				const frame = buffer.slice(0, frameEnd)
				buffer = buffer.slice(frameEnd + 2)
				frameEnd = buffer.indexOf('\n\n')

				// A frame may have multiple `data:` lines (SSE spec); Groq's only
				// ever has one. Strip any line prefixes and concatenate payloads.
				const payloadLines: string[] = []
				for (const line of frame.split('\n')) {
					if (line.startsWith('data:')) {
						payloadLines.push(line.slice(5).trim())
					}
				}
				const data = payloadLines.join('')
				if (!data) continue
				if (data === '[DONE]') {
					buffer = ''
					break
				}
				try {
					const parsed = JSON.parse(data) as GroqSSEChunk
					if (parsed.error) {
						const msg =
							typeof parsed.error === 'string'
								? parsed.error
								: (parsed.error.message ?? 'Groq error')
						throw new Error(msg)
					}
					const delta = parsed.choices?.[0]?.delta?.content ?? ''
					if (delta) {
						if (!flushedText) {
							pendingText += delta
							if (
								pendingText.length < CLASSIFIER_LEAK_BUFFER_CHARACTERS &&
								!pendingText.includes('\n')
							) {
								continue
							}
							flushedText = true
							yield textContentChunk(sanitizeClassifierLeak(pendingText))
							pendingText = ''
						} else {
							yield textContentChunk(delta)
						}
					}
				} catch (parseErr) {
					// Malformed SSE payload — only re-throw explicit errors, skip
					// half-written JSON that will settle on the next read.
					if (parseErr instanceof Error && data.endsWith('}')) {
						throw parseErr
					}
				}
			}
		}
		if (!flushedText && pendingText) {
			yield textContentChunk(sanitizeClassifierLeak(pendingText))
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'unreachable'
		if (!emittedText) {
			const fallbackText = await completeChat(messages, systemPrompt).catch(
				() => null,
			)
			yield textContentChunk(fallbackText ?? `— AI unavailable (${msg}). —`)
		}
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

export async function completeChat(
	messages: { role: 'user' | 'assistant'; content: string }[],
	systemPrompt: string,
	options: ChatCompletionOptions = {},
): Promise<string> {
	const groq = await readGroqEnv()
	if (!groq.apiKey) {
		throw new Error('GROQ_API_KEY is not set')
	}

	const payload = {
		model: groq.model,
		messages: [
			{ role: 'system', content: systemPrompt } as ChatMessage,
			...messages.map(
				(m) => ({ role: m.role, content: m.content }) as ChatMessage,
			),
		],
		stream: false,
		...(options.temperature !== undefined
			? { temperature: options.temperature }
			: {}),
		...(groq.reasoningEffort ? { reasoning_effort: groq.reasoningEffort } : {}),
	}

	const resp = await fetch(groq.url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${groq.apiKey}`,
		},
		body: JSON.stringify(payload),
	})
	const responseText = await resp.text().catch(() => '')
	if (!resp.ok) {
		throw new Error(
			`Groq HTTP ${resp.status}${responseText ? ` — ${responseText}` : ''}`,
		)
	}

	const parsed = JSON.parse(responseText) as GroqCompletionResponse
	if (parsed.error) {
		const msg =
			typeof parsed.error === 'string'
				? parsed.error
				: (parsed.error.message ?? 'Groq error')
		throw new Error(msg)
	}
	const content = parsed.choices?.[0]?.message?.content
	if (!content) throw new Error('Groq returned an empty completion')
	return sanitizeClassifierLeak(content)
}

function sanitizeClassifierLeak(content: string): string {
	const normalized = content
		.trim()
		.toLowerCase()
		.replace(/[.。!؟]+$/g, '')
		.replace(/\s+/g, ' ')
	if (
		normalized === 'no actionable request' ||
		normalized === 'no actionable request provided' ||
		normalized === 'no action required' ||
		normalized === 'not actionable' ||
		normalized === 'greeting received, no actionable request' ||
		normalized === 'greeting received no actionable request' ||
		normalized === 'inappropriate language'
	) {
		return "I'm here to help when you're ready."
	}
	return content
}
