import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  Select,
  SelectValue,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  TextArea,
  TextField,
} from 'react-aria-components'
import type { ChequeRecord } from '../../../types/finance'
import { updateChequeStatus } from '../../../lib/server/finance-cheques'
import { CurrencyCell } from '../shared/CurrencyCell'

interface BounceHandlingModalProps {
  cheque: ChequeRecord
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onBounced: () => void
}

type BounceReason =
  | 'insufficient_funds'
  | 'signature_mismatch'
  | 'account_closed'
  | 'post_date_not_reached'
  | 'other'

const BOUNCE_REASONS: { id: BounceReason; label: string }[] = [
  { id: 'insufficient_funds', label: 'Insufficient funds' },
  { id: 'signature_mismatch', label: 'Signature mismatch' },
  { id: 'account_closed', label: 'Account closed' },
  { id: 'post_date_not_reached', label: 'Post-date not reached' },
  { id: 'other', label: 'Other' },
]

type ModalStep = 'form' | 'confirming' | 'success'

/**
 * Bounce handling modal for PDC.
 * Shows cheque details, reason dropdown, warning banner about consequences,
 * and action buttons. On confirm, calls updateChequeStatus which handles
 * AR reversal side-effect automatically.
 */
export function BounceHandlingModal({
  cheque,
  isOpen,
  onOpenChange,
  onBounced,
}: BounceHandlingModalProps) {
  const { t } = useTranslation('finance')
  const [reason, setReason] = useState<BounceReason | null>(null)
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState<ModalStep>('form')
  const [error, setError] = useState<string | null>(null)

  const handleConfirmBounce = async () => {
    if (!reason) return
    setStep('confirming')
    setError(null)

    try {
      const result = await updateChequeStatus({
        data: {
          chequeId: cheque.id,
          status: 'bounced',
          reason: `${reason}${notes ? `: ${notes}` : ''}`,
        },
      })

      if (result.success) {
        setStep('success')
      } else {
        setError('error' in result ? result.error : 'Failed to update cheque status')
        setStep('form')
      }
    } catch {
      setError('Network error. Please try again.')
      setStep('form')
    }
  }

  const handleClose = () => {
    if (step === 'success') {
      onBounced()
    }
    setStep('form')
    setReason(null)
    setNotes('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      isDismissable={step !== 'confirming'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-lg mx-4">
        <Dialog className="rounded-xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-2xl p-6 outline-none">
          {({ close }) => (
            <>
              <Heading
                slot="title"
                className="text-lg font-semibold text-black dark:text-white mb-4"
              >
                {t('pdc.bounceHandling', 'Bounce Handling')}
              </Heading>

              {step === 'success' ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      {t('pdc.bounceSuccess', 'Cheque marked as bounced successfully')}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-400">
                      <li>{t('pdc.arReversed', 'AR accounting entry reversed')}</li>
                      <li>
                        {t('pdc.amountAddedBack', 'Amount added back to customer outstanding AR')}
                      </li>
                      <li>{t('pdc.creditHoldPlaced', 'Customer placed on credit hold')}</li>
                      <li>
                        {t('pdc.legalNotificationTriggered', 'Legal notification triggered')}
                      </li>
                    </ul>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onPress={handleClose}
                      className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      {t('common.close', 'Close')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cheque details */}
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3">
                    <div>
                      <span className="text-xs text-black/50 dark:text-white/50">
                        {t('pdc.chequeNo', 'Cheque #')}
                      </span>
                      <p className="font-[family-name:var(--font-geist-mono)] text-sm text-black dark:text-white">
                        {cheque.chequeNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-black/50 dark:text-white/50">
                        {t('pdc.customer', 'Customer')}
                      </span>
                      <p className="text-sm text-black dark:text-white">{cheque.customerName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-black/50 dark:text-white/50">
                        {t('pdc.amount', 'Amount')}
                      </span>
                      <p className="text-sm">
                        <CurrencyCell amount={cheque.amount} />
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-black/50 dark:text-white/50">
                        {t('pdc.bank', 'Bank')}
                      </span>
                      <p className="text-sm text-black dark:text-white">{cheque.bankName}</p>
                    </div>
                  </div>

                  {/* Reason dropdown */}
                  <Select
                    selectedKey={reason}
                    onSelectionChange={(key) => setReason(key as BounceReason)}
                    className="flex flex-col gap-1"
                  >
                    <Label className="text-sm font-medium text-black dark:text-white">
                      {t('pdc.bounceReason', 'Reason')}
                    </Label>
                    <Button className="flex items-center justify-between rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm text-start outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]">
                      <SelectValue className="text-black dark:text-white placeholder-shown:text-black/40 dark:placeholder-shown:text-white/40">
                        {({ isPlaceholder }) =>
                          isPlaceholder
                            ? t('pdc.selectReason', 'Select reason...')
                            : BOUNCE_REASONS.find((r) => r.id === reason)?.label
                        }
                      </SelectValue>
                      <span className="text-black/40 dark:text-white/40" aria-hidden="true">
                        &#x25BE;
                      </span>
                    </Button>
                    <Popover className="w-[var(--trigger-width)] rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
                      <ListBox className="p-1 outline-none">
                        {BOUNCE_REASONS.map((r) => (
                          <ListBoxItem
                            key={r.id}
                            id={r.id}
                            className="cursor-pointer rounded-md px-3 py-2 text-sm text-black dark:text-white outline-none hover:bg-black/5 dark:hover:bg-white/5 focus:bg-black/5 dark:focus:bg-white/5 selected:bg-[#2563EB]/10 selected:text-[#2563EB]"
                          >
                            {r.label}
                          </ListBoxItem>
                        ))}
                      </ListBox>
                    </Popover>
                  </Select>

                  {/* Notes */}
                  <TextField
                    value={notes}
                    onChange={setNotes}
                    className="flex flex-col gap-1"
                  >
                    <Label className="text-sm font-medium text-black dark:text-white">
                      {t('pdc.notes', 'Notes')}
                    </Label>
                    <TextArea
                      className="rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
                      rows={2}
                      placeholder={t('pdc.notesPlaceholder', 'Additional notes (optional)')}
                    />
                  </TextField>

                  {/* Warning banner */}
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                      {t('pdc.bounceWarning', 'Bouncing this cheque will:')}
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-red-700 dark:text-red-400">
                      <li>{t('pdc.reverseEntry', 'Reverse accounting entry')}</li>
                      <li>
                        {t('pdc.addBackToAR', 'Add EGP back to AR')}{' '}
                        <CurrencyCell amount={cheque.amount} className="text-red-700 dark:text-red-400" />
                      </li>
                      <li>{t('pdc.creditHold', 'Place customer on credit hold')}</li>
                      <li>{t('pdc.legalNotification', 'Trigger legal notification')}</li>
                    </ol>
                  </div>

                  {/* Error message */}
                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 justify-end pt-2">
                    <Button
                      onPress={() => {
                        handleClose()
                        close()
                      }}
                      className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                      onPress={handleConfirmBounce}
                      isDisabled={!reason || step === 'confirming'}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 pressed:bg-red-800 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      {step === 'confirming'
                        ? t('pdc.processing', 'Processing...')
                        : t('pdc.confirmBounce', 'Confirm Bounce')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
