import { createServerFn } from '@tanstack/react-start'
import type {
  Ticket,
  TicketDetail,
  WhatsAppConversation,
  DamageClaim,
  ReturnRequest,
  KBArticle,
} from '../../types/customer-service'

// ─── Mock Tickets ──────────────────────────────────────────

const MOCK_TICKETS: Ticket[] = [
  {
    id: 'tkt-001',
    number: 'TKT-2026-0001',
    customerName: 'Cairo Construction Co.',
    subject: 'Cement bags damaged during delivery',
    priority: 'critical',
    status: 'open',
    category: 'delivery',
    assignedAgent: 'Sara Ahmed',
    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'tkt-002',
    number: 'TKT-2026-0002',
    customerName: 'Delta Building Materials',
    subject: 'Invoice discrepancy on order ORD-4523',
    priority: 'high',
    status: 'in_progress',
    category: 'payment',
    assignedAgent: 'Mohamed Kamal',
    slaDeadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tkt-003',
    number: 'TKT-2026-0003',
    customerName: 'Nile Development Group',
    subject: 'Request for quote on bulk rebar',
    priority: 'medium',
    status: 'awaiting_customer',
    category: 'quote',
    assignedAgent: 'Sara Ahmed',
    slaDeadline: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tkt-004',
    number: 'TKT-2026-0004',
    customerName: 'Giza Contractors Ltd.',
    subject: 'Account login issue',
    priority: 'low',
    status: 'new',
    category: 'account',
    assignedAgent: null,
    slaDeadline: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tkt-005',
    number: 'TKT-2026-0005',
    customerName: 'Alexandria Steel Works',
    subject: 'Wrong items delivered — received 10mm instead of 12mm rebar',
    priority: 'critical',
    status: 'escalated',
    category: 'delivery',
    assignedAgent: 'Mohamed Kamal',
    slaDeadline: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'tkt-006',
    number: 'TKT-2026-0006',
    customerName: 'Heliopolis Marble & Granite',
    subject: 'Delivery scheduling conflict',
    priority: 'medium',
    status: 'awaiting_internal',
    category: 'delivery',
    assignedAgent: 'Sara Ahmed',
    slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tkt-007',
    number: 'TKT-2026-0007',
    customerName: 'Nasr City Developers',
    subject: 'Product availability question',
    priority: 'low',
    status: 'resolved',
    category: 'product',
    assignedAgent: 'Sara Ahmed',
    slaDeadline: new Date(Date.now() + 40 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tkt-008',
    number: 'TKT-2026-0008',
    customerName: 'October Cement Works',
    subject: 'Supplier delay on PO-2026-0089',
    priority: 'high',
    status: 'awaiting_supplier',
    category: 'order',
    assignedAgent: 'Mohamed Kamal',
    slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  },
]

// ─── Mock WhatsApp Conversations ────────────────────────────

const MOCK_CONVERSATIONS: WhatsAppConversation[] = [
  {
    id: 'wa-001',
    customerName: 'Ahmed El-Sayed',
    customerPhone: '+201012345678',
    lastMessage: 'Where is my order? It was supposed to arrive at 10 AM',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    unresolved: true,
    unread: true,
    aiTier: 1,
    messages: [
      { id: 'm1', sender: 'customer', content: 'Where is my order? It was supposed to arrive at 10 AM', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
      { id: 'm2', sender: 'ai', content: 'Order ORD-4521 is currently in transit. ETA: 11:30 AM. Driver Ahmed Hassan is en route.', timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
    ],
    orderCount: 12,
    openQuotes: 2,
    outstandingInvoices: 1,
  },
  {
    id: 'wa-002',
    customerName: 'Mahmoud Fathy',
    customerPhone: '+201098765432',
    lastMessage: 'I need a quote for 500 bags of cement and 200 rebar bundles',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    unresolved: true,
    unread: true,
    aiTier: 1,
    messages: [
      { id: 'm3', sender: 'customer', content: 'I need a quote for 500 bags of cement and 200 rebar bundles', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
    ],
    orderCount: 3,
    openQuotes: 0,
    outstandingInvoices: 0,
  },
  {
    id: 'wa-003',
    customerName: 'Hassan Ali',
    customerPhone: '+201155556666',
    lastMessage: 'Thank you, the issue has been resolved',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    unresolved: false,
    unread: false,
    aiTier: 0,
    messages: [
      { id: 'm4', sender: 'customer', content: 'What is the status of my invoice INV-2026-0034?', timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      { id: 'm5', sender: 'ai', content: 'Invoice INV-2026-0034 was paid on April 3. Receipt sent to your email.', timestamp: new Date(Date.now() - 59 * 60 * 1000).toISOString() },
      { id: 'm6', sender: 'customer', content: 'Thank you, the issue has been resolved', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
    ],
    orderCount: 8,
    openQuotes: 1,
    outstandingInvoices: 0,
  },
  {
    id: 'wa-004',
    customerName: 'Omar Khalil',
    customerPhone: '+201277778888',
    lastMessage: 'The marble tiles I received have cracks. This is unacceptable!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unresolved: true,
    unread: false,
    aiTier: 2,
    messages: [
      { id: 'm7', sender: 'customer', content: 'The marble tiles I received have cracks. This is unacceptable!', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: 'm8', sender: 'ai', content: 'I apologize for the inconvenience. This has been flagged for immediate human review due to the damage report.', timestamp: new Date(Date.now() - 119 * 60 * 1000).toISOString() },
    ],
    orderCount: 5,
    openQuotes: 0,
    outstandingInvoices: 2,
  },
  {
    id: 'wa-005',
    customerName: 'Tarek Nour',
    customerPhone: '+201399990000',
    lastMessage: 'Is steel available for delivery this week?',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    unresolved: false,
    unread: false,
    aiTier: 0,
    messages: [
      { id: 'm9', sender: 'customer', content: 'Is steel available for delivery this week?', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      { id: 'm10', sender: 'ai', content: 'Yes, 12mm and 16mm rebar are in stock. Earliest delivery: tomorrow. Shall I create a quote?', timestamp: new Date(Date.now() - 179 * 60 * 1000).toISOString() },
      { id: 'm11', sender: 'customer', content: 'Yes please, 100 bundles of 12mm', timestamp: new Date(Date.now() - 175 * 60 * 1000).toISOString() },
    ],
    orderCount: 20,
    openQuotes: 1,
    outstandingInvoices: 0,
  },
  {
    id: 'wa-006',
    customerName: 'Yasser Fahmy',
    customerPhone: '+201511112222',
    lastMessage: 'I want to dispute the charges on my last invoice',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    unresolved: true,
    unread: false,
    aiTier: 2,
    messages: [
      { id: 'm12', sender: 'customer', content: 'I want to dispute the charges on my last invoice', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      { id: 'm13', sender: 'ai', content: 'I understand your concern about the invoice charges. Let me connect you with a billing specialist who can review this.', timestamp: new Date(Date.now() - 239 * 60 * 1000).toISOString() },
    ],
    orderCount: 7,
    openQuotes: 0,
    outstandingInvoices: 3,
  },
]

// ─── Mock Damage Claims ─────────────────────────────────────

const MOCK_CLAIMS: DamageClaim[] = [
  {
    id: 'clm-001',
    deliveryId: 'del-006',
    orderId: 'ORD-4530',
    customerName: 'Heliopolis Marble & Granite',
    claimTier: 'moderate',
    status: 'under_review',
    photos: ['https://cdn.hyperquote.io/claims/clm-001-1.jpg', 'https://cdn.hyperquote.io/claims/clm-001-2.jpg'],
    resolution: null,
    damagePercent: 12,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'clm-002',
    deliveryId: 'del-003',
    orderId: 'ORD-4525',
    customerName: 'Nile Development Group',
    claimTier: 'minor',
    status: 'settled',
    photos: ['https://cdn.hyperquote.io/claims/clm-002-1.jpg'],
    resolution: 'credit_note',
    damagePercent: 3,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'clm-003',
    deliveryId: 'del-009',
    orderId: 'ORD-4536',
    customerName: 'October Cement Works',
    claimTier: 'major',
    status: 'inspection_scheduled',
    photos: ['https://cdn.hyperquote.io/claims/clm-003-1.jpg', 'https://cdn.hyperquote.io/claims/clm-003-2.jpg', 'https://cdn.hyperquote.io/claims/clm-003-3.jpg'],
    resolution: null,
    damagePercent: 35,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
]

// ─── Mock Return Requests ───────────────────────────────────

const MOCK_RETURNS: ReturnRequest[] = [
  {
    id: 'ret-001',
    orderId: 'ORD-4523',
    customerName: 'Delta Building Materials',
    items: ['Steel beam 6m x 5', 'Bolt set x 100'],
    status: 'rma_issued',
    rmaNumber: 'RMA-2026-0001',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ret-002',
    orderId: 'ORD-4527',
    customerName: 'Giza Contractors Ltd.',
    items: ['Cement 50kg x 20'],
    status: 'received',
    rmaNumber: 'RMA-2026-0002',
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ret-003',
    orderId: 'ORD-4540',
    customerName: 'New Cairo Villas Project',
    items: ['Marble tile x 50', 'Grout 25kg x 10'],
    status: 'requested',
    rmaNumber: 'RMA-2026-0003',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
]

// ─── Mock Knowledge Base Articles ───────────────────────────

const MOCK_ARTICLES: KBArticle[] = [
  { id: 'kb-001', title: 'How to check order status', content: 'Navigate to Orders tab and search by order number. Status is shown in the rightmost column. You can also ask the AI assistant to look up any order by number.', category: 'order' },
  { id: 'kb-002', title: 'Quote validity and expiration', content: 'All quotes are valid for 7 calendar days from the date of issue. After expiration, a new quote must be requested. Prices may change based on market conditions.', category: 'quote' },
  { id: 'kb-003', title: 'Delivery time windows', content: 'Standard delivery windows are 2 hours. Heavy equipment deliveries (crane/boom) require a 3-hour window. Cairo deliveries of 5+ tons must be scheduled between midnight and 6 AM due to the truck ban.', category: 'delivery' },
  { id: 'kb-004', title: 'Payment methods accepted', content: 'We accept wire transfer, post-dated cheques, cash on delivery, and letters of credit. Mobile wallet payments are not accepted. All invoices include 14% VAT per Egyptian tax law.', category: 'payment' },
  { id: 'kb-005', title: 'How to file a damage claim', content: 'Report damage via WhatsApp with photos within 24 hours of delivery. System creates a claim linked to your delivery. Claims are classified by tier: Minor (<5%), Moderate (5-20%), Major (>20%).', category: 'delivery' },
  { id: 'kb-006', title: 'Account registration and verification', content: 'New accounts require: company name, tax registration number, commercial register, and authorized signatory details. Verification takes 1-2 business days.', category: 'account' },
  { id: 'kb-007', title: 'Product specifications and certifications', content: 'All products include manufacturer specifications and compliance certifications. Egyptian Standard (ES) and ISO certifications are listed on each product page.', category: 'product' },
  { id: 'kb-008', title: 'Return and RMA process', content: 'To initiate a return: 1) Contact CS via WhatsApp or ticket. 2) Receive RMA number. 3) Schedule pickup or drop-off. 4) Inspection at warehouse. 5) Credit note issued within 3 business days.', category: 'order' },
  { id: 'kb-009', title: 'Platform navigation shortcuts', content: 'Use keyboard shortcuts for faster navigation. Press ? in any module to see available shortcuts. Common: G+W for WhatsApp, G+T for Tickets, N for new ticket.', category: 'platform' },
  { id: 'kb-010', title: 'Credit terms and limits', content: 'Credit terms are assigned based on customer tier: Tier 1 (net-15), Tier 2 (net-30), Tier 3 (net-45). Credit limits are reviewed quarterly based on payment history and order volume.', category: 'payment' },
  { id: 'kb-011', title: 'Bulk order discounts', content: 'Volume discounts are available for orders exceeding specific thresholds per product category. Contact your sales representative or request a quote through the platform for bulk pricing.', category: 'quote' },
  { id: 'kb-012', title: 'ETA e-invoicing requirements', content: 'All invoices are submitted to the Egyptian Tax Authority (ETA) in real-time as required by law. E-invoices are generated in Arabic with Arabic-Indic numerals. UUID receipt numbers are provided for each transaction.', category: 'payment' },
]

// ─── Server Functions ──────────────────────────────────────

export const getTicketQueue = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Ticket[]> => {
    return MOCK_TICKETS
  },
)

export const getTicketDetail = createServerFn({ method: 'GET' })
  .inputValidator((d: { ticketId: string }) => d)
  .handler(
  async ({ data }): Promise<TicketDetail> => {
    const ticket = MOCK_TICKETS.find((t) => t.id === data.ticketId) ?? MOCK_TICKETS[0]!
    return {
      ...ticket,
      description: 'Multiple cement bags (approximately 15 out of 200) arrived with torn packaging and visible moisture damage. The delivery was accepted with noted exceptions. Photos attached showing the damage.',
      attachments: [
        'https://cdn.hyperquote.io/tickets/tkt-001-photo1.jpg',
        'https://cdn.hyperquote.io/tickets/tkt-001-photo2.jpg',
      ],
      activities: [
        { id: 'act-001', type: 'status_change', author: 'System', content: 'Ticket created', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), isInternal: false },
        { id: 'act-002', type: 'assignment', author: 'System', content: 'Assigned to Sara Ahmed (auto-route: delivery category)', timestamp: new Date(Date.now() - 29 * 60 * 1000).toISOString(), isInternal: true },
        { id: 'act-003', type: 'note', author: 'Sara Ahmed', content: 'Checking delivery POD for damage evidence. Driver noted minor chip on 2 slabs.', timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), isInternal: true },
        { id: 'act-004', type: 'comment', author: 'Sara Ahmed', content: 'We apologize for the damage. Our team is reviewing the delivery photos and will provide a resolution within 2 hours.', timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(), isInternal: false },
        { id: 'act-005', type: 'status_change', author: 'Sara Ahmed', content: 'Status changed from New to Open', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), isInternal: false },
      ],
      linkedOrders: ['ORD-4521'],
      linkedQuotes: ['QT-2026-0112'],
      linkedInvoices: ['INV-2026-0034'],
      internalNotes: [
        'Damage appears to be from moisture during loading. Check warehouse conditions.',
        'Supplier has been notified. Awaiting their inspection report.',
      ],
      subTickets: [
        { id: 'sub-001', department: 'Operations', subject: 'Investigate loading damage at warehouse', status: 'in_progress', assignedAgent: 'Khaled Ibrahim' },
        { id: 'sub-002', department: 'Procurement', subject: 'File supplier claim for damaged cement', status: 'new', assignedAgent: null },
        { id: 'sub-003', department: 'Finance', subject: 'Prepare credit note for customer', status: 'new', assignedAgent: null },
      ],
    }
  },
)

export const respondToTicket = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ success: boolean; messageId: string }> => {
    return { success: true, messageId: `msg-${Date.now()}` }
  },
)

export const escalateTicket = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ success: boolean; escalatedTo: string }> => {
    return { success: true, escalatedTo: 'CS Manager' }
  },
)

export const getWhatsAppInbox = createServerFn({ method: 'GET' }).handler(
  async (): Promise<WhatsAppConversation[]> => {
    return MOCK_CONVERSATIONS
  },
)

export const sendWhatsAppReply = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ success: boolean; messageId: string }> => {
    return { success: true, messageId: `wa-msg-${Date.now()}` }
  },
)

