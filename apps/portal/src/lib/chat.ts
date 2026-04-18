/**
 * Portal AI chat server function.
 *
 * Two backends:
 *   1. Ollama (qwen3.5:cloud on localhost:11434) — when USE_OLLAMA=1 on the
 *      dev machine. Lyon actually talks.
 *   2. Mock AG-UI stream — curated responses for prod and offline dev.
 *
 * Rich content (product / status / action cards) is keyword-matched on the
 * last user message and appended after the assistant's text — the LLM does
 * not emit tool calls yet, so the deterministic card rules still apply.
 */

import { isAIEnabled, LYON_PORTAL, streamChat } from '@hyperquote/ai'
import type { StreamChunk } from '@tanstack/ai'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// ============================================================================
// Input Schema
// ============================================================================

const portalChatInput = z.object({
	messages: z.array(
		z.object({
			role: z.enum(['user', 'assistant']),
			content: z.string(),
		}),
	),
	role: z.enum(['customer', 'supplier']),
	conversationId: z.string().nullable(),
})

// ============================================================================
// Mock responses — differentiated by customer vs supplier role
// ============================================================================

const CUSTOMER_RESPONSES: Record<string, string> = {
	default:
		"I'm HyperQuote's assistant. I can help you find building materials, get quotes, and track orders. What are you looking for today?",
	cement:
		'We carry a full range of cement products including Portland CEM I 42.5N, CEM II, and specialty cements. Here are some options:',
	rebar:
		'We have high-quality steel rebar available in various grades. Here is a popular option:',
	quote:
		"I'd be happy to help you start a quote request! You can add items to your material list below:",
	order: 'Let me check the status of your most recent order:',
	track: 'Let me look up your latest delivery status:',
	price:
		"Prices depend on quantity, delivery location, and current market conditions. Request a quote and we'll source pricing from multiple suppliers for you.",
	help: 'Here are some things I can help you with:',
}

const SUPPLIER_RESPONSES: Record<string, string> = {
	default:
		'Welcome to the Supplier Portal. I can help you manage stock, check PO status, and update pricing. What do you need?',
	cement:
		'Here is the current stock status for cement products in your catalog:',
	rebar: 'Here is the current stock status for rebar products:',
	order: 'Let me pull up the latest purchase order status:',
	track: 'Checking the status of your recent purchase orders:',
	price:
		'You can update your pricing through the catalog management window. Would you like me to open it?',
	help: 'Here are the key actions available to you:',
	stock: 'Let me check your current stock levels:',
}

function getResponse(
	userMessage: string,
	role: 'customer' | 'supplier',
): string {
	const lower = userMessage.toLowerCase()
	const responses =
		role === 'customer' ? CUSTOMER_RESPONSES : SUPPLIER_RESPONSES

	if (
		lower.includes('cement') ||
		lower.includes('\u0627\u0633\u0645\u0646\u062a')
	)
		return responses.cement ?? responses.default
	if (lower.includes('rebar') || lower.includes('\u062d\u062f\u064a\u062f'))
		return responses.rebar ?? responses.default
	if (lower.includes('/quote') || lower.includes('quote'))
		return responses.quote ?? responses.default
	if (
		lower.includes('order') ||
		lower.includes('\u0637\u0644\u0628') ||
		lower.includes('track') ||
		lower.includes('/track')
	)
		return responses.order ?? responses.track ?? responses.default
	if (lower.includes('/price') || lower.includes('price'))
		return responses.price ?? responses.default
	if (lower.includes('/help') || lower.includes('help'))
		return responses.help ?? responses.default
	if (
		lower.includes('stock') ||
		lower.includes('\u0645\u062e\u0632\u0648\u0646')
	)
		return responses.stock ?? responses.default
	return responses.default
}

// ============================================================================
// Rich message generators — CUSTOM events based on keyword detection
// ============================================================================

