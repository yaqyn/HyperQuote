import { MessageCircle, Phone, Truck } from 'lucide-react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import type { DriverLanguage, DriverProfile } from '../lib/driver-repository'
import { formatClock, localize } from '../lib/format'
import { DriverStatus } from './DriverShellPrimitives'

export function DriverCrewCard({
	driver,
	isCurrentDriver,
	language,
	onChat,
}: {
	driver: DriverProfile
	isCurrentDriver: boolean
	language: DriverLanguage
	onChat: (driver: DriverProfile) => void
}) {
	const { t } = useTranslation('driver')

	return (
		<article className="driver-crew-card border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
						{isCurrentDriver ? t('fleet.you') : t('fleet.driver')}
					</p>
					<h3 className="mt-2 truncate text-base font-bold">
						{localize(driver.name, language)}
					</h3>
					<p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
						{localize(driver.vehicle, language)}
					</p>
				</div>
				<DriverStatus status={driver.status} />
			</div>
			<div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-y border-[var(--color-border)] py-3">
				<div className="grid h-9 w-9 place-items-center border border-[var(--color-border)] bg-[var(--color-surface)]">
					<Truck aria-hidden="true" size={17} />
				</div>
				<div className="min-w-0">
					<p className="font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-[var(--color-text-subtle)]">
						{t('fleet.lastPing')}
					</p>
					<p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
						{driver.location
							? formatClock(driver.location.recordedAt, language)
							: t('fleet.noPing')}
					</p>
				</div>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-2">
				<a
					href={`tel:${driver.phone}`}
					className="driver-secondary-button inline-flex h-10 items-center justify-center gap-2 border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
				>
					<Phone aria-hidden="true" size={15} />
					<span>{t('info.call')}</span>
				</a>
				<Button
					isDisabled={isCurrentDriver}
					onPress={() => onChat(driver)}
					className="driver-secondary-button inline-flex h-10 items-center justify-center gap-2 border px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-45"
				>
					<MessageCircle aria-hidden="true" size={15} />
					<span>
						{isCurrentDriver ? t('fleet.you') : t('fleet.chatDriver')}
					</span>
				</Button>
			</div>
		</article>
	)
}
