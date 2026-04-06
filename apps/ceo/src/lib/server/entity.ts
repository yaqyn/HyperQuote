/**
 * CEO entity detail server function.
 * Returns detailed data for any of the 7 entity types.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  EntityType,
  EntityDetail,
  Employee,
  Customer,
  CEOOrder,
  Invoice,
  Supplier,
  Delivery,
  Product,
} from '../../types/entity'

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

// ============================================================================
// Mock entities -- matches CONTEXT.md Screen 4 examples
// ============================================================================

const mockEmployee: Employee = {
  id: 'emp-001',
  name: 'Ahmed Fawzi',
  role: 'Sales Rep',
  department: 'Sales',
  joinedDate: '2024-09-12',
  phone: '+20 100 123 4567',
  email: 'ahmed.fawzi@hyperquote.net',
  stats: {
    activeQuotes: 8,
    pipelineValue: 12400000,
    winRate: 34,
    avgMargin: 14.8,
  },
  recentActivity: [
    { date: '2026-03-28', description: 'Sent quote QT-1210 to Nile Developers (EGP 2.1M)' },
    { date: '2026-03-27', description: 'Closed order ORD-1201 from Arab Contractors (EGP 890K)' },
    { date: '2026-03-26', description: 'Updated quote QT-1204 margin to 7.2%' },
  ],
}

const mockCustomer: Customer = {
  id: 'cust-001',
  name: 'Al-Masriya Construction Co.',
  customerSince: '2023-06-15',
  primaryContact: {
    name: 'Eng. Omar Hassan',
    phone: '+20 112 345 6789',
    email: 'omar@almasriya.com.eg',
  },
  accountManager: 'Ahmed Fawzi',
  financial: {
    creditLimit: 1200000,
    creditUsed: 980000,
    totalAR: 1230000,
    overdue: 250000,
  },
  orderHistory: {
    count: 12,
    totalRevenue: 8400000,
    avgOrderValue: 700000,
    avgMargin: 14.2,
  },
  recentOrders: [
    { id: 'ord-1198', reference: 'ORD-1198', amount: 890000, status: 'Delivered' },
    { id: 'ord-1187', reference: 'ORD-1187', amount: 1200000, status: 'Delivered' },
    { id: 'ord-1174', reference: 'ORD-1174', amount: 650000, status: 'Invoiced' },
  ],
  alerts: [
    { type: 'bounced_cheque', description: 'Bounced cheque', amount: 250000, date: '2026-03-28' },
  ],
}

const mockOrder: CEOOrder = {
  id: 'ord-1204',
  reference: 'ORD-1204',
  customer: 'Al-Masriya Construction Co.',
  createdDate: '2026-03-15',
  status: 'Delivered',
  items: [
    { description: 'Cement bags (50kg) -- Portland Type I', quantity: 50, unit: 'bag' },
    { description: 'Rebar bundles (12mm, 12m)', quantity: 20, unit: 'bundle' },
    { description: 'Plywood sheets (18mm)', quantity: 40, unit: 'sheet' },
  ],
  financial: {
    value: 3200000,
    margin: 14.8,
    invoiceRef: 'INV-3892',
    paymentStatus: 'Partial',
    outstanding: 1400000,
    dueDate: '2026-04-14',
  },
  delivery: {
    date: '2026-03-22',
    driver: 'Mohammed Ali',
    pod: 'Signed by Eng. Hassan (Foreman)',
    deliveryNoteRef: 'DN-3892',
  },
  timeline: [
    { date: '2026-03-15', description: 'Order created by Ahmed Fawzi' },
    { date: '2026-03-16', description: 'Supplier POs generated (3 suppliers)' },
    { date: '2026-03-18', description: 'All materials confirmed by suppliers' },
    { date: '2026-03-20', description: 'Loaded at warehouse' },
    { date: '2026-03-22', description: 'Delivered, POD captured' },
  ],
}

const mockInvoice: Invoice = {
  id: 'inv-3892',
  reference: 'INV-3892',
  customer: 'Al-Masriya Construction Co.',
  issuedDate: '2026-03-22',
  dueDate: '2026-04-21',
  amount: 3200000,
  vat: 448000,
  total: 3648000,
  payments: [
    { amount: 1800000, date: '2026-03-25', method: 'Wire transfer' },
  ],
  outstanding: 1848000,
  daysUntilDue: 15,
  etaSubmission: {
    ref: 'ETA-892741',
    date: '2026-03-22',
  },
}

const mockSupplier: Supplier = {
  id: 'sup-001',
  name: 'El-Nasr Steel',
  supplierSince: '2024-08-01',
  primaryContact: {
    name: 'Eng. Tarek Mahmoud',
    phone: '+20 100 987 6543',
  },
  category: 'Steel & Rebar',
  performance: {
    totalPOValue: 22000000,
    onTimeRate: 91,
    qualityIssues: 2,
    activePOs: 3,
  },
  terms: {
    payment: 'Net 60',
    earlyDiscount: '2% / 15 days',
    minimumOrder: 500000,
  },
}

const mockDelivery: Delivery = {
  id: 'del-4521',
  orderRef: 'ORD-1204',
  customer: 'Al-Masriya Construction',
  status: 'Delivered',
  driver: 'Mohammed Ali',
  vehicle: 'Truck #HQ-017 (Flatbed + Moffett)',
  timeline: [
    { time: '6:30 AM', description: 'Departed warehouse' },
    { time: '7:38 AM', description: 'Arrived at site' },
    { time: '8:05 AM', description: 'Unloading complete' },
    { time: '8:10 AM', description: 'POD captured' },
  ],
  itemsDelivered: [
    { description: 'Cement bags', delivered: 48, expected: 50, note: 'SHORT 2 -- damaged at warehouse' },
    { description: 'Rebar bundles', delivered: 20, expected: 20 },
  ],
  pod: {
    signedBy: 'Eng. Hassan Mohamed Ali (Foreman)',
    photoCount: 3,
    condition: 'Good (2 bags short noted)',
  },
}

const mockProduct: Product = {
  id: 'prod-001',
  name: 'Portland Cement Type I (50kg bag)',
  category: 'Cement & Concrete',
  sku: 'CEM-PORT-50',
  pricing: {
    lastSupplierCost: 85,
    avgSellingPrice: 102,
    avgMargin: 20,
  },
  movement: {
    unitsSold: 2400,
    revenue: 244800,
    topCustomers: [
      { name: 'Al-Masriya', units: 800 },
      { name: 'Nile Developers', units: 600 },
    ],
  },
  availability: {
    suppliers: [
      { name: 'El-Nasr', inStock: true },
      { name: 'Alexandria Cement', inStock: true },
    ],
    leadTime: '2-3 days',
  },
}

const mockEntities: Record<EntityType, EntityDetail> = {
  employee: mockEmployee,
  customer: mockCustomer,
  order: mockOrder,
  invoice: mockInvoice,
  supplier: mockSupplier,
  delivery: mockDelivery,
  product: mockProduct,
}

// ============================================================================
// Input schema
// ============================================================================

const entityDetailInput = z.object({
  entityType: z.enum([
    'employee',
    'customer',
    'order',
    'product',
    'invoice',
    'supplier',
    'delivery',
  ]),
  entityId: z.string().min(1),
})

// ============================================================================
// getEntityDetail
// ============================================================================

export const getEntityDetail = createServerFn({ method: 'GET' })
  .inputValidator(entityDetailInput)
  .handler(
    async ({
      data: input,
    }): Promise<EntityDetail> => {
      if (isSupabaseConfigured()) {
        // TODO: Real Supabase query by entity type + ID
      }

      return mockEntities[input.entityType as EntityType]
    },
  )
