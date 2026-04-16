import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db, hoursSince } from '../db/db'
import type { TruckRow } from '../db/db'

/**
 * Warehouse dock flow — resumable 4-stage wizard per order.
 *
 * Source of truth is `order_reports.sections.warehouse` — a sparse blob
 * that grows as the advisor walks through the stages. Every mutation
 * re-reads the current blob, merges, and writes back, so an advisor can
 * drop their tablet mid-load and pick up exactly where they left off.
 *
 * Stages (derived at read time from what's already in the blob):
 *   1. unstarted       — no truck assigned yet
 *   2. loading         — at least one truck assigned, items being checked off
 *   3. awaiting_signoff — every line item checked across all trucks
 *   4. complete        — advisor + quality signoff recorded, ready for dispatch
 *
 * Dispatch hand-off: passing an order advances `currentStage` to
 * 'warehouse' on the order report so downstream (dispatch panel) picks
 * it up.
 */

// ─── Wizard state shape (lives inside report.sections.warehouse) ──

export interface TruckAssignment {
  truckId: string
  plateNumber: string
  driverName: string
  capacityTons: number
  /** productSlug entries that have been physically loaded onto this truck. */
  itemsLoaded: string[]
  assignedAt: string
}

export type SecurityMethod = 'password' | 'qr'

export interface WarehouseSignoff {
  advisorName: string
  qualityPass: boolean
  proofUrl: string
  securityMethod: SecurityMethod
  /** The token captured from either a typed password or a scanned QR. */
  securityToken: string
  signedAt: string
}

/**
 * Audit record for a failed quality inspection. The advisor writes one
 * of these every time they reject a load during signoff. The order
 * bounces back to the loading stage and the advisor fixes + retries.
 */
export interface FailedInspection {
  advisorName: string
  reason: string
  proofUrl: string
  securityMethod: SecurityMethod
  securityToken: string
  failedAt: string
}

export interface WarehouseSection {
  truckAssignments: TruckAssignment[]
  /**
   * Flipped to true when the advisor explicitly presses "Next → Signoff"
   * after loading every item. Derived stage only advances to
   * `awaiting_signoff` when this is true — the transition is never
   * automatic on the last checkbox.
   */
  advisorMarkedReady: boolean
  /** Audit trail of prior failed inspections. Append-only. */
  failedInspections: FailedInspection[]
  signoff: WarehouseSignoff | null
  passedAt: string | null
}

export type WarehouseStage =
  | 'unstarted'
  | 'loading'
  | 'awaiting_signoff'
  | 'complete'

// ─── View shapes returned to the client ──

export interface WarehouseItemView {
  productSlug: string
  productName: string
  sku: string
  unit: string
  quantity: number
  /** Which truck (if any) this item has been loaded onto. */
  loadedOnTruckId: string | null
}

export interface WarehouseTruckView {
  id: string
  plateNumber: string
  driverName: string
  capacityTons: number
  bodyType: string
  status: string
}

export interface WarehouseOrderRowView {
  quoteId: string
  quoteNumber: string
  customerName: string
  customerTier: string
  deliveryAddress: string
  deliveryCity: string
  deliveryUrgencyDays: number
  itemCount: number
  totalValue: number
  approvedHoursAgo: number
  stage: WarehouseStage
  loadedCount: number
  truckCount: number
}

export interface WarehouseOrderDetailView extends WarehouseOrderRowView {
  rfqId: string
  customerPoNumber: string | null
  items: WarehouseItemView[]
  truckAssignments: TruckAssignment[]
  signoff: WarehouseSignoff | null
  failedInspections: FailedInspection[]
}

/**
 * Mock employee credential. In production this gets replaced with a
 * lookup against db.employees by token → employeeId, validated against
 * their real password hash or QR payload. For now it's a fixed value
 * so the dev experience is predictable: anyone testing the flow types
 * `1234` (password) or scans a badge encoded as `1234`.
 */
const MOCK_ADVISOR_TOKEN = '1234' as const

// ─── Helpers ──────────────────────────────────────────────

