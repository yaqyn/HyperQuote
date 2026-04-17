import { useTranslation } from 'react-i18next'
import {
	EXCEPTION_TYPES,
	type ExceptionType,
	useExceptionStore,
} from '../../stores/exception'
import { DriverCard } from '../shared/DriverCard'
import { CustomerUnavailable } from './CustomerUnavailable'
import { DamagedGoods } from './DamagedGoods'
import { ExceptionSummary } from './ExceptionSummary'
import { PartialDelivery } from './PartialDelivery'
import { SiteBlocked } from './SiteBlocked'
import { VehicleIssue } from './VehicleIssue'
import { WeatherDelay } from './WeatherDelay'
import { WrongAddress } from './WrongAddress'

const TYPE_COMPONENTS: Record<ExceptionType, React.ComponentType> = {
	customer_unavailable: CustomerUnavailable,
	site_blocked: SiteBlocked,
	wrong_address: WrongAddress,
	damaged_goods: DamagedGoods,
	partial_delivery: PartialDelivery,
	weather_delay: WeatherDelay,
	vehicle_issue: VehicleIssue,
}

/** Step thresholds per type: if step > threshold, show summary */
const SUMMARY_STEP: Record<ExceptionType, number> = {
	customer_unavailable: 2,
	site_blocked: 2,
	wrong_address: 2,
	damaged_goods: 3,
	partial_delivery: 2,
	weather_delay: 2,
	vehicle_issue: 2,
}

export function ExceptionWizard() {
	const { t } = useTranslation('driver')
	const step = useExceptionStore((s) => s.step)
	const type = useExceptionStore((s) => s.type)
	const setType = useExceptionStore((s) => s.setType)
	const prevStep = useExceptionStore((s) => s.prevStep)
	const reset = useExceptionStore((s) => s.reset)

	const handleBack = () => {
		if (step === 0) {
			reset()
		} else if (step === 1) {
			// Go back to type selection
			reset()
		} else {
			prevStep()
		}
	}

	// Type selection grid (step 0)
	if (step === 0) {
		return (
			<div className="flex flex-col gap-4">
				<h2 className="text-lg font-semibold px-4">
					{t('exception.selectType')}
				</h2>

				<div className="grid grid-cols-2 gap-3 px-4">
					{EXCEPTION_TYPES.map((item) => (
						<button
							key={item.type}
							type="button"
							onClick={() => setType(item.type)}
							className="min-h-[56px] text-start"
						>
							<DriverCard className="h-full">
								<span className="text-sm font-medium">{t(item.labelKey)}</span>
								{item.requiresPhoto && (
									<span className="mt-1 block text-xs text-[var(--text-tertiary)]">
										{t('exception.photoRequired')}
									</span>
								)}
							</DriverCard>
						</button>
					))}
				</div>
			</div>
		)
	}

	// Check if we should show summary
	if (type && step > SUMMARY_STEP[type]) {
		return (
			<div className="flex flex-col min-h-dvh">
				<div className="flex items-center px-4 py-3">
					<button
						type="button"
						onClick={handleBack}
						className="text-sm font-medium text-[var(--color-blue)]"
					>
						{t('common.back')}
					</button>
					<h1 className="flex-1 text-center text-base font-semibold">
						{t('exception.summary')}
					</h1>
					<div className="w-12" />
				</div>
				<div className="flex-1 overflow-y-auto">
					<ExceptionSummary />
				</div>
			</div>
		)
	}

	// Type-specific workflow (step 1+)
	const TypeComponent = type ? TYPE_COMPONENTS[type] : null

	return (
		<div className="flex flex-col min-h-dvh">
			{/* Title bar with back */}
			<div className="flex items-center px-4 py-3">
				<button
					type="button"
					onClick={handleBack}
					className="text-sm font-medium text-[var(--color-blue)]"
				>
					{t('common.back')}
				</button>
				<h1 className="flex-1 text-center text-base font-semibold">
					{type
						? t(`exception.types.${type}`, t('exception.reportIssue'))
						: t('exception.reportIssue')}
				</h1>
				<div className="w-12" />
			</div>

			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto px-4 pb-4">
				{TypeComponent && <TypeComponent />}
			</div>
		</div>
	)
}
