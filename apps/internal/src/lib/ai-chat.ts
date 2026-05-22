/**
 * Internal AI chat server function.
 *
 * Streams assistant replies via Groq when GROQ_API_KEY is configured, or a
 * minimal stub when AI is not available.
 *
 * Accumulates chunks into a StreamChunk[] that the client walks to fill the
 * assistant message in the Zustand store. Not true streaming yet — that's
 * a later pass once API routes are wired.
 */

import { isAIEnabled, OPS_ASSISTANT, streamChat } from '@hyperquote/ai'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { searchPattern, searchTokens } from './search-query'
import { getInternalSupabaseClient } from './server/_supabase'

const internalChatInput = z.object({
	messages: z.array(
		z.object({
			role: z.enum(['user', 'assistant']),
			content: z.string(),
		}),
	),
})

type InternalAiScope = 'employee' | 'search'

interface SearchAiRow {
	entity_type: string
	entity_id: string
	title: string
	subtitle: string | null
	metadata: Record<string, unknown> | null
	sort_at?: string | null
	search_text?: string | null
}

interface SearchAiAnswer {
	readEntities: string[]
	text: string
}

const SEARCH_ENTITY_READ_ENTITIES: Record<string, string> = {
	activity: 'ceo_activity_summary',
	customer: 'ceo_customer_summary',
	dispatch: 'ceo_dispatch_summary',
	driver: 'ceo_driver_summary',
	employee: 'ceo_employee_summary',
	inventory: 'ceo_inventory_summary',
	order: 'ceo_order_summary',
	payment: 'ceo_finance_summary',
	supplier: 'ceo_supplier_summary',
	support: 'ceo_support_summary',
	warehouse: 'ceo_warehouse_summary',
}

const SEARCH_ENTITY_KEYWORDS: Record<string, string[]> = {
	activity: ['activity', 'audit', 'event', 'history'],
	customer: ['customer', 'customers', 'client', 'contractor'],
	dispatch: ['dispatch', 'delivery', 'deliveries'],
	driver: ['driver', 'drivers'],
	employee: ['employee', 'employees', 'staff', 'team'],
	inventory: ['inventory', 'stock', 'material', 'materials', 'product'],
	order: ['order', 'orders', 'rfq', 'quote', 'sales'],
	payment: [
		'finance',
		'payment',
		'payments',
		'invoice',
		'paid',
		'supplier paid',
	],
	supplier: ['supplier', 'suppliers', 'vendor', 'vendors'],
	support: ['support', 'ticket', 'tickets', 'customer service'],
	warehouse: ['warehouse', 'loading', 'receiving'],
}
const SEARCH_AI_ENTITY_LIMIT = 8
const SEARCH_AI_ENTITY_TYPES = Object.keys(SEARCH_ENTITY_READ_ENTITIES)
const SEARCH_AI_ROW_SELECT =
	'entity_type, entity_id, title, subtitle, metadata, sort_at, search_text'

async function* textStream(text: string): AsyncGenerator<StreamChunk> {
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
		delta: text,
	}
	yield { type: 'TEXT_MESSAGE_END', timestamp: Date.now(), messageId }
	yield {
		type: 'RUN_FINISHED',
		timestamp: Date.now(),
		runId,
		finishReason: 'stop',
	}
}

export const internalChatFn = createServerFn({ method: 'POST' })
	.inputValidator(internalChatInput)
	.handler(async ({ data: input }) => {
		const auth = await getInternalSupabaseClient()
		if (!auth) throw new Error('internal_ai_employee_session_required')

		const lastMessage = input.messages[input.messages.length - 1]
		const userText = lastMessage?.content ?? ''
		const scope = inferInternalAiScope(userText)
		if (scope === 'search') {
			const { data: canSearch, error } = await auth.client.rpc(
				'can_access_ceo_search',
			)
			if (error) throw new Error(error.message)
			if (canSearch !== true) throw new Error('ceo_search_required')
			await refreshSearchDocumentsIfDirty(auth.client)
		}

		const chunks: StreamChunk[] = []
		const refusal = internalPolicyRefusal(userText, scope)
		let readEntities =
			scope === 'search' ? ['ceo_search_index'] : ['current_internal_panel']
		const source = await getInternalAiSource(auth.client, input.messages, {
			refusal,
			scope,
			setReadEntities: (entities) => {
				readEntities = entities
			},
			userText,
		})
		for await (const chunk of source) {
			chunks.push(chunk)
		}
		await recordInternalAiAudit(
			auth.client,
			userText,
			chunks,
			scope,
			readEntities,
		)
		// biome-ignore lint/complexity/noBannedTypes: TanStack server-fn type contract uses `{}` explicitly.
		return chunks as unknown as Array<{ [k: string]: {} }>
	})

