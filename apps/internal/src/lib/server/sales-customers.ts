import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Customer } from '../../types/sales'
import { db } from '../db/db'

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
