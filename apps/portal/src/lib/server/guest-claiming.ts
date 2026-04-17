import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

/**
 * Returns validated admin credentials or null if service role is not configured.
 * Service-role routes must gate on this rather than using non-null assertions.
 */
function getAdminCredentials(): {
	supabaseUrl: string
	supabaseAnonKey: string
	serviceRoleKey: string
} | null {
	const supabaseUrl = process.env.SUPABASE_URL
	const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
	if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) return null
	return { supabaseUrl, supabaseAnonKey, serviceRoleKey }
}

/**
 * Check if a phone number has an unclaimed customer record.
 * Returns masked name hint for the banner.
 */
export const checkUnclaimedCustomer = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ phone: z.string() }))
	.handler(async ({ data: input }) => {
		const creds = getAdminCredentials()
		if (!creds) {
			// Dev mock: always return an unclaimed customer
			return {
				hasUnclaimed: true,
				maskedHint: 'A**** C****',
				unclaimedCustomerId: 'CUST-001',
			}
		}

		const { createClient } = await import('@supabase/supabase-js')
		const supabase = createClient(creds.supabaseUrl, creds.serviceRoleKey)

		const { data, error } = await supabase
			.from('customers')
			.select('id, contact_name')
			.eq('phone', input.phone)
			.is('auth_user_id', null)
			.limit(1)
			.single()

		if (error || !data) {
			return { hasUnclaimed: false }
		}

		// Mask the name: "Ahmed Contractor" -> "A**** C****"
		const maskedHint = data.contact_name
			.split(' ')
			.map((word: string) => `${word[0]}****`)
			.join(' ')

		return {
			hasUnclaimed: true,
			maskedHint,
			unclaimedCustomerId: data.id,
		}
	})

/**
 * Claim a customer account by linking auth_user_id.
 * Uses WHERE auth_user_id IS NULL to prevent race conditions (Pitfall 8).
 */
export const claimCustomerAccount = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ customerId: z.string() }))
	.handler(async ({ data: input }) => {
		const creds = getAdminCredentials()
		if (!creds) {
			// Dev mock
			return { success: true, orderCount: 5 }
		}

		const { createClient } = await import('@supabase/supabase-js')
		const { getRequest } = await import('@tanstack/react-start/server')
		const request = getRequest()

		// Get current user from cookie-based auth
		const supabaseAnon = createClient(
			creds.supabaseUrl,
			creds.supabaseAnonKey,
			{
				global: {
					headers: { cookie: request.headers.get('cookie') || '' },
				},
			},
		)
		const {
			data: { user },
		} = await supabaseAnon.auth.getUser()
		if (!user) {
			return { success: false, orderCount: 0 }
		}

		// Use service role for the UPDATE (bypasses RLS)
		const supabaseAdmin = createClient(creds.supabaseUrl, creds.serviceRoleKey)

		// Race condition guard: WHERE auth_user_id IS NULL prevents double-claiming
		const { data, error } = await supabaseAdmin
			.from('customers')
			.update({ auth_user_id: user.id })
			.eq('id', input.customerId)
			.is('auth_user_id', null)
			.select('id')

		if (error || !data || data.length === 0) {
			return { success: false, orderCount: 0 }
		}

		// Count orders for this customer
		const { count } = await supabaseAdmin
			.from('orders')
			.select('id', { count: 'exact', head: true })
			.eq('customer_id', input.customerId)

		return { success: true, orderCount: count || 0 }
	})
