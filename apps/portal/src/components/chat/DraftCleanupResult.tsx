import { useTranslation } from 'react-i18next'
import type { DraftCleanupResultData } from '../../lib/chat-types'

interface DraftCleanupResultProps {
	data: DraftCleanupResultData
}

export function DraftCleanupResult({ data }: DraftCleanupResultProps) {
	const { i18n } = useTranslation('portal')
	const isArabic = i18n.language === 'ar'
	const rows = [
		{
			label: isArabic ? 'تم الحذف' : 'Deleted',
			values: data.deleted,
		},
		{
			label: isArabic ? 'تم الدمج' : 'Merged',
			values: data.merged,
		},
		{
			label: isArabic ? 'تم الاحتفاظ' : 'Kept',
			values: data.kept,
		},
	]
	const hasRows =
		rows.some((row) => row.values.length > 0) || data.renamed.length > 0
	if (!hasRows && !data.reference) return null

	return (
		<section className="mt-2 max-w-full border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-3 py-3">
			<p className="voice-mono text-[11px] uppercase text-[var(--p-text-muted)]">
				{isArabic ? 'نتيجة المسودات' : 'Draft result'}
				{data.reference ? ` · ${data.reference}` : ''}
			</p>
			<div className="mt-2 flex flex-col gap-1.5 text-[12px] text-[var(--p-text)]">
				{rows.map((row) =>
					row.values.length > 0 ? (
						<p key={row.label} className="min-w-0 break-words">
							<span className="font-semibold">{row.label}:</span>{' '}
							{row.values.join(', ')}
						</p>
					) : null,
				)}
				{data.renamed.map((item) => (
					<p key={`${item.from}-${item.to}`} className="min-w-0 break-words">
						<span className="font-semibold">
							{isArabic ? 'تغيير الاسم' : 'Renamed'}:
						</span>{' '}
						{item.from} → {item.to}
					</p>
				))}
			</div>
		</section>
	)
}
