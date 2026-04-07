import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { getCustomerList } from '../../../lib/server/sales-customers'
import { useSalesStore } from '../../../stores/sales'
import type { Customer } from '../../../types/sales'

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  if (lower.includes(q)) return true
  return lower.split(/\s+/).some((w) => w.startsWith(q))
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return String(v)
}

export function SalesContacts() {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customer-list-contacts'],
    queryFn: () => getCustomerList({ data: { page: 1, limit: 100 } }),
    staleTime: 300_000,
  })

  const customers = data?.customers ?? []

  const filtered = useMemo(() => {
    let result = customers
    if (tierFilter) result = result.filter((c) => c.tier === tierFilter)
    if (search.trim()) {
      result = result.filter(
        (c) =>
          fuzzyMatch(c.companyName, search) ||
          fuzzyMatch(c.contactName, search) ||
          fuzzyMatch(c.phone, search) ||
          (c.email && fuzzyMatch(c.email, search)),
      )
    }
    return result
  }, [customers, search, tierFilter])

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, new: 0 }
    for (const c of customers) counts[c.tier] = (counts[c.tier] ?? 0) + 1
    return counts
  }, [customers])

  const setSelectedCustomerId = useSalesStore((s) => s.setSelectedCustomerId)

  return (
    <div className="flex flex-col h-full">
      {/* Search + tier filters */}
      <div className="shrink-0 px-5 pt-4 pb-3">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full rounded-xl bg-black/[0.03] dark:bg-white/[0.03] py-2.5 pl-9 pr-3 text-[13px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-shadow"
          />
        </div>
        <div className="flex items-center gap-1">
          {[
            { id: null, label: 'All', count: customers.length },
            { id: 'A', label: 'Tier A', count: tierCounts.A },
            { id: 'B', label: 'Tier B', count: tierCounts.B },
            { id: 'C', label: 'Tier C', count: tierCounts.C },
            { id: 'new', label: 'New', count: tierCounts.new },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setTierFilter(t.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                tierFilter === t.id
                  ? 'text-[var(--color-text)]'
                  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)]'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="font-[family-name:var(--font-geist-mono)] text-[9px] tabular-nums ml-0.5 opacity-40">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Customer list */}
      <div className="flex-1 min-h-0 overflow-y-auto" data-module-content>
        {isLoading ? (
          <div className="px-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-[13px] text-[var(--color-text-subtle)]">
              {search ? 'No results' : 'No customers'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => setSelectedCustomerId(customer.id)}
                className="w-full text-left flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.015] outline-none"
              >
                {/* Initials */}
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/8 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-semibold text-[var(--color-primary)]">
                    {customer.contactName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--color-text)] truncate">
                      {customer.companyName}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[9px] font-medium text-[var(--color-text-subtle)] shrink-0">
                      {customer.tier === 'new' ? 'NEW' : customer.tier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[var(--color-text-subtle)] truncate">
                      {customer.contactName}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-subtle)]">·</span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
                      {customer.phone}
                    </span>
                  </div>
                </div>

                {/* Right side — value + exposure */}
                <div className="shrink-0 text-right">
                  <p className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text)]">
                    {formatValue(customer.creditLimit)}
                  </p>
                  <p className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
                    {formatValue(customer.currentExposure)} used
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
