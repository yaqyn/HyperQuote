import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Select, SelectValue, Popover, ListBox, ListBoxItem, Label, Button as AriaButton } from 'react-aria-components'
import { TextField, Input, Label as TextFieldLabel } from 'react-aria-components'
import { Checkbox } from 'react-aria-components'
import { useEODStore, type ReturnItem } from '@/stores/end-of-day'
import { useAuthStore } from '@/stores/auth'
import { db } from '@/lib/powersync'
import { DriverCard } from '@/components/shared/DriverCard'
import { DriverButton } from '@/components/shared/DriverButton'

interface DeliveryReturn {
  delivery_id: string
  item_id: string
  product_name: string
  quantity: number
  unit: string
  status: string
  order_id: string
}

const REASON_OPTIONS = [
  { id: 'damaged', label: 'Damaged' },
  { id: 'customer_refused', label: 'Customer Refused' },
  { id: 'not_needed', label: 'Not Needed' },
  { id: 'other', label: 'Other' },
] as const

export function ReturnsList() {
  const { t } = useTranslation('driver')
  const returns = useEODStore((s) => s.returns)
  const addReturn = useEODStore((s) => s.addReturn)
  const removeReturn = useEODStore((s) => s.removeReturn)
  const nextStep = useEODStore((s) => s.nextStep)
  const driverProfile = useAuthStore((s) => s.driverProfile)
  const [deliveryReturns, setDeliveryReturns] = useState<DeliveryReturn[]>([])
  const [warehouseConfirmed, setWarehouseConfirmed] = useState(false)
  const [editingItems, setEditingItems] = useState<
    Map<string, { reason: ReturnItem['reason']; notes: string }>
  >(new Map())

  // Load refused/damaged delivery items from today
  useEffect(() => {
    if (!driverProfile?.id) return
    let cancelled = false

    async function loadReturns() {
      try {
        const today = new Date().toISOString().split('T')[0]
        const rows = await db.getAll<DeliveryReturn>(
          `SELECT di.id as item_id, di.delivery_id, di.product_name, di.quantity, di.unit, di.status, d.order_id
           FROM delivery_items di
           JOIN deliveries d ON di.delivery_id = d.id
           WHERE d.driver_id = ? AND di.status IN ('refused', 'damaged') AND d.scheduled_date = ?`,
          [driverProfile!.id, today]
        )
        if (!cancelled) setDeliveryReturns(rows)
      } catch {
        // Offline — data may not be available
      }
    }

    loadReturns()
    return () => { cancelled = true }
  }, [driverProfile?.id])

  const handleAddItem = (item: DeliveryReturn) => {
    const editing = editingItems.get(item.item_id)
    const returnItem: ReturnItem = {
      deliveryId: item.delivery_id,
      itemId: item.item_id,
      productName: item.product_name,
      quantity: item.quantity,
      unit: item.unit,
      reason: editing?.reason ?? 'damaged',
      notes: editing?.notes ?? '',
    }
    addReturn(returnItem)
  }

  const handleReasonChange = (itemId: string, reason: ReturnItem['reason']) => {
    setEditingItems((prev) => {
      const next = new Map(prev)
      const existing = next.get(itemId) ?? { reason: 'damaged', notes: '' }
      next.set(itemId, { ...existing, reason })
      return next
    })
  }

  const handleNotesChange = (itemId: string, notes: string) => {
    setEditingItems((prev) => {
      const next = new Map(prev)
      const existing = next.get(itemId) ?? { reason: 'damaged' as const, notes: '' }
      next.set(itemId, { ...existing, notes })
      return next
    })
  }

  const isAlreadyAdded = (itemId: string) =>
    returns.some((r) => r.itemId === itemId)

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold">
        {t('eod.returns', 'Returns')}
      </h2>

      <p className="text-sm text-[var(--text-secondary)]">
        {t('eod.returnsDescription', 'Review and confirm items that were refused or damaged during delivery.')}
      </p>

      {/* Delivery items that need return processing */}
      {deliveryReturns.length === 0 && returns.length === 0 && (
        <DriverCard>
          <p className="text-center text-sm text-[var(--text-secondary)]">
            {t('eod.noReturns', 'No returns to process today.')}
          </p>
        </DriverCard>
      )}

      {deliveryReturns.map((item) => {
        const added = isAlreadyAdded(item.item_id)
        const editing = editingItems.get(item.item_id)

        return (
          <DriverCard key={item.item_id}>
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    <span className="font-[var(--font-mono)] font-medium">{item.quantity}</span>
                    {' '}{item.unit}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  item.status === 'damaged'
                    ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                    : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                }`}>
                  {item.status}
                </span>
              </div>

              {!added && (
                <>
                  {/* Reason code select */}
                  <Select
                    selectedKey={editing?.reason ?? 'damaged'}
                    onSelectionChange={(key) => handleReasonChange(item.item_id, key as ReturnItem['reason'])}
                  >
                    <Label className="text-sm text-[var(--text-secondary)]">
                      {t('eod.returnReason', 'Reason')}
                    </Label>
                    <AriaButton className="mt-1 flex w-full items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-blue)]">
                      <SelectValue />
                      <span className="text-[var(--text-secondary)]">&#9660;</span>
                    </AriaButton>
                    <Popover className="w-[var(--trigger-width)] rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg">
                      <ListBox className="p-1 outline-none">
                        {REASON_OPTIONS.map((opt) => (
                          <ListBoxItem
                            key={opt.id}
                            id={opt.id}
                            className="cursor-default rounded-lg px-3 py-2 text-sm outline-none focus:bg-[var(--bg-secondary)] selected:bg-[var(--color-blue)]/10 selected:text-[var(--color-blue)]"
                          >
                            {t(`eod.reason.${opt.id}`, opt.label)}
                          </ListBoxItem>
                        ))}
                      </ListBox>
                    </Popover>
                  </Select>

                  {/* Notes */}
                  <TextField
                    value={editing?.notes ?? ''}
                    onChange={(value) => handleNotesChange(item.item_id, value)}
                  >
                    <TextFieldLabel className="text-sm text-[var(--text-secondary)]">
                      {t('eod.returnNotes', 'Notes')}
                    </TextFieldLabel>
                    <Input
                      className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-blue)]"
                      placeholder={t('eod.returnNotesPlaceholder', 'Additional details...')}
                    />
                  </TextField>

                  <DriverButton variant="secondary" onPress={() => handleAddItem(item)}>
                    {t('eod.confirmReturn', 'Confirm Return')}
                  </DriverButton>
                </>
              )}

              {added && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-success)]">
                    &#10003; {t('eod.returnConfirmed', 'Confirmed')}
                  </span>
                </div>
              )}
            </div>
          </DriverCard>
        )
      })}

      {/* Already-added returns (manual or confirmed) */}
      {returns.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">
            {t('eod.confirmedReturns', 'Confirmed Returns')} ({returns.length})
          </h3>
          {returns.map((ret, idx) => (
            <DriverCard key={`${ret.itemId}-${idx}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{ret.productName}</span>
                  <span className="ms-2 text-sm text-[var(--text-secondary)]">
                    <span className="font-[var(--font-mono)]">{ret.quantity}</span> {ret.unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeReturn(idx)}
                  className="text-sm text-[var(--color-danger)] outline-none focus-visible:underline"
                >
                  {t('common.remove', 'Remove')}
                </button>
              </div>
            </DriverCard>
          ))}
        </div>
      )}

      {/* Warehouse receiving confirmation */}
      <Checkbox
        isSelected={warehouseConfirmed}
        onChange={setWarehouseConfirmed}
        className="group flex min-h-[var(--touch-min)] items-center gap-3 outline-none"
      >
        <div
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors
            ${warehouseConfirmed
              ? 'border-[var(--color-blue)] bg-[var(--color-blue)]'
              : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
            }
            group-focus-visible:ring-2 group-focus-visible:ring-[var(--color-blue)] group-focus-visible:ring-offset-2`}
        >
          {warehouseConfirmed && (
            <span className="text-sm text-white">&#10003;</span>
          )}
        </div>
        <span className="text-sm">
          {t('eod.warehouseConfirmation', 'Warehouse receiving confirmation')}
        </span>
      </Checkbox>

      {/* Continue */}
      <DriverButton onPress={nextStep}>
        {t('common.next', 'Continue')}
      </DriverButton>
    </div>
  )
}
