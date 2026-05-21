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

export const internalChatFn = createServerFn()
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
	const { data, error } = await client
		.from('ceo_search_index')
		.select('entity_type, entity_id, title, subtitle, metadata')
		.limit(500)
	if (error) throw new Error(error.message)

	const rows = ((data ?? []) as SearchAiRow[]).filter((row) =>
		searchRowMatches(row, query),
	)
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
			const subtitle = row.subtitle ? ` — ${row.subtitle}` : ''
			lines.push(`- ${row.title}${subtitle}`)
		}
	}

	return {
		readEntities: Array.from(new Set(readEntities)),
		text: lines.join('\n'),
	}
}

function searchQueryFromPrompt(userText: string): string {
	return userText.replace(/^search internal database for:\s*/i, '').trim()
}

function searchRowMatches(row: SearchAiRow, query: string): boolean {
	if (!query) return true
	const requestedTypes = requestedSearchEntityTypes(query)
	if (requestedTypes.size > 0 && requestedTypes.has(row.entity_type))
		return true
	const haystack = [
		row.entity_type,
		row.entity_id,
		row.title,
		row.subtitle,
		JSON.stringify(row.metadata ?? {}),
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase()
	const tokens = searchTokens(query)
	return tokens.length === 0 || tokens.some((token) => haystack.includes(token))
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

function searchTokens(query: string): string[] {
	return query
		.toLowerCase()
		.split(/[^a-z0-9-]+/)
		.map((token) => token.trim())
		.filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
}

const STOP_WORDS = new Set([
	'and',
	'for',
	'the',
	'with',
	'show',
	'give',
	'tell',
	'about',
	'from',
])

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
