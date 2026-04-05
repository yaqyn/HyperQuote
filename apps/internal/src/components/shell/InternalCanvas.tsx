import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Button } from 'react-aria-components'
import { formatNumber } from '@hyperquote/i18n'
import { LionMark } from '@hyperquote/ui/brand/LionMark'
import type { AuthSession } from '@hyperquote/auth'
import { getUrgentItems } from '../../lib/server/urgent-items'

function getGreetingKey(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'greeting.morning'
  if (hour >= 12 && hour < 17) return 'greeting.afternoon'
  if (hour >= 17 && hour < 22) return 'greeting.evening'
  return 'greeting.night'
}

interface InternalCanvasProps {
  auth: AuthSession
}

export function InternalCanvas({ auth }: InternalCanvasProps) {
  const { t, i18n } = useTranslation('internal')
  const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'
  const name = auth.user.user_metadata?.name ?? ''
  const roles: string[] = auth.roles ?? []

  const { data: urgentData } = useQuery({
    queryKey: ['urgent-items'],
    queryFn: () => getUrgentItems(),
    staleTime: 60_000,
  })

  const urgentCount = urgentData?.total ?? 0

  return (
    <div className="flex flex-col items-center justify-center h-full relative">
      {/* Lion watermark */}
      <LionMark className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] pointer-events-none" />

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-[720px] text-center px-4 lg:px-8 relative z-10"
      >
        <h1 className="text-lg lg:text-xl font-normal text-[var(--color-text)] leading-relaxed">
          {t(getGreetingKey(), { name })}
        </h1>

        {urgentCount > 0 && (
          <p className="text-sm text-[var(--color-text-muted)] mt-1.5">
            <span className="font-[family-name:var(--font-geist-mono)]">
              {formatNumber(urgentCount, locale)}
            </span>{' '}
            {t('urgentItemsLabel')}
          </p>
        )}

        {/* Role-based quick actions */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {roles.includes('sales') && (
            <Button className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer">
              {t('quickActions.viewRfqInbox')}
            </Button>
          )}
          {roles.includes('warehouse') && (
            <Button className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer">
              {t('quickActions.receivingQueue')}
            </Button>
          )}
          {roles.includes('finance') && (
            <Button className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer">
              {t('quickActions.overdueInvoices')}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
