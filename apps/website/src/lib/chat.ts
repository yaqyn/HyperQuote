import { checkRateLimit } from '@hyperquote/auth/rate-limit'
import {
	createSupabaseServiceRoleClient,
	resolveSupabaseRuntimeConfig,
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
	publicDocsExtractiveResponse,
	publicDocsNoAnswerResponse,
	publicDocsPolicyRefusal,
	publicDocsSourceLinks,
	retrieveWebsiteDocs,
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

type WebsiteLifecycleChunk =
	Extract<StreamChunk, { type: LifecycleType }> extends infer E
		? E extends { rawEvent?: unknown }
			? Omit<E, 'rawEvent'>
			: E
		: never

export interface WebsiteActionButtonData {
	href: string
	icon:
		| 'book'
		| 'briefcase'
		| 'building'
		| 'file'
		| 'login'
		| 'market'
		| 'quote'
		| 'support'
	label: string
	labelAr: string
}

export type WebsiteRichContent = {
	type: 'action_button'
	data: WebsiteActionButtonData
}

interface WebsiteCustomChunk {
	type: 'CUSTOM'
	timestamp: number
	name: 'rich_message'
	value: WebsiteRichContent
}

type WebsiteStreamChunk = WebsiteLifecycleChunk | WebsiteCustomChunk

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

interface ChatToolDefinition {
	function: {
		description: string
		name: string
		parameters: Record<string, unknown>
	}
	type: 'function'
}

interface ChatToolCall {
	function: {
		arguments: string
		name: string
	}
	id: string
	type: 'function'
}

const WEBSITE_CHAT_ALLOWED_ACTIONS = {
	about: {
		href: '/about',
		icon: 'building',
		label: 'About',
		labelAr: 'عن هايبركوت',
	},
	careers: {
		href: '/careers',
		icon: 'briefcase',
		label: 'Careers',
		labelAr: 'التوظيف',
	},
	contact: {
		href: '/support#contact',
		icon: 'support',
		label: 'Contact',
		labelAr: 'التواصل',
	},
	docs: {
		href: '/docs',
		icon: 'book',
		label: 'Docs',
		labelAr: 'الوثائق',
	},
	faq: {
		href: '/support#faq',
		icon: 'book',
		label: 'FAQ',
		labelAr: 'الأسئلة',
	},
	home: {
		href: '/',
		icon: 'building',
		label: 'Home',
		labelAr: 'الرئيسية',
	},
	market: {
		href: '/market',
		icon: 'market',
		label: 'Market',
		labelAr: 'السوق',
	},
	portal: {
		href: '/login',
		icon: 'login',
		label: 'Portal',
		labelAr: 'البوابة',
	},
	privacy: {
		href: '/legal/privacy',
		icon: 'file',
		label: 'Privacy',
		labelAr: 'الخصوصية',
	},
	support: {
		href: '/support',
		icon: 'support',
		label: 'Support',
		labelAr: 'الدعم',
	},
	team: {
		href: '/about',
		icon: 'building',
		label: 'Team',
		labelAr: 'الفريق',
	},
	terms: {
		href: '/legal/terms',
		icon: 'file',
		label: 'Terms',
		labelAr: 'الشروط',
	},
} satisfies Record<string, WebsiteActionButtonData>

const WEBSITE_CHAT_ACTION_IDS = Object.keys(WEBSITE_CHAT_ALLOWED_ACTIONS)

const WEBSITE_CHAT_TOOLS: ChatToolDefinition[] = [
	{
		type: 'function',
		function: {
			name: 'retrieve_public_docs',
			description:
				'Search public HyperQuote website/docs content. Use for factual questions about HyperQuote, Market/catalog/products, support, portal usage, quote/pricing concepts, payments, delivery, legal, or how-to guidance.',
			parameters: {
				type: 'object',
				additionalProperties: false,
				properties: {
					query: {
						type: 'string',
						description:
							'Concise public-docs search query. Keep Arabic queries Arabic when the user is Arabic.',
					},
				},
				required: ['query'],
			},
		},
	},
	{
		type: 'function',
		function: {
			name: 'show_website_actions',
			description:
				'Show safe public HyperQuote action buttons when the user wants to navigate or a button would clearly help.',
			parameters: {
				type: 'object',
				additionalProperties: false,
				properties: {
					actions: {
						type: 'array',
						items: { enum: WEBSITE_CHAT_ACTION_IDS, type: 'string' },
						maxItems: 4,
					},
				},
				required: ['actions'],
			},
		},
	},
]

function websiteToolPrompt(basePrompt: string): string {
	return `${basePrompt}

You have bounded tools for this website:
- retrieve_public_docs: use it when public HyperQuote facts or docs are needed.
- show_website_actions: use it when the user wants links, navigation, or a button would clearly help.

Use tools naturally. Do not mention tool names. Do not invent URLs or actions. If no tool is needed, answer directly within the website boundary.`
}

async function isWebsiteAiEnabled(): Promise<boolean> {
	const { isAIEnabled } = await import('@hyperquote/ai')
	return isAIEnabled()
}

async function loadWebsiteAi() {
	const { completeChatWithTools, LYON_WEBSITE, streamChat } = await import(
		'@hyperquote/ai'
	)
	return { completeChatWithTools, lyonWebsite: LYON_WEBSITE, streamChat }
}

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
			appendWebsiteActionButtons(
				chunks,
				websiteUnsupportedHelpButtons(userText),
			)
		} else {
			const aiEnabled = await isWebsiteAiEnabled()
			if (aiEnabled) {
				readEntities = await streamWebsiteToolChat(
					modelMessages,
					userText,
					chunks,
				)
			} else {
				readEntities = await streamFallbackWebsiteChat(
					userText,
					modelMessages,
					chunks,
				)
			}
		}

		await recordWebsiteAiAudit(userText, chunks, readEntities).catch((error) =>
			logWebsiteServerError('website.ai.audit_unexpected_error', error),
		)

		return chunks
	})

