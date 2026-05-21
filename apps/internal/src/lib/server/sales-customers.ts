import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Customer } from '../../types/sales'
import { getInternalSupabaseClient } from './_supabase'

interface SupabaseCustomerRow {
	id: string
	company_name: string
	contact_name: string
	phone: string
	email: string | null
	status: Customer['status']
	tier: Customer['tier'] | null
	credit_limit: number | null
	assigned_sales_rep_id: string | null
	created_at: string
	customer_addresses:
		| {
				street: string
				area: string | null
				city: string
				governorate: string
				is_default: boolean
		  }[]
		| null
}

interface SupabaseCustomerOrderRow {
	id: string
	customer_id: string
	total_amount: number | null
}

interface SupabaseCustomerPaymentRow {
	order_id: string
	amount: number | null
}

function formatAddress(
	addresses: SupabaseCustomerRow['customer_addresses'],
): string {
	const address =
		addresses?.find((candidate) => candidate.is_default) ?? addresses?.[0]
	if (!address) return ''
	return [address.street, address.area, address.city, address.governorate]
		.filter((part): part is string => Boolean(part?.trim()))
		.join(', ')
}

function projectSupabaseCustomer(
	row: SupabaseCustomerRow,
	exposure: number,
): Customer {
	return {
		id: row.id,
		companyName: row.company_name,
		tier: row.tier ?? 'new',
		status: row.status,
		contactName: row.contact_name,
		phone: row.phone,
		email: row.email,
		address: formatAddress(row.customer_addresses),
		creditLimit: Number(row.credit_limit ?? 0),
		currentExposure: exposure,
		assignedSalesRep: row.assigned_sales_rep_id,
		createdAt: row.created_at,
	}
}

async function exposureByCustomer(
	auth: Awaited<ReturnType<typeof getInternalSupabaseClient>>,
	customerIds: string[],
): Promise<Map<string, number>> {
	const result = new Map<string, number>()
	if (customerIds.length === 0) return result

	const { data: orderRows, error: orderError } = await auth.client
		.from('orders')
		.select('id, customer_id, total_amount')
		.in('customer_id', customerIds)
	if (orderError) throw new Error(orderError.message)
	const orders = (orderRows ?? []) as SupabaseCustomerOrderRow[]
	const orderIds = orders.map((order) => order.id)
	const paidByOrder = new Map<string, number>()

	if (orderIds.length > 0) {
		const { data: paymentRows, error: paymentError } = await auth.client
			.from('customer_payments')
			.select('order_id, amount')
			.in('order_id', orderIds)
			.eq('status', 'recorded')
		if (paymentError) throw new Error(paymentError.message)
		for (const payment of (paymentRows ?? []) as SupabaseCustomerPaymentRow[]) {
			paidByOrder.set(
				payment.order_id,
				(paidByOrder.get(payment.order_id) ?? 0) + Number(payment.amount ?? 0),
			)
		}
	}

	for (const order of orders) {
		const total = Number(order.total_amount ?? 0)
		const paid = paidByOrder.get(order.id) ?? 0
		result.set(
			order.customer_id,
			(result.get(order.customer_id) ?? 0) + total - paid,
		)
	}
	return result
}

function normalizePhone(value: string): string {
	return value.replace(/\s+/g, '')
}

function normalizeCustomerSearch(value: string | undefined): string {
	return (value ?? '')
		.trim()
		.replace(/[%*,()]/g, ' ')
		.replace(/\s+/g, ' ')
		.slice(0, 80)
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
		const auth = await getInternalSupabaseClient()
		const search = normalizeCustomerSearch(data.search)
		let query = auth.client
			.from('customers')
			.select(`
					id,
					company_name,
					contact_name,
					phone,
					email,
					status,
					tier,
					credit_limit,
					assigned_sales_rep_id,
					created_at,
					customer_addresses (
						street,
						area,
						city,
						governorate,
						is_default
					)
				`)
			.order('created_at', { ascending: false })
			.limit(Math.min(Math.max(data.limit, 1), 500))
		if (search) {
			const pattern = `%${search}%`
			query = query.or(
				[
					`company_name.ilike.${pattern}`,
					`contact_name.ilike.${pattern}`,
					`phone.ilike.${pattern}`,
					`email.ilike.${pattern}`,
				].join(','),
			)
		}
		const { data: rows, error } = await query
		if (error) throw new Error(error.message)

		const customerRows = (rows ?? []) as unknown as SupabaseCustomerRow[]
		const exposure = await exposureByCustomer(
			auth,
			customerRows.map((row) => row.id),
		)
		let customers = customerRows.map((row) =>
			projectSupabaseCustomer(row, exposure.get(row.id) ?? 0),
		)
		if (search) {
			const q = search.toLowerCase()
			customers = customers.filter(
				(c) =>
					c.companyName.toLowerCase().includes(q) ||
					c.contactName.toLowerCase().includes(q) ||
					c.phone.includes(q),
			)
		}
		if (data.segment)
			customers = customers.filter((c) => c.tier === data.segment)
		const start = (data.page - 1) * data.limit
		return {
			customers: customers.slice(start, start + data.limit),
			total: customers.length,
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
		const auth = await getInternalSupabaseClient()
		const phone = normalizePhone(data.phone)
		const { data: existingByPhone, error: phoneError } = await auth.client
			.from('customers')
			.select('id, status')
			.eq('phone', phone)
			.maybeSingle()
		if (phoneError) throw new Error(phoneError.message)
		if (existingByPhone) {
			return {
				customerId: existingByPhone.id,
				status: existingByPhone.status as Customer['status'],
				warning: 'duplicate_match' as const,
			}
		}

		const { data: existingByCompany, error: companyError } = await auth.client
			.from('customers')
			.select('id, status')
			.eq('company_name', data.companyName)
			.maybeSingle()
		if (companyError) throw new Error(companyError.message)
		if (existingByCompany) {
			return {
				customerId: existingByCompany.id,
				status: existingByCompany.status as Customer['status'],
				warning: 'duplicate_match' as const,
			}
		}

		const { data: employeeId, error: employeeError } = await auth.client.rpc(
			'current_employee_id',
		)
		if (employeeError) throw new Error(employeeError.message)

		const { data: customer, error: insertError } = await auth.client
			.from('customers')
			.insert({
				phone,
				company_name: data.companyName,
				contact_name: data.contactName,
				created_by_employee_id:
					typeof employeeId === 'string' ? employeeId : null,
				email: data.email ?? null,
				status: 'unclaimed',
			})
			.select('id, status')
			.single()
		if (insertError) throw new Error(insertError.message)

		if (data.deliveryAddress && data.city) {
			const { error: addressError } = await auth.client
				.from('customer_addresses')
				.insert({
					customer_id: customer.id,
					street: data.deliveryAddress,
					city: data.city,
					governorate: data.city,
					is_default: true,
				})
			if (addressError) throw new Error(addressError.message)
		}

		return {
			customerId: customer.id,
			status: customer.status as Customer['status'],
			warning: 'new_customer_no_credit' as const,
		}
	})
