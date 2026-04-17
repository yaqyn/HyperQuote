/**
 * ProductCard -- Inline product card in AI chat responses.
 *
 * Compact horizontal layout: 48x48 image + name + specs + Geist Mono price range.
 * "Add to Quote" blue outline button. Arabic-Indic numerals when locale is AR.
 * Real cart wiring deferred to Phase 9.
 */

import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { ProductCardData } from '../../lib/chat-types'

const PLACEHOLDER_IMAGE = 'https://cdn.hyperquote.net/placeholder-product.webp'

/** Convert Western digits to Arabic-Indic */
function toArabicIndic(str: string): string {
	return str.replace(
		/[0-9]/g,
		(d) =>
			({
				'0': '\u0660',
				'1': '\u0661',
				'2': '\u0662',
				'3': '\u0663',
				'4': '\u0664',
				'5': '\u0665',
				'6': '\u0666',
				'7': '\u0667',
				'8': '\u0668',
				'9': '\u0669',
			})[d] ?? d,
	)
}

interface ProductCardProps {
	data: ProductCardData
}

export function ProductCard({ data }: ProductCardProps) {
	const { t, i18n } = useTranslation('portal')
	const isArabic = i18n.language === 'ar'
	const name = isArabic ? data.nameAr : data.name
	const priceDisplay = isArabic
		? toArabicIndic(data.priceRange)
		: data.priceRange

	// Flatten specs to a single-line summary
	const specsSummary = Object.entries(data.specs)
		.map(([k, v]) => `${k}: ${v}`)
		.join(' | ')

	const handleAddToQuote = () => {
		// Phase 9 wires this to the real quote cart
		console.info('[ProductCard] Add to quote:', data.id, data.name)
	}

	return (
		<div className="flex items-start gap-3 border border-[var(--color-border)] rounded-xl p-3 mt-2">
			{/* Product image */}
			<img
				src={data.image || PLACEHOLDER_IMAGE}
				alt={name}
				className="w-12 h-12 rounded-lg object-cover shrink-0"
			/>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold text-[var(--color-text)] truncate">
					{name}
				</p>
				{specsSummary && (
					<p className="text-[13px] text-[var(--color-text-muted)] truncate mt-0.5">
						{specsSummary}
					</p>
				)}
				<p className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--color-text)] mt-1">
					{priceDisplay}
				</p>
			</div>

			{/* Add to Quote button */}
			<Button
				onPress={handleAddToQuote}
				className="shrink-0 h-8 px-3 rounded-lg border border-[var(--color-primary)] text-[var(--color-primary)] text-[13px] font-semibold cursor-pointer hover:bg-[var(--color-primary)]/5 transition-colors"
				aria-label={`${t('chat.addToQuote')} ${name}`}
			>
				{t('chat.addToQuote')}
			</Button>
		</div>
	)
}
