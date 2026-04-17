import {
	createRoute,
	redirect,
	useNavigate,
	useParams,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { JobDetail } from '@/components/jobs/JobDetail'
import { useAuthStore } from '@/stores/auth'
import { useExternalDriverStore } from '@/stores/external-driver'
import { Route as rootRoute } from './__root'

function JobDetailScreen() {
	const navigate = useNavigate()
	const { jobId } = useParams({ from: '/job-detail/$jobId' })
	const selectedJob = useExternalDriverStore((s) => s.selectedJob)
	const loadJob = useExternalDriverStore((s) => s.loadJob)
	const acceptJob = useExternalDriverStore((s) => s.acceptJob)
	const declineJob = useExternalDriverStore((s) => s.declineJob)

	useEffect(() => {
		loadJob(jobId)
	}, [jobId, loadJob])

	if (!selectedJob) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
				<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-blue)] border-t-transparent" />
			</div>
		)
	}

	return (
		<JobDetail
			job={selectedJob}
			onAccept={async () => {
				await acceptJob(jobId)
				navigate({ to: '/route-overview' })
			}}
			onDecline={async (reason) => {
				await declineJob(jobId, reason)
				navigate({ to: '/job-offers' })
			}}
		/>
	)
}

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/job-detail/$jobId',
	beforeLoad: () => {
		const isExternalDriver = useAuthStore.getState().isExternalDriver
		if (!isExternalDriver) {
			throw redirect({ to: '/' })
		}
	},
	component: JobDetailScreen,
})
