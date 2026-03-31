import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

export function AboutHero() {
	const { t } = useTranslation('website')

	return (
		<section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
			{/* Background placeholder */}
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
			<div className="relative z-10 text-center px-6">
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ type: 'spring', stiffness: 120, damping: 14 }}
					className="font-semibold text-[48px] max-md:text-[20px] leading-[1.1] text-white"
				>
					{t('about.heroHeadline')}
				</motion.h1>
			</div>
		</section>
	)
}
