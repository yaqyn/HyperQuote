import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { RFQ, RFQDetail, CustomerSnapshot, RFQItem } from '../../types/sales'
import { calculatePriorityScore } from '../../types/sales'

function isSupabaseConfigured(): boolean {
  return !!import.meta.env.VITE_SUPABASE_URL
}

// ─── Mock Data ─────────────────────────────────────────────

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()

function getMockRFQQueue(): { rfqs: RFQ[]; total: number; avgResponseTime: number } {
  const rfqs: RFQ[] = [
    {
      id: 'rfq-001',
      customerName: 'Al-Nour Construction',
      customerTier: 'A',
      estimatedValue: 7_500_000,
      priorityScore: calculatePriorityScore('A', 7_500_000, 0.5, 5),
      lineItemCount: 12,
      status: 'submitted',
      assignedRep: null,
      createdAt: hoursAgo(0.5),
      slaDeadline: hoursAgo(-1.5),
      deliveryUrgency: 5,
    },
    {
      id: 'rfq-002',
      customerName: 'Pyramid Builders',
      customerTier: 'A',
      estimatedValue: 3_200_000,
      priorityScore: calculatePriorityScore('A', 3_200_000, 3, 10),
      lineItemCount: 8,
      status: 'assigned',
      assignedRep: 'Ahmed Hassan',
      createdAt: hoursAgo(3),
      slaDeadline: hoursAgo(-1),
      deliveryUrgency: 10,
    },
    {
      id: 'rfq-003',
      customerName: 'Cairo Steel Works',
      customerTier: 'B',
      estimatedValue: 1_800_000,
      priorityScore: calculatePriorityScore('B', 1_800_000, 6, 14),
      lineItemCount: 5,
      status: 'reviewing',
      assignedRep: 'Fatma Nour',
      createdAt: hoursAgo(6),
      slaDeadline: hoursAgo(-2),
      deliveryUrgency: 14,
    },
    {
      id: 'rfq-004',
      customerName: 'Delta Cement Co.',
      customerTier: 'B',
      estimatedValue: 950_000,
      priorityScore: calculatePriorityScore('B', 950_000, 12, 21),
      lineItemCount: 3,
      status: 'awaiting_clarification',
      assignedRep: 'Omar Khalil',
      createdAt: hoursAgo(12),
      slaDeadline: hoursAgo(4),
      deliveryUrgency: 21,
    },
    {
      id: 'rfq-005',
      customerName: 'Alexandria Building Materials',
      customerTier: 'C',
      estimatedValue: 420_000,
      priorityScore: calculatePriorityScore('C', 420_000, 18, 30),
      lineItemCount: 6,
      status: 'submitted',
      assignedRep: null,
      createdAt: hoursAgo(18),
      slaDeadline: hoursAgo(10),
      deliveryUrgency: 30,
    },
    {
      id: 'rfq-006',
      customerName: 'New Valley Development',
      customerTier: 'new',
      estimatedValue: 280_000,
      priorityScore: calculatePriorityScore('new', 280_000, 2, 45),
      lineItemCount: 4,
      status: 'submitted',
      assignedRep: null,
      createdAt: hoursAgo(2),
      slaDeadline: hoursAgo(-2),
      deliveryUrgency: 45,
    },
    {
      id: 'rfq-007',
      customerName: 'Heliopolis Contractors',
      customerTier: 'A',
      estimatedValue: 12_500_000,
      priorityScore: calculatePriorityScore('A', 12_500_000, 1, 7),
      lineItemCount: 22,
      status: 'assigned',
      assignedRep: 'Ahmed Hassan',
      createdAt: hoursAgo(1),
      slaDeadline: hoursAgo(-1),
      deliveryUrgency: 7,
    },
    {
      id: 'rfq-008',
      customerName: 'Giza Construction LLC',
      customerTier: 'B',
      estimatedValue: 2_100_000,
      priorityScore: calculatePriorityScore('B', 2_100_000, 5, 12),
      lineItemCount: 9,
      status: 'reviewing',
      assignedRep: 'Sara Ibrahim',
      createdAt: hoursAgo(5),
      slaDeadline: hoursAgo(-3),
      deliveryUrgency: 12,
    },
    {
      id: 'rfq-009',
      customerName: 'Suez Industrial Group',
      customerTier: 'C',
      estimatedValue: 650_000,
      priorityScore: calculatePriorityScore('C', 650_000, 25, 20),
      lineItemCount: 7,
      status: 'submitted',
      assignedRep: null,
      createdAt: hoursAgo(25),
      slaDeadline: hoursAgo(17),
      deliveryUrgency: 20,
    },
    {
      id: 'rfq-010',
      customerName: 'Maadi Engineering',
      customerTier: 'new',
      estimatedValue: 180_000,
      priorityScore: calculatePriorityScore('new', 180_000, 8, 35),
      lineItemCount: 2,
      status: 'assigned',
      assignedRep: 'Omar Khalil',
      createdAt: hoursAgo(8),
      slaDeadline: hoursAgo(0),
      deliveryUrgency: 35,
    },
  ]

  // Sort by priority score descending
  rfqs.sort((a, b) => b.priorityScore - a.priorityScore)

  return { rfqs, total: rfqs.length, avgResponseTime: 2.3 }
}

