import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
  FulfillmentOrder,
  FulfillmentStage,
  OrderDetail,
  OrderLineItem,
  OrderDocument,
  ActivityLogEntry,
  HandoffStatus,
} from '../../types/operations'

// ─── Helpers ──────────────────────────────────────────────

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

// ─── Mock Data ─────────────────────────────────────────────

function getMockOrders(): FulfillmentOrder[] {
  return [
    // PO Placed (2)
    { id: 'ord-001', orderNumber: 'SO-2024-0047', customerName: 'Cairo Steel Construction', totalValue: 2_850_000, totalItems: 8, readyItems: 0, eta: daysFromNow(12), color: 'green', stage: 'po_placed', assignedTo: 'Ahmed Mostafa' },
    { id: 'ord-002', orderNumber: 'SO-2024-0051', customerName: 'Delta Cement Projects', totalValue: 1_420_000, totalItems: 4, readyItems: 0, eta: daysFromNow(10), color: 'green', stage: 'po_placed', assignedTo: 'Mariam Farouk' },
    // In Transit (2)
    { id: 'ord-003', orderNumber: 'SO-2024-0039', customerName: 'Nile Materials Trading', totalValue: 5_100_000, totalItems: 12, readyItems: 0, eta: daysFromNow(3), color: 'yellow', stage: 'in_transit', assignedTo: 'Hassan Ibrahim' },
    { id: 'ord-004', orderNumber: 'SO-2024-0042', customerName: 'Alexandria Building Co.', totalValue: 3_750_000, totalItems: 6, readyItems: 0, eta: daysFromNow(5), color: 'green', stage: 'in_transit', assignedTo: 'Ahmed Mostafa' },
    // At Warehouse (2)
    { id: 'ord-005', orderNumber: 'SO-2024-0035', customerName: 'Giza Towers Development', totalValue: 8_200_000, totalItems: 15, readyItems: 10, eta: daysFromNow(2), color: 'yellow', stage: 'at_warehouse', assignedTo: 'Fatima El-Said' },
    { id: 'ord-006', orderNumber: 'SO-2024-0038', customerName: 'Suez Canal Contractors', totalValue: 4_600_000, totalItems: 9, readyItems: 7, eta: daysFromNow(1), color: 'red', stage: 'at_warehouse', assignedTo: 'Hassan Ibrahim' },
    // Preparing (2)
    { id: 'ord-007', orderNumber: 'SO-2024-0033', customerName: 'Heliopolis Construction', totalValue: 6_300_000, totalItems: 10, readyItems: 10, eta: daysFromNow(1), color: 'green', stage: 'preparing', assignedTo: 'Omar Khalil' },
    { id: 'ord-008', orderNumber: 'SO-2024-0036', customerName: 'Maadi Infrastructure', totalValue: 2_100_000, totalItems: 5, readyItems: 5, eta: daysFromNow(0), color: 'red', stage: 'preparing', assignedTo: 'Fatima El-Said' },
    // Out for Delivery (2)
    { id: 'ord-009', orderNumber: 'SO-2024-0030', customerName: 'New Cairo Developers', totalValue: 7_500_000, totalItems: 14, readyItems: 14, eta: daysFromNow(0), color: 'green', stage: 'out_for_delivery', assignedTo: 'Driver: Youssef Ali' },
    { id: 'ord-010', orderNumber: 'SO-2024-0031', customerName: '6th October Industries', totalValue: 3_200_000, totalItems: 7, readyItems: 7, eta: daysFromNow(0), color: 'yellow', stage: 'out_for_delivery', assignedTo: 'Driver: Mahmoud Saad' },
    // Delivered (2)
    { id: 'ord-011', orderNumber: 'SO-2024-0025', customerName: 'Mansoura Steel Works', totalValue: 4_800_000, totalItems: 11, readyItems: 11, eta: daysAgo(1), color: 'green', stage: 'delivered', assignedTo: 'Completed' },
    { id: 'ord-012', orderNumber: 'SO-2024-0027', customerName: 'Port Said Trading', totalValue: 1_950_000, totalItems: 3, readyItems: 3, eta: daysAgo(2), color: 'green', stage: 'delivered', assignedTo: 'Completed' },
  ]
}

