import { createFileRoute } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { ArrowRight, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	EASE,
	revealUp,
	staggerUp,
	viewportOnce,
} from '../../components/shared/motionVariants'
import { websiteHead } from '../../lib/seo'

export const Route = createFileRoute('/_website/careers')({
	head: () =>
		websiteHead({
			title: 'Careers — HyperQuote',
			description:
				'Join HyperQuote in Cairo and help build the operating layer for Egypt’s building materials market.',
			path: '/careers',
		}),
	component: CareersPage,
})

const JOB_KEYS = ['job1', 'job2', 'job3', 'job4', 'job5', 'job6'] as const

function CareersPage() {
	const { t } = useTranslation('website')
	const [selectedJob, setSelectedJob] = useState<string | null>(null)

	function handleJobSelect(key: string) {
		const nextJob = selectedJob === key ? null : key
		setSelectedJob(nextJob)
		if (!nextJob) return
		window.setTimeout(() => {
			document
				.getElementById('application-form')
				?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}, 120)
	}

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<motion.section
				initial="hidden"
				animate="visible"
				variants={revealUp}
				className="px-4 pb-12 pt-28 sm:px-6 sm:pt-32 lg:px-12 lg:pb-16 lg:pt-40"
			>
				<div className="mx-auto grid max-w-[1400px] gap-10 border-t border-[var(--site-rule)] pt-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end lg:gap-20">
					<div>
						<p className="hq-kicker mb-5 text-[var(--color-primary)]">
							{t('careers.location')}
						</p>
						<h1 className="hq-display hq-title-hero max-w-[1000px] font-bold text-[var(--color-text)]">
							<span className="block">{t('careers.heroLine1')}</span>
							<span className="block text-[var(--color-primary)]">
								{t('careers.heroLine2')}
							</span>
						</h1>
					</div>
					<div className="border-s border-[var(--site-rule)] py-2 ps-6">
						<p className="hq-display text-[38px] font-bold leading-none text-[var(--color-primary)]">
							{String(JOB_KEYS.length).padStart(2, '0')}
						</p>
						<p className="mt-2 text-[13px] font-semibold text-[var(--color-text)]">
							{t('careers.openCount')}
						</p>
					</div>
				</div>
			</motion.section>

			{/* Why */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="border-t border-[var(--site-rule)] px-4 py-16 sm:px-6 lg:px-12 lg:py-24"
			>
				<div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:gap-24">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={staggerUp(0.1)}
					>
						<h2 className="hq-display hq-title-subsection font-bold">
							{t('careers.why.heading')}
						</h2>
					</motion.div>
					<div className="space-y-7 border-s border-[var(--site-rule)] ps-6 text-[15px] leading-[1.85] text-[var(--color-text-muted)] sm:ps-8">
						<p>{t('careers.why.p1')}</p>
						<p>{t('careers.why.p2')}</p>
						<p>{t('careers.why.p3')}</p>
					</div>
				</div>
			</motion.section>

			{/* Open Positions */}
			<section className="border-t border-[var(--site-rule)] px-4 py-16 sm:px-6 lg:px-12 lg:py-24">
				<div className="mx-auto max-w-[1400px]">
					<motion.h2
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={revealUp}
						className="hq-display hq-title-section mb-10 border-b border-[var(--site-rule)] pb-6 font-bold"
					>
						{t('careers.positions.heading')}
					</motion.h2>

					<div className="grid grid-cols-1">
						{JOB_KEYS.map((key, i) => (
							<motion.div
								key={key}
								initial="hidden"
								whileInView="visible"
								viewport={viewportOnce}
								variants={staggerUp(i * 0.06)}
								className="contents"
							>
								<button
									type="button"
									onClick={() => handleJobSelect(key)}
									aria-expanded={selectedJob === key}
									className={`grid w-full cursor-pointer gap-3 border-b border-[var(--site-rule)] px-1 py-5 text-start transition-colors sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:py-6 ${
										selectedJob === key
											? 'bg-[var(--site-blue-wash)]'
											: 'hover:bg-[var(--site-concrete)]'
									}`}
								>
									<span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-primary)]">
										{t(`careers.positions.${key}.department`)}
									</span>
									<h3 className="text-[18px] font-semibold sm:text-[20px]">
										{t(`careers.positions.${key}.title`)}
									</h3>
									<div className="flex flex-wrap items-baseline gap-3 text-[12px] text-[var(--color-text-muted)] sm:justify-end">
										<span>{t(`careers.positions.${key}.location`)}</span>
										<span className="opacity-30">&middot;</span>
										<span>{t(`careers.positions.${key}.type`)}</span>
									</div>
								</button>
								<AnimatePresence>
									{selectedJob === key && (
										<ApplicationForm
											selectedJob={selectedJob}
											onClose={() => setSelectedJob(null)}
										/>
									)}
								</AnimatePresence>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Bottom CTA */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="bg-[var(--color-primary)] px-4 py-12 text-white sm:px-6 lg:px-12 lg:py-16"
			>
				<div className="mx-auto max-w-[1200px] text-center">
					<p className="hq-display hq-title-section mb-6 font-bold">
						{t('careers.cta.headline')}
					</p>
					<a
						href="mailto:careers@hyperquote.net"
						className="hq-action hq-action--white mx-auto min-w-[250px]"
					>
						careers@hyperquote.net
						<ArrowRight size={15} className="hq-action__icon icon-end" />
					</a>
				</div>
			</motion.section>
		</div>
	)
}

function ApplicationForm({
	selectedJob,
	onClose,
}: {
	selectedJob: string
	onClose: () => void
}) {
	const { t } = useTranslation('website')

	return (
		<motion.div
			id="application-form"
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ duration: 0.4, ease: EASE }}
			className="col-span-full scroll-mt-20 overflow-hidden"
		>
			<div className="mx-auto mt-1 max-w-[760px] rounded-xl border border-[var(--color-text)]/[0.08] bg-[var(--color-surface)]/45 p-5 sm:p-6 md:p-8 lg:max-w-none">
				<div className="mb-8 flex items-start justify-between gap-4 sm:mb-10">
					<div className="min-w-0 text-center lg:text-start">
						<h3 className="text-[20px] font-bold tracking-normal">
							{t(
								`careers.positions.${selectedJob}.title` as ParseKeys<'website'>,
							)}
						</h3>
						<p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
							{t(
								`careers.positions.${selectedJob}.department` as ParseKeys<'website'>,
							)}{' '}
							·{' '}
							{t(
								`careers.positions.${selectedJob}.location` as ParseKeys<'website'>,
							)}{' '}
							·{' '}
							{t(
								`careers.positions.${selectedJob}.type` as ParseKeys<'website'>,
							)}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label={t('a11y.close')}
						className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)]"
					>
						<X size={16} />
					</button>
				</div>

				<form
					action={`mailto:careers@hyperquote.net?subject=Application: ${t(`careers.positions.${selectedJob}.title` as ParseKeys<'website'>)}`}
					method="GET"
				>
					<div className="grid grid-cols-1 gap-y-7 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-8">
						<div className="flex flex-col gap-7 lg:gap-8">
							<div>
								<span className="mb-2 block text-[11px] font-medium uppercase tracking-[.1em] opacity-30">
									{t('careers.positionLabel', {
										defaultValue: 'Position',
									})}
								</span>
								<input
									type="text"
									value={t(
										`careers.positions.${selectedJob}.title` as ParseKeys<'website'>,
									)}
									readOnly
									className="h-[48px] w-full border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent ps-0 text-[16px] opacity-50 outline-none"
								/>
							</div>

							<div>
								<span className="mb-2 block text-[11px] font-medium uppercase tracking-[.1em] opacity-30">
									{t('support.form.name')}
								</span>
								<input
									type="text"
									required
									className="h-[48px] w-full border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent ps-0 text-[16px] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]/40"
								/>
							</div>

							<div>
								<span className="mb-2 block text-[11px] font-medium uppercase tracking-[.1em] opacity-30">
									{t('support.form.email')}
								</span>
								<input
									type="email"
									required
									className="h-[48px] w-full border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent ps-0 text-[16px] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]/40"
								/>
							</div>

							<div>
								<span className="mb-2 block text-[11px] font-medium uppercase tracking-[.1em] opacity-30">
									{t('support.form.phone')}
								</span>
								<input
									type="tel"
									className="h-[48px] w-full border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent ps-0 text-[16px] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]/40"
								/>
							</div>
						</div>

						<div className="flex flex-col gap-7 lg:gap-8">
							<div className="flex flex-1 flex-col">
								<span className="mb-2 block text-[11px] font-medium uppercase tracking-[.1em] opacity-30">
									{t('careers.coverLetter', {
										defaultValue: 'Tell us about yourself',
									})}
								</span>
								<textarea
									rows={8}
									className="min-h-[160px] w-full flex-1 resize-none border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent py-3 ps-0 text-[16px] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]/40"
								/>
							</div>

							<div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-center text-[12px] text-[var(--color-text-subtle)] sm:text-start">
									careers@hyperquote.net
								</p>
								<button
									type="submit"
									className="hq-action hq-action--primary h-12 w-full justify-center px-10 sm:w-auto"
								>
									{t('support.form.submit')}
								</button>
							</div>
						</div>
					</div>
				</form>
			</div>
		</motion.div>
	)
}
