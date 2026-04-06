import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CurrencyCell } from '../shared/CurrencyCell'
import { generateForm41 } from '../../../lib/server/finance-ap'

interface SupplierWithholding {
  supplierId: string
  supplierName: string
  grossAmount: number
  /** 'goods' = 1%, 'services' = 5% */
  type: 'goods' | 'services'
  withheldAmount: number
  netPaid: number
}

const WITHHOLDING_RATES: Record<string, number> = {
  goods: 1,
  services: 5,
}

/** Mock withholding data */
function getMockWithholding(): SupplierWithholding[] {
  return [
    {
      supplierId: 'sup-001',
      supplierName: 'Cairo Steel Co.',
      grossAmount: 1_250_000,
      type: 'goods',
      withheldAmount: 12_500,
      netPaid: 1_237_500,
    },
    {
      supplierId: 'sup-002',
      supplierName: 'Delta Cement Group',
      grossAmount: 240_000,
      type: 'goods',
      withheldAmount: 2_400,
      netPaid: 237_600,
    },
    {
      supplierId: 'sup-003',
      supplierName: 'Nile Aggregates',
      grossAmount: 225_000,
      type: 'goods',
      withheldAmount: 2_250,
      netPaid: 222_750,
    },
    {
      supplierId: 'sup-004',
      supplierName: 'Express Logistics',
      grossAmount: 180_000,
      type: 'services',
      withheldAmount: 9_000,
      netPaid: 171_000,
    },
  ]
}

/**
 * Withholding tax tracking panel (Section 5.5).
 * Summary: total withheld YTD, current quarter balance, next remittance.
 * Per-supplier breakdown: gross, rate (1% goods / 5% services), withheld, net.
 * Form 41 quarterly generation.
 */
export function WithholdingTaxSection() {
  const { t } = useTranslation('finance')
  const suppliers = getMockWithholding()
  const [selectedQuarter, setSelectedQuarter] = useState(1)
  const [form41Status, setForm41Status] = useState<'pending' | 'submitted' | 'generating'>('pending')

  const totalWithheld = suppliers.reduce((sum, s) => sum + s.withheldAmount, 0)
  const currentYear = new Date().getFullYear()

  const handleGenerateForm41 = async () => {
    setForm41Status('generating')
    try {
      await generateForm41({ data: { quarter: selectedQuarter, year: currentYear } })
      setForm41Status('submitted')
    } catch {
      setForm41Status('pending')
    }
  }

  const handleGenerateCertificate = (_supplierId: string) => {
    // Mock: would call generateForm41 or a dedicated certificate endpoint
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="px-6">
        <h3 className="text-sm font-semibold mb-3">
          {t('ap.withholdingTax', 'Withholding Tax')}
        </h3>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-3">
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('ap.totalWithheldYTD', 'Total Withheld YTD')}
            </div>
            <div className="text-lg">
              <CurrencyCell amount={totalWithheld} />
            </div>
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-3">
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('ap.currentQuarterBalance', 'Current Quarter Balance')}
            </div>
            <div className="text-lg">
              <CurrencyCell amount={totalWithheld} />
            </div>
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-3">
            <div className="text-xs text-black/50 dark:text-white/50 mb-1">
              {t('ap.nextRemittance', 'Next Remittance')}
            </div>
            <div className="text-lg font-[family-name:var(--font-geist-mono)] tabular-nums">
              {t('ap.endOfQuarter', 'End of Q{{quarter}} {{year}}', {
                quarter: Math.ceil((new Date().getMonth() + 1) / 3),
                year: currentYear,
              })}
            </div>
          </div>
        </div>

        {/* Rates label */}
        <div className="rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-2 text-xs text-black/50 dark:text-white/50 mb-4">
          <span className="font-medium">{t('ap.rates', 'Rates:')}</span>{' '}
          {t('ap.ratesDetail', 'Goods: 1% | Services: 5%')} — {t('ap.perEgyptianTaxLaw', 'Per Egyptian tax law')}
        </div>

        {/* Per-supplier breakdown */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 text-xs text-black/50 dark:text-white/50">
              <th className="py-2 pe-4 text-start font-medium">{t('ap.col.supplier', 'Supplier')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('ap.col.grossAmount', 'Gross Amount')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('ap.col.rate', 'Rate')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('ap.col.withheld', 'Withheld')}</th>
              <th className="py-2 pe-4 text-end font-medium">{t('ap.col.netPaid', 'Net Paid')}</th>
              <th className="py-2 text-end font-medium">{t('ap.col.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.supplierId} className="border-b border-black/5 dark:border-white/5">
                <td className="py-3 pe-4">{s.supplierName}</td>
                <td className="py-3 pe-4 text-end">
                  <CurrencyCell amount={s.grossAmount} />
                </td>
                <td className="py-3 pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {WITHHOLDING_RATES[s.type]}% ({s.type === 'goods'
                    ? t('ap.goods', 'Goods')
                    : t('ap.services', 'Services')})
                </td>
                <td className="py-3 pe-4 text-end">
                  <CurrencyCell amount={s.withheldAmount} />
                </td>
                <td className="py-3 pe-4 text-end">
                  <CurrencyCell amount={s.netPaid} />
                </td>
                <td className="py-3 text-end">
                  <button
                    type="button"
                    onClick={() => handleGenerateCertificate(s.supplierId)}
                    className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {t('ap.generateCertificate', 'Generate Certificate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Quarterly Form 41 */}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <h4 className="text-sm font-semibold mb-3">
            {t('ap.form41', 'Quarterly Form 41')}
          </h4>
          <div className="flex items-center gap-3">
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(Number(e.target.value))}
              className="rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 px-3 py-1.5 text-sm backdrop-blur-sm"
            >
              <option value={1}>Q1 {currentYear}</option>
              <option value={2}>Q2 {currentYear}</option>
              <option value={3}>Q3 {currentYear}</option>
              <option value={4}>Q4 {currentYear}</option>
            </select>
            <span className="text-xs text-black/50 dark:text-white/50">
              {t('ap.form41Status', 'Status:')}{' '}
              <span className={form41Status === 'submitted' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                {form41Status === 'submitted'
                  ? t('ap.submitted', 'Submitted')
                  : form41Status === 'generating'
                    ? t('ap.generating', 'Generating...')
                    : t('ap.pending', 'Pending')}
              </span>
            </span>
            <button
              type="button"
              onClick={handleGenerateForm41}
              disabled={form41Status === 'generating'}
              className="rounded-lg bg-[#2563EB] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2563EB]/90 transition-colors disabled:opacity-50"
            >
              {t('ap.generateForm41', 'Generate Form 41')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
