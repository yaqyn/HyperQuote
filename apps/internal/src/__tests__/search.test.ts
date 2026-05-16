import { describe, expect, it } from 'vitest'
import { db, hoursSince } from '../lib/db/db'
import {
	buildSearchExecutiveBrief,
	getSearchModuleSummary,
	listSearchTableRows,
	searchInternalDbRows,
} from '../lib/search-registry'

describe('internal search registry', () => {
	it('returns table metadata but no matches for an empty query', () => {
		const result = searchInternalDbRows('   ')

		expect(result.query).toBe('')
		expect(result.tables.length).toBeGreaterThan(0)
		expect(result.tableMatches).toEqual([])
		expect(result.results).toEqual([])
	})

	it('matches rows by searchable fields across tables', () => {
		const result = searchInternalDbRows('portland cement')
		const productGroup = result.results.find(
			(group) => group.tableId === 'products',
		)

		expect(productGroup).toBeDefined()
		expect(
			productGroup?.rows.some((row) =>
				row.title.toLowerCase().includes('portland cement'),
			),
		).toBe(true)
	})

	it('matches table names separately from row matches', () => {
		const result = searchInternalDbRows('supplier prices')

		expect(result.tableMatches).toContainEqual(
			expect.objectContaining({
				tableId: 'supplierPrices',
				label: 'Supplier Prices',
			}),
		)
	})

	it('lists a whole table with row count and serialized rows', () => {
		const table = listSearchTableRows('customers')

		expect(table).not.toBeNull()
		expect(table?.rowCount).toBeGreaterThan(0)
		expect(table?.rows.length).toBe(table?.rowCount)
		expect(table?.rows[0]?.details.length).toBeGreaterThan(0)
	})

	it('exposes the formerly private price update request table read-only', () => {
		const table = listSearchTableRows('priceUpdateRequests')

		expect(table).not.toBeNull()
		expect(table?.rows.length).toBeGreaterThan(0)
		expect(
			table?.rows[0]?.preview.some((field) => field.label === 'Status'),
		).toBe(true)
	})

	it('serializes nested row values into JSON-safe detail fields', () => {
		const table = listSearchTableRows('products')
		const product = table?.rows.find((row) =>
			row.title.toLowerCase().includes('portland cement'),
		)

		expect(product).toBeDefined()
		const specifications = product?.details.find(
			(field) => field.label === 'Specifications',
		)

		expect(specifications).toBeDefined()
		expect(() => JSON.stringify(product?.details)).not.toThrow()
		expect(typeof specifications?.value).toBe('object')
	})

	it('builds exactly the Search summary modules the executive dashboard shows', () => {
		const brief = buildSearchExecutiveBrief()

		expect(brief.modules.map((summary) => summary.moduleId)).toEqual([
			'sales',
			'inventory',
			'warehouse',
			'finance',
			'dispatch',
			'customer-service',
		])
		expect(brief.modules.map((summary) => summary.moduleId)).not.toContain(
			'admin',
		)

		expect(labelsFor('sales')).toEqual(['Submitted', 'Rejected', 'Confirmed'])
		expect(labelsFor('inventory')).toEqual([
			'Orders',
			'Needs update',
			'Low stock',
		])
		expect(labelsFor('warehouse')).toEqual(['Loading', 'Receiving', 'Rejected'])
		expect(labelsFor('finance')).toEqual(['In', 'Out', 'Completed'])
		expect(labelsFor('dispatch')).toEqual([
			'Deliveries',
			'Fleet available',
			'Fleet not available',
		])
		expect(labelsFor('customer-service')).toEqual([
			'Message',
			'Email',
			'Resolved',
		])
	})

	it('derives summary counts from the same internal data buckets', () => {
		expect(countsFor('sales')).toEqual([
			db.rfqs.list().filter((rfq) => rfq.status === 'submitted').length,
			db.rfqs
				.list()
				.filter((rfq) => rfq.status === 'declined' || rfq.status === 'expired')
				.length,
			db.quotes.list().filter((quote) => quote.status === 'accepted').length,
		])

		expect(countsFor('inventory')).toEqual([
			db.quotes.list().filter((quote) => {
				const report = db.orderReports.forRfq(quote.rfqId)
				return (
					quote.status === 'accepted' &&
					quote.paymentStatus !== 'unpaid' &&
					!report?.sections.inventory_orders
				)
			}).length,
			db.supplierPrices
				.all()
				.filter(
					(price) => price.isPrimary && hoursSince(price.lastQuotedAt) >= 24,
				).length,
			db.stock.list().filter((row) => {
				const available = Math.max(0, row.stockLevel - row.reservedLevel)
				return available <= row.lowStockThreshold
			}).length,
		])

		const receiving = db.deals.list().filter((deal) => {
			return (
				deal.paymentStatus !== 'unpaid' &&
				deal.status !== 'delivered' &&
				deal.status !== 'closed' &&
				deal.items.some((item) => !item.received)
			)
		})

		expect(countsFor('warehouse')).toEqual([
			db.quotes.list().filter((quote) => {
				const report = db.orderReports.forRfq(quote.rfqId)
				const warehouse = report?.sections.warehouse
				return (
					quote.status === 'accepted' &&
					quote.paymentStatus !== 'unpaid' &&
					Boolean(report?.sections.inventory_orders) &&
					!hasSectionDate(warehouse, 'passedAt')
				)
			}).length,
			receiving.length,
			receiving.filter((deal) =>
				deal.receivingAttempts.some(
					(attempt) => attempt.rejectedSlugs.length > 0,
				),
			).length,
		])

		expect(countsFor('finance')).toEqual([
			db.quotes
				.list()
				.filter(
					(quote) =>
						quote.status === 'accepted' && quote.paymentStatus !== 'paid',
				).length,
			db.deals.list().filter((deal) => deal.paymentStatus !== 'paid').length,
			db.quotes
				.list()
				.filter(
					(quote) =>
						quote.status === 'accepted' && quote.paymentStatus === 'paid',
				).length +
				db.deals.list().filter((deal) => deal.paymentStatus === 'paid').length,
		])

		expect(countsFor('dispatch')).toEqual([
			db.quotes.list().filter((quote) => {
				const report = db.orderReports.forRfq(quote.rfqId)
				const warehouse = report?.sections.warehouse
				return (
					quote.status === 'accepted' &&
					hasSectionDate(warehouse, 'passedAt') &&
					!hasSectionDate(report?.sections.delivered, 'deliveredAt') &&
					!hasSectionDate(report?.sections.returned, 'returnedAt')
				)
			}).length,
			db.trucks.list().filter((truck) => truck.status === 'available').length,
			db.trucks.list().filter((truck) => truck.status !== 'available').length,
		])

		expect(countsFor('customer-service')).toEqual([
			db.conversations
				.list()
				.filter((conversation) => conversation.channel === 'live').length,
			db.conversations
				.list()
				.filter((conversation) => conversation.channel === 'email').length,
			db.conversations
				.list()
				.filter((conversation) => conversation.status === 'resolved').length,
		])
	})

	it('returns JSON-safe focused summaries with representative rows', () => {
		for (const summary of buildSearchExecutiveBrief().modules) {
			const focused = getSearchModuleSummary(summary.moduleId)

			expect(focused).not.toBeNull()
			expect(() => JSON.stringify(focused)).not.toThrow()
			expect(focused?.sections.length).toBe(3)

			for (const section of focused?.sections ?? []) {
				expect(section.rows.length).toBeLessThanOrEqual(4)
				for (const entry of section.rows) {
					expect(listSearchTableRows(entry.row.tableId)).not.toBeNull()
					expect(() => JSON.stringify(entry.row.details)).not.toThrow()
				}
			}
		}
	})
})

function labelsFor(moduleId: Parameters<typeof getSearchModuleSummary>[0]) {
	const summary = getSearchModuleSummary(moduleId)
	return summary?.points.map((point) => point.label)
}

function countsFor(moduleId: Parameters<typeof getSearchModuleSummary>[0]) {
	const summary = getSearchModuleSummary(moduleId)
	return summary?.points.map((point) => point.count)
}

function hasSectionDate(
	section: Record<string, unknown> | undefined,
	field: string,
): boolean {
	const value = section?.[field]
	return typeof value === 'string' && value.length > 0
}
