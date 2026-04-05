import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Customer, Customer360Data, CustomerContact } from '../../types/sales'

function isSupabaseConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Mock Data ─────────────────────────────────────────────

function getMockCustomerList(): { customers: Customer[]; total: number } {
  const customers: Customer[] = [
    { id: 'cust-001', companyName: 'Al-Nour Construction', tier: 'A', status: 'active', contactName: 'Mohamed Al-Nour', phone: '+201001234567', email: 'mohamed@alnour.eg', address: 'Dokki, Giza', creditLimit: 5_000_000, currentExposure: 2_100_000, assignedSalesRep: 'Ahmed Hassan', createdAt: '2024-03-15T10:00:00Z' },
    { id: 'cust-002', companyName: 'Pyramid Builders', tier: 'A', status: 'active', contactName: 'Khaled Ibrahim', phone: '+201112345678', email: 'khaled@pyramidbuilders.eg', address: 'Nasr City, Cairo', creditLimit: 8_000_000, currentExposure: 3_500_000, assignedSalesRep: 'Ahmed Hassan', createdAt: '2023-11-20T08:00:00Z' },
    { id: 'cust-003', companyName: 'Cairo Steel Works', tier: 'B', status: 'active', contactName: 'Hassan Mostafa', phone: '+201223456789', email: 'hassan@cairosteelworks.eg', address: 'Helwan, Cairo', creditLimit: 3_000_000, currentExposure: 800_000, assignedSalesRep: 'Fatma Nour', createdAt: '2024-06-10T09:00:00Z' },
    { id: 'cust-004', companyName: 'Delta Cement Co.', tier: 'B', status: 'active', contactName: 'Amr Salah', phone: '+201034567890', email: 'amr@deltacement.eg', address: 'Mansoura, Dakahlia', creditLimit: 2_000_000, currentExposure: 1_200_000, assignedSalesRep: 'Omar Khalil', createdAt: '2024-01-05T14:00:00Z' },
    { id: 'cust-005', companyName: 'Alexandria Building Materials', tier: 'C', status: 'active', contactName: 'Youssef Farid', phone: '+201245678901', email: null, address: 'Smouha, Alexandria', creditLimit: 500_000, currentExposure: 120_000, assignedSalesRep: 'Sara Ibrahim', createdAt: '2025-02-18T11:00:00Z' },
    { id: 'cust-006', companyName: 'New Valley Development', tier: 'new', status: 'unclaimed', contactName: 'Tarek Abdel-Fattah', phone: '+201156789012', email: null, address: null, creditLimit: 0, currentExposure: 0, assignedSalesRep: null, createdAt: new Date().toISOString() },
    { id: 'cust-007', companyName: 'Heliopolis Contractors', tier: 'A', status: 'active', contactName: 'Nabil El-Sayed', phone: '+201067890123', email: 'nabil@heliopoliscontractors.eg', address: 'Heliopolis, Cairo', creditLimit: 10_000_000, currentExposure: 4_200_000, assignedSalesRep: 'Ahmed Hassan', createdAt: '2023-05-12T16:00:00Z' },
    { id: 'cust-008', companyName: 'Maadi Engineering', tier: 'new', status: 'unclaimed', contactName: 'Sameh Rizk', phone: '+201178901234', email: 'sameh@maadieng.eg', address: 'Maadi, Cairo', creditLimit: 0, currentExposure: 0, assignedSalesRep: null, createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
  ]

  return { customers, total: customers.length }
}

function getMockCustomer360(customerId: string): Customer360Data {
  const list = getMockCustomerList()
  const customer = list.customers.find((c) => c.id === customerId) ?? list.customers[0]

  const contacts: CustomerContact[] = [
    { id: 'cc-1', name: customer.contactName, role: 'CEO', email: customer.email, phone: customer.phone, lastContactDate: new Date(Date.now() - 3 * 86_400_000).toISOString(), commPreference: 'phone', relationshipStrength: 'strong', dealRole: 'decision_maker', reportsTo: null },
    { id: 'cc-2', name: 'Heba Mahmoud', role: 'Procurement Manager', email: 'heba@company.eg', phone: '+201089012345', lastContactDate: new Date(Date.now() - 1 * 86_400_000).toISOString(), commPreference: 'whatsapp', relationshipStrength: 'strong', dealRole: 'budget_holder', reportsTo: 'cc-1' },
    { id: 'cc-3', name: 'Waleed Farouk', role: 'Site Engineer', email: 'waleed@company.eg', phone: '+201190123456', lastContactDate: new Date(Date.now() - 7 * 86_400_000).toISOString(), commPreference: 'email', relationshipStrength: 'developing', dealRole: 'end_user', reportsTo: 'cc-2' },
  ]

  return {
    customer,
    contacts,
    quotes: [
      { id: 'qt-101', quoteNumber: 'QT-2026-00412', status: 'accepted', total: 6_200_000, createdAt: '2026-01-15T10:00:00Z', outcome: 'won' },
      { id: 'qt-102', quoteNumber: 'QT-2026-00398', status: 'accepted', total: 4_800_000, createdAt: '2025-12-03T08:00:00Z', outcome: 'won' },
      { id: 'qt-103', quoteNumber: 'QT-2025-01203', status: 'declined', total: 8_100_000, createdAt: '2025-09-22T14:00:00Z', outcome: 'lost' },
      { id: 'qt-104', quoteNumber: 'QT-2026-00523', status: 'draft', total: 863_422, createdAt: new Date().toISOString(), outcome: 'pending' },
    ],
    orders: [
      { id: 'ord-201', orderNumber: 'SO-2026-00015', status: 'delivered', total: 6_200_000, createdAt: '2026-01-20T10:00:00Z', deliveryStatus: 'completed', paymentStatus: 'paid' },
      { id: 'ord-202', orderNumber: 'SO-2026-00008', status: 'in_progress', total: 4_800_000, createdAt: '2025-12-10T08:00:00Z', deliveryStatus: 'partial', paymentStatus: 'partial' },
    ],
    financials: {
      creditLimit: customer.creditLimit,
      creditLimitHistory: [
        { date: '2024-03-15', limit: 2_000_000 },
        { date: '2024-09-01', limit: 3_500_000 },
        { date: '2025-06-15', limit: 5_000_000 },
      ],
      arAging: {
        current: 1_200_000,
        days1to30: 600_000,
        days31to60: 200_000,
        days61to90: 80_000,
        days90plus: 20_000,
      },
      paymentHistory: [
        { date: '2026-03-01', amount: 2_500_000, daysLate: 0 },
        { date: '2026-02-01', amount: 1_800_000, daysLate: 3 },
        { date: '2026-01-01', amount: 3_200_000, daysLate: 0 },
        { date: '2025-12-01', amount: 1_500_000, daysLate: 7 },
      ],
      avgDaysToPay: 28,
    },
    projects: [
      { id: 'proj-1', name: 'New Cairo Tower Complex', stage: 'structure', materialRequirements: ['cement', 'steel_rebar', 'concrete_blocks', 'plywood'] },
      { id: 'proj-2', name: 'Maadi Residential Phase 3', stage: 'finishing', materialRequirements: ['tiles', 'paint', 'pvc_pipes', 'electrical'] },
    ],
    communications: [
      { id: 'comm-1', type: 'call', summary: 'Discussed upcoming project requirements for Q2', date: new Date(Date.now() - 3 * 86_400_000).toISOString(), contactName: customer.contactName },
      { id: 'comm-2', type: 'whatsapp', summary: 'Confirmed delivery schedule for SO-2026-00008', date: new Date(Date.now() - 5 * 86_400_000).toISOString(), contactName: 'Heba Mahmoud' },
      { id: 'comm-3', type: 'meeting', summary: 'Quarterly business review at customer office', date: new Date(Date.now() - 14 * 86_400_000).toISOString(), contactName: customer.contactName },
      { id: 'comm-4', type: 'email', summary: 'Sent updated pricing for cement category', date: new Date(Date.now() - 7 * 86_400_000).toISOString(), contactName: 'Heba Mahmoud' },
    ],
    documents: [
      { id: 'doc-1', name: 'QT-2026-00412.pdf', type: 'quote', url: '/docs/qt-412.pdf', uploadedAt: '2026-01-15T10:00:00Z' },
      { id: 'doc-2', name: 'INV-2026-00015.pdf', type: 'invoice', url: '/docs/inv-015.pdf', uploadedAt: '2026-01-20T10:00:00Z' },
      { id: 'doc-3', name: 'DN-2026-00015.pdf', type: 'delivery_note', url: '/docs/dn-015.pdf', uploadedAt: '2026-01-25T10:00:00Z' },
      { id: 'doc-4', name: 'Credit_Agreement_2025.pdf', type: 'contract', url: '/docs/credit-2025.pdf', uploadedAt: '2025-06-15T10:00:00Z' },
    ],
    notes: [
      { id: 'note-1', body: 'Strategic account -- CEO has personal relationship with our founder. Always prioritize.', author: 'Ahmed Hassan', tag: 'general', createdAt: '2025-08-10T09:00:00Z' },
      { id: 'note-2', body: 'Prefers to receive quotes before 10 AM. Usually reviews during morning meeting.', author: 'Fatma Nour', tag: 'quote-related', createdAt: '2025-11-15T14:00:00Z' },
    ],
    healthScore: 82,
  }
}

// ─── Server Functions ──────────────────────────────────────

const getCustomerListInput = z.object({
  search: z.string().optional(),
  segment: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(50),
})

export const getCustomerList = createServerFn({ method: 'GET' })
  .inputValidator(getCustomerListInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const mock = getMockCustomerList()
      let filtered = mock.customers

      if (input.search) {
        const q = input.search.toLowerCase()
        filtered = filtered.filter(
          (c) =>
            c.companyName.toLowerCase().includes(q) ||
            c.contactName.toLowerCase().includes(q) ||
            c.phone.includes(q),
        )
      }
      if (input.segment) {
        filtered = filtered.filter((c) => c.tier === input.segment)
      }

      const start = (input.page - 1) * input.limit
      return { customers: filtered.slice(start, start + input.limit), total: filtered.length }
    }

    // TODO: Real Supabase query on customers table with RLS
    return { customers: [] as Customer[], total: 0 }
  })

