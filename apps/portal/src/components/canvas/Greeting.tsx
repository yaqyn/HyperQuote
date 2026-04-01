import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { AlertCircle } from 'lucide-react'
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
      animate={{ opacity: hasFaded ? 0.4 : 1, y: 0 }}
      transition={
        hasFaded
          ? { opacity: { duration: 1, ease: 'easeInOut' } }
          : { type: 'spring', stiffness: 200, damping: 20 }
      }
      className="w-full max-w-[720px] text-center px-4"
    >
      <h1 className="text-[var(--text-xl)] font-semibold text-[var(--color-text)] leading-[1.2]">
        {t(getGreetingKey(), { name })}
      </h1>

      {urgentCount > 0 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <AlertCircle size={20} className="text-[var(--color-warning)]" />
          <span className="text-[var(--text-base)] text-[var(--color-text-muted)]">
            {t('urgentItems', {
              count: formatNumber(urgentCount, locale),
            })}
          </span>
        </div>
      )}
    </motion.div>
  )
}
