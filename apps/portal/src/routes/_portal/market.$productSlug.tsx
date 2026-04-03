import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button, NumberField, Input, Label, Group } from 'react-aria-components'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { WindowShell } from '../../components/windows/WindowShell'
import { FloatingAIButton } from '../../components/windows/FloatingAIButton'
import { addToActiveDraft } from '../../lib/server/market'
import { useToastStore } from '../../stores/toast-store'

export const Route = createFileRoute('/_portal/market/$productSlug')({
  component: MarketProductDetail,
})

// Mock product detail lookup -- in production fetched from server
const MOCK_DETAIL: Record<string, {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  category: string
  unitOfMeasure: string
  priceRangeMin: number
  priceRangeMax: number
  availabilityStatus: string
  imageUrl: string
  specs: { label: string; labelAr: string; value: string }[]
  related: { slug: string; name: string; nameAr: string; imageUrl: string }[]
}> = {
  'portland-cement-opc-42-5n': {
    id: 'prod-cement-opc',
    name: 'Portland Cement OPC 42.5N',
    nameAr: '\u0627\u0633\u0645\u0646\u062a \u0628\u0648\u0631\u062a\u0644\u0627\u0646\u062f\u064a \u0639\u0627\u062f\u064a',
    description: 'General purpose Portland cement suitable for most construction applications. Meets EN 197-1 standard.',
    descriptionAr: '\u0627\u0633\u0645\u0646\u062a \u0628\u0648\u0631\u062a\u0644\u0627\u0646\u062f\u064a \u0639\u0627\u062f\u064a \u0645\u0646\u0627\u0633\u0628 \u0644\u0645\u0639\u0638\u0645 \u062a\u0637\u0628\u064a\u0642\u0627\u062a \u0627\u0644\u0628\u0646\u0627\u0621. \u064a\u0644\u0628\u064a \u0645\u0639\u064a\u0627\u0631 EN 197-1.',
    category: 'cement',
    unitOfMeasure: 'ton',
    priceRangeMin: 1800,
    priceRangeMax: 2200,
    availabilityStatus: 'available',
    imageUrl: 'https://cdn.hyperquote.io/placeholders/cairo-skyline.jpg',
    specs: [
      { label: 'Grade', labelAr: '\u0627\u0644\u062f\u0631\u062c\u0629', value: '42.5N' },
      { label: 'Bag Size', labelAr: '\u062d\u062c\u0645 \u0627\u0644\u0634\u064a\u0643\u0627\u0631\u0629', value: '50kg' },
      { label: 'Standard', labelAr: '\u0627\u0644\u0645\u0639\u064a\u0627\u0631', value: 'EN 197-1' },
    ],
    related: [
      { slug: 'sulphate-resistant-cement', name: 'Sulphate Resistant Cement', nameAr: '\u0627\u0633\u0645\u0646\u062a \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0643\u0628\u0631\u064a\u062a\u0627\u062a', imageUrl: 'https://cdn.hyperquote.io/placeholders/cairo-skyline.jpg' },
      { slug: 'ready-mix-concrete-c30', name: 'Ready Mix Concrete C30', nameAr: '\u062e\u0631\u0633\u0627\u0646\u0629 \u062c\u0627\u0647\u0632\u0629 C30', imageUrl: 'https://cdn.hyperquote.io/placeholders/cairo-skyline.jpg' },
    ],
  },
}

