import { useTranslation } from 'react-i18next'
import { useFinanceStore } from '../../../stores/finance'
import type { PaymentMethod } from '../../../types/finance'

interface MethodCard {
  method: PaymentMethod
  icon: React.ReactNode
  titleKey: string
  descKey: string
}

const BANK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-8">
    <path d="M12 2L2 7h20L12 2zM4 9v8M8 9v8M12 9v8M16 9v8M20 9v8M2 19h20" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CHEQUE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-8">
    <path d="M9 12h6M9 16h6M3 6h18a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const SHIELD_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-8">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const CASH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-8">
    <path d="M2 6h20v12H2V6zM12 9a3 3 0 110 6 3 3 0 010-6zM6 12H6.01M18 12h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const METHODS: MethodCard[] = [
  { method: 'wire', icon: BANK_ICON, titleKey: 'payments.methods.wire', descKey: 'payments.methods.wireDesc' },
  { method: 'cheque', icon: CHEQUE_ICON, titleKey: 'payments.methods.cheque', descKey: 'payments.methods.chequeDesc' },
  { method: 'lc', icon: SHIELD_ICON, titleKey: 'payments.methods.lc', descKey: 'payments.methods.lcDesc' },
  { method: 'cash', icon: CASH_ICON, titleKey: 'payments.methods.cash', descKey: 'payments.methods.cashDesc' },
]

/**
 * Step 1: Payment method selection.
 * 2x2 grid of clickable cards for Wire, Cheque, LC, Cash.
 * Per FIN-03: all 4 payment instruments must be present.
 */
export function MethodSelector() {
  const { t } = useTranslation('finance')
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)

  const handleSelect = (method: PaymentMethod) => {
    setPaymentFlowStep('details', method)
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">
        {t('payments.selectMethod', 'Select Payment Method')}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {METHODS.map((m) => (
          <button
            key={m.method}
            type="button"
            onClick={() => handleSelect(m.method)}
            className="flex flex-col items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-6 text-start transition-colors hover:border-[#2563EB] hover:bg-[#2563EB]/5 focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2 cursor-pointer"
          >
            <div className="text-black/60 dark:text-white/60">
              {m.icon}
            </div>
            <div className="font-medium text-sm">
              {t(m.titleKey, m.method)}
            </div>
            <div className="text-xs text-black/50 dark:text-white/50 text-center">
              {t(m.descKey, '')}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
