/**
 * Settings server functions backed only by Supabase.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	ActiveSession,
	Address,
	CustomerProfile,
	Project,
} from '../../types/settings'
import {
	getAuthenticatedPortalCustomer,
	getAuthenticatedSupabase,
} from './_supabase'
import { resolveAddressCoordinates } from './address-coordinates'

export const getCustomerProfile = createServerFn().handler(
	async (): Promise<CustomerProfile> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { data, error } = await supabase
			.from('customers')
			.select(
				'id, company_name, contact_name, phone, email, status, tier, credit_limit, payment_history, trade_license_status, profile_photo_url, created_at, updated_at',
			)
			.eq('id', customerId)
			.single()

		if (error || !data) {
			throw new Error(error?.message ?? 'Profile not found')
		}

		return {
			id: data.id,
			companyName: data.company_name,
			contactName: data.contact_name,
			phone: data.phone,
			email: data.email,
			status: data.status,
			tier: data.tier,
			creditLimit: data.credit_limit,
			paymentHistory: data.payment_history,
			tradeLicenseStatus: data.trade_license_status ?? 'not_uploaded',
			profilePhotoUrl: data.profile_photo_url,
			createdAt: data.created_at,
			updatedAt: data.updated_at,
		}
	},
)

export const updateCustomerProfile = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			companyName: z.string().trim().min(1).max(200).optional(),
			email: z
				.union([z.string().trim().email().max(254), z.literal('')])
				.optional(),
		}),
	)
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const updateData: Record<string, unknown> = {}
		if (input.companyName !== undefined)
			updateData.company_name = input.companyName
		if (input.email !== undefined) updateData.email = input.email || null

		const { error } = await supabase
			.from('customers')
			.update(updateData)
			.eq('id', customerId)

		if (error) throw new Error(error.message)
		return { success: true }
	})

export const uploadTradeLicense = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ fileUrl: z.string() }))
	.handler(async (): Promise<{ success: boolean; status: 'under_review' }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { error } = await supabase
			.from('customers')
			.update({ trade_license_status: 'under_review' })
			.eq('id', customerId)

		if (error) throw new Error(error.message)
		return { success: true, status: 'under_review' }
	})

export const uploadProfilePhoto = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ fileUrl: z.string() }))
	.handler(
		async ({
			data: input,
		}): Promise<{ success: boolean; photoUrl: string }> => {
			const { customerId, supabase } = await getAuthenticatedPortalCustomer()
			const { error } = await supabase
				.from('customers')
				.update({ profile_photo_url: input.fileUrl })
				.eq('id', customerId)

			if (error) throw new Error(error.message)
			return { success: true, photoUrl: input.fileUrl }
		},
	)

export const getAddresses = createServerFn().handler(
	async (): Promise<Address[]> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { data, error } = await supabase
			.from('customer_addresses')
			.select(
				'id, label, street, city, governorate, is_default, postal_code, latitude, longitude',
			)
			.eq('customer_id', customerId)
			.order('is_default', { ascending: false })
			.order('created_at', { ascending: false })

		if (error) throw new Error(error.message)

		return (data ?? []).map((address) => ({
			id: address.id,
			label: address.label ?? '',
			street: address.street,
			city: address.city,
			governorate: address.governorate,
			isDefault: address.is_default,
			latitude: address.latitude === null ? null : Number(address.latitude),
			longitude: address.longitude === null ? null : Number(address.longitude),
			postalCode: address.postal_code,
		}))
	},
)

export const saveAddress = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			id: z.string().optional(),
			label: z.string().min(1),
			street: z.string().min(1),
			city: z.string().min(1),
			governorate: z.string().min(1),
			isDefault: z.boolean().optional(),
		}),
	)
	.handler(async ({ data: input }): Promise<{ address: Address }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const coordinates = await resolveAddressCoordinates({
			city: input.city,
			governorate: input.governorate,
			street: input.street,
		})
		const payload: Record<string, unknown> = {
			customer_id: customerId,
			label: input.label,
			street: input.street,
			city: input.city,
			governorate: input.governorate,
			is_default: input.isDefault ?? false,
		}
		if (coordinates.latitude !== null && coordinates.longitude !== null) {
			payload.latitude = coordinates.latitude
			payload.longitude = coordinates.longitude
		}

		const query = input.id
			? supabase
					.from('customer_addresses')
					.update(payload)
					.eq('id', input.id)
					.eq('customer_id', customerId)
					.select(
						'id, label, street, city, governorate, is_default, postal_code, latitude, longitude',
					)
					.single()
			: supabase
					.from('customer_addresses')
					.insert(payload)
					.select(
						'id, label, street, city, governorate, is_default, postal_code, latitude, longitude',
					)
					.single()

		const { data, error } = await query
		if (error || !data)
			throw new Error(error?.message ?? 'Failed to save address')

		return {
			address: {
				id: data.id,
				label: data.label ?? '',
				street: data.street,
				city: data.city,
				governorate: data.governorate,
				isDefault: data.is_default,
				latitude: data.latitude === null ? null : Number(data.latitude),
				longitude: data.longitude === null ? null : Number(data.longitude),
				postalCode: data.postal_code,
			},
		}
	})

export const deleteAddress = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ addressId: z.string() }))
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { error } = await supabase
			.from('customer_addresses')
			.delete()
			.eq('id', input.addressId)
			.eq('customer_id', customerId)

		if (error) throw new Error(error.message)
		return { success: true }
	})

export const getProjects = createServerFn().handler(
	async (): Promise<Project[]> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { data, error } = await supabase
			.from('projects')
			.select('id, name, description, order_count, created_at, archived')
			.eq('customer_id', customerId)
			.eq('archived', false)
			.order('created_at', { ascending: false })

		if (error) throw new Error(error.message)

		return (data ?? []).map((project) => ({
			id: project.id,
			name: project.name,
			description: project.description,
			orderCount: project.order_count ?? 0,
			createdAt: project.created_at,
			archived: project.archived ?? false,
		}))
	},
)

export const saveProject = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			id: z.string().optional(),
			name: z.string().min(1),
			description: z.string().optional(),
		}),
	)
	.handler(async ({ data: input }): Promise<{ project: Project }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const payload = {
			customer_id: customerId,
			name: input.name,
			description: input.description ?? null,
		}

		const query = input.id
			? supabase
					.from('projects')
					.update(payload)
					.eq('id', input.id)
					.eq('customer_id', customerId)
					.select('id, name, description, order_count, created_at, archived')
					.single()
			: supabase
					.from('projects')
					.insert(payload)
					.select('id, name, description, order_count, created_at, archived')
					.single()

		const { data, error } = await query
		if (error || !data)
			throw new Error(error?.message ?? 'Failed to save project')

		return {
			project: {
				id: data.id,
				name: data.name,
				description: data.description,
				orderCount: data.order_count ?? 0,
				createdAt: data.created_at,
				archived: data.archived ?? false,
			},
		}
	})

export const archiveProject = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ projectId: z.string() }))
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { error } = await supabase
			.from('projects')
			.update({ archived: true })
			.eq('id', input.projectId)
			.eq('customer_id', customerId)

		if (error) throw new Error(error.message)
		return { success: true }
	})

export const updateNotificationPreferences = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			preferences: z.array(
				z.object({
					channel: z.enum(['whatsapp', 'email', 'push', 'sms']),
					event: z.enum([
						'quote_ready',
						'order_status',
						'delivery_update',
						'invoice_generated',
						'payment_confirmation',
						'support_response',
					]),
					enabled: z.boolean(),
				}),
			),
		}),
	)
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const byChannel = new Map<string, boolean>()
		for (const preference of input.preferences) {
			byChannel.set(preference.channel, preference.enabled)
		}
		const payload = Array.from(byChannel, ([channel, enabled]) => ({
			customer_id: customerId,
			channel,
			enabled,
		}))

		if (payload.length > 0) {
			const { error } = await supabase
				.from('notification_preferences')
				.upsert(payload, { onConflict: 'customer_id,channel' })
			if (error) throw new Error(error.message)
		}

		return { success: true }
	})

export const getActiveSessions = createServerFn().handler(
	async (): Promise<ActiveSession[]> => {
		const { session, supabase } = await getAuthenticatedSupabase()
		const { data, error } = await supabase
			.from('user_sessions')
			.select('id, device, last_active, location, is_current')
			.eq('user_id', session.user.id)
			.order('last_active', { ascending: false })

		if (error) throw new Error(error.message)

		return (data ?? []).map((session) => ({
			id: session.id,
			device: session.device ?? 'Unknown device',
			lastActive: session.last_active,
			location: session.location ?? '',
			isCurrent: session.is_current,
		}))
	},
)

export const signOutSession = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ sessionId: z.string() }))
	.handler(async ({ data: input }): Promise<{ success: boolean }> => {
		const { session, supabase } = await getAuthenticatedSupabase()
		const { error } = await supabase
			.from('user_sessions')
			.delete()
			.eq('id', input.sessionId)
			.eq('user_id', session.user.id)

		if (error) throw new Error(error.message)
		return { success: true }
	})
