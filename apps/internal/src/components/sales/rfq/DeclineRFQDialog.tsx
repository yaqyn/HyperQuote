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
}

export function DeclineRFQDialog({ rfqId, isOpen, onClose }: DeclineRFQDialogProps) {
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
      queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
      setReason(null)
      setNote('')
      setShowConfirm(false)
      onClose()
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-md mx-4">
        <Dialog
          isKeyboardDismissDisabled
          className="rounded-xl border border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-2xl outline-none"
        >
          {({ close }) => (
            <div className="p-6">
              <Heading slot="title" className="text-lg font-semibold mb-4">
                Decline RFQ
              </Heading>

              {!showConfirm ? (
                <>
                  <p className="text-sm text-black/60 dark:text-white/60 mb-4">
                    Please select a reason for declining this RFQ.
                  </p>

                  {/* Reason selection */}
                  <div className="mb-4">
                    <Label className="block text-sm font-medium mb-1.5">
                      Reason <span className="text-red-600">*</span>
                    </Label>
                    <Select
                      selectedKey={reason}
                      onSelectionChange={(key) => setReason(key as DeclineReason)}
                      className="w-full"
                    >
                      <Button className="flex w-full items-center justify-between rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-start outline-none
                        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50">
                        <SelectValue className="truncate">
                          {reason
                            ? DECLINE_REASONS.find((r) => r.value === reason)?.label
                            : 'Select a reason...'}
                        </SelectValue>
                        <span className="text-black/30 dark:text-white/30 ms-2">&#x25BE;</span>
                      </Button>
                      <Popover className="w-[var(--trigger-width)] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
                        <ListBox className="p-1 outline-none">
                          {DECLINE_REASONS.map((r) => (
                            <ListBoxItem
                              key={r.value}
                              id={r.value}
                              className="rounded-md px-3 py-2 text-sm cursor-pointer outline-none
                                data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
                                data-[focused]:bg-[#2563EB]/10 data-[focused]:text-[#2563EB]
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
                    <label className="block text-sm font-medium mb-1.5">
                      Note (optional)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Additional context..."
                      rows={2}
                      className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none
                        focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/50
                        placeholder:text-black/30 dark:placeholder:text-white/30"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <Button
                      className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium outline-none
                        data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
                        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
                      onPress={() => {
                        setReason(null)
                        setNote('')
                        onClose()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 outline-none
                        dark:border-red-800 dark:bg-red-950/30 dark:text-red-300
                        data-[hovered]:bg-red-100 dark:data-[hovered]:bg-red-950/50
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
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                      Are you sure? This action cannot be undone.
                    </p>
                    <p className="text-sm text-black/60 dark:text-white/60">
                      Reason: {DECLINE_REASONS.find((r) => r.value === reason)?.label}
                    </p>
                    {note.trim() && (
                      <p className="text-sm text-black/40 dark:text-white/40 mt-1">
                        Note: {note.trim()}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium outline-none
                        data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
                        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
                      onPress={() => setShowConfirm(false)}
                    >
                      Go Back
                    </Button>
                    <Button
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white outline-none
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
