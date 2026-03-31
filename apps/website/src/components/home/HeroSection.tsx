import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ScrollIndicator } from './ScrollIndicator'

const springTransition = {
	type: 'spring' as const,
	stiffness: 120,
	damping: 14,
}

export function HeroSection() {
	const { t } = useTranslation('website')

	return (
		<section className="relative h-screen flex items-center justify-center overflow-hidden">
			{/* Background placeholder for photography */}
			<div className="absolute inset-0 bg-[var(--color-canvas)]" />

			{/* Gradient overlay */}
			<div
				className="absolute inset-0"
				style={{
					background:
						'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7))',
				}}
			/>

			{/* Content */}
			<div className="relative z-10 flex flex-col items-center justify-center text-center text-white px-4 max-w-4xl">
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={springTransition}
					className="font-semibold text-[48px] leading-[1.1] max-md:text-[20px]"
				>
					{t('hero.headline')}
				</motion.h1>

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springTransition, delay: 0.1 }}
					className="mt-4 text-[20px] max-md:text-base opacity-85 max-w-[600px]"
				>
					{t('hero.subheadline')}
				</motion.p>

				{/* CTA cluster */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springTransition, delay: 0.15 }}
					className="mt-8 flex gap-4 max-md:flex-col max-md:w-full"
				>
					<Link
						to="/portal"
						className="inline-flex items-center justify-center bg-[var(--color-primary)] text-white font-semibold text-[18px] h-14 px-8 rounded-xl hover:bg-[var(--color-primary-hover)] transition-colors"
					>
						{t('cta.getQuote')}
					</Link>
					<Link
						to="/market"
						className="inline-flex items-center justify-center border border-white text-white font-semibold text-[18px] h-14 px-8 rounded-xl hover:bg-white/10 transition-colors"
					>
						{t('cta.browseMarket')}
					</Link>
				</motion.div>

				{/* Trust bar */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...springTransition, delay: 0.35 }}
					className="mt-8 flex gap-6 max-md:flex-col max-md:gap-2 font-mono text-sm opacity-70"
				>
					<span className="[direction:ltr] [unicode-bidi:embed]">
						{t('hero.trustProducts')}
					</span>
					<span className="max-md:hidden" aria-hidden="true">
						&middot;
					</span>
					<span className="[direction:ltr] [unicode-bidi:embed]">
						{t('hero.trustSuppliers')}
					</span>
					<span className="max-md:hidden" aria-hidden="true">
						&middot;
					</span>
					<span className="[direction:ltr] [unicode-bidi:embed]">
						{t('hero.trustResponse')}
					</span>
				</motion.div>
			</div>

			<ScrollIndicator />
		</section>
	)
}
