import { createServerFn } from '@tanstack/react-start'
import { db, type CustomerRow } from '../db/db'
import type {
  Conversation,
  InboxMetrics,
  Customer,
  Message,
  ChannelType,
} from '../../types/customer-service'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function future(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

// ─── Customer from DB row ─────────────────────────────────────────────────────

/** Arabic company names — keyed by DB id */
const ARABIC_NAMES: Record<string, { name: string; company: string }> = {
  'cust-001': { name: 'حسام الدين', company: 'النور للإنشاءات' },
  'cust-003': { name: 'مصطفى السيد', company: 'بناة الأهرام' },
  'cust-006': { name: 'ريم عبد العزيز', company: 'المعادي للهندسة' },
}

function customerFromRow(row: CustomerRow): Customer {
  const ar = ARABIC_NAMES[row.id]
  return {
    id: row.id,
    name: row.contactName,
    nameAr: ar?.name ?? row.contactName,
    email: row.email,
    phone: row.phone,
    company: row.companyName,
    companyAr: ar?.company ?? row.companyName,
    totalConversations: row.orderCount,
    firstContactAt: row.joinedAt,
    satisfactionAvg: row.paymentHistory === 'excellent' ? 4.6 : row.paymentHistory === 'good' ? 4.0 : 3.2,
  }
}

function getCustomer(id: string): Customer {
  const row = db.customers.get(id)
  if (!row) throw new Error(`Customer ${id} not found in DB`)
  return customerFromRow(row)
}

// Lazily resolved so DB is initialized before access
let _customers: Record<string, Customer> | null = null
function customers(): Record<string, Customer> {
  if (!_customers) {
    _customers = {
      'cust-001': getCustomer('cust-001'),
      'cust-003': getCustomer('cust-003'),
      'cust-006': getCustomer('cust-006'),
    }
  }
  return _customers
}

// ─── Mock Messages & Conversations ────────────────────────────────────────────

function msg(
  id: string,
  conversationId: string,
  channel: ChannelType,
  direction: 'inbound' | 'outbound',
  content: string,
  senderName: string,
  minutesAgo: number,
  read = true,
  metadata: Record<string, unknown> = {},
): Message {
  return {
    id,
    conversationId,
    channel,
    direction,
    content,
    senderName,
    timestamp: ago(minutesAgo),
    attachments: [],
    read,
    metadata,
  }
}

/** Email message with from/to/cc/subject metadata */
function emailMsg(
  id: string,
  conversationId: string,
  direction: 'inbound' | 'outbound',
  content: string,
  senderName: string,
  minutesAgo: number,
  meta: { from: string; to: string; cc?: string; subject: string },
  read = true,
): Message {
  return msg(id, conversationId, 'email', direction, content, senderName, minutesAgo, read, {
    from: meta.from,
    to: meta.to,
    cc: meta.cc ?? null,
    subject: meta.subject,
  })
}

const MOCK_CONVERSATIONS: Conversation[] = [
  // ── WhatsApp: urgent delivery issue ────────────────────────
  {
    id: 'conv-001',
    customer: customers()['cust-001']!,
    channel: 'whatsapp',
    status: 'open',
    priority: 'urgent',
    subject: 'Order delivery delayed — site crew waiting',
    lastMessagePreview: 'Where is my order? The site crew has been waiting since 10 AM',
    lastMessageAt: ago(3),
    unreadCount: 2,
    assignedTo: 'usr-agent-01',
    assignedToName: 'Sara Ahmed',
    tags: ['delivery', 'escalation'],
    messages: [
      msg('m-001', 'conv-001', 'whatsapp', 'inbound', 'Good morning, I placed order ORD-4521 yesterday and was told delivery at 10 AM. It is now 10:45 and no one has arrived.', 'Ahmed El-Sayed', 45),
      msg('m-002', 'conv-001', 'whatsapp', 'outbound', 'Good morning Ahmed. Let me check the status of your delivery right away.', 'Sara Ahmed', 42),
      msg('m-003', 'conv-001', 'whatsapp', 'outbound', 'The truck left the warehouse at 9:30 AM. There is heavy traffic on the Ring Road. Updated ETA is 11:15 AM. I apologize for the delay.', 'Sara Ahmed', 40),
      msg('m-004', 'conv-001', 'whatsapp', 'inbound', 'The crew is idle. Every hour costs me money. This is the second time this month.', 'Ahmed El-Sayed', 20),
      msg('m-005', 'conv-001', 'whatsapp', 'inbound', 'Where is my order? The site crew has been waiting since 10 AM', 'Ahmed El-Sayed', 3, false),
    ],
    linkedOrders: [
      { id: 'ord-4521', displayId: 'ORD-4521', rfqId: 'rfq-008', status: 'in_transit', totalAmount: 187500, currency: 'EGP', createdAt: ago(24 * 60) },
      { id: 'ord-4498', displayId: 'ORD-4498', rfqId: 'rfq-008', status: 'delivered', totalAmount: 95200, currency: 'EGP', createdAt: ago(7 * 24 * 60) },
    ],
    linkedQuotes: [
      { id: 'qt-0156', displayId: 'QT-0156', status: 'accepted', totalAmount: 187500, currency: 'EGP', createdAt: ago(3 * 24 * 60) },
    ],
    createdAt: ago(45),
    ticketId: null,
    slaDeadline: future(15),
    slaBreached: false,
  },

  // ── Email: invoice discrepancy ─────────────────────────────
  {
    id: 'conv-002',
    customer: customers()['cust-003']!,
    channel: 'email',
    status: 'open',
    priority: 'high',
    subject: 'Invoice discrepancy on ORD-4523 — charged for 200 bags, received 180',
    lastMessagePreview: 'Please see attached delivery receipt showing 180 bags, not 200 as invoiced.',
    lastMessageAt: ago(35),
    unreadCount: 1,
    assignedTo: 'usr-agent-02',
    assignedToName: 'Mohamed Kamal',
    tags: ['payment', 'invoice'],
    messages: [
      emailMsg('m-010', 'conv-002', 'inbound', 'Dear HyperQuote Support,\n\nI am writing regarding invoice INV-2026-0089 for order ORD-4523. The invoice charges for 200 bags of Portland cement at LE 125/bag (LE 25,000 total), but we only received 180 bags. The delivery receipt signed by your driver confirms the 180-bag count.\n\nPlease adjust the invoice to reflect the actual quantity delivered (180 bags = LE 22,500) and issue a corrected invoice at your earliest convenience.\n\nPlease see attached delivery receipt showing 180 bags, not 200 as invoiced.\n\nRegards,\nMahmoud Fathy\nDelta Building Materials', 'Mahmoud Fathy', 120, { from: 'mahmoud@deltabuilding.eg', to: 'support@hyperquote.io', subject: 'Invoice discrepancy on ORD-4523 — charged for 200 bags, received 180' }),
      emailMsg('m-011', 'conv-002', 'outbound', 'Dear Mr. Fathy,\n\nThank you for bringing this to our attention. I have verified the delivery receipt and confirmed the discrepancy. A corrected invoice for 180 bags (LE 22,500) will be issued within 24 hours.\n\nI have also escalated this to our warehouse team to investigate why the short delivery occurred.\n\nPlease accept our apologies for the inconvenience.\n\nBest regards,\nMohamed Kamal\nHyperQuote Support', 'Mohamed Kamal', 90, { from: 'support@hyperquote.io', to: 'mahmoud@deltabuilding.eg', subject: 'Re: Invoice discrepancy on ORD-4523 — charged for 200 bags, received 180' }),
      emailMsg('m-012', 'conv-002', 'inbound', 'Thank you Mohamed. Please also confirm whether the remaining 20 bags will be delivered or if a credit note will be issued instead.\n\nRegards,\nMahmoud Fathy', 'Mahmoud Fathy', 35, { from: 'mahmoud@deltabuilding.eg', to: 'support@hyperquote.io', subject: 'Re: Invoice discrepancy on ORD-4523 — charged for 200 bags, received 180' }, false),
    ],
    linkedOrders: [
      { id: 'ord-4523', displayId: 'ORD-4523', rfqId: 'rfq-003', status: 'delivered', totalAmount: 25000, currency: 'EGP', createdAt: ago(5 * 24 * 60) },
    ],
    linkedQuotes: [],
    createdAt: ago(120),
    ticketId: 'TKT-2026-0002',
    slaDeadline: future(300),
    slaBreached: false,
  },

  // ── Email: product quality complaint (tracked as ticket) ────
  {
    id: 'conv-003',
    customer: customers()['cust-003']!,
    channel: 'email',
    status: 'open',
    priority: 'high',
    subject: 'Cracked marble tiles in latest delivery — 15 of 50 damaged',
    lastMessagePreview: 'Photos attached showing cracks across 15 tiles. This batch was for the VIP lobby.',
    lastMessageAt: ago(90),
    unreadCount: 0,
    assignedTo: 'usr-agent-01',
    assignedToName: 'Sara Ahmed',
    tags: ['quality', 'damage-claim', 'vip'],
    messages: [
      emailMsg('m-020', 'conv-003', 'inbound', 'Dear HyperQuote Support,\n\nWe received delivery DEL-0089 today containing 50 Carrara marble tiles (60x60cm). Upon unpacking, 15 tiles have visible hairline cracks running through them. These tiles were ordered specifically for a VIP lobby installation scheduled for next week.\n\nPhotos attached showing the damage. We need either immediate replacement or a full credit for the damaged tiles. Time is critical — installation crew is booked.', 'Omar Khalil', 180, { from: 'omar@niledevelopment.eg', to: 'support@hyperquote.io', subject: 'Cracked marble tiles in latest delivery — 15 of 50 damaged' }),
      emailMsg('m-021', 'conv-003', 'outbound', 'Mr. Khalil, thank you for reporting this with photos. I have initiated a damage claim (CLM-003) and escalated it as major due to the VIP timeline.\n\nI am checking stock availability for replacement tiles now. Will update you within 2 hours.\n\nPriority: HIGH — VIP project timeline at risk.\n\nBest regards,\nSara Ahmed\nHyperQuote Support', 'Sara Ahmed', 150, { from: 'support@hyperquote.io', to: 'omar@niledevelopment.eg', subject: 'Re: Cracked marble tiles in latest delivery — 15 of 50 damaged' }),
      emailMsg('m-022', 'conv-003', 'outbound', 'Update: We have 22 matching Carrara tiles in our Badr City warehouse. I have reserved them for you. We can deliver replacement tiles tomorrow morning (Thursday) before 9 AM.\n\nFor the remaining 15 tiles to complete the full replacement, our supplier confirms availability by Saturday.\n\nShall I proceed with the 22-tile delivery tomorrow and schedule the remainder for Saturday?\n\nBest regards,\nSara Ahmed', 'Sara Ahmed', 90, { from: 'support@hyperquote.io', to: 'omar@niledevelopment.eg', subject: 'Re: Cracked marble tiles in latest delivery — 15 of 50 damaged' }),
    ],
    linkedOrders: [
      { id: 'ord-4536', displayId: 'ORD-4536', rfqId: 'rfq-003', status: 'evaluated', totalAmount: 984301, currency: 'EGP', createdAt: ago(10 * 24 * 60) },
    ],
    linkedQuotes: [
      { id: 'qt-001', displayId: 'QT-2026-00523', status: 'sent', totalAmount: 984301, currency: 'EGP', createdAt: ago(24 * 60) },
    ],
    createdAt: ago(180),
    ticketId: 'TKT-2026-0003',
    slaDeadline: future(60),
    slaBreached: false,
  },

  // ── Live Chat: quick question ──────────────────────────────
  {
    id: 'conv-004',
    customer: customers()['cust-006']!,
    channel: 'chat',
    status: 'open',
    priority: 'low',
    subject: 'Account login issue',
    lastMessagePreview: 'I cannot log in to the portal. It says my password is expired.',
    lastMessageAt: ago(8),
    unreadCount: 1,
    assignedTo: null,
    assignedToName: null,
    tags: ['account'],
    messages: [
      msg('m-030', 'conv-004', 'chat', 'inbound', 'Hello, I cannot log in to the portal. It says my password is expired but I changed it last week.', 'Hassan Ali', 8, false),
    ],
    linkedOrders: [],
    linkedQuotes: [],
    createdAt: ago(8),
    ticketId: null,
    slaDeadline: future(480),
    slaBreached: false,
  },

  // ── WhatsApp: bulk quote request ───────────────────────────
  {
    id: 'conv-005',
    customer: customers()['cust-001']!,
    channel: 'whatsapp',
    status: 'pending',
    priority: 'medium',
    subject: 'Quote request — 500t rebar + 200t cement for Q3 project',
    lastMessagePreview: 'Yes please, 100 bundles of 12mm. Can we also add 16mm to the quote?',
    lastMessageAt: ago(175),
    unreadCount: 0,
    assignedTo: 'usr-agent-02',
    assignedToName: 'Mohamed Kamal',
    tags: ['quote', 'bulk'],
    messages: [
      msg('m-040', 'conv-005', 'whatsapp', 'inbound', 'Is 12mm and 16mm rebar available for delivery this week? We need to stock up for a Q3 project.', 'Tarek Nour', 195),
      msg('m-041', 'conv-005', 'whatsapp', 'outbound', 'Good morning Mr. Nour. Yes, both 12mm and 16mm rebar are in stock. Earliest delivery is tomorrow. Shall I create a quote?', 'Mohamed Kamal', 190),
      msg('m-042', 'conv-005', 'whatsapp', 'inbound', 'Yes please, 100 bundles of 12mm. Can we also add 16mm to the quote?', 'Tarek Nour', 175),
    ],
    linkedOrders: [
      { id: 'ord-4510', displayId: 'ORD-4510', rfqId: 'rfq-008', status: 'delivered', totalAmount: 342000, currency: 'EGP', createdAt: ago(30 * 24 * 60) },
      { id: 'ord-4485', displayId: 'ORD-4485', rfqId: 'rfq-008', status: 'delivered', totalAmount: 215000, currency: 'EGP', createdAt: ago(60 * 24 * 60) },
    ],
    linkedQuotes: [
      { id: 'qt-0190', displayId: 'QT-0190', status: 'draft', totalAmount: 0, currency: 'EGP', createdAt: ago(170) },
    ],
    createdAt: ago(195),
    ticketId: null,
    slaDeadline: future(720),
    slaBreached: false,
  },

  // ── Email: payment dispute ─────────────────────────────────
  {
    id: 'conv-006',
    customer: customers()['cust-006']!,
    channel: 'email',
    status: 'open',
    priority: 'high',
    subject: 'Disputing charges on INV-2026-0102 — duplicate billing',
    lastMessagePreview: 'I want to dispute the charges on my last invoice. It appears we were billed twice for delivery.',
    lastMessageAt: ago(240),
    unreadCount: 0,
    assignedTo: 'usr-agent-02',
    assignedToName: 'Mohamed Kamal',
    tags: ['payment', 'dispute'],
    messages: [
      emailMsg('m-050', 'conv-006', 'inbound', 'To whom it may concern,\n\nInvoice INV-2026-0102 includes two delivery charges of LE 2,500 each. We should only have been charged once as both items were part of the same delivery (DEL-0094).\n\nPlease investigate and issue a corrected invoice.\n\nYasser Fahmy\nOctober Cement Works', 'Yasser Fahmy', 300, { from: 'yasser@october-cement.eg', to: 'support@hyperquote.io', subject: 'Disputing charges on INV-2026-0102 — duplicate billing' }),
      emailMsg('m-051', 'conv-006', 'outbound', 'Dear Mr. Fahmy,\n\nThank you for flagging this. I can confirm that delivery DEL-0094 was a single trip, so the double charge is indeed an error.\n\nI have submitted a correction request to our finance team. A revised invoice will be issued within 48 hours, and the LE 2,500 overcharge will be applied as a credit to your next order.\n\nApologies for the inconvenience.\n\nMohamed Kamal\nHyperQuote Support', 'Mohamed Kamal', 240, { from: 'support@hyperquote.io', to: 'yasser@october-cement.eg', subject: 'Re: Disputing charges on INV-2026-0102 — duplicate billing' }),
    ],
    linkedOrders: [
      { id: 'ord-4530', displayId: 'ORD-4530', rfqId: 'rfq-007', status: 'delivered', totalAmount: 156000, currency: 'EGP', createdAt: ago(14 * 24 * 60) },
    ],
    linkedQuotes: [],
    createdAt: ago(300),
    ticketId: 'TKT-2026-0006',
    slaDeadline: future(180),
    slaBreached: false,
  },

  // ── Email: resolved damage claim (tracked as ticket) ────────
  {
    id: 'conv-007',
    customer: customers()['cust-003']!,
    channel: 'email',
    status: 'resolved',
    priority: 'medium',
    subject: 'Granite slab chipped during unloading — CLM-002',
    lastMessagePreview: 'Credit note CN-0045 has been applied to your account. Thank you for your patience.',
    lastMessageAt: ago(48 * 60),
    unreadCount: 0,
    assignedTo: 'usr-agent-01',
    assignedToName: 'Sara Ahmed',
    tags: ['quality', 'resolved'],
    messages: [
      emailMsg('m-060', 'conv-007', 'inbound', 'Dear Support,\n\nTwo granite slabs were chipped during unloading at our site. The driver confirmed the damage occurred during handling. Photos attached.\n\nRegards,\nKarim Mansour', 'Karim Mansour', 72 * 60, { from: 'karim@heliopolismarble.eg', to: 'support@hyperquote.io', subject: 'Granite slab chipped during unloading — CLM-002' }),
      emailMsg('m-061', 'conv-007', 'outbound', 'Dear Mr. Mansour,\n\nDamage claim CLM-002 created. Since the damage is minor (under 5%), this qualifies for automatic credit. Processing now.\n\nBest regards,\nSara Ahmed', 'Sara Ahmed', 71 * 60, { from: 'support@hyperquote.io', to: 'karim@heliopolismarble.eg', subject: 'Re: Granite slab chipped during unloading — CLM-002' }),
      emailMsg('m-062', 'conv-007', 'outbound', 'Dear Mr. Mansour,\n\nCredit note CN-0045 has been applied to your account. Thank you for your patience.\n\nBest regards,\nSara Ahmed', 'Sara Ahmed', 48 * 60, { from: 'support@hyperquote.io', to: 'karim@heliopolismarble.eg', subject: 'Re: Granite slab chipped during unloading — CLM-002' }),
    ],
    linkedOrders: [
      { id: 'ord-4525', displayId: 'ORD-4525', rfqId: 'rfq-002', status: 'delivered', totalAmount: 89000, currency: 'EGP', createdAt: ago(20 * 24 * 60) },
    ],
    linkedQuotes: [],
    createdAt: ago(72 * 60),
    ticketId: 'TKT-2026-0007',
    slaDeadline: null,
    slaBreached: false,
  },

  // ── Chat: new customer onboarding ──────────────────────────
  {
    id: 'conv-008',
    customer: customers()['cust-006']!,
    channel: 'chat',
    status: 'pending',
    priority: 'low',
    subject: 'New account verification — documents submitted',
    lastMessagePreview: 'I have uploaded the tax registration and commercial register. How long does verification take?',
    lastMessageAt: ago(360),
    unreadCount: 0,
    assignedTo: 'usr-agent-01',
    assignedToName: 'Sara Ahmed',
    tags: ['account', 'onboarding'],
    messages: [
      msg('m-070', 'conv-008', 'chat', 'inbound', 'Hello, I just registered on the platform. I need to submit my company documents for verification.', 'Nadia Ibrahim', 380),
      msg('m-071', 'conv-008', 'chat', 'outbound', 'Welcome to HyperQuote! You can upload your documents through the portal under Account > Verification. We need your tax registration and commercial register.', 'Sara Ahmed', 375),
      msg('m-072', 'conv-008', 'chat', 'inbound', 'I have uploaded the tax registration and commercial register. How long does verification take?', 'Nadia Ibrahim', 360),
      msg('m-073', 'conv-008', 'chat', 'outbound', 'Thank you Nadia. Verification typically takes 1-2 business days. I will notify you as soon as your account is approved. In the meantime, you can browse our catalog.', 'Sara Ahmed', 355),
    ],
    linkedOrders: [],
    linkedQuotes: [],
    createdAt: ago(380),
    ticketId: null,
    slaDeadline: null,
    slaBreached: false,
  },

  // ── WhatsApp: SLA breached ─────────────────────────────────
  {
    id: 'conv-009',
    customer: customers()['cust-001']!,
    channel: 'whatsapp',
    status: 'open',
    priority: 'urgent',
    subject: 'Wrong rebar size delivered — 10mm instead of 12mm',
    lastMessagePreview: 'This is unacceptable. I need the correct size TODAY or I am cancelling the account.',
    lastMessageAt: ago(25),
    unreadCount: 3,
    assignedTo: 'usr-agent-02',
    assignedToName: 'Mohamed Kamal',
    tags: ['delivery', 'wrong-item', 'escalation'],
    messages: [
      msg('m-080', 'conv-009', 'whatsapp', 'inbound', 'We just received the rebar delivery but these are 10mm, not 12mm as ordered. My engineer confirmed. This cannot be used on our project.', 'Tarek Nour', 180),
      msg('m-081', 'conv-009', 'whatsapp', 'outbound', 'I sincerely apologize, Mr. Nour. Let me verify with the warehouse immediately.', 'Mohamed Kamal', 170),
      msg('m-082', 'conv-009', 'whatsapp', 'outbound', 'Confirmed — the warehouse shipped the wrong batch. We have 12mm in stock and are loading a replacement truck now. ETA to your site: 3 hours.', 'Mohamed Kamal', 150),
      msg('m-083', 'conv-009', 'whatsapp', 'inbound', 'Three hours? My crew is standing idle right now. This already cost me half a day.', 'Tarek Nour', 60),
      msg('m-084', 'conv-009', 'whatsapp', 'inbound', 'It has been 2 hours and still nothing. Where is the truck?', 'Tarek Nour', 30, false),
      msg('m-085', 'conv-009', 'whatsapp', 'inbound', 'This is unacceptable. I need the correct size TODAY or I am cancelling the account.', 'Tarek Nour', 25, false),
    ],
    linkedOrders: [
      { id: 'ord-4540', displayId: 'ORD-4540', rfqId: 'rfq-008', status: 'in_transit', totalAmount: 284000, currency: 'EGP', createdAt: ago(2 * 24 * 60) },
    ],
    linkedQuotes: [],
    createdAt: ago(180),
    ticketId: 'TKT-2026-0009',
    slaDeadline: ago(30),
    slaBreached: true,
  },

  // ── Email: scheduled delivery coordination ─────────────────
  {
    id: 'conv-010',
    customer: customers()['cust-003']!,
    channel: 'email',
    status: 'pending',
    priority: 'medium',
    subject: 'Delivery scheduling for next week — 3 sites',
    lastMessagePreview: 'Can we coordinate deliveries to all three sites on Tuesday? Details attached.',
    lastMessageAt: ago(480),
    unreadCount: 0,
    assignedTo: 'usr-agent-01',
    assignedToName: 'Sara Ahmed',
    tags: ['delivery', 'scheduling'],
    messages: [
      emailMsg('m-090', 'conv-010', 'inbound', 'Dear Support,\n\nWe have three active projects and need to schedule deliveries for next Tuesday:\n\n1. Heliopolis showroom — 20 marble slabs (morning)\n2. Nasr City villa — 15 granite countertops (midday)\n3. New Cairo office — 30 floor tiles (afternoon)\n\nCan we coordinate all three in one day? This would save us significant logistics costs.\n\nBest,\nKarim Mansour', 'Karim Mansour', 600, { from: 'karim@heliopolismarble.eg', to: 'support@hyperquote.io', subject: 'Delivery scheduling for next week — 3 sites' }),
      emailMsg('m-091', 'conv-010', 'outbound', 'Dear Mr. Mansour,\n\nI have checked with our dispatch team. All three deliveries can be accommodated on Tuesday with the following windows:\n\n1. Heliopolis showroom: 8:00–10:00 AM\n2. Nasr City villa: 11:30 AM–1:30 PM\n3. New Cairo office: 3:00–5:00 PM\n\nShall I confirm these slots? Please note the New Cairo delivery requires a crane truck for the floor tiles.\n\nBest regards,\nSara Ahmed', 'Sara Ahmed', 480, { from: 'support@hyperquote.io', to: 'karim@heliopolismarble.eg', cc: 'dispatch@hyperquote.io', subject: 'Re: Delivery scheduling for next week — 3 sites' }),
    ],
    linkedOrders: [
      { id: 'ord-4545', displayId: 'ORD-4545', rfqId: 'rfq-002', status: 'warehouse', totalAmount: 762800, currency: 'EGP', createdAt: ago(3 * 24 * 60) },
    ],
    linkedQuotes: [],
    createdAt: ago(600),
    ticketId: null,
    slaDeadline: future(1200),
    slaBreached: false,
  },

  // ── Email: closed account issue (tracked as ticket) ─────────
  {
    id: 'conv-011',
    customer: customers()['cust-006']!,
    channel: 'email',
    status: 'closed',
    priority: 'low',
    subject: 'Cannot access order history — portal shows blank page',
    lastMessagePreview: 'Working now. Thank you for the quick fix.',
    lastMessageAt: ago(24 * 60),
    unreadCount: 0,
    assignedTo: 'usr-agent-01',
    assignedToName: 'Sara Ahmed',
    tags: ['platform', 'bug'],
    messages: [
      emailMsg('m-100', 'conv-011', 'inbound', 'Hello,\n\nWhen I click on Order History in my portal, the page loads blank. No orders showing. I have 5 active orders that should appear. Browser: Chrome on Windows.\n\nHassan Ali', 'Hassan Ali', 30 * 60, { from: 'hassan@gizacontractors.eg', to: 'support@hyperquote.io', subject: 'Cannot access order history — portal shows blank page' }),
      emailMsg('m-101', 'conv-011', 'outbound', 'Dear Mr. Ali,\n\nThank you for reporting this. We identified a caching issue affecting some accounts. I have cleared your session cache on our end. Please try logging out and back in.\n\nBest regards,\nSara Ahmed', 'Sara Ahmed', 28 * 60, { from: 'support@hyperquote.io', to: 'hassan@gizacontractors.eg', subject: 'Re: Cannot access order history — portal shows blank page' }),
      emailMsg('m-102', 'conv-011', 'inbound', 'Working now. Thank you for the quick fix.\n\nHassan Ali', 'Hassan Ali', 24 * 60, { from: 'hassan@gizacontractors.eg', to: 'support@hyperquote.io', subject: 'Re: Cannot access order history — portal shows blank page' }),
    ],
    linkedOrders: [],
    linkedQuotes: [],
    createdAt: ago(30 * 60),
    ticketId: 'TKT-2026-0011',
    slaDeadline: null,
    slaBreached: false,
  },

  // ── Live Chat: product inquiry ─────────────────────────────
  {
    id: 'conv-012',
    customer: customers()['cust-001']!,
    channel: 'chat',
    status: 'resolved',
    priority: 'low',
    subject: 'Price inquiry — bulk Portland cement',
    lastMessagePreview: 'Thank you for the quote. I will discuss with my team and get back to you.',
    lastMessageAt: ago(6 * 60),
    unreadCount: 0,
    assignedTo: 'usr-agent-02',
    assignedToName: 'Mohamed Kamal',
    tags: ['pricing', 'quote'],
    messages: [
      msg('m-110', 'conv-012', 'chat', 'inbound', 'What is the current price for Portland cement 50kg bags? I need around 1000 bags for a project starting next month.', 'Ahmed El-Sayed', 7 * 60),
      msg('m-111', 'conv-012', 'chat', 'outbound', 'Current price for Portland cement 50kg bags is LE 125/bag for orders under 500, and LE 118/bag for orders of 500+. For 1000 bags, your total would be LE 118,000 before delivery.', 'Mohamed Kamal', 6.5 * 60),
      msg('m-112', 'conv-012', 'chat', 'inbound', 'And what about delivery to 6th of October City?', 'Ahmed El-Sayed', 6.3 * 60),
      msg('m-113', 'conv-012', 'chat', 'outbound', 'Delivery to 6th of October for this volume would be LE 3,500. Total: LE 121,500. Delivery within 48 hours of order confirmation. Shall I create a formal quote?', 'Mohamed Kamal', 6.1 * 60),
      msg('m-114', 'conv-012', 'chat', 'inbound', 'Thank you for the quote. I will discuss with my team and get back to you.', 'Ahmed El-Sayed', 6 * 60),
    ],
    linkedOrders: [],
    linkedQuotes: [
      { id: 'qt-0195', displayId: 'QT-0195', status: 'draft', totalAmount: 121500, currency: 'EGP', createdAt: ago(6 * 60) },
    ],
    createdAt: ago(7 * 60),
    ticketId: null,
    slaDeadline: null,
    slaBreached: false,
  },
]

// ─── Computed Metrics ─────────────────────────────────────────────────────────

function computeMetrics(conversations: Conversation[]): InboxMetrics {
  const open = conversations.filter((c) => c.status === 'open')
  const pending = conversations.filter((c) => c.status === 'pending')
  const urgent = conversations.filter((c) => c.priority === 'urgent' && c.status !== 'resolved' && c.status !== 'closed')
  const withSla = conversations.filter((c) => c.slaDeadline !== null)
  const compliant = withSla.filter((c) => !c.slaBreached)

  return {
    openCount: open.length,
    pendingCount: pending.length,
    urgentCount: urgent.length,
    avgResponseMinutes: 4,
    slaCompliancePercent: withSla.length > 0 ? Math.round((compliant.length / withSla.length) * 100) : 100,
  }
}

// ─── Server Functions ─────────────────────────────────────────────────────────

export const getConversations = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ conversations: Conversation[]; metrics: InboxMetrics }> => {
    return {
      conversations: MOCK_CONVERSATIONS,
      metrics: computeMetrics(MOCK_CONVERSATIONS),
    }
  },
)

export const getConversation = createServerFn({ method: 'GET' })
  .inputValidator((d: { conversationId: string }) => d)
  .handler(
    async ({ data }): Promise<Conversation | null> => {
      return MOCK_CONVERSATIONS.find((c) => c.id === data.conversationId) ?? null
    },
  )

export const sendReply = createServerFn({ method: 'POST' })
  .inputValidator((d: { conversationId: string; channel: ChannelType; content: string }) => d)
  .handler(
    async ({ data }): Promise<{ success: boolean; messageId: string }> => {
      return { success: true, messageId: `msg-${Date.now()}` }
    },
  )

export const updateConversationStatus = createServerFn({ method: 'POST' })
  .inputValidator((d: { conversationId: string; status: string }) => d)
  .handler(
    async (): Promise<{ success: boolean }> => {
      return { success: true }
    },
  )

export const assignConversation = createServerFn({ method: 'POST' })
  .inputValidator((d: { conversationId: string; agentId: string }) => d)
  .handler(
    async ({ data }): Promise<{ success: boolean; assignedTo: string }> => {
      return { success: true, assignedTo: data.agentId }
    },
  )
