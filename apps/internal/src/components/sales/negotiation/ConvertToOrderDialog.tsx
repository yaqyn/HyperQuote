import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Heading,
  TextField,
  Input,
  Label,
  Checkbox,
} from 'react-aria-components'
import { Button } from '../../ui'
import { convertQuoteToOrder } from '../../../lib/server/sales-pipeline'

// ─── Types ──────────────────────────────────────────────────

type ConversionPath = 'standard' | 'phone_confirmed'

// ─── Component ──────────────────────────────────────────────

interface ConvertToOrderDialogProps {
  quoteId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (orderNumber: string) => void
}

export function ConvertToOrderDialog({
  quoteId,
  isOpen,
  onOpenChange,
  onSuccess,
}: ConvertToOrderDialogProps) {
  const { t } = useTranslation('internal')
  const [customerPoNumber, setCustomerPoNumber] = useState('')
  const [requestAdvancePayment, setRequestAdvancePayment] = useState(false)
  const [conversionPath, setConversionPath] = useState<ConversionPath>('standard')
  const [isConverting, setIsConverting] = useState(false)
  const [successResult, setSuccessResult] = useState<{ orderNumber: string; orderId: string } | null>(null)

  async function handleConvert() {
    setIsConverting(true)
    try {
      const result = await convertQuoteToOrder({
        data: {
          quoteId,
          poNumber: customerPoNumber || undefined,
        },
      })
      setSuccessResult({ orderNumber: result.orderNumber, orderId: result.orderId })
    } finally {
      setIsConverting(false)
    }
  }

  function handleClose() {
    if (successResult) {
      onSuccess?.(successResult.orderNumber)
    }
    setSuccessResult(null)
    onOpenChange(false)
  }

  const steps = [
    t('sales.negotiation.convert.createSO', 'Creates Sales Order (SO-XXXX)'),
    t('sales.negotiation.convert.createPOs', 'Auto-generates Purchase Orders to suppliers'),
    t('sales.negotiation.convert.delivery', 'Creates delivery schedule based on lead times'),
    t('sales.negotiation.convert.notify', 'Notifies operations team'),
    t('sales.negotiation.convert.proforma', 'Generates proforma invoice'),
  ]

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else onOpenChange(true) }}>
      <span />
      <ModalOverlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Modal className="w-full max-w-lg rounded-2xl bg-white/90 shadow-2xl backdrop-blur-2xl dark:bg-black/90">
          <Dialog isKeyboardDismissDisabled className="p-6 outline-none">
            {successResult ? (
              <>
                <div className="flex flex-col items-center py-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <Heading slot="title" className="mt-4 text-[15px] font-semibold text-[var(--color-text)]">
                    {t('sales.negotiation.convert.successTitle', 'Order Created Successfully')}
                  </Heading>
                  <p className="mt-2 text-[13px] text-[var(--color-text-subtle)]">
                    {t('sales.negotiation.convert.successDesc', 'The quote has been converted to an order.')}
                  </p>
                  <div className="mt-4 rounded-lg border border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                      {t('sales.negotiation.convert.orderNumber', 'Order Number')}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[17px] font-semibold tabular-nums text-[var(--color-text)]">
                      {successResult.orderNumber}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    onPress={handleClose}
                  >
                    {t('common.done', 'Done')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Heading slot="title" className="text-[15px] font-semibold text-[var(--color-text)]">
                  {t('sales.negotiation.convert.title', 'Convert to Order')}
                </Heading>

                {/* Summary of what happens */}
                <div className="mt-5 space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                    {t('sales.negotiation.convert.whatHappens', 'This will')}
                  </p>
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <span className="mt-1.5 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
                        {idx + 1}.
                      </span>
                      <span className="text-[13px] text-[var(--color-text)]">{step}</span>
                    </div>
                  ))}
                </div>

                {/* Customer PO Number */}
                <TextField
                  value={customerPoNumber}
                  onChange={setCustomerPoNumber}
                  className="mt-5"
                >
                  <Label className="mb-1.5 block text-[13px] font-medium text-[var(--color-text)]">
                    {t('sales.negotiation.convert.poNumber', 'Customer PO Number')}
                    <span className="ms-1 text-[11px] text-[var(--color-text-subtle)]">
                      ({t('sales.negotiation.convert.poHint', 'if provided')})
                    </span>
                  </Label>
                  <Input className="w-full rounded-lg border border-black/[0.06] bg-transparent px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] dark:border-white/[0.06]" />
                </TextField>

                {/* Advance Payment */}
                <Checkbox
                  isSelected={requestAdvancePayment}
                  onChange={setRequestAdvancePayment}
                  className="mt-4 flex cursor-pointer items-center gap-2.5 text-[13px]"
                >
                  <div
                    className={[
                      'flex size-4 items-center justify-center rounded border transition-colors',
                      requestAdvancePayment
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                        : 'border-black/[0.15] dark:border-white/[0.15]',
                    ].join(' ')}
                  >
                    {requestAdvancePayment && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-[var(--color-text)]">
                      {t('sales.negotiation.convert.requestAdvance', 'Request Advance Payment')}
                    </span>
                    <span className="ms-1 text-[11px] text-[var(--color-text-subtle)]">
                      ({t('sales.negotiation.convert.advanceHint', 'new or credit-limited customers')})
                    </span>
                  </div>
                </Checkbox>

                {/* Conversion Path */}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConversionPath('standard')}
                    className={[
                      'rounded-lg border px-3 py-2.5 text-start text-[13px] transition-colors',
                      conversionPath === 'standard'
                        ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
                        : 'border-black/[0.06] hover:bg-black/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.02]',
                    ].join(' ')}
                  >
                    <div className="font-medium text-[var(--color-text)]">
                      {t('sales.negotiation.convert.standard', 'Standard')}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">
                      {t('sales.negotiation.convert.standardDesc', 'Customer accepted via portal')}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConversionPath('phone_confirmed')}
                    className={[
                      'rounded-lg border px-3 py-2.5 text-start text-[13px] transition-colors',
                      conversionPath === 'phone_confirmed'
                        ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
                        : 'border-black/[0.06] hover:bg-black/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.02]',
                    ].join(' ')}
                  >
                    <div className="font-medium text-[var(--color-text)]">
                      {t('sales.negotiation.convert.phoneConfirmed', 'Phone Confirmed')}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">
                      {t('sales.negotiation.convert.phoneDesc', 'Rep confirms order directly')}
                    </div>
                  </button>
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onPress={() => onOpenChange(false)}
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onPress={handleConvert}
                    isDisabled={isConverting}
                    className="flex items-center gap-2"
                  >
                    {isConverting && (
                      <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                    {conversionPath === 'standard'
                      ? t('sales.negotiation.convert.convertNow', 'Convert Now')
                      : t('sales.negotiation.convert.confirmOrder', 'Confirm Order')}
                  </Button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}
