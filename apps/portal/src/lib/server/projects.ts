import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getAuthenticatedPortalCustomer } from './_supabase'

export interface CustomerProjectWorkspace {
	archived: boolean
	createdAt: string
	description: string | null
	draftCount: number
	id: string
	lastActivityAt: string
	name: string
	orderCount: number
	requestCount: number
}

export interface RecentDeliveryLocation {
	area: string
	city: string
	governorate: string
	id: string
	lastUsedAt: string
	latitude: number
	locationName: string
	locationNameAr: string
	longitude: number
	street: string
	useCount: number
}

interface ProjectRow {
	archived: boolean
	created_at: string
	description: string | null
	id: string
	last_activity_at: string
	name: string
}

interface ProjectRequestRow {
	id: string
	project_id: string | null
	status: string
	orders: { id: string }[] | { id: string } | null
}

function relationCount(value: ProjectRequestRow['orders']): number {
	if (Array.isArray(value)) return value.length
	return value ? 1 : 0
}

export const getCustomerProjects = createServerFn({ method: 'GET' }).handler(
	async (): Promise<CustomerProjectWorkspace[]> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const [projectsResult, requestsResult] = await Promise.all([
			supabase
				.from('projects')
				.select('id, name, description, archived, created_at, last_activity_at')
				.eq('customer_id', customerId)
				.eq('archived', false)
				.order('last_activity_at', { ascending: false }),
			supabase
				.from('quote_requests')
				.select('id, project_id, status, orders(id)')
				.eq('customer_id', customerId)
				.not('project_id', 'is', null),
		])

		if (projectsResult.error) throw new Error(projectsResult.error.message)
		if (requestsResult.error) throw new Error(requestsResult.error.message)

		const requests = (requestsResult.data ?? []) as ProjectRequestRow[]
		return ((projectsResult.data ?? []) as ProjectRow[]).map((project) => {
			const members = requests.filter(
				(request) => request.project_id === project.id,
			)
			return {
				archived: project.archived,
				createdAt: project.created_at,
				description: project.description,
				draftCount: members.filter(
					(request) => request.status === 'draft' || request.status === 'saved',
				).length,
				id: project.id,
				lastActivityAt: project.last_activity_at,
				name: project.name,
				orderCount: members.reduce(
					(total, request) => total + relationCount(request.orders),
					0,
				),
				requestCount: members.filter(
					(request) =>
						request.status !== 'draft' &&
						request.status !== 'saved' &&
						relationCount(request.orders) === 0,
				).length,
			}
		})
	},
)

export const createCustomerProject = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			description: z.string().trim().max(1000).optional(),
			name: z.string().trim().min(2).max(120),
		}),
	)
	.handler(async ({ data }): Promise<{ project: CustomerProjectWorkspace }> => {
		const { customerId, supabase } = await getAuthenticatedPortalCustomer()
		const { data: project, error } = await supabase
			.from('projects')
			.insert({
				customer_id: customerId,
				description: data.description || null,
				name: data.name,
			})
			.select('id, name, description, archived, created_at, last_activity_at')
			.single()
		if (error || !project) {
			throw new Error(error?.message ?? 'Failed to create project')
		}
		return {
			project: {
				archived: project.archived,
				createdAt: project.created_at,
				description: project.description,
				draftCount: 0,
				id: project.id,
				lastActivityAt: project.last_activity_at,
				name: project.name,
				orderCount: 0,
				requestCount: 0,
			},
		}
	})

export const getRecentDeliveryLocations = createServerFn({
	method: 'GET',
}).handler(async (): Promise<RecentDeliveryLocation[]> => {
	const { customerId, supabase } = await getAuthenticatedPortalCustomer()
	const { data, error } = await supabase
		.from('customer_addresses')
		.select(
			'id, street, area, city, governorate, latitude, longitude, location_name, location_name_ar, last_used_at, use_count',
		)
		.eq('customer_id', customerId)
		.eq('source', 'quote_submission')
		.not('latitude', 'is', null)
		.not('longitude', 'is', null)
		.order('last_used_at', { ascending: false })
		.limit(8)
	if (error) throw new Error(error.message)

	return (data ?? []).flatMap((location) => {
		if (
			location.latitude === null ||
			location.longitude === null ||
			!location.location_name ||
			!location.location_name_ar ||
			!location.last_used_at
		) {
			return []
		}
		return [
			{
				area: location.area ?? '',
				city: location.city,
				governorate: location.governorate,
				id: location.id,
				lastUsedAt: location.last_used_at,
				latitude: Number(location.latitude),
				locationName: location.location_name,
				locationNameAr: location.location_name_ar,
				longitude: Number(location.longitude),
				street: location.street,
				useCount: location.use_count,
			},
		]
	})
})

export const getCustomerQuoteProject = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ quoteRequestId: z.string().uuid().nullable() }))
	.handler(
		async ({ data }): Promise<{ projectId: string | null | undefined }> => {
			if (!data.quoteRequestId) return { projectId: undefined }
			const { customerId, supabase } = await getAuthenticatedPortalCustomer()
			const { data: request, error } = await supabase
				.from('quote_requests')
				.select('project_id')
				.eq('id', data.quoteRequestId)
				.eq('customer_id', customerId)
				.maybeSingle()
			if (error) throw new Error(error.message)
			return { projectId: request?.project_id ?? null }
		},
	)

export const setCustomerOrderProject = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			projectId: z.string().uuid().nullable(),
			quoteRequestId: z.string().uuid(),
		}),
	)
	.handler(async ({ data }): Promise<{ success: true }> => {
		const { supabase } = await getAuthenticatedPortalCustomer()
		const { error } = await supabase.rpc('customer_set_quote_request_project', {
			p_project_id: data.projectId,
			p_quote_request_id: data.quoteRequestId,
		})
		if (error) throw new Error(error.message)
		return { success: true }
	})
