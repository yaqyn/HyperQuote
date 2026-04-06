import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { PutawayTask } from '../../types/warehouse'

// ─── Helpers ──────────────────────────────────────────────

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()

// ─── Mock Data ─────────────────────────────────────────────

function getMockPutawayTasks(): PutawayTask[] {
  return [
    { id: 'pw-001', taskNumber: 1, totalTasks: 4, productName: 'Portland Cement CEM I 42.5N', quantity: 500, lotNumber: 'LOT-2026-CM-001', manufactureDate: daysFromNow(-30), expiryDate: daysFromNow(150), fromLocation: 'Dock B-1 / Staging', toLocation: 'WH-A / CEMENT / ROW-1 / Bay 02 / Floor Level' },
    { id: 'pw-002', taskNumber: 2, totalTasks: 4, productName: 'Steel Rebar 16mm Grade 60', quantity: 200, lotNumber: 'LOT-2026-ST-001', manufactureDate: daysFromNow(-60), expiryDate: '', fromLocation: 'Dock A-3 / Staging', toLocation: 'WH-A / STEEL / ROW-1 / Bay 02 / Floor Level' },
    { id: 'pw-003', taskNumber: 3, totalTasks: 4, productName: 'Insulation Board R-19', quantity: 120, lotNumber: 'LOT-2026-IN-001', manufactureDate: daysFromNow(-15), expiryDate: daysFromNow(530), fromLocation: 'Dock B-2 / Staging', toLocation: 'WH-B / INSULATION / ROW-1 / Bay 01 / Level 2' },
    { id: 'pw-004', taskNumber: 4, totalTasks: 4, productName: 'PVC Pipe 4" Schedule 40', quantity: 80, lotNumber: 'LOT-2026-PP-001', manufactureDate: daysFromNow(-10), expiryDate: '', fromLocation: 'Dock A-2 / Staging', toLocation: 'WH-A / PIPE / ROW-2 / Bay 03 / Floor Level' },
  ]
}

// ─── Server Functions ──────────────────────────────────────

const getPutawayTasksInput = z.object({
  warehouseId: z.string().optional(),
})

export const getPutawayTasks = createServerFn({ method: 'GET' })
  .inputValidator(getPutawayTasksInput)
  .handler(async ({ data: _input }) => {
    return { tasks: getMockPutawayTasks() }
  })

const putawayConfirmInput = z.object({
  locationBarcode: z.string(),
  itemBarcode: z.string(),
  quantity: z.number(),
})

export const putawayConfirm = createServerFn({ method: 'POST' })
  .inputValidator(putawayConfirmInput)
  .handler(async ({ data: _input }) => {
    return { success: true }
  })
