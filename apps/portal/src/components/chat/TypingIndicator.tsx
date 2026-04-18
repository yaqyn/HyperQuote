/**
 * TypingIndicator — Lyon is about to write.
 *
 * Not bouncing dots. Lyon's margin tag + a blinking pen-nib cursor
 * where the first word will appear. Matches the ledger layout so the
 * next entry drops into place without a layout shift.
 */
import { useTranslation } from 'react-i18next'

export function TypingIndicator() {
	const { i18n } = useTranslation()
	const isArabic = i18n.language === 'ar'

	return (
		<li className="list-none">
			<div
				aria-hidden
				className="office-rule mb-4 first:hidden"
				style={{ opacity: 0.6 }}
			/>
			<article
				className="grid grid-cols-[60px_1fr] items-baseline gap-x-6 pb-4"
				aria-label="Lyon is preparing a response"
			>
				<span className="office-tag">{isArabic ? 'ليون' : 'Lyon'}</span>
				<span className="flex items-baseline gap-2 text-[var(--p-text-muted)]">
					<span className="office-pen-nib" aria-hidden />
					<span
						className={
							isArabic
								? 'voice-serif-ar text-[15px]'
								: 'voice-serif text-[16px] italic'
						}
					>
						…
					</span>
				</span>
			</article>
		</li>
	)
}
