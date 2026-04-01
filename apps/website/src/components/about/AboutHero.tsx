import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

const spring = { type: 'spring' as const, stiffness: 200, damping: 20 }

export function AboutHero() {
	const { t } = useTranslation('website')

	return (
		<section className="relative min-h-[70vh] flex items-center overflow-hidden bg-[var(--color-base)]">
			{/* Grid texture */}
			<div
				className="absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage:
						'linear-gradient(var(--color-text) 1px, transparent 1px), linear-gradient(90deg, var(--color-text) 1px, transparent 1px)',
					backgroundSize: '60px 60px',
				}}
			/>

			<div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-16">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
					{/* Left — Copy */}
					<div>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={spring}
							className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)] mb-4"
						>
							{t('about.label')}
						</motion.p>
						<motion.h1
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.06 }}
							className="text-[44px] lg:text-[56px] leading-[1.08] font-bold tracking-tight text-[var(--color-text)]"
						>
							{t('about.heroHeadline')}
						</motion.h1>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.12 }}
							className="mt-6 text-[18px] text-[var(--color-text-muted)] leading-relaxed max-w-[460px]"
						>
							{t('about.heroSubheadline')}
						</motion.p>
					</div>

					{/* Right — Image */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ ...spring, delay: 0.1 }}
					>
						<div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg">
							<img
								src="https://websiteassets.hyperquote.net/Images/cairo.webp"
								alt=""
								className="h-full w-full object-cover"
							/>
							<div
								className="absolute inset-x-0 bottom-0 h-1/3"
								style={{
									background:
										'linear-gradient(to top, rgba(37,99,235,0.12), transparent)',
								}}
							/>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	)
}
