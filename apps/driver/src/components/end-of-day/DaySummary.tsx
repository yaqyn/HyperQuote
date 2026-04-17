import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DriverButton } from '@/components/shared/DriverButton'
import { DriverCard } from '@/components/shared/DriverCard'
import { useEODStore } from '@/stores/end-of-day'
import { useShiftStore } from '@/stores/shift'

function formatDriveTime(minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	return `${hours}:${String(mins).padStart(2, '0')}`
}

export function DaySummary() {
	const { t } = useTranslation('driver')
	const shiftSummary = useEODStore((s) => s.shiftSummary)
	const loadSummary = useEODStore((s) => s.loadSummary)
	const nextStep = useEODStore((s) => s.nextStep)
	const activeShiftId = useShiftStore((s) => s.activeShiftId)

	// Load summary on mount
	useEffect(() => {
		if (activeShiftId) {
			loadSummary(activeShiftId)
		}
	}, [activeShiftId, loadSummary])

	if (!shiftSummary) {
		return (
			<div className="flex min-h-[200px] items-center justify-center p-4">
				<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent" />
			</div>
		)
	}

	const stats = [
		{
			label: t('eod.stopsCompleted', 'Stops Completed / Failed'),
			value: `${shiftSummary.stopsCompleted} / ${shiftSummary.stopsFailed}`,
		},
		{
			label: t('eod.totalKm', 'Total Distance'),
			value: `${shiftSummary.totalKm.toLocaleString()} ${t('home.km', 'km')}`,
		},
		{
			label: t('eod.totalDriveTime', 'Total Drive Time'),
			value: formatDriveTime(shiftSummary.totalDriveTime),
		},
		{
			label: t('eod.onTimePercent', 'On-Time Delivery'),
			value: `${shiftSummary.onTimePercent}%`,
		},
		{
			label: t('eod.exceptionsLogged', 'Exceptions Logged'),
			value: String(shiftSummary.exceptionsLogged),
		},
		{
			label: t('eod.returnsCount', 'Returns'),
			value: String(shiftSummary.returnsCount),
		},
	]

	return (
		<div className="flex flex-col gap-4 p-4">
			<h2 className="text-xl font-semibold">
				{t('eod.daySummary', 'Day Summary')}
			</h2>

			<div className="grid grid-cols-2 gap-3">
				{stats.map((stat) => (
					<DriverCard key={stat.label}>
						<div className="flex flex-col gap-1">
							<span className="text-xs text-[var(--text-secondary)]">
								{stat.label}
							</span>
							<span className="font-[var(--font-mono)] text-lg font-medium">
								{stat.value}
							</span>
						</div>
					</DriverCard>
				))}
			</div>

			{/* Continue to sign-off */}
			<DriverButton onPress={nextStep}>
				{t('common.next', 'Continue')}
			</DriverButton>
		</div>
	)
}