const getCustomerCreditInfoInput = z.object({
  customerId: z.string(),
})

export const getCustomerCreditInfo = createServerFn({ method: 'GET' })
  .inputValidator(getCustomerCreditInfoInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const data = getMockCustomer360(input.customerId)
      return {
        creditLimit: data.financials.creditLimit,
        currentExposure: data.customer.currentExposure,
        paymentHistory: data.customer.tier === 'new' ? ('fair' as const) : ('excellent' as const),
        riskScore: data.customer.tier === 'new' ? 60 : 15,
      }
    }

    // TODO: Real Supabase query on customers + invoices for exposure calculation
    return { creditLimit: 0, currentExposure: 0, paymentHistory: 'fair' as const, riskScore: 50 }
  })

const addCustomerInput = z.object({
  phone: z.string().min(10), // Egyptian phone format
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  deliveryAddress: z.string().optional(),
  projectName: z.string().optional(),
  notes: z.string().optional(),
})

export const addCustomer = createServerFn({ method: 'POST' })
  .inputValidator(addCustomerInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return {
        customerId: `cust-${Date.now()}`,
        status: 'unclaimed' as const,
        warning: 'new_customer_no_credit',
      }
    }

    // TODO: Phone duplicate check -- query customers WHERE phone = input.phone
    // TODO: Fuzzy company name check via pg_trgm similarity
    // TODO: INSERT into customers with status: 'unclaimed', auth_user_id: NULL
    // TODO: No auth credentials created
    // TODO: Auto-assign current sales rep as account owner
    return {
      customerId: `cust-${Date.now()}`,
      status: 'unclaimed' as const,
      warning: 'new_customer_no_credit',
    }
  })

const getCustomer360Input = z.object({
  customerId: z.string(),
})

export const getCustomer360 = createServerFn({ method: 'GET' })
  .inputValidator(getCustomer360Input)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return getMockCustomer360(input.customerId)
    }

    // TODO: Aggregate query across customers, customer_contacts, quotes,
    // orders, invoices, projects, activity_logs, documents, notes
    // Compute health score from: payment history, order frequency,
    // revenue trend, relationship depth, quote win rate, recent activity
    return getMockCustomer360(input.customerId)
  })
