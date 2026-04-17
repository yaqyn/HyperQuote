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
				className="px-6 lg:px-16 pt-28 pb-16 lg:pt-40 lg:pb-20"
			>
				<div className="max-w-[1400px] mx-auto">
					<span className="block font-mono text-[12px] tracking-[0.1em] uppercase mb-10 opacity-25">
						{t('about.established')}
					</span>
					<h1
						className="leading-[1.05] tracking-[-0.04em]"
						style={{ fontSize: 'clamp(2.8rem, 7vw, 6rem)' }}
					>
						<span className="block font-light">{t('about.heroLine1')}</span>
						<span className="block font-bold">{t('about.heroLine2')}</span>
					</h1>
					<p className="mt-10 text-[16px] leading-[1.85] text-[var(--color-text-muted)] max-w-[520px]">
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
				className="px-6 lg:px-16"
			>
				<div className="max-w-[1400px] mx-auto">
					<div className="aspect-[21/8] overflow-hidden rounded-2xl">
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
				className="px-6 lg:px-16"
			>
				<div className="max-w-[1400px] mx-auto border-t border-[var(--color-text)]/[0.06] py-20 lg:py-28">
					<div className="grid grid-cols-1 lg:grid-cols-[0.35fr_0.65fr] gap-12 lg:gap-24">
						<h2 className="text-[24px] lg:text-[28px] font-bold tracking-[-0.02em] leading-tight lg:sticky lg:top-24">
							{t('about.story.heading')}
						</h2>
						<div className="space-y-6">
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
				<div className="max-w-[1400px] mx-auto px-6 lg:px-16 py-20 lg:py-28">
					<h2 className="text-[24px] lg:text-[28px] font-bold tracking-[-0.02em] text-white mb-14">
						{t('about.mission.heading')}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{VALUE_KEYS.map((key) => (
							<div key={key} className="rounded-2xl bg-[#161616] p-8">
								<h3 className="text-[17px] font-semibold text-white mb-3">
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
				className="px-6 lg:px-16 py-20 lg:py-28"
			>
				<div className="max-w-[1400px] mx-auto">
					<h2 className="text-[24px] lg:text-[28px] font-bold tracking-[-0.02em] mb-14">
						{t('about.team.heading')}
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10">
						{TEAM_KEYS.map((key) => (
							<div key={key}>
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
				className="px-6 lg:px-16 pb-20 lg:pb-28"
			>
				<div className="max-w-[1400px] mx-auto">
					<div className="rounded-2xl bg-[var(--color-surface)] px-8 py-12 lg:px-14 lg:py-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
						<div>
							<h2 className="text-[24px] lg:text-[32px] font-bold tracking-[-0.02em] leading-tight">
								{t('about.careers.heading')}
							</h2>
							<p className="mt-3 text-[15px] leading-[1.7] text-[var(--color-text-muted)] max-w-[480px]">
								{t('about.careers.description')}
							</p>
						</div>
						<Link
							to="/careers"
							className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-[var(--color-primary)] text-[15px] font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors shrink-0"
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
