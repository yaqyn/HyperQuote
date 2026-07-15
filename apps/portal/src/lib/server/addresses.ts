/**
 * Customer addresses and projects server functions.
 * CRUD operations scoped to authenticated customer.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedPortalCustomer } from './_supabase'
import { resolveAddressCoordinates } from './address-coordinates'

// ============================================================================
// Schemas
// ============================================================================

const createAddressInput = z
	.object({
		label: z.string().optional(),
		street: z.string().min(1),
		area: z.string().min(1),
		city: z.string().min(1),
		governorate: z.string().min(1),
		landmark: z.string().optional(),
		phone: z.string().optional(),
		isDefault: z.boolean().optional(),
		latitude: z.number().min(21.7).max(31.8).optional(),
		longitude: z.number().min(24.6).max(36.9).optional(),
	})
	.refine(
		(input) =>
			(input.latitude === undefined) === (input.longitude === undefined),
		{ message: 'Latitude and longitude must be provided together' },
	)

// ============================================================================
// Types
// ============================================================================

export interface CustomerAddress {
	id: string
	label: string | null
	street: string
	area: string
	city: string
	governorate: string
	landmark: string | null
	phone: string | null
	isDefault: boolean
	latitude: number | null
	longitude: number | null
}

export function toCustomerAddress(row: {
	area: string | null
	city: string
	governorate: string
	id: string
	is_default: boolean
	label: string | null
	landmark: string | null
	latitude: number | null
	longitude: number | null
	phone: string | null
	street: string
}): CustomerAddress {
	return {
		area: row.area ?? '',
		city: row.city,
		governorate: row.governorate,
		id: row.id,
		isDefault: row.is_default,
		label: row.label,
		landmark: row.landmark,
		latitude: row.latitude === null ? null : Number(row.latitude),
		longitude: row.longitude === null ? null : Number(row.longitude),
		phone: row.phone,
		street: row.street,
	}
}

// ============================================================================
// getCustomerAddresses
// ============================================================================

export const getCustomerAddresses = createServerFn().handler(
	async (): Promise<CustomerAddress[]> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()

		const { data, error } = await supabase
			.from('customer_addresses')
			.select(
				'id, label, street, area, city, governorate, landmark, phone, is_default, latitude, longitude',
			)
			.eq('customer_id', customerId)
			.order('is_default', { ascending: false })
			.order('created_at', { ascending: false })

		if (error) throw new Error(error.message)

		return (data ?? []).map(toCustomerAddress)
	},
)

// ============================================================================
// createAddress
// ============================================================================

export const createAddress = createServerFn({ method: 'POST' })
	.inputValidator(createAddressInput)
	.handler(async ({ data: input }): Promise<CustomerAddress> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const coordinates =
			input.latitude !== undefined && input.longitude !== undefined
				? { latitude: input.latitude, longitude: input.longitude }
				: await resolveAddressCoordinates({
						area: input.area,
						city: input.city,
						governorate: input.governorate,
						street: input.street,
					})

		const { data, error } = await supabase
			.from('customer_addresses')
			.insert({
				customer_id: customerId,
				label: input.label ?? null,
				street: input.street,
				area: input.area,
				city: input.city,
				governorate: input.governorate,
				landmark: input.landmark ?? null,
				phone: input.phone ?? null,
				is_default: input.isDefault ?? false,
				latitude: coordinates.latitude,
				longitude: coordinates.longitude,
			})
			.select(
				'id, label, street, area, city, governorate, landmark, phone, is_default, latitude, longitude',
			)
			.single()

		if (error || !data) {
			throw new Error(error?.message ?? 'Failed to create address')
		}

		return toCustomerAddress(data)
	})
