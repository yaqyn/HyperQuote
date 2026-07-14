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
			<header className="px-4 pt-28 pb-10 sm:px-6 sm:pb-12 md:px-8 lg:px-12 lg:pt-40 lg:pb-16">
				<div className="mx-auto max-w-[720px]">
					<motion.div
						initial="hidden"
						animate="visible"
						variants={reveal}
						className="border-t border-[var(--site-rule)] pt-5"
					>
						<p className="hq-kicker text-[var(--color-primary)]">HQ / LEGAL</p>
						<h1 className="hq-display mt-5 text-[clamp(3rem,7vw,5.5rem)] font-bold leading-[0.94]">
							{title}
						</h1>
						<p className="mt-5 font-mono text-[11px] text-[var(--color-text-subtle)]">
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
							<div className="flex items-start gap-5">
								<span className="mt-1 font-mono text-[9px] text-[var(--color-primary)]">
									{section.number}
								</span>
								<h2 className="hq-display text-[20px] font-bold">
									{section.title}
								</h2>
							</div>
							<div className="mt-5 space-y-4 ps-8">
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
