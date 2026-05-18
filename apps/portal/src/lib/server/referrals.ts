/**
 * Referral program server functions.
 * Get referral stats and generate referral link.
 * Dev mode fallback when Supabase not configured.
 */

import { createServerFn } from '@tanstack/react-start'
import type { ReferralStats } from '../../types/settings'
import {
	getAuthenticatedPortalCustomer,
	isSupabaseConfigured,
} from './_supabase'

// ============================================================================
// getReferralStats
// ============================================================================

export const getReferralStats = createServerFn().handler(
	async (): Promise<ReferralStats> => {
		if (!isSupabaseConfigured()) {
			return {
				totalReferrals: 3,
				pendingCredits: 500,
				earnedCredits: 1000,
				referralCode: 'HQ-REF-A1234',
				referralLink: 'https://portal.hyperquote.net/signup?ref=HQ-REF-A1234',
			}
		}

		const { customerId, supabase } = await getAuthenticatedPortalCustomer()

		// Get referral stats
		const { data: referrals, error } = await supabase
			.from('referrals')
			.select('status, credit_amount, referral_code')
			.eq('referrer_id', customerId)

		if (error) throw new Error(error.message)

		const totalReferrals = referrals?.length ?? 0
		const pendingCredits = (referrals ?? [])
			.filter((r) => r.status === 'pending' || r.status === 'qualified')
			.reduce((sum, r) => sum + (r.credit_amount ?? 0), 0)
		const earnedCredits = (referrals ?? [])
			.filter((r) => r.status === 'credited')
			.reduce((sum, r) => sum + (r.credit_amount ?? 0), 0)

		const referralCode =
			referrals?.[0]?.referral_code ??
			`HQ-REF-${customerId?.slice(0, 5).toUpperCase()}`

		return {
			totalReferrals,
			pendingCredits,
			earnedCredits,
			referralCode,
			referralLink: `https://portal.hyperquote.net/signup?ref=${referralCode}`,
		}
	},
)
