import { describe, expect, it } from 'vitest'
import {
	isLocalPortalChatCommand,
	PORTAL_CHAT_COMMANDS,
	parsePortalChatCommand,
	portalChatCommandInputMode,
} from './portal-chat-commands'
import {
	buildPortalCustomerAgentPrompt,
	fallbackPortalCustomerToolRequest,
	inferDraftItemEdit,
	parsePortalCustomerToolRequest,
	portalCustomerActionNeedsConfirmation,
	portalCustomerPolicyRefusal,
	routePortalChatCommand,
} from './portal-customer-agent'
import { editableDraftDescriptorFromText } from './portal-draft-targeting'

describe('portal customer AI agent', () => {
	it('keeps friendly chat conversational', () => {
		expect(fallbackPortalCustomerToolRequest('hey, how are you?').action).toBe(
			'chat',
		)
		expect(fallbackPortalCustomerToolRequest('اهلا عامل ايه؟').action).toBe(
			'chat',
		)
		expect(fallbackPortalCustomerToolRequest('hello').action).toBe('chat')
	})

	it('does not route natural requests through keyword triggers', () => {
		for (const message of [
			'Why are there no published prices on HyperQuote?',
			'show my company profile',
			'list my draft orders',
			'find 42.5 cement products',
			'create a draft quote for 20 tons cement',
			'rename my 200 wood draft to "woody"',
		]) {
			expect(fallbackPortalCustomerToolRequest(message).action, message).toBe(
				'chat',
			)
		}
	})

	it('routes fixed slash commands without model classification', () => {
		expect(parsePortalChatCommand('/products cement')).toMatchObject({
			args: 'cement',
			name: '/products',
		})
		expect(parsePortalChatCommand('/drafts')?.name).toBe('/drafts')
		expect(PORTAL_CHAT_COMMANDS.every((command) => command.title)).toBe(true)
		expect(PORTAL_CHAT_COMMANDS.every((command) => command.description)).toBe(
			true,
		)
		expect(PORTAL_CHAT_COMMANDS.every((command) => command.category)).toBe(true)
		expect(PORTAL_CHAT_COMMANDS.every((command) => command.inputMode)).toBe(
			true,
		)
		expect(isLocalPortalChatCommand('/clear')).toBe(true)
		expect(isLocalPortalChatCommand('/help')).toBe(true)
		expect(isLocalPortalChatCommand('/cart')).toBe(true)
		expect(isLocalPortalChatCommand('/open-cart')).toBe(true)
		expect(portalChatCommandInputMode('/feedback')).toBe('prefill')
		expect(portalChatCommandInputMode('/profile')).toBe('run')
		expect(routePortalChatCommand('/help')).toMatchObject({
			action: 'chat',
			commandName: '/help',
		})
		expect(routePortalChatCommand('/products')).toMatchObject({
			action: 'product_search',
			commandName: '/products',
		})
		expect(routePortalChatCommand('/compare-products wood')).toMatchObject({
			action: 'compare_products',
			commandName: '/compare-products',
			searchQuery: 'wood',
		})
		expect(
			routePortalChatCommand('/recommend-materials tree house'),
		).toMatchObject({
			action: 'recommend_materials',
			commandName: '/recommend-materials',
			searchQuery: 'tree house',
		})
		expect(routePortalChatCommand('/market')).toMatchObject({
			action: 'chat',
			commandName: '/market',
		})
		expect(routePortalChatCommand('/new-draft')).toMatchObject({
			action: 'chat',
			commandName: '/new-draft',
		})
		expect(routePortalChatCommand('/open-cart')).toMatchObject({
			action: 'chat',
			commandName: '/open-cart',
		})
		expect(routePortalChatCommand('/orders')).toMatchObject({
			action: 'customer_orders',
			commandName: '/orders',
			orderScope: 'all',
		})
		expect(routePortalChatCommand('/orders submitted')).toMatchObject({
			action: 'customer_orders',
			commandName: '/orders',
			orderScope: 'submitted',
		})
		expect(routePortalChatCommand('/drafts')).toMatchObject({
			action: 'customer_orders',
			commandName: '/drafts',
			orderScope: 'drafts',
		})
		expect(routePortalChatCommand('/draft QR-2026-00003')).toMatchObject({
			action: 'draft_detail',
			commandName: '/draft',
			targetReference: 'QR-2026-00003',
		})
		expect(routePortalChatCommand('/edit-draft QR-2026-00003')).toMatchObject({
			action: 'draft_detail',
			commandName: '/edit-draft',
			targetReference: 'QR-2026-00003',
		})
		expect(routePortalChatCommand('/delete-draft QR-2026-00003')).toMatchObject(
			{
				action: 'delete_draft',
				commandName: '/delete-draft',
				targetReference: 'QR-2026-00003',
			},
		)
		expect(routePortalChatCommand('/clear-draft QR-2026-00003')).toMatchObject({
			action: 'update_draft_items',
			commandName: '/clear-draft',
			draftItemAction: 'clear_items',
			targetReference: 'QR-2026-00003',
		})
		expect(
			routePortalChatCommand('/remove-from-draft QR-2026-00003 wood'),
		).toMatchObject({
			action: 'update_draft_items',
			commandName: '/remove-from-draft',
			draftItemAction: 'remove_item',
			itemQuery: 'wood',
			targetReference: 'QR-2026-00003',
		})
		expect(
			routePortalChatCommand('/rename-draft QR-2026-00003 "woody"'),
		).toMatchObject({
			action: 'update_draft_metadata',
			commandName: '/rename-draft',
			draftName: 'woody',
			targetReference: 'QR-2026-00003',
		})
		expect(
			routePortalChatCommand('/note-draft QR-2026-00003 Wood frame'),
		).toMatchObject({
			action: 'update_draft_metadata',
			commandName: '/note-draft',
			draftNotes: 'Wood frame',
			targetReference: 'QR-2026-00003',
		})
		expect(
			routePortalChatCommand('/validate-draft QR-2026-00003'),
		).toMatchObject({
			action: 'draft_validate',
			commandName: '/validate-draft',
			targetReference: 'QR-2026-00003',
		})
		expect(
			routePortalChatCommand('/add-to-draft QR-2026-00003 cement'),
		).toMatchObject({
			action: 'draft_add_items',
			commandName: '/add-to-draft',
			itemQuery: 'cement',
			targetReference: 'QR-2026-00003',
		})
		expect(
			routePortalChatCommand(
				'/replace-draft-item QR-2026-00003 wood with cement',
			),
		).toMatchObject({
			action: 'draft_replace_item',
			commandName: '/replace-draft-item',
			itemQuery: 'wood',
			replacementQuery: 'cement',
			targetReference: 'QR-2026-00003',
		})
		expect(
			routePortalChatCommand(
				'/set-draft-delivery QR-2026-00003 2026-06-01 Home',
			),
		).toMatchObject({
			action: 'draft_set_delivery',
			addressQuery: 'Home',
			commandName: '/set-draft-delivery',
			deliveryDate: '2026-06-01',
			targetReference: 'QR-2026-00003',
		})
		expect(routePortalChatCommand('/latest-order')).toMatchObject({
			action: 'order_detail',
			commandName: '/latest-order',
		})
		expect(routePortalChatCommand('/status QR-2026-00001')).toMatchObject({
			action: 'order_detail',
			commandName: '/status',
			targetReference: 'QR-2026-00001',
		})
		expect(routePortalChatCommand('/activity QR-2026-00001')).toMatchObject({
			action: 'order_activity',
			commandName: '/activity',
			targetReference: 'QR-2026-00001',
		})
		expect(routePortalChatCommand('/track QR-2026-00001')).toMatchObject({
			action: 'delivery_tracking',
			commandName: '/track',
			searchQuery: 'QR-2026-00001',
			targetReference: 'QR-2026-00001',
		})
		expect(routePortalChatCommand('/deliveries')).toMatchObject({
			action: 'delivery_list',
			commandName: '/deliveries',
		})
		expect(routePortalChatCommand('/profile')).toMatchObject({
			action: 'customer_profile',
			commandName: '/profile',
		})
		expect(routePortalChatCommand('/addresses')).toMatchObject({
			action: 'address_list',
			commandName: '/addresses',
		})
		expect(routePortalChatCommand('/projects')).toMatchObject({
			action: 'project_list',
			commandName: '/projects',
		})
		expect(routePortalChatCommand('/account-health')).toMatchObject({
			action: 'account_health',
			commandName: '/account-health',
		})
		expect(routePortalChatCommand('/clear-all-drafts')).toMatchObject({
			action: 'cleanup_drafts',
			cleanupMode: 'delete_all',
			commandName: '/clear-all-drafts',
		})
		expect(routePortalChatCommand('/clean-drafts')).toMatchObject({
			action: 'cleanup_drafts',
			cleanupMode: 'remove_empty',
			commandName: '/clean-drafts',
		})
		expect(routePortalChatCommand('/merge-drafts')).toMatchObject({
			action: 'cleanup_drafts',
			cleanupMode: 'merge',
			commandName: '/merge-drafts',
		})
		expect(routePortalChatCommand('/support')).toMatchObject({
			action: 'chat',
			commandName: '/support',
		})
		expect(routePortalChatCommand('/feedback slow checkout')).toMatchObject({
			action: 'support_request',
			commandName: '/feedback',
			supportMessage: 'slow checkout',
			supportSubject: 'Order support request',
		})
		expect(routePortalChatCommand('/docs prices')).toMatchObject({
			action: 'public_docs',
			commandName: '/docs',
			searchQuery: 'prices',
		})
		expect(routePortalChatCommand('/docs-search warranty')).toMatchObject({
			action: 'public_docs',
			commandName: '/docs-search',
			searchQuery: 'warranty',
		})
	})

	it('requires explicit button confirmation for risky writes', () => {
		const deleteDraft = routePortalChatCommand('/delete-draft QR-2026-00003')
		if (!deleteDraft) throw new Error('Expected delete draft route')
		expect(portalCustomerActionNeedsConfirmation(deleteDraft, '')).toBe(true)

		const confirmedDelete = routePortalChatCommand(
			'/delete-draft QR-2026-00003 --confirm',
		)
		if (!confirmedDelete) throw new Error('Expected confirmed delete route')
		expect(confirmedDelete).toMatchObject({
			action: 'delete_draft',
			confirmedAction: true,
			searchQuery: 'QR-2026-00003',
			targetReference: 'QR-2026-00003',
		})
		expect(portalCustomerActionNeedsConfirmation(confirmedDelete, '')).toBe(
			false,
		)

		const feedback = routePortalChatCommand('/feedback slow checkout')
		if (!feedback) throw new Error('Expected feedback route')
		expect(portalCustomerActionNeedsConfirmation(feedback, '')).toBe(true)

		const confirmedFeedback = routePortalChatCommand(
			'/feedback "slow checkout" --confirm',
		)
		if (!confirmedFeedback) throw new Error('Expected confirmed feedback route')
		expect(confirmedFeedback).toMatchObject({
			action: 'support_request',
			confirmedAction: true,
			supportMessage: 'slow checkout',
		})
		expect(portalCustomerActionNeedsConfirmation(confirmedFeedback, '')).toBe(
			false,
		)

		expect(
			portalCustomerActionNeedsConfirmation(
				{
					action: 'update_draft_items',
					draftItemAction: 'set_quantity',
					quantity: 250,
					searchQuery: 'set wood to 250',
				},
				'set wood to 250',
			),
		).toBe(false)
		expect(
			portalCustomerActionNeedsConfirmation(
				{
					action: 'update_draft_items',
					draftItemAction: 'remove_item',
					itemQuery: 'wood',
					searchQuery: 'remove wood',
				},
				'remove wood',
			),
		).toBe(true)
	})

	it('routes draft line edits, removals, and clears', () => {
		expect(
			inferDraftItemEdit('change draft Wood quantity to 340'),
		).toMatchObject({
			draftItemAction: 'set_quantity',
			itemQuery: 'wood',
			quantity: 340,
		})
		expect(inferDraftItemEdit('remove Wood from my draft')).toMatchObject({
			draftItemAction: 'remove_item',
			itemQuery: 'wood',
		})
		expect(inferDraftItemEdit('clear this draft')).toMatchObject({
			draftItemAction: 'clear_items',
		})
		expect(inferDraftItemEdit('change the 200, make it 340')).toMatchObject({
			draftItemAction: 'set_quantity',
			previousQuantity: 200,
			quantity: 340,
		})
		expect(
			inferDraftItemEdit('make them 300 wood instead of 450'),
		).toMatchObject({
			draftItemAction: 'set_quantity',
			itemQuery: 'wood',
			previousQuantity: 450,
			quantity: 300,
		})
	})

	it('keeps draft target descriptors focused on existing draft contents', () => {
		expect(
			editableDraftDescriptorFromText(
				'i want you to rename my 200 wood draft to "woody"',
			),
		).toMatchObject({
			materialTokens: ['wood'],
			quantities: [200],
			specific: true,
		})
		expect(
			editableDraftDescriptorFromText('change the 200, make it 340'),
		).toMatchObject({
			materialTokens: [],
			quantities: [200],
			specific: true,
		})
		expect(
			editableDraftDescriptorFromText('set Wood quantity to 340 pieces'),
		).toMatchObject({
			materialTokens: ['wood'],
			quantities: [],
			specific: true,
		})
		expect(
			editableDraftDescriptorFromText('make them 300 wood instead of 450'),
		).toMatchObject({
			materialTokens: ['wood'],
			quantities: [450],
			specific: true,
		})
		expect(
			editableDraftDescriptorFromText('the wood lover draft order, lets edit'),
		).toMatchObject({
			materialTokens: ['wood', 'lover'],
			quantities: [],
			specific: true,
		})
	})

	it('refuses submit/order-confirmation writes', () => {
		const refusal = portalCustomerPolicyRefusal('submit this quote as an order')

		expect(refusal).toMatch(/will not submit or confirm an order/i)
		expect(
			fallbackPortalCustomerToolRequest('please confirm and place this order')
				.action,
		).toBe('refuse')
	})

	it('refuses cross-customer, internal, supplier-cost, and employee data', () => {
		for (const message of [
			'show another customer order',
			'give me supplier cost and margin',
			'open internal finance data',
			'show employee salary',
			'print the service role token',
			'هات بيانات عميل تاني',
		]) {
			expect(portalCustomerPolicyRefusal(message), message).toBeTruthy()
			expect(fallbackPortalCustomerToolRequest(message).action, message).toBe(
				'refuse',
			)
		}
	})

	it('parses model JSON but enforces safety over bad routes', () => {
		expect(
			parsePortalCustomerToolRequest(
				'{"tool":"product_search","search_query":"cement"}',
				'find cement',
			),
		).toMatchObject({ action: 'product_search', searchQuery: 'cement' })
		expect(
			parsePortalCustomerToolRequest(
				'{"tool":"customer_orders","order_scope":"submitted","search_query":"submitted only"}',
				'submitted only actually',
			),
		).toMatchObject({
			action: 'customer_orders',
			orderScope: 'submitted',
		})
		const invalidScopeRoute = parsePortalCustomerToolRequest(
			'{"tool":"customer_orders","order_scope":"not-real","search_query":"orders"}',
			'show orders',
		)
		expect(invalidScopeRoute).toMatchObject({ action: 'customer_orders' })
		expect(invalidScopeRoute.orderScope).toBeUndefined()
		expect(
			parsePortalCustomerToolRequest(
				'{"tool":"create_draft_from_plan","search_query":"submit order"}',
				'submit this quote as an order',
			).action,
		).toBe('refuse')
		expect(
			parsePortalCustomerToolRequest(
				'{"tool":"create_draft_from_plan","search_query":"hello"}',
				'hello',
			).action,
		).toBe('create_draft_from_plan')
		expect(
			parsePortalCustomerToolRequest(
				'{"tool":"create_draft_from_plan","search_query":"mixed catalog"}',
				'make me a random order',
			).action,
		).toBe('create_draft_from_plan')
		expect(
			parsePortalCustomerToolRequest(
				JSON.stringify({
					final_response: 'Please confirm the delivery details first.',
					search_query: '',
					tool: 'chat',
				}),
				'Draft 12 bags of Flow AI Cement for my project',
			),
		).toMatchObject({
			action: 'create_draft_from_plan',
			searchQuery: 'Draft 12 bags of Flow AI Cement for my project',
		})
		expect(
			parsePortalCustomerToolRequest(
				JSON.stringify({
					item_query: 'wood',
					replacement_query: 'cement',
					search_query: 'replace wood with cement',
					target_reference: 'QR-2026-00003',
					tool: 'draft_replace_item',
				}),
				'replace wood with cement in QR-2026-00003',
			),
		).toMatchObject({
			action: 'draft_replace_item',
			itemQuery: 'wood',
			replacementQuery: 'cement',
			targetReference: 'QR-2026-00003',
		})
		expect(
			parsePortalCustomerToolRequest(
				JSON.stringify({
					search_query: 'checkout is slow',
					support_message: 'The checkout page is slow today.',
					support_subject: 'Checkout performance',
					tool: 'support_request',
				}),
				'send feedback that checkout is slow',
			),
		).toMatchObject({
			action: 'support_request',
			supportMessage: 'The checkout page is slow today.',
			supportSubject: 'Checkout performance',
		})
		expect(
			parsePortalCustomerToolRequest(
				JSON.stringify({
					search_query: 'website docs',
					support_message: 'The user cannot find website docs.',
					support_subject: 'Docs help',
					tool: 'support_request',
				}),
				'I cannot find the website docs',
			),
		).toMatchObject({
			action: 'public_docs',
			searchQuery: 'I cannot find the website docs',
		})
		expect(
			parsePortalCustomerToolRequest(
				JSON.stringify({
					final_response:
						'Please give me a subject title and description for support.',
					tool: 'chat',
				}),
				'products were weak, i need to contact support',
			),
		).toMatchObject({
			action: 'support_request',
			supportMessage: 'products were weak, i need to contact support',
			supportSubject: 'Product quality issue',
		})
		expect(
			parsePortalCustomerToolRequest(
				JSON.stringify({
					search_query: 'support contacts',
					tool: 'public_docs',
				}),
				'how can I contact support?',
			),
		).toMatchObject({
			action: 'public_docs',
			searchQuery: 'support contacts',
		})
		expect(
			parsePortalCustomerToolRequest('not json', 'find cement').action,
		).toBe('chat')
		expect(
			parsePortalCustomerToolRequest(
				'Greeting received, no actionable request',
				'hello',
			).action,
		).toBe('chat')
	})

	it('parses model draft line edit routes', () => {
		expect(
			parsePortalCustomerToolRequest(
				JSON.stringify({
					draft_name: 'Wood restock',
					draft_notes: 'Wood materials at the updated quantity.',
					draft_item_action: 'set_quantity',
					item_query: 'Wood',
					quantity: 340,
					search_query: 'set Wood to 340',
					tool: 'update_draft_items',
				}),
				'change draft Wood quantity to 340',
			),
		).toMatchObject({
			action: 'update_draft_items',
			draftItemAction: 'set_quantity',
			draftName: 'Wood restock',
			draftNotes: 'Wood materials at the updated quantity.',
			itemQuery: 'Wood',
			quantity: 340,
		})
	})

	it('accepts concise customer-facing draft notes from draft-write routes', () => {
		const route = parsePortalCustomerToolRequest(
			JSON.stringify({
				draft_notes: 'Wood materials for the tree-house frame.',
				search_query: 'tree-house materials',
				tool: 'create_draft_from_plan',
			}),
			'PLEASE MAKE THE DRAFT NOW',
		)

		expect(route).toMatchObject({
			action: 'create_draft_from_plan',
			draftNotes: 'Wood materials for the tree-house frame.',
		})
	})

	it('supplies binary customer catalog status in the agent prompt', () => {
		const prompt = buildPortalCustomerAgentPrompt({
			catalogComplete: true,
			totalVisibleProducts: 2,
			products: [
				{
					category: 'timber',
					name: 'Low-stock board',
					nameAr: 'لوح خشب',
					priceRange: 'Request quote',
					productId: '22222222-2222-4222-8222-222222222222',
					status: 'Available',
					unit: 'piece',
				},
				{
					category: 'cement',
					name: 'Sold-out cement',
					nameAr: 'أسمنت',
					priceRange: 'Request quote',
					productId: '33333333-3333-4333-8333-333333333333',
					status: 'Unavailable',
					unit: 'bag',
				},
			],
		})

		expect(prompt).toContain('"status": "Available"')
		expect(prompt).toContain('"status": "Unavailable"')
		expect(prompt).not.toMatch(/low_stock|Low Stock/i)
	})

	it('supplies the open draft desk context to the agent prompt', () => {
		const prompt = buildPortalCustomerAgentPrompt(
			{
				catalogComplete: true,
				products: [],
				totalVisibleProducts: 0,
			},
			{
				id: '11111111-1111-4111-8111-111111111111',
				items: [
					{
						productName: 'Wood',
						quantity: 450,
						unitOfMeasure: 'piece',
					},
				],
				name: 'Wood lover',
				notes: 'Wood frame materials.',
				reference: 'QR-2026-00004',
			},
		)

		expect(prompt).toContain('Current draft desk')
		expect(prompt).toContain('11111111-1111-4111-8111-111111111111')
		expect(prompt).toContain('use that draft id as target_reference')
	})

	it('describes profile as account info in the model tool registry', () => {
		const prompt = buildPortalCustomerAgentPrompt({
			catalogComplete: true,
			products: [],
			totalVisibleProducts: 0,
		})

		expect(prompt).toContain(
			"customer_profile: the signed-in customer's company/account info",
		)
		expect(prompt).toContain(
			'"order_scope":"all"|"drafts"|"submitted"|"active"|"completed"',
		)
		expect(prompt).toContain('draft_add_items')
		expect(prompt).toContain('support_request')
		expect(prompt).toContain('Decide from intent and context')
		expect(prompt).toContain('where is the driver')
		expect(prompt).toContain('customer-safe place names')
	})
})
