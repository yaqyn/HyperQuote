import { useNavigate } from '@tanstack/react-router'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import type { MaterialListData } from '../../lib/chat-types'
import { toArabicIndic } from '../../lib/localized-digits'

interface MaterialListProps {
	data: MaterialListData
}

export function MaterialList({ data }: MaterialListProps) {
	const { i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const isArabic = i18n.language === 'ar'
	const title = isArabic ? 'مسودة المواد' : 'Draft materials'
	const openLabel = isArabic ? 'افتح المسودة' : 'Open draft'

	return (
		<div className="mt-2 max-w-full border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-3 py-3">
			<div className="flex items-center justify-between gap-3">
				<p className="voice-mono text-[11px] uppercase text-[var(--p-text-muted)]">
					{title}
					{data.reference ? ` · ${data.reference}` : ''}
				</p>
				{data.editRoute ? (
					<Button
						onPress={() => navigate({ to: data.editRoute })}
						className="min-h-8 shrink-0 rounded-md border border-[var(--color-primary)] px-2 text-[12px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/5"
					>
						{openLabel}
					</Button>
				) : null}
			</div>
			<ul className="mt-2 flex flex-col gap-1.5">
				{data.items.map((item) => {
					const name = isArabic ? (item.nameAr ?? item.name) : item.name
					const unit = isArabic ? (item.unitAr ?? item.unit) : item.unit
					const quantity = isArabic
						? toArabicIndic(String(item.qty))
						: String(item.qty)
					return (
						<li
							key={`${item.name}-${item.qty}-${item.unit}`}
							className="flex min-w-0 items-baseline justify-between gap-3 text-[13px] text-[var(--p-text)]"
						>
							<span className="min-w-0 break-words">{name}</span>
							<span className="voice-mono shrink-0 text-[12px] text-[var(--p-text-muted)]">
								{quantity} {unit}
							</span>
						</li>
					)
				})}
			</ul>
		</div>
	)
}
