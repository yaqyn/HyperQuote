import { describe, expect, it } from 'vitest'
import {
	isPortalCustomerOrderScope,
	orderMatchesPortalScope,
	portalOrderScopeTitle,
} from './portal-order-scope'

describe('portal order scope helpers', () => {
	const draft = { status: 'draft', type: 'draft' as const }
	const assigned = { status: 'assigned', type: 'submitted' as const }
	const loading = { status: 'warehouse_loading', type: 'confirmed' as const }
	const delivered = { status: 'delivered', type: 'confirmed' as const }
	const rejected = { status: 'rejected', type: 'submitted' as const }

	it('validates model-supplied order scopes', () => {
		expect(isPortalCustomerOrderScope('drafts')).toBe(true)
		expect(isPortalCustomerOrderScope('submitted')).toBe(true)
		expect(isPortalCustomerOrderScope('all_orders')).toBe(false)
		expect(isPortalCustomerOrderScope(undefined)).toBe(false)
	})

	it('keeps scoped order cards aligned with scoped text', () => {
		expect(orderMatchesPortalScope(draft, 'drafts')).toBe(true)
		expect(orderMatchesPortalScope(assigned, 'drafts')).toBe(false)
		expect(orderMatchesPortalScope(assigned, 'submitted')).toBe(true)
		expect(orderMatchesPortalScope(loading, 'submitted')).toBe(true)
		expect(orderMatchesPortalScope(delivered, 'submitted')).toBe(false)
		expect(orderMatchesPortalScope(rejected, 'submitted')).toBe(false)
		expect(orderMatchesPortalScope(loading, 'active')).toBe(true)
		expect(orderMatchesPortalScope(delivered, 'active')).toBe(false)
		expect(orderMatchesPortalScope(delivered, 'completed')).toBe(true)
	})

	it('uses customer-facing scope titles', () => {
		expect(portalOrderScopeTitle('drafts')).toBe('editable drafts')
		expect(portalOrderScopeTitle('submitted')).toBe('submitted orders')
	})
})
