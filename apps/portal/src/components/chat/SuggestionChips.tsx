import type { ParseKeys } from 'i18next'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

interface Chip {
	labelKey: ParseKeys<'portal'>
	descKey: ParseKeys<'portal'>
	promptEn: string
	promptAr: string
}

const CHIPS: Chip[] = [
	{
		labelKey: 'chip.buildProject',
		descKey: 'chip.buildProjectDesc',
		promptEn:
			'Show me how you can help with materials, drafts, and product choices',
		promptAr:
			'\u0648\u0631\u0651\u064A\u0646\u064A \u062A\u0642\u062F\u0631 \u062A\u0633\u0627\u0639\u062F\u0646\u064A \u0625\u0632\u0627\u064A \u0641\u064A \u0627\u0644\u0645\u0648\u0627\u062F \u0648\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A',
	},
	{
		labelKey: 'chip.orderMaterials',
		descKey: 'chip.orderMaterialsDesc',
		promptEn:
			'I need 200 cement, 50 timber, and some steel. Help me choose and draft it.',
		promptAr:
			'\u0645\u062D\u062A\u0627\u062C \u0662\u0660\u0660 \u0623\u0633\u0645\u0646\u062A\u060C \u0665\u0660 \u062E\u0634\u0628\u060C \u0648\u0634\u0648\u064A\u0629 \u062D\u062F\u064A\u062F. \u0633\u0627\u0639\u062F\u0646\u064A \u0623\u062E\u062A\u0627\u0631 \u0648\u0627\u0639\u0645\u0644 \u0645\u0633\u0648\u062F\u0629.',
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
				const numeral = ['I', 'II'][idx] ?? ''
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
						dir={locale === 'ar' ? 'rtl' : 'ltr'}
						className="group grid min-h-14 grid-cols-[22px_1fr] items-center gap-2 border-y border-[var(--p-border)] bg-transparent px-1 py-2 text-start transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] sm:min-h-20 sm:grid-cols-[28px_1fr] sm:gap-3 sm:px-2 sm:py-4"
					>
						<span
							aria-hidden
							className="voice-prompt flex h-6 w-5 items-center justify-center border-e border-[var(--p-rule)] text-[11px] font-medium leading-none text-[var(--p-text-faint)] transition-colors group-hover:text-[var(--p-text-muted)] sm:h-8 sm:w-7 sm:text-[13px]"
						>
							{numeral}
						</span>
						<span className="min-w-0">
							<span className="voice-prompt block text-[10px] font-semibold uppercase leading-tight text-[var(--p-text)] sm:text-[11px]">
								{t(chip.labelKey)}
							</span>
							<span className="voice-prompt mt-0.5 block text-[11px] leading-[1.25] text-[var(--p-text-muted)] sm:mt-1 sm:text-[13px] sm:leading-[1.35]">
								{t(chip.descKey)}
							</span>
						</span>
					</motion.button>
				)
			})}
		</>
	)
}
