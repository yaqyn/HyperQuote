import { createRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DaySummary } from '@/components/end-of-day/DaySummary'
import { EndOdometer } from '@/components/end-of-day/EndOdometer'
import { FuelReport } from '@/components/end-of-day/FuelReport'
import { PostTripDVIR } from '@/components/end-of-day/PostTripDVIR'
import { ReturnsList } from '@/components/end-of-day/ReturnsList'
import { ShiftSignOff } from '@/components/end-of-day/ShiftSignOff'
import { useAuthStore } from '@/stores/auth'
import { type EODStep, useEODStore } from '@/stores/end-of-day'
import { useShiftStore } from '@/stores/shift'
import { Route as rootRoute } from './__root'

const STEP_LABELS: Record<EODStep, string> = {
	returns: 'Returns',
	fuel: 'Fuel',
	'post-trip-dvir': 'DVIR',
	odometer: 'Odometer',
	summary: 'Summary',
	'sign-off': 'Sign Off',
}

const STEP_COMPONENTS: Record<EODStep, React.ComponentType> = {
	returns: ReturnsList,
	fuel: FuelReport,
	'post-trip-dvir': PostTripDVIR,
	odometer: EndOdometer,
	summary: DaySummary,
	'sign-off': ShiftSignOff,
}

function EndOfDayScreen() {
	const { t } = useTranslation('driver')
	const navigate = useNavigate()
	const currentStep = useEODStore((s) => s.currentStep)
	const steps = useEODStore((s) => s.steps)
	const init = useEODStore((s) => s.init)
	const prevStep = useEODStore((s) => s.prevStep)
	const reset = useEODStore((s) => s.reset)
	const driverProfile = useAuthStore((s) => s.driverProfile)
	const resetShift = useShiftStore((s) => s.resetShift)

	// Initialize with driver type on mount
	useEffect(() => {
		if (driverProfile?.driver_type) {
			init(driverProfile.driver_type)
		}
	}, [driverProfile?.driver_type, init])

	const currentStepIndex = steps.indexOf(currentStep)
	const isFirstStep = currentStepIndex === 0
	const StepComponent = STEP_COMPONENTS[currentStep]

	const handleBack = () => {
		if (isFirstStep) {
			navigate({ to: '/home' })
		} else {
			prevStep()
		}
	}

	// Provide a way to navigate after shift ends
	useEffect(() => {
		const handleShiftEnd = () => {
			reset()
			resetShift()
			navigate({ to: '/login' })
		}

		;(window as unknown as Record<string, unknown>).__onShiftEnd =
			handleShiftEnd
		return () => {
			delete (window as unknown as Record<string, unknown>).__onShiftEnd
		}
	}, [reset, resetShift, navigate])

	return (
		<div className="flex min-h-dvh flex-col bg-[var(--bg-primary)] pb-[var(--safe-bottom)]">
			{/* Header with back button */}
			<div className="flex items-center gap-3 px-4 pt-[var(--safe-top)] pb-2">
				<button
					type="button"
					onClick={handleBack}
					className="flex h-10 w-10 items-center justify-center rounded-xl text-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-blue)]"
					aria-label={t('common.back', 'Back')}
				>
					&#8592;
				</button>
				<h1 className="flex-1 text-lg font-semibold">
					{t('eod.title', 'End of Day')}
				</h1>
			</div>

			{/* Step indicator */}
			<div className="flex items-center gap-1 px-4 pb-4">
				{steps.map((step, idx) => {
					const isCurrent = step === currentStep
					const isCompleted = idx < currentStepIndex
					return (
						<div key={step} className="flex flex-1 flex-col items-center gap-1">
							<div
								className={`h-1.5 w-full rounded-full transition-colors ${
									isCompleted
										? 'bg-[var(--color-blue)]'
										: isCurrent
											? 'bg-[var(--color-blue)]/50'
											: 'bg-[var(--bg-secondary)]'
								}`}
							/>
							<span
								className={`text-[10px] ${
									isCurrent
										? 'font-medium text-[var(--color-blue)]'
										: isCompleted
											? 'text-[var(--color-blue)]'
											: 'text-[var(--text-tertiary)]'
								}`}
							>
								{t(`eod.step.${step}`, STEP_LABELS[step])}
							</span>
						</div>
					)
				})}
			</div>

			{/* Step content */}
			<div className="flex-1 overflow-y-auto">
				<StepComponent />
			</div>
		</div>
	)
}

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/end-of-day',
	component: EndOfDayScreen,
})
