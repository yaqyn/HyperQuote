import { createFileRoute, Link } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { revealUp, viewportOnce } from '../../components/shared/motionVariants'
import { websiteHead } from '../../lib/seo'

export const Route = createFileRoute('/_website/about')({
	head: () =>
		websiteHead({
			title: 'About — HyperQuote',
			description:
				'HyperQuote connects contractors with verified suppliers across Egypt through one platform for sourcing, quoting, payment coordination, and delivery.',
			path: '/about',
		}),
	component: AboutPage,
})

const VALUE_KEYS = ['value1', 'value2', 'value3'] as const
const TEAM_KEYS = ['member1', 'member2', 'member3', 'member4'] as const

function AboutPage() {
	const { t } = useTranslation('website')

	return (
		<div className="min-h-screen">
			<motion.section
				initial="hidden"
				animate="visible"
				variants={revealUp}
				className="px-4 pb-10 pt-28 sm:px-6 sm:pt-32 lg:px-12 lg:pb-14 lg:pt-40"
			>
				<div className="mx-auto grid max-w-[1400px] gap-10 border-t border-[var(--site-rule)] pt-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:gap-20">
					<div>
						<p className="hq-kicker mb-5 text-[var(--color-primary)]">
							{t('about.established')}
						</p>
						<h1 className="hq-display hq-title-hero max-w-[1000px] font-bold text-[var(--color-text)]">
							<span className="block">{t('about.heroLine1')}</span>
							<span className="block text-[var(--color-primary)]">
								{t('about.heroLine2')}
							</span>
						</h1>
					</div>
					<div className="max-w-[360px] lg:justify-self-end">
						<p className="text-[15px] leading-7 text-[var(--color-text-muted)]">
							{t('about.heroSubheadline')}
						</p>
					</div>
				</div>
			</motion.section>

			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="px-4 sm:px-6 lg:px-12"
			>
				<figure className="hq-photo-frame relative mx-auto max-w-[1400px] overflow-hidden">
					<img
						src="/images/cairo-material-yard.webp"
						alt={t('about.imageAlt')}
						className="aspect-[4/3] w-full object-cover sm:aspect-[16/8] lg:aspect-[21/8]"
					/>
					<figcaption className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/70 backdrop-blur-sm sm:px-5">
						<span>{t('about.imageCaption')}</span>
					</figcaption>
				</figure>
			</motion.section>

			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="px-4 sm:px-6 lg:px-12"
			>
				<div className="mx-auto grid max-w-[1400px] gap-10 border-b border-[var(--site-rule)] py-16 lg:grid-cols-[minmax(260px,0.34fr)_minmax(0,0.66fr)] lg:gap-24 lg:py-24">
					<div>
						<p className="hq-kicker text-[var(--color-primary)]">
							{t('about.story.label')}
						</p>
						<h2 className="hq-display hq-title-subsection mt-4 max-w-[360px] font-bold">
							{t('about.story.heading')}
						</h2>
					</div>
					<div className="grid gap-6 text-[15px] leading-[1.85] text-[var(--color-text-muted)] sm:grid-cols-2">
						<p>{t('about.story.p1')}</p>
						<div className="space-y-6">
							<p>{t('about.story.p2')}</p>
							<p className="border-s-2 border-[var(--color-primary)] ps-5 font-semibold text-[var(--color-text)]">
								{t('about.story.p3')}
							</p>
						</div>
					</div>
				</div>
			</motion.section>

			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				data-theme="dark"
				className="bg-[#101010] text-white"
			>
				<div className="hq-page-shell py-16 lg:py-24">
					<div className="mb-10 border-b border-white/15 pb-6 lg:mb-14">
						<div>
							<p className="hq-kicker text-[#75a2ff]">
								{t('about.mission.label')}
							</p>
							<h2 className="hq-display hq-title-subsection mt-4 font-bold">
								{t('about.mission.heading')}
							</h2>
						</div>
					</div>
					<div className="grid border-t border-white/15 lg:grid-cols-3">
						{VALUE_KEYS.map((key) => (
							<div
								key={key}
								className="border-b border-white/15 py-7 lg:border-e lg:px-7 lg:first:ps-0 lg:last:border-e-0 lg:last:pe-0"
							>
								<h3 className="hq-display text-[22px] font-bold leading-tight text-white sm:text-[24px]">
									{t(`about.mission.${key}.title` as ParseKeys<'website'>)}
								</h3>
								<p className="mt-4 max-w-[380px] text-[14px] leading-7 text-white/50">
									{t(
										`about.mission.${key}.description` as ParseKeys<'website'>,
									)}
								</p>
							</div>
						))}
					</div>
				</div>
			</motion.section>

			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={revealUp}
				className="hq-page-shell py-16 lg:py-24"
			>
				<div className="grid gap-10 lg:grid-cols-[0.34fr_0.66fr] lg:gap-24">
					<div>
						<p className="hq-kicker text-[var(--color-primary)]">
							{t('about.team.label')}
						</p>
						<h2 className="hq-display hq-title-subsection mt-4 font-bold">
							{t('about.team.heading')}
						</h2>
					</div>
					<div className="grid sm:grid-cols-2">
						{TEAM_KEYS.map((key) => (
							<div
								key={key}
								className="border-t border-[var(--site-rule)] py-5 sm:odd:pe-6 sm:even:ps-6"
							>
								<div>
									<p className="text-[15px] font-semibold">
										{t(`about.team.${key}.name` as ParseKeys<'website'>)}
									</p>
									<p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
										{t(`about.team.${key}.role` as ParseKeys<'website'>)}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</motion.section>

			<section className="bg-[var(--color-primary)] text-white">
				<div className="hq-page-shell flex flex-col gap-8 py-14 sm:flex-row sm:items-end sm:justify-between lg:py-20">
					<div>
						<h2 className="hq-display hq-title-section font-bold">
							{t('about.careers.heading')}
						</h2>
						<p className="mt-5 max-w-[640px] text-[15px] leading-7 text-white/70">
							{t('about.careers.description')}
						</p>
					</div>
					<Link
						to="/careers"
						className="inline-flex h-13 min-w-[220px] items-center justify-between border border-white/35 px-5 text-[14px] font-semibold transition-colors hover:bg-white hover:text-[var(--color-primary)]"
					>
						{t('about.careers.cta')}
						<ArrowRight size={17} className="icon-end" />
					</Link>
				</div>
			</section>
		</div>
	)
}
