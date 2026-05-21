/**
 * ProductCard — a Sample Swatch, inline inside Lyon's message.
 *
 * Not a CTA-laden card. A bracketed inline material swatch.
 * Small caps serif name, mono specs, mono price, optional 40×40 image.
 */

import { useTranslation } from 'react-i18next'
import type { ProductCardData } from '../../lib/chat-types'
import { toArabicIndic } from '../../lib/localized-digits'

interface ProductCardProps {
	data: ProductCardData
}

export function ProductCard({ data }: ProductCardProps) {
	const { i18n } = useTranslation('portal')
	const isArabic = i18n.language === 'ar'
	const name = isArabic ? data.nameAr : data.name
	const priceDisplay = isArabic
		? toArabicIndic(data.priceRangeAr)
		: data.priceRange
	const specs = isArabic ? data.specsAr : data.specs

	const specsSummary = Object.entries(specs)
		.map(([k, v]) => `${k}: ${v}`)
		.join(' · ')

	return (
		<span className="office-swatch mt-2 inline-flex max-w-full">
			{data.image ? (
				<img
					src={data.image}
					alt=""
					aria-hidden
					width={40}
					height={40}
					className="mt-0.5 h-10 w-10 shrink-0 object-cover"
					style={{ filter: 'saturate(0.85) brightness(0.95)' }}
				/>
			) : null}
			<span className="flex min-w-0 flex-col gap-1 py-1">
				<span
					className={`${
						isArabic ? 'voice-serif-ar text-[14px]' : 'voice-serif text-[13px]'
					} break-words uppercase leading-tight tracking-[0.14em] text-[var(--p-text)]`}
				>
					{name}
				</span>
				{specsSummary && (
					<span className="voice-mono overflow-hidden text-ellipsis text-[11px] text-[var(--p-text-muted)]">
						{specsSummary}
					</span>
				)}
				<span className="voice-mono text-[11px] text-[var(--p-text)] tabular-nums">
					{priceDisplay}
				</span>
			</span>
		</span>
	)
}
