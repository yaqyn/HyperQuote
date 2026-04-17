import { useTranslation } from 'react-i18next'
import { DriverButton } from '@/components/shared/DriverButton'
import { DriverCard } from '@/components/shared/DriverCard'
import type { DriverJob } from '@/stores/external-driver'
import { CountdownTimer } from './CountdownTimer'

interface JobCardProps {
	job: DriverJob
	onPress: () => void
}

function formatAmount(amount: number, locale: string): string {
	return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount)
}

function formatNum(num: number, locale: string): string {
	return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(num)
}

export function JobCard({ job, onPress }: JobCardProps) {
	const { t, i18n } = useTranslation('driver')
	const locale = i18n.language

	return (
		<DriverCard className="min-h-[56px]">
			<div className="flex flex-col gap-3">
				{/* Top row: payout + countdown */}
				<div className="flex items-center justify-between">
					<span className="font-[var(--font-mono)] text-xl font-bold text-[var(--color-blue)]">
						{formatAmount(job.payoutAmount, locale)}
					</span>
					<CountdownTimer expiresAt={job.expiresAt} />
				</div>

				{/* Pickup -> Delivery */}
				<div className="flex flex-col gap-1">
					<div className="flex items-start gap-2">
						<span
							className="mt-0.5 text-[var(--color-success)]"
							aria-hidden="true"
						>
							{/* Circle dot for pickup */}
							<svg
								aria-hidden="true"
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="currentColor"
							>
								<circle cx="8" cy="8" r="4" />
							</svg>
						</span>
						<span className="text-sm">{job.pickupAddress}</span>
					</div>
					<div
						className="ms-[7px] h-4 w-0.5 bg-[var(--border-color)]"
						aria-hidden="true"
					/>
					<div className="flex items-start gap-2">
						<span
							className="mt-0.5 text-[var(--color-blue)]"
							aria-hidden="true"
						>
							<svg
								aria-hidden="true"
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="currentColor"
							>
								<rect x="4" y="4" width="8" height="8" rx="2" />
							</svg>
						</span>
						<span className="text-sm">{job.deliveryAddress}</span>
					</div>
				</div>

				{/* Details row */}
				<div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
					<span>
						<span className="font-[var(--font-mono)]">
							{formatNum(job.estimatedDistanceKm, locale)}
						</span>{' '}
						{t('jobs.km', 'km')}
					</span>
					<span>
						<span className="font-[var(--font-mono)]">
							{formatNum(job.estimatedDurationMinutes, locale)}
						</span>{' '}
						{t('jobs.min', 'min')}
					</span>
					<span>
						<span className="font-[var(--font-mono)]">
							{formatNum(job.totalWeightKg, locale)}
						</span>{' '}
						{t('jobs.kg', 'kg')}
					</span>
				</div>

				{/* Materials summary */}
				<p className="truncate text-sm text-[var(--text-secondary)]">
					{job.materialsSummary}
				</p>

				{/* Equipment tags */}
				{(job.requiresMoffett || job.requiresBoom) && (
					<div className="flex gap-2">
						{job.requiresMoffett && (
							<span className="rounded-full bg-[var(--color-blue)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-blue)]">
								{t('jobs.moffett', 'Moffett')}
							</span>
						)}
						{job.requiresBoom && (
							<span className="rounded-full bg-[var(--color-blue)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-blue)]">
								{t('jobs.boom', 'Boom')}
							</span>
						)}
					</div>
				)}

				{/* View Details */}
				<DriverButton variant="secondary" onPress={onPress}>
					{t('jobs.viewDetails', 'View Details')}
				</DriverButton>
			</div>
		</DriverCard>
	)
}
