/**
 * Quote builder 3-step flow orchestrator.
 * Reads step from Zustand store, renders step content with transitions.
 * Back button, step indicator, step-specific content, and action bar.
 */

import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useCallback, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { toQuoteDraftPayload } from '../../lib/quote-request-payload'
import { saveDraft } from '../../lib/server/quote-requests'
import { useQuoteBuilderStore } from '../../stores/quote-builder'
import { StepIndicator } from './StepIndicator'
import { BuildListStep } from './step1/BuildListStep'
import { DetailsStep } from './step2/DetailsStep'
import { ReviewStep } from './step3/ReviewStep'

export function QuoteBuilderFlow() {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const step = useQuoteBuilderStore((s) => s.step)
	const items = useQuoteBuilderStore((s) => s.items)
	const setStep = useQuoteBuilderStore((s) => s.setStep)
	const hasInvalidItems = items.some(
		(item) => item.isUnmatched || !item.productId,
	)
	const [draftFeedback, setDraftFeedback] = useState<'saved' | 'error' | null>(
		null,
	)
	const isRTL = i18n.dir() === 'rtl'

	const BackArrow = isRTL ? ArrowRight : ArrowLeft

	const handleSaveDraft = useCallback(async () => {
		const state = useQuoteBuilderStore.getState()
		setDraftFeedback(null)
		try {
			const result = await saveDraft({
				data: toQuoteDraftPayload(state),
			})

			if (result.draftId && !state.draftId) {
				useQuoteBuilderStore.getState().setDraftId(result.draftId)
			}
			setDraftFeedback('saved')
		} catch {
			setDraftFeedback('error')
		}
	}, [])

	const handleContinue = useCallback(() => {
		if (step === 1 && items.length > 0 && !hasInvalidItems) {
			setStep(2)
		} else if (step === 2) {
			setStep(3)
		}
	}, [step, items.length, hasInvalidItems, setStep])

	return (
		<div className="flex flex-col h-full">
			{/* Back to Orders row */}
			<div className="flex items-center h-14 px-6">
				<Button
					onPress={() => navigate({ to: '/orders' })}
					className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
				>
					<BackArrow size={16} />
					<span>{t('quoteBuilder.backToOrders')}</span>
				</Button>
			</div>

			<StepIndicator currentStep={step} />

			<div className="flex-1 overflow-auto">
				<AnimatePresence mode="wait">
					{step === 1 && (
						<StepPanel key="step1">
							<BuildListStep />
						</StepPanel>
					)}
					{step === 2 && (
						<StepPanel key="step2" padded>
							<DetailsStep />
						</StepPanel>
					)}
					{step === 3 && (
						<StepPanel key="step3">
							<ReviewStep />
						</StepPanel>
					)}
				</AnimatePresence>
			</div>

			{/* Action bar at bottom -- Step 1 specific */}
			{step === 1 && (
				<div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] shrink-0">
					{/* Item count */}
					<span className="text-sm text-[var(--color-text)]">
						<span className="font-mono">{items.length}</span>{' '}
						{t('quoteBuilder.itemCount', { count: items.length }).replace(
							String(items.length),
							'',
						)}
					</span>

					<div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
						{draftFeedback && (
							<span
								role={draftFeedback === 'error' ? 'alert' : 'status'}
								className={`text-[13px] ${
									draftFeedback === 'error'
										? 'text-[#B91C1C]'
										: 'text-[var(--color-text-muted)]'
								}`}
							>
								{draftFeedback === 'error'
									? t('quoteBuilder.draftSaveFailed')
									: t('quoteBuilder.draftSaved')}
							</span>
						)}
						<Button
							onPress={handleSaveDraft}
							isDisabled={items.length === 0 || hasInvalidItems}
							className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
						>
							{t('quoteBuilder.saveAsDraft')}
						</Button>

						<Button
							onPress={handleContinue}
							isDisabled={items.length === 0 || hasInvalidItems}
							className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold transition-opacity cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
						>
							{t('quoteBuilder.continue')}
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}

function StepPanel({
	children,
	padded = false,
}: {
	children: ReactNode
	padded?: boolean
}) {
	return (
		<motion.div
			initial={{ opacity: 0, x: 16 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -16 }}
			transition={{ duration: 0.2 }}
			className={padded ? 'px-6 py-4' : undefined}
		>
			{children}
		</motion.div>
	)
}
