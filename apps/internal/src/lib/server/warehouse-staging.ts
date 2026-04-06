import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { StagingStop } from '../../types/warehouse'

// ─── Mock Data ─────────────────────────────────────────────

function getMockStagingPlan(): StagingStop[] {
  return [
    {
      stopNumber: 1,
      customerName: 'New Cairo Developers',
      items: [
        { id: 'si-001', name: 'Portland Cement CEM I 42.5N (200 bags)', barcode: 'BC-CEM-001-200', scanned: false },
        { id: 'si-002', name: 'Steel Rebar 16mm (50 bundles)', barcode: 'BC-STL-016-050', scanned: false },
      ],
    },
    {
      stopNumber: 2,
      customerName: 'Heliopolis Construction',
      items: [
        { id: 'si-003', name: 'PVC Pipe 4" Schedule 40 (20 pcs)', barcode: 'BC-PIP-004-020', scanned: false },
        { id: 'si-004', name: 'Insulation Board R-19 (40 panels)', barcode: 'BC-INS-019-040', scanned: false },
        { id: 'si-005', name: 'Portland Cement CEM II 32.5N (100 bags)', barcode: 'BC-CEM-002-100', scanned: false },
      ],
    },
    {
      stopNumber: 3,
      customerName: 'Cairo Steel Construction',
      items: [
        { id: 'si-006', name: 'Steel Rebar 10mm (30 bundles)', barcode: 'BC-STL-010-030', scanned: false },
      ],
    },
  ]
}

// ─── Server Functions ──────────────────────────────────────

const getStagingPlanInput = z.object({
  routeId: z.string(),
})

export const getStagingPlan = createServerFn({ method: 'GET' })
  .inputValidator(getStagingPlanInput)
  .handler(async ({ data: _input }) => {
    return { stops: getMockStagingPlan() }
  })

const loadVerificationInput = z.object({
  routeId: z.string(),
  scanResults: z.array(z.object({
    itemId: z.string(),
    barcode: z.string(),
    scanned: z.boolean(),
  })),
  weight: z.number(),
  photos: z.array(z.string()),
  driverSignature: z.string(),
  loaderSignature: z.string(),
})

export const loadVerification = createServerFn({ method: 'POST' })
  .inputValidator(loadVerificationInput)
  .handler(async ({ data: input }) => {
    // Clearance false if missing items or weight variance >2%
    const allScanned = input.scanResults.every((r) => r.scanned)
    const expectedWeight = 18500
    const weightVariance = Math.abs(input.weight - expectedWeight) / expectedWeight
    const clearance = allScanned && weightVariance <= 0.02 && input.photos.length >= 3

    return {
      verificationId: `VER-${Date.now()}`,
      clearance,
    }
  })
