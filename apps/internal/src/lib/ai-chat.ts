/**
 * Internal AI chat server function.
 *
 * Side-panel Lyon has two read modes:
 * - normal panels: all operational vtable context except employees/activity
 * - Search panel: all approved vtable context
 *
 * The client still receives StreamChunk[] and drips the chunks into Zustand.
 */

import {
	type ChatRequestMessage,
	type ChatToolCall,
	type ChatToolDefinition,
	completeChatFromMessages,
	completeChatWithTools,
	isAIEnabled,
} from '@hyperquote/ai'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	allowedInternalAiVtables,
	buildInternalAiContextPackage,
	buildInternalAiToolSystemPrompt,
	type InternalAiScope,
	internalAiPolicyRefusal,
	requestedInternalAiEntityTypes,
	resolveInternalAiScope,
	searchQueryFromPrompt,
} from './internal-ai-context'
import type { SearchDisplayIndexRow } from './search-display'
import { searchTokens } from './search-query'
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
const INTERNAL_AI_MAX_TOOL_CALLS = 4
const INTERNAL_AI_MODEL_MESSAGE_LIMIT = 12
const internalSearchToolArgs = z.object({
	entity_types: z.array(z.string().trim().min(1).max(80)).max(24).optional(),
	limit_per_entity: z.number().int().min(1).max(20).optional(),
	query: z.string().max(240).optional(),
})

type InternalSearchToolArgs = z.infer<typeof internalSearchToolArgs>
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
	if (await isAIEnabled()) {
		try {
			const result = await runInternalAiToolLoop(client, messages, {
				scope: options.scope,
			})
			options.setReadEntities(result.readEntities)
			return textStream(result.answer)
		} catch {
			// Fall back to the deterministic read path if the model/tool loop fails.
		}
	}

	const contextPackage = await buildAiContext(client, {
		panelId: options.panelId,
		scope: options.scope,
		userText: options.userText,
	})
	options.setReadEntities(contextPackage.readEntities)

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
	const requestedEntityTypes = requestedInternalAiEntityTypes({
		query,
		scope: options.scope,
	})
	const result = await fetchInternalAiRows(client, {
		entityTypes: requestedEntityTypes,
		query: '',
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
		entityTypes?: string[]
		limitPerEntity?: number
		query: string
		scope: InternalAiScope
	},
): Promise<{ queriedEntityTypes: string[]; rows: SearchDisplayIndexRow[] }> {
	const allowedByEntityType = new Map(
		allowedInternalAiVtables(options.scope).map((vtable) => [
			vtable.entityType,
			vtable,
		]),
	)
	const requestedEntityTypes = (options.entityTypes ?? [])
		.map((entityType) => entityType.trim().toLowerCase())
		.filter((entityType) => entityType.length > 0)
	const entityTypesToQuery =
		requestedEntityTypes.length > 0
			? [...new Set(requestedEntityTypes)].filter((entityType) =>
					allowedByEntityType.has(entityType),
				)
			: [...allowedByEntityType.keys()]
	const tokensToApply = searchTokens(options.query)

	const { data, error } = await client.rpc('internal_ai_search_documents', {
		p_agent_scope: options.scope,
		p_entity_types: entityTypesToQuery,
		p_limit_per_entity: options.limitPerEntity ?? INTERNAL_AI_ENTITY_LIMIT,
		p_search_tokens: tokensToApply,
	})
	if (error) throw new Error(error.message)

	return {
		queriedEntityTypes: entityTypesToQuery,
		rows: (data ?? []) as unknown as SearchDisplayIndexRow[],
	}
}

async function runInternalAiToolLoop(
	client: InternalSupabaseClient,
	messages: Array<{ role: 'user' | 'assistant'; content: string }>,
	options: { scope: InternalAiScope },
): Promise<{ answer: string; readEntities: string[] }> {
	const modelMessages = messages.slice(-INTERNAL_AI_MODEL_MESSAGE_LIMIT)
	const systemPrompt = buildInternalAiToolSystemPrompt({ scope: options.scope })
	const toolCompletion = await completeChatWithTools(
		modelMessages,
		systemPrompt,
		internalAiToolDefinitions(options.scope),
		{ temperature: 0.1 },
	)
	const toolCalls = toolCompletion.toolCalls.slice(
		0,
		INTERNAL_AI_MAX_TOOL_CALLS,
	)
	if (toolCalls.length === 0) {
		return {
			answer:
				toolCompletion.content ||
				'I need an internal lookup tool result before I can answer that.',
			readEntities: [],
		}
	}

	const readEntities = new Set<string>()
	const toolMessages: ChatRequestMessage[] = []
	for (const toolCall of toolCalls) {
		const result = await executeInternalAiToolCall(client, toolCall, {
			scope: options.scope,
		})
		for (const readEntity of result.readEntities) {
			readEntities.add(readEntity)
		}
		toolMessages.push({
			content: result.content,
			name: toolCall.function.name,
			role: 'tool',
			tool_call_id: toolCall.id,
		})
	}
	const conversationMessages: ChatRequestMessage[] = modelMessages.map(
		(message) => ({
			content: message.content,
			role: message.role,
		}),
	)

	const finalMessages: ChatRequestMessage[] = [
		{ content: systemPrompt, role: 'system' },
		...conversationMessages,
		{
			content: toolCompletion.content || null,
			role: 'assistant',
			tool_calls: toolCalls,
		},
		...toolMessages,
	]
	const answer = await completeChatFromMessages(finalMessages, {
		temperature: 0.2,
	})
	return { answer, readEntities: [...readEntities] }
}

