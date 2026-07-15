import type {
	QuoteProjectSummary,
	QuoteRecentLocation,
} from '@hyperquote/quote-cart/checkout'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	appendWebsiteAuthCookies,
	getAuthenticatedWebsiteCustomer,
} from './customer-auth-context'

interface ProjectRequestRow {
	project_id: string | null
	status: string
	orders: { id: string }[] | { id: string } | null
}

function relationCount(value: ProjectRequestRow['orders']): number {
	if (Array.isArray(value)) return value.length
	return value ? 1 : 0
}

export const getWebsiteQuoteWorkspace = createServerFn({
	method: 'GET',
}).handler(
	async (): Promise<{
		projects: QuoteProjectSummary[]
		recentLocations: QuoteRecentLocation[]
	}> => {
		const auth = await getAuthenticatedWebsiteCustomer()
		if ('error' in auth) throw new Error('Customer session required')

		const [projectsResult, requestsResult, locationsResult] = await Promise.all(
			[
				auth.client
					.from('projects')
					.select('id, name, description, last_activity_at')
					.eq('customer_id', auth.customerId)
					.eq('archived', false)
					.order('last_activity_at', { ascending: false }),
				auth.client
					.from('quote_requests')
					.select('project_id, status, orders(id)')
					.eq('customer_id', auth.customerId)
					.not('project_id', 'is', null),
				auth.client
					.from('customer_addresses')
					.select(
						'id, street, area, city, governorate, latitude, longitude, location_name, location_name_ar, last_used_at, use_count',
					)
					.eq('customer_id', auth.customerId)
					.eq('source', 'quote_submission')
					.not('latitude', 'is', null)
					.not('longitude', 'is', null)
					.order('last_used_at', { ascending: false })
					.limit(8),
			],
		)
		if (projectsResult.error) throw projectsResult.error
		if (requestsResult.error) throw requestsResult.error
		if (locationsResult.error) throw locationsResult.error

		const requests = (requestsResult.data ?? []) as ProjectRequestRow[]
		const projects = (projectsResult.data ?? []).map((project) => {
			const members = requests.filter(
				(request) => request.project_id === project.id,
			)
			return {
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
		const recentLocations = (locationsResult.data ?? []).flatMap((location) => {
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

		await appendWebsiteAuthCookies(auth)
		return { projects, recentLocations }
	},
)

export const createWebsiteCustomerProject = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			description: z.string().trim().max(1000).optional(),
			name: z.string().trim().min(2).max(120),
		}),
	)
	.handler(async ({ data }): Promise<{ project: QuoteProjectSummary }> => {
		const auth = await getAuthenticatedWebsiteCustomer()
		if ('error' in auth) throw new Error('Customer session required')
		const { data: project, error } = await auth.client
			.from('projects')
			.insert({
				customer_id: auth.customerId,
				description: data.description || null,
				name: data.name,
			})
			.select('id, name, description, last_activity_at')
			.single()
		if (error || !project) throw error ?? new Error('Failed to create project')
		await appendWebsiteAuthCookies(auth)
		return {
			project: {
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
