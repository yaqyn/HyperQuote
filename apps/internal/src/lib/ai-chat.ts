/**
 * Internal AI chat server function.
 *
 * Side-panel Lyon has two read modes:
 * - normal panels: all operational vtable context except employees/activity
 * - Search panel: all approved vtable context
 *
 * The client still receives StreamChunk[] and drips the chunks into Zustand.
 */

import { isAIEnabled, streamChat } from '@hyperquote/ai'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	allowedInternalAiVtables,
	buildInternalAiContextPackage,
	buildInternalAiSystemPrompt,
	type InternalAiScope,
	type InternalAiVtable,
	internalAiPolicyRefusal,
	queryTokensForAi,
	requestedInternalAiEntityTypes,
	resolveInternalAiScope,
	searchQueryFromPrompt,
} from './internal-ai-context'
import type { SearchDisplayIndexRow } from './search-display'
import { searchPattern, searchTokens } from './search-query'
import { getInternalSupabaseClient } from './server/_supabase'

const internalChatInput = z.object({
	messages: z.array(
		z.object({
			role: z.enum(['user', 'assistant']),
			content: z.string(),
		}),
	),
	panelId: z.string().trim().min(1).max(80).optional(),
})

const INTERNAL_AI_ENTITY_LIMIT = 8
const INTERNAL_AI_ROW_SELECT =
	'entity_type, entity_id, title, subtitle, metadata, sort_at, search_text'
const QUERY_STOP_TOKENS = new Set([
	'a',
	'all',
	'an',
	'are',
	'as',
	'at',
	'about',
	'for',
	'from',
	'in',
	'is',
	'latest',
	'me',
	'need',
	'needs',
	'of',
	'on',
	'recent',
	'show',
	'summarize',
	'summary',
	'tell',
	'the',
	'to',
	'what',
	'with',
])

type InternalSupabaseClient = NonNullable<
	Awaited<ReturnType<typeof getInternalSupabaseClient>>
>['client']

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
		const scope = resolveInternalAiScope({
			panelId: input.panelId,
		})
		if (scope === 'search') {
			const { data: canSearch, error } = await auth.client.rpc(
				'can_access_ceo_search',
			)
			if (error) throw new Error(error.message)
			if (canSearch !== true) throw new Error('ceo_search_required')
		}

		const chunks: StreamChunk[] = []
		const refusal = internalPolicyRefusal(userText, scope)
		let readEntities: string[] = []
		const source = await getInternalAiSource(auth.client, input.messages, {
			panelId: input.panelId,
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
			input.panelId,
		)
		// biome-ignore lint/complexity/noBannedTypes: TanStack server-fn type contract uses `{}` explicitly.
		return chunks as unknown as Array<{ [k: string]: {} }>
	})

async function getInternalAiSource(
	client: InternalSupabaseClient,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	options: {
		panelId?: string | null
		refusal: string | null
		scope: InternalAiScope
		setReadEntities: (readEntities: string[]) => void
		userText: string
	},
): Promise<AsyncGenerator<StreamChunk>> {
	if (options.refusal) return textStream(options.refusal)

	const simpleAnswer = simpleEmployeeChatAnswer(options.userText)
	if (simpleAnswer) return textStream(simpleAnswer)

	await refreshSearchDocumentsIfDirty(client)
	const contextPackage = await buildAiContext(client, {
		panelId: options.panelId,
		scope: options.scope,
		userText: options.userText,
	})
	options.setReadEntities(contextPackage.readEntities)

	if (await isAIEnabled()) {
		return streamChat(
			messages,
			buildInternalAiSystemPrompt({
				context: contextPackage.context,
				panelId: options.panelId,
				scope: options.scope,
			}),
		)
	}
	return textStream(contextPackage.fallbackText)
}

function internalPolicyRefusal(
	userText: string,
	scope: InternalAiScope,
): string | null {
	return internalAiPolicyRefusal(userText, scope)
}

async function refreshSearchDocumentsIfDirty(client: InternalSupabaseClient) {
	const { error } = await client.rpc('refresh_ceo_search_documents_if_dirty')
	if (error) throw new Error(error.message)
}