function readWarehouseSection(rfqId: string): WarehouseSection {
  const report = db.orderReports.forRfq(rfqId)
  const raw = (report?.sections.warehouse ?? null) as WarehouseSection | null
  return {
    truckAssignments: raw?.truckAssignments ?? [],
    advisorMarkedReady: raw?.advisorMarkedReady ?? false,
    failedInspections: raw?.failedInspections ?? [],
    signoff: raw?.signoff ?? null,
    passedAt: raw?.passedAt ?? null,
  }
}

function writeWarehouseSection(rfqId: string, next: WarehouseSection) {
  db.orderReports.ensureForRfq(rfqId)
  db.orderReports.appendSection(rfqId, 'warehouse', next as unknown as Record<string, unknown>)
}

function deriveStage(section: WarehouseSection, totalItems: number): WarehouseStage {
  if (section.passedAt) return 'complete'
  if (section.signoff) return 'complete'
  if (section.truckAssignments.length === 0) return 'unstarted'
  // Stage only advances to signoff after the advisor explicitly confirms
  // via markReadyForSignoff — "don't advance right away" is the rule.
  if (section.advisorMarkedReady) return 'awaiting_signoff'
  return 'loading'
}

function isWarehouseEligible(quoteId: string): boolean {
  const quote = db.quotes.get(quoteId)
  if (!quote || quote.status !== 'accepted') return false
  if (quote.paymentStatus === 'unpaid') return false
  const report = db.orderReports.forRfq(quote.rfqId)
  // Must have been approved by inventory prep (inventory_orders stamped)
  if (!report?.sections.inventory_orders) return false
  return true
}

function buildOrderRow(quoteId: string): WarehouseOrderRowView | null {
  const quote = db.quotes.get(quoteId)
  if (!quote) return null
  if (!isWarehouseEligible(quoteId)) return null

  const section = readWarehouseSection(quote.rfqId)
  // Once the order has been passed to dispatch, it drops off the warehouse queue.
  if (section.passedAt) return null

  const rfq = db.rfqs.get(quote.rfqId)
  const customer = db.customers.get(quote.customerId)
  const totalValue = quote.items.reduce((s, i) => s + i.sellPrice * i.quantity, 0)
  const loadedCount = new Set(
    section.truckAssignments.flatMap((a) => a.itemsLoaded),
  ).size

  // Use the inventory_orders.approvedAt if available, otherwise the quote sentAt.
  const invSection = db.orderReports.forRfq(quote.rfqId)?.sections.inventory_orders as
    | { approvedAt?: string }
    | undefined
  const approvedAt = invSection?.approvedAt ?? quote.sentAt ?? new Date().toISOString()

  return {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    customerName: rfq?.customerName ?? customer?.companyName ?? '',
    customerTier: rfq?.customerTier ?? customer?.tier ?? 'new',
    deliveryAddress: quote.deliveryAddress ?? rfq?.deliveryAddress ?? '',
    deliveryCity: quote.deliveryCity ?? rfq?.deliveryCity ?? '',
    deliveryUrgencyDays: rfq?.deliveryUrgency ?? 0,
    itemCount: quote.items.length,
    totalValue: Math.round(totalValue * 100) / 100,
    approvedHoursAgo: Math.round(hoursSince(approvedAt)),
    stage: deriveStage(section, quote.items.length),
    loadedCount,
    truckCount: section.truckAssignments.length,
  }
}

