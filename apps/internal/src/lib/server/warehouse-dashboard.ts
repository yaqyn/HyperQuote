import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { WarehouseDashboard } from '../../types/warehouse'

// ─── Mock Data ─────────────────────────────────────────────

function getMockDashboard(): WarehouseDashboard {
  return {
    pendingReceiving: 5,
    pendingPutaway: 12,
    pendingPicking: 8,
    pendingLoading: 3,
    pendingCounts: 4,
    pendingTransfers: 2,
    criticalAlerts: 1,
    pendingReturns: 2,
    pickAccuracy: 97.2,
    onTimeShipment: 94.8,
    receivingCycleTime: 45,
    inventoryAccuracy: 99.1,
    workersActive: 18,
    totalWorkers: 24,
    forkliftOpsAvailable: 4,
    tasksCompleted: 67,
    tasksTotal: 96,
    inventoryValue: {
      onHand: 24_500_000,
      reserved: 8_200_000,
      available: 15_800_000,
      onHold: 500_000,
    },
  }
}

// ─── Server Functions ──────────────────────────────────────

const getDashboardInput = z.object({
  warehouseId: z.string().optional(),
})

export const getWarehouseDashboard = createServerFn({ method: 'GET' })
  .inputValidator(getDashboardInput)
  .handler(async ({ data: _input }) => {
    return getMockDashboard()
  })