function getMockRFQDetail(rfqId: string): RFQDetail {
  const queue = getMockRFQQueue()
  const base = queue.rfqs.find((r) => r.id === rfqId) ?? queue.rfqs[0]

  const customer: CustomerSnapshot = {
    id: 'cust-001',
    name: base.customerName,
    tier: base.customerTier,
    orderCount: 47,
    lifetimeValue: 18_500_000,
    avgMargin: 19.2,
    paymentHistory: 'excellent',
    creditLimit: 5_000_000,
    currentExposure: 2_100_000,
    availableCredit: 2_900_000,
  }

  const items: RFQItem[] = [
    { id: 'item-1', productName: 'Portland Cement CEM I 42.5N', specification: '50kg bags', quantity: 500, unit: 'bag', customerDescription: 'Need certified CEM I for structural work' },
    { id: 'item-2', productName: 'Steel Rebar 16mm', specification: 'Grade 60, 12m length', quantity: 200, unit: 'bundle', customerDescription: 'For column reinforcement' },
    { id: 'item-3', productName: 'Concrete Blocks 20cm', specification: 'Hollow, load-bearing', quantity: 5000, unit: 'piece', customerDescription: 'External walls' },
    { id: 'item-4', productName: 'Plywood Shuttering 18mm', specification: 'Birch, film-faced', quantity: 100, unit: 'sheet', customerDescription: 'For formwork' },
  ]

  return {
    ...base,
    items,
    customer,
    deliveryRequirements: {
      address: '15 Tahrir Street, Dokki, Giza',
      requestedDate: daysFromNow(base.deliveryUrgency),
      deliveryType: 'Jobsite Delivery',
      specialInstructions: 'Crane offload required. Gate access from side street only.',
    },
    attachments: [
      { id: 'att-1', name: 'BOQ_structural.pdf', url: '/files/boq-structural.pdf', size: 245_000 },
      { id: 'att-2', name: 'site_plan.dwg', url: '/files/site-plan.dwg', size: 1_200_000 },
    ],
    aiInsights: {
      winProbability: 78,
      recommendedMargin: 17.5,
      behavioralPrediction: 'High likelihood of acceptance. Customer has accepted 4 of last 5 similar quotes.',
    },
    similarQuotes: [
      { id: 'qt-prev-1', quoteNumber: 'QT-2026-00412', marginPercent: 18.5, outcome: 'won', value: 6_200_000 },
      { id: 'qt-prev-2', quoteNumber: 'QT-2026-00398', marginPercent: 15.2, outcome: 'won', value: 4_800_000 },
      { id: 'qt-prev-3', quoteNumber: 'QT-2025-01203', marginPercent: 22.1, outcome: 'lost', value: 8_100_000 },
    ],
  }
}

// ─── Server Functions ──────────────────────────────────────

const getRFQQueueInput = z.object({
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(50),
})