function buildOrderDetail(quoteId: string): WarehouseOrderDetailView | null {
  const row = buildOrderRow(quoteId)
  if (!row) return null
  const quote = db.quotes.get(quoteId)
  if (!quote) return null

  const section = readWarehouseSection(quote.rfqId)
  const loadedByTruck = new Map<string, string>() // productSlug → truckId
  for (const a of section.truckAssignments) {
    for (const slug of a.itemsLoaded) loadedByTruck.set(slug, a.truckId)
  }

  const items: WarehouseItemView[] = quote.items
    .map((i) => {
      const product = db.products.findBySlug(i.productSlug)
      if (!product) return null
      return {
        productSlug: i.productSlug,
        productName: product.name,
        sku: product.sku,
        unit: product.unit_of_measure,
        quantity: i.quantity,
        loadedOnTruckId: loadedByTruck.get(i.productSlug) ?? null,
      }
    })
    .filter((x): x is WarehouseItemView => x !== null)

  return {
    ...row,
    rfqId: quote.rfqId,
    customerPoNumber: quote.customerPoNumber,
    items,
    truckAssignments: section.truckAssignments,
    signoff: section.signoff,
    failedInspections: section.failedInspections,
  }
}

// ─── Queries ──────────────────────────────────────────────

export const getWarehouseQueue = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const orders = db.quotes
      .list()
      .filter((q) => q.status === 'accepted' && q.paymentStatus !== 'unpaid')
      .map((q) => buildOrderRow(q.id))
      .filter((o): o is WarehouseOrderRowView => o !== null)
      .sort((a, b) => {
        // In-progress first (loading / awaiting_signoff), then unstarted
        // by urgency. Complete doesn't appear in the queue at all — it
        // gets filtered out in buildOrderRow via the passedAt check.
        const order = { loading: 0, awaiting_signoff: 1, unstarted: 2, complete: 3 } as const
        if (order[a.stage] !== order[b.stage]) return order[a.stage] - order[b.stage]
        if (a.deliveryUrgencyDays !== b.deliveryUrgencyDays) {
          return a.deliveryUrgencyDays - b.deliveryUrgencyDays
        }
        return b.approvedHoursAgo - a.approvedHoursAgo
      })

    const totals = {
      total: orders.length,
      unstarted: orders.filter((o) => o.stage === 'unstarted').length,
      loading: orders.filter((o) => o.stage === 'loading').length,
      awaitingSignoff: orders.filter((o) => o.stage === 'awaiting_signoff').length,
    }

    return { orders, totals }
  })

export const getWarehouseOrderDetail = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ quoteId: z.string() }))
  .handler(async ({ data }) => {
    return buildOrderDetail(data.quoteId)
  })

export const getAvailableTrucks = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const all = db.trucks.list()
    return {
      trucks: all.map((t: TruckRow) => ({
        id: t.id,
        plateNumber: t.plateNumber,
        driverName: t.driverName,
        capacityTons: t.capacityTons,
        bodyType: t.bodyType,
        status: t.status,
      })),
    }
  })

/**
 * Employee directory used by the warehouse signoff advisor picker.
 * No role filtering yet — HR panel will add that later. For now the
 * full payroll is returned and the dropdown shows everyone.
 */
export const getWarehouseEmployees = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    return {
      employees: db.employees.list().map((e) => ({
        id: e.id,
        name: e.name,
        name_ar: e.name_ar,
      })),
    }
  })

// ─── Mutations ────────────────────────────────────────────

export const assignTruckToOrder = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ quoteId: z.string(), truckId: z.string() }))
  .handler(async ({ data }) => {
    const quote = db.quotes.get(data.quoteId)
    if (!quote) return { success: false as const, error: 'Order not found' }
    if (!isWarehouseEligible(data.quoteId)) {
      return { success: false as const, error: 'Order not ready for warehouse prep' }
    }
    const truck = db.trucks.get(data.truckId)
    if (!truck) return { success: false as const, error: 'Truck not found' }

    const section = readWarehouseSection(quote.rfqId)
    if (section.signoff || section.passedAt) {
      return { success: false as const, error: 'Order already signed off' }
    }
    if (section.truckAssignments.some((a) => a.truckId === truck.id)) {
      return { success: false as const, error: 'Truck already assigned to this order' }
    }

    const next: WarehouseSection = {
      ...section,
      truckAssignments: [
        ...section.truckAssignments,
        {
          truckId: truck.id,
          plateNumber: truck.plateNumber,
          driverName: truck.driverName,
          capacityTons: truck.capacityTons,
          itemsLoaded: [],
          assignedAt: new Date().toISOString(),
        },
      ],
    }
    writeWarehouseSection(quote.rfqId, next)
    db.trucks.setStatus(truck.id, 'loading')
    return { success: true as const, quoteId: quote.id }
  })

