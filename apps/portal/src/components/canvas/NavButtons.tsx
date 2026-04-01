import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import {
  ShoppingBag,
  Store,
  Package,
  ClipboardList,
} from 'lucide-react'
import { usePortalStore } from '../../stores/portal'
import { formatNumber } from '@hyperquote/i18n'

interface NavButtonsProps {
  locale: 'ar' | 'en'
}

interface NavItem {
  to: string
  icon: React.ComponentType<{ size: number; className?: string }>
  labelKey: string
  badgeCount?: number
}

export function NavButtons({ locale }: NavButtonsProps) {
  const { t } = useTranslation('portal')
  const activeRole = usePortalStore((s) => s.activeRole)

  const customerItems: NavItem[] = [
    {
      to: '/orders',
      icon: ShoppingBag,
      labelKey: 'nav.orders',
      badgeCount: 0,
    },
    {
      to: '/market',
      icon: Store,
      labelKey: 'nav.market',
    },
  ]

  const supplierItems: NavItem[] = [
    {
      to: '/supplier/stock',
      icon: Package,
      labelKey: 'nav.stock',
    },
    {
      to: '/supplier/orders',
      icon: ClipboardList,
      labelKey: 'nav.purchaseOrders',
    },
  ]

  const items = activeRole === 'supplier' ? supplierItems : customerItems

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[640px] px-4 mt-6">
      {items.map((item, index) => (
        <motion.div
          key={item.to}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            delay: index * 0.1,
          }}
          className="flex-1"
        >
          <Link
            to={item.to}
            className="flex items-center gap-3 h-16 px-5 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <item.icon
              size={24}
              className="text-[var(--color-primary)] shrink-0"
            />
            <span className="font-semibold text-[var(--text-lg)] text-[var(--color-text)]">
              {t(item.labelKey)}
            </span>
            {item.badgeCount != null && item.badgeCount > 0 && (
              <span className="font-mono text-[var(--text-sm)] font-semibold bg-[var(--color-primary)] text-white rounded-full px-2 py-0.5 ms-auto">
                {formatNumber(item.badgeCount, locale)}
              </span>
            )}
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
