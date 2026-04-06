import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  ExpectedDelivery,
  ReceivingLine,
  BulkReceivingState,
} from '../../types/warehouse'

// ─── Helpers ──────────────────────────────────────────────

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

// ─── Mock Data ─────────────────────────────────────────────

function getMockDeliveries(): ExpectedDelivery[] {
  return [
    { id: 'del-001', poNumber: 'PO-2026-00031', supplierName: 'Cairo Steel Co.', eta: hoursFromNow(1), truckType: 'flatbed', lineItemCount: 4, status: 'arrived', assignedDock: 'Dock A-3', receivingProgress: 0 },
    { id: 'del-002', poNumber: 'PO-2026-00032', supplierName: 'Delta Cement Group', eta: hoursFromNow(2), truckType: 'enclosed', lineItemCount: 2, status: 'in_transit', assignedDock: 'Dock B-1', receivingProgress: 0 },
    { id: 'del-003', poNumber: 'PO-2026-00033', supplierName: 'Nile Aggregates', eta: hoursFromNow(3), truckType: 'dump', lineItemCount: 1, status: 'confirmed', assignedDock: 'Yard Zone C', receivingProgress: 0 },
    { id: 'del-004', poNumber: 'PO-2026-00034', supplierName: 'Alexandria Lumber Trading', eta: hoursFromNow(5), truckType: 'flatbed', lineItemCount: 6, status: 'scheduled', assignedDock: 'Dock A-1', receivingProgress: 0 },
    { id: 'del-005', poNumber: 'PO-2026-00035', supplierName: 'Suez Pipe Manufacturing', eta: hoursFromNow(-1), truckType: 'flatbed', lineItemCount: 3, status: 'receiving', assignedDock: 'Dock A-2', receivingProgress: 65 },
    { id: 'del-006', poNumber: 'PO-2026-00036', supplierName: 'Giza Roofing Supplies', eta: hoursFromNow(-3), truckType: 'enclosed', lineItemCount: 2, status: 'complete', assignedDock: 'Dock B-2', receivingProgress: 100 },
  ]
}

function getMockReceivingLines(): ReceivingLine[] {
  return [
    { id: 'rl-001', materialName: 'Steel Rebar 16mm', specification: 'Grade 60, 12m length', expectedQty: 200, receivedQty: 0, condition: 'good', lotNumber: 'LOT-2026-ST-001', heatNumber: 'HT-4521', suggestedLocation: 'WH-A / STEEL / ROW-1 / Bay 02 / Floor', photoUrls: [], note: '', variancePercent: 0 },
    { id: 'rl-002', materialName: 'Steel Rebar 12mm', specification: 'Grade 60, 12m length', expectedQty: 150, receivedQty: 0, condition: 'good', lotNumber: 'LOT-2026-ST-002', heatNumber: 'HT-4522', suggestedLocation: 'WH-A / STEEL / ROW-1 / Bay 03 / Floor', photoUrls: [], note: '', variancePercent: 0 },
    { id: 'rl-003', materialName: 'Steel Rebar 10mm', specification: 'Grade 40, 6m length', expectedQty: 100, receivedQty: 0, condition: 'good', lotNumber: 'LOT-2026-ST-003', heatNumber: 'HT-4523', suggestedLocation: 'WH-A / STEEL / ROW-2 / Bay 01 / Floor', photoUrls: [], note: '', variancePercent: 0 },
    { id: 'rl-004', materialName: 'Wire Mesh 4x8', specification: '6x6 W2.9/W2.9', expectedQty: 50, receivedQty: 0, condition: 'good', lotNumber: 'LOT-2026-ST-004', heatNumber: 'HT-4524', suggestedLocation: 'WH-A / STEEL / ROW-3 / Bay 01 / Level 1', photoUrls: [], note: '', variancePercent: 0 },
  ]
}

function getMockBulkState(): BulkReceivingState {
  return {
    grossWeight: 38500,
    tareWeight: 14200,
    netWeight: 24300,
    previouslyReceived: 48000,
    poTotal: 100000,
    remaining: 27700,
    unit: 'kg',
  }
}

// ─── Server Functions ──────────────────────────────────────

const getExpectedDeliveriesInput = z.object({
  warehouseId: z.string().optional(),
  date: z.string().optional(),
  status: z.string().optional(),
})

export const getExpectedDeliveries = createServerFn({ method: 'GET' })
  .inputValidator(getExpectedDeliveriesInput)
  .handler(async ({ data: input }) => {
    let deliveries = getMockDeliveries()
    if (input.status) {
      deliveries = deliveries.filter((d) => d.status === input.status)
    }
    return { deliveries }
  })

const getReceivingDetailInput = z.object({
  poId: z.string(),
})

export const getReceivingDetail = createServerFn({ method: 'GET' })
  .inputValidator(getReceivingDetailInput)
  .handler(async ({ data: _input }) => {
    return { lines: getMockReceivingLines() }
  })

const receiveGoodsInput = z.object({
  poId: z.string(),
  lines: z.array(z.object({
    lineId: z.string(),
    receivedQty: z.number(),
    condition: z.string(),
    lotNumber: z.string().optional(),
    note: z.string().optional(),
  })),
  photos: z.array(z.string()).optional(),
})

export const receiveGoods = createServerFn({ method: 'POST' })
  .inputValidator(receiveGoodsInput)
  .handler(async ({ data: _input }) => {
    return { grnId: `GRN-${Date.now()}` }
  })

const getBulkReceivingStateInput = z.object({
  poId: z.string(),
})

export const getBulkReceivingState = createServerFn({ method: 'GET' })
  .inputValidator(getBulkReceivingStateInput)
  .handler(async ({ data: _input }) => {
    return getMockBulkState()
  })
