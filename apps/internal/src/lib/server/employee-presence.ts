import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getInternalSupabaseClient } from './_supabase'

const employeePresenceInput = z.object({
	activePanel: z
		.enum([
			'sales',
			'inventory',
			'warehouse',
			'finance',
			'dispatch',
			'customer_service',
			'admin',
			'search',
		])
		.optional(),
	status: z.enum(['online', 'away', 'offline']),
})

export const setEmployeePresence = createServerFn({ method: 'POST' })
	.inputValidator(employeePresenceInput)
	.handler(async ({ data }) => {
		const auth = await getInternalSupabaseClient({ activeEmployeeOnly: true })
		const { data: presence, error } = await auth.client.rpc(
			'set_employee_presence',
			{
				p_active_panel: data.activePanel ?? null,
				p_status: data.status,
			},
		)
		if (error) throw new Error(error.message)
		return {
			activePanel: presence?.active_panel ?? null,
			lastSeenAt: presence?.last_seen_at ?? null,
			status: presence?.status ?? data.status,
		}
	})
