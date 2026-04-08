// Operations domain types — contracts for the entire operations module
// Fulfillment tracking, SLA monitoring, handoff stages, and delivery scheduling

// ─── Status Unions ────────────────────────────────────────

export type FulfillmentStage =
  | 'po_placed'
  | 'in_transit'
  | 'at_warehouse'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'

export type OrderStatus =
  | 'confirmed'
  | 'processing'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'completed'
  | 'on_hold'
  | 'cancellation_requested'
  | 'back_ordered'
  | 'cancelled'

export type SLAType =
  | 'quote_response'
  | 'po_confirmation'
  | 'delivery_scheduling'
  | 'invoice_generation'
  | 'dispute_resolution'

export type SLAStatus = 'on_track' | 'at_risk' | 'breached'

export type HandoffStage =
  | 'sales'
  | 'procurement'
  | 'warehouse'
  | 'dispatch'
  | 'driver'
  | 'finance'

export type OperationsTab = 'operations' | 'orders'

export type FulfillmentColor = 'green' | 'yellow' | 'red'

// ─── Fulfillment Order ───────────────────────────────────

export interface FulfillmentOrder {
  id: string
  orderNumber: string
  customerName: string
  totalValue: number
  totalItems: number
  readyItems: number
  eta: string
  color: FulfillmentColor
  stage: FulfillmentStage
  assignedTo: string
}

// ─── Order Detail ────────────────────────────────────────

export interface OrderLineItem {
  id: string
  productName: string
  supplier: string
  poNumber: string
  quantity: number
  fulfilledQuantity: number
  status: string
  eta: string
}

export interface OrderDocument {
  id: string
  type: string
  name: string
  url: string
  createdAt: string
}

export interface ActivityLogEntry {
  id: string
  action: string
  actor: string
  timestamp: string
  details: string
}

export interface HandoffStatus {
  currentStage: HandoffStage
  currentOwner: string
  timeInStage: number
  slaMs: number
  completedStages: HandoffStage[]
}

export interface OrderDetail {
  id: string
  orderNumber: string
  customerName: string
  quoteRef: string
  totalValue: number
  status: OrderStatus
  createdAt: string
  items: OrderLineItem[]
  documents: OrderDocument[]
  activityLog: ActivityLogEntry[]
  handoff: HandoffStatus
}

// ─── SLA ─────────────────────────────────────────────────

export interface SLAItem {
  id: string
  entityRef: string
  entityType: string
  slaType: SLAType
  deadline: string
  totalMs: number
  remainingMs: number
  status: SLAStatus
}

// ─── Bottleneck ──────────────────────────────────────────

export interface BottleneckStage {
  stage: string
  label: string
  count: number
  avgDwellMinutes: number
  stuckCount: number
}

// ─── Metrics ─────────────────────────────────────────────

export interface OperationsMetrics {
  ordersInProgress: number
  ordersInProgressTrend: 'up' | 'down'
  deliveriesToday: number
  deliveriesTotal: number
  slaBreaches: number
  bottleneckStage: string
  bottleneckStuckCount: number
}

// ─── Delivery Schedule ───────────────────────────────────

export interface DeliveryScheduleItem {
  id: string
  orderId: string
  orderNumber: string
  customerName: string
  items: string[]
  method: 'own_fleet' | '3pl' | 'drop_ship' | 'consolidated'
  scheduledDate: string
  status: string
}

// ─── Kanban Filters ──────────────────────────────────────

export interface KanbanFilters {
  customer: string | null
  dateRange: [string, string] | null
  deliveryMethod: string | null
  status: FulfillmentStage | null
}

// ─── Helper Functions ────────────────────────────────────

/**
 * Compute SLA status from remaining and total milliseconds.
 * breached if <= 0, at_risk if ratio < 0.5, on_track otherwise
 */
export function computeSLAStatus(remainingMs: number, totalMs: number): SLAStatus {
  if (remainingMs <= 0) return 'breached'
  if (totalMs > 0 && remainingMs / totalMs < 0.5) return 'at_risk'
  return 'on_track'
}

/**
 * Map SLA status to semantic color name.
 */
export function getSLAStatusColor(status: SLAStatus): string {
  switch (status) {
    case 'breached': return 'red'
    case 'at_risk': return 'yellow'
    case 'on_track': return 'green'
  }
}

/**
 * Map remaining time ratio to Tailwind text color class.
 * <= 0 -> red, <= 0.25 -> yellow, > 0.25 -> green
 */
export function getTimeRemainingColor(remainingMs: number, totalMs: number): string {
  if (remainingMs <= 0) return 'text-red-600'
  if (totalMs > 0 && remainingMs / totalMs <= 0.25) return 'text-yellow-600'
  return 'text-green-600'
}

/**
 * Map fulfillment color to Tailwind border-start class for kanban cards.
 */
export function getFulfillmentColor(color: FulfillmentColor): string {
  switch (color) {
    case 'green': return 'border-s-green-500'
    case 'yellow': return 'border-s-yellow-500'
    case 'red': return 'border-s-red-500'
  }
}

// ─── Constants ───────────────────────────────────────────

export const FULFILLMENT_COLUMNS: { stage: FulfillmentStage; label: string }[] = [
  { stage: 'po_placed', label: 'PO Placed' },
  { stage: 'in_transit', label: 'In Transit from Supplier' },
  { stage: 'at_warehouse', label: 'At Warehouse' },
  { stage: 'preparing', label: 'Preparing / Loading' },
  { stage: 'out_for_delivery', label: 'Out for Delivery' },
  { stage: 'delivered', label: 'Delivered' },
]

export const HANDOFF_STAGES: { stage: HandoffStage; label: string }[] = [
  { stage: 'sales', label: 'Sales' },
  { stage: 'procurement', label: 'Procurement' },
  { stage: 'warehouse', label: 'Warehouse' },
  { stage: 'dispatch', label: 'Dispatch' },
  { stage: 'driver', label: 'Driver' },
  { stage: 'finance', label: 'Finance' },
]

export const SLA_DURATIONS: Record<SLAType, { label: string; durationMs: number }> = {
  quote_response: { label: 'Quote Response', durationMs: 4 * 60 * 60 * 1000 },         // 4h
  po_confirmation: { label: 'PO Confirmation', durationMs: 24 * 60 * 60 * 1000 },      // 24h
  delivery_scheduling: { label: 'Delivery Scheduling', durationMs: 48 * 60 * 60 * 1000 }, // 48h
  invoice_generation: { label: 'Invoice Generation', durationMs: 24 * 60 * 60 * 1000 }, // 24h
  dispute_resolution: { label: 'Dispute Resolution', durationMs: 72 * 60 * 60 * 1000 }, // 72h
}
