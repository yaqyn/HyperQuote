import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Popover,
  Dialog,
  NumberField,
  Input,
  Label,
  Group,
  Button,
} from 'react-aria-components'
import type { MarketProduct } from '../../lib/server/market'
import { addToActiveDraft } from '../../lib/server/market'
import { useToastStore } from '../../stores/toast-store'

interface QuickAddPopoverProps {
  product: MarketProduct | null
  triggerRef: React.RefObject<HTMLElement | null>
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAddPopover({
  product,
  triggerRef,
  isOpen,
  onOpenChange,
}: QuickAddPopoverProps) {
  const { t, i18n } = useTranslation('portal')
  const isAr = i18n.language === 'ar'
  const [quantity, setQuantity] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToastStore.getState()

  if (!product) return null

  const handleAdd = async () => {
    setIsSubmitting(true)
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
      onOpenChange(false)
      setQuantity(1)
    } catch {
      toast.error(t('error.generic'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popover
      triggerRef={triggerRef}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="bottom"
      offset={8}
      className={[
        'bg-[var(--color-card)] rounded-xl shadow-xl border border-[var(--color-border)]',
        'p-4 w-64',
        'outline-none',
        // CSS transitions per UI-VISION (NOT Motion)
        'data-[entering]:animate-popover-in data-[exiting]:animate-popover-out',
      ].join(' ')}
    >
      <Dialog aria-label={t('market.quickAdd')} className="outline-none">
        <div className="flex flex-col gap-3">
          {/* Product name */}
          <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-1">
            {isAr ? product.nameAr : product.name}
          </p>

          {/* Quantity field */}
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
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-sm cursor-pointer hover:bg-[var(--color-border)] transition-colors"
              >
                -
              </Button>
              <Input
                className="w-16 h-8 text-center font-mono text-sm rounded-lg border border-[var(--color-border)] bg-transparent text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
              />
              <Button
                slot="increment"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] text-sm cursor-pointer hover:bg-[var(--color-border)] transition-colors"
              >
                +
              </Button>
            </Group>
          </NumberField>

          {/* UOM label */}
          <p className="text-xs text-[var(--color-text-muted)]">
            {product.unitOfMeasure}
          </p>

          {/* Add button */}
          <Button
            onPress={handleAdd}
            isDisabled={isSubmitting}
            className="h-8 px-4 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium cursor-pointer hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? t('market.adding', 'Adding...')
              : t('market.addToQuote')}
          </Button>
        </div>
      </Dialog>

      {/* CSS transitions for Popover per UI-VISION */}
      <style>{`
        @keyframes popover-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popover-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-4px); }
        }
        .animate-popover-in {
          animation: popover-in 150ms ease;
        }
        .animate-popover-out {
          animation: popover-out 150ms ease;
        }
      `}</style>
    </Popover>
  )
}