export const toggleItemLoaded = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      quoteId: z.string(),
      truckId: z.string(),
      productSlug: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const quote = db.quotes.get(data.quoteId)
    if (!quote) return { success: false as const, error: 'Order not found' }
    const section = readWarehouseSection(quote.rfqId)
    if (section.signoff || section.passedAt) {
      return { success: false as const, error: 'Order already signed off' }
    }
    const targetAssignment = section.truckAssignments.find((a) => a.truckId === data.truckId)
    if (!targetAssignment) return { success: false as const, error: 'Truck not assigned' }

    // Each product can only be on one truck at a time — if it was on a
    // different truck and the advisor is reassigning, clear the old.
    const next: WarehouseSection = {
      ...section,
      truckAssignments: section.truckAssignments.map((a) => {
        if (a.truckId === data.truckId) {
          const already = a.itemsLoaded.includes(data.productSlug)
          return {
            ...a,
            itemsLoaded: already
              ? a.itemsLoaded.filter((s) => s !== data.productSlug)
              : [...a.itemsLoaded, data.productSlug],
          }
        }
        // Remove from any other truck so the item has exactly one home
        return {
          ...a,
          itemsLoaded: a.itemsLoaded.filter((s) => s !== data.productSlug),
        }
      }),
    }
    // Toggling a checkbox must NOT auto-advance — if the advisor was
    // already marked ready and unchecks an item, roll back the ready
    // flag so the next stage stays gated on every item being loaded.
    const allLoaded = quote.items.every((i) =>
      next.truckAssignments.some((a) => a.itemsLoaded.includes(i.productSlug)),
    )
    if (!allLoaded && next.advisorMarkedReady) {
      next.advisorMarkedReady = false
    }
    writeWarehouseSection(quote.rfqId, next)
    return { success: true as const }
  })

/**
 * Explicit "Next → Signoff" step. Advances the wizard stage from
 * `loading` to `awaiting_signoff`. Requires every item to already be
 * on a truck. Called from the big Next button on the load screen.
 */
export const markReadyForSignoff = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ quoteId: z.string() }))
  .handler(async ({ data }) => {
    const quote = db.quotes.get(data.quoteId)
    if (!quote) return { success: false as const, error: 'Order not found' }
    const section = readWarehouseSection(quote.rfqId)
    if (section.signoff || section.passedAt) {
      return { success: false as const, error: 'Order already signed off' }
    }
    // Gate 1: every line item must be on some truck.
    const loaded = new Set(section.truckAssignments.flatMap((a) => a.itemsLoaded))
    const allLoaded = quote.items.every((i) => loaded.has(i.productSlug))
    if (!allLoaded) {
      return { success: false as const, error: 'Not every item is loaded yet' }
    }
    // Gate 2: every assigned truck must carry at least one item. An empty
    // truck in the assignment list is a misclick — it either needs items
    // or it should be removed from the order. Blocking here forces the
    // advisor to deal with it before moving to signoff.
    const emptyTruck = section.truckAssignments.find((a) => a.itemsLoaded.length === 0)
    if (emptyTruck) {
      return {
        success: false as const,
        error: `Truck ${emptyTruck.plateNumber} is empty — load items or remove it`,
      }
    }
    const next: WarehouseSection = { ...section, advisorMarkedReady: true }
    writeWarehouseSection(quote.rfqId, next)
    return { success: true as const }
  })

/**
 * Remove a truck from an order's assignments. Only allowed when the
 * truck currently carries zero items — if it has any, the advisor has
 * to move them first (the checklist already handles the move). Frees
 * the truck back to `available` so it can be picked up by someone else.
 */
