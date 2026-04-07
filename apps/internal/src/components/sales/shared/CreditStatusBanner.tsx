import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import { AnimatePresence, motion } from 'motion/react'

interface CreditStatusBannerProps {
  creditLimit: number
  currentExposure: number
  availableCredit: number
}

function getBarColor(ratio: number): string {
  if (ratio <= 0) return 'bg-red-500'
  if (ratio < 0.3) return 'bg-red-500'
  if (ratio < 0.5) return 'bg-yellow-500'
  return 'bg-green-500'
}

function isAtRisk(availableCredit: number, creditLimit: number): boolean {
  return creditLimit > 0 && availableCredit / creditLimit < 0.3
}

export function CreditStatusBanner({
  creditLimit,
  currentExposure,
  availableCredit,
}: CreditStatusBannerProps) {
  const { t, i18n } = useTranslation('internal')
  const [expanded, setExpanded] = useState(false)
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  })

  const ratio = creditLimit > 0 ? availableCredit / creditLimit : 1
  const usedRatio = creditLimit > 0 ? Math.min(1, currentExposure / creditLimit) : 0
  const barColor = getBarColor(ratio)
  const atRisk = isAtRisk(availableCredit, creditLimit)

  return (
    <div className="flex flex-col gap-2">
      {/* Compact inline indicator -- always visible */}
      <button
        type="button"
        onClick={() => atRisk && setExpanded((prev) => !prev)}
        className={[
          'flex items-center gap-3 text-start',
          atRisk ? 'cursor-pointer' : 'cursor-default',
        ].join(' ')}
      >
        {/* Thin progress bar */}
        <div className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${usedRatio * 100}%` }}
          />
        </div>

        <span className="text-[13px] text-[var(--color-text-muted)]">
          <span className="font-[family-name:var(--font-geist-mono)] font-medium tabular-nums text-[var(--color-text)]">
            {fmt.format(availableCredit)}
          </span>
          {' '}
          {t('sales.credit.available', 'available')}
        </span>
      </button>

      {/* Expanded detail -- only when at risk and user clicks */}
      <AnimatePresence>
        {expanded && atRisk && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between rounded-lg border border-black/[0.06] px-4 py-3 dark:border-white/[0.06]">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-4 text-[13px]">
                  <span className="text-[var(--color-text-subtle)]">
                    {t('sales.credit.limit', 'Limit')}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
                    {fmt.format(creditLimit)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[13px]">
                  <span className="text-[var(--color-text-subtle)]">
                    {t('sales.credit.exposure', 'Exposure')}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
                    {fmt.format(currentExposure)}
                  </span>
                </div>
              </div>
              <Button
                className="shrink-0 rounded-full border border-black/[0.06] px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)] outline-none transition-colors
                  data-[hovered]:bg-black/[0.04] dark:border-white/[0.06] dark:data-[hovered]:bg-white/[0.06]
                  data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50"
                onPress={() => {
                  // Placeholder: will be wired to credit limit increase request flow
                  console.log('Request credit limit increase', { creditLimit, currentExposure, availableCredit })
                }}
              >
                {t('sales.credit.requestIncrease', 'Request Increase')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
