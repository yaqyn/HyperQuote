import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PackageX, ArrowLeft, ChevronRight, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'motion/react'
import {
  NumberField,
  Label,
  Group,
  Input,
  Button,
} from 'react-aria-components'
import { getProductBySlug, getPublicCatalog } from '../../../lib/catalog'
import { formatPriceRange } from '../../../lib/price-range'
import { SectionReveal } from '../../../components/shared/SectionReveal'

export const Route = createFileRoute('/_website/market/$productSlug')({
  loader: async ({ params }) => {
    const product = await getProductBySlug({ data: { slug: params.productSlug } })

    let relatedProducts: Record<string, unknown>[] = []
    if (product) {
      const related = await getPublicCatalog({
        data: { category: [product.category], limit: 6, page: 1, sort: 'relevance' },
      })
      relatedProducts = related.items.filter(
        (item: Record<string, unknown>) => item.id !== product.id,
      )
    }

    return { product, relatedProducts }
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product
    if (!product) {
      return {
        meta: [
          { title: 'Product Not Found — HyperQuote' },
          { name: 'description', content: 'This product could not be found.' },
        ],
      }
    }
    return {
      meta: [
        { title: `${product.name} — HyperQuote` },
        {
          name: 'description',
          content: product.description ?? `${product.name} — Available on HyperQuote`,
        },
      ],
    }
  },
  component: ProductDetailPage,
})

const spring = { type: 'spring' as const, stiffness: 200, damping: 20 }

const FALLBACK_IMAGE = 'https://websiteassets.hyperquote.net/Images/cairo.webp'

// --------------------------------------------------------------------------

function ProductDetailPage() {
  const { product, relatedProducts } = Route.useLoaderData()
  const { t, i18n } = useTranslation('website')
  const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center pt-24">
        <PackageX size={48} className="mb-4 text-[var(--color-text-muted)]" />
        <h1 className="mb-2 text-2xl font-bold">{t('product.notFoundTitle')}</h1>
        <p className="mb-6 text-[var(--color-text-muted)]">{t('product.notFoundBody')}</p>
        <Link
          to="/market"
          className="rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white"
        >
          {t('product.notFoundCTA')}
        </Link>
      </div>
    )
  }

  const productName = locale === 'ar' && product.name_ar ? product.name_ar : product.name
  const images = product.image_urls?.length ? product.image_urls : [FALLBACK_IMAGE]
  const priceRange = formatPriceRange(
    product.price_range_min,
    product.price_range_max,
    product.unit_of_measure,
    locale,
    t,
  )
  const categoryLabel = t(`categories.${product.category}`, product.category.replace(/_/g, ' '))
  const availStatus = product.availability_status ?? 'out_of_stock'
  const availDot =
    availStatus === 'available' || availStatus === 'in_stock'
      ? 'bg-[var(--color-success)]'
      : availStatus === 'low_stock'
        ? 'bg-[var(--color-warning)]'
        : 'bg-[var(--color-text-muted)]'
  const availLabel =
    availStatus === 'available' || availStatus === 'in_stock'
      ? t('market.available')
      : availStatus === 'low_stock'
        ? t('market.lowStock')
        : t('market.outOfStock')

  return (
    <>
      <div className="pt-20 pb-28 lg:pb-16">
        {/* Back + Breadcrumb bar */}
        <div className="px-6 lg:px-12 max-w-7xl mx-auto mb-8">
          <Link
            to="/market"
            className="inline-flex items-center gap-2 text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ArrowLeft size={16} className="icon-end" />
            {t('product.breadcrumbMarket')}
            <ChevronRight size={12} className="text-[var(--color-border)] rtl:rotate-180" />
            <span className="text-[var(--color-text-muted)]">{categoryLabel}</span>
          </Link>
        </div>

        {/* Hero: Image + Info */}
        <div className="px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16">
            {/* Image */}
            <ProductImage images={images} name={productName} />

            {/* Info column */}
            <div className="flex flex-col">
              {/* Category */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring}
              >
                <Link
                  to="/market"
                  search={{ category: product.category }}
                  className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]"
                >
                  {categoryLabel}
                </Link>
              </motion.div>

              {/* Name */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.04 }}
                className="mt-3 text-[32px] lg:text-[40px] font-bold leading-tight text-[var(--color-text)] tracking-tight"
              >
                {productName}
              </motion.h1>

              {/* SKU + Availability */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.08 }}
                className="mt-4 flex items-center gap-4"
              >
                <span className="font-mono text-[13px] text-[var(--color-text-subtle)]">
                  {product.sku}
                </span>
                <span className="w-px h-4 bg-[var(--color-border)]" />
                <span className="flex items-center gap-2 text-[14px] text-[var(--color-text-muted)]">
                  <span className={`w-2 h-2 rounded-full ${availDot}`} />
                  {availLabel}
                </span>
              </motion.div>

              {/* Price */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.12 }}
                className="mt-6"
              >
                <p className="font-mono text-[24px] font-bold text-[var(--color-primary)]">
                  {priceRange}
                </p>
              </motion.div>

              {/* Description */}
              {product.description && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.16 }}
                  className="mt-6 text-[16px] leading-[1.7] text-[var(--color-text-muted)] max-w-[500px]"
                >
                  {locale === 'ar' && product.description_ar
                    ? product.description_ar
                    : product.description}
                </motion.p>
              )}

              {/* Divider */}
              <div className="my-8 h-px bg-[var(--color-border)]" />

              {/* Quote action — desktop */}
              <QuoteAction unitOfMeasure={product.unit_of_measure} productName={productName} />
            </div>
          </div>
        </div>

        {/* Specs */}
        <SpecsSection
          specifications={(product.specifications as Record<string, unknown>) ?? {}}
          weightKg={product.weight_kg}
          unitOfMeasure={product.unit_of_measure}
          brand={product.brand}
          manufacturer={product.manufacturer}
        />

        {/* Related */}
        <RelatedSection products={relatedProducts as RelatedProduct[]} />
      </div>

      {/* Mobile bottom bar */}
      <MobileBar unitOfMeasure={product.unit_of_measure} />
    </>
  )
}