export const removeTruckFromOrder = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ quoteId: z.string(), truckId: z.string() }))
  .handler(async ({ data }) => {
    const quote = db.quotes.get(data.quoteId)
    if (!quote) return { success: false as const, error: 'Order not found' }
    const section = readWarehouseSection(quote.rfqId)
    if (section.signoff || section.passedAt) {
      return { success: false as const, error: 'Order already signed off' }
    }
    const target = section.truckAssignments.find((a) => a.truckId === data.truckId)
    if (!target) return { success: false as const, error: 'Truck not assigned' }
    if (target.itemsLoaded.length > 0) {
      return {
        success: false as const,
        error: 'Truck still has items on it — move them off first',
      }
    }
    const next: WarehouseSection = {
      ...section,
      truckAssignments: section.truckAssignments.filter((a) => a.truckId !== data.truckId),
      advisorMarkedReady: false,
    }
    writeWarehouseSection(quote.rfqId, next)
    // Put the truck back in the fleet pool so someone else can grab it.
    const t = db.trucks.get(data.truckId)
    if (t?.status === 'loading') db.trucks.setStatus(data.truckId, 'available')
    return { success: true as const }
  })

/**
 * Happy-path signoff — only accepted when the QA pass flag is TRUE.
 * The fail path lives in `logFailedInspection` which bounces the order
 * back to loading instead of committing a locked signoff record.
 *
 * Every signoff requires a security token — either a typed password
 * or a scanned QR payload — so the action is attributable to a real
 * person and not just a name anyone can type in.
 */
export const recordWarehouseSignoff = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      quoteId: z.string(),
      advisorId: z.string().min(1),
      proofUrl: z.string().min(1),
      securityMethod: z.enum(['password', 'qr']),
      securityToken: z.string().min(4),
    }),
  )
  .handler(async ({ data }) => {
    const quote = db.quotes.get(data.quoteId)
    if (!quote) return { success: false as const, error: 'Order not found' }
    const advisor = db.employees.get(data.advisorId)
    if (!advisor) return { success: false as const, error: 'Advisor not found in directory' }
    const section = readWarehouseSection(quote.rfqId)
    if (section.signoff) {
      return { success: false as const, error: 'Already signed off' }
    }
    // Mock credential check — real system queries the employees table.
    if (data.securityToken.trim() !== MOCK_ADVISOR_TOKEN) {
      return { success: false as const, error: 'Wrong credential — check your password or badge' }
    }
    // Gate: every line item must be loaded onto some truck before signoff.
    const loaded = new Set(section.truckAssignments.flatMap((a) => a.itemsLoaded))
    const allLoaded = quote.items.every((i) => loaded.has(i.productSlug))
    if (!allLoaded) {
      return { success: false as const, error: 'Not every item is loaded yet' }
    }

    const next: WarehouseSection = {
      ...section,
      signoff: {
        // Name is derived from the employee row, not trusted from the
        // client — the client only sends the id.
        advisorName: advisor.name,
        qualityPass: true,
        proofUrl: data.proofUrl.trim(),
        securityMethod: data.securityMethod,
        securityToken: data.securityToken.trim(),
        signedAt: new Date().toISOString(),
      },
    }
    writeWarehouseSection(quote.rfqId, next)
    // Signoff locks every assigned truck. They stay dispatched (=busy)
    // until dispatch marks the order as delivered or retreated — only
    // then do they return to `available`. This spans the cross-panel
    // hand-off so two orders can't be loaded onto the same truck.
    for (const a of section.truckAssignments) {
      db.trucks.setStatus(a.truckId, 'dispatched')
    }
    return { success: true as const }
  })

/**
 * QA rejection path. Records an audit entry on the warehouse section,
 * clears the `advisorMarkedReady` flag so the derived stage bounces
 * back from `awaiting_signoff` to `loading`, and returns success.
 *
 * Every failed inspection also requires a security token — the retry
 * mustn't be a soft escape hatch that any passer-by can trigger.
 */
