import { describe, expect, it } from 'vitest'
import { internalRealtimeQueryKeysForTable } from '../hooks/useInternalRealtimeSync'

function keyNamesForTable(table: string) {
	return internalRealtimeQueryKeysForTable(table).map((key) => String(key[0]))
}

describe('internalRealtimeQueryKeysForTable', () => {
	it('refreshes sales immediately when website or portal quote requests change', () => {
		const keys = keyNamesForTable('quote_requests')

		expect(keys).toContain('sales-rfq-list')
		expect(keys).toContain('quote-builder-data')
		expect(keys).toContain('customer-orders')
		expect(keys).toContain('finance-inbox')
		expect(keys).toContain('warehouse-queue')
		expect(keys).toContain('dispatch-board')
		expect(keys).toContain('internal-search')
	})

	it('refreshes prices, stock, and quote builders when catalog prices change', () => {
		const keys = keyNamesForTable('supplier_product_links')

		expect(keys).toContain('product-catalog')
		expect(keys).toContain('inventory-overview')
		expect(keys).toContain('stock-overview')
		expect(keys).toContain('sales-outdated-prices')
		expect(keys).toContain('quote-builder-data')
	})

	it('refreshes supplier admin, prices, stock, and quote builders when specialties change', () => {
		const keys = keyNamesForTable('supplier_specialties')

		expect(keys).toContain('admin')
		expect(keys).toContain('product-catalog')
		expect(keys).toContain('inventory-overview')
		expect(keys).toContain('stock-overview')
		expect(keys).toContain('supplier-batch-price-options')
		expect(keys).toContain('quote-builder-data')
	})

	it('refreshes warehouse and dispatch when loaded order state changes', () => {
		const keys = keyNamesForTable('loading_tasks')

		expect(keys).toContain('warehouse-queue')
		expect(keys).toContain('warehouse-order')
		expect(keys).toContain('dispatch-board')
		expect(keys).toContain('dispatch-route')
	})

	it('refreshes dispatch views when driver GPS locations change', () => {
		const keys = keyNamesForTable('driver_locations')

		expect(keys).toContain('dispatch-board')
		expect(keys).toContain('dispatch-route')
		expect(keys).toContain('dispatch-drivers')
		expect(keys).toContain('internal-search')
	})
})