async function streamWebsiteToolChat(
	modelMessages: ChatMessageInput[],
	userText: string,
	chunks: WebsiteStreamChunk[],
): Promise<string[]> {
	try {
		const { completeChatWithTools, lyonWebsite, streamChat } =
			await loadWebsiteAi()
		const toolChoice = await completeChatWithTools(
			modelMessages,
			websiteToolPrompt(lyonWebsite),
			WEBSITE_CHAT_TOOLS,
			{ temperature: 0.2 },
		)
		const toolResult = executeWebsiteToolCalls(toolChoice.toolCalls, userText)
		if (!toolResult.docs && toolResult.actions.length === 0) {
			if (toolChoice.content.trim()) {
				for await (const chunk of textOnlyStream(toolChoice.content.trim())) {
					chunks.push(chunk)
				}
			} else {
				for await (const chunk of streamChat(modelMessages, lyonWebsite)) {
					chunks.push(chunk as WebsiteStreamChunk)
				}
			}
			return ['website_index']
		}

		if (toolResult.docs) {
			if (!toolResult.docs.hasHighConfidence) {
				for await (const chunk of textOnlyStream(
					publicDocsNoAnswerResponse(toolResult.docs.locale),
				)) {
					chunks.push(chunk)
				}
			} else {
				const groundedPrompt = buildWebsiteDocsPrompt(
					buildWebsiteActionPrompt(lyonWebsite, toolResult.actions),
					buildPublicDocsContext(toolResult.docs.chunks),
				)
				for await (const chunk of streamChat(modelMessages, groundedPrompt)) {
					chunks.push(chunk as WebsiteStreamChunk)
				}
				appendDocsSourcesIfMissing(
					chunks,
					publicDocsSourceLinks(toolResult.docs.chunks, toolResult.docs.locale),
					toolResult.docs.locale,
				)
			}
			appendWebsiteActionButtons(chunks, toolResult.actions)
			return ['public_docs']
		}

		for await (const chunk of streamChat(
			modelMessages,
			buildWebsiteActionPrompt(lyonWebsite, toolResult.actions),
		)) {
			chunks.push(chunk as WebsiteStreamChunk)
		}
		appendWebsiteActionButtons(chunks, toolResult.actions)
		return ['website_index']
	} catch (error) {
		logWebsiteServerError('website.ai.tool_chat_failed', error)
		return streamFallbackWebsiteChat(userText, modelMessages, chunks)
	}
}

