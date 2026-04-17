import {
	Label,
	Radio,
	RadioGroup,
	TextArea,
	TextField,
} from 'react-aria-components'
import { useTranslation } from 'react-i18next'

interface ConditionSelectProps {
	condition: 'good' | 'damaged' | ''
	onConditionChange: (condition: 'good' | 'damaged') => void
	notes: string
	onNotesChange: (notes: string) => void
}

export function ConditionSelect({
	condition,
	onConditionChange,
	notes,
	onNotesChange,
}: ConditionSelectProps) {
	const { t } = useTranslation('driver')

	return (
		<div className="space-y-3">
			<h3 className="text-base font-semibold text-[var(--text-primary)]">
				{t('pod.condition')}
			</h3>

			<RadioGroup
				value={condition}
				onChange={(value) => onConditionChange(value as 'good' | 'damaged')}
				aria-label={t('pod.condition')}
				className="space-y-3"
			>
				<Radio
					value="good"
					className="group flex cursor-pointer items-center gap-3 rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 outline-none transition-colors data-[selected]:border-green-500 data-[selected]:bg-green-50 min-h-[56px]"
				>
					<div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--border-color)] group-data-[selected]:border-green-500">
						<div className="h-2.5 w-2.5 rounded-full bg-transparent group-data-[selected]:bg-green-500" />
					</div>
					<span className="text-base text-[var(--text-primary)] group-data-[selected]:text-green-700 group-data-[selected]:font-medium">
						{t('pod.goodCondition')}
					</span>
				</Radio>

				<Radio
					value="damaged"
					className="group flex cursor-pointer items-center gap-3 rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 outline-none transition-colors data-[selected]:border-amber-500 data-[selected]:bg-amber-50 min-h-[56px]"
				>
					<div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--border-color)] group-data-[selected]:border-amber-500">
						<div className="h-2.5 w-2.5 rounded-full bg-transparent group-data-[selected]:bg-amber-500" />
					</div>
					<span className="text-base text-[var(--text-primary)] group-data-[selected]:text-amber-700 group-data-[selected]:font-medium">
						{t('pod.damageNoted')}
					</span>
				</Radio>
			</RadioGroup>

			{condition === 'damaged' && (
				<TextField value={notes} onChange={onNotesChange}>
					<Label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
						{t('pod.conditionNotes')}
					</Label>
					<TextArea
						className="w-full rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-base text-[var(--text-primary)] outline-none focus:border-[var(--color-blue)] min-h-[100px] resize-none"
						placeholder={t('pod.conditionNotes')}
						rows={3}
					/>
				</TextField>
			)}
		</div>
	)
}
