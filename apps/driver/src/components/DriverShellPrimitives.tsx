import type { ParseKeys } from 'i18next'
import type { ReactNode } from 'react'
import { Button } from 'react-aria-components/Button'
import { Tab } from 'react-aria-components/Tabs'
import { useTranslation } from 'react-i18next'
import type { DeliveryStatus, DriverProfile } from '../lib/driver-repository'
import type { FleetTab } from './driver-shell-types'

const STATUS_KEYS: Record<DeliveryStatus, ParseKeys<'driver'>> = {
	accepted: 'status.accepted',
	arrived: 'status.arrived',
	assigned: 'status.assigned',
	available: 'status.available',
	completed: 'status.completed',
	in_transit: 'status.inTransit',
	rejected: 'status.rejected',
}

export function StatusPill({ status }: { status: DeliveryStatus }) {
	const { t } = useTranslation('driver')

	return (
		<span className="shrink-0 border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
			{t(STATUS_KEYS[status])}
		</span>
	)
}

export function DriverStatus({ status }: { status: DriverProfile['status'] }) {
	const { t } = useTranslation('driver')
	const key: ParseKeys<'driver'> =
		status === 'on_delivery'
			? 'drivers.onDelivery'
			: status === 'offline'
				? 'drivers.offline'
				: 'drivers.available'

	return (
		<span className="shrink-0 border border-[var(--color-border)] px-2 py-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
			{t(key)}
		</span>
	)
}

export function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<p className="truncate font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-[var(--color-text-subtle)]">
				{label}
			</p>
			<p className="mt-1 truncate text-sm font-semibold">{value}</p>
		</div>
	)
}

export function ActionButton({
	icon,
	isDisabled,
	label,
	onPress,
}: {
	icon: ReactNode
	isDisabled: boolean
	label: string
	onPress: () => void
}) {
	return (
		<Button
			isDisabled={isDisabled}
			onPress={onPress}
			className="driver-action-button mt-3 flex h-10 w-full items-center justify-between border px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-4 sm:h-12"
		>
			<span>{label}</span>
			{icon}
		</Button>
	)
}

export function RailButton({
	ariaPressed,
	icon,
	isActive,
	label,
	onPress,
	primary = false,
}: {
	ariaPressed?: boolean
	icon: ReactNode
	isActive: boolean
	label: string
	onPress: () => void
	primary?: boolean
}) {
	return (
		<Button
			aria-pressed={ariaPressed}
			onPress={onPress}
			className={`flex h-full flex-col items-center justify-center gap-0 border-inline-end border-[var(--color-border)] text-[11px] font-semibold outline-none last:border-inline-end-0 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
				isActive
					? 'driver-control-button'
					: 'bg-[var(--color-panel)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'
			} ${primary ? 'text-xs' : ''}`}
			aria-label={label}
		>
			{icon}
			<span className="sr-only">{label}</span>
		</Button>
	)
}

export function DriverTab({
	icon,
	id,
	label,
}: {
	icon: ReactNode
	id: FleetTab
	label: string
}) {
	return (
		<Tab
			id={id}
			className="group relative flex h-16 cursor-pointer flex-col items-center justify-center gap-1 border-inline-end border-[var(--color-border)] bg-[var(--color-panel)] text-center text-xs font-semibold text-[var(--color-text-muted)] outline-none last:border-inline-end-0 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] selected:bg-[var(--color-action-bg)] selected:text-[var(--color-action-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 sm:h-14 sm:text-sm"
		>
			<span className="grid h-6 w-6 place-items-center">{icon}</span>
			<span className="max-w-full truncate">{label}</span>
		</Tab>
	)
}