async function streamFallbackWebsiteChat(
	userText: string,
	modelMessages: ChatMessageInput[],
	chunks: WebsiteStreamChunk[],
): Promise<string[]> {
	const route = enforceDocsRoute(
		fallbackWebsitePublicChatRoute(userText),
		userText,
	)
	const buttons = websiteNavigationButtons(userText, route)
	if (route.action === 'chat') {
		const simpleAnswer = simpleWebsiteChatAnswer(modelMessages)
		for await (const chunk of textOnlyStream(
			simpleAnswer ??
				'Ask me about HyperQuote pages, the Market, docs, support, or portal access.',
		)) {
			chunks.push(chunk)
		}
		appendWebsiteActionButtons(chunks, buttons)
		return ['website_index']
	}

	const docs = retrieveRoutedDocs(route, userText)
	for await (const chunk of textOnlyStream(
		docs.hasHighConfidence
			? publicDocsExtractiveResponse(docs.chunks, docs.locale)
			: publicDocsNoAnswerResponse(docs.locale),
	)) {
		chunks.push(chunk)
	}
	appendWebsiteActionButtons(
		chunks,
		mergeWebsiteActionButtons(buttons, websiteDocsActionButtons(route, docs)),
	)
	return ['public_docs']
}

function executeWebsiteToolCalls(
	toolCalls: ChatToolCall[],
	userText: string,
): {
	actions: WebsiteActionButtonData[]
	docs: ReturnType<typeof retrieveWebsiteDocs> | null
} {
	let actions: WebsiteActionButtonData[] = []
	let docs: ReturnType<typeof retrieveWebsiteDocs> | null = null

	for (const toolCall of toolCalls) {
		if (toolCall.function.name === 'show_website_actions') {
			actions = mergeWebsiteActionButtons(
				actions,
				websiteActionsFromToolCall(toolCall),
			)
			continue
		}
		if (toolCall.function.name === 'retrieve_public_docs') {
			const query = websiteDocsQueryFromToolCall(toolCall) || userText
			docs = retrieveWebsiteDocs(`${userText} ${query}`)
		}
	}

	if (docs) {
		actions = mergeWebsiteActionButtons(
			actions,
			websiteDocsActionButtons(
				{ action: 'retrieve_public_docs', searchQuery: userText },
				docs,
			),
		)
	}

	return { actions: actions.slice(0, 4), docs }
}

function websiteActionsFromToolCall(
	toolCall: ChatToolCall,
): WebsiteActionButtonData[] {
	const args = parseToolArguments(toolCall)
	const ids = Array.isArray(args?.actions) ? args.actions : []
	return ids.flatMap((id) => {
		if (typeof id !== 'string') return []
		const action =
			WEBSITE_CHAT_ALLOWED_ACTIONS[
				id as keyof typeof WEBSITE_CHAT_ALLOWED_ACTIONS
			]
		return action ? [action] : []
	})
}

function websiteDocsQueryFromToolCall(toolCall: ChatToolCall): string {
	const args = parseToolArguments(toolCall)
	return typeof args?.query === 'string' ? args.query.trim() : ''
}

function parseToolArguments(
	toolCall: ChatToolCall,
): Record<string, unknown> | null {
	try {
		const parsed: unknown = JSON.parse(toolCall.function.arguments)
		return typeof parsed === 'object' && parsed !== null
			? (parsed as Record<string, unknown>)
			: null
	} catch {
		return null
	}
}

