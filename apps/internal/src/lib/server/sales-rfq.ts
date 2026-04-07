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
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      const now = new Date().toISOString()
      const followUpAt = new Date(Date.now() + 48 * 3_600_000).toISOString()
      const archiveAt = new Date(Date.now() + 7 * 86_400_000).toISOString()
      return {
        success: true,
        rfqId: input.rfqId,
        status: 'awaiting_clarification' as const,
        questionsCount: input.questions.length,
        updatedAt: now,
        scheduledFollowUp: followUpAt,
        scheduledArchive: archiveAt,
        notificationsSent: ['portal', 'email', 'whatsapp'],
      }
    }

    // TODO: Update quote_requests.status to 'awaiting_clarification'
    // TODO: Create notification for customer (portal + email + WhatsApp)
    // TODO: Schedule auto-follow-up at 48h
    // TODO: Schedule archive at 7d with "No Response"
    return { success: true, rfqId: input.rfqId, status: 'awaiting_clarification' as const, questionsCount: input.questions.length, updatedAt: new Date().toISOString(), scheduledFollowUp: '', scheduledArchive: '', notificationsSent: [] as string[] }
  })

const declineRFQInput = z.object({
  rfqId: z.string(),
  reason: z.enum(['outside_service_area', 'cannot_source', 'customer_blacklisted']),
  note: z.string().optional(),
})

export const declineRFQ = createServerFn({ method: 'POST' })
  .inputValidator(declineRFQInput)
  .handler(async ({ data: input }) => {
    if (!isSupabaseConfigured()) {
      return {
        success: true,
        rfqId: input.rfqId,
        status: 'declined' as const,
        reason: input.reason,
        note: input.note ?? null,
        declinedAt: new Date().toISOString(),
      }
    }

    // TODO: Update quote_requests.status to 'declined' via validate_state_transition
    // TODO: Log reason and optional note
    return { success: true, rfqId: input.rfqId, status: 'declined' as const, reason: input.reason, note: input.note ?? null, declinedAt: new Date().toISOString() }
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
  .handler(async ({ data: input }) => {
    // ─── Mock Sales Reps ─────────────────────────────────────
    const reps = [
      { id: 'user-1', name: 'Ahmed Hassan', role: 'senior', activeRfqs: 7, specialization: ['cement', 'steel'], territories: ['cairo', 'giza'] },
      { id: 'user-2', name: 'Fatma Nour', role: 'mid', activeRfqs: 4, specialization: ['blocks', 'finishing'], territories: ['alexandria', 'delta'] },
      { id: 'user-3', name: 'Omar Khalil', role: 'mid', activeRfqs: 9, specialization: ['cement', 'blocks'], territories: ['cairo', 'suez'] },
      { id: 'user-4', name: 'Sara Ibrahim', role: 'junior', activeRfqs: 3, specialization: ['plywood', 'finishing'], territories: ['giza', 'fayoum'] },
      { id: 'user-5', name: 'Hassan El-Masry', role: 'senior', activeRfqs: 5, specialization: ['steel', 'roofing'], territories: ['cairo', 'helwan'] },
    ]

    // Mock account-owner mapping (customer name → rep id)
    const accountOwners: Record<string, string> = {
      'Al-Nour Construction': 'user-1',
      'Pyramid Builders': 'user-1',
      'Heliopolis Contractors': 'user-1',
      'Cairo Steel Works': 'user-2',
      'Giza Construction LLC': 'user-4',
    }

    const CAPACITY_THRESHOLD = 10
    const VALUE_ESCALATION_THRESHOLD = 500_000

    // Find the RFQ to get customer info
    const queue = getMockRFQQueue()
    const rfq = queue.rfqs.find((r) => r.id === input.rfqId)
    const customerName = rfq?.customerName ?? ''
    const estimatedValue = rfq?.estimatedValue ?? 0

    type AssignmentReason = 'account_owner' | 'territory' | 'round_robin' | 'specialization' | 'value_escalation' | 'capacity_rebalance'

    let assignedRep = reps[0]
    let reason: AssignmentReason = 'round_robin'

    // Step 1: Account owner check
    const ownerId = accountOwners[customerName]
    if (ownerId) {
      const owner = reps.find((r) => r.id === ownerId)
      if (owner && owner.activeRfqs < CAPACITY_THRESHOLD) {
        assignedRep = owner
        reason = 'account_owner'
      }
    }

    // Step 2: Territory fallback (if no owner match)
    if (reason !== 'account_owner') {
      // Mock: derive territory from customer name heuristic
      const territoryMap: Record<string, string> = {
        Cairo: 'cairo', Giza: 'giza', Alexandria: 'alexandria',
        Delta: 'delta', Suez: 'suez', Heliopolis: 'cairo',
        Maadi: 'cairo', 'New Valley': 'fayoum',
      }
      const matchedTerritory = Object.entries(territoryMap).find(([keyword]) =>
        customerName.includes(keyword),
      )
      if (matchedTerritory) {
        const territoryRep = reps.find(
          (r) => r.territories.includes(matchedTerritory[1]) && r.activeRfqs < CAPACITY_THRESHOLD,
        )
        if (territoryRep) {
          assignedRep = territoryRep
          reason = 'territory'
        }
      }
    }

    // Step 3: Round-robin (lowest workload) if still no match
    if (reason !== 'account_owner' && reason !== 'territory') {
      const available = reps.filter((r) => r.activeRfqs < CAPACITY_THRESHOLD)
      if (available.length > 0) {
        assignedRep = available.reduce((min, r) => (r.activeRfqs < min.activeRfqs ? r : min))
        reason = 'round_robin'
      }
    }

    // Step 4: Specialization override for specialty materials
    // Check if the RFQ items contain specialty categories
    if (rfq) {
      const detail = getMockRFQDetail(input.rfqId)
      const hasSpecialty = detail.items.some((item) =>
        ['roofing', 'custom', 'plywood', 'finishing'].some((kw) =>
          item.productName.toLowerCase().includes(kw),
        ),
      )
      if (hasSpecialty) {
        const specialist = reps.find(
          (r) =>
            r.specialization.some((s) => ['plywood', 'finishing', 'roofing'].includes(s)) &&
            r.activeRfqs < CAPACITY_THRESHOLD,
        )
        if (specialist) {
          assignedRep = specialist
          reason = 'specialization'
        }
      }
    }

    // Step 5: Value-based escalation — high-value RFQs go to senior reps
    if (estimatedValue > VALUE_ESCALATION_THRESHOLD) {
      const seniorRep = reps.find(
        (r) => r.role === 'senior' && r.activeRfqs < CAPACITY_THRESHOLD,
      )
      if (seniorRep) {
        assignedRep = seniorRep
        reason = 'value_escalation'
      }
    }

    // Step 6: Capacity throttle — if assigned rep is over threshold, find next available
    if (assignedRep.activeRfqs >= CAPACITY_THRESHOLD) {
      const available = reps
        .filter((r) => r.activeRfqs < CAPACITY_THRESHOLD)
        .sort((a, b) => a.activeRfqs - b.activeRfqs)
      if (available.length > 0) {
        assignedRep = available[0]
        reason = 'capacity_rebalance'
      }
    }

    return {
      success: true,
      assignedTo: assignedRep.name,
      assignedToId: assignedRep.id,
      assignmentReason: reason,
    }
  })
