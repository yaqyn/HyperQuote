import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PackageX, ChevronRight } from 'lucide-react'
import {
  Breadcrumbs,
  Breadcrumb,
  type BreadcrumbProps,
} from 'react-aria-components'
import { getProductBySlug, getPublicCatalog } from '../../../lib/catalog'
import { formatPriceRange } from '../../../lib/price-range'
import { ImageGallery } from '../../../components/product/ImageGallery'
import { SpecsTable } from '../../../components/product/SpecsTable'
import { QuoteCard } from '../../../components/product/QuoteCard'
import { MobileBottomBar } from '../../../components/product/MobileBottomBar'
import { RelatedProducts } from '../../../components/product/RelatedProducts'

export const Route = createFileRoute('/_website/market/$productSlug')({
  loader: async ({ params }) => {
    const product = await getProductBySlug({ data: { slug: params.productSlug } })

    // Fetch related products in same category (parallel if product exists)
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

// --------------------------------------------------------------------------
// Availability dot color
// --------------------------------------------------------------------------

function availabilityColor(status: string): string {
  switch (status) {
    case 'available':
    case 'in_stock':
      return 'bg-[var(--color-success)]'
    case 'low_stock':
      return 'bg-[var(--color-warning)]'
    default:
      return 'bg-[var(--color-text-muted)]'
  }
}

function availabilityLabel(status: string, t: (key: string, fallback?: string) => string): string {
  switch (status) {
    case 'available':
    case 'in_stock':
      return t('market.available', 'Available')
    case 'low_stock':
      return t('market.lowStock', 'Low Stock')
    default:
      return t('market.outOfStock', 'Out of Stock')
  }
}

// --------------------------------------------------------------------------
// Breadcrumb item component
// --------------------------------------------------------------------------

function BreadcrumbItem(props: BreadcrumbProps & { children: React.ReactNode }) {
  return <Breadcrumb {...props}>{props.children}</Breadcrumb>
}

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

function ProductDetailPage() {
  const { product, relatedProducts } = Route.useLoaderData()
  const { t, i18n } = useTranslation('website')
  const locale = (i18n.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en'

  // 404 state
  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <PackageX
          size={48}
          className="mb-4 text-[var(--color-text-muted)]"
        />
        <h1 className="mb-2 text-2xl font-bold">
          {t('product.notFoundTitle', 'Product not found')}
        </h1>
        <p className="mb-6 text-[var(--color-text-muted)]">
          {t(
            'product.notFoundBody',
            'This product may have been removed or the link is incorrect.',
          )}
        </p>
        <Link
          to="/market"
          className="rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-white"
        >
          {t('product.notFoundCTA', 'Browse Market')}
        </Link>
      </div>
    )
  }

  const productName = locale === 'ar' && product.name_ar ? product.name_ar : product.name
  const priceRange = formatPriceRange(
    product.price_range_min,
    product.price_range_max,
    product.unit_of_measure,
    locale,
    t,
  )

  const categoryLabel = t(
    `categories.${product.category}`,
    product.category.replace(/_/g, ' '),
  )

  return (
    <div className="px-6 pb-20 pt-12 lg:px-12 lg:pb-12">
      {/* Breadcrumbs */}
      <Breadcrumbs className="mb-6 flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
        <BreadcrumbItem id="market">
          <Link to="/market" className="hover:text-[var(--color-text)]">
            {t('product.breadcrumbMarket', 'Market')}
          </Link>
        </BreadcrumbItem>
        <ChevronRight size={14} className="rtl:rotate-180" />
        <BreadcrumbItem id="category">
          <Link
            to="/market"
            search={{ category: [product.category] }}
            className="hover:text-[var(--color-text)]"
          >
            {categoryLabel}
          </Link>
        </BreadcrumbItem>
        <ChevronRight size={14} className="rtl:rotate-180" />
        <BreadcrumbItem id="product">
          <span className="text-[var(--color-text)]">{productName}</span>
        </BreadcrumbItem>
      </Breadcrumbs>

      {/* 2-column layout */}
      <div className="grid gap-8 lg:grid-cols-[55%_45%]">
        {/* Column 1: Images */}
        <div>
          <ImageGallery
            imageUrls={product.image_urls}
            productName={productName}
          />
        </div>

        {/* Column 2: Info + Quote Card */}
        <div>
          {/* Product name */}
          <h1 className="text-2xl font-bold">{productName}</h1>

          {/* Category badge */}
          <Link
            to="/market"
            search={{ category: [product.category] }}
            className="mt-2 inline-block text-xs font-medium text-[var(--color-primary)]"
          >
            {categoryLabel}
          </Link>

          {/* SKU */}
          <p className="mt-2 font-mono text-xs text-[var(--color-text-muted)]">
            SKU: {product.sku}
          </p>

          {/* Price range */}
          <p className="mt-3 font-mono text-xl">{priceRange}</p>

          {/* Availability indicator */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${availabilityColor(product.availability_status)}`}
            />
            <span className="text-sm">
              {availabilityLabel(product.availability_status, t)}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {product.description}
            </p>
          )}

          {/* Quote Card (desktop only — mobile uses bottom bar) */}
          <div className="mt-6 hidden lg:block">
            <QuoteCard
              productName={productName}
              unitOfMeasure={product.unit_of_measure}
            />
          </div>
        </div>
      </div>

      {/* Full-width sections below the 2-column layout */}

      {/* Specs Table */}
      <SpecsTable
        specifications={
          (product.specifications as Record<string, unknown>) ?? {}
        }
        weightKg={product.weight_kg}
        unitOfMeasure={product.unit_of_measure}
        brand={product.brand}
        manufacturer={product.manufacturer}
      />

      {/* Documents section placeholder */}
      <section className="mt-12">
        <h2 className="text-base font-semibold">
          {t('product.documentsHeading', 'Documents')}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t('product.noDocuments', 'No documents available for this product.')}
        </p>
      </section>

      {/* Related Products */}
      <RelatedProducts products={relatedProducts as any} />

      {/* Mobile Bottom Bar (hidden on desktop) */}
      <MobileBottomBar unitOfMeasure={product.unit_of_measure} />
    </div>
  )
}