function MarketProductDetail() {
  const { t, i18n } = useTranslation('portal')
  const navigate = useNavigate()
  const { productSlug } = Route.useParams()
  const isAr = i18n.language === 'ar'
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const toast = useToastStore.getState()

  // Mock lookup -- in production this would be a server query
  const product = MOCK_DETAIL[productSlug] ?? {
    id: `prod-${productSlug}`,
    name: productSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    nameAr: productSlug,
    description: 'Product details will be available soon.',
    descriptionAr: '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0646\u062a\u062c \u0633\u062a\u0643\u0648\u0646 \u0645\u062a\u0627\u062d\u0629 \u0642\u0631\u064a\u0628\u0627.',
    category: 'general',
    unitOfMeasure: 'piece',
    priceRangeMin: 100,
    priceRangeMax: 200,
    availabilityStatus: 'available',
    imageUrl: 'https://cdn.hyperquote.io/placeholders/cairo-skyline.jpg',
    specs: [],
    related: [],
  }

  const formatPrice = (min: number, max: number) => {
    const fmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
      maximumFractionDigits: 0,
    })
    return `EGP ${fmt.format(min)} - ${fmt.format(max)}`
  }

  const handleAddToQuote = async () => {
    setIsAdding(true)
    try {
      await addToActiveDraft({
        data: {
          productId: product.id,
          quantity,
          uom: product.unitOfMeasure,
        },
      })
      const productName = isAr ? product.nameAr : product.name
      toast.success(
        t('market.addedToast', '{{product}} added to your quote.', {
          product: productName,
        }),
      )
    } catch {
      toast.error(t('error.generic'))
    } finally {
      setIsAdding(false)
    }
  }

  const BackIcon = isAr ? ArrowRight : ArrowLeft

  return (
    <>
      <WindowShell title={isAr ? product.nameAr : product.name} maxWidth="960px">
        <div className="flex flex-col overflow-y-auto">
          {/* Back button */}
          <div className="px-6 py-3 lg:py-4 border-b border-[var(--color-border)]">
            <Button
              onPress={() => navigate({ to: '/market' })}
              className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              <BackIcon size={16} />
              {t('market.backToMarket', 'Back to Market')}
            </Button>
          </div>

          {/* Product content */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 p-6 lg:py-10">
            {/* Image */}
            <div className="lg:w-1/2 aspect-[4/3] rounded-2xl overflow-hidden bg-[var(--color-surface)]">
              <img
                src={product.imageUrl}
                alt={isAr ? product.nameAr : product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="lg:w-1/2 flex flex-col gap-4 lg:gap-5">
              <h1 className="text-xl font-semibold text-[var(--color-text)]">
                {isAr ? product.nameAr : product.name}
              </h1>

              {/* Price range */}
              <p className="font-mono text-lg text-[var(--color-text)]">
                {formatPrice(product.priceRangeMin, product.priceRangeMax)}
                <span className="text-sm text-[var(--color-text-muted)] font-sans">
                  /{product.unitOfMeasure}
                </span>
              </p>

              {/* Availability */}
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'w-2 h-2 rounded-full',
                    product.availabilityStatus === 'available'
                      ? 'bg-[var(--color-success)]'
                      : product.availabilityStatus === 'limited'
                        ? 'bg-[var(--color-warning)]'
                        : 'bg-[var(--color-error)]',
                  ].join(' ')}
                />
                <span className="text-sm text-[var(--color-text-muted)]">
                  {product.availabilityStatus === 'available'
                    ? t('market.available', 'Available')
                    : product.availabilityStatus === 'limited'
                      ? t('market.limited', 'Limited')
                      : t('market.outOfStock', 'Out of Stock')}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                {isAr ? product.descriptionAr : product.description}
              </p>

              {/* Specs */}
              {product.specs.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                    {t('market.specifications', 'Specifications')}
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
                    {product.specs.map((spec) => (
                      <div key={spec.label} className="flex flex-col">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {isAr ? spec.labelAr : spec.label}
                        </span>
                        <span className="text-sm font-medium text-[var(--color-text)]">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity + Add to Quote */}
              <div className="flex items-end gap-3 mt-4">
                <NumberField
                  value={quantity}
                  onChange={(val) => setQuantity(val)}
                  minValue={1}
                  step={1}
                >
                  <Label className="text-xs text-[var(--color-text-muted)]">
                    {t('market.quantity', 'Quantity')}
                  </Label>
                  <Group className="flex items-center gap-2 mt-1">
                    <Button
                      slot="decrement"
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-border)] transition-colors"
                    >
                      -
                    </Button>
                    <Input
                      className="w-20 h-9 text-center font-mono text-sm rounded-lg border border-[var(--color-border)] bg-transparent text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                    />
                    <Button
                      slot="increment"
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-border)] transition-colors"
                    >
                      +
                    </Button>
                  </Group>
                </NumberField>

                <Button
                  onPress={handleAddToQuote}
                  isDisabled={isAdding}
                  className="h-9 px-6 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
                >
                  {isAdding
                    ? t('market.adding', 'Adding...')
                    : t('market.addToQuote')}
                </Button>
              </div>
            </div>
          </div>

          {/* Related products */}
          {product.related.length > 0 && (
            <div className="px-6 pb-6 lg:pb-10">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
                {t('market.relatedProducts', 'Related Products')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {product.related.map((rel) => (
                  <Button
                    key={rel.slug}
                    onPress={() =>
                      navigate({
                        to: '/market/$productSlug',
                        params: { productSlug: rel.slug },
                      })
                    }
                    className="flex flex-col rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/30 transition-colors cursor-pointer text-start"
                  >
                    <div className="aspect-[4/3] bg-[var(--color-surface)]">
                      <img
                        src={rel.imageUrl}
                        alt={isAr ? rel.nameAr : rel.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-[var(--color-text)] line-clamp-2">
                        {isAr ? rel.nameAr : rel.name}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </WindowShell>
      <FloatingAIButton />
    </>
  )
}