// --------------------------------------------------------------------------
// Product Image — hover zoom, thumbnail strip
// --------------------------------------------------------------------------

function ProductImage({ images, name }: { images: string[]; name: string }) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Main image */}
      <div className="group aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <img
          src={images[activeIndex]}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="eager"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors ${
                i === activeIndex
                  ? 'border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              <img src={url} alt={`${name} ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// --------------------------------------------------------------------------
// Quote Action — quantity + CTA
// --------------------------------------------------------------------------

function QuoteAction({ unitOfMeasure, productName }: { unitOfMeasure: string; productName: string }) {
  const { t } = useTranslation('website')
  const [quantity, setQuantity] = useState(1)

  const whatsappMessage = encodeURIComponent(
    `Hi, I'm interested in ${productName}. Can I get a quote?`,
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
      className="hidden lg:block"
    >
      <NumberField
        value={quantity}
        onChange={(v) => setQuantity(v)}
        minValue={1}
        step={1}
        className="mb-5"
      >
        <Label className="mb-2 block text-[14px] font-medium text-[var(--color-text)]">
          {t('product.quantityLabel')}
          <span className="ms-2 text-[13px] font-normal text-[var(--color-text-muted)]">
            ({t(`units.${unitOfMeasure}`, unitOfMeasure)})
          </span>
        </Label>
        <Group className="flex items-center gap-2">
          <Button
            slot="decrement"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] text-lg hover:bg-[var(--color-surface)] transition-colors"
          >
            -
          </Button>
          <Input className="h-11 w-[100px] rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-center font-mono text-[16px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          <Button
            slot="increment"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-border)] text-lg hover:bg-[var(--color-surface)] transition-colors"
          >
            +
          </Button>
        </Group>
      </NumberField>

      <button
        type="button"
        onClick={() => console.log('Add to Quote — Login Modal (Phase 6)')}
        className="h-13 w-full rounded-xl bg-[var(--color-primary)] font-semibold text-[16px] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
      >
        {t('market.addToQuote')}
      </button>

      <a
        href={`https://wa.me/201234567890?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <MessageCircle size={16} />
        {t('product.whatsappFallback')}
      </a>
    </motion.div>
  )
}

// --------------------------------------------------------------------------
// Specs Section — clean grid layout
// --------------------------------------------------------------------------

function SpecsSection({
  specifications,
  weightKg,
  unitOfMeasure,
  brand,
  manufacturer,
}: {
  specifications: Record<string, unknown>
  weightKg: number | null
  unitOfMeasure: string
  brand: string | null
  manufacturer: string | null
}) {
  const { t } = useTranslation('website')

  const rows: { label: string; value: string; mono: boolean }[] = []

  if (brand) rows.push({ label: t('product.specBrand'), value: brand, mono: false })
  if (manufacturer) rows.push({ label: t('product.specManufacturer'), value: manufacturer, mono: false })

  for (const [key, value] of Object.entries(specifications)) {
    if (value == null || value === '') continue
    rows.push({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: String(value),
      mono: typeof value === 'number' || /^[\d.,]+/.test(String(value)),
    })
  }

  if (weightKg != null) rows.push({ label: t('product.specWeight'), value: `${weightKg} kg`, mono: true })
  if (unitOfMeasure) rows.push({ label: t('product.specUOM'), value: t(`units.${unitOfMeasure}`, unitOfMeasure), mono: false })

  if (rows.length === 0) return null

  return (
    <div className="mt-20 px-6 lg:px-12 max-w-7xl mx-auto">
      <SectionReveal>
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
          {t('product.specsLabel')}
        </p>
        <h2 className="text-[28px] lg:text-[32px] font-bold text-[var(--color-text)] mb-10">
          {t('product.specsHeading')}
        </h2>
      </SectionReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {rows.map((row, i) => (
          <SectionReveal key={row.label} delay={i * 0.03}>
            <div className="flex items-center justify-between py-4 px-1 border-b border-[var(--color-border)]">
              <span className="text-[15px] text-[var(--color-text-muted)]">{row.label}</span>
              <span className={`text-[15px] font-medium text-[var(--color-text)] ${row.mono ? 'font-mono' : ''}`}>
                {row.value}
              </span>
            </div>
          </SectionReveal>
        ))}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Related Products
// --------------------------------------------------------------------------

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

function RelatedSection({ products }: { products: RelatedProduct[] }) {
  const { t, i18n } = useTranslation('website')
  const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'

  if (products.length === 0) return null

  return (
    <div className="mt-20 px-6 lg:px-12 max-w-7xl mx-auto">
      <SectionReveal>
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
          {t('product.relatedLabel')}
        </p>
        <h2 className="text-[28px] lg:text-[32px] font-bold text-[var(--color-text)] mb-10">
          {t('product.relatedHeading')}
        </h2>
      </SectionReveal>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {products.slice(0, 3).map((product, i) => {
          const name = locale === 'ar' && product.name_ar ? product.name_ar : product.name
          const image = product.image_urls?.[0] ?? FALLBACK_IMAGE
          const price = formatPriceRange(product.price_range_min, product.price_range_max, product.unit_of_measure, locale, t)

          return (
            <SectionReveal key={product.id} delay={i * 0.06}>
              <Link
                to="/market/$productSlug"
                params={{ productSlug: product.slug }}
                className="group block rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-200"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[var(--color-surface)]">
                  <img
                    src={image}
                    alt={name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[15px] font-semibold text-[var(--color-text)] line-clamp-2">{name}</p>
                  <p className="mt-2 font-mono text-[14px] text-[var(--color-primary)]">{price}</p>
                </div>
              </Link>
            </SectionReveal>
          )
        })}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Mobile Bottom Bar
// --------------------------------------------------------------------------

function MobileBar({ unitOfMeasure }: { unitOfMeasure: string }) {
  const { t } = useTranslation('website')
  const [quantity, setQuantity] = useState(1)

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex h-16 items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 lg:hidden">
      <NumberField
        value={quantity}
        onChange={(v) => setQuantity(v)}
        minValue={1}
        step={1}
        aria-label={t('product.quantityLabel')}
      >
        <Group className="flex items-center gap-1">
          <Button
            slot="decrement"
            className="flex h-10 w-8 items-center justify-center rounded border border-[var(--color-border)] text-sm"
          >
            -
          </Button>
          <Input className="h-10 w-[60px] rounded border border-[var(--color-border)] bg-transparent px-1 text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          <Button
            slot="increment"
            className="flex h-10 w-8 items-center justify-center rounded border border-[var(--color-border)] text-sm"
          >
            +
          </Button>
        </Group>
      </NumberField>

      <span className="text-xs text-[var(--color-text-muted)]">
        {t(`units.${unitOfMeasure}`, unitOfMeasure)}
      </span>

      <button
        type="button"
        onClick={() => console.log('Add to Quote — Phase 6')}
        className="h-10 flex-1 rounded-lg bg-[var(--color-primary)] text-sm font-semibold text-white"
      >
        {t('market.addToQuote')}
      </button>
    </div>
  )
}
