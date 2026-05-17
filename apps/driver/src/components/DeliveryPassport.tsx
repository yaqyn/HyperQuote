import { ArrowLeft, MapPinned, Phone, Warehouse } from 'lucide-react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type {
	DriverDelivery,
	DriverLanguage,
	DriverProfile,
} from '../lib/driver-repository'
import { formatNumber, localize } from '../lib/format'
import { Metric, StatusPill } from './DriverShellPrimitives'

export function DeliveryPassport({
	assignedDriver,
	className,
	delivery,
	language,
	onBack,
}: {
	assignedDriver: DriverProfile | null
	className?: string
	delivery: DriverDelivery | null
	language: DriverLanguage
	onBack?: () => void
}) {
	const { t } = useTranslation('driver')

	if (!delivery) {
		return (
			<section
				className={`min-w-0 px-3 py-5 text-sm text-[var(--color-text-muted)] ${className ?? ''}`}
			>
				{t('info.empty')}
			</section>
		)
	}

	return (
		<section className={`driver-delivery-passport min-w-0 ${className ?? ''}`}>
			{onBack && (
				<Button
					className="driver-control-button mb-3 inline-flex h-10 items-center gap-2 border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 lg:hidden"
					onPress={onBack}
				>
					<ArrowLeft aria-hidden="true" size={15} />
					<span>{t('fleet.backToDeliveries')}</span>
				</Button>
			)}
			<div className="driver-passport-hero border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
							{delivery.deliveryNumber}
						</p>
						<h2 className="mt-2 font-[family-name:var(--font-archivo)] text-2xl font-black leading-none">
							{localize(delivery.orderName, language)}
						</h2>
					</div>
					<StatusPill status={delivery.status} />
				</div>
				<p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
					{localize(delivery.address.address, language)}
				</p>
				<div className="mt-4 grid grid-cols-3 gap-2 border-y border-[var(--color-border)] py-3">
					<Metric
						label={t('active.eta')}
						value={t('units.minutes', { count: delivery.etaMinutes })}
					/>
					<Metric
						label={t('active.window')}
						value={localize(delivery.scheduledWindow, language)}
					/>
					<Metric
						label={t('active.items')}
						value={formatNumber(delivery.items.length, language)}
					/>
				</div>
			</div>

			<div className="driver-route-vector mt-3 border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
				<div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
					<div className="grid h-10 w-10 place-items-center border border-[var(--color-border)] bg-[var(--color-panel)]">
						<Warehouse aria-hidden="true" size={18} />
					</div>
					<div className="h-px bg-[var(--color-border)]" />
					<div className="grid h-10 w-10 place-items-center border border-[var(--color-border)] bg-[var(--color-panel)]">
						<MapPinned aria-hidden="true" size={18} />
					</div>
				</div>
				<div className="mt-3 grid gap-3 sm:grid-cols-2">
					<RouteStop
						label={t('fleet.pickup')}
						title={localize(delivery.origin.label, language)}
						value={localize(delivery.origin.address, language)}
					/>
					<RouteStop
						label={t('fleet.dropoff')}
						title={localize(delivery.address.label, language)}
						value={localize(delivery.address.address, language)}
					/>
				</div>
			</div>

			<div className="mt-3 grid gap-3 lg:grid-cols-2">
				<ContactBlock
					contact={delivery.customer}
					language={language}
					title={t('info.customer')}
				/>
				<ContactBlock
					contact={delivery.warehouseContact}
					language={language}
					title={t('info.warehouse')}
				/>
			</div>

			<div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
				<section className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{t('info.items')}
					</p>
					<div className="mt-3 space-y-2">
						{delivery.items.map((item) => (
							<div
								key={item.id}
								className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
							>
								<span className="min-w-0 truncate font-semibold">
									{localize(item.name, language)}
								</span>
								<span className="shrink-0 text-xs text-[var(--color-text-muted)]">
									{localize(item.quantity, language)}
								</span>
							</div>
						))}
					</div>
				</section>
				<section className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{t('fleet.assigned')}
					</p>
					<p className="mt-2 text-sm font-semibold">
						{assignedDriver
							? localize(assignedDriver.name, language)
							: t('fleet.unassigned')}
					</p>
					<p className="mt-3 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
						{t('info.notes')}
					</p>
					<p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
						{localize(delivery.notes, language)}
					</p>
				</section>
			</div>
		</section>
	)
}

function RouteStop({
	label,
	title,
	value,
}: {
	label: string
	title: string
	value: string
}) {
	return (
		<div className="min-w-0">
			<p className="font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-[var(--color-text-subtle)]">
				{label}
			</p>
			<p className="mt-1 truncate text-sm font-semibold">{title}</p>
			<p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">
				{value}
			</p>
		</div>
	)
}

function ContactBlock({
	contact,
	language,
	title,
}: {
	contact: DriverDelivery['customer']
	language: DriverLanguage
	title: string
}) {
	const { t } = useTranslation('driver')

	return (
		<section className="border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
			<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
				{title}
			</p>
			<div className="mt-3 flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold">
						{localize(contact.name, language)}
					</p>
					<p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
						{localize(contact.role, language)}
					</p>
				</div>
				<a
					href={`tel:${contact.phone}`}
					className="driver-secondary-button grid h-10 w-10 shrink-0 place-items-center border outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
					aria-label={t('info.call')}
				>
					<Phone aria-hidden="true" size={17} />
				</a>
			</div>
		</section>
	)
}
