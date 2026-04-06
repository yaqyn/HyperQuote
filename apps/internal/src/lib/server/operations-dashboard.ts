import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  OperationsMetrics,
  BottleneckStage,
  SLAItem,
  SLAType,
  SLAStatus,
} from '../../types/operations'
import { computeSLAStatus, SLA_DURATIONS } from '../../types/operations'

// ─── Helpers ──────────────────────────────────────────────

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

// ─── Mock Data ─────────────────────────────────────────────

function getMockMetrics(): OperationsMetrics {
  return {
    ordersInProgress: 42,
    ordersInProgressTrend: 'up',
    deliveriesToday: 8,
    deliveriesTotal: 156,
    slaBreaches: 3,
    bottleneckStage: 'Warehouse',
    bottleneckStuckCount: 7,
  }
}

function getMockBottlenecks(): BottleneckStage[] {
  return [
    { stage: 'procurement', label: 'Procurement', count: 15, avgDwellMinutes: 240, stuckCount: 2 },
    { stage: 'warehouse', label: 'Warehouse', count: 23, avgDwellMinutes: 480, stuckCount: 7 },
    { stage: 'dispatch', label: 'Dispatch', count: 12, avgDwellMinutes: 120, stuckCount: 1 },
    { stage: 'delivery', label: 'Delivery', count: 8, avgDwellMinutes: 180, stuckCount: 3 },
  ]
}

function getMockSLAItems(): SLAItem[] {
  const items: SLAItem[] = [
    // Breached (3)
    { id: 'sla-001', entityRef: 'QR-2024-0055', entityType: 'quote', slaType: 'quote_response', deadline: hoursFromNow(-2), totalMs: SLA_DURATIONS.quote_response.durationMs, remainingMs: -2 * 3_600_000, status: 'breached' },
    { id: 'sla-002', entityRef: 'PO-2026-00022', entityType: 'purchase_order', slaType: 'po_confirmation', deadline: hoursFromNow(-6), totalMs: SLA_DURATIONS.po_confirmation.durationMs, remainingMs: -6 * 3_600_000, status: 'breached' },
    { id: 'sla-003', entityRef: 'INV-2026-0089', entityType: 'invoice', slaType: 'invoice_generation', deadline: hoursFromNow(-1), totalMs: SLA_DURATIONS.invoice_generation.durationMs, remainingMs: -1 * 3_600_000, status: 'breached' },
    // At Risk (3)
    { id: 'sla-004', entityRef: 'QR-2024-0058', entityType: 'quote', slaType: 'quote_response', deadline: hoursFromNow(1), totalMs: SLA_DURATIONS.quote_response.durationMs, remainingMs: 1 * 3_600_000, status: 'at_risk' },
    { id: 'sla-005', entityRef: 'SO-2024-0047', entityType: 'order', slaType: 'delivery_scheduling', deadline: hoursFromNow(8), totalMs: SLA_DURATIONS.delivery_scheduling.durationMs, remainingMs: 8 * 3_600_000, status: 'at_risk' },
    { id: 'sla-006', entityRef: 'DISP-2026-0012', entityType: 'dispute', slaType: 'dispute_resolution', deadline: hoursFromNow(12), totalMs: SLA_DURATIONS.dispute_resolution.durationMs, remainingMs: 12 * 3_600_000, status: 'at_risk' },
    // On Track (4)
    { id: 'sla-007', entityRef: 'QR-2024-0060', entityType: 'quote', slaType: 'quote_response', deadline: hoursFromNow(3), totalMs: SLA_DURATIONS.quote_response.durationMs, remainingMs: 3 * 3_600_000, status: 'on_track' },
    { id: 'sla-008', entityRef: 'PO-2026-00025', entityType: 'purchase_order', slaType: 'po_confirmation', deadline: hoursFromNow(20), totalMs: SLA_DURATIONS.po_confirmation.durationMs, remainingMs: 20 * 3_600_000, status: 'on_track' },
    { id: 'sla-009', entityRef: 'SO-2024-0051', entityType: 'order', slaType: 'delivery_scheduling', deadline: hoursFromNow(40), totalMs: SLA_DURATIONS.delivery_scheduling.durationMs, remainingMs: 40 * 3_600_000, status: 'on_track' },
    { id: 'sla-010', entityRef: 'INV-2026-0091', entityType: 'invoice', slaType: 'invoice_generation', deadline: hoursFromNow(18), totalMs: SLA_DURATIONS.invoice_generation.durationMs, remainingMs: 18 * 3_600_000, status: 'on_track' },
  ]

  // Verify status computation matches mock assignments
  for (const item of items) {
    item.status = computeSLAStatus(item.remainingMs, item.totalMs)
  }

  // Sort by urgency: breached first, then at_risk, then on_track
  const priority: Record<SLAStatus, number> = { breached: 0, at_risk: 1, on_track: 2 }
  items.sort((a, b) => priority[a.status] - priority[b.status])

  return items
}

// ─── Server Functions ──────────────────────────────────────

export const getOperationsDashboard = createServerFn({ method: 'GET' })
  .handler(async () => {
    return {
      metrics: getMockMetrics(),
      bottleneck: getMockBottlenecks(),
    }
  })

const getSLAItemsInput = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
})

export const getSLAItems = createServerFn({ method: 'GET' })
  .inputValidator(getSLAItemsInput)
  .handler(async ({ data: input }) => {
    let items = getMockSLAItems()

    if (input.type) {
      items = items.filter((i) => i.slaType === (input.type as SLAType))
    }
    if (input.status) {
      items = items.filter((i) => i.status === (input.status as SLAStatus))
    }

    return { items }
  })
