import { useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useScroll, useTransform, useMotionTemplate } from 'motion/react'
import { SectionReveal } from '../shared/SectionReveal'

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const
const IMAGES = [
	'https://websiteassets.hyperquote.net/Images/sea1.webp',
	'https://websiteassets.hyperquote.net/Images/truck1.webp',
]

export function HowItWorksSection() {
	const { t } = useTranslation('website')
	const sectionRef = useRef<HTMLElement>(null)
	const [activeImg, setActiveImg] = useState(0)

	useEffect(() => {
		const id = setInterval(() => {
			setActiveImg((p) => (p + 1) % IMAGES.length)
		}, 30000)
		return () => clearInterval(id)
	}, [])

	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ['start end', 'center center'],
	})

	// clip-path inset shrinks from edges → 0. Content never moves.
	const inset = useTransform(scrollYProgress, [0.5, 1], [40, 0])
	const radius = useTransform(scrollYProgress, [0.5, 1], [24, 0])
	const clipPath = useMotionTemplate`inset(0px ${inset}px 0px ${inset}px round ${radius}px)`

	return (
		<section ref={sectionRef} id="process" className="relative">
			<motion.div
				style={{ clipPath }}
				className="relative overflow-hidden bg-[#101010]"
			>
				{/* Images — crossfade */}
				<div className="absolute top-0 bottom-0 max-lg:hidden start-[55%] end-0">
					{IMAGES.map((src, i) => (
						<img
							key={src}
							src={src}
							alt=""
							className="absolute inset-0 h-full w-full object-cover object-left transition-opacity duration-[2s] ease-in-out"
							style={{ opacity: i === activeImg ? 1 : 0 }}
						/>
					))}
				</div>

				{/* Content — left side */}
				<div className="relative z-10 mx-auto px-8 sm:px-16 md:px-24 lg:px-32 xl:px-40 2xl:px-52">
					<div className="py-24 max-md:py-16 lg:w-[55%] lg:pe-16">
						<SectionReveal>
							<p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3B82F6] mb-3">
								{t('howItWorks.label')}
							</p>
							<h2 className="text-[36px] lg:text-[48px] font-extrabold text-white leading-[1.05] tracking-[-0.02em] whitespace-pre-line">
								{t('howItWorks.heading')}
							</h2>
						</SectionReveal>

						<div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-0">
							{STEP_KEYS.map((key, i) => (
								<SectionReveal key={key} delay={i * 0.06}>
									<div className="py-5 pe-6 border-t border-[#1E1E1E]">
										<span className="font-mono text-[12px] text-[#505050] block mb-2">
											{String(i + 1).padStart(2, '0')}
										</span>
										<h3 className="text-[16px] font-semibold text-white mb-1">
											{t(`howItWorks.${key}.title`)}
										</h3>
										<p className="text-[14px] text-[#808080] leading-relaxed">
											{t(`howItWorks.${key}.description`)}
										</p>
									</div>
								</SectionReveal>
							))}
						</div>
					</div>
				</div>

				{/* Mobile image */}
				<div className="lg:hidden relative aspect-[16/9]">
					<img
						src="https://websiteassets.hyperquote.net/Images/cairo.webp"
						alt={t('hero.imageAlt')}
						width={800}
						height={450}
						className="h-full w-full object-cover"
					/>
				</div>
			</motion.div>
		</section>
	)
}