export const getRFQQueue = createServerFn({ method: 'GET' })
  .inputValidator(getRFQQueueInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const mock = getMockRFQQueue()
      // Apply filters to mock data
      let filtered = mock.rfqs
      if (input.status) {
        filtered = filtered.filter((r) => r.status === input.status)
      }
      if (input.assignedTo) {
        filtered = filtered.filter((r) => r.assignedRep === input.assignedTo)
      }
      const start = (input.page - 1) * input.limit
      return {
        rfqs: filtered.slice(start, start + input.limit),
        total: filtered.length,
        avgResponseTime: mock.avgResponseTime,
      }
    }

    // TODO: Real Supabase query
    // SELECT * FROM quote_requests
    // ORDER BY priority_score DESC
    // WHERE status = input.status (if provided)
    // WHERE assigned_to = input.assignedTo (if provided)
    // LIMIT input.limit OFFSET (input.page - 1) * input.limit
    return { rfqs: [] as RFQ[], total: 0, avgResponseTime: 0 }
  })

const getRFQDetailInput = z.object({
  rfqId: z.string(),
})

export const getRFQDetail = createServerFn({ method: 'GET' })
  .inputValidator(getRFQDetailInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return getMockRFQDetail(input.rfqId)
    }

    // TODO: Real Supabase query joining quote_requests, quote_request_items, customers
    return getMockRFQDetail(input.rfqId)
  })

const requestClarificationInput = z.object({
  rfqId: z.string(),
  questions: z.array(
    z.object({
      type: z.enum([
        'material_spec_ambiguous',
        'quantity_unclear',
        'delivery_access',
        'no_date',
        'mixed_units',
        'missing_attachment',
      ]),
      freeText: z.string().optional(),
    }),
  ),
})

export const requestClarification = createServerFn({ method: 'POST' })
  .inputValidator(requestClarificationInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    // TODO: Update quote_requests.status to 'awaiting_clarification'
    // TODO: Create notification for customer (portal + email + WhatsApp)
    // TODO: Schedule auto-follow-up at 48h
    // TODO: Schedule archive at 7d with "No Response"
    return { success: true }
  })

const declineRFQInput = z.object({
  rfqId: z.string(),
  reason: z.enum(['outside_service_area', 'cannot_source', 'customer_blacklisted']),
  note: z.string().optional(),
})

export const declineRFQ = createServerFn({ method: 'POST' })
  .inputValidator(declineRFQInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    // TODO: Update quote_requests.status to 'declined' via validate_state_transition
    // TODO: Log reason and optional note
    return { success: true }
  })

const reassignRFQInput = z.object({
  rfqId: z.string(),
  toUserId: z.string(),
})

export const reassignRFQ = createServerFn({ method: 'POST' })
  .inputValidator(reassignRFQInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      return { success: true }
    }

    // TODO: Update quote_requests.assigned_to
    // TODO: Send push notification to new assignee
    // TODO: Log reassignment in activity
    return { success: true }
  })

const autoAssignRFQInput = z.object({
  rfqId: z.string(),
})

export const autoAssignRFQ = createServerFn({ method: 'POST' })
  .inputValidator(autoAssignRFQInput)
  .handler(async ({ data: _input }) => {
    if (!isSupabaseConfigured()) {
      // Mock: return a hardcoded rep assignment
      return {
        success: true,
        assignedTo: 'Ahmed Hassan',
        assignedToId: 'user-1',
        assignmentReason: 'account_owner',
      }
    }

    // 6-step auto-assignment algorithm (CONTEXT.md Section 1.2):
    // Must complete within 30 seconds.

    // Step 1: Account owner first
    // TODO: Check customers.assigned_sales_rep for the RFQ's customer
    // If owner exists and is available, assign to them.

    // Step 2: Territory fallback if owner unavailable
    // TODO: Check territory_assignments for the customer's region
    // Assign to territory rep if account owner is unavailable.

    // Step 3: Round-robin for unassigned (weighted by workload)
    // TODO: Query active sales reps, count their open quotes
    // Assign to rep with lowest active quote count.

    // Step 4: Specialization override for specialty materials
    // TODO: If RFQ contains specialty items (e.g., roofing, custom),
    // override assignment to specialist rep for those categories.

    // Step 5: Value-based escalation: >EGP 25M routes to senior sales + primary rep
    // TODO: If estimated_value > 25_000_000, assign to senior sales
    // AND keep primary rep as co-assignee.

    // Step 6: Capacity throttle: if rep has >X active quotes, next available rep
    // TODO: Check if assigned rep exceeds capacity threshold
    // If so, reassign to next available rep via round-robin.

    return {
      success: true,
      assignedTo: 'Ahmed Hassan',
      assignedToId: 'user-1',
      assignmentReason: 'account_owner',
    }
  })
