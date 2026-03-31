import { useState } from 'react'
import {
  NumberField,
  Label,
  Group,
  Input,
  Button,
} from 'react-aria-components'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface QuoteCardProps {
  productName: string
  unitOfMeasure: string
}

export function QuoteCard({ productName, unitOfMeasure }: QuoteCardProps) {
  const { t } = useTranslation('website')
  const [quantity, setQuantity] = useState(1)

  const whatsappMessage = encodeURIComponent(
    `Hi, I'm interested in ${productName}. Can I get a quote?`,
  )

  return (
    <div className="sticky top-20 rounded-xl bg-[var(--color-card)] p-6 shadow-md">
      {/* Quantity input */}
      <NumberField
        value={quantity}
        onChange={(v) => setQuantity(v)}
        minValue={1}
        step={1}
        className="mb-4"
      >
        <Label className="mb-1 block text-sm font-medium">
          {t('product.quantityLabel', 'Quantity')}
        </Label>
        <Group className="flex items-center gap-2">
          <Button
            slot="decrement"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-lg"
          >
            -
          </Button>
          <Input className="h-10 w-[120px] rounded-lg border border-[var(--color-border)] bg-transparent px-3 text-center font-mono text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          <Button
            slot="increment"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] text-lg"
          >
            +
          </Button>
        </Group>
      </NumberField>

      {/* UOM display */}
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        {t(`units.${unitOfMeasure}`, unitOfMeasure)}
      </p>

      {/* Add to Quote button */}
      <button
        type="button"
        onClick={() => {
          console.log('Add to Quote clicked - Login Modal coming in Phase 6')
        }}
        className="h-12 w-full rounded-lg bg-[var(--color-primary)] font-semibold text-white transition-opacity hover:opacity-90"
      >
        {t('market.addToQuote', 'Add to Quote')}
      </button>

      {/* WhatsApp fallback */}
      <a
        href={`https://wa.me/201234567890?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <MessageCircle size={16} />
        {t('product.whatsappFallback', 'Or contact us on WhatsApp')}
      </a>
    </div>
  )
}
