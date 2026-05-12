import { createFileRoute, Link } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { ArrowRight } from 'lucide-react'
import { cubicBezier, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_website/about')({
	head: () => ({
		meta: [
			{ title: 'About — HyperQuote' },
			{
				name: 'description',
				content:
					'HyperQuote connects contractors with verified suppliers across Egypt. One platform for sourcing, quoting, and delivery.',
			},
		],
	}),
	component: AboutPage,
})

const VALUE_KEYS = ['value1', 'value2', 'value3'] as const
const TEAM_KEYS = ['member1', 'member2', 'member3', 'member4'] as const

const reveal = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: cubicBezier(0.25, 0.1, 0.25, 1) },
	},
}

const viewportOnce = { once: true, margin: '-60px' as const }

function AboutPage() {
	const { t } = useTranslation('website')

	return (
		<div className="min-h-screen">
			{/* Hero */}
			<motion.section
				initial="hidden"
				animate="visible"
				variants={reveal}
				className="px-4 pt-24 pb-12 sm:px-6 sm:pt-28 md:px-8 md:pt-32 md:pb-16 lg:px-16 lg:pt-40 lg:pb-20"
			>
				<div className="mx-auto max-w-[1400px] text-center lg:text-start">
					<span className="mb-8 block font-mono text-[12px] uppercase tracking-normal text-[var(--color-text-subtle)] sm:mb-10">
						{t('about.established')}
					</span>
					<h1 className="mx-auto max-w-[920px] text-[clamp(2.65rem,13vw,4.75rem)] leading-[1.04] tracking-normal lg:mx-0 lg:text-[clamp(3.75rem,7vw,6rem)]">
						<span className="block font-light">{t('about.heroLine1')}</span>
						<span className="block font-bold">{t('about.heroLine2')}</span>
					</h1>
					<p className="mx-auto mt-8 max-w-[560px] text-[15px] leading-[1.85] text-[var(--color-text-muted)] sm:mt-10 sm:text-[16px] lg:mx-0">
						{t('about.heroSubheadline')}
					</p>
				</div>
			</motion.section>

			{/* Image */}
			<motion.div
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={reveal}
				className="px-4 sm:px-6 md:px-8 lg:px-16"
			>
				<div className="max-w-[1400px] mx-auto">
					<div className="aspect-[16/10] overflow-hidden rounded-xl sm:aspect-[16/7] sm:rounded-2xl lg:aspect-[21/8]">
						<img
							src="https://websiteassets.hyperquote.net/Images/boxtree.webp"
							alt=""
							className="h-full w-full object-cover"
						/>
					</div>
				</div>
			</motion.div>

			{/* Story */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={reveal}
				className="px-4 sm:px-6 md:px-8 lg:px-16"
			>
				<div className="max-w-[1400px] mx-auto border-t border-[var(--color-text)]/[0.06] py-14 sm:py-16 lg:py-24">
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.35fr_0.65fr] lg:gap-24">
						<h2 className="text-center text-[24px] font-bold leading-tight tracking-normal lg:sticky lg:top-24 lg:text-start lg:text-[28px]">
							{t('about.story.heading')}
						</h2>
						<div className="space-y-5 sm:space-y-6">
							<p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
								{t('about.story.p1')}
							</p>
							<p className="text-[15px] leading-[1.85] text-[var(--color-text-muted)]">
								{t('about.story.p2')}
							</p>
							<p className="text-[15px] leading-[1.85] text-[var(--color-text)]">
								{t('about.story.p3')}
							</p>
						</div>
					</div>
				</div>
			</motion.section>

			{/* Values */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={reveal}
				className="bg-[#0A0A0A]"
			>
				<div className="max-w-[1400px] mx-auto px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:px-16 lg:py-24">
					<h2 className="mb-10 text-center text-[24px] font-bold tracking-normal text-white md:mb-12 lg:mb-14 lg:text-start lg:text-[28px]">
						{t('about.mission.heading')}
					</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
						{VALUE_KEYS.map((key) => (
							<div
								key={key}
								className="rounded-xl bg-[#161616] p-6 text-center lg:p-8 lg:text-start"
							>
								<h3 className="mb-3 text-[17px] font-semibold text-white">
									{t(`about.mission.${key}.title` as ParseKeys<'website'>)}
								</h3>
								<p className="text-[14px] leading-[1.75] text-[#707070]">
									{t(
										`about.mission.${key}.description` as ParseKeys<'website'>,
									)}
								</p>
							</div>
						))}
					</div>
				</div>
			</motion.section>

			{/* Team */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={reveal}
				className="px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:px-16 lg:py-24"
			>
				<div className="max-w-[1400px] mx-auto">
					<h2 className="mb-10 text-center text-[24px] font-bold tracking-normal md:mb-12 lg:mb-14 lg:text-start lg:text-[28px]">
						{t('about.team.heading')}
					</h2>
					<div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 lg:gap-x-8 lg:gap-y-10">
						{TEAM_KEYS.map((key) => (
							<div key={key} className="text-center lg:text-start">
								<p className="text-[15px] font-semibold">
									{t(`about.team.${key}.name` as ParseKeys<'website'>)}
								</p>
								<p className="text-[13px] text-[var(--color-text-muted)] mt-1">
									{t(`about.team.${key}.role` as ParseKeys<'website'>)}
								</p>
							</div>
						))}
					</div>
				</div>
			</motion.section>

			{/* Careers CTA */}
			<motion.section
				initial="hidden"
				whileInView="visible"
				viewport={viewportOnce}
				variants={reveal}
				className="px-4 pb-14 sm:px-6 sm:pb-16 md:px-8 lg:px-16 lg:pb-24"
			>
				<div className="max-w-[1400px] mx-auto">
					<div className="flex flex-col items-center gap-8 rounded-xl bg-[var(--color-surface)] px-6 py-9 text-center sm:px-8 sm:py-12 lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-16 lg:text-start">
						<div>
							<h2 className="text-[24px] font-bold leading-tight tracking-normal lg:text-[32px]">
								{t('about.careers.heading')}
							</h2>
							<p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-[1.7] text-[var(--color-text-muted)] lg:mx-0">
								{t('about.careers.description')}
							</p>
						</div>
						<Link
							to="/careers"
							className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] sm:w-auto"
						>
							{t('about.careers.cta')}
							<ArrowRight size={16} className="icon-end" />
						</Link>
					</div>
				</div>
			</motion.section>
		</div>
	)
}
