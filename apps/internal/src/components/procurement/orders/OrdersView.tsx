import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ClipboardList, Clock, CheckCircle2 } from 'lucide-react'
import {
  getCustomerOrdersList,
  type CustomerOrderView,
} from '../../../lib/server/orders'
import { OrderPrepView } from './OrderPrepView'

// ─── Inline stat ──────────────────────────────────────────

function InlineStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string | number
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
      <span className={`font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold leading-none tabular-nums ${color}`}>
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

// ─── Formatter ────────────────────────────────────────────

function formatHoursAgo(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.round(days / 30)}mo ago`
}

// ─── Order row ────────────────────────────────────────────

function OrderRow({
  order,
  onOpen,
}: {
  order: CustomerOrderView
  onOpen: (quoteId: string) => void
}) {
  const statusDot = order.allReady ? 'bg-emerald-500' : 'bg-amber-500'
  return (
    <div
      className="group grid items-center gap-4 border-b border-black/[0.04] px-3 py-3 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03]"
      style={{ gridTemplateColumns: '14px minmax(0,1.6fr) minmax(0,1.2fr) minmax(140px,0.9fr) minmax(160px,1.1fr) 150px' }}
    >
      <div className={`h-2 w-2 rounded-full ${statusDot}`} />

      {/* Customer + quote number */}
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-[var(--color-text)]">
          {order.customerName}
        </p>
        <p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
          {order.quoteNumber}
          {order.customerPoNumber ? ` · ${order.customerPoNumber}` : ''}
        </p>
      </div>

      {/* Delivery */}
      <div className="min-w-0">
        <p className="truncate text-[11.5px] text-[var(--color-text-muted)]">
          {order.deliveryCity || '—'}
        </p>
        <p className="text-[10px] text-[var(--color-text-subtle)]">
          {order.deliveryUrgencyDays > 0
            ? `needs in ${order.deliveryUrgencyDays}d`
            : 'urgent'}
        </p>
      </div>

      {/* Items count + total */}
      <div className="flex flex-col">
        <span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
          {order.itemCount}
          <span className="ms-1 text-[10px] font-normal text-[var(--color-text-subtle)]">item{order.itemCount !== 1 ? 's' : ''}</span>
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
          {order.totalValue.toLocaleString('en-EG')} EGP
        </span>
      </div>

      {/* Stock readiness */}
      <div className="flex flex-col">
        {order.allReady ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={11} strokeWidth={2.5} />
            All items in stock
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            {order.shortageCount} of {order.itemCount} short
          </span>
        )}
        <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-subtle)]">
          <Clock size={9} strokeWidth={2} />
          <span>accepted {formatHoursAgo(order.acceptedHoursAgo)}</span>
        </div>
      </div>

      {/* Action */}
      <button
        type="button"
        onClick={() => onOpen(order.quoteId)}
        className={`rounded-md py-1.5 text-[10.5px] font-semibold uppercase tracking-wider transition-colors ${
          order.allReady
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90'
        }`}
      >
        {order.allReady ? 'Approve' : 'Check'}
      </button>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────

type StatusFilter = 'all' | 'ready' | 'blocked'

export function OrdersView() {
  const { data, isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: () => getCustomerOrdersList({ data: {} }),
    staleTime: 30_000,
  })

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!data) return []
    let list = data.orders
    if (statusFilter === 'ready') list = list.filter((o) => o.allReady)
    if (statusFilter === 'blocked') list = list.filter((o) => !o.allReady)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          o.quoteNumber.toLowerCase().includes(q) ||
          (o.customerPoNumber?.toLowerCase().includes(q) ?? false),
      )
    }
    return list
  }, [data, statusFilter, search])

  // Detail view takes over when an order is opened.
  if (selectedQuoteId) {
    return (
      <OrderPrepView
        quoteId={selectedQuoteId}
        onBack={() => setSelectedQuoteId(null)}
      />
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--color-text-subtle)]">
        Loading orders…
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-[var(--color-surface)] dark:bg-[#0A0A0A]">
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5" data-module-content>
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
          {/* Header */}
          <header className="flex items-center justify-between gap-6 border-b border-black/[0.04] pb-4 dark:border-white/[0.04]">
            <div className="flex items-center gap-2">
              <ClipboardList size={13} strokeWidth={2} className="text-[var(--color-text-subtle)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
                Orders · Customer orders waiting for inventory prep
              </span>
            </div>
            <div className="flex items-baseline gap-5">
              <InlineStat label="total" value={data.totals.total} />
              <InlineStat label="ready" value={data.totals.ready} tone="emerald" />
              <InlineStat label="blocked" value={data.totals.blocked} tone="amber" />
              <InlineStat label="short items" value={data.totals.shortageItems} tone="red" />
              <InlineStat
                label="EGP value"
                value={Math.round(data.totals.value).toLocaleString('en-EG')}
              />
            </div>
          </header>

          {/* Filter chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1">
            <FilterChip
              label="All"
              count={data.totals.total}
              active={statusFilter === 'all'}
              onPress={() => setStatusFilter('all')}
            />
            <FilterChip
              label="Ready"
              count={data.totals.ready}
              active={statusFilter === 'ready'}
              onPress={() => setStatusFilter('ready')}
            />
            <FilterChip
              label="Needs refill"
              count={data.totals.blocked}
              hasAttention={data.totals.blocked > 0}
              active={statusFilter === 'blocked'}
              onPress={() => setStatusFilter('blocked')}
            />
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-black/[0.08] px-3 py-1.5 dark:border-white/[0.08]">
              <Search size={12} strokeWidth={2} className="text-[var(--color-text-subtle)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, quote number, or PO"
                className="flex-1 bg-transparent text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-[10px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
                >
                  clear
                </button>
              )}
            </div>
          </div>

          {/* Table header */}
          {filtered.length > 0 && (
            <div
              className="grid items-center gap-4 border-b border-black/[0.06] px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)] dark:border-white/[0.06]"
              style={{ gridTemplateColumns: '14px minmax(0,1.6fr) minmax(0,1.2fr) minmax(140px,0.9fr) minmax(160px,1.1fr) 150px' }}
            >
              <div />
              <div>Customer</div>
              <div>Delivery</div>
              <div>Order</div>
              <div>Stock readiness</div>
              <div className="text-end">Action</div>
            </div>
          )}

          {/* Rows */}
          {filtered.length > 0 ? (
            <div className="flex flex-col">
              {filtered.map((o) => (
                <OrderRow key={o.quoteId} order={o} onOpen={setSelectedQuoteId} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/[0.1] py-16 text-center dark:border-white/[0.1]">
              <ClipboardList size={24} strokeWidth={1.5} className="text-[var(--color-text-subtle)]" />
              <p className="mt-2 text-[12px] font-medium text-[var(--color-text)]">
                No orders to prep
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-subtle)]">
                {search.trim() || statusFilter !== 'all'
                  ? 'Nothing matches your filters.'
                  : 'Accepted quotes that finance clears for partial payment will show up here.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
