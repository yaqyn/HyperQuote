import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import type {
	DriverDelivery,
	DriverLanguage,
	DriverProfile,
} from '../lib/driver-repository'
import { localize } from '../lib/format'
import { StatusPill } from './DriverShellPrimitives'

export function DeliveryListRow({
	assignedDriver,
	delivery,
	isSelected,
	language,
	onView,
}: {
	assignedDriver: DriverProfile | null
	delivery: DriverDelivery
	isSelected: boolean
	language: DriverLanguage
	onView: (deliveryId: string) => void
}) {
	const { t } = useTranslation('driver')

	return (
		<article
			className={`driver-delivery-row border border-[var(--color-border)] bg-[var(--color-panel)] p-3 ${
				isSelected ? 'is-selected' : ''
			}`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{delivery.deliveryNumber}
					</p>
					<h3 className="mt-1 truncate text-base font-semibold">
						{localize(delivery.orderName, language)}
					</h3>
					<p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
						{localize(delivery.customer.name, language)}
					</p>
				</div>
				<StatusPill status={delivery.status} />
			</div>

			<div className="mt-4 flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-[var(--color-text-subtle)]">
						{t('fleet.assigned')}
					</p>
					<p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
						{assignedDriver
							? localize(assignedDriver.name, language)
							: t('fleet.unassigned')}
					</p>
				</div>
				<Button
					onPress={() => onView(delivery.id)}
					className="driver-secondary-button h-10 shrink-0 border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
				>
					{t('fleet.view')}
				</Button>
			</div>
		</article>
	)
}
