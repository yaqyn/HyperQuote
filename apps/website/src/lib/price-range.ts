import { formatCurrency } from '@hyperquote/i18n'

/**
 * Format a price range for public display.
 *
 * - No prices: "Price on Request" / "السعر عند الطلب"
 * - Has min: "From EGP 45/bag" (EN) or "من ٤٥ ج.م/كيس" (AR)
 *
 * Uses formatCurrency which outputs Arabic-Indic numerals in AR locale.
 */
export function formatPriceRange(
  minPrice: number | null | undefined,
  maxPrice: number | null | undefined,
  uom: string,
  locale: 'ar' | 'en',
  t: (key: string) => string,
): string {
  if (!minPrice && !maxPrice) {
    return t('market.priceOnRequest')
  }

  const formatted = formatCurrency(minPrice ?? maxPrice!, locale)
  const unit = t(`units.${uom}`)

  if (locale === 'ar') {
    return `من ${formatted}/${unit}`
  }
  return `From ${formatted}/${unit}`
}
