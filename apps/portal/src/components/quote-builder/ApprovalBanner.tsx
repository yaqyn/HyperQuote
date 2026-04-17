/**
 * ApprovalBanner: renders a single pending approval item for approver review.
 * Shows requester info, item count, and Approve/Request Changes actions.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { Button, TextArea } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { PendingApproval } from '../../lib/server/approvals'
import { approveQuoteRequest, requestChanges } from '../../lib/server/approvals'

interface ApprovalBannerProps {
	approval: PendingApproval
}

export function ApprovalBanner({ approval }: ApprovalBannerProps) {
	const { t } = useTranslation('portal')
	const queryClient = useQueryClient()
	const [showNotes, setShowNotes] = useState(false)
	const [notes, setNotes] = useState('')

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
	}, [queryClient])

	const approveMutation = useMutation({
		mutationFn: () =>
			approveQuoteRequest({ data: { approvalId: approval.approvalId } }),
		onSuccess: invalidate,
	})

	const changesMutation = useMutation({
		mutationFn: () =>
			requestChanges({
				data: { approvalId: approval.approvalId, notes: notes || undefined },
			}),
		onSuccess: () => {
			setShowNotes(false)
			setNotes('')
			invalidate()
		},
	})

	// Relative time
	const timeAgo = getRelativeTime(approval.quoteRequest.createdAt)

	return (
		<div className="rounded-xl border border-[var(--color-border)] p-4 flex flex-col gap-3">
			{/* Header */}
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<p className="text-sm text-[var(--color-text)]">
						{t('quoteBuilder.approverNotification', {
							name: approval.quoteRequest.requestedBy.name,
							count: approval.quoteRequest.itemCount,
						}).replace(String(approval.quoteRequest.itemCount), '')}
						<span className="font-mono">{approval.quoteRequest.itemCount}</span>{' '}
						{t('quoteBuilder.itemCount', {
							count: approval.quoteRequest.itemCount,
						}).replace(String(approval.quoteRequest.itemCount), '')}
					</p>
					<p className="text-[13px] text-[var(--color-text-muted)]">
						{timeAgo}
					</p>
				</div>

				{/* Status badge */}
				<span className="shrink-0 px-2.5 py-0.5 rounded-full text-[13px] font-normal bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
					Pending Approval
				</span>
			</div>

			{/* Notes input (shown when "Request Changes" is clicked) */}
			{showNotes && (
				<div className="flex flex-col gap-2">
					<TextArea
						value={notes}
						onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
						placeholder="Notes (optional)"
						className="w-full h-20 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-transparent text-sm text-[var(--color-text)] resize-none outline-none focus:border-[var(--color-primary)]"
					/>
					<div className="flex items-center gap-2 justify-end">
						<Button
							onPress={() => {
								setShowNotes(false)
								setNotes('')
							}}
							className="h-9 px-3 rounded-lg text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer transition-colors"
						>
							Cancel
						</Button>
						<Button
							onPress={() => changesMutation.mutate()}
							isDisabled={changesMutation.isPending}
							className="h-9 px-4 rounded-lg border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors disabled:opacity-50"
						>
							{changesMutation.isPending
								? '...'
								: t('quoteBuilder.requestChanges')}
						</Button>
					</div>
				</div>
			)}

			{/* Actions */}
			{!showNotes && (
				<div className="flex items-center gap-3">
					<Button
						onPress={() => approveMutation.mutate()}
						isDisabled={approveMutation.isPending}
						className="h-11 px-5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold cursor-pointer transition-opacity disabled:opacity-50"
					>
						{approveMutation.isPending
							? '...'
							: t('quoteBuilder.approveAndSubmit')}
					</Button>
					<Button
						onPress={() => setShowNotes(true)}
						className="h-10 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
					>
						{t('quoteBuilder.requestChanges')}
					</Button>
				</div>
			)}
		</div>
	)
}

/** Simple relative time formatter */
function getRelativeTime(dateStr: string): string {
	const now = Date.now()
	const date = new Date(dateStr).getTime()
	const diff = now - date

	const minutes = Math.floor(diff / 60_000)
	if (minutes < 1) return 'Just now'
	if (minutes < 60) return `${minutes}m ago`

	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`

	const days = Math.floor(hours / 24)
	return `${days}d ago`
}
