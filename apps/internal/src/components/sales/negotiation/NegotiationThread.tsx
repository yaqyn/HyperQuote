import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addInternalNote } from '../../../lib/server/sales-activity'
import { getNegotiationHistory } from '../../../lib/server/sales-pipeline'
import { Button } from '../../ui'

// ─── Types ──────────────────────────────────────────────────

interface NegotiationEvent {
	id: string
	type: string
	description: string
	timestamp: string
	isInternal: boolean
	actor?: string
	amount?: number | null
	metadata?: Record<string, unknown> | null
}

// ─── Component ──────────────────────────────────────────────

interface NegotiationThreadProps {
	quoteId: string
}

export function NegotiationThread({ quoteId }: NegotiationThreadProps) {
	const { t } = useTranslation('internal')
	const [events, setEvents] = useState<NegotiationEvent[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [noteText, setNoteText] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		let cancelled = false
		setIsLoading(true)
		getNegotiationHistory({ data: { quoteId } })
			.then((raw: unknown) => {
				if (cancelled) return
				const result = raw as { events: NegotiationEvent[] }
				setEvents(result.events)
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [quoteId])

	async function handleAddNote() {
		if (!noteText.trim() || isSubmitting) return
		setIsSubmitting(true)

		try {
			const result = await addInternalNote({
				data: { entityType: 'quote', entityId: quoteId, note: noteText },
			})

			setEvents((prev: NegotiationEvent[]) => [
				...prev,
				{
					id: result.noteId,
					type: 'internal_note',
					description: noteText,
					timestamp: new Date().toISOString(),
					isInternal: true,
				},
			])
			setNoteText('')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className="border-t border-black/[0.06] dark:border-white/[0.06]">
			<div className="border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
				<h3 className="text-[13px] font-semibold text-[var(--color-text)]">
					{t('sales.negotiation.thread', 'Negotiation Thread')}
				</h3>
			</div>

			{/* Chat-bubble style messages — reverse chronological, latest at top */}
			<div className="max-h-80 space-y-3 overflow-y-auto px-5 py-4">
				{isLoading && (
					<div className="flex justify-center py-6">
						<svg
							aria-hidden="true"
							className="size-5 animate-spin text-[var(--color-text-subtle)]"
							viewBox="0 0 24 24"
							fill="none"
						>
							<circle
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="2"
								opacity="0.3"
							/>
							<path
								d="M12 2a10 10 0 0 1 10 10"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</div>
				)}
				{[...events]
					.sort(
						(a, b) =>
							new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
					)
					.map((event: NegotiationEvent) => {
						// Internal notes = our side (end-aligned), external = customer side (start-aligned)
						const isOurs = event.isInternal || event.type === 'quote_sent'

						return (
							<div
								key={event.id}
								className={[
									'flex',
									isOurs ? 'justify-end' : 'justify-start',
								].join(' ')}
							>
								<div
									className={[
										'max-w-[75%] rounded-xl px-4 py-2.5',
										isOurs
											? 'rounded-ee-sm bg-black/[0.04] dark:bg-white/[0.06]'
											: 'rounded-es-sm border border-black/[0.06] dark:border-white/[0.06]',
									].join(' ')}
								>
									<p className="text-[13px] leading-relaxed text-[var(--color-text)]">
										{event.description}
									</p>

									<div className="mt-1.5 flex items-center gap-2">
										{event.isInternal && (
											<span className="rounded bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)] dark:bg-white/[0.04]">
												Internal
											</span>
										)}
										<span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
											{new Date(event.timestamp).toLocaleDateString('en-GB', {
												day: '2-digit',
												month: 'short',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</span>
									</div>
								</div>
							</div>
						)
					})}
			</div>

			{/* Add Note */}
			<div className="flex gap-2 border-t border-black/[0.06] px-5 py-3 dark:border-white/[0.06]">
				<input
					type="text"
					value={noteText}
					onChange={(e) => setNoteText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							handleAddNote()
						}
					}}
					placeholder={t(
						'sales.negotiation.addNotePlaceholder',
						'Add internal note...',
					)}
					className="flex-1 rounded-full border border-black/[0.06] bg-transparent px-4 py-2 text-[13px] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] dark:border-white/[0.06]"
				/>
				<Button
					variant="primary"
					onPress={handleAddNote}
					isDisabled={!noteText.trim() || isSubmitting}
					className="shrink-0"
				>
					{t('sales.negotiation.addNote', 'Send')}
				</Button>
			</div>
		</div>
	)
}
