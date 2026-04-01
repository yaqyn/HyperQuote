/**
 * Search & Add input method for quote builder.
 * React Aria ComboBox with debounced product search via useProductSearch hook.
 * On select: adds item to Zustand store, clears input, focuses quantity field.
 */
import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ComboBox,
  Input,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components'
import { Search } from 'lucide-react'
import { useProductSearch } from '../../../hooks/useProductSearch'
import { useQuoteBuilderStore } from '../../../stores/quote-builder'
import type { ProductSearchResult } from '../../../lib/server/products-search'

export function SearchAndAdd() {
  const { t } = useTranslation('portal')
  const [inputValue, setInputValue] = useState('')
  const addItem = useQuoteBuilderStore((s) => s.addItem)
  const items = useQuoteBuilderStore((s) => s.items)
  const inputRef = useRef<HTMLInputElement>(null)

  const { results, isLoading } = useProductSearch(inputValue)

  const handleSelect = useCallback(
    (key: React.Key | null) => {
      if (!key) return
      const product = results.find((r: ProductSearchResult) => r.id === String(key))
      if (!product) return

      // Check if product already in list
      const exists = items.some((i: { productId?: string }) => i.productId === product.id)
      if (exists) {
        setInputValue('')
        return
      }

      addItem({
        id: crypto.randomUUID(),
        productId: product.id,
        customerDescription: product.name,
        quantity: 1,
        unitOfMeasure: product.unitOfMeasure,
        sortOrder: items.length,
        isUnmatched: false,
      })

      setInputValue('')

      // Focus the quantity field of the newly added item after React renders
      requestAnimationFrame(() => {
        const qtyInputs = document.querySelectorAll<HTMLInputElement>(
          '[data-quantity-input]',
        )
        const lastInput = qtyInputs[qtyInputs.length - 1]
        lastInput?.focus()
        lastInput?.select()
      })
    },
    [results, items, addItem],
  )

  return (
    <ComboBox
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelectionChange={handleSelect}
      menuTrigger="input"
      allowsCustomValue
      items={results}
      aria-label={t('quoteBuilder.searchPlaceholder')}
    >
      <div className="relative">
        <Search
          size={16}
          className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
        />
        <Input
          ref={inputRef}
          placeholder={t('quoteBuilder.searchPlaceholder')}
          className="w-full h-11 ps-10 pe-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors"
        />
      </div>
      <Popover className="w-[var(--trigger-width)] rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg overflow-hidden">
        <ListBox<ProductSearchResult>
          className="max-h-[320px] overflow-auto outline-none"
          renderEmptyState={() =>
            isLoading ? null : inputValue.length >= 2 ? (
              <div className="px-3 py-2 text-sm text-[var(--color-text-muted)]">
                {t('quoteBuilder.emptyTable')}
              </div>
            ) : null
          }
        >
          {(product) => (
            <ListBoxItem
              key={product.id}
              id={product.id}
              textValue={product.name}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none data-[focused]:bg-[var(--color-surface)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--color-text)] truncate">
                  {product.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Category badge */}
                  <span className="text-xs bg-[var(--color-surface)] text-[var(--color-text-muted)] rounded-full px-2 py-0.5">
                    {product.category}
                  </span>
                  {/* Availability dot */}
                  <span
                    className={[
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      product.availabilityStatus === 'available'
                        ? 'bg-[var(--color-success)]'
                        : 'bg-[var(--color-error)]',
                    ].join(' ')}
                  />
                </div>
              </div>
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  )
}
