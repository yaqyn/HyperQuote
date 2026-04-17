import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { markAsWon } from '../../../lib/server/sales-pipeline'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'
import { Button } from '../../ui'
import { ConvertToOrderDialog } from './ConvertToOrderDialog'
import { MarkAsLostDialog } from './MarkAsLostDialog'
import { NegotiationThread } from './NegotiationThread'
import { SideBySideComparison } from './SideBySideComparison'
import { VersionTimeline } from './VersionTimeline'
import { WhatIfCalculator } from './WhatIfCalculator'

// ─── Main Component ─────────────────────────────────────────

interface NegotiationViewProps {
	quoteId: string
	onReviseQuote?: () => void
	onMarkAsWon?: () => void
	onBack?: () => void
}

export function NegotiationView({
	quoteId,
	onReviseQuote,
	onMarkAsWon,
	onBack,
}: NegotiationViewProps) {
	const { t } = useTranslation('internal')
	const [selectedVersions, setSelectedVersions] = useState<[string, string]>([
		`${quoteId}-v1`,
		quoteId,
	])
	const [showLostDialog, setShowLostDialog] = useState(false)
	const [showConvertDialog, setShowConvertDialog] = useState(false)
	const [showAcceptCounterDialog, setShowAcceptCounterDialog] = useState(false)
	const [isAcceptingCounter, setIsAcceptingCounter] = useState(false)
	const [whatIfExpanded, setWhatIfExpanded] = useState(false)

	async function handleAcceptCounter() {
		setIsAcceptingCounter(true)
		try {
			await markAsWon({ data: { quoteId } })
			setShowAcceptCounterDialog(false)
			onMarkAsWon?.()
		} finally {
			setIsAcceptingCounter(false)
		}
	}

	function handleSelectVersion(versionId: string) {
		setSelectedVersions((prev: [string, string]) => {
			if (prev.includes(versionId)) return prev
			return [prev[1], versionId]
		})
	}

	return (
		<div className="flex h-full flex-col">
			{/* Top bar: Back + Actions — actions at the TOP, not buried */}
			<div className="shrink-0 border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
				<div className="flex items-center gap-2">
					{onBack && (
						<button
							type="button"
							onClick={onBack}
							className="text-[13px] text-[var(--color-primary)] transition-colors hover:underline me-3"
						>
							{t('sales.negotiation.backToPipeline', 'Back to Pipeline')}
						</button>
					)}

					<Button variant="primary" onPress={() => setShowConvertDialog(true)}>
						{t('sales.negotiation.actions.markAsWon', 'Mark as Won')}
					</Button>

					<Button
						variant="outline"
						onPress={() => setShowAcceptCounterDialog(true)}
					>
						{t('sales.negotiation.actions.acceptCounter', 'Accept Counter')}
					</Button>

					<Button variant="outline" onPress={onReviseQuote}>
						{t('sales.negotiation.actions.reviseQuote', 'Revise Quote')}
					</Button>

					<div className="flex-1" />

					<Button variant="ghost" onPress={() => setShowLostDialog(true)}>
						{t('sales.negotiation.actions.markAsLost', 'Mark as Lost')}
					</Button>
				</div>
			</div>

			{/* Split layout: Timeline (narrow left) + Content (right) */}
			<div className="flex min-h-0 flex-1">
				{/* Version Timeline — vertical thread on the left */}
				<div className="w-[280px] shrink-0 overflow-y-auto border-e border-black/[0.06] dark:border-white/[0.06]">
					<VersionTimeline
						quoteId={quoteId}
						selectedVersions={selectedVersions}
						onSelectVersion={handleSelectVersion}
					/>
				</div>

				{/* Main content area */}
				<div className="flex min-w-0 flex-1 flex-col">
					{/* Comparison + collapsible What-If */}
					<div className="flex min-h-0 flex-1">
						<div
							className={`flex flex-col overflow-hidden ${whatIfExpanded ? 'w-[60%]' : 'flex-1'}`}
						>
							<SideBySideComparison
								versionAId={selectedVersions[0]}
								versionBId={selectedVersions[1]}
							/>
						</div>
						{whatIfExpanded ? (
							<div className="w-[40%] overflow-hidden border-s border-black/[0.06] dark:border-white/[0.06]">
								<WhatIfCalculator
									quoteId={quoteId}
									onApplyMargins={onReviseQuote}
								/>
							</div>
						) : (
							<div className="shrink-0 border-s border-black/[0.06] dark:border-white/[0.06]">
								<button
									type="button"
									onClick={() => setWhatIfExpanded(true)}
									className="h-full px-3 text-[11px] font-medium text-[var(--color-primary)] transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02] [writing-mode:vertical-rl] rotate-180"
								>
									{t(
										'sales.negotiation.whatIfCalculator',
										'What-If Calculator',
									)}
								</button>
							</div>
						)}
					</div>

					{/* Negotiation Thread */}
					<NegotiationThread quoteId={quoteId} />
				</div>
			</div>

			{/* Dialogs */}
			<ConvertToOrderDialog
				quoteId={quoteId}
				isOpen={showConvertDialog}
				onOpenChange={setShowConvertDialog}
				onSuccess={(_orderNumber) => {
					onMarkAsWon?.()
				}}
			/>

			<MarkAsLostDialog
				quoteId={quoteId}
				isOpen={showLostDialog}
				onOpenChange={setShowLostDialog}
			/>

			{/* Accept Counter Confirmation Dialog */}
			<DispatchDialog
				isOpen={showAcceptCounterDialog}
				onClose={() => setShowAcceptCounterDialog(false)}
				size="sm"
				eyebrow="Negotiation · Counter-offer"
				title={t(
					'sales.negotiation.acceptCounter.title',
					'Accept counter-offer',
				)}
				caption={t(
					'sales.negotiation.acceptCounter.description',
					"Accept the customer's counter-offer? The quote updates with the counter terms.",
				)}
				dismissDisabled={isAcceptingCounter}
			>
				<DispatchBody>
					<p className="font-[family-name:var(--font-archivo)] italic text-[13.5px] text-[var(--color-text-muted)]">
						Confirming will transmit the updated quote.
					</p>
				</DispatchBody>
				<DispatchFooter>
					<DispatchAction
						tone="ghost"
						onPress={() => setShowAcceptCounterDialog(false)}
						isDisabled={isAcceptingCounter}
					>
						{t('common.cancel', 'Cancel')}
					</DispatchAction>
					<DispatchAction
						onPress={handleAcceptCounter}
						isDisabled={isAcceptingCounter}
					>
						{isAcceptingCounter
							? t('common.submitting', 'Submitting…')
							: t(
									'sales.negotiation.acceptCounter.confirm',
									'Accept & update quote',
								)}
					</DispatchAction>
				</DispatchFooter>
			</DispatchDialog>
		</div>
	)
}
