/**
 * Team management server functions.
 * Multi-user team with email + magic link invitation flow.
 * Owner-only: invite, remove, change role, transfer ownership.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getServerSession } from '@hyperquote/auth'
import type { TeamMember } from '../../types/settings'

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
// Mock data
// ============================================================================

function getMockTeamMembers(): TeamMember[] {
  return [
    {
      id: 'member-1',
      name: 'Ahmed Hassan',
      email: 'ahmed@example.com',
      phone: '+201234567890',
      role: 'approver',
      isOwner: true,
      joinedAt: '2025-06-15T10:00:00Z',
    },
    {
      id: 'member-2',
      name: 'Sara Mohamed',
      email: 'sara@example.com',
      phone: '+201098765432',
      role: 'buyer',
      isOwner: false,
      joinedAt: '2025-09-20T14:30:00Z',
    },
    {
      id: 'member-3',
      name: 'Karim Ali',
      email: 'karim@example.com',
      phone: undefined,
      role: 'site_manager',
      isOwner: false,
      joinedAt: '2026-01-10T09:00:00Z',
    },
  ]
}

// ============================================================================
// getTeamMembers
// ============================================================================

export const getTeamMembers = createServerFn().handler(
  async (): Promise<TeamMember[]> => {
    if (!isSupabaseConfigured()) {
      return getMockTeamMembers()
    }

    const { supabase } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('team_members')
      .select('id, name, email, phone, role, is_owner, joined_at')
      .order('is_owner', { ascending: false })
      .order('joined_at', { ascending: true })

    if (error) throw new Error(error.message)

    return (data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      role: m.role,
      isOwner: m.is_owner,
      joinedAt: m.joined_at,
    }))
  },
)

// ============================================================================
// inviteTeamMember — email + magic link flow per CONTEXT.md Section 2.17
// ============================================================================

export const inviteTeamMember = createServerFn()
  .inputValidator(
    z.object({
      email: z.string().email(),
      role: z.enum(['buyer', 'approver', 'site_manager']),
    }),
  )
  .handler(
    async ({ data: input }): Promise<{ inviteId: string }> => {
      if (!isSupabaseConfigured()) {
        return { inviteId: crypto.randomUUID() }
      }

      const { supabase, session } = await getAuthenticatedClient()

      // Create invite record and send magic link to email
      const { data, error } = await supabase
        .from('team_invites')
        .insert({
          customer_id: session.user.app_metadata?.customer_id,
          email: input.email,
          role: input.role,
          invited_by: session.user.id,
          token: crypto.randomUUID(),
        })
        .select('id')
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Failed to create invite')
      }

      // In production: send magic link email to portal.hyperquote.net/join?token={uuid}

      return { inviteId: data.id }
    },
  )

// ============================================================================
// removeTeamMember
// ============================================================================

export const removeTeamMember = createServerFn()
  .inputValidator(z.object({ memberId: z.string() }))
  .handler(async ({ data: input }): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    const { supabase } = await getAuthenticatedClient()

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', input.memberId)

    if (error) throw new Error(error.message)

    return { success: true }
  })

// ============================================================================
// changeTeamMemberRole
// ============================================================================

export const changeTeamMemberRole = createServerFn()
  .inputValidator(
    z.object({
      memberId: z.string(),
      newRole: z.enum(['buyer', 'approver', 'site_manager']),
    }),
  )
  .handler(async ({ data: input }): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    const { supabase } = await getAuthenticatedClient()

    const { error } = await supabase
      .from('team_members')
      .update({ role: input.newRole })
      .eq('id', input.memberId)

    if (error) throw new Error(error.message)

    return { success: true }
  })

// ============================================================================
// transferOwnership — requires OTP confirmation
// ============================================================================

export const transferOwnership = createServerFn()
  .inputValidator(
    z.object({
      memberId: z.string(),
      otpCode: z.string().min(6).max(6),
    }),
  )
  .handler(async ({ data: input }): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    const { supabase, session } = await getAuthenticatedClient()

    // Verify OTP before proceeding
    const { error: otpError } = await supabase.auth.verifyOtp({
      phone: session.user.phone ?? '',
      token: input.otpCode,
      type: 'sms',
    })

    if (otpError) throw new Error('Invalid OTP code')

    // Transfer ownership
    const { error } = await supabase.rpc('transfer_team_ownership', {
      current_owner_id: session.user.id,
      new_owner_id: input.memberId,
    })

    if (error) throw new Error(error.message)

    return { success: true }
  })
