import { createFileRoute } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { ArrowRight, X } from 'lucide-react'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_website/careers')({
	head: () => ({
		meta: [
			{ title: 'Careers — HyperQuote' },
			{
				name: 'description',
				content: 'Join the HyperQuote team. Open positions in Cairo, Egypt.',
			},
			{ property: 'og:title', content: 'Careers — HyperQuote' },
			{
				property: 'og:description',
				content: 'Join the HyperQuote team. Open positions in Cairo, Egypt.',
			},
		],
	}),
	component: CareersPage,
})

const EASE = cubicBezier(0.25, 0.1, 0.25, 1)

const reveal = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: EASE },
	},
}

const stagger = (delay: number) => ({
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: EASE, delay },
	},
})

const viewportOnce = { once: true, margin: '-60px' as const }

const JOB_KEYS = ['job1', 'job2', 'job3', 'job4', 'job5', 'job6'] as const

function CareersPage() {
	const { t } = useTranslation('website')
	const [selectedJob, setSelectedJob] = useState<string | null>(null)

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<motion.section
				initial="hidden"
				animate="visible"
				variants={reveal}
				className="px-6 pb-20 pt-24 lg:px-12 lg:pb-32 lg:pt-36"
			>
				<div className="mx-auto max-w-[1200px]">
					<p className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text)] opacity-25 tracking-widest uppercase mb-6">
						{t('careers.location')}
					</p>
					<h1 className="max-w-[900px]">
						<span
							className="block font-light leading-[1.05] tracking-[-0.03em] text-[var(--color-text-muted)]"
							style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
						>
							{t('careers.heroLine1')}
						</span>
						<span
							className="block font-bold leading-[1.05] tracking-[-0.03em] mt-2"
							style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
						>
							{t('careers.heroLine2')}
						</span>
					</h1>
					<p className="mt-6 font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-primary)] opacity-70 tracking-wide">
						{t('careers.openCount')}
					</p>
				</div>
			</motion.section>

			{/* Why */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={reveal}
				className="px-6 py-20 lg:px-12 lg:py-28"
			>
				<div className="mx-auto max-w-[720px]">
					<p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
						{t('careers.why.p1')}
					</p>

					<motion.blockquote
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={stagger(0.1)}
						className="my-12 lg:my-16"
					>
						<p
							className="font-bold leading-[1.2] tracking-[-0.02em]"
							style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2rem)' }}
						>
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
						variants={stagger(0.1)}
						className="my-12 lg:my-16"
					>
						<p
							className="font-bold leading-[1.2] tracking-[-0.02em]"
							style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2rem)' }}
						>
							{t('careers.why.pullquote2')}
						</p>
					</motion.blockquote>

					<p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
						{t('careers.why.p3')}
					</p>
				</div>
			</motion.section>

			{/* Divider */}
			<div className="mx-auto max-w-[1200px] px-6 lg:px-12">
				<div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
			</div>

			{/* Open Positions */}
			<section className="px-6 py-20 lg:px-12 lg:py-28">
				<div className="mx-auto max-w-[1200px]">
					<motion.h2
						initial="hidden"
						whileInView="visible"
						viewport={viewportOnce}
						variants={reveal}
						className="font-bold tracking-[-0.02em] mb-12"
						style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}
					>
						{t('careers.positions.heading')}
					</motion.h2>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{JOB_KEYS.map((key, i) => (
							<motion.div
								key={key}
								initial="hidden"
								whileInView="visible"
								viewport={viewportOnce}
								variants={stagger(i * 0.06)}
							>
								<button
									type="button"
									onClick={() =>
										setSelectedJob(selectedJob === key ? null : key)
									}
									className={`w-full text-start cursor-pointer border rounded-xl p-6 transition-colors ${
										selectedJob === key
											? 'border-[var(--color-primary)] bg-[var(--color-subtle)]'
											: 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
									}`}
								>
									<span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.08em] text-[var(--color-primary)] uppercase block mb-3">
										{t(`careers.positions.${key}.department`)}
									</span>
									<h3 className="text-[17px] font-semibold tracking-[-0.01em]">
										{t(`careers.positions.${key}.title`)}
									</h3>
									<div className="flex items-baseline gap-3 mt-2 text-[13px] text-[var(--color-text-muted)]">
										<span>{t(`careers.positions.${key}.location`)}</span>
										<span className="opacity-30">&middot;</span>
										<span>{t(`careers.positions.${key}.type`)}</span>
									</div>
								</button>
							</motion.div>
						))}
					</div>

					{/* Application form — reveals when a position is selected */}
					<AnimatePresence>
						{selectedJob && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.4, ease: EASE }}
								className="overflow-hidden"
							>
								<div className="mt-10">
									<div className="flex items-start justify-between mb-10">
										<div>
											<h3 className="text-[20px] font-bold tracking-[-0.02em]">
												{t(
													`careers.positions.${selectedJob}.title` as ParseKeys<'website'>,
												)}
											</h3>
											<p className="text-[13px] text-[var(--color-text-muted)] mt-1">
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
											onClick={() => setSelectedJob(null)}
											className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors"
										>
											<X size={16} />
										</button>
									</div>

									<form
										action={`mailto:careers@hyperquote.net?subject=Application: ${t(`careers.positions.${selectedJob}.title` as ParseKeys<'website'>)}`}
										method="GET"
									>
										{/* Two-column grid on desktop */}
										<div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-8">
											{/* Left column */}
											<div className="flex flex-col gap-8">
												{/* Position (read-only) */}
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
														className="h-[48px] w-full border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent ps-0 text-[16px] outline-none opacity-50"
													/>
												</div>

												{/* Name */}
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

												{/* Email */}
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

												{/* Phone */}
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

											{/* Right column */}
											<div className="flex flex-col gap-8">
												{/* Cover letter — full height */}
												<div className="flex-1 flex flex-col">
													<span className="mb-2 block text-[11px] font-medium uppercase tracking-[.1em] opacity-30">
														{t('careers.coverLetter', {
															defaultValue: 'Tell us about yourself',
														})}
													</span>
													<textarea
														rows={8}
														className="flex-1 w-full border-0 border-b border-[var(--color-text)]/[0.1] bg-transparent ps-0 py-3 text-[16px] outline-none transition-colors duration-200 focus:border-[var(--color-primary)]/40 resize-none"
													/>
												</div>

												{/* Submit */}
												<div className="flex items-center justify-between">
													<p className="text-[12px] text-[var(--color-text-subtle)]">
														careers@hyperquote.net
													</p>
													<button
														type="submit"
														className="flex h-12 items-center justify-center rounded-lg bg-[var(--color-primary)] px-10 text-[15px] font-semibold text-white outline-none transition-all duration-200 hover:bg-[var(--color-primary-hover)]"
													>
														{t('support.form.submit')}
													</button>
												</div>
											</div>
										</div>
									</form>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</section>

			{/* Divider */}
			<div className="mx-auto max-w-[1200px] px-6 lg:px-12">
				<div className="h-px bg-[var(--color-text)] opacity-[0.07]" />
			</div>

			{/* Bottom CTA */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={reveal}
				className="px-6 py-24 lg:px-12 lg:py-36"
			>
				<div className="mx-auto max-w-[1200px] text-center">
					<p
						className="font-bold tracking-[-0.03em] mb-6"
						style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
					>
						{t('careers.cta.headline')}
					</p>
					<a
						href="mailto:careers@hyperquote.net"
						className="inline-flex items-center gap-2 text-[15px] font-medium text-[var(--color-primary)] hover:opacity-70 transition-opacity"
					>
						careers@hyperquote.net
						<ArrowRight size={15} className="icon-end" />
					</a>
				</div>
			</motion.section>
		</div>
	)
}
