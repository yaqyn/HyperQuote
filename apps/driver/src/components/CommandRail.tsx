import {
	ChevronDown,
	ChevronUp,
	ClipboardList,
	Fuel,
	PanelLeftOpen,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RailButton } from './DriverShellPrimitives'
import type { ShellPanel } from './driver-shell-types'

export function CommandRail({
	activePanel,
	isChromeCollapsed,
	isHidden,
	onFleet,
	onFuel,
	onInfo,
	onToggleChrome,
}: {
	activePanel: ShellPanel
	isChromeCollapsed: boolean
	isHidden: boolean
	onFleet: () => void
	onFuel: () => void
	onInfo: () => void
	onToggleChrome: () => void
}) {
	const { t } = useTranslation('driver')
	const mapChromeVisible = !activePanel && !isChromeCollapsed
	const mapButtonShowsUi = isChromeCollapsed || Boolean(activePanel)

	if (isHidden) return null

	return (
		<nav className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.4rem,env(safe-area-inset-bottom))] sm:px-5">
			<div
				className={[
					'pointer-events-auto mx-auto grid h-12 items-center border border-[var(--color-border)] bg-[var(--color-panel)]/96 shadow-[0_18px_70px_rgba(17,17,17,0.18)] backdrop-blur transition-[max-width] duration-200',
					isChromeCollapsed
						? 'max-w-[4rem] grid-cols-1'
						: 'max-w-[21rem] grid-cols-[1fr_1fr_1.2fr_1fr]',
				].join(' ')}
			>
				{!isChromeCollapsed && (
					<RailButton
						icon={<PanelLeftOpen aria-hidden="true" size={19} />}
						isActive={activePanel === 'fleet'}
						label={t('rail.fleet')}
						onPress={onFleet}
					/>
				)}
				{!isChromeCollapsed && (
					<RailButton
						icon={<Fuel aria-hidden="true" size={19} />}
						isActive={activePanel === 'fuel'}
						label={t('rail.fuel')}
						onPress={onFuel}
					/>
				)}
				<RailButton
					ariaPressed={isChromeCollapsed}
					icon={
						mapButtonShowsUi ? (
							<ChevronUp aria-hidden="true" size={24} />
						) : (
							<ChevronDown aria-hidden="true" size={24} />
						)
					}
					isActive={!activePanel}
					label={mapChromeVisible ? t('rail.hideUi') : t('rail.showUi')}
					onPress={onToggleChrome}
					primary
				/>
				{!isChromeCollapsed && (
					<RailButton
						icon={<ClipboardList aria-hidden="true" size={19} />}
						isActive={activePanel === 'info'}
						label={t('rail.info')}
						onPress={onInfo}
					/>
				)}
			</div>
		</nav>
	)
}
