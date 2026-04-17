import { useTranslation } from 'react-i18next'
import type { InquiryStatus } from '../../../types/procurement'

interface ResponseStatusBadgeProps {
	status: InquiryStatus
}

const STATUS_STYLES: Record<InquiryStatus, string> = {
	sent: 'text-[var(--color-text-subtle)]',
	opened: 'text-[var(--color-primary)]',
	responded: 'text-[var(--color-text)]',
	overdue: 'text-[var(--color-text)] font-semibold',
	closed: 'text-[var(--color-text-subtle)]',
}

export function ResponseStatusBadge({ status }: ResponseStatusBadgeProps) {
	const { t } = useTranslation('internal')

	return (
		<span
			className={`inline-flex items-center text-[11px] font-medium uppercase tracking-wider ${STATUS_STYLES[status]}`}
		>
			{t(`procurement.status.${status}`)}
		</span>
	)
}
