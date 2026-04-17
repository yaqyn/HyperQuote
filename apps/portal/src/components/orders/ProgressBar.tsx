/**
 * 5-stage delivery progress bar.
 * Stages: Confirmed > Being Prepared > Out for Delivery > Delivered > Invoice Generated.
 * Completed: green filled circle + solid line.
 * Current: blue pulsing ring + dashed line.
 * Future: gray circle + gray dashed line.
 */
import { useTranslation } from 'react-i18next'
import type { DeliveryStage } from '../../lib/server/deliveries'

export const DELIVERY_STAGES = [
	'confirmed',
	'being_prepared',
	'out_for_delivery',
	'delivered',
	'invoice_generated',
] as const

const STAGE_I18N_KEYS: Record<DeliveryStage, string> = {
	confirmed: 'tracking.confirmed',
	being_prepared: 'tracking.beingPrepared',
	out_for_delivery: 'tracking.outForDelivery',
	delivered: 'tracking.delivered',
	invoice_generated: 'tracking.invoiceGenerated',
}

interface ProgressBar5StageProps {
	currentStage: DeliveryStage
}

export function ProgressBar5Stage({ currentStage }: ProgressBar5StageProps) {
	const { t } = useTranslation('portal')
	const currentIndex = DELIVERY_STAGES.indexOf(currentStage)

	return (
		<div
			className="flex items-start w-full px-4 py-6"
			role="progressbar"
			aria-valuenow={currentIndex + 1}
			aria-valuemin={1}
			aria-valuemax={5}
		>
			{DELIVERY_STAGES.map((stage, i) => {
				const isCompleted = i < currentIndex
				const isCurrent = i === currentIndex
				const _isFuture = i > currentIndex

				return (
					<div
						key={stage}
						className="flex items-start flex-1 last:flex-initial"
					>
						{/* Stage circle + label */}
						<div className="flex flex-col items-center gap-2">
							<div
								className={[
									'relative w-8 h-8 rounded-full flex items-center justify-center',
									'font-mono text-[13px] font-semibold',
									isCompleted
										? 'bg-[var(--color-success)] text-white'
										: isCurrent
											? 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] animate-[pulse_2s_ease-in-out_infinite]'
											: 'bg-[var(--color-surface)] text-[var(--color-text-subtle)] border border-[var(--color-border)]',
								].join(' ')}
							>
								{i + 1}
							</div>
							<span
								className={[
									'text-[13px] text-center max-w-[80px]',
									isCurrent
										? 'text-[var(--color-primary)] font-medium'
										: isCompleted
											? 'text-[var(--color-text)]'
											: 'text-[var(--color-text-subtle)]',
								].join(' ')}
							>
								{t(STAGE_I18N_KEYS[stage])}
							</span>
						</div>

						{/* Connecting line */}
						{i < DELIVERY_STAGES.length - 1 && (
							<div className="flex-1 mt-4 mx-2">
								<div
									className={[
										'h-0.5 w-full',
										isCompleted
											? 'bg-[var(--color-success)]'
											: isCurrent
												? 'border-t-2 border-dashed border-[var(--color-primary)]'
												: 'border-t-2 border-dashed border-[var(--color-border)]',
									].join(' ')}
								/>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
