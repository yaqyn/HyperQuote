import { Input, Label, NumberField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { DriverCard } from '@/components/shared/DriverCard'
import { useLoadingStore } from '@/stores/loading'
import { useShiftStore } from '@/stores/shift'

/** Weight tolerance thresholds */
const TOLERANCE_OK = 2 // +/- 2%
const TOLERANCE_WARN = 5 // +/- 5%

type VarianceLevel = 'ok' | 'warning' | 'danger'

function getVarianceLevel(variancePercent: number): VarianceLevel {
	const abs = Math.abs(variancePercent)
	if (abs <= TOLERANCE_OK) return 'ok'
	if (abs <= TOLERANCE_WARN) return 'warning'
	return 'danger'
}

const varianceColors: Record<VarianceLevel, string> = {
	ok: 'text-green-600',
	warning: 'text-yellow-600',
	danger: 'text-[var(--color-danger)]',
}

const varianceBgColors: Record<VarianceLevel, string> = {
	ok: 'bg-green-500/10',
	warning: 'bg-yellow-500/10',
	danger: 'bg-[var(--color-danger)]/10',
}

export function WeightEntry() {
	const { t } = useTranslation('driver')
	const weightExpected = useLoadingStore((s) => s.weightExpected)
	const weightActual = useLoadingStore((s) => s.weightActual)
	const weightVariance = useLoadingStore((s) => s.weightVariance)
	const setWeight = useLoadingStore((s) => s.setWeight)
	const isOverweight = useLoadingStore((s) => s.isOverweight)

	const selectedVehicle = useShiftStore((s) => s.selectedVehicle)
	const gvwr = selectedVehicle ? Number(selectedVehicle.capacity_kg) : 0

	const overweight = gvwr > 0 && isOverweight(gvwr)
	const varianceLevel =
		weightVariance !== null ? getVarianceLevel(weightVariance) : null

	return (
		<DriverCard
			header={
				<span className="font-medium">
					{t('loading.weightEntry', 'Weight Entry')}
				</span>
			}
		>
			<div className="space-y-4">
				{/* Scale ticket input */}
				<NumberField
					value={weightActual ?? undefined}
					onChange={(val) => {
						if (Number.isFinite(val)) setWeight(val)
					}}
					minValue={0}
					formatOptions={{ maximumFractionDigits: 1 }}
				>
					<Label className="text-sm font-medium">
						{t('loading.scaleTicket', 'Scale ticket reading (kg)')}
					</Label>
					<Input
						className="mt-1 block w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 font-mono text-2xl"
						placeholder="0"
					/>
				</NumberField>

				{/* Expected weight */}
				<div className="flex items-center justify-between text-sm">
					<span className="text-[var(--text-secondary)]">
						{t('loading.expectedWeight', 'Expected weight')}
					</span>
					<span className="font-mono font-medium">
						{weightExpected.toLocaleString()} {t('home.kg', 'kg')}
					</span>
				</div>

				{/* Variance display */}
				{weightVariance !== null && varianceLevel && (
					<div className={`rounded-xl p-3 ${varianceBgColors[varianceLevel]}`}>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">
								{t('loading.variance', 'Variance')}
							</span>
							<span
								className={`font-mono text-sm font-bold ${varianceColors[varianceLevel]}`}
							>
								{weightVariance > 0 ? '+' : ''}
								{weightVariance.toFixed(1)}%
							</span>
						</div>
					</div>
				)}

				{/* GVWR overweight alert */}
				{overweight && (
					<div className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-4">
						<div className="flex items-center gap-3">
							<svg
								aria-hidden="true"
								className="h-6 w-6 flex-shrink-0 text-[var(--color-danger)]"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
								<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
							</svg>
							<div>
								<p className="font-bold text-[var(--color-danger)]">
									{t('loading.overweight', 'Overweight')}
								</p>
								<p className="text-sm text-[var(--color-danger)]">
									{t(
										'loading.gvwrAlert',
										'Exceeds vehicle GVWR — departure blocked',
									)}
								</p>
								{gvwr > 0 && (
									<p className="mt-1 font-mono text-xs text-[var(--color-danger)]">
										GVWR: {gvwr.toLocaleString()} {t('home.kg', 'kg')} |{' '}
										{t('loading.actual', 'Actual')}:{' '}
										{(weightActual ?? 0).toLocaleString()} {t('home.kg', 'kg')}
									</p>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</DriverCard>
	)
}