export const logFailedInspection = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      quoteId: z.string(),
      advisorId: z.string().min(1),
      reason: z.string().min(3),
      proofUrl: z.string().min(1),
      securityMethod: z.enum(['password', 'qr']),
      securityToken: z.string().min(4),
    }),
  )
  .handler(async ({ data }) => {
    const quote = db.quotes.get(data.quoteId)
    if (!quote) return { success: false as const, error: 'Order not found' }
    const advisor = db.employees.get(data.advisorId)
    if (!advisor) return { success: false as const, error: 'Advisor not found in directory' }
    const section = readWarehouseSection(quote.rfqId)
    if (section.signoff) {
      return { success: false as const, error: 'Already signed off' }
    }
    // Same mock credential gate as the happy path — a failed inspection
    // is still an audit record that has to be attributable to a person.
    if (data.securityToken.trim() !== MOCK_ADVISOR_TOKEN) {
      return { success: false as const, error: 'Wrong credential — check your password or badge' }
    }
    const next: WarehouseSection = {
      ...section,
      // Append — never mutate prior rows.
      failedInspections: [
        ...section.failedInspections,
        {
          advisorName: advisor.name,
          reason: data.reason.trim(),
          proofUrl: data.proofUrl.trim(),
          securityMethod: data.securityMethod,
          securityToken: data.securityToken.trim(),
          failedAt: new Date().toISOString(),
        },
      ],
      // Bounce the wizard back to loading — the advisor can re-inspect,
      // move items between trucks, unload/reload, and hit Next again.
      advisorMarkedReady: false,
    }
    writeWarehouseSection(quote.rfqId, next)
    return { success: true as const }
  })

/**
 * Wipe the warehouse prep state for an order — clears every truck
 * assignment, unchecks every item, drops a pending signoff. Used when
 * something went wrong on the floor and the advisor wants a clean
 * slate. Refuses once the order has already been passed to dispatch,
 * since that's a cross-panel hand-off that a reset can't undo.
 *
 * Does NOT touch the quote, the finance state, or the inventory
 * reservation. The order stays in the warehouse queue at stage
 * `unstarted` and anyone can start prep again.
 */
export const resetWarehouseOrder = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ quoteId: z.string() }))
  .handler(async ({ data }) => {
    const quote = db.quotes.get(data.quoteId)
    if (!quote) return { success: false as const, error: 'Order not found' }
    const section = readWarehouseSection(quote.rfqId)
    if (section.passedAt) {
      return {
        success: false as const,
        error: 'Order already handed to dispatch — ask dispatch to return it',
      }
    }
    // Release every truck tied to this order. Covers both:
    //   • loading — advisor reset mid-load
    //   • dispatched — advisor reset after signoff (but before dispatch
    //     took it), trucks were already locked; put them back.
    for (const a of section.truckAssignments) {
      const t = db.trucks.get(a.truckId)
      if (t?.status === 'loading' || t?.status === 'dispatched') {
        db.trucks.setStatus(a.truckId, 'available')
      }
    }
    writeWarehouseSection(quote.rfqId, {
      truckAssignments: [],
      advisorMarkedReady: false,
      signoff: null,
      passedAt: null,
    })
    return { success: true as const }
  })

export const passOrderToDispatch = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ quoteId: z.string() }))
  .handler(async ({ data }) => {
    const quote = db.quotes.get(data.quoteId)
    if (!quote) return { success: false as const, error: 'Order not found' }
    const section = readWarehouseSection(quote.rfqId)
    if (!section.signoff) {
      return { success: false as const, error: 'Must sign off before dispatch' }
    }
    if (section.passedAt) {
      return { success: false as const, error: 'Already passed to dispatch' }
    }
    const next: WarehouseSection = {
      ...section,
      passedAt: new Date().toISOString(),
    }
    writeWarehouseSection(quote.rfqId, next)
    // Advance the report's currentStage so dispatch picks it up.
    db.orderReports.appendSection(quote.rfqId, 'warehouse', next as unknown as Record<string, unknown>)
    // Trucks stay `dispatched` — they were locked at signoff and stay
    // busy until dispatch marks the order as delivered or retreated.
    return { success: true as const }
  })

