import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { JobCard } from '../../components/careers/JobCard'

export const Route = createFileRoute('/_website/careers')({
	head: () => ({
		meta: [
			{ title: 'Careers \u2014 HyperQuote' },
			{
				name: 'description',
				content:
					'Join the HyperQuote team. View open positions in Cairo, Egypt.',
			},
		],
	}),
	component: CareersPage,
})

function CareersPage() {
	const { t } = useTranslation('website')

	const jobs = [
		{
			titleKey: 'careers.jobs.fullStack',
			locationKey: 'careers.jobs.location',
			typeKey: 'careers.jobs.fullTime',
		},
		{
			titleKey: 'careers.jobs.operations',
			locationKey: 'careers.jobs.location',
			typeKey: 'careers.jobs.fullTime',
		},
		{
			titleKey: 'careers.jobs.logistics',
			locationKey: 'careers.jobs.location',
			typeKey: 'careers.jobs.fullTime',
		},
	]

	return (
		<section className="mx-auto max-w-[800px] px-6 py-12">
			<h1 className="text-3xl font-bold text-center mb-8">
				{t('careers.heading')}
			</h1>

			{jobs.length > 0 ? (
				<div>
					{jobs.map((job) => (
						<JobCard
							key={job.titleKey}
							title={t(job.titleKey)}
							location={t(job.locationKey)}
							type={t(job.typeKey)}
						/>
					))}
				</div>
			) : (
				<div className="text-center py-12">
					<p className="text-[var(--color-text-muted)]">
						{t('careers.noJobs')}{' '}
						<a
							href="mailto:careers@hyperquote.net"
							className="text-[var(--color-primary)] hover:underline"
						>
							{t('careers.sendCV')}
						</a>
					</p>
				</div>
			)}
		</section>
	)
}
