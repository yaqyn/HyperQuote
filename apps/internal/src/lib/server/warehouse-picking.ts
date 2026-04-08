import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { PickOrder, PickStep } from '../../types/warehouse'

// ─── Helpers ──────────────────────────────────────────────

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()

// ─── Mock Data ─────────────────────────────────────────────

function getMockPickQueue(): PickOrder[] {
  return [
    { id: 'po-001', soNumber: 'SO-2026-0089', customerName: 'Cairo Steel Construction', shippingDeadline: hoursFromNow(1.5), assignedTruck: 'TRK-014', assignedRoute: 'Route A - Cairo Central', itemCount: 6, totalWeightKg: 18500, priority: 'urgent' },
    { id: 'po-002', soNumber: 'SO-2026-0091', customerName: 'Giza Towers Development', shippingDeadline: hoursFromNow(4), assignedTruck: 'TRK-007', assignedRoute: 'Route B - Giza', itemCount: 4, totalWeightKg: 12200, priority: 'urgent' },
    { id: 'po-003', soNumber: 'SO-2026-0093', customerName: 'Heliopolis Construction', shippingDeadline: hoursFromNow(8), assignedTruck: 'TRK-021', assignedRoute: 'Route C - Heliopolis', itemCount: 8, totalWeightKg: 22400, priority: 'today' },
    { id: 'po-004', soNumber: 'SO-2026-0095', customerName: 'New Cairo Developers', shippingDeadline: daysFromNow(1), assignedTruck: 'TRK-003', assignedRoute: 'Route D - New Cairo', itemCount: 3, totalWeightKg: 8600, priority: 'today' },
    { id: 'po-005', soNumber: 'SO-2026-0097', customerName: 'Alexandria Building Co.', shippingDeadline: daysFromNow(2), assignedTruck: 'TRK-009', assignedRoute: 'Route E - Alexandria', itemCount: 10, totalWeightKg: 31000, priority: 'upcoming' },
  ]
}

function getMockPickSteps(): PickStep[] {
  return [
    { id: 'ps-001', stepNumber: 1, totalSteps: 6, locationPath: 'WH-A / CEMENT / ROW-1 / Bay 02 / Floor Level', productName: 'Portland Cement CEM I 42.5N', sku: 'CEM-001', lotNumber: 'LOT-2026-CM-001', expiryDate: daysFromNow(150), quantityToPick: 200, fefoEnforced: true },
    { id: 'ps-002', stepNumber: 2, totalSteps: 6, locationPath: 'WH-A / CEMENT / ROW-1 / Bay 04 / Floor Level', productName: 'Portland Cement CEM II 32.5N', sku: 'CEM-002', lotNumber: 'LOT-2026-CM-003', expiryDate: daysFromNow(120), quantityToPick: 100, fefoEnforced: true },
    { id: 'ps-003', stepNumber: 3, totalSteps: 6, locationPath: 'WH-A / STEEL / ROW-1 / Bay 02 / Floor Level', productName: 'Steel Rebar 16mm Grade 60', sku: 'STL-016', lotNumber: 'LOT-2026-ST-001', expiryDate: '', quantityToPick: 50, fefoEnforced: false },
    { id: 'ps-004', stepNumber: 4, totalSteps: 6, locationPath: 'WH-A / STEEL / ROW-2 / Bay 01 / Floor Level', productName: 'Steel Rebar 10mm Grade 40', sku: 'STL-010', lotNumber: 'LOT-2026-ST-003', expiryDate: '', quantityToPick: 30, fefoEnforced: false },
    { id: 'ps-005', stepNumber: 5, totalSteps: 6, locationPath: 'WH-B / INSULATION / ROW-1 / Bay 01 / Level 2', productName: 'Insulation Board R-19', sku: 'INS-019', lotNumber: 'LOT-2026-IN-001', expiryDate: daysFromNow(530), quantityToPick: 40, fefoEnforced: true },
    { id: 'ps-006', stepNumber: 6, totalSteps: 6, locationPath: 'WH-A / PIPE / ROW-2 / Bay 03 / Floor Level', productName: 'PVC Pipe 4" Schedule 40', sku: 'PIP-004', lotNumber: 'LOT-2026-PP-001', expiryDate: '', quantityToPick: 20, fefoEnforced: false },
  ]
}

// ─── Server Functions ──────────────────────────────────────

const getPickQueueInput = z.object({
  warehouseId: z.string().optional(),
  route: z.string().optional(),
  priority: z.string().optional(),
})

export const getPickQueue = createServerFn({ method: 'GET' })
  .inputValidator(getPickQueueInput)
  .handler(async ({ data: input }) => {
    let orders = getMockPickQueue()
    if (input.priority) {
      orders = orders.filter((o) => o.priority === input.priority)
    }
    return { orders }
  })

const getPickStepsInput = z.object({
  orderId: z.string(),
})

export const getPickSteps = createServerFn({ method: 'GET' })
  .inputValidator(getPickStepsInput)
  .handler(async ({ data: _input }) => {
    return { steps: getMockPickSteps() }
  })

const confirmPickInput = z.object({
  pickListId: z.string(),
  lines: z.array(z.object({
    stepId: z.string(),
    pickedQty: z.number(),
    lotNumber: z.string(),
    exception: z.string().optional(),
  })),
  notes: z.string().optional(),
})

export const confirmPick = createServerFn({ method: 'POST' })
  .inputValidator(confirmPickInput)
  .handler(async ({ data: input }) => {
    const steps = getMockPickSteps()
    const shortages = input.lines
      .filter((line) => {
        const step = steps.find((s) => s.id === line.stepId)
        return step && line.pickedQty < step.quantityToPick
      })
      .map((line) => line.stepId)

    return {
      success: true,
      pickListCompleted: true,
      movedToStaging: true,
      shortages,
      totalLinesPicked: input.lines.length,
      totalQtyPicked: input.lines.reduce((sum, l) => sum + l.pickedQty, 0),
    }
  })
