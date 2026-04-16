import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  Modal,
  ModalOverlay,
  Button,
  Heading,
  Select,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  Label,
} from 'react-aria-components'
import { declineRFQ } from '../../../lib/server/sales-rfq'

type DeclineReason = 'outside_service_area' | 'cannot_source' | 'customer_blacklisted'

const DECLINE_REASONS: { value: DeclineReason; label: string }[] = [
  { value: 'outside_service_area', label: 'Outside service area' },
  { value: 'cannot_source', label: 'Cannot source requested materials' },
  { value: 'customer_blacklisted', label: 'Customer blacklisted' },
]

interface DeclineRFQDialogProps {
  rfqId: string
  isOpen: boolean
  onClose: () => void
  onDeclined?: () => void
}

export function DeclineRFQDialog({ rfqId, isOpen, onClose, onDeclined }: DeclineRFQDialogProps) {
  const { t } = useTranslation('internal')
  const queryClient = useQueryClient()

  const [reason, setReason] = useState<DeclineReason | null>(null)
  const [note, setNote] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const mutation = useMutation({
    mutationFn: () => {
      if (!reason) throw new Error('Reason required')
      return declineRFQ({
        data: {
          rfqId,
          reason,
          note: note.trim() || undefined,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
      queryClient.invalidateQueries({ queryKey: ['sales-rfq-list'] })
      queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
      setReason(null)
      setNote('')
      setShowConfirm(false)
      onClose()
      onDeclined?.()
    },
  })

  const handleDecline = () => {
    if (!reason) return
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }
    mutation.mutate()
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setShowConfirm(false)
          onClose()
        }
      }}
      isDismissable={false}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <Modal className="w-full max-w-md mx-4">
        <Dialog
          isKeyboardDismissDisabled
          className="rounded-xl bg-[var(--color-surface)]/95 dark:bg-black/95 shadow-2xl outline-none"
        >
          {({ close }) => (
            <div className="p-6">
              <Heading slot="title" className="text-[15px] font-semibold text-[var(--color-text)] mb-4">
                Decline RFQ
              </Heading>

              {!showConfirm ? (
                <>
                  <p className="text-[13px] text-[var(--color-text-muted)] mb-4">
                    Please select a reason for declining this RFQ.
                  </p>

                  {/* Reason selection */}
                  <div className="mb-4">
                    <Label className="block text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-1.5">
                      Reason <span className="text-red-600">*</span>
                    </Label>
                    <Select
                      selectedKey={reason}
                      onSelectionChange={(key) => setReason(key as DeclineReason)}
                      className="w-full"
                    >
                      <Button className="flex w-full items-center justify-between rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-[13px] text-start outline-none
                        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50">
                        <SelectValue className="truncate">
                          {reason
                            ? DECLINE_REASONS.find((r) => r.value === reason)?.label
                            : 'Select a reason...'}
                        </SelectValue>
                        <span className="text-[var(--color-text-subtle)] ms-2">&#x25BE;</span>
                      </Button>
                      <Popover aria-label="Decline reason" className="w-[var(--trigger-width)] rounded-lg bg-[var(--color-surface)] dark:bg-black shadow-lg border border-black/[0.06] dark:border-white/[0.06]">
                        <ListBox className="p-1 outline-none">
                          {DECLINE_REASONS.map((r) => (
                            <ListBoxItem
                              key={r.value}
                              id={r.value}
                              className="rounded-md px-3 py-2 text-[13px] cursor-pointer outline-none
                                data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]
                                data-[focused]:bg-[var(--color-primary)]/[0.08] data-[focused]:text-[var(--color-primary)]
                                data-[selected]:font-medium"
                            >
                              {r.label}
                            </ListBoxItem>
                          ))}
                        </ListBox>
                      </Popover>
                    </Select>
                  </div>

                  {/* Optional note */}
                  <div className="mb-6">
                    <label className="block text-[11px] font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-1.5">
                      Note (optional)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Additional context..."
                      rows={2}
                      className="w-full rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-[13px] outline-none
                        focus:ring-1 focus:ring-[var(--color-primary)]/50
                        placeholder:text-[var(--color-text-subtle)]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <Button
                      className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-[var(--color-text)] outline-none
                        data-[hovered]:bg-black/[0.08] dark:data-[hovered]:bg-white/[0.1]
                        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
                      onPress={() => {
                        setReason(null)
                        setNote('')
                        onClose()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="rounded-lg bg-red-500/10 px-4 py-2 text-[13px] font-medium text-red-700 dark:text-red-400 outline-none
                        data-[hovered]:bg-red-500/15
                        data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/50
                        data-[disabled]:opacity-50"
                      onPress={handleDecline}
                      isDisabled={!reason}
                    >
                      Decline RFQ
                    </Button>
                  </div>
                </>
              ) : (
                /* Confirmation step */
                <>
                  <div className="mb-6">
                    <p className="text-[13px] text-red-700 dark:text-red-400 font-medium mb-2">
                      Are you sure? This action cannot be undone.
                    </p>
                    <p className="text-[13px] text-[var(--color-text-muted)]">
                      Reason: {DECLINE_REASONS.find((r) => r.value === reason)?.label}
                    </p>
                    {note.trim() && (
                      <p className="text-[13px] text-[var(--color-text-subtle)] mt-1">
                        Note: {note.trim()}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      className="rounded-lg bg-black/[0.04] dark:bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-[var(--color-text)] outline-none
                        data-[hovered]:bg-black/[0.08] dark:data-[hovered]:bg-white/[0.1]
                        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
                      onPress={() => setShowConfirm(false)}
                    >
                      Go Back
                    </Button>
                    <Button
                      className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white outline-none
                        data-[hovered]:bg-red-700
                        data-[focus-visible]:ring-2 data-[focus-visible]:ring-red-500/50 data-[focus-visible]:ring-offset-2
                        data-[disabled]:opacity-50"
                      onPress={() => mutation.mutate()}
                      isDisabled={mutation.isPending}
                    >
                      {mutation.isPending ? 'Declining...' : 'Confirm Decline'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
