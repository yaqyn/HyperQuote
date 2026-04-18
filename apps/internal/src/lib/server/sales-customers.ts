import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	Customer,
	Customer360Data,
	CustomerContact,
} from '../../types/sales'
import { type CustomerRow, db } from '../db/db'

// ─── Projections ──────────────────────────────────────────

function projectCustomer(
	row: ReturnType<typeof db.customers.list>[number],
): Customer {
	return {
		id: row.id,
		companyName: row.companyName,
		tier: row.tier,
		status: row.status,
		contactName: row.contactName,
		phone: row.phone,
		email: row.email,
		address: row.address,
		creditLimit: row.creditLimit,
		currentExposure: row.currentExposure,
		assignedSalesRep: row.assignedSalesRep,
		createdAt: row.joinedAt,
	}
}

// ─── Server Functions ─────────────────────────────────────

export const getCustomerList = createServerFn({ method: 'GET' })
	.inputValidator(
		z.object({
			search: z.string().optional(),
			segment: z.string().optional(),
			page: z.number().default(1),
			limit: z.number().default(50),
		}),
	)
	.handler(async ({ data }) => {
		let rows = db.customers.list().map(projectCustomer)
		if (data.search) {
			const q = data.search.toLowerCase()
			rows = rows.filter(
				(c) =>
					c.companyName.toLowerCase().includes(q) ||
					c.contactName.toLowerCase().includes(q) ||
					c.phone.includes(q),
			)
		}
		if (data.segment) rows = rows.filter((c) => c.tier === data.segment)
		const start = (data.page - 1) * data.limit
		return {
			customers: rows.slice(start, start + data.limit),
			total: rows.length,
		}
	})

const getCustomerCreditInfo = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ customerId: z.string() }))
	.handler(async ({ data }) => {
		const row = db.customers.get(data.customerId)
		if (!row) {
			return {
				creditLimit: 0,
				currentExposure: 0,
				paymentHistory: 'fair' as const,
				riskScore: 50,
			}
		}
		const riskScore =
			row.paymentHistory === 'excellent'
				? 10
				: row.paymentHistory === 'good'
					? 25
					: row.paymentHistory === 'fair'
						? 55
						: 80
		return {
			creditLimit: row.creditLimit,
			currentExposure: row.currentExposure,
			paymentHistory: row.paymentHistory,
			riskScore,
		}
	})

export const addCustomer = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			phone: z.string().min(10),
			companyName: z.string().min(1),
			contactName: z.string().min(1),
			email: z.string().optional(),
			deliveryAddress: z.string().optional(),
			city: z.string().optional(),
			projectName: z.string().optional(),
			notes: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		// Duplicate check — if phone or name already exists, return that row
		// instead of creating a dupe.
		const existing = db.customers
			.list()
			.find(
				(c) =>
					c.phone === data.phone ||
					c.companyName.toLowerCase() === data.companyName.toLowerCase(),
			)
		if (existing) {
			return {
				customerId: existing.id,
				status: existing.status,
				warning: 'duplicate_match' as const,
			}
		}

		const row = db.customers.insert({
			companyName: data.companyName,
			tier: 'new',
			status: 'unclaimed',
			contactName: data.contactName,
			phone: data.phone,
			email: data.email ?? null,
			address: data.deliveryAddress ?? '',
			city: data.city ?? '',
			creditLimit: 0,
			currentExposure: 0,
			orderCount: 0,
			lifetimeValue: 0,
			avgMargin: 0,
			paymentHistory: 'good',
			assignedSalesRep: null,
		})
		return {
			customerId: row.id,
			status: row.status,
			warning: 'new_customer_no_credit' as const,
		}
	})

const getCustomer360 = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ customerId: z.string() }))
	.handler(async ({ data }) => {
		const row: CustomerRow | undefined = db.customers.get(data.customerId)
		const fallback = row ?? db.customers.list()[0]
		const customer: Customer = projectCustomer(fallback)

		// Customer contacts, projects, communications, notes, and documents do
		// not yet have DB tables — they come online in later sessions. For now
		// return empty arrays so the UI renders stable zero-state rather than
		// fake strings. The shape is locked in so callers don't break later.
		const contacts: CustomerContact[] = []

		const quoteRows = db.quotes.forCustomer(fallback.id)
		const quotes = quoteRows.map((q) => {
			const total = q.items.reduce((s, i) => s + i.sellPrice * i.quantity, 0)
			return {
				id: q.id,
				quoteNumber: q.quoteNumber,
				status: q.status,
				total,
				createdAt: q.sentAt ?? q.validUntil,
				outcome:
					q.status === 'accepted'
						? ('won' as const)
						: q.status === 'declined'
							? ('lost' as const)
							: ('pending' as const),
			}
		})

		const data360: Customer360Data = {
			customer,
			contacts,
			quotes,
			orders: [], // orders table not yet modeled
			financials: {
				creditLimit: fallback.creditLimit,
				creditLimitHistory: [],
				arAging: {
					current: 0,
					days1to30: 0,
					days31to60: 0,
					days61to90: 0,
					days90plus: 0,
				},
				paymentHistory: [],
				avgDaysToPay: 0,
			},
			projects: [],
			communications: [],
			documents: [],
			notes: [],
			healthScore:
				fallback.paymentHistory === 'excellent'
					? 85
					: fallback.paymentHistory === 'good'
						? 70
						: fallback.paymentHistory === 'fair'
							? 50
							: 30,
		}
		return data360
	})
