import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { formatNumber } from '@hyperquote/i18n'

function getGreetingKey(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'greeting.morning'
  if (hour >= 12 && hour < 17) return 'greeting.afternoon'
  if (hour >= 17 && hour < 22) return 'greeting.evening'
  return 'greeting.night'
}

interface GreetingProps {
  name: string
  urgentCount?: number
  locale?: 'ar' | 'en'
}

export function Greeting({ name, urgentCount = 0, locale = 'en' }: GreetingProps) {
  const { t } = useTranslation('portal')
  const [hasFaded, setHasFaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHasFaded(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: hasFaded ? 0.35 : 1, y: 0 }}
      transition={
        hasFaded
          ? { opacity: { duration: 1.2, ease: 'easeInOut' } }
          : { type: 'spring', stiffness: 200, damping: 20 }
      }
      className="w-full max-w-[720px] text-center px-4 lg:px-8"
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
    </motion.div>
  )
}
