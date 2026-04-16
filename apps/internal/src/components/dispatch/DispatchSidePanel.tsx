import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useDispatchStore } from '../../stores/dispatch'
import {
  getDispatchBoard,
  getDispatchDrivers,
  getDispatchRouteDetail,
  getWarehouseEmployeesForDispatch,
  markOrderDelivered,
  markOrderReturned,
  type DispatchRouteView,
  type DispatchDriverView,
} from '../../lib/server/dispatch'
import type { SecurityMethod } from '../../lib/server/warehouse'

type SidePanelTab = 'orders' | 'drivers'

interface DispatchSidePanelProps {
  isOpen: boolean
  onToggle: () => void
}

export function DispatchSidePanel({ isOpen, onToggle }: DispatchSidePanelProps) {
  const reduce = useReducedMotion()
  const [tab, setTab] = useState<SidePanelTab>('orders')
  const selectedQuoteId = useDispatchStore((s) => s.selectedQuoteId)
  const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)
  const setOverlayCloseHandler = useDispatchStore((s) => s.setOverlayCloseHandler)

  useEffect(() => {
    if (!isOpen) {
      setOverlayCloseHandler(null)
      return
    }
    setOverlayCloseHandler(() => {
      onToggle()
      return true
    })
    return () => setOverlayCloseHandler(null)
  }, [isOpen, onToggle, setOverlayCloseHandler])

  // Live clock
  const [clock, setClock] = useState(() => formatClock(new Date()))
  useEffect(() => {
    const id = setInterval(() => setClock(formatClock(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute end-0 top-1/2 z-20 -translate-y-1/2 flex h-12 w-6 items-center justify-center rounded-s-lg border border-e-0 border-black/[0.08] bg-white shadow-md hover:bg-gray-100"
          aria-label="Open panel"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/40">
            <path d="M7 1L3 5l4 4" />
          </svg>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={reduce ? false : { x: 400 }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="absolute inset-y-0 end-0 z-10 flex w-[400px] flex-col border-s border-black/[0.08] bg-white shadow-2xl"
          >
            {/* Masthead — clock + tab strip fused */}
            <div className="shrink-0">
              {/* Clock bar */}
              <div className="flex items-center justify-between px-5 pt-3.5 pb-2.5">
                <p className="font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.25em] text-black/25">
                  Dispatch
                </p>
                <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-light tabular-nums tracking-tight text-black/40">
                  {clock}
                </span>
              </div>
              {/* Tabs */}
              <div className="flex border-b border-black/[0.06]">
                <PanelTab
                  active={tab === 'orders'}
                  onClick={() => { setTab('orders'); setSelectedQuoteId(null) }}
                  label="Orders"
                />
                <PanelTab
                  active={tab === 'drivers'}
                  onClick={() => { setTab('drivers'); setSelectedQuoteId(null) }}
                  label="Fleet"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AnimatePresence mode="wait">
                {tab === 'orders' ? (
                  selectedQuoteId ? (
                    <motion.div key={`detail-${selectedQuoteId}`} {...fadeSlide(reduce)}>
                      <OrderDetail quoteId={selectedQuoteId} onBack={() => setSelectedQuoteId(null)} />
                    </motion.div>
                  ) : (
                    <motion.div key="orders-list" {...fadeSlide(reduce)}>
                      <OrdersList />
                    </motion.div>
                  )
                ) : (
                  <motion.div key="drivers-list" {...fadeSlide(reduce)}>
                    <DriversList />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function fadeSlide(reduce: boolean | null) {
  if (reduce) return {}
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: 0.15 },
  }
}

function PanelTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex-1 py-2.5 text-center"
    >
      <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${active ? 'text-black/80' : 'text-black/30 hover:text-black/50'}`}>
        {label}
      </span>
      {active && (
        <motion.div
          layoutId="dispatch-tab-indicator"
          className="absolute inset-x-5 bottom-0 h-[2px] bg-black/80"
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}
    </button>
  )
}

// ─── Orders tab ──────────────────────────────────────────

function OrdersList() {
  const reduce = useReducedMotion()
  const { data, isLoading } = useQuery({
    queryKey: ['dispatch-board'],
    queryFn: () => getDispatchBoard({ data: {} }),
    staleTime: 5_000,
  })
  const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)
  const routes = data?.routes ?? []
  const t = data?.totals

  if (isLoading) return <LoadingState />

  return (
    <div>
      {/* KPI strip — numbers are the design */}
      {t && (
        <div className="grid grid-cols-4 border-b border-black/[0.05]">
          <KPI value={t.inTransit} label="Transit" color="#2563EB" />
          <KPI value={t.overdue} label="Overdue" color={t.overdue > 0 ? '#F59E0B' : undefined} />
          <KPI value={t.deliveredToday} label="Done" color="#16a34a" />
          <KPI value={t.returnedToday} label="Returned" color={t.returnedToday > 0 ? '#dc2626' : undefined} />
        </div>
      )}

      {routes.length === 0 ? (
        <EmptyState text="No active routes" sub="Routes appear after warehouse handoff." />
      ) : (
        <div className="divide-y divide-black/[0.04]">
          {routes.map((r, i) => (
            <motion.button
              key={r.quoteId}
              type="button"
              onClick={() => setSelectedQuoteId(r.quoteId)}
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              className="group flex w-full items-start gap-3 px-5 py-3.5 text-start transition-colors hover:bg-black/[0.015]"
            >
              {/* Status edge */}
              <div className="mt-1 flex flex-col items-center gap-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: r.isOverdue ? '#F59E0B' : '#2563EB' }}
                />
                <div className="h-6 w-px bg-black/[0.06]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-black/85">
                    {r.customerName}
                  </p>
                  <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/25">
                    {r.passedAtHoursAgo.toFixed(1)}h
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-black/35">
                    {r.quoteNumber}
                  </span>
                  <span className="text-[9px] text-black/20">·</span>
                  <span className="text-[10px] text-black/35">{r.deliveryCity}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <Badge label={`${r.trucks.length} truck${r.trucks.length !== 1 ? 's' : ''}`} />
                  <Badge label={`${r.items.length} items`} />
                  {r.isOverdue && (
                    <span className="font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.08em] text-[#F59E0B]">
                      Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-1.5 shrink-0 text-black/15 transition-colors group-hover:text-black/30">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Order detail ────────────────────────────────────────

function OrderDetail({ quoteId, onBack }: { quoteId: string; onBack: () => void }) {
  const { data: route, isLoading } = useQuery({
    queryKey: ['dispatch-route', quoteId],
    queryFn: () => getDispatchRouteDetail({ data: { quoteId } }),
    staleTime: 5_000,
  })

  const [showDelivered, setShowDelivered] = useState(false)
  const [showReturned, setShowReturned] = useState(false)

  if (isLoading || !route) return <LoadingState />

  return (
    <div>
      {/* Header */}
      <div className="border-b border-black/[0.05] px-5 pt-3 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/30 transition-colors hover:text-black/50"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L4 6l4 4" />
          </svg>
          Orders
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[18px] font-bold tracking-tight text-black/90">
              {route.customerName}
            </h3>
            <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/30">
              {route.quoteNumber} · {route.passedAtHoursAgo.toFixed(1)}h in transit
            </p>
          </div>
          {route.isOverdue && (
            <span className="shrink-0 rounded-full bg-[#FEF3C7] px-2.5 py-1 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.06em] text-[#92400E]">
              Overdue
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0 divide-y divide-black/[0.04]">
        {/* Destination */}
        <DetailSection icon={pinIcon} title="Destination">
          <DataRow label="Contact" value={route.customerContactName} />
          <DataRow label="Phone" value={route.customerPhone} href={`tel:${route.customerPhone}`} />
          <DataRow label="Address" value={route.deliveryAddress} />
          <DataRow label="City" value={route.deliveryCity} />
          {route.deliveryUrgencyDays > 0 && (
            <DataRow label="Urgency" value={`${route.deliveryUrgencyDays}d`} warn />
          )}
        </DetailSection>

        {/* Trucks */}
        <DetailSection icon={truckIcon} title={`Trucks · ${route.trucks.length}`}>
          <div className="flex flex-col gap-2 mt-1">
            {route.trucks.map((t) => (
              <div
                key={t.truckId}
                className="flex items-center gap-3 rounded-lg border border-black/[0.05] bg-black/[0.01] px-3.5 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-black/75">{t.driverName}</p>
                  <p className="font-[family-name:var(--font-geist-mono)] text-[9px] tabular-nums text-black/30">
                    {t.plateNumber} · {t.capacityTons}t
                  </p>
                </div>
                <a
                  href={`tel:${t.driverPhone}`}
                  className="flex items-center gap-1.5 rounded-md bg-[#2563EB]/[0.06] px-2.5 py-1.5 text-[10px] font-semibold text-[#2563EB] transition-colors hover:bg-[#2563EB]/[0.12]"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  Call
                </a>
              </div>
            ))}
          </div>
        </DetailSection>

        {/* Cargo */}
        <DetailSection icon={boxIcon} title={`Cargo · ${route.items.length} items`}>
          <div className="mt-1 rounded-lg border border-black/[0.05] overflow-hidden">
            {route.items.map((item, i) => (
              <div
                key={item.productSlug}
                className={`flex items-baseline justify-between gap-3 px-3.5 py-2 ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}
              >
                <p className="min-w-0 truncate text-[11px] text-black/60">{item.productName}</p>
                <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-[11px] font-medium tabular-nums text-black/40">
                  {item.qty} <span className="text-[9px] text-black/25">{item.unit}</span>
                </span>
              </div>
            ))}
          </div>
        </DetailSection>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 border-t border-black/[0.06] bg-white px-5 py-4">
        <div className="grid grid-cols-2 gap-2.5">
          <motion.button
            type="button"
            onClick={() => setShowDelivered(true)}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#16a34a] py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-white shadow-sm transition-colors hover:bg-[#15803d]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Delivered
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setShowReturned(true)}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 rounded-lg border border-black/[0.08] py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-black/50 transition-colors hover:bg-black/[0.02] hover:text-black/70"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14l-4-4 4-4" /><path d="M5 10h11a4 4 0 1 1 0 8h-1" />
            </svg>
            Return
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showDelivered && (
          <ConfirmDialog route={route} type="delivered" onClose={() => setShowDelivered(false)} onSuccess={() => { setShowDelivered(false); onBack() }} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showReturned && (
          <ConfirmDialog route={route} type="returned" onClose={() => setShowReturned(false)} onSuccess={() => { setShowReturned(false); onBack() }} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Drivers tab ─────────────────────────────────────────

function DriversList() {
  const reduce = useReducedMotion()
  const { data, isLoading } = useQuery({
    queryKey: ['dispatch-drivers'],
    queryFn: () => getDispatchDrivers({ data: {} }),
    staleTime: 5_000,
  })
  const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)
  const drivers = data?.drivers ?? []

  if (isLoading) return <LoadingState />

  const dispatched = drivers.filter((d) => d.status === 'dispatched')
  const available = drivers.filter((d) => d.status === 'available')
  const other = drivers.filter((d) => d.status !== 'dispatched' && d.status !== 'available')

  // Fleet summary
  const total = drivers.length
  const activeCount = dispatched.length

  return (
    <div>
      {/* Fleet KPI */}
      <div className="flex items-end justify-between border-b border-black/[0.05] px-5 py-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-black/25">Fleet utilization</p>
          <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[28px] font-bold tabular-nums leading-none tracking-tight text-black/80">
            {activeCount}<span className="text-[16px] font-normal text-black/20">/{total}</span>
          </p>
        </div>
        {/* Mini bar */}
        <div className="flex items-end gap-[3px] pb-1">
          {drivers.map((d) => (
            <div
              key={d.truckId}
              className="w-[6px] rounded-sm transition-all"
              style={{
                height: d.status === 'dispatched' ? '20px' : d.status === 'available' ? '12px' : '6px',
                backgroundColor:
                  d.status === 'dispatched' ? '#2563EB'
                    : d.status === 'available' ? '#D1D5DB'
                      : '#F3F4F6',
              }}
            />
          ))}
        </div>
      </div>

      {dispatched.length > 0 && <DriverGroup title="On route" count={dispatched.length} drivers={dispatched} onSelectOrder={setSelectedQuoteId} reduce={reduce} />}
      {available.length > 0 && <DriverGroup title="Available" count={available.length} drivers={available} onSelectOrder={setSelectedQuoteId} reduce={reduce} />}
      {other.length > 0 && <DriverGroup title="Offline" count={other.length} drivers={other} onSelectOrder={setSelectedQuoteId} reduce={reduce} />}
      {total === 0 && <EmptyState text="No fleet data" sub="No trucks registered." />}
    </div>
  )
}

function DriverGroup({
  title,
  count,
  drivers,
  onSelectOrder,
  reduce,
}: {
  title: string
  count: number
  drivers: DispatchDriverView[]
  onSelectOrder: (id: string | null) => void
  reduce: boolean | null
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-5 pt-3.5 pb-1.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/25">{title}</p>
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/20">{count}</span>
      </div>
      <div className="divide-y divide-black/[0.03]">
        {drivers.map((d, i) => (
          <motion.div
            key={d.truckId}
            initial={reduce ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.15 }}
            className="flex items-center gap-3.5 px-5 py-3"
          >
            {/* Status indicator */}
            <div className="relative flex items-center justify-center">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center font-[family-name:var(--font-geist-mono)] text-[10px] font-bold text-white"
                style={{
                  backgroundColor:
                    d.status === 'dispatched' ? '#2563EB'
                      : d.status === 'available' ? '#D1D5DB'
                        : '#E5E7EB',
                  color: d.status === 'dispatched' ? '#fff' : '#6B7280',
                }}
              >
                {d.truckId.replace(/\D/g, '').padStart(2, '0')}
              </div>
              {d.status === 'dispatched' && (
                <div className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#16a34a]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate text-[12px] font-semibold text-black/75">{d.driverName}</p>
              <p className="font-[family-name:var(--font-geist-mono)] text-[9px] tabular-nums text-black/30">
                {d.plateNumber} · {d.capacityTons}t
              </p>
              {d.assignedQuoteNumber && (
                <button
                  type="button"
                  onClick={() => d.assignedQuoteId && onSelectOrder(d.assignedQuoteId)}
                  className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-[#2563EB] hover:underline"
                >
                  <span className="truncate">{d.assignedCustomerName}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 2l4 3-4 3" />
                  </svg>
                </button>
              )}
            </div>

            <a
              href={`tel:${d.driverPhone}`}
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-black/25 transition-colors hover:bg-black/[0.04] hover:text-black/50"
              aria-label={`Call ${d.driverName}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Confirm dialog ──────────────────────────────────────

function ConfirmDialog({
  route,
  type,
  onClose,
  onSuccess,
}: {
  route: DispatchRouteView
  type: 'delivered' | 'returned'
  onClose: () => void
  onSuccess: () => void
}) {
  const reduce = useReducedMotion()
  const qc = useQueryClient()
  const isDelivered = type === 'delivered'

  const { data: employeesData } = useQuery({
    queryKey: ['dispatch-employees'],
    queryFn: () => getWarehouseEmployeesForDispatch({ data: {} }),
    staleTime: 60_000,
  })
  const employees = employeesData?.employees ?? []

  const [advisorId, setAdvisorId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [securityMethod, setSecurityMethod] = useState<SecurityMethod>('password')
  const [securityToken, setSecurityToken] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ready =
    advisorId !== null &&
    (isDelivered || reason.trim().length >= 3) &&
    securityToken.trim().length >= 4 &&
    proofUrl.trim().length > 0

  const invalidateAll = () => {
    for (const k of ['dispatch-board', 'dispatch-route', 'dispatch-drivers', 'warehouse-queue', 'finance-inbox', 'customer-orders', 'stock-overview', 'inventory-overview']) {
      qc.invalidateQueries({ queryKey: [k] })
    }
  }

  const deliveredMut = useMutation({
    mutationFn: () => markOrderDelivered({ data: { quoteId: route.quoteId, advisorId: advisorId!, proofUrl: proofUrl.trim(), securityMethod, securityToken: securityToken.trim() } }),
    onSuccess: (r) => { if (!r.success) { setError(r.error ?? 'Error'); return }; invalidateAll(); onSuccess() },
    onError: (e: Error) => setError(e.message),
  })

  const returnedMut = useMutation({
    mutationFn: () => markOrderReturned({ data: { quoteId: route.quoteId, advisorId: advisorId!, reason: reason.trim(), proofUrl: proofUrl.trim(), securityMethod, securityToken: securityToken.trim() } }),
    onSuccess: (r) => { if (!r.success) { setError(r.error ?? 'Error'); return }; invalidateAll(); onSuccess() },
    onError: (e: Error) => setError(e.message),
  })

  const isPending = deliveredMut.isPending || returnedMut.isPending

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={reduce ? false : { scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reduce ? undefined : { scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="mx-4 w-full max-w-[420px] rounded-xl border border-black/[0.06] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-black/85">
              {isDelivered ? 'Confirm delivery' : 'Return order'}
            </h3>
            <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] text-black/30">
              {route.quoteNumber} · {route.customerName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-black/25 hover:bg-black/[0.04] hover:text-black/50">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l8 8M11 3l-8 8" /></svg>
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {!isDelivered && (
            <DialogField label="Reason for return">
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. customer refused — wrong quantities" className="w-full rounded-lg border border-black/[0.08] bg-black/[0.01] px-3 py-2.5 text-[12px] outline-none placeholder:text-black/20 focus:border-[#2563EB]/30 focus:ring-1 focus:ring-[#2563EB]/10" />
            </DialogField>
          )}

          <DialogField label="Advisor">
            <div className="grid grid-cols-2 gap-1.5">
              {employees.map((e) => (
                <button key={e.id} type="button" onClick={() => setAdvisorId(e.id)} className={`rounded-lg border px-3 py-2 text-start text-[11px] font-medium transition-all ${advisorId === e.id ? 'border-[#2563EB]/25 bg-[#2563EB]/[0.04] text-[#2563EB] shadow-sm' : 'border-black/[0.06] text-black/45 hover:border-black/[0.12]'}`}>
                  {e.name}
                </button>
              ))}
            </div>
          </DialogField>

          <DialogField label="Credential">
            <div className="grid grid-cols-2 gap-1.5">
              {(['password', 'qr'] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setSecurityMethod(m); setSecurityToken('') }} className={`rounded-lg border py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.08em] transition-all ${securityMethod === m ? 'border-black/[0.12] bg-black/[0.03] text-black/60' : 'border-black/[0.06] text-black/25'}`}>
                  {m === 'password' ? 'Password' : 'QR Scan'}
                </button>
              ))}
            </div>
            <input type={securityMethod === 'password' ? 'password' : 'text'} value={securityToken} onChange={(e) => setSecurityToken(e.target.value)} placeholder={securityMethod === 'password' ? 'Your password' : 'Scan badge'} autoComplete="off" className="mt-1.5 w-full rounded-lg border border-black/[0.08] bg-black/[0.01] px-3 py-2.5 text-[12px] outline-none placeholder:text-black/20 focus:border-[#2563EB]/30 focus:ring-1 focus:ring-[#2563EB]/10" />
            <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[8px] text-black/20">Dev mock · 1234</p>
          </DialogField>

          <DialogField label={isDelivered ? 'Proof of delivery' : 'Proof of return'}>
            <input type="text" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="e.g. pod-photo.jpg" className="w-full rounded-lg border border-black/[0.08] bg-black/[0.01] px-3 py-2.5 text-[12px] outline-none placeholder:text-black/20 focus:border-[#2563EB]/30 focus:ring-1 focus:ring-[#2563EB]/10" />
          </DialogField>

          {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}

          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-black/[0.08] py-2.5 text-[11px] font-semibold text-black/35 transition-colors hover:bg-black/[0.02]">
              Cancel
            </button>
            <motion.button
              type="button"
              whileTap={ready ? { scale: 0.97 } : undefined}
              onClick={() => { setError(null); isDelivered ? deliveredMut.mutate() : returnedMut.mutate() }}
              disabled={!ready || isPending}
              className={`flex-1 rounded-lg py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] transition-all disabled:cursor-not-allowed disabled:opacity-35 ${isDelivered ? 'bg-[#16a34a] text-white shadow-sm hover:bg-[#15803d]' : 'bg-black/80 text-white shadow-sm hover:bg-black/70'}`}
            >
              {isPending ? 'Processing…' : isDelivered ? 'Confirm delivered' : 'Confirm return'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Primitives ──────────────────────────────────────────

function KPI({ value, label, color }: { value: number; label: string; color?: string }) {
  const hasValue = value > 0
  return (
    <div className="flex flex-col items-center py-3.5">
      <span
        className="font-[family-name:var(--font-geist-mono)] text-[22px] font-bold tabular-nums leading-none tracking-tight"
        style={{ color: hasValue && color ? color : 'rgba(0,0,0,0.15)' }}
      >
        {value}
      </span>
      <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-black/25">{label}</span>
    </div>
  )
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded bg-black/[0.04] px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-[9px] tabular-nums text-black/35">
      {label}
    </span>
  )
}

function DetailSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-black/25">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/30">{title}</p>
      </div>
      {children}
    </div>
  )
}

function DataRow({ label, value, href, warn }: { label: string; value: string; href?: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3px]">
      <span className="shrink-0 text-[10px] text-black/30">{label}</span>
      {href ? (
        <a href={href} className="truncate text-end text-[11px] font-medium text-[#2563EB] hover:underline">{value}</a>
      ) : (
        <span className={`truncate text-end text-[11px] ${warn ? 'font-semibold text-[#F59E0B]' : 'text-black/55'}`}>{value}</span>
      )}
    </div>
  )
}

function DialogField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.12em] text-black/30">{label}</label>
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
    </div>
  )
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <p className="text-[12px] font-semibold text-black/25">{text}</p>
      <p className="mt-1.5 text-[10px] text-black/15 max-w-[240px]">{sub}</p>
    </div>
  )
}

// ─── Icons (inline SVG to avoid lucide dep bloat) ────────

const pinIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
)

const truckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)

const boxIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05" /><path d="M12 22.08V12" />
  </svg>
)
