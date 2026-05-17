import { cubicBezier, motion } from 'motion/react'

interface LegalSection {
	number: string
	title: string
	content: string[]
}

interface LegalDocumentPageProps {
	title: string
	effectiveDate: string
	sections: LegalSection[]
}

const reveal = {
	hidden: { opacity: 0, y: 16 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: cubicBezier(0.25, 0.1, 0.25, 1) },
	},
}

const viewportOnce = { once: true, margin: '-60px' as const }

export function LegalDocumentPage({
	title,
	effectiveDate,
	sections,
}: LegalDocumentPageProps) {
	return (
		<div dir="ltr" className="min-h-screen">
			<header className="px-4 pt-24 pb-10 sm:px-6 sm:pb-12 md:px-8 lg:px-12 lg:pt-36 lg:pb-16">
				<div className="mx-auto max-w-[720px]">
					<motion.div initial="hidden" animate="visible" variants={reveal}>
						<h1 className="text-center text-[32px] font-bold leading-tight tracking-normal lg:text-start lg:text-[40px]">
							{title}
						</h1>
						<p className="mt-4 text-center font-mono text-[12px] tracking-normal text-[var(--color-text-subtle)] lg:text-start">
							{effectiveDate}
						</p>
					</motion.div>
				</div>
			</header>

			<div className="px-4 pb-20 sm:px-6 md:px-8 lg:px-12 lg:pb-24">
				<div className="mx-auto max-w-[720px]">
					{sections.map((section, i) => (
						<motion.section
							key={section.number}
							initial="hidden"
							whileInView="visible"
							viewport={viewportOnce}
							variants={reveal}
							className={
								i > 0
									? 'mt-12 pt-12 border-t border-[var(--color-text)]/[0.06]'
									: ''
							}
						>
							<h2 className="text-center text-[18px] font-semibold tracking-normal lg:text-start">
								{section.title}
							</h2>
							<div className="mt-4 space-y-4">
								{section.content.map((paragraph) => (
									<p
										key={paragraph}
										className="text-[15px] leading-[1.8] text-[var(--color-text-muted)]"
									>
										{paragraph}
									</p>
								))}
							</div>
						</motion.section>
					))}

					<footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[var(--color-text)]/[0.06] pt-8 text-center lg:flex-row lg:text-start">
						<span className="font-mono text-[11px] opacity-20">
							HyperQuote Technologies Ltd. · Cairo, Egypt
						</span>
						<button
							type="button"
							onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
							className="font-mono text-[11px] opacity-20 transition-opacity hover:opacity-50"
						>
							↑
						</button>
					</footer>
				</div>
			</div>
		</div>
	)
}
