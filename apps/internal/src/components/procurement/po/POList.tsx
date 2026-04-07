import { useMemo, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion } from 'motion/react'
import { getPOList } from '../../../lib/server/procurement-po'
import type { PurchaseOrder, POStatus } from '../../../types/procurement'
import { POStatusFlow } from './POStatusFlow'

// ─── Formatting ───────────────────────────────────────────

function formatEGP(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoDate))
}

// ─── Filter Tabs ──────────────────────────────────────────

type FilterTab = 'all' | 'draft' | 'active' | 'completed'

const TAB_FILTERS: Record<FilterTab, (po: PurchaseOrder) => boolean> = {
  all: () => true,
  draft: (po) => po.status === 'draft',
  active: (po) =>
    ['sent', 'confirmed', 'in_production', 'shipped', 'partially_received', 'received', 'inspected'].includes(po.status),
  completed: (po) => ['closed', 'rejected', 'cancelled'].includes(po.status),
}

// ─── Component ────────────────────────────────────────────

interface POListProps {
  onSelectPO: (poId: string) => void
  selectedPOId: string | null
}

export function POList({ onSelectPO, selectedPOId }: POListProps) {
  const { t, i18n } = useTranslation('internal')
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['po-list', { page }],
    queryFn: () => getPOList({ data: { page, limit: 20 } }),
    staleTime: 30_000,
  })

  const allPOs = data?.pos ?? []
  const filteredPOs = useMemo(() => {
    const filterFn = TAB_FILTERS[activeTab]
    return allPOs.filter(filterFn)
  }, [allPOs, activeTab])

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
      onSelectPO(filteredPOs[nextIndex].id)
    },
    [selectedPOId, filteredPOs, onSelectPO],
  )

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Done' },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-black/25 dark:text-white/25">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 px-4 py-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-medium outline-none transition-colors
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
              ${
                activeTab === tab.id
                  ? 'bg-black/[0.06] text-black dark:bg-white/[0.08] dark:text-white'
                  : 'text-black/35 dark:text-white/35 data-[hovered]:text-black/60 dark:data-[hovered]:text-white/60'
              }`}
            onPress={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Dense list */}
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
            <p className="text-sm text-black/25 dark:text-white/25">No purchase orders</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
            {filteredPOs.map((po, i) => (
              <motion.button
                key={po.id}
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={`
                  w-full flex items-center gap-4 px-4 py-3 text-start outline-none transition-colors
                  data-[focus-visible]:ring-2 data-[focus-visible]:ring-inset data-[focus-visible]:ring-[#2563EB]/50
                  ${po.id === selectedPOId
                    ? 'bg-[#2563EB]/[0.04]'
                    : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.015]'
                  }
                `}
                onClick={() => onSelectPO(po.id)}
                role="option"
                aria-selected={po.id === selectedPOId}
              >
                {/* PO number + supplier */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums text-[#2563EB]">
                      {po.poNumber}
                    </span>
                    <span className="text-black/15 dark:text-white/15">|</span>
                    <span className="text-sm text-black/60 dark:text-white/60 truncate">
                      {po.supplierName}
                    </span>
                  </div>
                  {/* Status flow dots */}
                  <div className="mt-1.5">
                    <POStatusFlow currentStatus={po.status} compact />
                  </div>
                </div>

                {/* Total + date */}
                <div className="shrink-0 text-end">
                  <div className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums text-black dark:text-white">
                    {formatEGP(po.total, locale)}
                  </div>
                  <div className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/30 dark:text-white/30">
                    {formatDate(po.expectedDeliveryDate, locale)}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {(data?.total ?? 0) > 20 && (
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[10px] text-black/30 dark:text-white/30">
            Page <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{page}</span>
          </span>
          <div className="flex gap-1">
            <Button
              className="rounded-md px-2 py-1 text-[10px] text-black/40 outline-none data-[hovered]:text-black/70
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[disabled]:opacity-25
                dark:text-white/40 dark:data-[hovered]:text-white/70"
              isDisabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              className="rounded-md px-2 py-1 text-[10px] text-black/40 outline-none data-[hovered]:text-black/70
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                dark:text-white/40 dark:data-[hovered]:text-white/70"
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
