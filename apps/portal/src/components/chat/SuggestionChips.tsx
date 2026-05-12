/**
 * SuggestionChips — three action tiles under the empty-state greeting.
 *
 * Bordered cards: small-caps mono label + one-line serif description. Click
 * sends the corresponding prompt to Lyon.
 */

import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

interface Chip {
	labelKey: string
	descKey: string
	promptEn: string
	promptAr: string
}

const CHIPS: Chip[] = [
	{
		labelKey: 'chip.buildProject',
		descKey: 'chip.buildProjectDesc',
		promptEn: 'I have a construction project and need materials',
		promptAr:
			'\u0639\u0646\u062F\u064A \u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u0627\u0621 \u0648\u0645\u062D\u062A\u0627\u062C \u0645\u0648\u0627\u062F',
	},
	{
		labelKey: 'chip.orderMaterials',
		descKey: 'chip.orderMaterialsDesc',
		promptEn: 'I need to order specific building materials',
		promptAr:
			'\u0639\u0627\u064A\u0632 \u0623\u0637\u0644\u0628 \u0645\u0648\u0627\u062F \u0628\u0646\u0627\u0621 \u0645\u062D\u062F\u062F\u0629',
	},
	{
		labelKey: 'chip.reorder',
		descKey: 'chip.reorderDesc',
		promptEn: 'I want to reorder from a previous order',
		promptAr:
			'\u0639\u0627\u064A\u0632 \u0623\u0639\u064A\u062F \u0637\u0644\u0628 \u0633\u0627\u0628\u0642',
	},
]

interface SuggestionChipsProps {
	onSelect: (prompt: string) => void
	locale: 'ar' | 'en'
}

export function SuggestionChips({ onSelect, locale }: SuggestionChipsProps) {
	const { t } = useTranslation('portal')

	return (
		<>
			{CHIPS.map((chip, idx) => {
				const numeral = ['I', 'II', 'III'][idx] ?? ''
				return (
					<motion.button
						key={chip.labelKey}
						type="button"
						onClick={() =>
							onSelect(locale === 'ar' ? chip.promptAr : chip.promptEn)
						}
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.4,
							ease: [0.2, 0.8, 0.2, 1],
							delay: 0.2 + idx * 0.08,
						}}
						className="group flex min-h-24 flex-col items-center gap-2 border border-[var(--p-border)] bg-transparent px-4 py-4 text-center transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] sm:min-h-0 sm:gap-3 sm:py-5"
					>
						<span
							aria-hidden
							className="voice-serif text-[18px] italic leading-none text-[var(--p-text-faint)] transition-colors group-hover:text-[var(--p-text-muted)]"
						>
							{numeral}
						</span>
						<span className="voice-mono text-[10px] uppercase tracking-[0.2em] text-[var(--p-text)] sm:tracking-[0.26em]">
							{t(chip.labelKey)}
						</span>
						<span className="voice-serif text-[13px] leading-[1.4] text-[var(--p-text-muted)]">
							{t(chip.descKey, '')}
						</span>
					</motion.button>
				)
			})}
		</>
	)
}
