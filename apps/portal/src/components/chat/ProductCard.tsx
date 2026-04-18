/**
 * ProductCard — a Sample Swatch, inline inside Lyon's message.
 *
 * Not a CTA-laden card. A bracketed inline block you can tap to expand.
 * Small caps serif name, mono specs, mono price, optional 40×40 image.
 * Clicking logs (Phase-9 wiring deferred); later rooms will open a
 * product drawer.
 */

import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { ProductCardData } from '../../lib/chat-types'

const PLACEHOLDER_IMAGE = 'https://cdn.hyperquote.net/placeholder-product.webp'

const WESTERN_TO_ARABIC_INDIC: Record<string, string> = {
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
}
function toArabicIndic(str: string): string {
	return str.replace(/[0-9]/g, (d) => WESTERN_TO_ARABIC_INDIC[d] ?? d)
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

	const specsSummary = Object.entries(data.specs)
		.map(([k, v]) => `${k}: ${v}`)
		.join(' · ')

	const handleOpen = () => {
		// Phase-9 drawer hook
		console.info('[SampleSwatch] open:', data.id, data.name)
	}

	return (
		<Button
			onPress={handleOpen}
			className="office-swatch mt-2 inline-flex max-w-full"
			aria-label={`${t('chat.addToQuote', 'View details')}: ${name}`}
		>
			{data.image || PLACEHOLDER_IMAGE ? (
				<img
					src={data.image || PLACEHOLDER_IMAGE}
					alt=""
					aria-hidden
					width={40}
					height={40}
					className="mt-0.5 h-10 w-10 shrink-0 object-cover"
					style={{ filter: 'saturate(0.85) brightness(0.95)' }}
				/>
			) : null}
			<div className="flex min-w-0 flex-col gap-1 py-1">
				<span
					className={`${
						isArabic ? 'voice-serif-ar text-[14px]' : 'voice-serif text-[13px]'
					} uppercase tracking-[0.14em] text-[var(--p-text)] leading-tight`}
				>
					{name}
				</span>
				{specsSummary && (
					<span className="voice-mono truncate text-[11px] text-[var(--p-text-muted)]">
						{specsSummary}
					</span>
				)}
				<span className="voice-mono text-[11px] text-[var(--p-text)] tabular-nums">
					{priceDisplay}
				</span>
			</div>
		</Button>
	)
}
