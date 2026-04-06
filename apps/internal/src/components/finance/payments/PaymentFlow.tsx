import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { useFinanceStore } from '../../../stores/finance'
import { MethodSelector } from './MethodSelector'
import { WireTransferForm } from './WireTransferForm'
import { ChequeForm } from './ChequeForm'
import { LCForm } from './LCForm'
import { CashForm } from './CashForm'
import { InvoiceAllocator } from './InvoiceAllocator'
import { PaymentConfirmation } from './PaymentConfirmation'

const STEPS = ['select_method', 'details', 'allocate', 'confirm'] as const
const STEP_INDEX: Record<string, number> = {
  select_method: 0,
  details: 1,
  allocate: 2,
  confirm: 3,
}

/**
 * Payment recording wizard — 4 steps:
 * 1. Select Method (MethodSelector)
 * 2. Enter Details (WireTransferForm / ChequeForm / LCForm / CashForm)
 * 3. Allocate to Invoices (InvoiceAllocator)
 * 4. Confirm (PaymentConfirmation)
 */
export function PaymentFlow() {
  const { t } = useTranslation('finance')
  const paymentFlow = useFinanceStore((s) => s.paymentFlow)
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)
  const resetPaymentFlow = useFinanceStore((s) => s.resetPaymentFlow)

  const currentStepIndex = STEP_INDEX[paymentFlow.step] ?? 0

  const stepLabels = [
    t('payments.step.selectMethod', 'Select Method'),
    t('payments.step.details', 'Enter Details'),
    t('payments.step.allocate', 'Allocate'),
    t('payments.step.confirm', 'Confirm'),
  ]

  const handleBack = () => {
    if (currentStepIndex === 0) return
    const prevStep = STEPS[currentStepIndex - 1]
    setPaymentFlowStep(prevStep)
  }

  const renderDetailsForm = () => {
    switch (paymentFlow.method) {
      case 'wire':
        return <WireTransferForm />
      case 'cheque':
        return <ChequeForm />
      case 'lc':
        return <LCForm />
      case 'cash':
        return <CashForm />
      default:
        return null
    }
  }

  const renderStep = () => {
    switch (paymentFlow.step) {
      case 'select_method':
        return <MethodSelector />
      case 'details':
        return renderDetailsForm()
      case 'allocate':
        return <InvoiceAllocator />
      case 'confirm':
        return <PaymentConfirmation />
      default:
        return <MethodSelector />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {/* Step circle */}
              <div className="flex items-center gap-2">
                <div
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-[family-name:var(--font-geist-mono)] tabular-nums transition-colors ${
                    i <= currentStepIndex
                      ? 'bg-[#2563EB] text-white'
                      : 'border border-black/20 dark:border-white/20 text-black/40 dark:text-white/40'
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs ${
                    i === currentStepIndex
                      ? 'font-medium text-black dark:text-white'
                      : 'text-black/40 dark:text-white/40'
                  }`}
                >
                  {label}
                </span>
              </div>
              {/* Connector line */}
              {i < stepLabels.length - 1 && (
                <div
                  className={`h-px w-8 ${
                    i < currentStepIndex ? 'bg-[#2563EB]' : 'bg-black/10 dark:bg-white/10'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        {renderStep()}
      </div>

      {/* Navigation bar */}
      {currentStepIndex > 0 && (
        <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 px-6 py-3">
          <Button
            onPress={handleBack}
            className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 pressed:bg-black/10 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            {t('payments.back', 'Back')}
          </Button>
          <Button
            onPress={resetPaymentFlow}
            className="rounded-lg text-sm text-black/40 dark:text-white/40 px-4 py-2 hover:text-black/60 dark:hover:text-white/60 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            {t('payments.cancel', 'Cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}
