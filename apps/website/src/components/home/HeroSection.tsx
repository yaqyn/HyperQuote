import { useRef, useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useLoginModal } from '../../hooks/useLoginModal'

const spring = { type: 'spring' as const, stiffness: 200, damping: 20 }

export function HeroSection() {
	const { t } = useTranslation('website')
	const { open: openLoginModal } = useLoginModal()
	const imageRef = useRef<HTMLDivElement>(null)
	const [parallax, setParallax] = useState({ x: 0, y: 0 })

	const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
		if (!imageRef.current) return
		const rect = imageRef.current.getBoundingClientRect()
		const cx = rect.left + rect.width / 2
		const cy = rect.top + rect.height / 2
		const x = ((e.clientX - cx) / rect.width) * -3
		const y = ((e.clientY - cy) / rect.height) * -3
		setParallax({ x, y })
	}, [])

	const handleMouseLeave = useCallback(() => {
		setParallax({ x: 0, y: 0 })
	}, [])

	return (
		<section
			className="relative min-h-screen flex items-center overflow-hidden bg-[var(--color-base)]"
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
		>
			{/* Subtle grid pattern background */}
			<div
				className="absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage:
						'linear-gradient(var(--color-text) 1px, transparent 1px), linear-gradient(90deg, var(--color-text) 1px, transparent 1px)',
					backgroundSize: '60px 60px',
				}}
			/>

			<div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
					{/* Left — Copy */}
					<div className="pt-24 lg:pt-0">
						<motion.h1
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={spring}
							className="text-[56px] lg:text-[72px] leading-[1.05] font-bold tracking-tight"
						>
							<span className="text-[var(--color-text)]">
								{t('hero.headlinePart1')}
							</span>
							<br />
							<span
								className="bg-clip-text text-transparent"
								style={{
									backgroundImage:
										'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #1D4ED8 100%)',
								}}
							>
								{t('hero.headlinePart2')}
							</span>
						</motion.h1>

						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.08 }}
							className="mt-6 text-[18px] lg:text-[20px] text-[var(--color-text-muted)] leading-relaxed max-w-[480px]"
						>
							{t('hero.subheadline')}
						</motion.p>

						{/* CTA cluster */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.14 }}
							className="mt-10 flex gap-4 max-sm:flex-col"
						>
							<button
								type="button"
								onClick={() => openLoginModal('/portal/quote')}
								className="inline-flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white font-semibold text-[16px] h-13 px-7 rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors"
							>
								{t('cta.getQuote')}
								<ArrowRight size={18} className="icon-end" />
							</button>
							<Link
								to="/market"
								className="inline-flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text)] font-semibold text-[16px] h-13 px-7 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
							>
								{t('cta.browseMarket')}
							</Link>
						</motion.div>

						{/* Trust stats */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.6, delay: 0.3 }}
							className="mt-12 flex gap-8 max-sm:gap-6"
						>
							{(['trustProducts', 'trustSuppliers', 'trustResponse'] as const).map(
								(key) => {
									const [num, ...rest] = t(`hero.${key}`).split(' ')
									return (
										<div key={key}>
											<span className="font-mono text-[28px] font-bold text-[var(--color-primary)] block leading-none">
												{num}
											</span>
											<span className="text-[13px] text-[var(--color-text-muted)] mt-1 block">
												{rest.join(' ')}
											</span>
										</div>
									)
								},
							)}
						</motion.div>
					</div>

					{/* Right — Hero image with parallax */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ ...spring, delay: 0.1 }}
						className="relative max-lg:order-first max-lg:pt-24"
						ref={imageRef}
					>
						<div className="relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg">
							<img
								src="https://websiteassets.hyperquote.net/Images/cairo.webp"
								alt={t('hero.imageAlt')}
								className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform"
								style={{
									transform: `translate(${parallax.x}px, ${parallax.y}px) scale(1.02)`,
								}}
							/>
							{/* Blue accent overlay at bottom */}
							<div
								className="absolute inset-x-0 bottom-0 h-1/3"
								style={{
									background:
										'linear-gradient(to top, rgba(37,99,235,0.15), transparent)',
								}}
							/>
						</div>

						{/* Floating stat card */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ ...spring, delay: 0.4 }}
							className="absolute -bottom-6 -start-6 bg-[var(--color-card)] rounded-xl p-4 shadow-lg border border-[var(--color-border)]"
						>
							<span className="font-mono text-[32px] font-bold text-[var(--color-primary)] leading-none block">
								{t('hero.floatStat')}
							</span>
							<span className="text-[13px] text-[var(--color-text-muted)] mt-1 block">
								{t('hero.floatLabel')}
							</span>
						</motion.div>
					</motion.div>
				</div>
			</div>
		</section>
	)
}
