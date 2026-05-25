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
				className="px-4 pb-12 pt-24 sm:px-6 sm:pb-14 sm:pt-28 md:px-8 lg:px-12 lg:pb-24 lg:pt-36"
			>
				<div className="mx-auto max-w-[1200px] text-center lg:text-start">
					<p className="mb-5 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-normal text-[var(--color-text-subtle)] sm:mb-6">
						{t('careers.location')}
					</p>
					<h1 className="mx-auto max-w-[900px] lg:mx-0">
						<span className="block text-[clamp(2.25rem,10vw,3.8rem)] font-light leading-[1.05] tracking-normal text-[var(--color-text-muted)]">
							{t('careers.heroLine1')}
						</span>
						<span className="mt-2 block text-[clamp(2.25rem,10vw,3.8rem)] font-bold leading-[1.05] tracking-normal">
							{t('careers.heroLine2')}
						</span>
					</h1>
					<p className="mt-6 font-[family-name:var(--font-mono)] text-[12px] tracking-normal text-[var(--color-primary)] opacity-80">
						{t('careers.openCount')}
					</p>
				</div>
			</motion.section>

			{/* Why */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="px-4 py-12 sm:px-6 sm:py-14 md:px-8 lg:px-12 lg:py-24"
			>
				<div className="mx-auto max-w-[720px] text-center lg:text-start">
					<p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
						{t('careers.why.p1')}
					</p>

					<motion.blockquote
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={staggerUp(0.1)}
						className="my-9 sm:my-11 lg:my-14"
					>
						<p className="text-[clamp(1.35rem,6vw,2rem)] font-bold leading-[1.2] tracking-normal">
							{t('careers.why.pullquote1')}
						</p>
					</motion.blockquote>

					<p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
						{t('careers.why.p2')}
					</p>

					<motion.blockquote
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={staggerUp(0.1)}
						className="my-9 sm:my-11 lg:my-14"
					>
						<p className="text-[clamp(1.35rem,6vw,2rem)] font-bold leading-[1.2] tracking-normal">
							{t('careers.why.pullquote2')}
						</p>
					</motion.blockquote>

					<p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
						{t('careers.why.p3')}
					</p>
				</div>
			</motion.section>

			{/* Divider */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 lg:px-12">
				<div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
			</div>

			{/* Open Positions */}
			<section className="px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-24">
				<div className="mx-auto max-w-[1200px]">
					<motion.h2
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={revealUp}
						className="mb-8 text-center text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-normal sm:mb-10 lg:mb-12 lg:text-start"
					>
						{t('careers.positions.heading')}
					</motion.h2>

					<div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
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
									className={`w-full cursor-pointer rounded-xl border p-5 text-center transition-colors sm:p-6 lg:text-start ${
										selectedJob === key
											? 'border-[var(--color-primary)] bg-[var(--color-subtle)]'
											: 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
									}`}
								>
									<span className="mb-3 block font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-normal text-[var(--color-primary)]">
										{t(`careers.positions.${key}.department`)}
									</span>
									<h3 className="text-[17px] font-semibold tracking-normal">
										{t(`careers.positions.${key}.title`)}
									</h3>
									<div className="mt-2 flex flex-wrap items-baseline justify-center gap-3 text-[13px] text-[var(--color-text-muted)] lg:justify-start">
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

			{/* Divider */}
			<div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 lg:px-12">
				<div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
			</div>

			{/* Bottom CTA */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="px-4 py-16 sm:px-6 md:px-8 lg:px-12 lg:py-28"
			>
				<div className="mx-auto max-w-[1200px] text-center">
					<p className="mb-6 text-[clamp(2.35rem,10vw,4rem)] font-bold tracking-normal">
						{t('careers.cta.headline')}
					</p>
					<a
						href="mailto:careers@hyperquote.net"
						className="inline-flex items-center gap-2 text-[15px] font-medium text-[var(--color-primary)] transition-opacity hover:opacity-70"
					>
						careers@hyperquote.net
						<ArrowRight size={15} className="icon-end" />
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
									className="flex h-12 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-10 text-[15px] font-semibold text-white outline-none transition-all duration-200 hover:bg-[var(--color-primary-hover)] sm:w-auto"
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
