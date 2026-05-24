import {
	completeChat,
	isAIEnabled,
	LYON_WEBSITE,
	streamChat,
} from '@hyperquote/ai'
import { checkRateLimit, getKVNamespace } from '@hyperquote/auth/rate-limit'
import {
	createSupabaseServiceRoleClient,
	resolveSupabaseWorkerConfig,
} from '@hyperquote/auth/server'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
	buildPublicDocsContext,
	buildWebsiteDocsPrompt,
	classifyWebsitePublicChatIntent,
	detectDocsQueryLocale,
	parseWebsiteChatRoute,
	publicDocsExtractiveResponse,
	publicDocsNoAnswerResponse,
	publicDocsPolicyRefusal,
	publicDocsSourceLinks,
	retrieveWebsiteDocs,
	WEBSITE_CHAT_ROUTER_PROMPT,
	type WebsitePublicChatRoute,
} from './docs-retrieval'
import { logWebsiteServerError } from './server-log'

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

const MAX_CHAT_MESSAGES = 30
const MAX_CHAT_MESSAGE_CHARACTERS = 4000
const MODEL_CHAT_MESSAGES = 10
const MODEL_CHAT_MESSAGE_CHARACTERS = 2000
const CHAT_RATE_LIMIT = 20
const CHAT_RATE_LIMIT_WINDOW_SECONDS = 60

type ChatMessageInput = { role: 'user' | 'assistant'; content: string }

const chatInput = z.object({
	messages: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant']),
				content: z.string().max(MAX_CHAT_MESSAGE_CHARACTERS),
			}),
		)
		.min(1)
		.max(MAX_CHAT_MESSAGES),
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
		const modelMessages = modelChatMessages(input.messages)
		const chunks: WebsiteStreamChunk[] = []
		let readEntities = ['website_index']

		const rateCheck = await checkWebsiteChatRateLimit()
		if (!rateCheck.allowed) {
			for await (const chunk of textOnlyStream(
				rateLimitResponse(userText, rateCheck.retryAfter ?? 60),
			)) {
				chunks.push(chunk)
			}
			return chunks
		}

		const refusal = publicDocsPolicyRefusal(userText)
		if (refusal) {
			for await (const chunk of textOnlyStream(refusal)) {
				chunks.push(chunk)
			}
		} else {
			const aiEnabled = await isAIEnabled()
			const route = enforceDocsRoute(
				aiEnabled
					? await routeWebsitePublicChat(modelMessages, userText)
					: fallbackWebsitePublicChatRoute(userText),
				userText,
			)

			if (route.action === 'chat') {
				if (aiEnabled) {
					for await (const chunk of streamChat(modelMessages, LYON_WEBSITE)) {
						chunks.push(chunk as WebsiteStreamChunk)
					}
				} else {
					const simpleAnswer = simpleWebsiteChatAnswer(modelMessages)
					for await (const chunk of textOnlyStream(
						simpleAnswer ??
							'Ask me about quotes, delivery, payments, the market, or Lyon.',
					)) {
						chunks.push(chunk)
					}
				}
			} else if (aiEnabled) {
				readEntities = ['public_docs']
				const docs = retrieveRoutedDocs(route, userText)
				if (!docs.hasHighConfidence) {
					for await (const chunk of textOnlyStream(
						publicDocsNoAnswerResponse(docs.locale),
					)) {
						chunks.push(chunk)
					}
				} else {
					const groundedPrompt = buildWebsiteDocsPrompt(
						LYON_WEBSITE,
						buildPublicDocsContext(docs.chunks),
					)
					for await (const chunk of streamChat(modelMessages, groundedPrompt)) {
						chunks.push(chunk as WebsiteStreamChunk)
					}
					appendDocsSourcesIfMissing(
						chunks,
						publicDocsSourceLinks(docs.chunks, docs.locale),
						docs.locale,
					)
				}
			} else {
				readEntities = ['public_docs']
				const docs = retrieveRoutedDocs(route, userText)
				for await (const chunk of textOnlyStream(
					docs.hasHighConfidence
						? publicDocsExtractiveResponse(docs.chunks, docs.locale)
						: publicDocsNoAnswerResponse(docs.locale),
				)) {
					chunks.push(chunk)
				}
			}
		}

		await recordWebsiteAiAudit(userText, chunks, readEntities).catch((error) =>
			logWebsiteServerError('website.ai.audit_unexpected_error', error),
		)

		return chunks
	})

