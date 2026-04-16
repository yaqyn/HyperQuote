import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, Clock, TrendingUp, Truck } from 'lucide-react'
import { useFinanceStore, type FinanceInboxFilter } from '../../stores/finance'
import {
  getFinanceInbox,
  type FinanceOrderView,
  type FinanceDealView,
} from '../../lib/server/finance'
import { FinancePaymentPanel } from './FinancePaymentPanel'

// ─── Helpers ──────────────────────────────────────────────

function formatHoursAgo(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.round(days / 30)}mo ago`
}

function formatEgp(n: number): string {
  return Math.round(n).toLocaleString('en-EG')
}

// ─── Inline stat ──────────────────────────────────────────

function InlineStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number | string
  tone?: 'neutral' | 'emerald' | 'red' | 'amber'
}) {
  const color = {
    neutral: 'text-[var(--color-text)]',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    red: 'text-red-700 dark:text-red-300',
    amber: 'text-amber-700 dark:text-amber-400',
  }[tone]
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={`font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold leading-none tabular-nums ${color}`}
      >
        {value}
      </span>
      <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
        {label}
      </span>
    </div>
  )
}

// ─── Filter chip ──────────────────────────────────────────

function FilterChip({
  label,
  count,
  active,
  onPress,
  hasAttention,
}: {
  label: string
  count: number
  active: boolean
  onPress: () => void
  hasAttention?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`group relative inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium ring-1 transition-all ${
        active
          ? 'text-[var(--color-text)] ring-black/[0.07] dark:ring-white/[0.1]'
          : 'text-[var(--color-text-muted)] ring-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
      }`}
    >
      {hasAttention && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-0 w-[35%] rounded-e-md bg-gradient-to-l from-red-500/[0.09] via-red-500/[0.03] to-transparent"
        />
      )}
      <span className="relative">{label}</span>
      <span className="relative font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
        {count}
      </span>
    </button>
  )
}

// ─── Status dot ───────────────────────────────────────────

function statusDotClass(status: 'unpaid' | 'partial' | 'paid', urgent = false) {
  if (urgent) return 'bg-red-500'
  if (status === 'unpaid') return 'bg-amber-500'
  if (status === 'partial') return 'bg-[var(--color-primary)]'
  return 'bg-emerald-500'
}

// ─── Customer order row ──────────────────────────────────

const ROW_GRID =
  'grid items-center gap-4 border-b border-black/[0.04] px-3 py-3 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03] cursor-pointer text-start w-full'
const ROW_GRID_COLS =
  '14px minmax(0,1.6fr) minmax(0,1.2fr) minmax(140px,0.9fr) minmax(160px,1.1fr) 120px'

function OrderRow({
  order,
  onOpen,
}: {
  order: FinanceOrderView
  onOpen: (id: string) => void
}) {
  const urgent = order.paymentStatus === 'partial' && order.isDelivered
  const dot = statusDotClass(order.paymentStatus, urgent)
  const remainingLabel =
    order.paymentStatus === 'paid'
      ? 'settled'
      : order.paymentStatus === 'partial'
        ? `${formatEgp(order.remainingDue)} EGP remaining`
        : `${formatEgp(order.totalDue * 0.5)} EGP due now`

  return (
    <button
      type="button"
      onClick={() => onOpen(order.quoteId)}
      className={ROW_GRID}
      style={{ gridTemplateColumns: ROW_GRID_COLS }}
    >
      <div className={`h-2 w-2 rounded-full ${dot}`} />

      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-[var(--color-text)]">
          {order.customerName}
        </p>
        <p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
          {order.quoteNumber}
          {order.customerPoNumber ? ` · ${order.customerPoNumber}` : ''}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[11.5px] text-[var(--color-text-muted)]">
          {order.deliveryCity || '—'}
        </p>
        <p className="flex items-center gap-1 text-[10px] text-[var(--color-text-subtle)]">
          <Clock size={9} strokeWidth={2} />
          accepted {formatHoursAgo(order.acceptedHoursAgo)}
        </p>
      </div>

      <div className="flex flex-col">
        <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
          {formatEgp(order.totalDue)}
          <span className="ms-1 text-[10px] font-normal text-[var(--color-text-subtle)]">
            EGP
          </span>
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
          {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col">
        <span
          className={`text-[11px] font-semibold ${
            urgent
              ? 'text-red-700 dark:text-red-300'
              : order.paymentStatus === 'paid'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-[var(--color-text)]'
          }`}
        >
          {remainingLabel}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-subtle)]">
          {urgent && <Truck size={9} strokeWidth={2} />}
          {urgent ? 'delivered · chase' : `stage · ${order.currentStage.replace(/_/g, ' ')}`}
        </span>
      </div>

      <div className="text-end text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
        {order.paymentStatus === 'paid' ? 'View' : 'Record'}
      </div>
    </button>
  )
}

function DealRow({
  deal,
  onOpen,
}: {
  deal: FinanceDealView
  onOpen: (id: string) => void
}) {
  const dot = statusDotClass(deal.paymentStatus)
  const remainingLabel =
    deal.paymentStatus === 'paid'
      ? 'settled'
      : deal.paymentStatus === 'partial'
        ? `${formatEgp(deal.remainingDue)} EGP remaining`
        : `${formatEgp(deal.totalDue * 0.5)} EGP due now`

  return (
    <button
      type="button"
      onClick={() => onOpen(deal.dealId)}
      className={ROW_GRID}
      style={{ gridTemplateColumns: ROW_GRID_COLS }}
    >
      <div className={`h-2 w-2 rounded-full ${dot}`} />

      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-[var(--color-text)]">
          {deal.supplierName}
        </p>
        <p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
          {deal.dealId}
        </p>
      </div>

      <div className="min-w-0">
        <p className="truncate text-[11.5px] text-[var(--color-text-muted)]">
          {deal.itemCount === 1
            ? deal.headlineProductName
            : `${deal.headlineProductName} +${deal.itemCount - 1} more`}
        </p>
        <p className="flex items-center gap-1 text-[10px] text-[var(--color-text-subtle)]">
          <Clock size={9} strokeWidth={2} />
          created {formatHoursAgo(deal.createdHoursAgo)}
        </p>
      </div>

      <div className="flex flex-col">
        <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
          {formatEgp(deal.totalDue)}
          <span className="ms-1 text-[10px] font-normal text-[var(--color-text-subtle)]">
            EGP
          </span>
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
          {deal.itemCount} item{deal.itemCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col">
        <span
          className={`text-[11px] font-semibold ${
            deal.paymentStatus === 'paid'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-[var(--color-text)]'
          }`}
        >
          {remainingLabel}
        </span>
        <span className="text-[10px] text-[var(--color-text-subtle)]">
          stage · {deal.paymentStatus === 'paid' ? 'paid' : 'pending finance'}
        </span>
      </div>

      <div className="text-end text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
        {deal.paymentStatus === 'paid' ? 'View' : 'Record'}
      </div>
    </button>
  )
}

// ─── Column header ───────────────────────────────────────

function SectionHeader({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[var(--color-text-subtle)]">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
        {count}
      </span>
    </div>
  )
}

function TableColumnLegend() {
  return (
    <div
      className="grid items-center gap-4 border-b border-black/[0.06] px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)] dark:border-white/[0.06]"
      style={{ gridTemplateColumns: ROW_GRID_COLS }}
    >
      <div />
      <div>Counterparty</div>
      <div>Context</div>
      <div>Amount</div>
      <div>Payment</div>
      <div className="text-end">Action</div>
    </div>
  )
}

// ─── Main view ───────────────────────────────────────────

export function FinanceDealsOrdersView() {
  const { data, isLoading } = useQuery({
    queryKey: ['finance-inbox'],
    queryFn: () => getFinanceInbox({ data: {} }),
    staleTime: 30_000,
  })

  const inboxFilter = useFinanceStore((s) => s.inboxFilter)
  const setInboxFilter = useFinanceStore((s) => s.setInboxFilter)
  const selectedOrderId = useFinanceStore((s) => s.selectedOrderId)
  const setSelectedOrderId = useFinanceStore((s) => s.setSelectedOrderId)
  const selectedDealId = useFinanceStore((s) => s.selectedDealId)
  const setSelectedDealId = useFinanceStore((s) => s.setSelectedDealId)

  const { filteredOrders, filteredDeals } = useMemo(() => {
    if (!data) return { filteredOrders: [], filteredDeals: [] }
    const orders = data.customerOrders
      .filter((o) => o.paymentStatus === inboxFilter)
      .sort((a, b) => {
        // Delivered+partial rows float to top of Partial view (urgent chase)
        if (inboxFilter === 'partial') {
          if (a.isDelivered !== b.isDelivered) return a.isDelivered ? -1 : 1
        }
        return a.acceptedHoursAgo - b.acceptedHoursAgo
      })
    const deals = data.supplierDeals
      .filter((d) => d.paymentStatus === inboxFilter)
      .sort((a, b) => a.createdHoursAgo - b.createdHoursAgo)
    return { filteredOrders: orders, filteredDeals: deals }
  }, [data, inboxFilter])

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--color-text-subtle)]">
        Loading finance inbox…
      </div>
    )
  }

  const totalFiltered = filteredOrders.length + filteredDeals.length
  const setFilter = (f: FinanceInboxFilter) => setInboxFilter(f)

  return (
    <div className="relative flex h-full flex-col bg-[var(--color-surface)] dark:bg-[#0A0A0A]">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5" data-module-content>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
          {/* Header */}
          <header className="flex items-center justify-between gap-6 border-b border-black/[0.04] pb-4 dark:border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Wallet
                size={13}
                strokeWidth={2}
                className="text-[var(--color-text-subtle)]"
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
                Finance · Deals & Orders
              </span>
            </div>
            <div className="flex items-baseline gap-5">
              <InlineStat
                label="customer unpaid"
                value={data.totals.customerUnpaid}
                tone="amber"
              />
              <InlineStat
                label="partial"
                value={data.totals.customerPartial + data.totals.supplierPartial}
              />
              <InlineStat
                label="delivered · chase"
                value={data.totals.deliveredPartialCount}
                tone="red"
              />
              <InlineStat
                label="supplier unpaid"
                value={data.totals.supplierUnpaid}
                tone="amber"
              />
              <InlineStat
                label="EGP outstanding"
                value={formatEgp(data.totals.totalOutstanding)}
              />
            </div>
          </header>

          {/* Filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1">
            <FilterChip
              label="Unpaid"
              count={data.totals.customerUnpaid + data.totals.supplierUnpaid}
              active={inboxFilter === 'unpaid'}
              onPress={() => setFilter('unpaid')}
              hasAttention={
                data.totals.customerUnpaid + data.totals.supplierUnpaid > 0
              }
            />
            <FilterChip
              label="Partial"
              count={data.totals.customerPartial + data.totals.supplierPartial}
              active={inboxFilter === 'partial'}
              onPress={() => setFilter('partial')}
              hasAttention={data.totals.deliveredPartialCount > 0}
            />
            <FilterChip
              label="Paid"
              count={data.totals.customerPaid + data.totals.supplierPaid}
              active={inboxFilter === 'paid'}
              onPress={() => setFilter('paid')}
            />
          </div>

          {totalFiltered === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/[0.1] py-16 text-center dark:border-white/[0.1]">
              <Wallet
                size={24}
                strokeWidth={1.5}
                className="text-[var(--color-text-subtle)]"
              />
              <p className="mt-2 text-[12px] font-medium text-[var(--color-text)]">
                Nothing in the {inboxFilter} queue
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-subtle)]">
                New accepted quotes and supplier deals land here automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Customer orders section */}
              <div className="flex flex-col gap-2">
                <SectionHeader
                  icon={<TrendingUp size={12} strokeWidth={2} />}
                  label="Customer orders · money in"
                  count={filteredOrders.length}
                />
                {filteredOrders.length > 0 ? (
                  <>
                    <TableColumnLegend />
                    <div className="flex flex-col">
                      {filteredOrders.map((o) => (
                        <OrderRow
                          key={o.quoteId}
                          order={o}
                          onOpen={setSelectedOrderId}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] italic text-[var(--color-text-subtle)] px-3 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
                    No customer orders in this state.
                  </p>
                )}
              </div>

              {/* Supplier deals section */}
              <div className="flex flex-col gap-2 mt-2">
                <SectionHeader
                  icon={<Truck size={12} strokeWidth={2} />}
                  label="Supplier deals · money out"
                  count={filteredDeals.length}
                />
                {filteredDeals.length > 0 ? (
                  <>
                    <TableColumnLegend />
                    <div className="flex flex-col">
                      {filteredDeals.map((d) => (
                        <DealRow
                          key={d.dealId}
                          deal={d}
                          onOpen={setSelectedDealId}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] italic text-[var(--color-text-subtle)] px-3 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
                    No supplier deals in this state.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <FinancePaymentPanel
        isOpen={selectedOrderId !== null || selectedDealId !== null}
        orderId={selectedOrderId}
        dealId={selectedDealId}
        onClose={() => {
          setSelectedOrderId(null)
          setSelectedDealId(null)
        }}
      />
    </div>
  )
}