function getMockOrderDetail(): OrderDetail {
  const items: OrderLineItem[] = [
    { id: 'li-001', productName: 'Steel Rebar 16mm', supplier: 'Cairo Steel Co.', poNumber: 'PO-2026-00018', quantity: 200, fulfilledQuantity: 200, status: 'delivered', eta: daysAgo(1) },
    { id: 'li-002', productName: 'Portland Cement CEM I 42.5N', supplier: 'Delta Cement Group', poNumber: 'PO-2026-00019', quantity: 5000, fulfilledQuantity: 3000, status: 'in_transit', eta: daysFromNow(2) },
    { id: 'li-003', productName: 'Ceramic Floor Tiles 60x60cm', supplier: 'Nile Building Supplies', poNumber: 'PO-2026-00020', quantity: 2000, fulfilledQuantity: 0, status: 'po_placed', eta: daysFromNow(14) },
    { id: 'li-004', productName: 'Gypsum Board 12.5mm', supplier: 'Nile Building Supplies', poNumber: 'PO-2026-00020', quantity: 1000, fulfilledQuantity: 500, status: 'at_warehouse', eta: daysFromNow(3) },
    { id: 'li-005', productName: 'Electrical Cable 2.5mm', supplier: 'Alexandria Rebar Factory', poNumber: 'PO-2026-00021', quantity: 300, fulfilledQuantity: 300, status: 'delivered', eta: daysAgo(2) },
  ]

  const documents: OrderDocument[] = [
    { id: 'doc-001', type: 'quote', name: 'QR-2024-0047.pdf', url: '/docs/QR-2024-0047.pdf', createdAt: daysAgo(15) },
    { id: 'doc-002', type: 'purchase_order', name: 'PO-2026-00018.pdf', url: '/docs/PO-2026-00018.pdf', createdAt: daysAgo(12) },
    { id: 'doc-003', type: 'delivery_note', name: 'DN-2026-0042.pdf', url: '/docs/DN-2026-0042.pdf', createdAt: daysAgo(1) },
  ]

  const activityLog: ActivityLogEntry[] = [
    { id: 'log-001', action: 'Order created', actor: 'Ahmed Mostafa', timestamp: daysAgo(15), details: 'Order created from quote QR-2024-0047' },
    { id: 'log-002', action: 'Quote accepted', actor: 'Customer: Cairo Steel Construction', timestamp: daysAgo(14), details: 'Customer accepted quote, order confirmed' },
    { id: 'log-003', action: 'PO generated', actor: 'System', timestamp: daysAgo(12), details: 'Purchase order PO-2026-00018 generated for Cairo Steel Co.' },
    { id: 'log-004', action: 'Supplier confirmed', actor: 'Cairo Steel Co.', timestamp: daysAgo(11), details: 'Supplier confirmed PO with delivery in 10 days' },
    { id: 'log-005', action: 'Shipment dispatched', actor: 'System', timestamp: daysAgo(3), details: 'First batch shipped from supplier warehouse' },
    { id: 'log-006', action: 'Partial delivery', actor: 'Driver: Youssef Ali', timestamp: daysAgo(1), details: 'Steel rebar delivered, 200 tons received at site' },
    { id: 'log-007', action: 'Handoff to warehouse', actor: 'Fatima El-Said', timestamp: daysAgo(1), details: 'Remaining items handed to warehouse for preparation' },
    { id: 'log-008', action: 'Status updated', actor: 'Hassan Ibrahim', timestamp: daysAgo(0), details: 'Order marked as partially fulfilled' },
  ]

  const handoff: HandoffStatus = {
    currentStage: 'warehouse',
    currentOwner: 'Fatima El-Said',
    timeInStage: 18 * 60 * 60 * 1000, // 18 hours
    slaMs: 48 * 60 * 60 * 1000,       // 48 hours
    completedStages: ['sales', 'procurement'],
  }

  return {
    id: 'ord-001',
    orderNumber: 'SO-2024-0047',
    customerName: 'Cairo Steel Construction',
    quoteRef: 'QR-2024-0047',
    totalValue: 2_850_000,
    status: 'partially_fulfilled',
    createdAt: daysAgo(15),
    items,
    documents,
    activityLog,
    handoff,
  }
}

// ─── Server Functions ──────────────────────────────────────

const getOrderBoardInput = z.object({
  stages: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(50),
})

export const getOrderBoard = createServerFn({ method: 'GET' })
  .inputValidator(getOrderBoardInput)
  .handler(async ({ data: input }) => {
    let orders = getMockOrders()

    if (input.stages && input.stages.length > 0) {
      orders = orders.filter((o) => input.stages!.includes(o.stage))
    }
    if (input.assignedTo) {
      orders = orders.filter((o) => o.assignedTo === input.assignedTo)
    }

    const statusCounts: Record<string, number> = {
      po_placed: 0,
      in_transit: 0,
      at_warehouse: 0,
      preparing: 0,
      out_for_delivery: 0,
      delivered: 0,
    }
    for (const order of getMockOrders()) {
      statusCounts[order.stage] = (statusCounts[order.stage] ?? 0) + 1
    }

    const start = (input.page - 1) * input.limit
    return {
      orders: orders.slice(start, start + input.limit),
      statusCounts: statusCounts as Record<FulfillmentStage, number>,
    }
  })

const getOrderDetailInput = z.object({
  orderId: z.string(),
})

export const getOrderDetail = createServerFn({ method: 'GET' })
  .inputValidator(getOrderDetailInput)
  .handler(async ({ data: _input }) => {
    return getMockOrderDetail()
  })

const updateOrderStatusInput = z.object({
  orderId: z.string(),
  status: z.string(),
  notes: z.string().optional(),
})

export const updateOrderStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateOrderStatusInput)
  .handler(async ({ data: _input }) => {
    return { success: true }
  })
