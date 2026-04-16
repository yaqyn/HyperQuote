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

  // Register with ModuleWindow's close ladder — pressing the window X
  // closes this panel first instead of closing the whole module.
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

  return (
    <>
      {/* Arrow toggle — only visible when panel is closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute end-0 top-1/2 z-20 -translate-y-1/2 flex h-12 w-6 items-center justify-center rounded-s-lg border border-e-0 border-black/[0.08] bg-white shadow-md hover:bg-gray-100"
          aria-label="Open panel"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-black/40"
          >
            <path d="M7 1L3 5l4 4" />
          </svg>
        </button>
      )}

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={reduce ? false : { x: 380 }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: 380 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="absolute inset-y-0 end-0 z-10 flex w-[380px] flex-col border-s border-black/[0.08] bg-[var(--color-surface)] shadow-2xl"
          >
            {/* Tab strip */}
            <div className="flex shrink-0 border-b border-black/[0.06]">
              <TabButton active={tab === 'orders'} onClick={() => { setTab('orders'); setSelectedQuoteId(null) }} label="Orders" />
              <TabButton active={tab === 'drivers'} onClick={() => { setTab('drivers'); setSelectedQuoteId(null) }} label="Drivers" />
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {tab === 'orders' ? (
                selectedQuoteId ? (
                  <OrderDetail quoteId={selectedQuoteId} onBack={() => setSelectedQuoteId(null)} />
                ) : (
                  <OrdersList />
                )
              ) : (
                <DriversList />
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 text-center text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors ${
        active
          ? 'border-b-2 border-[#2563EB] text-[#2563EB]'
          : 'text-black/40 hover:text-black/60'
      }`}
    >
      {label}
    </button>
  )
}

// ─── Orders tab ──────────────────────────────────────────

function OrdersList() {
  const { data, isLoading } = useQuery({
    queryKey: ['dispatch-board'],
    queryFn: () => getDispatchBoard({ data: {} }),
    staleTime: 5_000,
  })
  const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)
  const routes = data?.routes ?? []
  const totals = data?.totals

  if (isLoading) {
    return <LoadingState text="Loading orders…" />
  }

  return (
    <div className="flex flex-col">
      {/* Stats */}
      {totals && (
        <div className="grid grid-cols-4 gap-px border-b border-black/[0.06] bg-black/[0.02]">
          <StatCell value={totals.inTransit} label="Transit" />
          <StatCell value={totals.overdue} label="Overdue" warn={totals.overdue > 0} />
          <StatCell value={totals.deliveredToday} label="Delivered" />
          <StatCell value={totals.returnedToday} label="Returned" />
        </div>
      )}

      {routes.length === 0 ? (
        <EmptyState text="No active routes" sub="Orders appear here after warehouse passes them to dispatch." />
      ) : (
        routes.map((r) => (
          <button
            key={r.quoteId}
            type="button"
            onClick={() => setSelectedQuoteId(r.quoteId)}
            className="flex items-center gap-3 border-b border-black/[0.04] px-4 py-3 text-start transition-colors hover:bg-black/[0.02]"
          >
            <div className="flex-1 min-w-0">
              <p className="truncate text-[13px] font-semibold text-black/80">
                {r.customerName}
              </p>
              <p className="mt-0.5 text-[11px] text-black/40">
                {r.quoteNumber} · {r.deliveryCity} · {r.items.length} items
              </p>
            </div>
            <div className="shrink-0 text-end">
              {r.isOverdue ? (
                <span className="text-[10px] font-semibold uppercase text-[#F59E0B]">Overdue</span>
              ) : (
                <span className="text-[10px] tabular-nums text-black/30">{r.passedAtHoursAgo.toFixed(1)}h</span>
              )}
            </div>
          </button>
        ))
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

  if (isLoading || !route) {
    return <LoadingState text="Loading route…" />
  }

  return (
    <div className="flex flex-col">
      {/* Back + header */}
      <div className="border-b border-black/[0.06] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="mb-2 text-[11px] font-medium text-[#2563EB] hover:underline"
        >
          ← All orders
        </button>
        <h3 className="text-[16px] font-bold text-black/85">{route.customerName}</h3>
        <p className="mt-0.5 text-[11px] text-black/40">{route.quoteNumber}</p>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Customer info */}
        <Section title="Customer">
          <InfoRow label="Contact" value={route.customerContactName} />
          <InfoRow label="Phone" value={route.customerPhone} href={`tel:${route.customerPhone}`} />
          <InfoRow label="Address" value={route.deliveryAddress} />
          <InfoRow label="City" value={route.deliveryCity} />
        </Section>

        {/* Trucks */}
        <Section title="Trucks">
          {route.trucks.map((t) => (
            <div key={t.truckId} className="flex items-center justify-between gap-2 py-1.5">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-black/75">{t.driverName}</p>
                <p className="text-[10px] text-black/35">{t.plateNumber} · {t.capacityTons}t</p>
              </div>
              <a
                href={`tel:${t.driverPhone}`}
                className="shrink-0 rounded border border-[#2563EB]/20 px-2 py-1 text-[10px] font-semibold text-[#2563EB] transition-colors hover:bg-[#2563EB]/5"
              >
                Call
              </a>
            </div>
          ))}
        </Section>

        {/* Items */}
        <Section title={`Items · ${route.items.length}`}>
          {route.items.map((item) => (
            <div key={item.productSlug} className="flex items-baseline justify-between gap-2 py-1">
              <p className="min-w-0 truncate text-[12px] text-black/65">{item.productName}</p>
              <span className="shrink-0 tabular-nums text-[11px] text-black/40">
                {item.qty} {item.unit}
              </span>
            </div>
          ))}
        </Section>

        {/* Emergency */}
        <a
          href="tel:991"
          className="flex items-center justify-center gap-2 rounded border border-red-200 bg-red-50 py-2.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-100"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          991 Emergency
        </a>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowDelivered(true)}
            className="rounded border border-green-200 bg-green-50 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-green-700 transition-colors hover:bg-green-100"
          >
            Delivered
          </button>
          <button
            type="button"
            onClick={() => setShowReturned(true)}
            className="rounded border border-red-200 bg-red-50 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-red-600 transition-colors hover:bg-red-100"
          >
            Returned
          </button>
        </div>
      </div>

      {/* Dialogs */}
      <AnimatePresence>
        {showDelivered && (
          <ConfirmDialog
            route={route}
            type="delivered"
            onClose={() => setShowDelivered(false)}
            onSuccess={() => { setShowDelivered(false); onBack() }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showReturned && (
          <ConfirmDialog
            route={route}
            type="returned"
            onClose={() => setShowReturned(false)}
            onSuccess={() => { setShowReturned(false); onBack() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Drivers tab ─────────────────────────────────────────

function DriversList() {
  const { data, isLoading } = useQuery({
    queryKey: ['dispatch-drivers'],
    queryFn: () => getDispatchDrivers({ data: {} }),
    staleTime: 5_000,
  })
  const setSelectedQuoteId = useDispatchStore((s) => s.setSelectedQuoteId)
  const drivers = data?.drivers ?? []

  if (isLoading) {
    return <LoadingState text="Loading drivers…" />
  }

  const dispatched = drivers.filter((d) => d.status === 'dispatched')
  const available = drivers.filter((d) => d.status === 'available')
  const other = drivers.filter((d) => d.status !== 'dispatched' && d.status !== 'available')

  return (
    <div className="flex flex-col">
      {dispatched.length > 0 && (
        <DriverGroup title="Dispatched" drivers={dispatched} onSelectOrder={setSelectedQuoteId} />
      )}
      {available.length > 0 && (
        <DriverGroup title="Available" drivers={available} onSelectOrder={setSelectedQuoteId} />
      )}
      {other.length > 0 && (
        <DriverGroup title="Other" drivers={other} onSelectOrder={setSelectedQuoteId} />
      )}
      {drivers.length === 0 && (
        <EmptyState text="No drivers" sub="No trucks in the fleet." />
      )}
    </div>
  )
}

function DriverGroup({
  title,
  drivers,
  onSelectOrder,
}: {
  title: string
  drivers: DispatchDriverView[]
  onSelectOrder: (id: string | null) => void
}) {
  return (
    <div>
      <p className="border-b border-black/[0.04] bg-black/[0.015] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">
        {title} · {drivers.length}
      </p>
      {drivers.map((d) => (
        <div
          key={d.truckId}
          className="flex items-center gap-3 border-b border-black/[0.04] px-4 py-3"
        >
          {/* Status dot */}
          <div
            className={`h-2 w-2 shrink-0 rounded-full ${
              d.status === 'dispatched'
                ? 'bg-[#2563EB]'
                : d.status === 'available'
                  ? 'bg-green-500'
                  : 'bg-black/20'
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium text-black/75">{d.driverName}</p>
            <p className="text-[10px] text-black/35">
              {d.plateNumber} · {d.capacityTons}t · {d.bodyType}
            </p>
            {d.assignedQuoteNumber && (
              <button
                type="button"
                onClick={() => d.assignedQuoteId && onSelectOrder(d.assignedQuoteId)}
                className="mt-0.5 text-[10px] font-medium text-[#2563EB] hover:underline"
              >
                {d.assignedQuoteNumber} → {d.assignedCustomerName}
              </button>
            )}
          </div>
          <a
            href={`tel:${d.driverPhone}`}
            className="shrink-0 rounded border border-black/[0.08] px-2 py-1 text-[10px] font-medium text-black/50 transition-colors hover:bg-black/[0.02]"
          >
            Call
          </a>
        </div>
      ))}
    </div>
  )
}

