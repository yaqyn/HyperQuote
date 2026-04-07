import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
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
 * Withholding tax tracking panel.
 * Dense layout: YTD total + quarter balance + next remittance at top.
 * Per-supplier breakdown below. Form 41 quarterly generation.
 * Clean, document-style — no cards, no borders on data rows.
 */
export function WithholdingTaxSection() {
  const { t, i18n } = useTranslation('finance')
  const isArabic = i18n.language === 'ar'
  const suppliers = getMockWithholding()
  const [selectedQuarter, setSelectedQuarter] = useState(1)
  const [form41Status, setForm41Status] = useState<'pending' | 'submitted' | 'generating'>('pending')

  const totalWithheld = suppliers.reduce((sum, s) => sum + s.withheldAmount, 0)
  const currentYear = new Date().getFullYear()
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)

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
    <div className="px-6 py-5">
      {/* Header row with key metrics inline */}
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
          {t('ap.withholdingTax', 'Withholding Tax')}
        </h3>
        <div className="flex items-center gap-6 text-xs text-black/40 dark:text-white/40">
          <span className="text-[10px] font-[family-name:var(--font-geist-mono)]">
            {t('ap.rates', 'Goods 1% | Services 5%')}
          </span>
        </div>
      </div>

      {/* Three key metrics — horizontal, dense */}
      <div className="flex items-start gap-8 mb-5 pb-5 border-b border-black/[0.04] dark:border-white/[0.04]">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-1">
            {t('ap.totalWithheldYTD', 'Withheld YTD')}
          </div>
          <CurrencyCell amount={totalWithheld} className="text-lg font-semibold text-black dark:text-white" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-1">
            {t('ap.currentQuarterBalance', 'Q' + currentQuarter + ' Balance')}
          </div>
          <CurrencyCell amount={totalWithheld} className="text-lg font-semibold text-black dark:text-white" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 mb-1">
            {t('ap.nextRemittance', 'Next Remittance')}
          </div>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold text-black dark:text-white">
            {t('ap.endOfQuarter', 'End Q{{quarter}} {{year}}', {
              quarter: currentQuarter,
              year: currentYear,
            })}
          </span>
        </div>
      </div>

      {/* Per-supplier breakdown — minimal table */}
      <table className="w-full text-sm mb-5">
        <thead>
          <tr className="text-[11px] text-black/40 dark:text-white/40">
            <th className="pb-2 pe-4 text-start font-medium">{t('ap.col.supplier', 'Supplier')}</th>
            <th className="pb-2 pe-4 text-end font-medium">{t('ap.col.grossAmount', 'Gross')}</th>
            <th className="pb-2 pe-4 text-end font-medium">{t('ap.col.rate', 'Rate')}</th>
            <th className="pb-2 pe-4 text-end font-medium">{t('ap.col.withheld', 'Withheld')}</th>
            <th className="pb-2 pe-4 text-end font-medium">{t('ap.col.netPaid', 'Net Paid')}</th>
            <th className="pb-2 text-end font-medium w-24" />
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.supplierId} className="border-t border-black/[0.04] dark:border-white/[0.04]">
              <td className="py-2.5 pe-4 text-black dark:text-white">{s.supplierName}</td>
              <td className="py-2.5 pe-4 text-end text-black/60 dark:text-white/60">
                <CurrencyCell amount={s.grossAmount} className="text-xs" />
              </td>
              <td className="py-2.5 pe-4 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/40 dark:text-white/40">
                {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(WITHHOLDING_RATES[s.type])}%
                <span className="ms-1 text-[10px] text-black/25 dark:text-white/25">
                  {s.type === 'goods' ? t('ap.goods', 'G') : t('ap.services', 'S')}
                </span>
              </td>
              <td className="py-2.5 pe-4 text-end font-semibold text-black dark:text-white">
                <CurrencyCell amount={s.withheldAmount} className="text-xs" />
              </td>
              <td className="py-2.5 pe-4 text-end text-black/50 dark:text-white/50">
                <CurrencyCell amount={s.netPaid} className="text-xs" />
              </td>
              <td className="py-2.5 text-end">
                <button
                  type="button"
                  onClick={() => handleGenerateCertificate(s.supplierId)}
                  className="text-[10px] text-[#2563EB] hover:underline underline-offset-2"
                >
                  {t('ap.cert', 'Certificate')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-black/10 dark:border-white/10 font-semibold text-black dark:text-white">
            <td className="py-2.5 pe-4">{t('ap.total', 'Total')}</td>
            <td className="py-2.5 pe-4 text-end">
              <CurrencyCell amount={suppliers.reduce((s, r) => s + r.grossAmount, 0)} className="text-xs" />
            </td>
            <td className="py-2.5 pe-4" />
            <td className="py-2.5 pe-4 text-end">
              <CurrencyCell amount={totalWithheld} className="text-xs" />
            </td>
            <td className="py-2.5 pe-4 text-end">
              <CurrencyCell amount={suppliers.reduce((s, r) => s + r.netPaid, 0)} className="text-xs" />
            </td>
            <td className="py-2.5" />
          </tr>
        </tfoot>
      </table>

      {/* Quarterly Form 41 — inline, not a card */}
      <div className="flex items-center gap-3 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
        <span className="text-xs font-medium text-black/60 dark:text-white/60">
          {t('ap.form41', 'Form 41')}
        </span>
        <select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(Number(e.target.value))}
          className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-xs text-black dark:text-white outline-none focus:border-[#2563EB]"
        >
          <option value={1}>Q1 {currentYear}</option>
          <option value={2}>Q2 {currentYear}</option>
          <option value={3}>Q3 {currentYear}</option>
          <option value={4}>Q4 {currentYear}</option>
        </select>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/30 dark:text-white/30">
          {form41Status === 'submitted'
            ? t('ap.submitted', 'Submitted')
            : form41Status === 'generating'
              ? t('ap.generating', 'Generating...')
              : t('ap.pending', 'Pending')}
        </span>
        <Button
          onPress={handleGenerateForm41}
          isDisabled={form41Status === 'generating'}
          className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90 pressed:bg-[#2563EB]/80 disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 transition-colors"
        >
          {t('ap.generateForm41', 'Generate')}
        </Button>
      </div>
    </div>
  )
}
