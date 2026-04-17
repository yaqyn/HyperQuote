import { createRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { JobCard } from '@/components/jobs/JobCard'
import { DriverButton } from '@/components/shared/DriverButton'
import { useAuthStore } from '@/stores/auth'
import { useExternalDriverStore } from '@/stores/external-driver'
import { Route as rootRoute } from './__root'

function JobOffersScreen() {
	const { t, i18n } = useTranslation('driver')
	const locale = i18n.language
	const navigate = useNavigate()
	const jobs = useExternalDriverStore((s) => s.jobs)
	const loadJobs = useExternalDriverStore((s) => s.loadJobs)

	useEffect(() => {
		loadJobs()
	}, [loadJobs])

	const formatCount = (count: number): string => {
		return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(
			count,
		)
	}

	return (
		<div className="flex min-h-dvh flex-col bg-[var(--bg-primary)] pb-[var(--safe-bottom)]">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-[var(--safe-top)] pb-2">
				<h1 className="text-xl font-semibold">
					{t('jobs.availableJobs', 'Available Jobs')}
				</h1>
				<span className="font-[var(--font-mono)] text-sm text-[var(--text-secondary)]">
					{formatCount(jobs.length)}
				</span>
			</div>

			{/* Refresh */}
			<div className="px-4 pb-3">
				<DriverButton variant="secondary" onPress={() => loadJobs()}>
					{t('jobs.refresh', 'Refresh')}
				</DriverButton>
			</div>

			{/* Job list */}
			<div className="flex-1 overflow-y-auto px-4">
				{jobs.length > 0 ? (
					<div className="flex flex-col gap-4 pb-4">
						{jobs.map((job) => (
							<JobCard
								key={job.id}
								job={job}
								onPress={() =>
									navigate({
										to: '/job-detail/$jobId',
										params: { jobId: job.id },
									})
								}
							/>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center gap-4 py-12">
						<p className="text-center text-lg text-[var(--text-secondary)]">
							{t(
								'jobs.noJobs',
								'No jobs available right now. Check back soon.',
							)}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/job-offers',
	beforeLoad: () => {
		const isExternalDriver = useAuthStore.getState().isExternalDriver
		if (!isExternalDriver) {
			throw redirect({ to: '/' })
		}
	},
	component: JobOffersScreen,
})