async function getInternalAiSource(
	client: NonNullable<
		Awaited<ReturnType<typeof getInternalSupabaseClient>>
	>['client'],
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	options: {
		refusal: string | null
		scope: InternalAiScope
		setReadEntities: (readEntities: string[]) => void
		userText: string
	},
): Promise<AsyncGenerator<StreamChunk>> {
	if (options.refusal) return textStream(options.refusal)
	if (options.scope === 'search') {
		const answer = await buildSearchAiAnswer(client, options.userText)
		options.setReadEntities(answer.readEntities)
		return textStream(answer.text)
	}
	if (isAIEnabled()) return streamChat(messages, OPS_ASSISTANT)
	return textStream(employeeFallbackResponse(options.userText))
}

function inferInternalAiScope(userText: string): InternalAiScope {
	return userText.toLowerCase().startsWith('search internal database for:')
		? 'search'
		: 'employee'
}

function internalPolicyRefusal(
	userText: string,
	scope: InternalAiScope,
): string | null {
	const lower = userText.toLowerCase()
	const asksWrite =
		lower.includes('approve') ||
		lower.includes('assign') ||
		lower.includes('cancel') ||
		lower.includes('delete') ||
		lower.includes('update status') ||
		lower.includes('mark delivered')
	if (scope === 'search' && asksWrite) {
		return 'Search AI is read-only. Use the normal authorized panel action for workflow changes.'
	}
	if (scope === 'employee' && asksWrite) {
		return 'Employee AI is read-focused. Use the normal authorized panel action for workflow changes, so the backend can enforce role checks and activity history.'
	}
	if (
		scope === 'employee' &&
		(lower.includes('salary') ||
			lower.includes('ceo-only') ||
			lower.includes('raw export') ||
			lower.includes('secret') ||
			lower.includes('token') ||
			lower.includes('private finance'))
	) {
		return 'I can only use the operational context allowed by your current role. I cannot reveal CEO-only, private finance, salary, export, secret, or cross-role data.'
	}
	return null
}

type InternalSupabaseClient = NonNullable<
	Awaited<ReturnType<typeof getInternalSupabaseClient>>
>['client']

async function refreshSearchDocumentsIfDirty(client: InternalSupabaseClient) {
	const { error } = await client.rpc('refresh_ceo_search_documents_if_dirty')
	if (error) throw new Error(error.message)
}

function employeeFallbackResponse(userText: string): string {
	const lower = userText.toLowerCase()
	if (
		lower.includes('summarize') ||
		lower.includes('screen') ||
		lower.includes('state')
	) {
		return 'I can summarize the current internal panel from the records your role can already see, explain workflow state, and draft notes. No workflow action was taken.'
	}
	if (
		lower.includes('find') ||
		lower.includes('where') ||
		lower.includes('stock') ||
		lower.includes('order')
	) {
		return 'I can help you find allowed operational records in the current panel and explain what needs attention. I cannot cross role boundaries or perform writes from chat.'
	}
	return 'I can help with allowed internal context: summarize records, explain workflow state, draft notes, and point you to the normal authorized action when a change is needed.'
}

async function recordInternalAiAudit(
	client: NonNullable<
		Awaited<ReturnType<typeof getInternalSupabaseClient>>
	>['client'],
	userText: string,
	chunks: StreamChunk[],
	scope: InternalAiScope,
	readEntities: string[],
) {
	const response = chunks
		.filter((chunk) => chunk.type === 'TEXT_MESSAGE_CONTENT')
		.map((chunk) => chunk.delta)
		.join('')
	const { error } = await client.rpc('record_ai_tool_call', {
		p_agent_scope: scope,
		p_approved_by_user: false,
		p_input_summary: { prompt: userText.slice(0, 240) },
		p_output_summary: { response: response.slice(0, 240) },
		p_read_entities: readEntities,
		p_tool_name: scope === 'search' ? 'ceo_search_chat' : 'employee_chat',
		p_write_entity_id: null,
		p_write_entity_type: null,
	})
	if (error) throw new Error(error.message)
}

