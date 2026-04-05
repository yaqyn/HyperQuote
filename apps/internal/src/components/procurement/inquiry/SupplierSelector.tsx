import { useState } from 'react'
import { ComboBox, Input, ListBox, ListBoxItem, Popover, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getSupplierDirectory } from '../../../lib/server/procurement-suppliers'
import { FreshnessIndicator } from '../shared/FreshnessIndicator'
import type { SupplierScorecard, StockFreshness } from '../../../types/procurement'

interface SupplierSelectorProps {
  productId: string
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

function getStockFreshness(avgResponseDays: number): StockFreshness {
  if (avgResponseDays <= 1) return 'fresh'
  if (avgResponseDays <= 3) return 'aging'
  if (avgResponseDays <= 7) return 'stale'
  return 'suppressed'
}

export function SupplierSelector({ productId, selectedIds, onSelectionChange }: SupplierSelectorProps) {
  const { t } = useTranslation('internal')
  const [search, setSearch] = useState('')

  const { data } = useQuery({
    queryKey: ['procurement', 'suppliers', 'directory', productId],
    queryFn: () => getSupplierDirectory({ data: { page: 1, limit: 20 } }),
    staleTime: 60_000,
  })

  const suppliers: SupplierScorecard[] = data?.suppliers ?? []

  // Sort by overall score descending (score-ranked suggestions)
  const sorted = [...suppliers].sort((a, b) => b.overallScore - a.overallScore)

  const filtered = search
    ? sorted.filter((s) => s.supplierName.toLowerCase().includes(search.toLowerCase()))
    : sorted

  const toggleSupplier = (supplierId: string) => {
    if (selectedIds.includes(supplierId)) {
      onSelectionChange(selectedIds.filter((id) => id !== supplierId))
    } else {
      onSelectionChange([...selectedIds, supplierId])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Selected count badge */}
      {selectedIds.length > 0 && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-xs text-[#2563EB]">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{selectedIds.length}</span>
          {t('procurement.inquiry.suppliersSelected')}
        </span>
      )}

      <ComboBox
        inputValue={search}
        onInputChange={setSearch}
        menuTrigger="focus"
      >
        <Label className="sr-only">{t('procurement.inquiry.searchSuppliers')}</Label>
        <Input
          placeholder={t('procurement.inquiry.searchSuppliers')}
          className="w-full rounded-lg border border-black/10 bg-white/60 px-3 py-1.5 text-sm outline-none backdrop-blur-xl transition-colors focus:border-[#2563EB] dark:border-white/10 dark:bg-black/60"
        />
        <Popover className="w-[var(--trigger-width)] rounded-xl border border-black/10 bg-white/95 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/95">
          <ListBox
            className="max-h-60 overflow-auto p-1"
            renderEmptyState={() => (
              <div className="px-3 py-2 text-sm text-black/40 dark:text-white/40">
                {t('procurement.inquiry.noSuppliersFound')}
              </div>
            )}
          >
            {filtered.map((supplier) => {
              const isSelected = selectedIds.includes(supplier.supplierId)
              return (
                <ListBoxItem
                  key={supplier.supplierId}
                  id={supplier.supplierId}
                  textValue={supplier.supplierName}
                  onAction={() => toggleSupplier(supplier.supplierId)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 outline-none transition-colors data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
                >
                  {/* Checkbox */}
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-[#2563EB] bg-[#2563EB] text-white'
                        : 'border-black/20 dark:border-white/20'
                    }`}
                  >
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    )}
                  </div>

                  {/* Supplier info */}
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium truncate">{supplier.supplierName}</span>
                    <div className="flex items-center gap-3 text-xs text-black/50 dark:text-white/50">
                      <span>
                        {t('procurement.inquiry.onTime')}:{' '}
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                          {supplier.onTimeDeliveryRate}%
                        </span>
                      </span>
                      <span>
                        {t('procurement.inquiry.score')}:{' '}
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                          {supplier.overallScore}
                        </span>
                      </span>
                      <FreshnessIndicator freshness={getStockFreshness(supplier.avgResponseTimeDays)} compact />
                    </div>
                  </div>

                  {/* Tier badge */}
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getTierStyle(supplier.tier)}`}>
                    {t(`procurement.tier.${supplier.tier}`)}
                  </span>
                </ListBoxItem>
              )
            })}
          </ListBox>
        </Popover>
      </ComboBox>
    </div>
  )
}

function getTierStyle(tier: string): string {
  switch (tier) {
    case 'preferred':
      return 'bg-[#2563EB]/10 text-[#2563EB]'
    case 'approved':
      return 'bg-green-500/10 text-green-600 dark:text-green-400'
    case 'conditional':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
    default:
      return 'bg-black/5 text-black/50 dark:bg-white/5 dark:text-white/50'
  }
}
