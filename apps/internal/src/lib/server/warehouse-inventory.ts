import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { InventoryItem, StockMovement } from '../../types/warehouse'

// ─── Helpers ──────────────────────────────────────────────

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

// ─── Mock Data ─────────────────────────────────────────────

function getMockInventory(): InventoryItem[] {
  return [
    { id: 'inv-001', productName: 'Portland Cement CEM I 42.5N', sku: 'CEM-001', locationCode: 'WH-A / CEMENT / ROW-1 / Bay 02', warehouseName: 'Main Warehouse', lotNumber: 'LOT-2026-CM-001', expiryDate: daysFromNow(150), daysRemaining: 150, quantityOnHand: 480, quantityReserved: 120, quantityAvailable: 360, condition: 'good', reorderPoint: 200, daysOfSupply: 18, photoUrl: '' },
    { id: 'inv-002', productName: 'Portland Cement CEM II 32.5N', sku: 'CEM-002', locationCode: 'WH-A / CEMENT / ROW-1 / Bay 04', warehouseName: 'Main Warehouse', lotNumber: 'LOT-2026-CM-003', expiryDate: daysFromNow(120), daysRemaining: 120, quantityOnHand: 220, quantityReserved: 80, quantityAvailable: 140, condition: 'good', reorderPoint: 150, daysOfSupply: 11, photoUrl: '' },
    { id: 'inv-003', productName: 'Steel Rebar 16mm Grade 60', sku: 'STL-016', locationCode: 'WH-A / STEEL / ROW-1 / Bay 02', warehouseName: 'Main Warehouse', lotNumber: 'LOT-2026-ST-001', expiryDate: '', daysRemaining: -1, quantityOnHand: 195, quantityReserved: 50, quantityAvailable: 145, condition: 'good', reorderPoint: 100, daysOfSupply: 24, photoUrl: '' },
    { id: 'inv-004', productName: 'Steel Rebar 12mm Grade 60', sku: 'STL-012', locationCode: 'WH-A / STEEL / ROW-1 / Bay 03', warehouseName: 'Main Warehouse', lotNumber: 'LOT-2026-ST-002', expiryDate: '', daysRemaining: -1, quantityOnHand: 148, quantityReserved: 30, quantityAvailable: 118, condition: 'good', reorderPoint: 80, daysOfSupply: 29, photoUrl: '' },
    { id: 'inv-005', productName: 'Insulation Board R-19', sku: 'INS-019', locationCode: 'WH-B / INSULATION / ROW-1 / Bay 01', warehouseName: 'Secondary Warehouse', lotNumber: 'LOT-2026-IN-001', expiryDate: daysFromNow(530), daysRemaining: 530, quantityOnHand: 115, quantityReserved: 40, quantityAvailable: 75, condition: 'good', reorderPoint: 50, daysOfSupply: 37, photoUrl: '' },
    { id: 'inv-006', productName: 'PVC Pipe 4" Schedule 40', sku: 'PIP-004', locationCode: 'WH-A / PIPE / ROW-2 / Bay 03', warehouseName: 'Main Warehouse', lotNumber: 'LOT-2026-PP-001', expiryDate: '', daysRemaining: -1, quantityOnHand: 80, quantityReserved: 20, quantityAvailable: 60, condition: 'good', reorderPoint: 40, daysOfSupply: 20, photoUrl: '' },
    { id: 'inv-007', productName: 'Concrete Adhesive 25kg', sku: 'ADH-025', locationCode: 'WH-B / ADHESIVES / ROW-1 / Bay 02', warehouseName: 'Secondary Warehouse', lotNumber: 'LOT-2026-AD-001', expiryDate: daysFromNow(45), daysRemaining: 45, quantityOnHand: 60, quantityReserved: 10, quantityAvailable: 50, condition: 'good', reorderPoint: 30, daysOfSupply: 12, photoUrl: '' },
    { id: 'inv-008', productName: 'Roofing Shingles Bundle', sku: 'ROF-001', locationCode: 'WH-A / ROOFING / ROW-1 / Bay 01', warehouseName: 'Main Warehouse', lotNumber: 'LOT-2026-RF-001', expiryDate: '', daysRemaining: -1, quantityOnHand: 35, quantityReserved: 15, quantityAvailable: 20, condition: 'good', reorderPoint: 25, daysOfSupply: 7, photoUrl: '' },
  ]
}

function getMockMovements(): StockMovement[] {
  return [
    { id: 'mv-001', type: 'receive', quantity: 200, timestamp: daysAgo(1), reference: 'GRN-2026-0042' },
    { id: 'mv-002', type: 'putaway', quantity: 200, timestamp: daysAgo(1), reference: 'PW-2026-0018' },
    { id: 'mv-003', type: 'pick', quantity: -50, timestamp: daysAgo(0), reference: 'PL-2026-0033' },
    { id: 'mv-004', type: 'pick', quantity: -30, timestamp: daysAgo(0), reference: 'PL-2026-0034' },
    { id: 'mv-005', type: 'adjustment', quantity: -5, timestamp: daysAgo(2), reference: 'CC-2026-0012' },
    { id: 'mv-006', type: 'receive', quantity: 500, timestamp: daysAgo(3), reference: 'GRN-2026-0039' },
    { id: 'mv-007', type: 'transfer', quantity: -100, timestamp: daysAgo(4), reference: 'TRF-2026-0005' },
    { id: 'mv-008', type: 'pick', quantity: -80, timestamp: daysAgo(5), reference: 'PL-2026-0030' },
  ]
}

// ─── Server Functions ──────────────────────────────────────

const getInventoryLevelsInput = z.object({
  warehouseId: z.string().optional(),
  search: z.string().optional(),
  belowReorder: z.boolean().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
})

export const getInventoryLevels = createServerFn({ method: 'GET' })
  .inputValidator(getInventoryLevelsInput)
  .handler(async ({ data: input }) => {
    let items = getMockInventory()

    if (input.search) {
      const q = input.search.toLowerCase()
      items = items.filter(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.lotNumber.toLowerCase().includes(q),
      )
    }

    if (input.belowReorder) {
      items = items.filter((i) => i.quantityAvailable <= i.reorderPoint)
    }

    const start = (input.page - 1) * input.limit
    return {
      items: items.slice(start, start + input.limit),
      total: items.length,
    }
  })

const getMovementHistoryInput = z.object({
  inventoryId: z.string(),
})

export const getMovementHistory = createServerFn({ method: 'GET' })
  .inputValidator(getMovementHistoryInput)
  .handler(async ({ data: _input }) => {
    return { movements: getMockMovements() }
  })
