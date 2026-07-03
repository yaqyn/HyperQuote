import { useNavigate } from '@tanstack/react-router'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import {
	type MaterialListData,
	PORTAL_CHAT_OPEN_DRAFT_EVENT,
	type PortalChatOpenDraftEventDetail,
} from '../../lib/chat-types'
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
	const editLabel = isArabic ? 'تعديل في الشات' : 'Edit in chat'

	function editInChat() {
		const detail: PortalChatOpenDraftEventDetail = data.tempDraft
			? { adoptCurrentChat: true, tempDraft: data.tempDraft }
			: { draftId: data.draftId }
		window.dispatchEvent(
			new CustomEvent(PORTAL_CHAT_OPEN_DRAFT_EVENT, {
				detail,
			}),
		)
	}

	return (
		<div className="mt-2 max-w-full border border-[var(--p-rule)] bg-[var(--p-surface-subtle)] px-3 py-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
				<p className="voice-mono text-[11px] uppercase text-[var(--p-text-muted)]">
					{title}
					{data.reference ? ` · ${data.reference}` : ''}
				</p>
				{data.editRoute || data.tempDraft ? (
					<div className="flex flex-wrap gap-2">
						{data.editRoute ? (
							<Button
								onPress={() => navigate({ to: data.editRoute ?? '/' })}
								className="min-h-8 shrink-0 rounded-md border border-[var(--color-primary)] px-2 text-[12px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/5"
							>
								{openLabel}
							</Button>
						) : null}
						<Button
							onPress={editInChat}
							className="min-h-8 shrink-0 rounded-md border border-[var(--p-border)] px-2 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
						>
							{editLabel}
						</Button>
					</div>
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
