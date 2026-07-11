import { describe, expect, it } from 'vitest'
import {
	buildOrderReport,
	formatPortalReportItemLine,
} from '../lib/server/deliveries'

const REPORT_DATE = '2026-07-05T09:00:00.000Z'

function reportInput(): Parameters<typeof buildOrderReport>[0] {
	return {
		documents: [],
		items: [
			{
				id: 'item-1',
				imageUrl: '',
				lineTotal: 100,
				productName: 'Cement',
				productNameAr: 'أسمنت',
				quantity: 10,
				unitOfMeasure: 'bag',
				unitOfMeasureAr: 'شيكارة',
				unitPrice: 10,
			},
		],
		loadingTask: null,
		order: {
			amount: 100,
			currency: 'EGP',
			date: REPORT_DATE,
			description: 'Cement',
			id: 'request-1',
			itemCount: 1,
			items: [],
			reference: 'RFQ-1',
			status: 'submitted',
		},
		payments: [],
		quoteRequest: {
			attachment_urls: [],
			created_at: REPORT_DATE,
			customer_addresses: null,
			delivery_date: null,
			id: 'request-1',
			notes: null,
			orders: null,
			projects: null,
			quote_request_items: [],
			rejected_reason: null,
			request_number: 'RFQ-1',
			status: 'submitted',
			submitted_at: REPORT_DATE,
			updated_at: REPORT_DATE,
			urgency: 'standard',
		},
		reservations: [],
		versions: [],
	}
}

describe('portal order report formatting', () => {
	it('uses singular and plural piece labels for report details', () => {
		expect(
			formatPortalReportItemLine({
				productName: 'Wood',
				quantity: 1,
				unitOfMeasure: 'piece',
			}),
		).toBe('Wood: 1 Piece')

		expect(
			formatPortalReportItemLine({
				productName: 'Wood',
				quantity: 100,
				unitOfMeasure: 'piece',
			}),
		).toBe('Wood: 100 Pieces')
	})

	it('leaves other units unchanged', () => {
		expect(
			formatPortalReportItemLine({
				productName: 'Cement',
				quantity: 25,
				unitOfMeasure: 'bag',
			}),
		).toBe('Cement: 25 bag')
	})

	it('does not call a sales-canceled quote an order confirmation', () => {
		const input = reportInput()
		input.quoteRequest = input.quoteRequest
			? {
					...input.quoteRequest,
					rejected_reason: 'Customer canceled',
					status: 'canceled',
					updated_at: '2026-07-05T09:20:00.000Z',
				}
			: null
		input.order = { ...input.order, status: 'cancelled' }
		input.versions = [
			{
				created_at: '2026-07-05T09:05:00.000Z',
				delivery_fee: 0,
				discount_amount: 0,
				id: 'version-1',
				notes: null,
				status: 'sent',
				subtotal: 100,
				tax_amount: 14,
				total: 114,
				version_number: 1,
			},
		]

		const report = buildOrderReport(input)

		expect(report.summary.status).toBe('stopped')
		expect(report.steps.map((step) => step.title)).toContain('Sales evaluated')
		expect(report.steps.map((step) => step.title)).not.toContain(
			'Order confirmed',
		)
		expect(report.steps.at(-1)).toMatchObject({
			stage: 'stopped',
			status: 'stopped',
		})
	})

	it('does not mark preparation complete when finance cancels before processing', () => {
		const input = reportInput()
		input.order = {
			...input.order,
			amount: 114,
			reference: 'ORD-1',
			status: 'cancelled',
		}
		input.quoteRequest = input.quoteRequest
			? {
					...input.quoteRequest,
					orders: {
						created_at: '2026-07-05T09:10:00.000Z',
						delivered_at: null,
						id: 'order-1',
						order_number: 'ORD-1',
						quote_request_id: 'request-1',
						status: 'canceled',
						total_amount: 114,
						updated_at: '2026-07-05T09:20:00.000Z',
					},
				}
			: null
		input.payments = [
			{
				amount: 57,
				created_at: '2026-07-05T09:15:00.000Z',
				id: 'payment-1',
				payment_fraction: 0.5,
				proof_path: 'proof/payment-1.pdf',
				status: 'verified',
			},
		]

		const report = buildOrderReport(input)

		expect(report.summary.status).toBe('stopped')
		expect(report.steps.map((step) => step.title)).not.toContain(
			'Order preparation',
		)
		expect(report.steps.some((step) => step.stage === 'inventory')).toBe(false)
		expect(report.steps.some((step) => step.stage === 'warehouse')).toBe(false)
		expect(report.steps.map((step) => step.title)).toContain(
			'Order was confirmed before stop',
		)
	})
})
