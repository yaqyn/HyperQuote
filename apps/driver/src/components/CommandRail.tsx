import { ClipboardList, Navigation, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RailButton } from './DriverShellPrimitives'
import type { ShellPanel } from './driver-shell-types'

export function CommandRail({
	activePanel,
	isHidden,
	onFleet,
	onInfo,
	onPrimary,
}: {
	activePanel: ShellPanel
	isHidden: boolean
	onFleet: () => void
	onInfo: () => void
	onPrimary: () => void
}) {
	const { t } = useTranslation('driver')

	if (isHidden) return null

	return (
		<nav className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.4rem,env(safe-area-inset-bottom))] sm:px-5">
			<div className="mx-auto grid h-12 max-w-[17rem] grid-cols-[1fr_1.2fr_1fr] items-center border border-[var(--color-border)] bg-[var(--color-panel)]/96 shadow-[0_18px_70px_rgba(17,17,17,0.18)] backdrop-blur">
				<RailButton
					icon={<PanelLeftOpen aria-hidden="true" size={19} />}
					isActive={activePanel === 'fleet'}
					label={t('rail.fleet')}
					onPress={onFleet}
				/>
				<RailButton
					icon={<Navigation aria-hidden="true" size={23} />}
					isActive={!activePanel}
					label={t('rail.active')}
					onPress={onPrimary}
					primary
				/>
				<RailButton
					icon={<ClipboardList aria-hidden="true" size={19} />}
					isActive={activePanel === 'info'}
					label={t('rail.info')}
					onPress={onInfo}
				/>
			</div>
		</nav>
	)
}