async function buildAiContext(
	client: InternalSupabaseClient,
	options: {
		panelId?: string | null
		scope: InternalAiScope
		userText: string
	},
) {
	const query = searchQueryFromPrompt(options.userText)
	const result = await fetchInternalAiRows(client, {
		query,
		scope: options.scope,
	})
	return buildInternalAiContextPackage({
		panelId: options.panelId,
		query,
		queriedEntityTypes: result.queriedEntityTypes,
		rows: result.rows,
		scope: options.scope,
	})
}

async function fetchInternalAiRows(
	client: InternalSupabaseClient,
	options: {
		query: string
		scope: InternalAiScope
	},
): Promise<{ queriedEntityTypes: string[]; rows: SearchDisplayIndexRow[] }> {
	const requestedEntityTypes = requestedInternalAiEntityTypes({
		query: options.query,
		scope: options.scope,
	})
	const allowedByEntityType = new Map(
		allowedInternalAiVtables(options.scope).map((vtable) => [
			vtable.entityType,
			vtable,
		]),
	)
	const tokensToApply = searchTokensForRows(options.query, {
		requestedEntityTypes,
		vtables: [...allowedByEntityType.values()],
	})

	const rowGroups = await Promise.all(
		requestedEntityTypes.map(async (entityType) => {
			if (!allowedByEntityType.has(entityType)) return []
			let request = client
				.from('ceo_search_documents')
				.select(INTERNAL_AI_ROW_SELECT)
				.eq('entity_type', entityType)
				.order('sort_at', { ascending: false })
				.order('title', { ascending: true })
				.limit(INTERNAL_AI_ENTITY_LIMIT)
			for (const token of tokensToApply) {
				request = request.ilike('search_text', searchPattern(token))
			}
			const { data, error } = await request
			if (error) throw new Error(error.message)
			return (data ?? []) as unknown as SearchDisplayIndexRow[]
		}),
	)
	return {
		queriedEntityTypes: requestedEntityTypes,
		rows: rowGroups.flat(),
	}
}

function searchTokensForRows(
	query: string,
	options: {
		requestedEntityTypes: string[]
		vtables: InternalAiVtable[]
	},
): string[] {
	const typeTokens = new Set<string>()
	for (const vtable of options.vtables) {
		if (!options.requestedEntityTypes.includes(vtable.entityType)) continue
		for (const keyword of vtable.keywords) {
			for (const token of queryTokensForAi(keyword)) {
				typeTokens.add(token)
			}
		}
	}
	return searchTokens(query).filter(
		(token) => !typeTokens.has(token) && !QUERY_STOP_TOKENS.has(token),
	)
}

function simpleEmployeeChatAnswer(userText: string): string | null {
	const normalized = userText
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^\p{L}\p{N}\s]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	if (/\b(fuck|fucker|bitch|idiot|stupid|shut up)\b/.test(normalized)) {
		return "I'm here to help with allowed internal context when you're ready."
	}
	if (
		!/^(hi|hello|hey|yo|good morning|good afternoon|good evening)$/.test(
			normalized,
		)
	) {
		return null
	}
	return 'Hi, I can read the allowed vtable context for this side panel, summarize records, explain workflow state, and point you to the authorized action when a change is needed.'
}

async function recordInternalAiAudit(
	client: InternalSupabaseClient,
	userText: string,
	chunks: StreamChunk[],
	scope: InternalAiScope,
	readEntities: string[],
	panelId?: string | null,
) {
	const response = chunks
		.filter((chunk) => chunk.type === 'TEXT_MESSAGE_CONTENT')
		.map((chunk) => chunk.delta)
		.join('')
	const { error } = await client.rpc('record_ai_tool_call', {
		p_agent_scope: scope,
		p_approved_by_user: false,
		p_input_summary: {
			panel: panelId ?? null,
			prompt: userText.slice(0, 240),
		},
		p_output_summary: { response: response.slice(0, 240) },
		p_read_entities: readEntities,
		p_tool_name:
			scope === 'search'
				? 'search_panel_vtable_chat'
				: 'normal_panel_vtable_chat',
		p_write_entity_id: null,
		p_write_entity_type: null,
	})
	if (error) throw new Error(error.message)
}
