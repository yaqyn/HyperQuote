import { createRoute, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { EarningsHistory } from '@/components/earnings/EarningsHistory'
import { EarningsSummary } from '@/components/earnings/EarningsSummary'
import { RatingDisplay } from '@/components/earnings/RatingDisplay'
import { WithdrawalForm } from '@/components/earnings/WithdrawalForm'
import { useAuthStore } from '@/stores/auth'
import { useExternalDriverStore } from '@/stores/external-driver'
import { Route as rootRoute } from './__root'

function EarningsScreen() {
	const { t } = useTranslation('driver')
	const driverProfile = useAuthStore((s) => s.driverProfile)
	const earnings = useExternalDriverStore((s) => s.earnings)
	const earningsHistory = useExternalDriverStore((s) => s.earningsHistory)
	const loadEarnings = useExternalDriverStore((s) => s.loadEarnings)
	const loadEarningsHistory = useExternalDriverStore(
		(s) => s.loadEarningsHistory,
	)

	useEffect(() => {
		if (!driverProfile?.id) return
		loadEarnings(driverProfile.id)
		loadEarningsHistory(driverProfile.id)
	}, [driverProfile?.id, loadEarnings, loadEarningsHistory])

	const refreshEarnings = () => {
		if (!driverProfile?.id) return
		loadEarnings(driverProfile.id)
		loadEarningsHistory(driverProfile.id)
	}

	return (
		<div className="flex min-h-dvh flex-col bg-[var(--bg-primary)] pb-[var(--safe-bottom)]">
			<div className="px-4 pt-[var(--safe-top)] pb-2">
				<h1 className="text-xl font-semibold">
					{t('earnings.title', 'Earnings')}
				</h1>
			</div>

			<div className="flex-1 overflow-y-auto px-4">
				<div className="flex flex-col gap-4 pb-4">
					{/* Rating */}
					<RatingDisplay
						rating={earnings.rating}
						totalJobs={earnings.totalJobs}
					/>

					{/* Summary cards */}
					<EarningsSummary earnings={earnings} />

					{/* Tabs */}
					<Tabs defaultSelectedKey="history">
						<TabList className="flex gap-0 rounded-xl bg-[var(--bg-secondary)] p-1">
							<Tab
								id="history"
								className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium text-[var(--text-secondary)] outline-none transition-colors data-[selected]:bg-[var(--bg-primary)] data-[selected]:text-[var(--text-primary)] data-[selected]:shadow-sm"
							>
								{t('earnings.history', 'History')}
							</Tab>
							<Tab
								id="withdraw"
								className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium text-[var(--text-secondary)] outline-none transition-colors data-[selected]:bg-[var(--bg-primary)] data-[selected]:text-[var(--text-primary)] data-[selected]:shadow-sm"
							>
								{t('earnings.withdraw', 'Withdraw')}
							</Tab>
						</TabList>

						<TabPanel id="history" className="mt-4">
							<EarningsHistory history={earningsHistory} />
						</TabPanel>

						<TabPanel id="withdraw" className="mt-4">
							<WithdrawalForm
								availableBalance={earnings.available}
								onSuccess={refreshEarnings}
							/>
						</TabPanel>
					</Tabs>
				</div>
			</div>
		</div>
	)
}

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/earnings',
	beforeLoad: () => {
		const isExternalDriver = useAuthStore.getState().isExternalDriver
		if (!isExternalDriver) {
			throw redirect({ to: '/' })
		}
	},
	component: EarningsScreen,
})
