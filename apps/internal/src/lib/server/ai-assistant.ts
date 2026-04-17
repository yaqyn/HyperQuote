import { createServerFn } from '@tanstack/react-start'
import type { AIMessage } from '../../types/ai'

// ─── NO AI SDK IMPORTS ──────────────────────────────────
// All mock. Real AI pipeline is Phase 30.
// Uses AG-UI protocol events matching portal pattern.

// ─── Mock Response Logic ────────────────────────────────

function getMockResponse(lastMessage: string): string {
	const lower = lastMessage.toLowerCase()

	if (lower.includes('quote'))
		return 'Here is a summary of recent quote activity:\n\n- **Open quotes:** 23\n- **Avg response time:** 2.1 hours\n- **Conversion rate:** 34%\n- **Total pipeline value:** EGP 2,450,000\n\nWould you like me to drill into a specific quote?'

	if (lower.includes('order'))
		return 'Current order status overview:\n\n- **In fulfillment:** 15 orders\n- **Dispatched:** 12 orders\n- **Delivered today:** 8 orders\n- **Pending invoicing:** 5 orders\n\nWhich order would you like details on?'

	if (lower.includes('driver') || lower.includes('delivery'))
		return 'Driver availability for tomorrow:\n\n- **Ahmed Hassan** - Available (flatbed, moffett)\n- **Khaled Ibrahim** - Available (flatbed, crane)\n- **Youssef Farid** - On leave\n- **Mohamed Saeed** - Assigned to Route 002\n\nShall I assign a driver to a route?'

	if (lower.includes('aging') || lower.includes('overdue'))
		return 'AR Aging Summary:\n\n- **Current:** EGP 1,200,000 (34 invoices)\n- **1-30 days:** EGP 850,000 (21 invoices)\n- **31-60 days:** EGP 460,000 (12 invoices)\n- **61-90 days:** EGP 320,000 (8 invoices)\n- **90+ days:** EGP 570,000 (15 invoices)\n\n**Total overdue:** EGP 890,000\n\nWould you like to see customers with the highest overdue balances?'

	if (
		lower.includes('cement') ||
		lower.includes('rebar') ||
		lower.includes('material')
	)
		return 'Current top materials by volume:\n\n1. Portland Cement CEM I 42.5N - 4,500 bags\n2. Steel Rebar 12mm - 2,200 tons\n3. Ceramic Tile 30x30 - 12,000 sqm\n\nNeed pricing or stock details?'

	if (lower.includes('approval') || lower.includes('approve'))
		return '[Draft] This action requires review:\n\n**Action:** Approve pending PO for Suez Cement Co.\n**Amount:** EGP 425,000\n**Items:** 2,000 bags Portland Cement CEM I 42.5N\n\nPlease review and confirm to proceed.'

	return 'I can help with quotes, orders, deliveries, driver management, financial reports, and more. What would you like to know?'
}

// ─── Role-Based Suggestions ─────────────────────────────

const ROLE_SUGGESTIONS: Record<string, string[]> = {
	sales: [
		'Show open quotes for this week',
		'Draft follow-up email for inactive customers',
		'Inactive customers 30+ days?',
	],
	procurement: [
		'Best rebar pricing this month?',
		'Supplier A on-time delivery rate?',
		'POs pending approval?',
	],
	operations: [
		'Orders at risk of missing delivery?',
		'Deliveries scheduled tomorrow?',
		'Which orders need attention?',
	],
	finance: [
		'AR aging over 90 days?',
		'Customers with bounced cheques?',
		'Cash position this week?',
		'Revenue vs target MTD?',
	],
	warehouse: [
		'Where is Portland Cement Type I?',
		'Cycle count accuracy?',
		'Slow-moving inventory report?',
	],
	dispatch: [
		'Available drivers for tomorrow?',
		'Optimize Cairo routes?',
		'Delayed deliveries today?',
	],
	management: [
		'How are we doing this month?',
		'What needs my approval?',
		'Key metrics overview?',
	],
}

// ─── AG-UI Protocol Events ──────────────────────────────

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue }

interface AGUIChunk {
	type: string
	timestamp: number
	[key: string]: JsonValue
}

function buildStreamChunks(response: string): AGUIChunk[] {
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()
	const now = Date.now()

	// Split response into word-level chunks for mock streaming feel
	const words = response.split(' ')
	const textChunks: AGUIChunk[] = words.map((word, i) => ({
		type: 'TEXT_MESSAGE_CONTENT',
		timestamp: now + i,
		messageId,
		delta: i === 0 ? word : ` ${word}`,
	}))

	return [
		{ type: 'RUN_STARTED', timestamp: now, runId },
		{
			type: 'TEXT_MESSAGE_START',
			timestamp: now,
			messageId,
			role: 'assistant',
		},
		...textChunks,
		{ type: 'TEXT_MESSAGE_END', timestamp: now + words.length, messageId },
		{
			type: 'RUN_FINISHED',
			timestamp: now + words.length + 1,
			runId,
			finishReason: 'stop',
		},
	]
}

// ─── Server Functions ───────────────────────────────────

export const askAI = createServerFn({ method: 'POST' })
	.inputValidator((input: { messages: AIMessage[]; role?: string }) => input)
	.handler(async ({ data }): Promise<AGUIChunk[]> => {
		const lastMsg = data.messages[data.messages.length - 1]
		const content = lastMsg?.content ?? ''
		const response = getMockResponse(content)
		return buildStreamChunks(response)
	})

export const getAISuggestions = createServerFn({ method: 'GET' })
	.inputValidator((input: { role?: string }) => input)
	.handler(async ({ data }): Promise<{ suggestions: string[] }> => {
		const role = data.role ?? 'management'
		const suggestions =
			ROLE_SUGGESTIONS[role] ?? ROLE_SUGGESTIONS.management ?? []
		return { suggestions }
	})
