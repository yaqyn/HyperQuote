import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createSupabaseServerClient } from '@hyperquote/auth/server'
import { getServerSession } from '@hyperquote/auth/session'
import type { AuthSession } from '@hyperquote/auth'
import { getRequest } from '@tanstack/react-start/server'
import {
  checkRateLimit,
  checkOTPVerifyLimit,
  clearRateLimit,
  getKVNamespace,
} from '@hyperquote/auth/rate-limit'

// ============================================================================
// Input Schemas
// ============================================================================

const phoneSchema = z.string().regex(/^(10|11|12|15)\d{8}$/)

const sendOTPInput = z.object({
  phone: phoneSchema,
  method: z.enum(['whatsapp', 'sms']),
})

const verifyOTPInput = z.object({
  phone: phoneSchema,
  code: z.string().length(6).regex(/^\d{6}$/),
})

const createAccountInput = z.object({
  phone: phoneSchema,
  companyName: z.string().min(1).max(200),
  fullName: z.string().min(1).max(100),
})

const claimAccountInput = z.object({
  phone: phoneSchema,
})

// ============================================================================
// Helpers
// ============================================================================

function getSupabaseConfig() {
  return {
    supabaseUrl:
      process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
    cookieDomain: process.env.COOKIE_DOMAIN ?? undefined,
  }
}

function isDevMode(): boolean {
  return (
    !process.env.SUPABASE_URL ||
    process.env.SUPABASE_URL === 'https://placeholder.supabase.co'
  )
}

// ============================================================================
// checkPortalAuth — Used in _portal.tsx beforeLoad
// ============================================================================

export const checkPortalAuth = createServerFn().handler(
  async (): Promise<{
    auth: AuthSession | null
    isInternalUser: boolean
  }> => {
    // Dev mode: bypass auth check so the portal is usable without Supabase
    if (isDevMode()) {
      return {
        auth: {
          session: {} as AuthSession['session'],
          user: {
            id: 'dev-user',
            user_metadata: { name: 'Dev User', company_name: 'Dev Co', roles: ['customer'] },
          } as AuthSession['user'],
          pool: 'external',
          roles: ['customer'],
          tenantId: null,
        },
        isInternalUser: false,
      }
    }

    const session = await getServerSession({
      supabaseUrl:
        process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
    })

    if (!session) {
      return { auth: null, isInternalUser: false }
    }

    // Check pool -- portal requires external pool
    if (session.pool !== 'external') {
      return { auth: null, isInternalUser: true }
    }

    return { auth: session, isInternalUser: false }
  },
)

// ============================================================================
// checkSession — Lightweight session check for login page redirect
// ============================================================================

export const checkSession = createServerFn().handler(async () => {
  const session = await getServerSession({
    supabaseUrl:
      process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
  })
  return { authenticated: !!session }
})

// ============================================================================
// sendOTP — Request OTP via WhatsApp or SMS
// ============================================================================

export const sendOTP = createServerFn()
  .inputValidator(sendOTPInput)
  .handler(async ({ data: input }) => {
    try {
      const kv = await getKVNamespace()

      // Rate limit: 3 attempts per phone per 60 seconds
      const rateResult = await checkRateLimit(kv, {
        key: `sendOTP:${input.phone}`,
        limit: 3,
        windowSeconds: 60,
      })

      if (!rateResult.allowed) {
        return {
          success: false,
          error: 'rate_limited' as const,
          retryAfter: rateResult.retryAfter,
        }
      }

      const config = getSupabaseConfig()
      const request = getRequest()
      const { client } = createSupabaseServerClient({
        request,
        ...config,
      })

      const formattedPhone = `+20${input.phone}`

      // Dev mode: return mock success when Supabase OTP not configured
      if (isDevMode()) {
        console.log(
          `[portal:sendOTP] Dev mode: OTP would be sent to ${formattedPhone} via ${input.method}`,
        )
        return { success: true, expiresIn: 300 }
      }

      const { error } = await client.auth.signInWithOtp({
        phone: formattedPhone,
        options: { channel: input.method },
      })

      if (error) {
        console.error('[portal:sendOTP] Supabase error:', error)
        return { success: false, error: 'send_failed' as const }
      }

      return { success: true, expiresIn: 300 }
    } catch (err) {
      console.error('[portal:sendOTP] Unexpected error:', err)
      return { success: false, error: 'send_failed' as const }
    }
  })

// ============================================================================
// verifyOTP — Verify OTP code and check for existing account
// ============================================================================

