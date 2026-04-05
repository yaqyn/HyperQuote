import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'

interface CreditStatusBannerProps {
  creditLimit: number
  currentExposure: number
  availableCredit: number
}

function getBannerStyle(availableCredit: number, creditLimit: number): string {
  if (availableCredit <= 0) {
    return 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200'
  }
  if (creditLimit > 0 && availableCredit / creditLimit < 0.3) {
    return 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-200'
  }
  return 'bg-black/3 border-black/10 text-black/70 dark:bg-white/5 dark:border-white/10 dark:text-white/70'
}

export function CreditStatusBanner({
  creditLimit,
  currentExposure,
  availableCredit,
}: CreditStatusBannerProps) {
  const { t, i18n } = useTranslation('internal')
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  })

  const bannerStyle = getBannerStyle(availableCredit, creditLimit)

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${bannerStyle}`}
    >
      <p className="text-sm">
        Customer credit:{' '}
        <span className="font-[family-name:var(--font-geist-mono)] font-medium">
          {fmt.format(availableCredit)}
        </span>{' '}
        available of{' '}
        <span className="font-[family-name:var(--font-geist-mono)] font-medium">
          {fmt.format(creditLimit)}
        </span>{' '}
        limit
      </p>
      <Button
        className="shrink-0 rounded-md border border-current/20 px-3 py-1.5 text-xs font-medium outline-none transition-colors
          data-[hovered]:bg-black/5 dark:data-[hovered]:bg-white/10
          data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50"
        onPress={() => {
          // Placeholder: will be wired to credit limit increase request flow
          console.log('Request credit limit increase', { creditLimit, currentExposure, availableCredit })
        }}
      >
        Request Credit Limit Increase
      </Button>
    </div>
  )
}
