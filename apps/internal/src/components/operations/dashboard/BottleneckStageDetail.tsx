import { useOperationsStore } from '../../../stores/operations'

// Mock stuck orders for bottleneck detail view
// Will be replaced by server query when connected to real data
const MOCK_STUCK_ORDERS: Record<string, StuckOrder[]> = {
  procurement: [
    { id: 'ord-001', orderNumber: 'SO-2024-0031', customerName: 'Al Nile Construction', timeInStageMs: 36 * 3_600_000, reason: 'Supplier unresponsive', assignedTo: 'Ahmed K.' },
    { id: 'ord-002', orderNumber: 'SO-2024-0038', customerName: 'Cairo Builders Co.', timeInStageMs: 18 * 3_600_000, reason: 'Price confirmation pending', assignedTo: 'Layla M.' },
  ],
  warehouse: [
    { id: 'ord-003', orderNumber: 'SO-2024-0029', customerName: 'Delta Steel LLC', timeInStageMs: 52 * 3_600_000, reason: 'Partial shipment received', assignedTo: 'Omar H.' },
    { id: 'ord-004', orderNumber: 'SO-2024-0033', customerName: 'Giza Materials', timeInStageMs: 30 * 3_600_000, reason: 'QC hold - damaged goods', assignedTo: 'Omar H.' },
    { id: 'ord-005', orderNumber: 'SO-2024-0035', customerName: 'Heliopolis Trading', timeInStageMs: 28 * 3_600_000, reason: 'Storage bay full', assignedTo: 'Fatma S.' },
    { id: 'ord-006', orderNumber: 'SO-2024-0036', customerName: 'Maadi Supplies', timeInStageMs: 26 * 3_600_000, reason: 'Weight mismatch', assignedTo: 'Fatma S.' },
    { id: 'ord-007', orderNumber: 'SO-2024-0037', customerName: 'Nasr City Cement', timeInStageMs: 25 * 3_600_000, reason: 'Awaiting documentation', assignedTo: 'Omar H.' },
    { id: 'ord-008', orderNumber: 'SO-2024-0039', customerName: 'Shoubra Hardware', timeInStageMs: 20 * 3_600_000, reason: 'Forklift unavailable', assignedTo: 'Fatma S.' },
    { id: 'ord-009', orderNumber: 'SO-2024-0041', customerName: 'October Concrete', timeInStageMs: 12 * 3_600_000, reason: 'Consolidation pending', assignedTo: 'Omar H.' },
  ],
  dispatch: [
    { id: 'ord-010', orderNumber: 'SO-2024-0027', customerName: 'Zamalek Interiors', timeInStageMs: 8 * 3_600_000, reason: 'No available driver', assignedTo: 'Hassan T.' },
  ],
  delivery: [
    { id: 'ord-011', orderNumber: 'SO-2024-0025', customerName: 'Dokki Plumbing', timeInStageMs: 48 * 3_600_000, reason: 'Customer site locked', assignedTo: 'Driver: Mostafa' },
    { id: 'ord-012', orderNumber: 'SO-2024-0030', customerName: 'Mohandessin Steel', timeInStageMs: 30 * 3_600_000, reason: 'Cairo truck ban hours', assignedTo: 'Driver: Youssef' },
    { id: 'ord-013', orderNumber: 'SO-2024-0034', customerName: 'Abbasiya Tools', timeInStageMs: 6 * 3_600_000, reason: 'Traffic delay - Ring Road', assignedTo: 'Driver: Ali' },
  ],
}

interface StuckOrder {
  id: string
  orderNumber: string
  customerName: string
  timeInStageMs: number
  reason: string
  assignedTo: string
}

function formatTimeInStage(ms: number): string {
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remHours = hours % 24
    return `${days}d ${remHours}h`
  }
  return `${hours}h ${minutes}m`
}

export function BottleneckStageDetail() {
  const selectedBottleneckStage = useOperationsStore((s) => s.selectedBottleneckStage)
  const setSelectedOrderId = useOperationsStore((s) => s.setSelectedOrderId)
  const setActiveTab = useOperationsStore((s) => s.setActiveTab)

  if (!selectedBottleneckStage) return null

  const orders = MOCK_STUCK_ORDERS[selectedBottleneckStage] ?? []

  const handleRowClick = (orderId: string) => {
    setSelectedOrderId(orderId)
    setActiveTab('order-detail')
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h3 className="text-base font-semibold mb-3 capitalize">
        {selectedBottleneckStage} — Stuck Orders
      </h3>

      {orders.length === 0 ? (
        <p className="text-sm text-black/40 dark:text-white/40 text-center py-6">
          No stuck orders in this stage
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => {
            const exceeds24h = order.timeInStageMs > 24 * 3_600_000
            return (
              <button
                key={order.id}
                type="button"
                onClick={() => handleRowClick(order.id)}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-start w-full"
              >
                <span className="font-geist-mono text-sm w-32 shrink-0">
                  {order.orderNumber}
                </span>
                <span className="text-sm font-medium w-40 shrink-0 truncate">
                  {order.customerName}
                </span>
                <span
                  className={`font-geist-mono text-sm w-20 shrink-0 ${
                    exceeds24h ? 'text-red-600' : ''
                  }`}
                >
                  {formatTimeInStage(order.timeInStageMs)}
                </span>
                <span className="text-[13px] font-normal text-black/50 dark:text-white/50 flex-1 truncate">
                  {order.reason}
                </span>
                <span className="text-[13px] font-normal text-black/50 dark:text-white/50 w-28 shrink-0 truncate text-end">
                  {order.assignedTo}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