function getRichEvents(
	userMessage: string,
	role: 'customer' | 'supplier',
): StreamChunk[] {
	const lower = userMessage.toLowerCase()
	const events: StreamChunk[] = []

	if (
		lower.includes('cement') ||
		lower.includes('\u0627\u0633\u0645\u0646\u062a')
	) {
		events.push({
			type: 'CUSTOM' as const,
			timestamp: Date.now(),
			name: 'rich_message',
			value: {
				type: 'product_card',
				data: {
					id: 'prod-opc-425n',
					name: 'Portland Cement OPC 42.5N',
					nameAr:
						'\u0627\u0633\u0645\u0646\u062a \u0628\u0648\u0631\u062a\u0644\u0627\u0646\u062f\u064a \u0639\u0627\u062f\u064a \u0664\u0662.\u0665',
					priceRange: 'EGP 1,800 - 2,200/ton',
					specs: {
						Grade: '42.5N',
						Type: 'OPC (CEM I)',
						'Bag Size': '50kg',
					},
					available: true,
				},
			},
		})
	}

	if (lower.includes('rebar') || lower.includes('\u062d\u062f\u064a\u062f')) {
		events.push({
			type: 'CUSTOM' as const,
			timestamp: Date.now(),
			name: 'rich_message',
			value: {
				type: 'product_card',
				data: {
					id: 'prod-rebar-16mm',
					name: 'Steel Rebar 16mm Grade 60',
					nameAr:
						'\u062d\u062f\u064a\u062f \u062a\u0633\u0644\u064a\u062d \u0661\u0666\u0645\u0645 \u062f\u0631\u062c\u0629 \u0666\u0660',
					priceRange: 'EGP 38,000 - 42,000/ton',
					specs: {
						Diameter: '16mm',
						Grade: '60 (B500B)',
						Length: '12m',
					},
					available: true,
				},
			},
		})
	}

	if (
		lower.includes('order') ||
		lower.includes('\u0637\u0644\u0628') ||
		lower.includes('track') ||
		lower.includes('/track')
	) {
		events.push({
			type: 'CUSTOM' as const,
			timestamp: Date.now(),
			name: 'rich_message',
			value: {
				type: 'status_card',
				data: {
					entityType: 'order',
					entityId: 'ord-2026-00042',
					displayNumber: 'ORD-2026-00042',
					status: role === 'customer' ? 'In Transit' : 'PO Confirmed',
					statusColor: 'yellow',
					timeline: [
						{ label: 'Ordered', date: '2026-03-28', done: true },
						{ label: 'Confirmed', date: '2026-03-28', done: true },
						{ label: 'Dispatched', date: '2026-03-30', done: true },
						{ label: 'Delivered', date: '2026-04-01', done: false },
					],
				},
			},
		})
	}

	if (lower.includes('/quote')) {
		events.push({
			type: 'CUSTOM' as const,
			timestamp: Date.now(),
			name: 'rich_message',
			value: {
				type: 'material_list',
				data: {
					items: [],
				},
			},
		})
	}

	if (lower.includes('/help')) {
		const customerActions = [
			{
				label: 'Browse Market',
				labelAr: '\u062a\u0635\u0641\u062d \u0627\u0644\u0633\u0648\u0642',
				route: '/portal/market',
			},
			{
				label: 'View Orders',
				labelAr:
					'\u0639\u0631\u0636 \u0627\u0644\u0637\u0644\u0628\u0627\u062a',
				route: '/portal/orders',
			},
			{
				label: 'Get Support',
				labelAr:
					'\u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u062f\u0639\u0645',
				route: '/portal/support',
			},
		]
		const supplierActions = [
			{
				label: 'Manage Catalog',
				labelAr:
					'\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0643\u062a\u0627\u0644\u0648\u062c',
				route: '/portal/catalog',
			},
			{
				label: 'View Purchase Orders',
				labelAr:
					'\u0639\u0631\u0636 \u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0634\u0631\u0627\u0621',
				route: '/portal/purchase-orders',
			},
			{
				label: 'Update Stock',
				labelAr:
					'\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u062e\u0632\u0648\u0646',
				route: '/portal/stock',
			},
		]
		const actions = role === 'customer' ? customerActions : supplierActions
		for (const action of actions) {
			events.push({
				type: 'CUSTOM' as const,
				timestamp: Date.now(),
				name: 'rich_message',
				value: {
					type: 'action_button',
					data: action,
				},
			})
		}
	}

	return events
}

// ============================================================================
// Mock AG-UI stream generator
// ============================================================================

async function* mockPortalStream(
	userMessage: string,
	role: 'customer' | 'supplier',
): AsyncGenerator<StreamChunk> {
	const runId = crypto.randomUUID()
	const messageId = crypto.randomUUID()

	// RUN_STARTED
	yield {
		type: 'RUN_STARTED' as const,
		timestamp: Date.now(),
		runId,
	}

	// TEXT_MESSAGE_START
	yield {
		type: 'TEXT_MESSAGE_START' as const,
		timestamp: Date.now(),
		messageId,
		role: 'assistant' as const,
	}

	// TEXT_MESSAGE_CONTENT -- token-by-token streaming
	const response = getResponse(userMessage, role)
	const words = response.split(' ')
	for (const word of words) {
		yield {
			type: 'TEXT_MESSAGE_CONTENT' as const,
			timestamp: Date.now(),
			messageId,
			delta: `${word} `,
		}
		await new Promise((r) => setTimeout(r, 50 + Math.random() * 50))
	}

	// TEXT_MESSAGE_END
	yield {
		type: 'TEXT_MESSAGE_END' as const,
		timestamp: Date.now(),
		messageId,
	}

	// CUSTOM events for rich messages (after text completes)
	const richEvents = getRichEvents(userMessage, role)
	for (const event of richEvents) {
		yield event
	}

	// RUN_FINISHED
	yield {
		type: 'RUN_FINISHED' as const,
		timestamp: Date.now(),
		runId,
		finishReason: 'stop' as const,
	}
}

// ============================================================================
// portalChatFn — Server function returning AG-UI StreamChunk[].
// The ReadableStream variant drops chunks through TanStack Start's RPC; the
// array pattern serializes cleanly. Once that upstream bug is fixed we can
// switch back for true token-at-a-time streaming.
// ============================================================================

export const portalChatFn = createServerFn()
	.inputValidator(portalChatInput)
	.handler(async ({ data: input }) => {
		const lastMessage = input.messages[input.messages.length - 1]
		const userText = lastMessage?.content ?? ''
		const chunks: StreamChunk[] = []

		if (isAIEnabled()) {
			// Hold RUN_FINISHED until rich events have been appended.
			let finishChunk: StreamChunk | null = null
			for await (const chunk of streamChat(input.messages, LYON_PORTAL)) {
				if (chunk.type === 'RUN_FINISHED') {
					finishChunk = chunk
					continue
				}
				chunks.push(chunk)
			}
			for (const event of getRichEvents(userText, input.role)) {
				chunks.push(event)
			}
			if (finishChunk) chunks.push(finishChunk)
		} else {
			for await (const chunk of mockPortalStream(userText, input.role)) {
				chunks.push(chunk)
			}
		}

		// biome-ignore lint/complexity/noBannedTypes: TanStack server-fn type contract uses `{}` explicitly.
		return chunks as unknown as Array<{ [k: string]: {} }>
	})
