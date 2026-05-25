import type { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export function invalidateRfqDecisionQueries(
	queryClient: QueryClient,
	rfqId: string,
) {
	queryClient.invalidateQueries({ queryKey: ['rfq-queue'] })
	queryClient.invalidateQueries({ queryKey: ['sales-rfq-list'] })
	queryClient.invalidateQueries({ queryKey: ['rfq-detail', rfqId] })
}

export function RfqDecisionSummary({
	reason,
	note,
	proofFileName,
}: {
	reason: string
	note: string
	proofFileName: string | null | undefined
}) {
	const trimmedNote = note.trim()
	return (
		<div className="space-y-3 font-[family-name:var(--font-archivo)] text-[13.5px] text-[var(--color-text-muted)]">
			<RfqDecisionSummaryItem label="Reason">
				<span className="font-medium text-[var(--color-text)]">{reason}</span>
			</RfqDecisionSummaryItem>
			{trimmedNote && (
				<RfqDecisionSummaryItem label="Note">
					<span className="italic">{trimmedNote}</span>
				</RfqDecisionSummaryItem>
			)}
			<RfqDecisionSummaryItem label="Proof">
				<span className="font-medium text-[var(--color-text)]">
					{proofFileName ?? 'Missing proof'}
				</span>
			</RfqDecisionSummaryItem>
		</div>
	)
}

function RfqDecisionSummaryItem({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<p>
			<span className="mb-0.5 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
				{label}
			</span>
			{children}
		</p>
	)
}

export function RfqDecisionError({
	error,
	fallback,
}: {
	error: unknown
	fallback: string
}) {
	return (
		<p className="mt-4 rounded-md border border-[#B3261E]/30 bg-[#B3261E]/10 px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] text-[#B3261E]">
			{error instanceof Error ? error.message : fallback}
		</p>
	)
}
