import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SearchField, Input, Label, Select, SelectValue, Popover, ListBox, ListBoxItem, Button } from 'react-aria-components'
import { Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Fuse from 'fuse.js'
import { getSupplierDirectory } from '../../../lib/server/procurement-suppliers'
import type { SupplierScorecard, SupplierTier } from '../../../types/procurement'
import { SupplierTierBadge } from './SupplierTierBadge'
import { PerformanceTrend } from './PerformanceTrend'
import { SupplierScorecard as ScorecardView } from './SupplierScorecard'
import { normalizeToStars } from './scorecard-utils'
import { Star } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────

const TIER_OPTIONS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Tiers' },
  { id: 'preferred', label: 'Preferred' },
  { id: 'approved', label: 'Approved' },
  { id: 'conditional', label: 'Conditional' },
  { id: 'new', label: 'New' },
]

const PAGE_SIZE = 20

// ─── Mini Star Rating ─────────────────────────────────────

function MiniStarRating({ score }: { score: number }) {
  const stars = normalizeToStars(score)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${stars} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-3 ${i < stars ? 'fill-[#2563EB] text-[#2563EB]' : 'fill-none text-black/20'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────

export function SupplierDirectory() {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-directory', page],
    queryFn: () => getSupplierDirectory({ data: { page, limit: PAGE_SIZE } }),
    staleTime: 60_000,
  })

  // Client-side fuse.js search for responsive filtering
  const fuse = useMemo(() => {
    if (!data?.suppliers) return null
    return new Fuse(data.suppliers, {
      keys: ['supplierName'],
      threshold: 0.3,
    })
  }, [data?.suppliers])

  const filteredSuppliers = useMemo(() => {
    if (!data?.suppliers) return []
    let results = data.suppliers

    // Apply fuse.js search
    if (search && fuse) {
      results = fuse.search(search).map((r) => r.item)
    }

    // Apply tier filter
    if (tierFilter !== 'all') {
      results = results.filter((s) => s.tier === tierFilter)
    }

    return results
  }, [data?.suppliers, search, tierFilter, fuse])

  // If a supplier is selected, show scorecard detail view
  if (selectedSupplierId) {
    return (
      <ScorecardView
        supplierId={selectedSupplierId}
        onBack={() => setSelectedSupplierId(null)}
      />
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Search + Filter bar */}
      <div className="flex items-center gap-3">
        <SearchField
          value={search}
          onChange={setSearch}
          className="flex-1 relative"
          aria-label="Search suppliers"
        >
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-black/40" aria-hidden="true" />
            <Input
              placeholder="Search suppliers..."
              className="w-full rounded-lg border border-black/10 bg-white/60 py-2 ps-9 pe-3 text-sm text-black/80 placeholder:text-black/30 outline-none focus:border-[#2563EB]/30 focus:ring-1 focus:ring-[#2563EB]/20 backdrop-blur-sm"
            />
          </div>
        </SearchField>

        {/* Tier filter -- native select for simplicity, styled as pill */}
        <select
          value={tierFilter}
          onChange={(e) => {
            setTierFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-black/10 bg-white/60 px-3 py-2 text-sm text-black/70 outline-none focus:border-[#2563EB]/30 backdrop-blur-sm"
          aria-label="Filter by tier"
        >
          {TIER_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-black/40">Loading suppliers...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/5 bg-white/60 backdrop-blur-sm">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-black/5">
                <th className="px-4 py-3 text-start text-xs font-medium text-black/40">Supplier</th>
                <th className="px-4 py-3 text-start text-xs font-medium text-black/40">Tier</th>
                <th className="px-4 py-3 text-end text-xs font-medium text-black/40">On-time %</th>
                <th className="px-4 py-3 text-end text-xs font-medium text-black/40">Quality</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-black/40">Rating</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-black/40">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-black/40">
                    No suppliers found
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.supplierId}
                    className="border-b border-black/5 last:border-0 cursor-pointer hover:bg-black/[0.02] transition-colors"
                    onClick={() => setSelectedSupplierId(supplier.supplierId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedSupplierId(supplier.supplierId)
                      }
                    }}
                    tabIndex={0}
                    role="row"
                  >
                    <td className="px-4 py-3 font-medium text-black/80">{supplier.supplierName}</td>
                    <td className="px-4 py-3">
                      <SupplierTierBadge tier={supplier.tier} />
                    </td>
                    <td className="px-4 py-3 text-end font-[family-name:var(--font-geist-mono)] text-black/80">
                      {supplier.onTimeDeliveryRate}%
                    </td>
                    <td className="px-4 py-3 text-end font-[family-name:var(--font-geist-mono)] text-black/80">
                      {(100 - supplier.qualityRejectionRate).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <MiniStarRating score={supplier.overallScore} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PerformanceTrend trend={supplier.trend} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-black/40">
            Showing {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, data.total)} of{' '}
            <span className="font-[family-name:var(--font-geist-mono)]">{data.total}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-black/10 p-1.5 text-black/50 hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2 text-xs font-[family-name:var(--font-geist-mono)] text-black/60">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * PAGE_SIZE >= data.total}
              className="rounded-lg border border-black/10 p-1.5 text-black/50 hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
