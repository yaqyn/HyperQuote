import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { Button } from 'react-aria-components'
import type { MarketProduct } from '../../lib/server/market'

interface MarketProductGridProps {
  products: MarketProduct[]
  quickAddMode: boolean
  onQuickAdd: (product: MarketProduct, triggerRef: HTMLElement) => void
}

export function MarketProductGrid({
  products,
  quickAddMode,
  onQuickAdd,
}: MarketProductGridProps) {
  const { t, i18n } = useTranslation('portal')
  const navigate = useNavigate()
  const isAr = i18n.language === 'ar'

  const formatPrice = (min: number | null, max: number | null) => {
    if (min == null && max == null) return '--'
    const fmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
      maximumFractionDigits: 0,
    })
    if (min != null && max != null) {
      return `EGP ${fmt.format(min)}-${fmt.format(max)}`
    }
    if (min != null) return `EGP ${fmt.format(min)}+`
    return `EGP ${fmt.format(max!)}`
  }

  const handlePress = (product: MarketProduct, e: React.MouseEvent<HTMLDivElement>) => {
    if (quickAddMode) {
      onQuickAdd(product, e.currentTarget)
    } else {
      navigate({ to: '/market/$productSlug', params: { productSlug: product.slug } })
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={(e) => handlePress(product, e)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handlePress(product, e as unknown as React.MouseEvent<HTMLDivElement>)
            }
          }}
          className={[
            'group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer',
            'bg-[var(--color-card)] border border-[var(--color-border)]',
            'hover:border-[var(--color-primary)]/30 hover:-translate-y-px',
            'transition-all duration-150 ease-out',
          ].join(' ')}
        >
          {/* Product image */}
          <div className="aspect-[4/3] overflow-hidden bg-[var(--color-surface)]">
            <img
              src={product.imageUrl}
              alt={isAr ? product.nameAr : product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Card content */}
          <div className="flex flex-col gap-2 p-4">
            {/* Product name */}
            <h3 className="text-sm font-semibold text-[var(--color-text)] line-clamp-2">
              {isAr ? product.nameAr : product.name}
            </h3>

            {/* Price range -- Geist Mono for numbers */}
            <p className="font-mono text-sm text-[var(--color-text)]">
              {formatPrice(product.priceRangeMin, product.priceRangeMax)}
              <span className="text-xs text-[var(--color-text-muted)] font-sans">
                /{isAr ? product.unitOfMeasure : product.unitOfMeasure}
              </span>
            </p>

            {/* Availability indicator */}
            <div className="flex items-center gap-1.5">
              <span
                className={[
                  'w-2 h-2 rounded-full shrink-0',
                  product.availabilityStatus === 'available'
                    ? 'bg-[var(--color-success)]'
                    : product.availabilityStatus === 'limited'
                      ? 'bg-[var(--color-warning)]'
                      : 'bg-[var(--color-error)]',
                ].join(' ')}
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                {product.availabilityStatus === 'available'
                  ? t('market.available', 'Available')
                  : product.availabilityStatus === 'limited'
                    ? t('market.limited', 'Limited')
                    : t('market.outOfStock', 'Out of Stock')}
              </span>
            </div>
          </div>

          {/* Quick add indicator when in quick-add mode */}
          {quickAddMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/5 transition-colors">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-[var(--color-primary)] bg-white/90 px-3 py-1.5 rounded-full shadow-sm">
                {t('market.quickAdd')}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
