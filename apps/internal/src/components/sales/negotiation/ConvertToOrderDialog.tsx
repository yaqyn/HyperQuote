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
import { convertQuoteToOrder } from '../../../lib/server/sales-pipeline'

// ─── Types ───────────────────────────────────────────────────

type ConversionPath = 'standard' | 'phone_confirmed'

// ─── Component ───────────────────────────────────────────────

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

  async function handleConvert() {
    setIsConverting(true)
    try {
      const result = await convertQuoteToOrder({
        data: {
          quoteId,
          poNumber: customerPoNumber || undefined,
        },
      })
      onOpenChange(false)
      onSuccess?.(result.orderNumber)
    } finally {
      setIsConverting(false)
    }
  }

  const conversionSteps = [
    {
      label: t('sales.negotiation.convert.createSO', 'Creates Sales Order (SO-XXXX)'),
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    },
    {
      label: t('sales.negotiation.convert.createPOs', 'Auto-generates Purchase Orders to suppliers (one PO per supplier)'),
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    },
    {
      label: t('sales.negotiation.convert.delivery', 'Creates delivery schedule based on lead times'),
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      label: t('sales.negotiation.convert.notify', 'Notifies operations team'),
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    },
    {
      label: t('sales.negotiation.convert.proforma', 'Generates proforma invoice'),
      icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
    },
  ]

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      {/* Trigger is managed externally */}
      <span />
      <ModalOverlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Modal className="backdrop-blur-2xl bg-white/90 dark:bg-black/90 rounded-2xl shadow-2xl w-full max-w-lg">
          <Dialog isKeyboardDismissDisabled className="outline-none p-6">
            <Heading slot="title" className="text-lg font-semibold mb-4">
              {t('sales.negotiation.convert.title', 'Convert Quote to Order')}
            </Heading>

            {/* What will happen */}
            <div className="space-y-3 mb-5">
              <p className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
                {t('sales.negotiation.convert.whatHappens', 'This will')}
              </p>
              {conversionSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#2563EB]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={step.icon} />
                    </svg>
                  </div>
                  <span className="text-sm">{step.label}</span>
                </div>
              ))}
            </div>

            {/* Customer PO Number */}
            <TextField
              value={customerPoNumber}
              onChange={setCustomerPoNumber}
              className="mb-4"
            >
              <Label className="block text-sm font-medium mb-1">
                {t('sales.negotiation.convert.poNumber', 'Customer PO Number')}
                <span className="text-xs text-black/40 dark:text-white/40 ms-1">
                  ({t('sales.negotiation.convert.poHint', 'required if customer provided one')})
                </span>
              </Label>
              <Input className="w-full font-mono bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563EB] transition-colors" />
            </TextField>

            {/* Advance Payment */}
            <Checkbox
              isSelected={requestAdvancePayment}
              onChange={setRequestAdvancePayment}
              className="flex items-center gap-2 mb-5 text-sm cursor-pointer"
            >
              <div
                className={[
                  'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                  requestAdvancePayment
                    ? 'bg-[#2563EB] border-[#2563EB]'
                    : 'border-black/20 dark:border-white/20',
                ].join(' ')}
              >
                {requestAdvancePayment && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
              {t('sales.negotiation.convert.requestAdvance', 'Request Advance Payment')}
              <span className="text-xs text-black/40 dark:text-white/40">
                ({t('sales.negotiation.convert.advanceHint', 'for new customers or credit-limited')})
              </span>
            </Checkbox>

            {/* Conversion Path Toggle */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => setConversionPath('standard')}
                className={[
                  'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors',
                  conversionPath === 'standard'
                    ? 'border-[#2563EB] bg-[#2563EB]/5 text-[#2563EB]'
                    : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5',
                ].join(' ')}
              >
                <div className="font-medium">
                  {t('sales.negotiation.convert.standard', 'Standard')}
                </div>
                <div className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">
                  {t('sales.negotiation.convert.standardDesc', 'Customer accepted via portal')}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setConversionPath('phone_confirmed')}
                className={[
                  'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors',
                  conversionPath === 'phone_confirmed'
                    ? 'border-[#2563EB] bg-[#2563EB]/5 text-[#2563EB]'
                    : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5',
                ].join(' ')}
              >
                <div className="font-medium">
                  {t('sales.negotiation.convert.phoneConfirmed', 'Phone Confirmed')}
                </div>
                <div className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">
                  {t('sales.negotiation.convert.phoneDesc', 'Rep confirms order directly')}
                </div>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConvert}
                disabled={isConverting}
                className="px-5 py-2 text-sm font-medium bg-[#2563EB] text-white rounded-lg disabled:opacity-40 hover:bg-[#2563EB]/90 transition-colors flex items-center gap-2"
              >
                {isConverting && (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )}
                {conversionPath === 'standard'
                  ? t('sales.negotiation.convert.convertNow', 'Convert Now')
                  : t('sales.negotiation.convert.confirmOrder', 'Confirm Order')}
              </button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}
