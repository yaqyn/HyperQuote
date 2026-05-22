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

const createAddressInput = z.object({
	label: z.string().optional(),
	street: z.string().min(1),
	area: z.string().min(1),
	city: z.string().min(1),
	governorate: z.string().min(1),
	landmark: z.string().optional(),
	phone: z.string().optional(),
	isDefault: z.boolean().optional(),
})

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

		return (data ?? []).map((a) => ({
			id: a.id,
			label: a.label,
			street: a.street,
			area: a.area,
			city: a.city,
			governorate: a.governorate,
			landmark: a.landmark,
			phone: a.phone,
			isDefault: a.is_default,
			latitude: a.latitude === null ? null : Number(a.latitude),
			longitude: a.longitude === null ? null : Number(a.longitude),
		}))
	},
)

// ============================================================================
// createAddress
// ============================================================================

export const createAddress = createServerFn({ method: 'POST' })
	.inputValidator(createAddressInput)
	.handler(async ({ data: input }): Promise<CustomerAddress> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const coordinates = await resolveAddressCoordinates({
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

		return {
			id: data.id,
			label: data.label,
			street: data.street,
			area: data.area,
			city: data.city,
			governorate: data.governorate,
			landmark: data.landmark,
			phone: data.phone,
			isDefault: data.is_default,
			latitude: data.latitude === null ? null : Number(data.latitude),
			longitude: data.longitude === null ? null : Number(data.longitude),
		}
	})
