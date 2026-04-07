import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Dialog,
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

type BounceAction = 're_present' | 'replace' | 'legal'

type ModalStep = 'form' | 'confirming' | 'success'

/**
 * Serious bounce handling modal — warning icon, bounce details,
 * action options (re-present, replace, legal), customer notification toggle.
 * Elevated glass tier: backdrop-blur-2xl bg-white/90.
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
  const [selectedAction, setSelectedAction] = useState<BounceAction | null>(null)
  const [notifyCustomer, setNotifyCustomer] = useState(true)
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
    setSelectedAction(null)
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
      isKeyboardDismissDisabled
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <Modal className="w-full max-w-md mx-4">
        <Dialog className="rounded-xl border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/90 backdrop-blur-2xl p-0 outline-none">
          {({ close }) => (
            <>
              {step === 'success' ? (
                <div className="p-6 flex flex-col items-center gap-4 py-10">
                  <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5 text-green-600">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-black dark:text-white mb-2">
                      {t('pdc.bounceSuccess', 'Cheque marked as bounced')}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px] text-black/40 dark:text-white/40">
                      <span>{t('pdc.arReversed', 'AR entry reversed')}</span>
                      <span>{t('pdc.creditHoldPlaced', 'Customer on credit hold')}</span>
                      <span>{t('pdc.legalNotificationTriggered', 'Legal notification triggered')}</span>
                    </div>
                  </div>
                  <Button
                    onPress={handleClose}
                    className="rounded-md bg-black dark:bg-white text-white dark:text-black px-5 py-2 text-xs font-medium hover:opacity-90 pressed:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-opacity"
                  >
                    {t('common.close', 'Close')}
                  </Button>
                </div>
              ) : (
                <>
                  {/* Header with warning */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <div className="size-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4 text-red-500">
                        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <Heading
                      slot="title"
                      className="text-sm font-semibold text-black dark:text-white"
                    >
                      {t('pdc.bounceHandling', 'Bounce Handling')}
                    </Heading>
                  </div>

                  <div className="p-6 flex flex-col gap-4">
                    {/* Cheque details — compact inline */}
                    <div className="flex items-center justify-between py-2.5 px-3 rounded-md bg-black/[0.02] dark:bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black dark:text-white">
                          {cheque.chequeNumber}
                        </span>
                        <span className="text-xs text-black/40 dark:text-white/40">
                          {cheque.customerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CurrencyCell amount={cheque.amount} className="text-sm font-semibold text-black dark:text-white" />
                        <span className="text-[10px] text-black/30 dark:text-white/30">
                          {cheque.bankName}
                        </span>
                      </div>
                    </div>

                    {/* Reason dropdown */}
                    <Select
                      selectedKey={reason}
                      onSelectionChange={(key) => setReason(key as BounceReason)}
                      className="flex flex-col gap-1"
                    >
                      <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40">
                        {t('pdc.bounceReason', 'Reason')}
                      </Label>
                      <Button className="flex items-center justify-between rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-xs text-start outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors">
                        <SelectValue className="text-black dark:text-white placeholder-shown:text-black/30 dark:placeholder-shown:text-white/30">
                          {({ isPlaceholder }) =>
                            isPlaceholder
                              ? t('pdc.selectReason', 'Select reason...')
                              : BOUNCE_REASONS.find((r) => r.id === reason)?.label
                          }
                        </SelectValue>
                        <span className="text-black/20 dark:text-white/20" aria-hidden="true">
                          &#x25BE;
                        </span>
                      </Button>
                      <Popover className="w-[var(--trigger-width)] rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg">
                        <ListBox className="p-1 outline-none">
                          {BOUNCE_REASONS.map((r) => (
                            <ListBoxItem
                              key={r.id}
                              id={r.id}
                              className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-black dark:text-white outline-none hover:bg-black/5 dark:hover:bg-white/5 focus:bg-black/5 dark:focus:bg-white/5 selected:bg-[#2563EB]/10 selected:text-[#2563EB]"
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
                      <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40">
                        {t('pdc.notes', 'Notes')}
                      </Label>
                      <TextArea
                        className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-xs text-black dark:text-white outline-none focus:border-[#2563EB] resize-none transition-colors"
                        rows={2}
                        placeholder={t('pdc.notesPlaceholder', 'Additional notes (optional)')}
                      />
                    </TextField>

                    {/* Action options */}
                    <div>
                      <Label className="text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40 mb-2 block">
                        {t('pdc.nextAction', 'Action')}
                      </Label>
                      <div className="flex gap-2">
                        {(
                          [
                            { key: 're_present' as const, label: t('pdc.rePresent', 'Re-present') },
                            { key: 'replace' as const, label: t('pdc.replace', 'Replace') },
                            { key: 'legal' as const, label: t('pdc.legal', 'Legal') },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setSelectedAction(opt.key)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                              selectedAction === opt.key
                                ? opt.key === 'legal'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-[#2563EB] text-white'
                                : 'border border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 hover:border-black/20 dark:hover:border-white/20'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Customer notification toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyCustomer}
                        onChange={(e) => setNotifyCustomer(e.target.checked)}
                        className="size-3.5 rounded-sm border-black/20 dark:border-white/20 accent-[#2563EB]"
                      />
                      <span className="text-xs text-black/50 dark:text-white/50">
                        {t('pdc.notifyCustomer', 'Notify customer')}
                      </span>
                    </label>

                    {/* Warning — consequences */}
                    <div className="rounded-md bg-red-500/[0.04] border border-red-500/10 px-3 py-2.5">
                      <div className="text-[10px] text-red-600 dark:text-red-400 space-y-0.5">
                        <div>{t('pdc.reverseEntry', 'Reverses accounting entry')}</div>
                        <div>
                          {t('pdc.addBackToAR', 'Adds back to AR:')}{' '}
                          <CurrencyCell amount={cheque.amount} className="text-[10px] text-red-600 dark:text-red-400 font-medium" />
                        </div>
                        <div>{t('pdc.creditHold', 'Places customer on credit hold')}</div>
                        <div>{t('pdc.legalNotification', 'Triggers legal notification')}</div>
                      </div>
                    </div>

                    {/* Error message */}
                    {error && (
                      <p className="text-[10px] text-red-500">{error}</p>
                    )}
                  </div>

                  {/* Action bar */}
                  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => {
                        handleClose()
                        close()
                      }}
                      className="text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <Button
                      onPress={handleConfirmBounce}
                      isDisabled={!reason || step === 'confirming'}
                      className="rounded-md bg-red-600 px-5 py-2 text-xs font-medium text-white hover:bg-red-700 pressed:bg-red-800 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-red-600 transition-colors"
                    >
                      {step === 'confirming'
                        ? t('pdc.processing', 'Processing...')
                        : t('pdc.confirmBounce', 'Confirm Bounce')}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
