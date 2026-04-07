import { useState } from 'react'
import {
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  Button as AriaButton,
  Select,
  SelectValue,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  TextField,
  Input,
} from 'react-aria-components'
import { ScanInput } from '../shared/ScanInput'
import type { PickException } from '../../../types/warehouse'

interface PickExceptionsProps {
  type: PickException
  availableQty?: number
  substitutes?: { id: string; name: string; sku: string; barcode: string }[]
  onConfirm: (data: PickExceptionResult) => void
  onCancel: () => void
}

export interface PickExceptionResult {
  type: PickException
  note?: string
  reason?: string
  pickedQty?: number
  substituteId?: string
  substituteBarcode?: string
}

const SKIP_REASONS = [
  { id: 'cannot_access', label: 'Cannot Access' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'equipment_issue', label: 'Equipment Issue' },
] as const

/**
 * Pick exception dialog — Short Pick, Skip, Substitute.
 * Large touch targets throughout. isKeyboardDismissDisabled per spec.
 */
export function PickExceptions({
  type,
  availableQty = 0,
  substitutes = [],
  onConfirm,
  onCancel,
}: PickExceptionsProps) {
  return (
    <ModalOverlay className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <Modal className="w-full max-w-md rounded-t-2xl bg-white dark:bg-black p-6 shadow-2xl sm:rounded-2xl border border-black/10 dark:border-white/10" isKeyboardDismissDisabled>
        <Dialog className="outline-none flex flex-col gap-5">
          {type === 'short_pick' && (
            <ShortPickForm
              availableQty={availableQty}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          )}
          {type === 'skip' && (
            <SkipForm onConfirm={onConfirm} onCancel={onCancel} />
          )}
          {type === 'substitute' && (
            <SubstituteForm
              substitutes={substitutes}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

function ShortPickForm({
  availableQty,
  onConfirm,
  onCancel,
}: {
  availableQty: number
  onConfirm: (data: PickExceptionResult) => void
  onCancel: () => void
}) {
  const [note, setNote] = useState('')

  return (
    <>
      <Heading slot="title" className="text-lg font-semibold text-black/90 dark:text-white/90">
        Short Pick
      </Heading>
      <div className="flex items-center gap-3">
        <span className="text-sm text-black/50 dark:text-white/50">Available:</span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-black/90 dark:text-white/90">
          {availableQty}
        </span>
      </div>
      <p className="text-xs text-black/40 dark:text-white/40">
        Pick what is available. System will redirect to next location.
      </p>
      <TextField value={note} onChange={setNote}>
        <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
          Note
        </Label>
        <Input className="h-14 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-4 text-sm outline-none focus:border-[#2563EB]" />
      </TextField>
      <div className="flex gap-3">
        <AriaButton
          onPress={onCancel}
          className="flex h-14 flex-1 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 text-sm font-medium text-black/60 dark:text-white/60 cursor-pointer"
        >
          Cancel
        </AriaButton>
        <AriaButton
          onPress={() => onConfirm({ type: 'short_pick', pickedQty: availableQty, note })}
          className="flex h-14 flex-1 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-semibold text-white cursor-pointer"
        >
          Confirm Short Pick
        </AriaButton>
      </div>
    </>
  )
}

function SkipForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (data: PickExceptionResult) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState<string | null>(null)

  return (
    <>
      <Heading slot="title" className="text-lg font-semibold text-black/90 dark:text-white/90">
        Skip Item
      </Heading>
      <p className="text-xs text-black/40 dark:text-white/40">
        Item will be queued for re-pick later.
      </p>
      <Select
        selectedKey={reason}
        onSelectionChange={(key) => setReason(key as string)}
      >
        <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
          Reason (required)
        </Label>
        <AriaButton className="flex h-14 w-full items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-4 text-sm cursor-pointer">
          <SelectValue />
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </AriaButton>
        <Popover className="w-[--trigger-width] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
          <ListBox className="p-1 outline-none">
            {SKIP_REASONS.map((r) => (
              <ListBoxItem
                key={r.id}
                id={r.id}
                className="flex h-12 cursor-pointer items-center rounded-md px-4 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5"
              >
                {r.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>
      <div className="flex gap-3">
        <AriaButton
          onPress={onCancel}
          className="flex h-14 flex-1 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 text-sm font-medium text-black/60 dark:text-white/60 cursor-pointer"
        >
          Cancel
        </AriaButton>
        <AriaButton
          onPress={() => onConfirm({ type: 'skip', reason: reason ?? '' })}
          isDisabled={!reason}
          className="flex h-14 flex-1 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-semibold text-white cursor-pointer disabled:opacity-30"
        >
          Confirm Skip
        </AriaButton>
      </div>
    </>
  )
}

function SubstituteForm({
  substitutes,
  onConfirm,
  onCancel,
}: {
  substitutes: { id: string; name: string; sku: string; barcode: string }[]
  onConfirm: (data: PickExceptionResult) => void
  onCancel: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)

  const selected = substitutes.find((s) => s.id === selectedId)

  return (
    <>
      <Heading slot="title" className="text-lg font-semibold text-black/90 dark:text-white/90">
        Substitute Product
      </Heading>

      {substitutes.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          No substitutes available for this product.
        </p>
      ) : (
        <>
          <Select
            selectedKey={selectedId}
            onSelectionChange={(key) => {
              setSelectedId(key as string)
              setScannedBarcode(null)
            }}
          >
            <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
              Select Substitute
            </Label>
            <AriaButton className="flex h-14 w-full items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-4 text-sm cursor-pointer">
              <SelectValue />
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </AriaButton>
            <Popover className="w-[--trigger-width] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
              <ListBox className="p-1 outline-none">
                {substitutes.map((sub) => (
                  <ListBoxItem
                    key={sub.id}
                    id={sub.id}
                    className="flex h-12 cursor-pointer items-center rounded-md px-4 text-sm outline-none data-[focused]:bg-black/5 dark:data-[focused]:bg-white/5"
                  >
                    {sub.name} ({sub.sku})
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>

          {selected && (
            <ScanInput
              label="Scan substitute barcode"
              expectedValue={selected.barcode}
              onScan={(value) => setScannedBarcode(value)}
              size="large"
            />
          )}
        </>
      )}

      <div className="flex gap-3">
        <AriaButton
          onPress={onCancel}
          className="flex h-14 flex-1 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 text-sm font-medium text-black/60 dark:text-white/60 cursor-pointer"
        >
          Cancel
        </AriaButton>
        <AriaButton
          onPress={() =>
            onConfirm({
              type: 'substitute',
              substituteId: selectedId ?? '',
              substituteBarcode: scannedBarcode ?? '',
            })
          }
          isDisabled={!selectedId || !scannedBarcode}
          className="flex h-14 flex-1 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-semibold text-white cursor-pointer disabled:opacity-30"
        >
          Confirm Substitute
        </AriaButton>
      </div>
    </>
  )
}
