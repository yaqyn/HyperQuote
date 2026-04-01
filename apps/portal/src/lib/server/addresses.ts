/**
 * Customer addresses and projects server functions.
 * CRUD operations scoped to authenticated customer.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getServerSession } from '@hyperquote/auth'

// ============================================================================
// Schemas
// ============================================================================

const createAddressInput = z.object({
  label: z.string().optional(),
  street: z.string().min(1),
  area: z.string().min(1),
  city: z.string().min(1),
  governorate: z.string().min(1),
  landmark: z.string().optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
})

const createProjectInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

// ============================================================================
// Types
// ============================================================================

export interface CustomerAddress {
  id: string
  label: string | null
  street: string
  area: string
  city: string
  governorate: string
  landmark: string | null
  phone: string | null
  isDefault: boolean
}

export interface CustomerProject {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

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
// getCustomerAddresses
// ============================================================================

export const getCustomerAddresses = createServerFn().handler(
  async (): Promise<CustomerAddress[]> => {
    if (!isSupabaseConfigured()) {
      return [
        {
          id: 'addr-mock-1',
          label: 'Main Office',
          street: '15 Tahrir Street',
          area: 'Downtown',
          city: 'Cairo',
          governorate: 'Cairo',
          landmark: 'Near Tahrir Square',
          phone: '+20 2 1234 5678',
          isDefault: true,
        },
        {
          id: 'addr-mock-2',
          label: 'Warehouse',
          street: '7 Industrial Zone',
          area: '6th of October',
          city: '6th of October City',
          governorate: 'Giza',
          landmark: null,
          phone: null,
          isDefault: false,
        },
      ]
    }

    const { supabase } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('customer_addresses')
      .select('id, label, street, area, city, governorate, landmark, phone, is_default')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (data ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      street: a.street,
      area: a.area,
      city: a.city,
      governorate: a.governorate,
      landmark: a.landmark,
      phone: a.phone,
      isDefault: a.is_default,
    }))
  },
)

// ============================================================================
// createAddress
// ============================================================================

export const createAddress = createServerFn()
  .inputValidator(createAddressInput)
  .handler(async ({ data: input }): Promise<CustomerAddress> => {
    if (!isSupabaseConfigured()) {
      return {
        id: crypto.randomUUID(),
        label: input.label ?? null,
        street: input.street,
        area: input.area,
        city: input.city,
        governorate: input.governorate,
        landmark: input.landmark ?? null,
        phone: input.phone ?? null,
        isDefault: input.isDefault ?? false,
      }
    }

    const { supabase, session } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({
        customer_id: session.user.app_metadata?.customer_id,
        label: input.label ?? null,
        street: input.street,
        area: input.area,
        city: input.city,
        governorate: input.governorate,
        landmark: input.landmark ?? null,
        phone: input.phone ?? null,
        is_default: input.isDefault ?? false,
      })
      .select('id, label, street, area, city, governorate, landmark, phone, is_default')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create address')
    }

    return {
      id: data.id,
      label: data.label,
      street: data.street,
      area: data.area,
      city: data.city,
      governorate: data.governorate,
      landmark: data.landmark,
      phone: data.phone,
      isDefault: data.is_default,
    }
  })

// ============================================================================
// getCustomerProjects
// ============================================================================

export const getCustomerProjects = createServerFn().handler(
  async (): Promise<CustomerProject[]> => {
    if (!isSupabaseConfigured()) {
      return [
        {
          id: 'proj-mock-1',
          name: 'New Cairo Villa',
          description: 'Residential villa project in New Cairo',
          isActive: true,
        },
        {
          id: 'proj-mock-2',
          name: 'Maadi Office Renovation',
          description: null,
          isActive: true,
        },
      ]
    }

    const { supabase } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, is_active')
      .eq('is_active', true)
      .order('name')

    if (error) throw new Error(error.message)

    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isActive: p.is_active,
    }))
  },
)

// ============================================================================
// createProject
// ============================================================================

export const createProject = createServerFn()
  .inputValidator(createProjectInput)
  .handler(async ({ data: input }): Promise<CustomerProject> => {
    if (!isSupabaseConfigured()) {
      return {
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description ?? null,
        isActive: true,
      }
    }

    const { supabase, session } = await getAuthenticatedClient()

    const { data, error } = await supabase
      .from('projects')
      .insert({
        customer_id: session.user.app_metadata?.customer_id,
        name: input.name,
        description: input.description ?? null,
      })
      .select('id, name, description, is_active')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create project')
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      isActive: data.is_active,
    }
  })
