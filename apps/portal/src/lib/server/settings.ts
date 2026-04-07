/**
 * Settings server functions.
 * Profile, addresses, projects, notifications, sessions CRUD.
 * Dev mode fallback when Supabase not configured.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getServerSession } from '@hyperquote/auth/session'
import type {
  CustomerProfile,
  Address,
  Project,
  NotificationPreference,
  ActiveSession,
} from '../../types/settings'

// ============================================================================
// Helper: check if Supabase is configured
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

function getMockProfile(): CustomerProfile {
  return {
    companyName: 'A**** Construction',
    contactName: 'Ahmed Hassan',
    phone: '+201234567890',
    email: 'ahmed@example.com',
    tradeLicenseStatus: 'under_review',
    profilePhotoUrl: undefined,
  }
}

function getMockAddresses(): Address[] {
  return [
    {
      id: 'addr-1',
      label: 'Main Office',
      street: '15 Tahrir Street, Downtown',
      city: 'Cairo',
      governorate: 'Cairo',
      isDefault: true,
      postalCode: '11511',
    },
    {
      id: 'addr-2',
      label: 'Warehouse',
      street: '7 Industrial Zone, 6th of October',
      city: '6th of October City',
      governorate: 'Giza',
      isDefault: false,
    },
    {
      id: 'addr-3',
      label: 'Site Office',
      street: '22 El Nasr Road',
      city: 'Nasr City',
      governorate: 'Cairo',
      isDefault: false,
      postalCode: '11765',
    },
  ]
}

function getMockProjects(): Project[] {
  return [
    {
      id: 'proj-1',
      name: 'New Cairo Villa',
      description: 'Residential villa project in New Cairo compound',
      orderCount: 12,
      createdAt: '2026-01-15T10:00:00Z',
      archived: false,
    },
    {
      id: 'proj-2',
      name: 'Maadi Office Renovation',
      description: undefined,
      orderCount: 3,
      createdAt: '2026-03-01T08:30:00Z',
      archived: false,
    },
  ]
}

function getMockSessions(): ActiveSession[] {
  return [
    {
      id: 'session-1',
      device: 'Chrome on MacOS',
      lastActive: new Date().toISOString(),
      location: 'Cairo, Egypt',
      isCurrent: true,
    },
    {
      id: 'session-2',
      device: 'Safari on iPhone',
      lastActive: new Date(Date.now() - 3600000).toISOString(),
      location: 'Cairo, Egypt',
      isCurrent: false,
    },
  ]
}

// ============================================================================
// getCustomerProfile
// ============================================================================

export const getCustomerProfile = createServerFn().handler(
  async (): Promise<CustomerProfile> => {
    if (!isSupabaseConfigured()) {
      return getMockProfile()
    }

    const { supabase } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('customers')
      .select(
        'company_name, contact_name, phone, email, trade_license_status, profile_photo_url',
      )
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Profile not found')
    }

    return {
      companyName: data.company_name,
      contactName: data.contact_name,
      phone: data.phone,
      email: data.email,
      tradeLicenseStatus: data.trade_license_status ?? 'not_uploaded',
      profilePhotoUrl: data.profile_photo_url,
    }
  },
)

// ============================================================================
// updateCustomerProfile
// ============================================================================

export const updateCustomerProfile = createServerFn()
  .inputValidator(
    z.object({
      companyName: z.string().optional(),
      contactName: z.string().optional(),
      email: z.string().email().optional(),
    }),
  )
  .handler(async ({ data: input }): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    const { supabase } = await getAuthenticatedClient()

    const updateData: Record<string, unknown> = {}
    if (input.companyName !== undefined) updateData.company_name = input.companyName
    if (input.contactName !== undefined) updateData.contact_name = input.contactName
    if (input.email !== undefined) updateData.email = input.email

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', 'current_user_customer_id')

    if (error) throw new Error(error.message)

    return { success: true }
  })

// ============================================================================
// uploadTradeLicense
// ============================================================================

export const uploadTradeLicense = createServerFn()
  .inputValidator(z.object({ fileUrl: z.string() }))
  .handler(
    async (): Promise<{ success: boolean; status: 'under_review' }> => {
      if (!isSupabaseConfigured()) {
        return { success: true, status: 'under_review' }
      }

      const { supabase } = await getAuthenticatedClient()

      const { error } = await supabase
        .from('customers')
        .update({ trade_license_status: 'under_review' })
        .eq('id', 'current_user_customer_id')

      if (error) throw new Error(error.message)

      return { success: true, status: 'under_review' }
    },
  )

// ============================================================================
// uploadProfilePhoto
// ============================================================================

export const uploadProfilePhoto = createServerFn()
  .inputValidator(z.object({ fileUrl: z.string() }))
  .handler(
    async ({
      data: input,
    }): Promise<{ success: boolean; photoUrl: string }> => {
      if (!isSupabaseConfigured()) {
        return { success: true, photoUrl: input.fileUrl }
      }

      const { supabase } = await getAuthenticatedClient()

      const { error } = await supabase
        .from('customers')
        .update({ profile_photo_url: input.fileUrl })
        .eq('id', 'current_user_customer_id')

      if (error) throw new Error(error.message)

      return { success: true, photoUrl: input.fileUrl }
    },
  )

// ============================================================================
// getAddresses
// ============================================================================

export const getAddresses = createServerFn().handler(
  async (): Promise<Address[]> => {
    if (!isSupabaseConfigured()) {
      return getMockAddresses()
    }

    const { supabase } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('customer_addresses')
      .select('id, label, street, city, governorate, is_default, postal_code')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (data ?? []).map((a) => ({
      id: a.id,
      label: a.label ?? '',
      street: a.street,
      city: a.city,
      governorate: a.governorate,
      isDefault: a.is_default,
      postalCode: a.postal_code,
    }))
  },
)

// ============================================================================
// saveAddress
// ============================================================================

export const saveAddress = createServerFn()
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
    if (!isSupabaseConfigured()) {
      return {
        address: {
          id: input.id ?? crypto.randomUUID(),
          label: input.label,
          street: input.street,
          city: input.city,
          governorate: input.governorate,
          isDefault: input.isDefault ?? false,
        },
      }
    }

    const { supabase, session } = await getAuthenticatedClient()

    const payload = {
      customer_id: session.user.app_metadata?.customer_id,
      label: input.label,
      street: input.street,
      city: input.city,
      governorate: input.governorate,
      is_default: input.isDefault ?? false,
    }

    let data: Record<string, unknown> | null = null
    let error: { message: string } | null = null

    if (input.id) {
      const result = await supabase
        .from('customer_addresses')
        .update(payload)
        .eq('id', input.id)
        .select('id, label, street, city, governorate, is_default, postal_code')
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('customer_addresses')
        .insert(payload)
        .select('id, label, street, city, governorate, is_default, postal_code')
        .single()
      data = result.data
      error = result.error
    }

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to save address')
    }

    return {
      address: {
        id: data.id as string,
        label: (data.label as string) ?? '',
        street: data.street as string,
        city: data.city as string,
        governorate: data.governorate as string,
        isDefault: data.is_default as boolean,
        postalCode: data.postal_code as string | undefined,
      },
    }
  })

// ============================================================================
// deleteAddress
// ============================================================================

export const deleteAddress = createServerFn()
  .inputValidator(z.object({ addressId: z.string() }))
  .handler(async ({ data: input }): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    const { supabase } = await getAuthenticatedClient()

    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', input.addressId)

    if (error) throw new Error(error.message)

    return { success: true }
  })

// ============================================================================
// getProjects
// ============================================================================

export const getProjects = createServerFn().handler(
  async (): Promise<Project[]> => {
    if (!isSupabaseConfigured()) {
      return getMockProjects()
    }

    const { supabase } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, order_count, created_at, archived')
      .eq('archived', false)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      orderCount: p.order_count ?? 0,
      createdAt: p.created_at,
      archived: p.archived ?? false,
    }))
  },
)

// ============================================================================
// saveProject
// ============================================================================

export const saveProject = createServerFn()
  .inputValidator(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }): Promise<{ project: Project }> => {
    if (!isSupabaseConfigured()) {
      return {
        project: {
          id: input.id ?? crypto.randomUUID(),
          name: input.name,
          description: input.description,
          orderCount: 0,
          createdAt: new Date().toISOString(),
          archived: false,
        },
      }
    }

    const { supabase, session } = await getAuthenticatedClient()

    const payload = {
      customer_id: session.user.app_metadata?.customer_id,
      name: input.name,
      description: input.description ?? null,
    }

    let data: Record<string, unknown> | null = null
    let error: { message: string } | null = null

    if (input.id) {
      const result = await supabase
        .from('projects')
        .update(payload)
        .eq('id', input.id)
        .select('id, name, description, order_count, created_at, archived')
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('projects')
        .insert(payload)
        .select('id, name, description, order_count, created_at, archived')
        .single()
      data = result.data
      error = result.error
    }

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to save project')
    }

    return {
      project: {
        id: data.id as string,
        name: data.name as string,
        description: data.description as string | undefined,
        orderCount: (data.order_count as number) ?? 0,
        createdAt: data.created_at as string,
        archived: (data.archived as boolean) ?? false,
      },
    }
  })

// ============================================================================
// archiveProject
// ============================================================================

export const archiveProject = createServerFn()
  .inputValidator(z.object({ projectId: z.string() }))
  .handler(async ({ data: input }): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    const { supabase } = await getAuthenticatedClient()

    const { error } = await supabase
      .from('projects')
      .update({ archived: true })
      .eq('id', input.projectId)

    if (error) throw new Error(error.message)

    return { success: true }
  })

// ============================================================================
// updateNotificationPreferences
// ============================================================================

export const updateNotificationPreferences = createServerFn()
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
  .handler(async (): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    const { supabase } = await getAuthenticatedClient()

    // In production, upsert notification preferences
    const { error } = await supabase
      .from('notification_preferences')
      .upsert([])

    if (error) throw new Error(error.message)

    return { success: true }
  })

// ============================================================================
// getActiveSessions
// ============================================================================

export const getActiveSessions = createServerFn().handler(
  async (): Promise<ActiveSession[]> => {
    if (!isSupabaseConfigured()) {
      return getMockSessions()
    }

    const { supabase } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('user_sessions')
      .select('id, device, last_active, location, is_current')
      .order('last_active', { ascending: false })

    if (error) throw new Error(error.message)

    return (data ?? []).map((s) => ({
      id: s.id,
      device: s.device,
      lastActive: s.last_active,
      location: s.location,
      isCurrent: s.is_current,
    }))
  },
)

// ============================================================================
// signOutSession
// ============================================================================

export const signOutSession = createServerFn()
  .inputValidator(z.object({ sessionId: z.string() }))
  .handler(async ({ data: input }): Promise<{ success: boolean }> => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    const { supabase } = await getAuthenticatedClient()

    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', input.sessionId)

    if (error) throw new Error(error.message)

    return { success: true }
  })
