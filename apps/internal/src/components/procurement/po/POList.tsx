import { useMemo, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getPOList } from '../../../lib/server/procurement-po'
import type { PurchaseOrder, POStatus } from '../../../types/procurement'
import { useProcurementStore } from '../../../stores/procurement'
import { Button } from '../../ui'
import { CreatePODialog } from './CreatePODialog'

// ─── Status Labels ───────────────────────────────────────

const STATUS_CONFIG: Record<POStatus, { label: string; className: string; dot?: boolean }> = {
  draft: { label: 'Draft', className: 'text-black/40 dark:text-white/40' },
  sent: { label: 'Sent', className: 'text-black/40 dark:text-white/40' },
  confirmed: { label: 'Confirmed', className: 'text-[#2563EB]', dot: true },
  in_production: { label: 'In Production', className: 'text-black/60 dark:text-white/60' },
  shipped: { label: 'Shipped', className: 'text-black/60 dark:text-white/60' },
  partially_received: { label: 'Partial', className: 'text-black/60 dark:text-white/60' },
  received: { label: 'Received', className: 'text-black/60 dark:text-white/60' },
  inspected: { label: 'Inspected', className: 'text-black/60 dark:text-white/60' },
  closed: { label: 'Closed', className: 'text-black/30 dark:text-white/30' },
  rejected: { label: 'Rejected', className: 'text-red-600 dark:text-red-400' },
  cancelled: { label: 'Cancelled', className: 'text-black/30 dark:text-white/30' },
}

// ─── Formatting ───────────────────────────────────────────

function formatEGP(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRelativeDate(isoDate: string): { text: string; isPast: boolean } {
  const now = Date.now()
  const target = new Date(isoDate).getTime()
  const diffMs = target - now
  const diffDays = Math.round(diffMs / 86_400_000)

  if (diffDays === 0) return { text: 'today', isPast: false }
  if (diffDays === 1) return { text: 'tomorrow', isPast: false }
  if (diffDays === -1) return { text: 'yesterday', isPast: true }
  if (diffDays > 0) return { text: `in ${diffDays} days`, isPast: false }
  return { text: `${Math.abs(diffDays)} days ago`, isPast: true }
}

function formatDateAbsolute(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoDate))
}

// ─── Filter Tabs ──────────────────────────────────────────

type FilterTab = 'all' | 'draft' | 'awaiting' | 'in_transit' | 'received' | 'done'

const TAB_FILTERS: Record<FilterTab, (po: PurchaseOrder) => boolean> = {
  all: () => true,
  draft: (po) => po.status === 'draft',
  awaiting: (po) => ['sent', 'confirmed', 'in_production'].includes(po.status),
  in_transit: (po) => ['shipped', 'partially_received'].includes(po.status),
  received: (po) => ['received', 'inspected'].includes(po.status),
  done: (po) => ['closed', 'rejected', 'cancelled'].includes(po.status),
}

// ─── Component ────────────────────────────────────────────

export function POList() {
  const selectedPOId = useProcurementStore((s) => s.selectedPOId)
  const setSelectedPOId = useProcurementStore((s) => s.setSelectedPOId)
  const { t, i18n } = useTranslation('internal')
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['po-list', { page }],
    queryFn: () => getPOList({ data: { page, limit: 20 } }),
    staleTime: 30_000,
  })

  const allPOs = data?.pos ?? []
  const filteredPOs = useMemo(() => {
    let results = allPOs.filter(TAB_FILTERS[activeTab])
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      results = results.filter(
        (po) =>
          po.poNumber.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q),
      )
    }
    return results
  }, [allPOs, activeTab, search])

  // J/K keyboard navigation
  const listRef = useRef<HTMLDivElement>(null)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'j' && e.key !== 'k') return
      e.preventDefault()

      if (filteredPOs.length === 0) return

      const currentIndex = filteredPOs.findIndex((po) => po.id === selectedPOId)
      let nextIndex: number
      if (e.key === 'j') {
        nextIndex = currentIndex < filteredPOs.length - 1 ? currentIndex + 1 : 0
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : filteredPOs.length - 1
      }
      setSelectedPOId(filteredPOs[nextIndex].id)
    },
    [selectedPOId, filteredPOs, setSelectedPOId],
  )

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'awaiting', label: 'Awaiting' },
    { id: 'in_transit', label: 'In Transit' },
    { id: 'received', label: 'Received' },
    { id: 'done', label: 'Done' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-black/40 dark:text-white/40">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search box */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-transparent px-3 py-1.5 transition-colors focus-within:border-[#2563EB]/40 dark:border-white/[0.06]">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-black/30 dark:text-white/30"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO number or supplier..."
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-black/25 dark:placeholder:text-white/25"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-black/30 outline-none hover:text-black/50 dark:text-white/30 dark:hover:text-white/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs + New PO */}
      <div className="flex items-center gap-1 px-4 py-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`shrink-0 rounded-full px-3.5 py-1 text-[12px] font-medium outline-none transition-colors
              focus-visible:ring-2 focus-visible:ring-[#2563EB]/50
              ${
                activeTab === tab.id
                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                  : 'text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60'
              }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="primary" onPress={() => setCreateOpen(true)}>
          New PO
        </Button>
      </div>

      <CreatePODialog isOpen={createOpen} onOpenChange={setCreateOpen} />

      {/* PO list */}
      <div
        ref={listRef}
        className="flex-1 overflow-auto focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="listbox"
        aria-label="Purchase orders"
      >
        {filteredPOs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px] text-black/40 dark:text-white/40">No purchase orders</p>
          </div>
        ) : (
          <div>
            {filteredPOs.map((po, i) => {
              const status = STATUS_CONFIG[po.status]
              return (
                <motion.button
                  key={po.id}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`
                    w-full flex items-center justify-between px-5 py-4 text-start outline-none transition-colors border-b border-black/[0.03] dark:border-white/[0.03]
                    focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563EB]/50
                    ${po.id === selectedPOId
                      ? 'bg-[#2563EB]/[0.04]'
                      : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.015]'
                    }
                  `}
                  onClick={() => setSelectedPOId(po.id)}
                  role="option"
                  aria-selected={po.id === selectedPOId}
                >
                  {/* Left: PO info */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium tabular-nums text-[#2563EB]">
                        {po.poNumber}
                      </span>
                      <span className="text-[13px] text-black/50 dark:text-white/50 truncate">
                        {po.supplierName}
                      </span>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[12px] ${status.className}`}>
                      {status.dot && (
                        <span className="inline-block size-1.5 rounded-full bg-[#2563EB]" />
                      )}
                      {status.label}
                    </span>
                  </div>

                  {/* Right: Amount + Date */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-black dark:text-white">
                      {formatEGP(po.total, locale)}
                    </span>
                    {(() => {
                      const rel = formatRelativeDate(po.expectedDeliveryDate)
                      return (
                        <span
                          className={`font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums ${rel.isPast ? 'text-red-500/70' : 'text-black/40 dark:text-white/40'}`}
                          title={formatDateAbsolute(po.expectedDeliveryDate, locale)}
                        >
                          {rel.text}
                        </span>
                      )
                    })()}
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {(data?.total ?? 0) > 20 && (
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[12px] text-black/40 dark:text-white/40">
            Page <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{page}</span>
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              isDisabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              onPress={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
