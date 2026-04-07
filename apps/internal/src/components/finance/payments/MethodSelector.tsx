import { useTranslation } from 'react-i18next'
import { useFinanceStore } from '../../../stores/finance'
import type { PaymentMethod } from '../../../types/finance'

interface MethodOption {
  method: PaymentMethod
  titleKey: string
  title: string
}

const METHODS: MethodOption[] = [
  { method: 'wire', titleKey: 'payments.methods.wire', title: 'Wire Transfer' },
  { method: 'cheque', titleKey: 'payments.methods.cheque', title: 'Cheque' },
  { method: 'cash', titleKey: 'payments.methods.cash', title: 'Cash' },
  { method: 'lc', titleKey: 'payments.methods.lc', title: 'Letter of Credit' },
]

/**
 * Step 1: Payment method selection.
 * Large clickable tiles — icon-free text labels in rounded rectangles.
 * Selected = blue fill. Per FIN-03: all 4 instruments present.
 */
export function MethodSelector() {
  const { t } = useTranslation('finance')
  const setPaymentFlowStep = useFinanceStore((s) => s.setPaymentFlowStep)

  const handleSelect = (method: PaymentMethod) => {
    setPaymentFlowStep('details', method)
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-black dark:text-white">
          {t('payments.selectMethod', 'Select Payment Method')}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {METHODS.map((m) => (
          <button
            key={m.method}
            type="button"
            onClick={() => handleSelect(m.method)}
            className="rounded-lg border border-black/10 dark:border-white/10 px-6 py-5 text-start transition-all hover:border-[#2563EB] hover:bg-[#2563EB]/[0.03] active:bg-[#2563EB] active:text-white active:border-[#2563EB] focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2 cursor-pointer group"
          >
            <span className="text-sm font-medium text-black dark:text-white group-active:text-white">
              {t(m.titleKey, m.title)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
