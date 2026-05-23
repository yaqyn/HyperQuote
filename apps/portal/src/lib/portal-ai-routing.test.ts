import { describe, expect, it } from 'vitest'
import {
	fallbackPortalCustomerRoute,
	parsePortalCustomerRoute,
	portalCustomerPolicyRefusal,
} from './portal-ai-routing'

describe('portal AI customer routing', () => {
	it('keeps friendly chat conversational', () => {
		expect(fallbackPortalCustomerRoute('hey, how are you?').action).toBe('chat')
		expect(fallbackPortalCustomerRoute('اهلا عامل ايه؟').action).toBe('chat')
	})

	it('routes public HyperQuote docs questions to shared docs retrieval', () => {
		const route = fallbackPortalCustomerRoute(
			'Why are there no published prices on HyperQuote?',
		)

		expect(route.action).toBe('public_docs')
	})

	it('routes customer profile, addresses, and projects to scoped context', () => {
		expect(fallbackPortalCustomerRoute('show my company profile').action).toBe(
			'customer_profile',
		)
		expect(fallbackPortalCustomerRoute('what address is saved?').action).toBe(
			'customer_profile',
		)
		expect(fallbackPortalCustomerRoute('اعرض مشاريعي').action).toBe(
			'customer_profile',
		)
	})

	it('routes order lists and delivery tracking across English and Arabic', () => {
		expect(
			fallbackPortalCustomerRoute(
				'show my drafts, submitted orders, confirmed orders, and delivered orders',
			).action,
		).toBe('customer_orders')
		expect(
			fallbackPortalCustomerRoute('where is my latest order?').action,
		).toBe('delivery_tracking')
		expect(fallbackPortalCustomerRoute('فين طلبي ومكان السائق؟').action).toBe(
			'delivery_tracking',
		)
		expect(fallbackPortalCustomerRoute('delivery bta3i feen?').action).toBe(
			'delivery_tracking',
		)
	})

	it('routes product and draft authoring requests', () => {
		expect(
			fallbackPortalCustomerRoute('find 42.5 cement products').action,
		).toBe('product_search')
		expect(
			fallbackPortalCustomerRoute('create a draft quote for 20 tons cement')
				.action,
		).toBe('create_draft_from_plan')
		expect(
			fallbackPortalCustomerRoute('3ayez draft quote for cement and rebar')
				.action,
		).toBe('create_draft_from_plan')
		expect(
			fallbackPortalCustomerRoute('اعمل مسودة مواد فيها اسمنت وحديد').action,
		).toBe('create_draft_from_plan')
	})

	it('routes draft duplicate, rename, cleanup, and delete intents', () => {
		expect(
			fallbackPortalCustomerRoute('duplicate my last order into a draft')
				.action,
		).toBe('duplicate_order_to_draft')
		expect(
			fallbackPortalCustomerRoute('rename draft to "Villa slab phase 2"')
				.action,
		).toBe('update_draft_metadata')
		expect(fallbackPortalCustomerRoute('clean up empty drafts').action).toBe(
			'cleanup_drafts',
		)
		expect(fallbackPortalCustomerRoute('delete draft QR-2026-001').action).toBe(
			'delete_draft',
		)
	})

	it('refuses submit/order-confirmation writes', () => {
		const refusal = portalCustomerPolicyRefusal('submit this quote as an order')

		expect(refusal).toMatch(/will not submit or confirm an order/i)
		expect(
			fallbackPortalCustomerRoute('please confirm and place this order').action,
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
			expect(fallbackPortalCustomerRoute(message).action, message).toBe(
				'refuse',
			)
		}
	})

	it('parses model JSON but enforces safety over bad routes', () => {
		expect(
			parsePortalCustomerRoute(
				'{"action":"product_search","search_query":"cement"}',
				'find cement',
			),
		).toMatchObject({ action: 'product_search', searchQuery: 'cement' })
		expect(
			parsePortalCustomerRoute(
				'{"action":"create_draft_from_plan","search_query":"submit order"}',
				'submit this quote as an order',
			).action,
		).toBe('refuse')
		expect(
			parsePortalCustomerRoute(
				'{"action":"create_draft_from_plan","search_query":"hello"}',
				'hello',
			).action,
		).toBe('chat')
		expect(parsePortalCustomerRoute('not json', 'find cement').action).toBe(
			'product_search',
		)
	})
})