// ═══ WAREHOUSE RECEIVING (supplier deliveries) ═════════════
//
// Incoming supplier deals — finance has paid at least a partial, the
// truck arrived at the dock, the advisor inspects every item and
// accepts or rejects each one.
//
// Per-item binary model:
//   • Accepted  → item.received flips true, stock increments by agreedQty
//   • Rejected  → item stays received=false, logged in receivingAttempts,
//                 deal remains in the queue for the next delivery attempt
// When every item on a deal is received, the deal auto-advances to
// `delivered` and drops off the receiving queue.

export interface ReceivingItemView {
  productSlug: string
  productName: string
  sku: string
  unit: string
  agreedQty: number
  agreedRawCost: number
  lineTotal: number
  received: boolean
  receivedAt: string | null
}

export interface ReceivingDealRowView {
  dealId: string
  supplierName: string
  itemCount: number
  receivedCount: number
  pendingCount: number
  totalDue: number
  paymentStatus: string
  createdHoursAgo: number
  headlineProductName: string
  previousAttemptCount: number
}

export interface ReceivingDealDetailView extends ReceivingDealRowView {
  items: ReceivingItemView[]
  previousAttempts: {
    attemptedAt: string
    advisorName: string
    acceptedCount: number
    rejectedCount: number
    rejectionReason: string | null
  }[]
}

function buildReceivingRow(dealId: string): ReceivingDealRowView | null {
  const deal = db.deals.list().find((d) => d.id === dealId)
  if (!deal) return null
  if (deal.paymentStatus === 'unpaid') return null
  if (deal.status === 'delivered' || deal.status === 'closed') return null
  // Drop off the queue once every item has been received.
  const pending = deal.items.filter((i) => !i.received)
  if (pending.length === 0) return null
  const headline = db.products.findBySlug(deal.items[0]?.productSlug ?? '')
  return {
    dealId: deal.id,
    supplierName: deal.supplierName,
    itemCount: deal.items.length,
    receivedCount: deal.items.filter((i) => i.received).length,
    pendingCount: pending.length,
    totalDue: Math.round(deal.totalDue * 100) / 100,
    paymentStatus: deal.paymentStatus,
    createdHoursAgo: Math.round(hoursSince(deal.createdAt)),
    headlineProductName: headline?.name ?? deal.items[0]?.productSlug ?? '—',
    previousAttemptCount: deal.receivingAttempts.length,
  }
}

function buildReceivingDetail(dealId: string): ReceivingDealDetailView | null {
  const row = buildReceivingRow(dealId)
  if (!row) return null
  const deal = db.deals.list().find((d) => d.id === dealId)
  if (!deal) return null
  const items: ReceivingItemView[] = deal.items.map((i) => {
    const product = db.products.findBySlug(i.productSlug)
    return {
      productSlug: i.productSlug,
      productName: product?.name ?? i.productSlug,
      sku: product?.sku ?? '',
      unit: product?.unit_of_measure ?? '',
      agreedQty: i.agreedQty,
      agreedRawCost: i.agreedRawCost,
      lineTotal: Math.round(i.agreedQty * i.agreedRawCost * 100) / 100,
      received: i.received,
      receivedAt: i.receivedAt,
    }
  })
  const previousAttempts = deal.receivingAttempts.map((a) => ({
    attemptedAt: a.attemptedAt,
    advisorName: a.advisorName,
    acceptedCount: a.acceptedSlugs.length,
    rejectedCount: a.rejectedSlugs.length,
    rejectionReason: a.rejectionReason,
  }))
  return { ...row, items, previousAttempts }
}

export const getReceivingQueue = createServerFn({ method: 'GET' })
  .inputValidator(z.object({}))
  .handler(async () => {
    const deals = db.deals
      .list()
      .map((d) => buildReceivingRow(d.id))
      .filter((d): d is ReceivingDealRowView => d !== null)
      .sort((a, b) => {
        // Deals with previous failed attempts surface first — chase them
        if (a.previousAttemptCount !== b.previousAttemptCount) {
          return b.previousAttemptCount - a.previousAttemptCount
        }
        return b.createdHoursAgo - a.createdHoursAgo
      })
    return {
      deals,
      totals: {
        total: deals.length,
        retrying: deals.filter((d) => d.previousAttemptCount > 0).length,
        fresh: deals.filter((d) => d.previousAttemptCount === 0).length,
      },
    }
  })

