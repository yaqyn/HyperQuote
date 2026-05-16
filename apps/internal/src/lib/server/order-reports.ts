import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	db,
	type JsonObject,
	type OrderReportRow,
	type OrderReportStage,
} from '../db/db'

/**
 * Reads the living report for an RFQ/order. The response is a fully
 * resolved view: item slugs are joined to product names, so the viewer
 * component stays dumb.
 */

interface ResolvedReportItem {
	productSlug: string
	productName: string
	unit: string
	quantity: number
}

export interface ResolvedReport {
	id: string
	rfqId: string
	currentStage: OrderReportStage
	canceledReason: string | null
	canceledNote: string | null
	canceledAt: string | null
	sections: {
		submitted?: {
			customerName: string
			customerTier: string
			contactName: string
			phone: string
			deliveryAddress: string
			deliveryCity: string
			deliveryUrgencyDays: number
			items: ResolvedReportItem[]
		}
		evaluated?: {
			quoteId: string
			quoteNumber: string
			marginPercent: number
			subtotal: number
			vatAmount: number
			total: number
			sentAt: string | null
			sentVia: string | null
			validUntil: string
		}
		finance_partial?: JsonObject
		inventory_orders?: JsonObject
		finance_full?: JsonObject
		warehouse?: JsonObject
		dispatch?: JsonObject
		delivered?: JsonObject
		canceled?: JsonObject
		returned?: JsonObject
	}
}

function resolveItems(raw: unknown): ResolvedReportItem[] {
	if (!Array.isArray(raw)) return []
	return raw
		.map((entry: Record<string, unknown>) => {
			const slug = String(entry.productSlug ?? '')
			const product = db.products.findBySlug(slug)
			if (!product) return null
			return {
				productSlug: slug,
				productName: product.name,
				unit: product.unit_of_measure,
				quantity: Number(entry.quantity ?? 0),
			}
		})
		.filter((x): x is ResolvedReportItem => x !== null)
}

function resolveReport(row: OrderReportRow): ResolvedReport {
	const resolved: ResolvedReport = {
		id: row.id,
		rfqId: row.rfqId,
		currentStage: row.currentStage,
		canceledReason: row.canceledReason,
		canceledNote: row.canceledNote,
		canceledAt: row.canceledAt,
		sections: {},
	}

	const sub = row.sections.submitted
	if (sub) {
		resolved.sections.submitted = {
			customerName: String(sub.customerName ?? ''),
			customerTier: String(sub.customerTier ?? ''),
			contactName: String(sub.contactName ?? ''),
			phone: String(sub.phone ?? ''),
			deliveryAddress: String(sub.deliveryAddress ?? ''),
			deliveryCity: String(sub.deliveryCity ?? ''),
			deliveryUrgencyDays: Number(sub.deliveryUrgencyDays ?? 0),
			items: resolveItems(sub.items),
		}
	}
	const ev = row.sections.evaluated
	if (ev) {
		const daysFuture = Number(ev.validUntilDaysFromNow ?? 0)
		const hoursAgo = Number(ev.sentAtHoursAgo ?? 0)
		resolved.sections.evaluated = {
			quoteId: String(ev.quoteId ?? ''),
			quoteNumber: String(ev.quoteNumber ?? ''),
			marginPercent: Number(ev.marginPercent ?? 0),
			subtotal: Number(ev.subtotal ?? 0),
			vatAmount: Number(ev.vatAmount ?? 0),
			total: Number(ev.total ?? 0),
			sentAt:
				ev.sentAtHoursAgo == null
					? null
					: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
			sentVia: ev.sentVia != null ? String(ev.sentVia) : null,
			validUntil: new Date(Date.now() + daysFuture * 86_400_000).toISOString(),
		}
	}
	return resolved
}

export const getOrderReport = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ rfqId: z.string() }))
	.handler(async ({ data }) => {
		const row = db.orderReports.forRfq(data.rfqId)
		return row ? resolveReport(row) : null
	})
