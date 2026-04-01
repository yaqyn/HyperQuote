/**
 * Referral program server functions.
 * Get referral stats and generate referral link.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { getServerSession } from '@hyperquote/auth'
import type { ReferralStats } from '../../types/settings'

// ============================================================================
// Helper
// ============================================================================

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_ANON_KEY !== 'placeholder'
  )
}

async function getAuthenticatedClient() {
  const session = await getServerSession({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  })

  if (!session) throw new Error('Unauthorized')

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      },
    },
  )

  return { supabase, session }
}

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

    const { supabase, session } = await getAuthenticatedClient()

    const customerId = session.user.app_metadata?.customer_id

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
      referrals?.[0]?.referral_code ?? `HQ-REF-${customerId?.slice(0, 5).toUpperCase()}`

    return {
      totalReferrals,
      pendingCredits,
      earnedCredits,
      referralCode,
      referralLink: `https://portal.hyperquote.net/signup?ref=${referralCode}`,
    }
  },
)

// ============================================================================
// generateReferralLink
// ============================================================================

export const generateReferralLink = createServerFn().handler(
  async (): Promise<{ referralCode: string; referralLink: string }> => {
    if (!isSupabaseConfigured()) {
      return {
        referralCode: 'HQ-REF-A1234',
        referralLink: 'https://portal.hyperquote.net/signup?ref=HQ-REF-A1234',
      }
    }

    const { supabase, session } = await getAuthenticatedClient()

    const customerId = session.user.app_metadata?.customer_id
    const referralCode = `HQ-REF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

    // Upsert referral code for customer
    const { error } = await supabase.from('referral_codes').upsert({
      customer_id: customerId,
      code: referralCode,
    })

    if (error) throw new Error(error.message)

    return {
      referralCode,
      referralLink: `https://portal.hyperquote.net/signup?ref=${referralCode}`,
    }
  },
)
