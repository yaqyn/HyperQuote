import { useState } from 'react'
import {
  NumberField,
  Group,
  Input,
  Button,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useLoginModal } from '../../hooks/useLoginModal'

interface MobileBottomBarProps {
  unitOfMeasure: string
}

export function MobileBottomBar({ unitOfMeasure }: MobileBottomBarProps) {
  const { t } = useTranslation('website')
  const { open: openLoginModal } = useLoginModal()
  const [quantity, setQuantity] = useState(1)

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex h-16 items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 lg:hidden">
      {/* Compact quantity input */}
      <NumberField
        value={quantity}
        onChange={(v) => setQuantity(v)}
        minValue={1}
        step={1}
        aria-label={t('product.quantityLabel', 'Quantity')}
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

      {/* Add to Quote button */}
      <button
        type="button"
        onClick={() => openLoginModal('/portal/quote')}
        className="h-10 flex-1 rounded-lg bg-[var(--color-primary)] text-sm font-semibold text-white"
      >
        {t('market.addToQuote', 'Add to Quote')}
      </button>
    </div>
  )
}
