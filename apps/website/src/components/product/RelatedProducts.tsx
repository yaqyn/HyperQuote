import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { formatPriceRange } from '../../lib/price-range'

interface RelatedProduct {
  id: string
  slug: string
  name: string
  name_ar: string | null
  image_urls: string[] | null
  price_range_min: number | null
  price_range_max: number | null
  unit_of_measure: string
  availability_status: string
}

interface RelatedProductsProps {
  products: RelatedProduct[]
}

const FALLBACK_IMAGE =
  'https://websiteassets.hyperquote.net/Images/cairo.webp'

export function RelatedProducts({ products }: RelatedProductsProps) {
  const { t, i18n } = useTranslation('website')
  const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'

  if (products.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-base font-semibold">
        {t('product.relatedHeading', 'Related Products')}
      </h2>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4">
        {products.map((product) => {
          const name =
            locale === 'ar' && product.name_ar ? product.name_ar : product.name
          const image = product.image_urls?.[0] ?? FALLBACK_IMAGE
          const priceRange = formatPriceRange(
            product.price_range_min,
            product.price_range_max,
            product.unit_of_measure,
            locale,
            t,
          )

          return (
            <Link
              key={product.id}
              to="/market/$productSlug"
              params={{ productSlug: product.slug }}
              className="w-50 shrink-0 snap-start rounded-xl bg-[var(--color-card)] overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[var(--color-surface)]">
                <img
                  src={image}
                  alt={name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium line-clamp-2">{name}</p>
                <p className="mt-1 font-mono text-xs text-[var(--color-primary)]">
                  {priceRange}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
