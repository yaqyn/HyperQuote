import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  CycleCountAssignment,
  CycleCountResult,
} from '../../types/warehouse'
import { getABCClass, getVarianceThreshold, needsRecount } from '../warehouse/abc-thresholds'

// ─── Mock Data ─────────────────────────────────────────────

function getMockAssignments(): CycleCountAssignment[] {
  return [
    {
      id: 'cc-001',
      locationCode: 'WH-A / CEMENT / ROW-1 / Bay 02',
      countNumber: 1,
      totalCounts: 3,
      items: [
        { productId: 'p-001', productName: 'Portland Cement CEM I 42.5N', sku: 'CEM-001', lotNumber: 'LOT-2026-CM-001' },
        { productId: 'p-002', productName: 'Portland Cement CEM II 32.5N', sku: 'CEM-002', lotNumber: 'LOT-2026-CM-003' },
      ],
    },
    {
      id: 'cc-002',
      locationCode: 'WH-A / STEEL / ROW-1 / Bay 02',
      countNumber: 2,
      totalCounts: 3,
      items: [
        { productId: 'p-003', productName: 'Steel Rebar 16mm Grade 60', sku: 'STL-016', lotNumber: 'LOT-2026-ST-001' },
      ],
    },
    {
      id: 'cc-003',
      locationCode: 'WH-B / INSULATION / ROW-1 / Bay 01',
      countNumber: 3,
      totalCounts: 3,
      items: [
        { productId: 'p-005', productName: 'Insulation Board R-19', sku: 'INS-019', lotNumber: 'LOT-2026-IN-001' },
        { productId: 'p-006', productName: 'Fiberglass Batt R-13', sku: 'INS-013', lotNumber: 'LOT-2026-IN-002' },
      ],
    },
  ]
}

// System quantities — kept server-side, never sent during assignment (blind count)
const SYSTEM_QUANTITIES: Record<string, { systemQty: number; category: string }> = {
  'p-001': { systemQty: 480, category: 'cement' },
  'p-002': { systemQty: 220, category: 'cement' },
  'p-003': { systemQty: 195, category: 'steel_rebar' },
  'p-005': { systemQty: 115, category: 'insulation' },
  'p-006': { systemQty: 88, category: 'insulation' },
}

// ─── Server Functions ──────────────────────────────────────

const getAssignmentsInput = z.object({
  warehouseId: z.string().optional(),
})

export const getCycleCountAssignments = createServerFn({ method: 'GET' })
  .inputValidator(getAssignmentsInput)
  .handler(async ({ data: _input }) => {
    return { assignments: getMockAssignments() }
  })

const getAssignmentInput = z.object({
  countId: z.string(),
})

/** Returns assignment WITHOUT system quantities — blind count per Pitfall 1 */
export const getCycleCountAssignment = createServerFn({ method: 'GET' })
  .inputValidator(getAssignmentInput)
  .handler(async ({ data: input }) => {
    const all = getMockAssignments()
    const assignment = all.find((a) => a.id === input.countId) ?? all[0]
    // DELIBERATELY returns only productId, productName, sku, lotNumber — NO quantities
    return assignment
  })

const submitCountInput = z.object({
  countId: z.string(),
  counts: z.array(z.object({
    productId: z.string(),
    physicalCount: z.number().nonnegative(),
  })),
})

export const submitCycleCount = createServerFn({ method: 'POST' })
  .inputValidator(submitCountInput)
  .handler(async ({ data: input }) => {
    // After submission, reveal system qty and compute variance
    const results: CycleCountResult[] = input.counts.map((count) => {
      const system = SYSTEM_QUANTITIES[count.productId] ?? { systemQty: 0, category: 'insulation' }
      const variance = count.physicalCount - system.systemQty
      const variancePercent = system.systemQty > 0 ? variance / system.systemQty : 0
      const abcClass = getABCClass(system.category)
      const threshold = getVarianceThreshold(abcClass)

      return {
        productId: count.productId,
        physicalCount: count.physicalCount,
        systemQty: system.systemQty,
        variance,
        variancePercent,
        abcClass,
        threshold,
        needsRecount: needsRecount(variancePercent, abcClass),
      }
    })

    return { results }
  })

const approvalInput = z.object({
  countId: z.string(),
  decision: z.enum(['approve', 'investigate']),
  reason: z.string().optional(),
})

export const submitCycleCountApproval = createServerFn({ method: 'POST' })
  .inputValidator(approvalInput)
  .handler(async ({ data: _input }) => {
    return { success: true }
  })
