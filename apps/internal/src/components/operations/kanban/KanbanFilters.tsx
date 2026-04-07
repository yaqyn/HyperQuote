import { TextField, Input, Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useOperationsStore } from '../../../stores/operations'
import { FULFILLMENT_COLUMNS } from '../../../types/operations'
import type { FulfillmentStage } from '../../../types/operations'

/**
 * Inline filter row — borderless customer search, status as pills, clear button.
 * Minimal chrome. Filters are the interface, not decoration around them.
 */
export function KanbanFilters() {
  const { t } = useTranslation('internal')
  const kanbanFilters = useOperationsStore((s) => s.kanbanFilters)
  const setKanbanFilters = useOperationsStore((s) => s.setKanbanFilters)

  const handleCustomerChange = (value: string) => {
    setKanbanFilters({ ...kanbanFilters, customer: value || null })
  }

  const handleStatusToggle = (stage: FulfillmentStage) => {
    setKanbanFilters({
      ...kanbanFilters,
      status: kanbanFilters.status === stage ? null : stage,
    })
  }

  const handleClearAll = () => {
    setKanbanFilters({
      customer: null,
      dateRange: null,
      deliveryMethod: null,
      status: null,
    })
  }

  const hasFilters = kanbanFilters.customer || kanbanFilters.status || kanbanFilters.deliveryMethod || kanbanFilters.dateRange

  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      {/* Customer search — borderless */}
      <TextField
        aria-label={t('operations.filters.customer', 'Customer')}
        value={kanbanFilters.customer ?? ''}
        onChange={handleCustomerChange}
        className="shrink-0"
      >
        <Input
          placeholder={t('operations.filters.customerPlaceholder', 'Filter by customer...')}
          className="w-44 bg-transparent px-0 py-1 text-[13px] outline-none placeholder:text-black/25 dark:placeholder:text-white/25
            border-b border-transparent focus:border-black/10 dark:focus:border-white/10 transition-colors"
        />
      </TextField>

      {/* Divider */}
      <div className="h-4 w-px bg-black/8 dark:bg-white/8" />

      {/* Status pills */}
      <div className="flex items-center gap-1">
        {FULFILLMENT_COLUMNS.map((col) => {
          const isActive = kanbanFilters.status === col.stage
          return (
            <button
              key={col.stage}
              type="button"
              onClick={() => handleStatusToggle(col.stage)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all outline-none
                focus-visible:ring-2 focus-visible:ring-[#2563EB]/40
                ${isActive
                  ? 'bg-black/[0.08] dark:bg-white/[0.08] text-black dark:text-white'
                  : 'text-black/35 dark:text-white/35 hover:text-black/60 dark:hover:text-white/60 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                }`}
            >
              {col.label}
            </button>
          )
        })}
      </div>

      {/* Clear all */}
      {hasFilters && (
        <>
          <div className="h-4 w-px bg-black/8 dark:bg-white/8" />
          <Button
            onPress={handleClearAll}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] text-black/40 dark:text-white/40
              data-[hovered]:text-black/60 dark:data-[hovered]:text-white/60 outline-none"
          >
            {t('operations.filters.clearAll', 'Clear')}
          </Button>
        </>
      )}
    </div>
  )
}
