import { TextField, Input, Select, SelectValue, Button, Popover, ListBox, ListBoxItem, Label } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useOperationsStore } from '../../../stores/operations'
import { FULFILLMENT_COLUMNS } from '../../../types/operations'
import type { FulfillmentStage } from '../../../types/operations'

const DELIVERY_METHODS = [
  { id: 'own_fleet', label: 'Own Fleet' },
  { id: '3pl', label: '3PL' },
  { id: 'drop_ship', label: 'Drop Ship' },
  { id: 'consolidated', label: 'Consolidated' },
]

export function KanbanFilters() {
  const { t } = useTranslation('internal')
  const kanbanFilters = useOperationsStore((s) => s.kanbanFilters)
  const setKanbanFilters = useOperationsStore((s) => s.setKanbanFilters)

  const handleCustomerChange = (value: string) => {
    setKanbanFilters({ ...kanbanFilters, customer: value || null })
  }

  const handleStatusChange = (key: React.Key) => {
    setKanbanFilters({
      ...kanbanFilters,
      status: key === 'all' ? null : (key as FulfillmentStage),
    })
  }

  const handleMethodChange = (key: React.Key) => {
    setKanbanFilters({
      ...kanbanFilters,
      deliveryMethod: key === 'all' ? null : String(key),
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
    <div className="flex items-center gap-3 border-b border-black/5 px-4 py-2 dark:border-white/5">
      {/* Customer search */}
      <TextField
        aria-label={t('operations.filters.customer', 'Customer')}
        value={kanbanFilters.customer ?? ''}
        onChange={handleCustomerChange}
        className="flex-shrink-0"
      >
        <Input
          placeholder={t('operations.filters.customerPlaceholder', 'Filter by customer...')}
          className="w-48 rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#2563EB] dark:border-white/10"
        />
      </TextField>

      {/* Status filter */}
      <Select
        aria-label={t('operations.filters.status', 'Status')}
        selectedKey={kanbanFilters.status ?? 'all'}
        onSelectionChange={handleStatusChange}
        className="flex-shrink-0"
      >
        <Button className="flex w-40 items-center justify-between rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#2563EB] dark:border-white/10">
          <SelectValue />
          <span aria-hidden="true" className="text-xs">&#9662;</span>
        </Button>
        <Popover className="w-40 rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-black/90">
          <ListBox className="p-1">
            <ListBoxItem id="all" className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5">
              {t('operations.filters.allStatuses', 'All Statuses')}
            </ListBoxItem>
            {FULFILLMENT_COLUMNS.map((col) => (
              <ListBoxItem
                key={col.stage}
                id={col.stage}
                className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5"
              >
                {col.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>

      {/* Delivery method filter */}
      <Select
        aria-label={t('operations.filters.deliveryMethod', 'Delivery Method')}
        selectedKey={kanbanFilters.deliveryMethod ?? 'all'}
        onSelectionChange={handleMethodChange}
        className="flex-shrink-0"
      >
        <Button className="flex w-40 items-center justify-between rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#2563EB] dark:border-white/10">
          <SelectValue />
          <span aria-hidden="true" className="text-xs">&#9662;</span>
        </Button>
        <Popover className="w-40 rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-black/90">
          <ListBox className="p-1">
            <ListBoxItem id="all" className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5">
              {t('operations.filters.allMethods', 'All Methods')}
            </ListBoxItem>
            {DELIVERY_METHODS.map((method) => (
              <ListBoxItem
                key={method.id}
                id={method.id}
                className="cursor-pointer rounded px-3 py-1.5 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5"
              >
                {method.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>

      {/* Clear all */}
      {hasFilters && (
        <Button
          onPress={handleClearAll}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5"
        >
          {t('operations.filters.clearAll', 'Clear All')}
        </Button>
      )}
    </div>
  )
}