function buildWebsiteActionPrompt(
	basePrompt: string,
	actions: WebsiteActionButtonData[],
): string {
	if (actions.length === 0) return basePrompt
	const labels = actions
		.map((action) => `${action.label} (${action.href})`)
		.join(', ')
	return `${basePrompt}

The app will show these safe website action buttons after your answer: ${labels}.
Mention them naturally only if useful. Do not write raw URLs unless the user explicitly asked for a URL.`
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
		? 'أهلاً، أنا ليون. أقدر أرشدك في موقع هايبركوت، السوق، الوثائق، الدعم، أو دخول البوابة.'
		: "Hi, I'm Lyon. I can guide you around the HyperQuote website, Market, docs, support, or portal login."
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

const WEBSITE_DOCS_NAV_PATTERN =
	/\b(docs?|documentation|faqs?|learn|learning|guides?|tutorials?|lessons?|manual|instructions?|steps?|walkthrough|explain|teach|understand|overview|knowledge|information|help center|getting started|start here|new here|first time|beginner)\b|\bhow\s+(?:to|do|can)\b|\bshow\s+me\b/

const AR_WEBSITE_DOCS_NAV_PATTERN =
	/(وثائق|دليل|ادله|تعلم|اتعلم|شرح|ازاي|كيف|خطوات|بدايه|مساعده|اعرف|علمني|فهمني)/

const WEBSITE_NAVIGATION_REQUEST_PATTERN =
	/\b(where|find|open|go|take|show|send|link|links|page|pages|menu|navigate|navigation|visit|access|locate|scroll|section)\b|\bwhere\s+(?:is|are|to)\b|\bhow\s+(?:do|can)\s+i\s+(?:find|open|go|access|reach)\b/

const AR_WEBSITE_NAVIGATION_REQUEST_PATTERN =
	/(فين|اين|أين|افتح|روح|وديني|لينك|رابط|صفحه|صفحة|منيو|القائمه|القائمة|اوصل|اروح|انزل|سكرول)/

const WEBSITE_DIRECT_PAGE_TARGET_PATTERN =
	/\b(market|catalog|support|contact|faq|faqs|docs?|documentation|portal|login|about|team|employees?|staff|careers?|jobs?|terms|privacy|policy|policies|home|homepage)\b/

const AR_WEBSITE_DIRECT_PAGE_TARGET_PATTERN =
	/(السوق|كتالوج|دعم|تواصل|اسئله|أسئلة|وثائق|بوابة|دخول|عن|الفريق|الموظفين|وظائف|شروط|خصوصية|خصوصيه|سياسة|الرئيسية)/

const WEBSITE_MARKET_TOPIC_PATTERN =
	/\b(market|catalog|catalogue|products?|materials?|material list|browse|availability|available|stock|cart|basket|wood|lumber|timber|plywood|cement|concrete|rebar|steel|sand|aggregate|bricks?|blocks?|paint|pipes?|plumbing|electrical|hardware|fixtures?|roofing|drywall)\b/

const WEBSITE_MARKET_ACTION_PATTERN =
	/\b(buy|purchase|source|sourcing|procure|procurement|shop|find|get|need|looking for)\b/

const WEBSITE_GENERIC_BUYING_TARGET_PATTERN =
	/\b(stuff|things|supplies|materials?|products?|place|section|area|where)\b/

const WEBSITE_MATERIAL_PATTERN =
	/\b(materials?|wood|lumber|timber|plywood|cement|concrete|rebar|steel|sand|aggregate|bricks?|blocks?|paint|pipes?|plumbing|electrical|hardware|fixtures?|roofing|drywall)\b/

const AR_WEBSITE_MARKET_NAV_PATTERN =
	/(السوق|كتالوج|منتج|منتجات|مواد|شراء|اشتري|توريد|مصدر|خشب|اسمنت|حديد|خرسانه|رمل|طوب|مواسير|دهان)/

const WEBSITE_PORTAL_NAV_PATTERN =
	/\b(portal|login|log in|signin|sign in|account|dashboard|track|tracking|status|my quote|my order|invoice|delivery status|order status)\b/

const AR_WEBSITE_PORTAL_NAV_PATTERN =
	/(بوابه|دخول|حساب|لوحه|تتبع|تابع|حاله|فاتوره|طلبي|عرضي)/

const WEBSITE_SUPPORT_NAV_PATTERN =
	/\b(support|contact|help|problem|issue|damaged|damage|ticket|agent|representative|human|whatsapp|phone|email|call)\b/

const AR_WEBSITE_SUPPORT_NAV_PATTERN =
	/(دعم|تواصل|ساعد|مشكله|تالف|ضرر|واتساب|تليفون|ايميل|كلم|انسان)/

const WEBSITE_ABOUT_NAV_PATTERN =
	/\b(about|company|team|teams|employees?|staff|people|who are you|who is hyperquote)\b/

const AR_WEBSITE_ABOUT_NAV_PATTERN =
	/(عن|الشركه|الشركة|الفريق|الموظفين|مين انتو|من انتم)/

const WEBSITE_CAREERS_NAV_PATTERN =
	/\b(careers?|jobs?|hiring|hire|work with|work at|apply|application|vacancies|roles?|positions?)\b/

const AR_WEBSITE_CAREERS_NAV_PATTERN = /(وظائف|توظيف|شغل|اشتغل|اقدم|تقديم|فرص)/

const WEBSITE_TERMS_NAV_PATTERN =
	/\b(terms|terms of use|terms of service|conditions|tos|legal|rules|agreement)\b/

const AR_WEBSITE_TERMS_NAV_PATTERN = /(الشروط|شروط|قانوني|اتفاقيه|اتفاقية)/

const WEBSITE_PRIVACY_NAV_PATTERN =
	/\b(privacy|privacy policy|policy|policies|data policy|data protection|personal data)\b/

const AR_WEBSITE_PRIVACY_NAV_PATTERN =
	/(خصوصيه|خصوصية|سياسة|سياسه|بيانات|حماية البيانات)/

const WEBSITE_HOME_NAV_PATTERN = /\b(home|homepage|main page|start page)\b/

const AR_WEBSITE_HOME_NAV_PATTERN = /(الرئيسيه|الرئيسية|البدايه|البداية)/

function hasMaterialBuyingIntent(normalized: string): boolean {
	return (
		WEBSITE_MARKET_ACTION_PATTERN.test(normalized) &&
		WEBSITE_MATERIAL_PATTERN.test(normalized)
	)
}

function hasGenericBuyingIntent(normalized: string): boolean {
	return (
		WEBSITE_MARKET_ACTION_PATTERN.test(normalized) &&
		WEBSITE_GENERIC_BUYING_TARGET_PATTERN.test(normalized)
	)
}

const WEBSITE_ACTION_BUTTON_REQUEST_PATTERN =
	/\b(link|links|url|button|buttons|open|go to|take me|send me)\b/i

const AR_WEBSITE_ACTION_BUTTON_REQUEST_PATTERN =
	/(لينك|رابط|روابط|زر|افتح|وديني|روح|ابعتي|ابعتلي|ابعث)/

export function shouldShowWebsiteChatActionButtons(userText: string): boolean {
	const normalized = normalizeForSimpleChat(userText)
	return (
		WEBSITE_ACTION_BUTTON_REQUEST_PATTERN.test(normalized) ||
		AR_WEBSITE_ACTION_BUTTON_REQUEST_PATTERN.test(userText) ||
		(isWebsiteNavigationRequest(userText) &&
			websiteDirectNavigationButtons(userText).length > 0)
	)
}

export function websiteUnsupportedHelpButtons(
	userText: string,
): WebsiteActionButtonData[] {
	if (!publicDocsPolicyRefusal(userText)) return []
	return [
		{
			href: '/login',
			icon: 'login',
			label: 'Portal App',
			labelAr: 'تطبيق البوابة',
		},
	]
}

function isWebsiteNavigationRequest(userText: string): boolean {
	const normalized = normalizeForSimpleChat(userText)
	const isShortDirectTarget = normalized.split(/\s+/).length <= 5
	return (
		WEBSITE_NAVIGATION_REQUEST_PATTERN.test(normalized) ||
		AR_WEBSITE_NAVIGATION_REQUEST_PATTERN.test(normalized) ||
		hasMaterialBuyingIntent(normalized) ||
		hasGenericBuyingIntent(normalized) ||
		(isShortDirectTarget &&
			(WEBSITE_DIRECT_PAGE_TARGET_PATTERN.test(normalized) ||
				AR_WEBSITE_DIRECT_PAGE_TARGET_PATTERN.test(normalized)))
	)
}

export function websiteDirectNavigationButtons(
	userText: string,
): WebsiteActionButtonData[] {
	if (publicDocsPolicyRefusal(userText)) return []

	const normalized = normalizeForSimpleChat(userText)
	const buttons: WebsiteActionButtonData[] = []
	const add = (button: WebsiteActionButtonData) => {
		if (
			buttons.some(
				(existing) =>
					existing.href === button.href && existing.label === button.label,
			)
		) {
			return
		}
		buttons.push(button)
	}
	const materialBuyingIntent = hasMaterialBuyingIntent(normalized)
	const genericBuyingIntent = hasGenericBuyingIntent(normalized)

	if (
		WEBSITE_HOME_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_HOME_NAV_PATTERN.test(normalized)
	) {
		add({
			href: '/',
			icon: 'building',
			label: 'Home',
			labelAr: 'الرئيسية',
		})
	}

	if (
		WEBSITE_MARKET_TOPIC_PATTERN.test(normalized) ||
		materialBuyingIntent ||
		genericBuyingIntent ||
		AR_WEBSITE_MARKET_NAV_PATTERN.test(normalized)
	) {
		add({
			href: '/market',
			icon: 'market',
			label: 'Market',
			labelAr: 'السوق',
		})
	}

	if (
		WEBSITE_PORTAL_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_PORTAL_NAV_PATTERN.test(normalized)
	) {
		add({
			href: '/login',
			icon: 'login',
			label: 'Portal',
			labelAr: 'البوابة',
		})
	}

	if (
		WEBSITE_SUPPORT_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_SUPPORT_NAV_PATTERN.test(normalized)
	) {
		add({
			href: '/support',
			icon: 'support',
			label: 'Support',
			labelAr: 'الدعم',
		})
	}

	if (
		/\b(faqs?|frequently asked|questions?)\b/.test(normalized) ||
		/اسئله|أسئله|اسئلة|أسئلة/.test(normalized)
	) {
		add({
			href: '/support#faq',
			icon: 'book',
			label: 'FAQ',
			labelAr: 'الأسئلة',
		})
	}

	if (
		/\b(contact|email|phone|call|whatsapp|message|talk|human)\b/.test(
			normalized,
		) ||
		/تواصل|واتساب|تليفون|ايميل|كلم|انسان/.test(normalized)
	) {
		add({
			href: '/support#contact',
			icon: 'support',
			label: 'Contact',
			labelAr: 'التواصل',
		})
	}

	if (
		WEBSITE_DOCS_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_DOCS_NAV_PATTERN.test(normalized)
	) {
		add({
			href: '/docs',
			icon: 'book',
			label: 'Docs',
			labelAr: 'الوثائق',
		})
		if (/\b(learn|learning|how|help center|questions?)\b/.test(normalized)) {
			add({
				href: '/support#faq',
				icon: 'book',
				label: 'FAQ',
				labelAr: 'الأسئلة',
			})
		}
	}

	if (
		WEBSITE_ABOUT_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_ABOUT_NAV_PATTERN.test(normalized)
	) {
		const wantsTeam =
			/\b(team|teams|employees?|staff|people)\b/.test(normalized) ||
			/الفريق|الموظفين/.test(normalized)
		add({
			href: '/about',
			icon: 'building',
			label: wantsTeam ? 'Team' : 'About',
			labelAr: wantsTeam ? 'الفريق' : 'عن هايبركوت',
		})
	}

	if (
		WEBSITE_CAREERS_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_CAREERS_NAV_PATTERN.test(normalized)
	) {
		add({
			href: '/careers',
			icon: 'briefcase',
			label: 'Careers',
			labelAr: 'التوظيف',
		})
	}

	if (
		WEBSITE_TERMS_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_TERMS_NAV_PATTERN.test(normalized)
	) {
		add({
			href: '/legal/terms',
			icon: 'file',
			label: 'Terms',
			labelAr: 'الشروط',
		})
	}

	if (
		WEBSITE_PRIVACY_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_PRIVACY_NAV_PATTERN.test(normalized)
	) {
		add({
			href: '/legal/privacy',
			icon: 'file',
			label: 'Privacy',
			labelAr: 'الخصوصية',
		})
	}

	return buttons.slice(0, 4)
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

function websiteNavigationButtons(
	userText: string,
	route: WebsitePublicChatRoute,
	docs?: ReturnType<typeof retrieveRoutedDocs>,
): WebsiteActionButtonData[] {
	if (!shouldShowWebsiteChatActionButtons(userText)) return []

	const normalized = normalizeForSimpleChat(userText)
	const buttons: WebsiteActionButtonData[] = []
	const add = (button: WebsiteActionButtonData) => {
		if (
			buttons.some(
				(existing) =>
					existing.href === button.href && existing.label === button.label,
			)
		) {
			return
		}
		buttons.push(button)
	}
	const wantsDocs =
		route.action === 'retrieve_public_docs' ||
		WEBSITE_DOCS_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_DOCS_NAV_PATTERN.test(normalized)
	const wantsLearning =
		WEBSITE_DOCS_NAV_PATTERN.test(normalized) ||
		AR_WEBSITE_DOCS_NAV_PATTERN.test(normalized)

	for (const button of websiteDirectNavigationButtons(userText)) add(button)

	if (wantsDocs) {
		add({
			href: '/docs',
			icon: 'book',
			label: 'Docs',
			labelAr: 'الوثائق',
		})
		if (wantsLearning) {
			add({
				href: '/support#faq',
				icon: 'book',
				label: 'FAQ',
				labelAr: 'الأسئلة',
			})
		}
		for (const chunk of docs?.chunks ?? []) {
			add({
				href: chunk.href,
				icon: 'book',
				label: chunk.title,
				labelAr: 'المقال',
			})
			if (buttons.length >= 3) break
		}
	}

	return buttons.slice(0, 4)
}

function websiteDocsActionButtons(
	route: WebsitePublicChatRoute,
	docs?:
		| ReturnType<typeof retrieveRoutedDocs>
		| ReturnType<typeof retrieveWebsiteDocs>,
): WebsiteActionButtonData[] {
	if (route.action !== 'retrieve_public_docs') return []
	const buttons: WebsiteActionButtonData[] = [WEBSITE_CHAT_ALLOWED_ACTIONS.docs]
	for (const chunk of docs?.chunks ?? []) {
		buttons.push({
			href: chunk.href,
			icon: 'book',
			label: chunk.title,
			labelAr: 'المقال',
		})
		if (buttons.length >= 3) break
	}
	return buttons
}

function mergeWebsiteActionButtons(
	...groups: WebsiteActionButtonData[][]
): WebsiteActionButtonData[] {
	const buttons: WebsiteActionButtonData[] = []
	for (const button of groups.flat()) {
		if (
			buttons.some(
				(existing) =>
					existing.href === button.href && existing.label === button.label,
			)
		) {
			continue
		}
		buttons.push(button)
		if (buttons.length >= 4) break
	}
	return buttons
}

function appendWebsiteActionButtons(
	chunks: WebsiteStreamChunk[],
	buttons: WebsiteActionButtonData[],
) {
	if (buttons.length === 0) return
	const events = buttons.map(actionButtonEvent)
	const finishIndex = chunks.findIndex((chunk) => chunk.type === 'RUN_FINISHED')
	if (finishIndex >= 0) {
		chunks.splice(finishIndex, 0, ...events)
		return
	}
	chunks.push(...events)
}

function actionButtonEvent(data: WebsiteActionButtonData): WebsiteCustomChunk {
	return {
		type: 'CUSTOM',
		timestamp: Date.now(),
		name: 'rich_message',
		value: {
			type: 'action_button',
			data,
		},
	}
}

async function checkWebsiteChatRateLimit() {
	const request = getRequest()
	return checkRateLimit({
		key: websiteChatRateLimitKey(request),
		limit: CHAT_RATE_LIMIT,
		windowSeconds: CHAT_RATE_LIMIT_WINDOW_SECONDS,
	})
}

export function websiteChatRateLimitKey(request: Request): string {
	const ip =
		firstHeaderValue(request.headers, 'cf-connecting-ip') ??
		firstForwardedIp(request.headers.get('x-forwarded-for')) ??
		firstHeaderValue(request.headers, 'x-real-ip')
	if (ip) return `website-chat:ip:${ip}`

	const fingerprint = [
		request.headers.get('user-agent'),
		request.headers.get('accept-language'),
		request.headers.get('sec-ch-ua-platform'),
	]
		.map((value) => value?.trim())
		.filter((value): value is string => Boolean(value))
		.join('|')

	return `website-chat:fallback:${stableRateLimitHash(fingerprint || 'anonymous')}`
}

function firstHeaderValue(headers: Headers, name: string): string | null {
	return headers.get(name)?.split(',')[0]?.trim() || null
}

function firstForwardedIp(value: string | null): string | null {
	return value?.split(',')[0]?.trim() || null
}

function stableRateLimitHash(value: string): string {
	let hash = 2166136261
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}
	return (hash >>> 0).toString(36)
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
	const config = await resolveSupabaseRuntimeConfig(process.env)
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