function internalAiToolDefinitions(
	scope: InternalAiScope,
): ChatToolDefinition[] {
	const allowedEntityTypes = allowedInternalAiVtables(scope).map(
		(vtable) => vtable.entityType,
	)
	return [
		{
			function: {
				description:
					'Search HyperQuote internal records. Infer entity_types from natural user intent. Use query only for meaningful filters, names, numbers, statuses, or dates; leave query empty for broad list requests.',
				name: 'search_internal_records',
				parameters: {
					additionalProperties: false,
					properties: {
						entity_types: {
							description:
								'Record types to search. Choose the closest types from the enum.',
							items: {
								enum: allowedEntityTypes,
								type: 'string',
							},
							type: 'array',
						},
						limit_per_entity: {
							default: INTERNAL_AI_ENTITY_LIMIT,
							description: 'Maximum rows to return for each record type.',
							maximum: 20,
							minimum: 1,
							type: 'integer',
						},
						query: {
							description:
								'Optional focused filter text. Exclude slang, filler, greetings, and the entity type itself when no filter is needed.',
							maxLength: 240,
							type: 'string',
						},
					},
					type: 'object',
				},
			},
			type: 'function',
		},
	]
}

async function executeInternalAiToolCall(
	client: InternalSupabaseClient,
	toolCall: ChatToolCall,
	options: { scope: InternalAiScope },
): Promise<{ content: string; readEntities: string[] }> {
	if (toolCall.function.name !== 'search_internal_records') {
		return {
			content: JSON.stringify({
				error: 'unknown_internal_ai_tool',
				tool: toolCall.function.name,
			}),
			readEntities: [],
		}
	}

	const parsed = parseInternalSearchToolArgs(toolCall.function.arguments)
	if (!parsed.ok) {
		return {
			content: JSON.stringify({
				error: 'invalid_internal_ai_tool_arguments',
			}),
			readEntities: [],
		}
	}

	const query = parsed.value.query?.trim() ?? ''
	const result = await fetchInternalAiRows(client, {
		entityTypes: parsed.value.entity_types ?? [],
		limitPerEntity: parsed.value.limit_per_entity ?? INTERNAL_AI_ENTITY_LIMIT,
		query,
		scope: options.scope,
	})
	const contextPackage = buildInternalAiContextPackage({
		query,
		queriedEntityTypes: result.queriedEntityTypes,
		rows: result.rows,
		scope: options.scope,
	})

	return {
		content: JSON.stringify({
			context: contextPackage.context,
			entity_types: result.queriedEntityTypes,
			query,
			row_count: result.rows.length,
			scope: options.scope,
			tool: 'search_internal_records',
		}),
		readEntities: contextPackage.readEntities,
	}
}

function parseInternalSearchToolArgs(
	rawArguments: string,
): { ok: true; value: InternalSearchToolArgs } | { ok: false } {
	try {
		const parsed: unknown = rawArguments.trim() ? JSON.parse(rawArguments) : {}
		const result = internalSearchToolArgs.safeParse(parsed)
		return result.success ? { ok: true, value: result.data } : { ok: false }
	} catch {
		return { ok: false }
	}
}

function simpleEmployeeChatAnswer(userText: string): string | null {
	const normalized = userText
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^\p{L}\p{N}\s]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim()
	if (
		!/^(hi|hello|hey|yo|good morning|good afternoon|good evening)$/.test(
			normalized,
		)
	) {
		return null
	}
	return 'Hi, I can read the allowed internal context, summarize records, explain workflow state, and point you to the authorized action when a change is needed.'
}

async function recordInternalAiAudit(
	client: InternalSupabaseClient,
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
		p_input_summary: {
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