async function routeWebsitePublicChat(
	messages: ChatMessageInput[],
	userText: string,
): Promise<WebsitePublicChatRoute> {
	try {
		const rawRoute = await completeChat(
			recentRouteMessages(messages),
			WEBSITE_CHAT_ROUTER_PROMPT,
			{ temperature: 0 },
		)
		return parseWebsiteChatRoute(rawRoute, userText)
	} catch {
		return fallbackWebsitePublicChatRoute(userText)
	}
}

function recentRouteMessages(messages: ChatMessageInput[]) {
	return messages.slice(-6).map((message) => ({
		role: message.role,
		content: message.content.slice(0, 1200),
	}))
}

function modelChatMessages(messages: ChatMessageInput[]): ChatMessageInput[] {
	return messages.slice(-MODEL_CHAT_MESSAGES).map((message) => ({
		role: message.role,
		content: message.content.slice(0, MODEL_CHAT_MESSAGE_CHARACTERS),
	}))
}

function simpleWebsiteChatAnswer(messages: ChatMessageInput[]): string | null {
	const lastUser = [...messages]
		.reverse()
		.find((message) => message.role === 'user')
	const userText = lastUser?.content.trim() ?? ''
	const normalized = normalizeForSimpleChat(userText)
	const isArabic = detectDocsQueryLocale(userText) === 'ar'
	const isGreeting =
		/^(hi|hello|hey|yo|salam|good morning|good afternoon|good evening)$/.test(
			normalized,
		) || /^(اهلا|أهلا|هاي|مرحبا|السلام عليكم)$/.test(userText)
	if (isHostileWebsiteChatMessage(normalized, userText)) {
		return isArabic
			? 'أنا هنا للمساعدة في أسئلة هايبركوت العامة لما تكون جاهز.'
			: "I'm here to help with public HyperQuote questions when you're ready."
	}
	if (!isGreeting) return null
	return isArabic
		? 'أهلاً، أنا ليون. اسألني عن العروض، التوصيل، الدفع، أو السوق.'
		: "Hi, I'm Lyon. Ask me about quotes, delivery, payments, or the market."
}

function isHostileWebsiteChatMessage(normalized: string, raw: string): boolean {
	return (
		/\b(fuck|fucker|bitch|idiot|stupid|shut up)\b/.test(normalized) ||
		/غبي|اخرس|كس|زب/.test(raw)
	)
}

