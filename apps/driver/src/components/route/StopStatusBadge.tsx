import { useTranslation } from 'react-i18next'
import type { StopStatus } from '@/stores/route'

const statusColors: Record<StopStatus, string> = {
	pending: '#6B7280',
	en_route: '#2563EB',
	arrived: '#2563EB',
	completed: '#22C55E',
	failed: '#EF4444',
	skipped: '#F59E0B',
}

const statusBgColors: Record<StopStatus, string> = {
	pending: 'rgba(107, 114, 128, 0.1)',
	en_route: 'rgba(37, 99, 235, 0.1)',
	arrived: 'rgba(37, 99, 235, 0.1)',
	completed: 'rgba(34, 197, 94, 0.1)',
	failed: 'rgba(239, 68, 68, 0.1)',
	skipped: 'rgba(245, 158, 11, 0.1)',
}

interface StopStatusBadgeProps {
	status: StopStatus
}

export function StopStatusBadge({ status }: StopStatusBadgeProps) {
	const { t } = useTranslation('driver')

	return (
		<span
			className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
			style={{
				color: statusColors[status],
				backgroundColor: statusBgColors[status],
			}}
		>
			{t(`route.status.${status}`)}
		</span>
	)
}
