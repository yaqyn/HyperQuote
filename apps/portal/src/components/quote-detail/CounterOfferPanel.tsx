import { CurrencyDisplay } from '@hyperquote/ui/display/CurrencyDisplay'
import {
	Checkbox,
	Input,
	Label,
	NumberField,
	TextArea,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuoteActionsStore } from '../../stores/quote-actions'

interface CounterOfferPanelProps {
	originalTotal: number
}

export function CounterOfferPanel({ originalTotal }: CounterOfferPanelProps) {
	const { t } = useTranslation('portal')
	const mode = useQuoteActionsStore((s) => s.mode)
	const totalDiscount = useQuoteActionsStore((s) => s.totalDiscount)
	const setTotalDiscount = useQuoteActionsStore((s) => s.setTotalDiscount)
	const selfPickup = useQuoteActionsStore((s) => s.selfPickup)
	const setSelfPickup = useQuoteActionsStore((s) => s.setSelfPickup)
	const counterNotes = useQuoteActionsStore((s) => s.counterNotes)
	const setCounterNotes = useQuoteActionsStore((s) => s.setCounterNotes)
	const setMode = useQuoteActionsStore((s) => s.setMode)

	if (mode !== 'counter-total' && mode !== 'counter-per-line') return null

	const newTotal =
		mode === 'counter-total' && totalDiscount != null
			? originalTotal * (1 - totalDiscount / 100)
			: originalTotal

	return (
		<div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] p-4">
			{/* Mode selection */}
			<div className="flex flex-row gap-3">
				<button
					type="button"
					onClick={() => setMode('counter-total')}
					className={[
						'flex-1 px-4 py-3 rounded-lg border text-sm font-medium cursor-pointer transition-colors',
						mode === 'counter-total'
							? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
							: 'border-[var(--color-border)] text-[var(--color-text)]',
					].join(' ')}
				>
					{t('quoteDetail.counterOnTotal')}
				</button>
				<button
					type="button"
					onClick={() => setMode('counter-per-line')}
					className={[
						'flex-1 px-4 py-3 rounded-lg border text-sm font-medium cursor-pointer transition-colors',
						mode === 'counter-per-line'
							? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
							: 'border-[var(--color-border)] text-[var(--color-text)]',
					].join(' ')}
				>
					{t('quoteDetail.counterPerLine')}
				</button>
			</div>

			{/* Total discount mode */}
			{mode === 'counter-total' && (
				<div className="flex flex-col gap-3">
					<NumberField
						value={totalDiscount ?? 0}
						onChange={(val) => setTotalDiscount(val)}
						minValue={0}
						maxValue={50}
						formatOptions={{ style: 'percent' }}
						className="flex flex-col gap-1"
					>
						<Label className="text-sm text-[var(--color-text-muted)]">
							{t('quoteDetail.discountPercent')}
						</Label>
						<Input className="border border-[var(--color-border)] rounded-lg h-10 px-3 text-sm font-mono text-[var(--color-text)] bg-[var(--color-card)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
					</NumberField>

					<div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--color-surface)]">
						<span className="text-sm text-[var(--color-text-muted)]">
							{t('quoteDetail.newTotal')}
						</span>
						<span className="font-mono font-semibold text-[var(--color-text)]">
							<CurrencyDisplay value={newTotal} />
						</span>
					</div>
				</div>
			)}

			{/* Per-line mode hint */}
			{mode === 'counter-per-line' && (
				<p className="text-sm text-[var(--color-text-muted)]">
					Click on unit prices in the table above to edit them.
				</p>
			)}

			{/* Shared controls */}
			<div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-3">
				{/* Self-pickup checkbox */}
				<Checkbox
					isSelected={selfPickup}
					onChange={setSelfPickup}
					className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer group"
				>
					<div className="w-5 h-5 rounded border border-[var(--color-border)] flex items-center justify-center group-data-[selected]:bg-[var(--color-primary)] group-data-[selected]:border-[var(--color-primary)] transition-colors">
						<svg
							aria-hidden="true"
							viewBox="0 0 12 12"
							className="w-3 h-3 text-white opacity-0 group-data-[selected]:opacity-100"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path d="M2 6l3 3 5-5" />
						</svg>
					</div>
					{t('quoteDetail.selfPickup')}
				</Checkbox>

				{/* Notes */}
				<TextField
					value={counterNotes}
					onChange={setCounterNotes}
					className="flex flex-col gap-1"
				>
					<Label className="text-sm text-[var(--color-text-muted)]">
						{t('quoteDetail.counterNotes')}
					</Label>
					<TextArea
						className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] bg-[var(--color-card)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 min-h-[80px] resize-none"
						placeholder={t('quoteDetail.counterNotesPlaceholder')}
					/>
				</TextField>
			</div>
		</div>
	)
}
