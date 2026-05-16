import { DateDisplay, StatusBadge } from '@hyperquote/ui'
import type { ParseKeys } from 'i18next'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { QuoteStatus } from '../../types/quote'
import { ValidityCountdown } from './ValidityCountdown'

interface QuoteHeaderProps {
	reference: string
	status: QuoteStatus
	createdAt: string
	daysRemaining: number
	assignedRepName?: string
	assignedRepPhone?: string
}

/** Map QuoteStatus to StatusBadge semantic status */
function getStatusVariant(
	status: QuoteStatus,
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
	switch (status) {
		case 'accepted':
			return 'success'
		case 'sent':
		case 'viewed':
			return 'info'
		case 'negotiating':
		case 'revised':
			return 'warning'
		case 'declined':
		case 'expired':
		case 'cancelled':
			return 'error'
		default:
			return 'neutral'
	}
}

const STATUS_LABEL_KEYS: Record<QuoteStatus, ParseKeys<'portal'>> = {
	draft: 'quoteDetail.status.draft',
	internal_review: 'quoteDetail.status.internal_review',
	pending_approval: 'quoteDetail.status.pending_approval',
	approved: 'quoteDetail.status.approved',
	sent: 'quoteDetail.status.sent',
	viewed: 'quoteDetail.status.viewed',
	negotiating: 'quoteDetail.status.negotiating',
	revised: 'quoteDetail.status.revised',
	accepted: 'quoteDetail.status.accepted',
	declined: 'quoteDetail.status.declined',
	expired: 'quoteDetail.status.expired',
	cancelled: 'quoteDetail.status.cancelled',
}

export function QuoteHeader({
	reference,
	status,
	createdAt,
	daysRemaining,
	assignedRepName,
	assignedRepPhone,
}: QuoteHeaderProps) {
	const { t } = useTranslation('portal')

	// Clean phone for WhatsApp link (remove +, spaces, dashes)
	const cleanPhone = assignedRepPhone?.replace(/[^0-9]/g, '') ?? ''

	return (
		<div className="flex flex-wrap items-start justify-between gap-4">
			{/* Left: Reference + date */}
			<div className="flex flex-col gap-1">
				<span className="font-mono text-xl font-semibold text-[var(--color-text)]">
					{reference}
				</span>
				<DateDisplay date={createdAt} format="long" />
			</div>

			{/* Center: Status badge */}
			<div className="flex items-center">
				<StatusBadge
					status={getStatusVariant(status)}
					className="text-sm px-3 py-1"
				>
					{t(STATUS_LABEL_KEYS[status])}
				</StatusBadge>
			</div>

			{/* Right: Validity + rep */}
			<div className="flex flex-col items-end gap-1">
				<ValidityCountdown daysRemaining={daysRemaining} />
				{assignedRepName && (
					<div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
						<span>{assignedRepName}</span>
						{assignedRepPhone && (
							<a
								href={`https://wa.me/${cleanPhone}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-[var(--color-primary)] hover:opacity-80 transition-opacity"
								aria-label={t('quoteDetail.whatsappRep', {
									name: assignedRepName,
								})}
							>
								<MessageCircle size={16} />
							</a>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