function normalizeForSimpleChat(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[إأآٱ]/g, 'ا')
		.replace(/ى/g, 'ي')
		.replace(/ة/g, 'ه')
		.replace(/[^\p{L}\p{N}\s]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function fallbackWebsitePublicChatRoute(
	userText: string,
): WebsitePublicChatRoute {
	const docs = retrieveWebsiteDocs(userText)
	return classifyWebsitePublicChatIntent(userText, docs) === 'public_docs'
		? { action: 'retrieve_public_docs', searchQuery: userText }
		: { action: 'chat', searchQuery: '' }
}

function enforceDocsRoute(
	route: WebsitePublicChatRoute,
	userText: string,
): WebsitePublicChatRoute {
	if (route.action === 'retrieve_public_docs') return route
	const fallbackRoute = fallbackWebsitePublicChatRoute(userText)
	return fallbackRoute.action === 'retrieve_public_docs' ? fallbackRoute : route
}

function retrieveRoutedDocs(route: WebsitePublicChatRoute, userText: string) {
	const routeQuery = route.searchQuery.trim()
	const searchQuery = routeQuery ? `${userText} ${routeQuery}` : userText
	const docs = retrieveWebsiteDocs(searchQuery)
	if (docs.hasHighConfidence || !routeQuery) return docs

	const fallbackDocs = retrieveWebsiteDocs(userText)
	return fallbackDocs.hasHighConfidence ? fallbackDocs : docs
}

async function checkWebsiteChatRateLimit() {
	const request = getRequest()
	const ip =
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	const kv = await getKVNamespace()
	return checkRateLimit(kv, {
		key: `website-chat:${ip}`,
		limit: CHAT_RATE_LIMIT,
		windowSeconds: CHAT_RATE_LIMIT_WINDOW_SECONDS,
	})
}

function rateLimitResponse(userText: string, retryAfter: number): string {
	if (detectDocsQueryLocale(userText) === 'ar') {
		return `الرسائل كتير بسرعة. استنى حوالي ${retryAfter} ثانية وجرب تاني.`
	}
	return `Too many chat messages. Please wait about ${retryAfter} seconds and try again.`
}

function appendDocsSourcesIfMissing(
	chunks: WebsiteStreamChunk[],
	sources: string,
	locale: 'ar' | 'en',
) {
	if (!sources) return
	let response = assistantText(chunks)
	if (
		!response.trim() ||
		/\]\(\/docs\//.test(response) ||
		/AI unavailable/i.test(response)
	) {
		return
	}
	response = stripTrailingPlainDocsSources(chunks, response)
	if (!response.trim()) return

	const messageId = chunks.find(
		(chunk) => chunk.type === 'TEXT_MESSAGE_START',
	)?.messageId
	const sourceChunk: WebsiteStreamChunk = {
		type: 'TEXT_MESSAGE_CONTENT',
		timestamp: Date.now(),
		messageId: messageId ?? crypto.randomUUID(),
		delta:
			locale === 'ar' ? `\n\nالمصادر: ${sources}` : `\n\nSources: ${sources}`,
	}
	const endIndex = chunks.findIndex(
		(chunk) => chunk.type === 'TEXT_MESSAGE_END',
	)
	if (endIndex >= 0) {
		chunks.splice(endIndex, 0, sourceChunk)
		return
	}
	chunks.push(sourceChunk)
}

function stripTrailingPlainDocsSources(
	chunks: WebsiteStreamChunk[],
	response: string,
): string {
	const cleaned = response
		.replace(
			/(?:^|\n)\s*(?:Sources?|المصادر)\s*:\s*[^\n]*\/docs\/[^\n]*\s*$/i,
			'',
		)
		.trimEnd()
	if (cleaned === response) return response

	replaceAssistantText(chunks, cleaned)
	return cleaned
}

function replaceAssistantText(chunks: WebsiteStreamChunk[], text: string) {
	const contentIndexes = chunks.reduce<number[]>((indexes, chunk, index) => {
		if (chunk.type === 'TEXT_MESSAGE_CONTENT') indexes.push(index)
		return indexes
	}, [])
	const [firstIndex, ...restIndexes] = contentIndexes
	if (firstIndex === undefined) return
	const firstChunk = chunks[firstIndex]
	if (firstChunk?.type === 'TEXT_MESSAGE_CONTENT') firstChunk.delta = text
	for (const index of restIndexes.reverse()) {
		chunks.splice(index, 1)
	}
}

function assistantText(chunks: WebsiteStreamChunk[]): string {
	return chunks
		.filter((chunk) => chunk.type === 'TEXT_MESSAGE_CONTENT')
		.map((chunk) => chunk.delta)
		.join('')
}

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
	const { error } = await client.rpc('record_ai_tool_call', {
		p_agent_scope: 'website',
		p_approved_by_user: false,
		p_input_summary: { prompt: userText.slice(0, 240) },
		p_output_summary: { response: response.slice(0, 240) },
		p_read_entities: readEntities,
		p_tool_name: 'website_public_chat',
		p_write_entity_id: null,
		p_write_entity_type: null,
	})
	if (error) logWebsiteServerError('website.ai.audit_rpc_failed', error)
}