export const verifyOTP = createServerFn()
  .inputValidator(verifyOTPInput)
  .handler(async ({ data: input }) => {
    try {
      const kv = await getKVNamespace()

      // Rate limit: 5 attempts per phone per 60s, then 15-minute lockout
      const rateResult = await checkOTPVerifyLimit(kv, input.phone)

      if (!rateResult.allowed) {
        return {
          success: false,
          error: 'rate_limited' as const,
          retryAfter: rateResult.retryAfter,
        }
      }

      const config = getSupabaseConfig()
      const request = getRequest()
      const { client } = createSupabaseServerClient({
        request,
        ...config,
      })

      const formattedPhone = `+20${input.phone}`

      // Dev mode: return mock success
      if (isDevMode()) {
        console.log(
          `[portal:verifyOTP] Dev mode: verifying code ${input.code} for ${formattedPhone}`,
        )
        await clearRateLimit(kv, `verify:${input.phone}`)
        return {
          success: true,
          session: null,
          user: null,
          needsAccount: true,
          claimableCompany: null,
        }
      }

      const { data, error } = await client.auth.verifyOtp({
        phone: formattedPhone,
        token: input.code,
        type: 'sms',
      })

      if (error) {
        console.error('[portal:verifyOTP] Supabase error:', error)
        return { success: false, error: 'invalid_code' as const }
      }

      // Clear rate limit counter on success
      await clearRateLimit(kv, `verify:${input.phone}`)

      // Check if phone matches an existing customer
      const { data: customer } = await client
        .from('customers')
        .select('id, company_name, user_id')
        .eq('phone', formattedPhone)
        .maybeSingle()

      const needsAccount = !customer
      const claimableCompany =
        customer && !customer.user_id ? customer.company_name : null

      return {
        success: true,
        session: data.session,
        user: data.user,
        needsAccount,
        claimableCompany,
      }
    } catch (err) {
      console.error('[portal:verifyOTP] Unexpected error:', err)
      return { success: false, error: 'verify_failed' as const }
    }
  })

// ============================================================================
// createAccount — Create new customer account after OTP verification
// ============================================================================

export const createAccount = createServerFn()
  .inputValidator(createAccountInput)
  .handler(async ({ data: input }) => {
    try {
      const config = getSupabaseConfig()
      const request = getRequest()
      const { client } = createSupabaseServerClient({
        request,
        ...config,
      })

      const formattedPhone = `+20${input.phone}`

      // Dev mode: return mock success
      if (isDevMode()) {
        console.log(
          `[portal:createAccount] Dev mode: creating account for ${formattedPhone}`,
        )
        return {
          success: true,
          customerId: 'mock-customer-id',
          userId: 'mock-user-id',
        }
      }

      // Get current auth user
      const {
        data: { user },
      } = await client.auth.getUser()
      if (!user) {
        return { success: false, error: 'not_authenticated' as const }
      }

      // Insert customer record
      const { data: customer, error } = await client
        .from('customers')
        .insert({
          phone: formattedPhone,
          company_name: input.companyName,
          contact_name: input.fullName,
          user_id: user.id,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[portal:createAccount] Supabase error:', error)
        return { success: false, error: 'create_failed' as const }
      }

      return {
        success: true,
        customerId: customer.id,
        userId: user.id,
      }
    } catch (err) {
      console.error('[portal:createAccount] Unexpected error:', err)
      return { success: false, error: 'create_failed' as const }
    }
  })

// ============================================================================
// claimAccount — Link auth user to existing unclaimed customer
// ============================================================================

export const claimAccount = createServerFn()
  .inputValidator(claimAccountInput)
  .handler(async ({ data: input }) => {
    try {
      const config = getSupabaseConfig()
      const request = getRequest()
      const { client } = createSupabaseServerClient({
        request,
        ...config,
      })

      const formattedPhone = `+20${input.phone}`

      // Dev mode: return mock success
      if (isDevMode()) {
        console.log(
          `[portal:claimAccount] Dev mode: claiming account for ${formattedPhone}`,
        )
        return {
          success: true,
          customerId: 'mock-customer-id',
          claimed: true,
        }
      }

      // Get current auth user
      const {
        data: { user },
      } = await client.auth.getUser()
      if (!user) {
        return { success: false, error: 'not_authenticated' as const }
      }

      // Find and claim the unclaimed customer
      const { data: customer, error } = await client
        .from('customers')
        .update({ user_id: user.id })
        .eq('phone', formattedPhone)
        .is('user_id', null)
        .select('id')
        .single()

      if (error || !customer) {
        console.error('[portal:claimAccount] Supabase error:', error)
        return { success: false, error: 'claim_failed' as const }
      }

      return {
        success: true,
        customerId: customer.id,
        claimed: true,
      }
    } catch (err) {
      console.error('[portal:claimAccount] Unexpected error:', err)
      return { success: false, error: 'claim_failed' as const }
    }
  })

// ============================================================================
// signOut — Clear session and SSO cookie
// ============================================================================

export const signOut = createServerFn().handler(async () => {
  try {
    const config = getSupabaseConfig()
    const request = getRequest()
    const { client } = createSupabaseServerClient({
      request,
      ...config,
    })

    const { error } = await client.auth.signOut()

    if (error) {
      console.error('[portal:signOut] Supabase error:', error)
      return { success: false, error: 'signout_failed' as const }
    }

    return { success: true }
  } catch (err) {
    console.error('[portal:signOut] Unexpected error:', err)
    return { success: false, error: 'signout_failed' as const }
  }
})
