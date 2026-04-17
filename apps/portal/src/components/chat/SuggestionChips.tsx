/**
 * SuggestionChips — 3 suggestion cards for the empty chat state.
 * Each represents a natural way to start an order conversation.
 */

import { HardHat, type LucideIcon, RotateCcw, Warehouse } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

interface Chip {
	labelKey: string
	descKey: string
	icon: LucideIcon
	promptEn: string
	promptAr: string
}

const CHIPS: Chip[] = [
	{
		labelKey: 'chip.buildProject',
		descKey: 'chip.buildProjectDesc',
		icon: HardHat,
		promptEn: 'I have a construction project and need materials',
		promptAr:
			'\u0639\u0646\u062F\u064A \u0645\u0634\u0631\u0648\u0639 \u0628\u0646\u0627\u0621 \u0648\u0645\u062D\u062A\u0627\u062C \u0645\u0648\u0627\u062F',
	},
	{
		labelKey: 'chip.orderMaterials',
		descKey: 'chip.orderMaterialsDesc',
		icon: Warehouse,
		promptEn: 'I need to order specific building materials',
		promptAr:
			'\u0639\u0627\u064A\u0632 \u0623\u0637\u0644\u0628 \u0645\u0648\u0627\u062F \u0628\u0646\u0627\u0621 \u0645\u062D\u062F\u062F\u0629',
	},
	{
		labelKey: 'chip.reorder',
		descKey: 'chip.reorderDesc',
		icon: RotateCcw,
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
		<div className="grid grid-cols-3 gap-3 max-w-[640px] w-full">
			{CHIPS.map((chip, idx) => {
				const Icon = chip.icon
				return (
					<motion.button
						key={chip.labelKey}
						type="button"
						onClick={() =>
							onSelect(locale === 'ar' ? chip.promptAr : chip.promptEn)
						}
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							type: 'spring',
							stiffness: 300,
							damping: 30,
							delay: 0.3 + idx * 0.06,
						}}
						className="group flex flex-col items-center text-center gap-3 p-5 rounded-2xl bg-[var(--p-surface)] border border-[var(--p-border)] hover:border-[var(--p-border-strong)] hover:bg-[var(--p-card)] transition-all cursor-pointer"
					>
						<div className="w-10 h-10 rounded-xl bg-[var(--p-card)] group-hover:bg-[var(--p-elevated)] flex items-center justify-center transition-colors">
							<Icon
								size={18}
								strokeWidth={1.5}
								className="text-[var(--p-text-secondary)]"
							/>
						</div>
						<p className="text-[13px] font-medium text-[var(--p-text)]">
							{t(chip.labelKey)}
						</p>
					</motion.button>
				)
			})}
		</div>
	)
}
