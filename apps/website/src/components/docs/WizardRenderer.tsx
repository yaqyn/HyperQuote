import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { AnimatePresence, cubicBezier, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WizardStep } from '../../content/registry'
import { AskLyonPill } from './AskLyonPill'
import { WizardIllustration } from './WizardIllustration'

interface WizardRendererProps {
	steps: WizardStep[]
	guideSlug: string
	guideTitleKey: string
}

const EASE = cubicBezier(0.25, 0.1, 0.25, 1)

export function WizardRenderer({
	steps,
	guideSlug,
	guideTitleKey,
}: WizardRendererProps) {
	const { t } = useTranslation('website')
	const [currentStep, setCurrentStep] = useState(0)
	const [direction, setDirection] = useState(1) // 1 = forward, -1 = back
	const step = steps[currentStep]

	const goTo = useCallback(
		(idx: number) => {
			if (idx < 0 || idx >= steps.length) return
			setDirection(idx > currentStep ? 1 : -1)
			setCurrentStep(idx)
		},
		[currentStep, steps.length],
	)

	const next = useCallback(() => goTo(currentStep + 1), [goTo, currentStep])
	const prev = useCallback(() => goTo(currentStep - 1), [goTo, currentStep])

	// Keyboard navigation
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
				e.preventDefault()
				next()
			} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
				e.preventDefault()
				prev()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [next, prev])

	const isFirst = currentStep === 0
	const isLast = currentStep === steps.length - 1

	return (
		<div className="mx-auto max-w-[720px]">
			{/* Progress */}
			<div className="mb-6 flex items-center justify-between sm:mb-8">
				<span className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-text-subtle)]">
					{currentStep + 1} / {steps.length}
				</span>
				<div className="relative mx-4 h-px flex-1 bg-[var(--color-text)]/[0.07]">
					<div
						className="absolute inset-y-0 start-0 bg-[var(--color-primary)] transition-all duration-300 ease-out"
						style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
					/>
				</div>
				{/* Step dots */}
				<div className="flex gap-1.5">
					{steps.map((s, i) => (
						<button
							key={s.id}
							type="button"
							onClick={() => goTo(i)}
							className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
								i === currentStep
									? 'bg-[var(--color-primary)] scale-125'
									: i < currentStep
										? 'bg-[var(--color-primary)]/40'
										: 'bg-[var(--color-text)]/[0.12]'
							}`}
							aria-label={`${t('docs.wizard.step', { defaultValue: 'Step' })} ${i + 1}`}
						/>
					))}
				</div>
			</div>

			{/* Step content */}
			<AnimatePresence mode="wait" custom={direction}>
				<motion.div
					key={step.id}
					custom={direction}
					initial={{ opacity: 0, x: direction * 40 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: direction * -40 }}
					transition={{ duration: 0.25, ease: EASE }}
				>
					{/* Illustration */}
					<WizardIllustration
						type={step.illustration}
						className="mb-6 aspect-[16/9] rounded-lg sm:mb-8"
					/>

					{/* Text */}
					<div className="mb-3 flex flex-col items-center justify-center gap-1 lg:flex-row lg:items-baseline lg:justify-start lg:gap-3">
						<span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-text-subtle)]">
							{String(currentStep + 1).padStart(2, '0')}
						</span>
						<h2 className="min-w-0 text-[20px] font-semibold tracking-normal sm:text-[22px]">
							{t(step.titleKey, { defaultValue: step.title })}
						</h2>
					</div>

					<p className="mx-auto mb-4 max-w-[560px] text-start text-[15px] leading-[1.8] text-[var(--color-text-muted)] lg:mx-0 lg:max-w-none lg:ps-8">
						{t(step.bodyKey, { defaultValue: step.body })}
					</p>

					{step.tipText && (
						<div className="mb-4 lg:ps-8">
							<div className="mx-auto max-w-[520px] border-t border-[var(--color-primary)]/30 pt-3 lg:mx-0 lg:max-w-none lg:border-t-0 lg:border-s-2 lg:py-2 lg:ps-4">
								<p className="text-start text-[13px] leading-relaxed text-[var(--color-text-muted)]">
									{t(step.tip ?? '', { defaultValue: step.tipText })}
								</p>
							</div>
						</div>
					)}

					{/* Step link — opens in new tab to preserve wizard state */}
					{step.link && (
						<div className="mt-4 text-center lg:ps-8 lg:text-start">
							<a
								href={step.link.to}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)] hover:opacity-70 transition-opacity"
							>
								{t(step.link.labelKey, { defaultValue: step.link.label })}
								<ArrowRight size={13} className="icon-end" />
							</a>
						</div>
					)}

					{/* Ask Lyon for this step */}
					<div className="mt-4 text-center lg:ps-8 lg:text-start">
						<AskLyonPill
							contextKey="docs.askLyonContext.helpMeWith"
							contextVars={{
								step: t(step.titleKey, { defaultValue: step.title }),
								guide: t(guideTitleKey, { defaultValue: guideSlug }),
							}}
						/>
					</div>
				</motion.div>
			</AnimatePresence>

			{/* Navigation */}
			<div className="mt-10 flex items-center justify-between gap-4 border-t border-[var(--color-text)]/[0.07] pt-6 sm:mt-12 sm:pt-8">
				<button
					type="button"
					onClick={prev}
					disabled={isFirst && !isLast}
					className={`inline-flex min-h-11 items-center gap-2 text-[14px] font-medium transition-colors ${
						isFirst && !isLast
							? 'opacity-25 cursor-not-allowed'
							: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
					}`}
				>
					<ArrowLeft size={15} className="icon-end" />
					{t('docs.wizard.previous', { defaultValue: 'Previous' })}
				</button>

				{isLast ? (
					<button
						type="button"
						onClick={() => goTo(0)}
						className="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]"
					>
						<RotateCcw size={14} />
						{t('docs.wizard.startOver', { defaultValue: 'Start over' })}
					</button>
				) : (
					<button
						type="button"
						onClick={next}
						className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-primary)]"
					>
						{t('docs.wizard.next', { defaultValue: 'Next' })}
						<ArrowRight size={15} className="icon-end" />
					</button>
				)}
			</div>
		</div>
	)
}
