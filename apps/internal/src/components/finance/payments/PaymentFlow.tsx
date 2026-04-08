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
 * "The Payment Terminal" — 4-step payment wizard.
 * Step indicator: horizontal breadcrumb (dots connected by line).
 * NOT numbered cards — minimal dot + label + connecting line.
 */
export function PaymentFlow() {
  const { t } = useTranslation('finance')
  const paymentFlow = useFinanceStore((s) => s.paymentFlow)
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)
  const resetPaymentFlow = useFinanceStore((s) => s.resetPaymentFlow)

  const currentStepIndex = STEP_INDEX[paymentFlow.step] ?? 0

  const stepLabels = [
    t('payments.step.selectMethod', 'Method'),
    t('payments.step.details', 'Details'),
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
      {/* Step indicator — numbered steps with clear progress */}
      <div className="px-6 pt-5 pb-4 border-b border-black/10 dark:border-white/10">
        {/* Step counter text */}
        <div className="text-center mb-3">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-black/40 dark:text-white/40">
            {t('payments.stepOf', 'Step {{current}} of {{total}}', { current: currentStepIndex + 1, total: stepLabels.length })}:
          </span>
          <span className="text-xs font-medium text-black dark:text-white ms-1.5">
            {stepLabels[currentStepIndex]}
          </span>
        </div>
        <div className="flex items-center justify-center">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center">
              {/* Numbered dot + label */}
              <div className="flex items-center gap-2">
                <div
                  className={`size-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                    i < currentStepIndex
                      ? 'bg-[#2563EB] text-white'
                      : i === currentStepIndex
                        ? 'bg-[#2563EB] text-white ring-4 ring-[#2563EB]/10'
                        : 'bg-black/10 dark:bg-white/10 text-black/30 dark:text-white/30'
                  }`}
                >
                  {i < currentStepIndex ? (
                    <svg viewBox="0 0 12 12" fill="none" className="size-3">
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs transition-colors ${
                    i === currentStepIndex
                      ? 'font-medium text-black dark:text-white'
                      : i < currentStepIndex
                        ? 'text-[#2563EB]'
                        : 'text-black/30 dark:text-white/30'
                  }`}
                >
                  {label}
                </span>
              </div>
              {/* Connecting line */}
              {i < stepLabels.length - 1 && (
                <div
                  className={`h-px w-10 mx-3 transition-colors ${
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

      {/* Navigation bar — always visible with Back button */}
      <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 px-6 py-3">
        <Button
          onPress={handleBack}
          isDisabled={currentStepIndex === 0}
          className="rounded-md px-4 py-2 text-xs font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:cursor-default outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
        >
          {t('payments.back', 'Back')}
        </Button>
        <button
          type="button"
          onClick={resetPaymentFlow}
          className="text-xs text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
        >
          {t('payments.cancel', 'Cancel')}
        </button>
      </div>
    </div>
  )
}
