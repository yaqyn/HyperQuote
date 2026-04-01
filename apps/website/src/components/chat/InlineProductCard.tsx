/**
 * InlineProductCard — Placeholder for Phase 30 rich AI messages
 *
 * Shows product name, price range, and "Add to Quote" button.
 * Will be wired to real product data when AI backend is built.
 */
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

interface InlineProductCardProps {
  name: string
  priceRange?: string
  onAddToQuote?: () => void
}

export function InlineProductCard({
  name,
  priceRange,
  onAddToQuote,
}: InlineProductCardProps) {
  const { t } = useTranslation('website')

  return (
    <div className="my-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <p className="text-sm font-medium text-[var(--color-text)]">{name}</p>
      {priceRange && (
        <p className="mt-1 text-xs font-[family-name:var(--font-geist-mono)] text-[var(--color-text-muted)]">
          {priceRange}
        </p>
      )}
      <Button
        onPress={onAddToQuote}
        className="mt-2 rounded-md bg-[#2563EB] px-3 py-1.5 text-xs text-white cursor-pointer hover:bg-[#1d4ed8] pressed:bg-[#1e40af] transition-colors"
      >
        {t('market.addToQuote')}
      </Button>
    </div>
  )
}
