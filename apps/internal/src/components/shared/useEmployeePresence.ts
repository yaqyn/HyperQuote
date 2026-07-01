import { useEffect, useState } from 'react'
import { setEmployeePresence } from '../../lib/server/employee-presence'

export type EmployeePresenceStatus = 'online' | 'away' | 'offline'

type EmployeePresencePanel =
	| 'admin'
	| 'customer_service'
	| 'dispatch'
	| 'finance'
	| 'inventory'
	| 'sales'
	| 'search'
	| 'warehouse'

function currentEmployeePresenceStatus(): Exclude<
	EmployeePresenceStatus,
	'offline'
> {
	if (document.visibilityState !== 'visible') return 'away'
	if (document.querySelector('[data-away-lock="true"]')) return 'away'
	return 'online'
}

export function useEmployeePresence(
	activePanel: EmployeePresencePanel,
): EmployeePresenceStatus {
	const [presenceStatus, setPresenceStatus] =
		useState<EmployeePresenceStatus>('offline')

	useEffect(() => {
		let cancelled = false

		const syncPresence = async (status = currentEmployeePresenceStatus()) => {
			if (status !== 'online' && !cancelled) setPresenceStatus(status)
			try {
				await setEmployeePresence({
					data: {
						activePanel: status === 'online' ? activePanel : undefined,
						status,
					},
				})
				if (!cancelled) setPresenceStatus(status)
			} catch {
				if (!cancelled) setPresenceStatus('offline')
			}
		}

		void syncPresence()
		const interval = window.setInterval(() => {
			if (!cancelled) void syncPresence()
		}, 25_000)
		const handlePresenceChange = () => {
			void syncPresence()
		}
		document.addEventListener('visibilitychange', handlePresenceChange)
		window.addEventListener('focus', handlePresenceChange)
		window.addEventListener('internal-away-state-change', handlePresenceChange)

		return () => {
			cancelled = true
			window.clearInterval(interval)
			document.removeEventListener('visibilitychange', handlePresenceChange)
			window.removeEventListener('focus', handlePresenceChange)
			window.removeEventListener(
				'internal-away-state-change',
				handlePresenceChange,
			)
			void setEmployeePresence({
				data: { status: 'offline' },
			}).catch(() => undefined)
		}
	}, [activePanel])

	return presenceStatus
}
