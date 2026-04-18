/**
 * Bottom tab bar. 60px + safe-area bottom. Only visible on phone /
 * tablet portrait — landscape tablet+ uses the rail layout.
 */

import { ListChecks, MessageCircle, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type Pane = 'stops' | 'active' | 'messages'

interface AppTabBarProps {
	pane: Pane
	onChange: (p: Pane) => void
	activeOrderBadge?: number
	messagesBadge?: number
}

export function AppTabBar({
	pane,
	onChange,
	activeOrderBadge,
	messagesBadge,
}: AppTabBarProps) {
	const { t } = useTranslation()
	return (
		<nav className="app-tab-bar" aria-label={t('app.navigation')}>
			<Tab
				active={pane === 'stops'}
				onClick={() => onChange('stops')}
				label={t('app.tab.stops')}
				badge={activeOrderBadge}
				icon={<ListChecks size={20} strokeWidth={1.6} />}
			/>
			<Tab
				active={pane === 'active'}
				onClick={() => onChange('active')}
				label={t('app.tab.active')}
				icon={<Truck size={20} strokeWidth={1.6} />}
			/>
			<Tab
				active={pane === 'messages'}
				onClick={() => onChange('messages')}
				label={t('app.tab.messages')}
				badge={messagesBadge}
				icon={<MessageCircle size={20} strokeWidth={1.6} />}
			/>
		</nav>
	)
}

interface TabProps {
	active: boolean
	onClick: () => void
	label: string
	icon: React.ReactNode
	badge?: number
}

function Tab({ active, onClick, label, icon, badge }: TabProps) {
	return (
		<button
			type="button"
			data-active={active}
			onClick={onClick}
			className="app-tab"
		>
			{badge && badge > 0 ? (
				<span className="app-tab__badge">{badge}</span>
			) : null}
			{icon}
			<span>{label}</span>
		</button>
	)
}
