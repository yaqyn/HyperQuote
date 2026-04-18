/**
 * StatusCard — inline order/quote status, rendered as a ledger entry.
 *
 * No rounded box, no badge pill. A tabular inset:
 *   [label in mono small caps] · [ENTITY NO.] — status in serif italic
 *   ────────────────────────────────────────────────────────────
 *   confirmed                                          28 MAR 2026
 *   dispatched                                         30 MAR 2026
 *   · · · · · — progress ticks at the bottom
 *
 * Arabic-Indic numerals when locale is AR.
 */
import { useTranslation } from 'react-i18next'
import type { StatusCardData } from '../../lib/chat-types'

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

const STATUS_COLOR: Record<'green' | 'yellow' | 'red', string> = {
	green: 'var(--p-success)',
	yellow: 'var(--p-warning)',
	red: 'var(--p-error)',
}

interface StatusCardProps {
	data: StatusCardData
}

export function StatusCard({ data }: StatusCardProps) {
	const { i18n } = useTranslation()
	const isArabic = i18n.language === 'ar'

	const displayNumber = isArabic
		? toArabicIndic(data.displayNumber)
		: data.displayNumber

	const kindLabel =
		data.entityType === 'order'
			? isArabic
				? 'طلب'
				: 'Order'
			: isArabic
				? 'عرض سعر'
				: 'Quote'

	const shownSteps = data.timeline.filter((s) => s.done).slice(-2)
	const statusColor = STATUS_COLOR[data.statusColor]

	return (
		<section
			className="mt-3 w-full max-w-[520px]"
			aria-label={`${kindLabel} ${displayNumber}`}
		>
			{/* Heading row: small-caps label + mono id + italic status */}
			<div className="flex items-baseline justify-between gap-3 pb-2">
				<div className="flex items-baseline gap-3">
					<span className="voice-mono text-[10px] uppercase tracking-[0.28em] text-[var(--p-text-faint)]">
						{kindLabel}
					</span>
					<span className="voice-mono text-[12px] tracking-[0.14em] text-[var(--p-text)]">
						No.&nbsp;{displayNumber}
					</span>
				</div>
				<span
					className="voice-serif text-[14px] italic leading-none"
					style={{ color: statusColor }}
				>
					{data.status}
				</span>
			</div>

			{/* Top rule */}
			<div className="h-px bg-[var(--p-rule-strong)]" />

			{/* Timeline rows */}
			{shownSteps.length > 0 && (
				<div className="flex flex-col">
					{shownSteps.map((step, idx) => (
						<div
							key={step.label}
							className={`flex items-baseline justify-between gap-3 py-2 ${
								idx < shownSteps.length - 1
									? 'border-b border-[var(--p-rule)]'
									: ''
							}`}
						>
							<span className="voice-mono text-[11px] uppercase tracking-[0.18em] text-[var(--p-text-muted)]">
								{step.label}
							</span>
							<span className="voice-mono tabular-nums text-[12px] text-[var(--p-text)]">
								{isArabic ? toArabicIndic(step.date) : step.date}
							</span>
						</div>
					))}
				</div>
			)}

			{/* Bottom rule + progress ticks */}
			{data.timeline.length > 0 && (
				<>
					<div className="mt-1 h-px bg-[var(--p-rule-strong)]" />
					<ol
						className="mt-3 flex list-none items-center gap-2 p-0"
						aria-label="Progress"
					>
						{data.timeline.map((step) => (
							<li
								key={step.label}
								title={step.label}
								aria-label={step.label}
								className="block h-1.5 w-1.5 rounded-full"
								style={{
									background: step.done
										? 'var(--p-text)'
										: 'var(--p-rule-strong)',
								}}
							/>
						))}
					</ol>
				</>
			)}
		</section>
	)
}