export const createDamageClaim = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ success: boolean; claimId: string }> => {
    return { success: true, claimId: `clm-${Date.now()}` }
  },
)

export const createRMA = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ success: boolean; rmaNumber: string }> => {
    const seq = String(Math.floor(Math.random() * 9000) + 1000)
    return { success: true, rmaNumber: `RMA-2026-${seq}` }
  },
)

export const getReturnsClaims = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ claims: DamageClaim[]; returns: ReturnRequest[] }> => {
    return { claims: MOCK_CLAIMS, returns: MOCK_RETURNS }
  },
)

export const getKnowledgeBase = createServerFn({ method: 'GET' }).handler(
  async (): Promise<KBArticle[]> => {
    return MOCK_ARTICLES
  },
)

export const createTicket = createServerFn({ method: 'POST' })
  .inputValidator((d: {
    customerName: string
    subject: string
    description: string
    category: string
    priority: string
  }) => d)
  .handler(
    async ({ data }): Promise<{ success: boolean; ticketId: string; number: string }> => {
      const seq = String(MOCK_TICKETS.length + 1).padStart(4, '0')
      return { success: true, ticketId: `tkt-${Date.now()}`, number: `TKT-2026-${seq}` }
    },
  )

export const assignTicket = createServerFn({ method: 'POST' })
  .inputValidator((d: { ticketId: string; agentName: string }) => d)
  .handler(
    async ({ data }): Promise<{ success: boolean; assignedTo: string }> => {
      return { success: true, assignedTo: data.agentName }
    },
  )

export const resolveTicket = createServerFn({ method: 'POST' })
  .inputValidator((d: { ticketId: string; resolution: string }) => d)
  .handler(
    async ({ data }): Promise<{ success: boolean }> => {
      return { success: true }
    },
  )

export const updateTicketStatus = createServerFn({ method: 'POST' })
  .inputValidator((d: { ticketId: string; status: string }) => d)
  .handler(
    async ({ data }): Promise<{ success: boolean }> => {
      return { success: true }
    },
  )