export const getReceivingDealDetail = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ dealId: z.string() }))
  .handler(async ({ data }) => {
    return buildReceivingDetail(data.dealId)
  })

/**
 * Commit a receiving attempt. Every item on the deal gets a binary
 * decision: received (stock +=) or rejected (stays on the deal).
 * If anything was rejected, a reason is required. The advisor's
 * security token is validated the same way as outgoing signoff.
 */
export const recordReceivingAttempt = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      dealId: z.string(),
      advisorId: z.string().min(1),
      decisions: z
        .array(
          z.object({
            productSlug: z.string(),
            accepted: z.boolean(),
          }),
        )
        .min(1),
      rejectionReason: z.string().optional(),
      proofUrl: z.string().min(1),
      securityMethod: z.enum(['password', 'qr']),
      securityToken: z.string().min(4),
    }),
  )
  .handler(async ({ data }) => {
    const deal = db.deals.list().find((d) => d.id === data.dealId)
    if (!deal) return { success: false as const, error: 'Deal not found' }
    if (deal.paymentStatus === 'unpaid') {
      return { success: false as const, error: 'Finance must pay at least a partial before warehouse receives' }
    }
    if (deal.status === 'delivered' || deal.status === 'closed') {
      return { success: false as const, error: 'Deal already closed' }
    }
    const advisor = db.employees.get(data.advisorId)
    if (!advisor) return { success: false as const, error: 'Advisor not found in directory' }
    if (data.securityToken.trim() !== MOCK_ADVISOR_TOKEN) {
      return { success: false as const, error: 'Wrong credential — check your password or badge' }
    }

    // Decisions are only allowed for items that are still pending.
    const pendingSlugs = new Set(deal.items.filter((i) => !i.received).map((i) => i.productSlug))
    const acceptedSlugs: string[] = []
    const rejectedSlugs: string[] = []
    for (const d of data.decisions) {
      if (!pendingSlugs.has(d.productSlug)) continue
      if (d.accepted) acceptedSlugs.push(d.productSlug)
      else rejectedSlugs.push(d.productSlug)
    }
    if (acceptedSlugs.length + rejectedSlugs.length === 0) {
      return { success: false as const, error: 'No pending items were decided' }
    }
    if (rejectedSlugs.length > 0 && (!data.rejectionReason || data.rejectionReason.trim().length < 3)) {
      return { success: false as const, error: 'Rejection reason required (min 3 chars)' }
    }

    // Commit: flip received on accepted, bump stock, append audit.
    const nowIso = new Date().toISOString()
    for (const item of deal.items) {
      if (acceptedSlugs.includes(item.productSlug)) {
        item.received = true
        item.receivedAt = nowIso
        db.stock.adjust(item.productSlug, item.agreedQty)
      }
    }
    deal.receivingAttempts = [
      ...deal.receivingAttempts,
      {
        attemptedAt: nowIso,
        advisorId: data.advisorId,
        advisorName: advisor.name,
        acceptedSlugs,
        rejectedSlugs,
        rejectionReason: data.rejectionReason?.trim() || null,
        proofUrl: data.proofUrl.trim(),
        securityMethod: data.securityMethod,
        securityToken: data.securityToken.trim(),
      },
    ]
    // Auto-advance to delivered when everything is in.
    const allReceived = deal.items.every((i) => i.received)
    if (allReceived) {
      deal.status = 'delivered'
      deal.fullyReceivedAt = nowIso
    }

    return {
      success: true as const,
      dealId: deal.id,
      fullyReceived: allReceived,
      acceptedCount: acceptedSlugs.length,
      rejectedCount: rejectedSlugs.length,
    }
  })