async function buildSearchAiAnswer(
	client: NonNullable<
		Awaited<ReturnType<typeof getInternalSupabaseClient>>
	>['client'],
	userText: string,
): Promise<SearchAiAnswer> {
	const query = searchQueryFromPrompt(userText)
	const rows = await fetchSearchAiRows(client, query)
	const grouped = groupSearchRows(rows)
	const readEntities = [
		'ceo_search_index',
		...Object.keys(grouped)
			.map((entityType) => SEARCH_ENTITY_READ_ENTITIES[entityType])
			.filter((entity): entity is string => Boolean(entity)),
	]

	if (rows.length === 0) {
		return {
			readEntities: ['ceo_search_index'],
			text: `Approved Search read-only view for "${query || 'all records'}": no matching records found. No workflow action was taken.`,
		}
	}

	const lines = [
		`Approved Search read-only view for "${query || 'all records'}". No workflow action was taken.`,
	]
	for (const [entityType, entityRows] of Object.entries(grouped)) {
		lines.push(`${entityLabel(entityType)}: ${entityRows.length}`)
		for (const row of entityRows.slice(0, 3)) {
			const subtitle = row.subtitle ? ` - ${row.subtitle}` : ''
			lines.push(`- ${row.title}${subtitle}`)
		}
	}

	return {
		readEntities: Array.from(new Set(readEntities)),
		text: lines.join('\n'),
	}
}

async function fetchSearchAiRows(
	client: NonNullable<
		Awaited<ReturnType<typeof getInternalSupabaseClient>>
	>['client'],
	query: string,
): Promise<SearchAiRow[]> {
	const requestedTypes = requestedSearchEntityTypes(query)
	const entityTypes =
		requestedTypes.size > 0
			? Array.from(requestedTypes)
			: SEARCH_AI_ENTITY_TYPES
	const tokens = searchTokens(query)
	const typeTokens = keywordTokensForEntityTypes(requestedTypes)
	const searchTokensToApply =
		requestedTypes.size > 0
			? tokens.filter((token) => !typeTokens.has(token))
			: tokens

	const rowGroups = await Promise.all(
		entityTypes.map(async (entityType) => {
			let request = client
				.from('ceo_search_index')
				.select(SEARCH_AI_ROW_SELECT)
				.eq('entity_type', entityType)
				.order('sort_at', { ascending: false })
				.order('title', { ascending: true })
				.limit(SEARCH_AI_ENTITY_LIMIT)
			if (searchTokensToApply.length > 0) {
				for (const token of searchTokensToApply) {
					request = request.ilike('search_text', searchPattern(token))
				}
			}
			const { data, error } = await request
			if (error) throw new Error(error.message)
			return (data ?? []) as SearchAiRow[]
		}),
	)
	return rowGroups.flat()
}

function searchQueryFromPrompt(userText: string): string {
	return userText.replace(/^search internal database for:\s*/i, '').trim()
}

function requestedSearchEntityTypes(query: string): Set<string> {
	const lower = query.toLowerCase()
	const matches = new Set<string>()
	for (const [entityType, keywords] of Object.entries(SEARCH_ENTITY_KEYWORDS)) {
		if (keywords.some((keyword) => lower.includes(keyword))) {
			matches.add(entityType)
		}
	}
	return matches
}

function keywordTokensForEntityTypes(entityTypes: Set<string>): Set<string> {
	const tokens = new Set<string>()
	for (const entityType of entityTypes) {
		for (const keyword of SEARCH_ENTITY_KEYWORDS[entityType] ?? []) {
			for (const token of searchTokens(keyword)) {
				tokens.add(token)
			}
		}
	}
	return tokens
}

function groupSearchRows(rows: SearchAiRow[]): Record<string, SearchAiRow[]> {
	const grouped: Record<string, SearchAiRow[]> = {}
	for (const row of rows) {
		const bucket = grouped[row.entity_type] ?? []
		bucket.push(row)
		grouped[row.entity_type] = bucket
	}
	return grouped
}

function entityLabel(entityType: string): string {
	return entityType
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}
