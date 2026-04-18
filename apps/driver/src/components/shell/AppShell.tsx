/**
 * App shell. Mobile: header + screen + tab bar (single screen at a time).
 * Tablet/desktop landscape (≥1024px): header + 2-column split (rail with
 * stops list + the active screen on the right). Messages on desktop is
 * available via the rail mode toggle.
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getOrderQueue, getThreads } from '../../lib/mock'
import { useApp } from '../../stores/cockpit'
import { ActiveScreen } from '../active/ActiveScreen'
import { MessagesScreen } from '../messages/MessagesScreen'
import { StopsScreen } from '../stops/StopsScreen'
import { AppHeader } from './AppHeader'
import { AppTabBar, type Pane } from './AppTabBar'

export function AppShell() {
	const lang = useApp((s) => s.lang)
	const [pane, setPane] = useState<Pane>('active')

	const { data: queue } = useQuery({
		queryKey: ['orders-queue'],
		queryFn: getOrderQueue,
	})
	const { data: threads } = useQuery({
		queryKey: ['threads'],
		queryFn: getThreads,
	})
	const stopsBadge = (queue ?? []).filter((o) => o.stage === 'loading').length
	const messagesBadge = (threads ?? []).reduce((s, t) => s + t.unread, 0)

	return (
		<div className="app-shell" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
			<AppHeader />

			{/* Mobile / portrait — single pane */}
			<div className="pane-mobile h-full overflow-hidden">
				{pane === 'stops' ? <StopsScreen /> : null}
				{pane === 'active' ? <ActiveScreen /> : null}
				{pane === 'messages' ? <MessagesScreen /> : null}
			</div>

			{/* Desktop landscape — rail + active pane */}
			<aside className="app-rail">
				<StopsScreen embedded />
			</aside>
			<main className="app-pane">
				<ActiveScreen />
			</main>

			<AppTabBar
				pane={pane}
				onChange={setPane}
				activeOrderBadge={stopsBadge}
				messagesBadge={messagesBadge}
			/>
		</div>
	)
}
