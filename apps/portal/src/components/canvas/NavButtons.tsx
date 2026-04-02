import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { usePortalStore } from '../../stores/portal'

interface NavButtonsProps {
  locale: 'ar' | 'en'
}

interface NavItem {
  to: string
  labelKey: string
  shortcut: string
}

export function NavButtons({ locale }: NavButtonsProps) {
  const { t } = useTranslation('portal')
  const activeRole = usePortalStore((s) => s.activeRole)

  const customerItems: NavItem[] = [
    { to: '/orders', labelKey: 'nav.orders', shortcut: 'O' },
    { to: '/market', labelKey: 'nav.market', shortcut: 'M' },
  ]

  const supplierItems: NavItem[] = [
    { to: '/supplier/stock', labelKey: 'nav.stock', shortcut: 'S' },
    { to: '/supplier/orders', labelKey: 'nav.purchaseOrders', shortcut: 'P' },
    { to: '/supplier/analytics', labelKey: 'nav.analytics', shortcut: 'A' },
  ]

  const items = activeRole === 'supplier' ? supplierItems : customerItems

  return (
    <div className="flex items-center gap-8 mt-8">
      {items.map((item, index) => (
        <motion.div
          key={item.to}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            delay: index * 0.08,
          }}
        >
          <Link
            to={item.to}
            className="text-base font-normal text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150"
          >
            {t(item.labelKey)}
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
