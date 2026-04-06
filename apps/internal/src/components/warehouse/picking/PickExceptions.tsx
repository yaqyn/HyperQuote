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
 * Pick exception handling dialog.
 * Short Pick, Skip Item, Substitute — each with specific inputs.
 * isKeyboardDismissDisabled per locked decision.
 */
export function PickExceptions({
  type,
  availableQty = 0,
  substitutes = [],
  onConfirm,
  onCancel,
}: PickExceptionsProps) {
  return (
    <ModalOverlay className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <Modal className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl" isKeyboardDismissDisabled>
        <Dialog className="outline-none flex flex-col gap-4">
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

// ─── Short Pick ──────────────────────────────────────────

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
      <Heading slot="title" className="text-lg font-semibold text-[var(--color-text-primary)]">
        Short Pick
      </Heading>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Available quantity at this location:{' '}
        <span className="font-mono font-semibold text-[var(--color-text-primary)]">
          {availableQty}
        </span>
      </p>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Pick what is available. System will redirect to the next location with the same product.
      </p>
      <TextField value={note} onChange={setNote}>
        <Label className="text-sm font-medium text-[var(--color-text-secondary)]">
          Reason Note
        </Label>
        <Input className="h-12 min-h-[48px] w-full rounded-lg border border-[var(--color-border)] px-3 text-sm" />
      </TextField>
      <div className="flex gap-3 mt-2">
        <AriaButton
          onPress={onCancel}
          className="flex h-12 min-h-[48px] flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)]"
        >
          Cancel
        </AriaButton>
        <AriaButton
          onPress={() =>
            onConfirm({
              type: 'short_pick',
              pickedQty: availableQty,
              note,
            })
          }
          className="flex h-12 min-h-[48px] flex-1 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-medium text-white"
        >
          Confirm Short Pick
        </AriaButton>
      </div>
    </>
  )
}

// ─── Skip Item ───────────────────────────────────────────

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
      <Heading slot="title" className="text-lg font-semibold text-[var(--color-text-primary)]">
        Skip Item
      </Heading>
      <p className="text-xs text-[var(--color-text-secondary)]">
        Item will be queued for re-pick later.
      </p>
      <Select
        selectedKey={reason}
        onSelectionChange={(key) => setReason(key as string)}
      >
        <Label className="text-sm font-medium text-[var(--color-text-secondary)]">
          Reason (required)
        </Label>
        <AriaButton className="flex h-12 min-h-[48px] w-full items-center justify-between rounded-lg border border-[var(--color-border)] px-3 text-sm">
          <SelectValue />
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </AriaButton>
        <Popover className="w-[--trigger-width] rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
          <ListBox className="p-1 outline-none">
            {SKIP_REASONS.map((r) => (
              <ListBoxItem
                key={r.id}
                id={r.id}
                className="flex h-10 min-h-[48px] cursor-pointer items-center rounded-md px-3 text-sm hover:bg-[var(--color-bg-hover)] outline-none data-[focused]:bg-[var(--color-bg-hover)]"
              >
                {r.label}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>
      <div className="flex gap-3 mt-2">
        <AriaButton
          onPress={onCancel}
          className="flex h-12 min-h-[48px] flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)]"
        >
          Cancel
        </AriaButton>
        <AriaButton
          onPress={() => onConfirm({ type: 'skip', reason: reason ?? '' })}
          isDisabled={!reason}
          className="flex h-12 min-h-[48px] flex-1 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-medium text-white disabled:opacity-40"
        >
          Confirm Skip
        </AriaButton>
      </div>
    </>
  )
}

// ─── Substitute ──────────────────────────────────────────

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
      <Heading slot="title" className="text-lg font-semibold text-[var(--color-text-primary)]">
        Substitute Product
      </Heading>

      {substitutes.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
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
            <Label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Select Substitute
            </Label>
            <AriaButton className="flex h-12 min-h-[48px] w-full items-center justify-between rounded-lg border border-[var(--color-border)] px-3 text-sm">
              <SelectValue />
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </AriaButton>
            <Popover className="w-[--trigger-width] rounded-lg border border-[var(--color-border)] bg-white shadow-lg">
              <ListBox className="p-1 outline-none">
                {substitutes.map((sub) => (
                  <ListBoxItem
                    key={sub.id}
                    id={sub.id}
                    className="flex h-10 min-h-[48px] cursor-pointer items-center rounded-md px-3 text-sm hover:bg-[var(--color-bg-hover)] outline-none data-[focused]:bg-[var(--color-bg-hover)]"
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
            />
          )}
        </>
      )}

      <div className="flex gap-3 mt-2">
        <AriaButton
          onPress={onCancel}
          className="flex h-12 min-h-[48px] flex-1 items-center justify-center rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)]"
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
          className="flex h-12 min-h-[48px] flex-1 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-medium text-white disabled:opacity-40"
        >
          Confirm Substitute
        </AriaButton>
      </div>
    </>
  )
}