// ─── Confirm dialog (shared for delivered + returned) ────

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

  const nameOk = advisorId !== null
  const reasonOk = isDelivered || reason.trim().length >= 3
  const tokenOk = securityToken.trim().length >= 4
  const proofOk = proofUrl.trim().length > 0
  const ready = nameOk && reasonOk && tokenOk && proofOk

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['dispatch-board'] })
    qc.invalidateQueries({ queryKey: ['dispatch-route'] })
    qc.invalidateQueries({ queryKey: ['dispatch-drivers'] })
    qc.invalidateQueries({ queryKey: ['warehouse-queue'] })
    qc.invalidateQueries({ queryKey: ['finance-inbox'] })
    qc.invalidateQueries({ queryKey: ['customer-orders'] })
    qc.invalidateQueries({ queryKey: ['stock-overview'] })
    qc.invalidateQueries({ queryKey: ['inventory-overview'] })
  }

  const deliveredMutation = useMutation({
    mutationFn: () =>
      markOrderDelivered({
        data: {
          quoteId: route.quoteId,
          advisorId: advisorId!,
          proofUrl: proofUrl.trim(),
          securityMethod,
          securityToken: securityToken.trim(),
        },
      }),
    onSuccess: (res) => {
      if (!res.success) { setError(res.error ?? 'Unknown error'); return }
      invalidateAll()
      onSuccess()
    },
    onError: (e: Error) => setError(e.message),
  })

  const returnedMutation = useMutation({
    mutationFn: () =>
      markOrderReturned({
        data: {
          quoteId: route.quoteId,
          advisorId: advisorId!,
          reason: reason.trim(),
          proofUrl: proofUrl.trim(),
          securityMethod,
          securityToken: securityToken.trim(),
        },
      }),
    onSuccess: (res) => {
      if (!res.success) { setError(res.error ?? 'Unknown error'); return }
      invalidateAll()
      onSuccess()
    },
    onError: (e: Error) => setError(e.message),
  })

  const isPending = deliveredMutation.isPending || returnedMutation.isPending
  const accentColor = isDelivered ? '#16a34a' : '#dc2626'

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={reduce ? false : { scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reduce ? undefined : { scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="mx-4 w-full max-w-[420px] rounded-lg border border-black/[0.08] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-[14px] font-bold"
          style={{ color: accentColor }}
        >
          {isDelivered ? 'Confirm delivery' : 'Return order'} · {route.quoteNumber}
        </h3>
        <p className="mt-1 text-[12px] text-black/40">
          {route.customerName} · {route.deliveryCity}
        </p>
        {!isDelivered && (
          <p className="mt-1.5 text-[11px] text-black/30">
            The order will return to the warehouse loading queue.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          {/* Reason (returned only) */}
          {!isDelivered && (
            <Field label="Reason for return">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. customer refused — wrong quantities"
                className="w-full rounded border border-black/[0.1] px-3 py-2 text-[13px] outline-none placeholder:text-black/25 focus:border-[#2563EB]/40"
              />
            </Field>
          )}

          {/* Advisor */}
          <Field label="Advisor">
            <div className="grid grid-cols-2 gap-1.5">
              {employees.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setAdvisorId(e.id)}
                  className={`rounded border px-2.5 py-1.5 text-start text-[11px] font-medium transition-colors ${
                    advisorId === e.id
                      ? 'border-[#2563EB]/30 bg-[#2563EB]/5 text-[#2563EB]'
                      : 'border-black/[0.08] text-black/50 hover:border-black/15'
                  }`}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </Field>

          {/* Security */}
          <Field label="Your credential">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => { setSecurityMethod('password'); setSecurityToken('') }}
                className={`rounded border py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  securityMethod === 'password'
                    ? 'border-[#2563EB]/30 text-[#2563EB]'
                    : 'border-black/[0.08] text-black/35'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => { setSecurityMethod('qr'); setSecurityToken('') }}
                className={`rounded border py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  securityMethod === 'qr'
                    ? 'border-[#2563EB]/30 text-[#2563EB]'
                    : 'border-black/[0.08] text-black/35'
                }`}
              >
                QR Scan
              </button>
            </div>
            <input
              type={securityMethod === 'password' ? 'password' : 'text'}
              value={securityToken}
              onChange={(e) => setSecurityToken(e.target.value)}
              placeholder={securityMethod === 'password' ? 'Your password' : 'Scan your badge'}
              autoComplete="off"
              className="mt-1.5 w-full rounded border border-black/[0.1] px-3 py-2 text-[13px] outline-none placeholder:text-black/25 focus:border-[#2563EB]/40"
            />
            <p className="mt-1 text-[9px] text-black/25">Dev mock · type 1234</p>
          </Field>

          {/* Proof */}
          <Field label={isDelivered ? 'Proof of delivery' : 'Proof of return'}>
            <input
              type="text"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="e.g. pod-photo.jpg"
              className="w-full rounded border border-black/[0.1] px-3 py-2 text-[13px] outline-none placeholder:text-black/25 focus:border-[#2563EB]/40"
            />
          </Field>

          {error && (
            <p className="text-[11px] font-medium text-red-600">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-black/[0.08] py-2.5 text-[11px] font-semibold text-black/40 transition-colors hover:bg-black/[0.02]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null)
                if (isDelivered) deliveredMutation.mutate()
                else returnedMutation.mutate()
              }}
              disabled={!ready || isPending}
              className={`flex-1 rounded border py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                isDelivered
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              {isPending ? 'Confirming…' : isDelivered ? 'Confirm delivered' : 'Confirm return'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Shared small components ─────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/30">
        {title}
      </p>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-black/35">
        {label}
      </label>
      {children}
    </div>
  )
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="shrink-0 text-[11px] text-black/35">{label}</span>
      {href ? (
        <a href={href} className="truncate text-end text-[12px] font-medium text-[#2563EB] hover:underline">
          {value}
        </a>
      ) : (
        <span className="truncate text-end text-[12px] text-black/60">{value}</span>
      )}
    </div>
  )
}

function StatCell({ value, label, warn }: { value: number; label: string; warn?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2.5">
      <span className={`text-[18px] font-bold tabular-nums ${warn ? 'text-[#F59E0B]' : 'text-black/70'}`}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-black/30">{label}</span>
    </div>
  )
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-[11px] text-black/30">{text}</p>
    </div>
  )
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[12px] font-semibold text-black/30">{text}</p>
      <p className="mt-1 text-[11px] text-black/20 max-w-[260px]">{sub}</p>
    </div>
  )
}
