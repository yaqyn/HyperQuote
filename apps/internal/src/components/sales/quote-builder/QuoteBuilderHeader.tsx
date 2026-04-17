import { useEffect, useState } from 'react'
import { Button, Tooltip, TooltipTrigger } from 'react-aria-components'
import type { QuoteStatus } from '../../../types/sales'

interface QuoteBuilderHeaderProps {
	quoteNumber: string
	version: number
	status: QuoteStatus
	customerName: string
	customerTier: string
	rfqReference: string
	lastSavedAt: Date | null
	onSaveDraft: () => void
	onPreviewPdf: () => void
	onRequestApproval: () => void
	onSendToCustomer: () => void
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
	draft: 'Draft',
	internal_review: 'Internal Review',
	pending_approval: 'Pending Approval',
	approved: 'Approved',
	sent: 'Sent',
	viewed: 'Viewed',
	negotiating: 'Negotiating',
	revised: 'Revised',
	accepted: 'Accepted',
	declined: 'Declined',
	expired: 'Expired',
}

function getStatusStyle(status: QuoteStatus): string {
	switch (status) {
		case 'draft':
			return 'bg-black/[0.04] text-[var(--color-text-muted)] dark:bg-white/[0.06]'
		case 'pending_approval':
		case 'internal_review':
			return 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300'
		case 'sent':
		case 'viewed':
		case 'approved':
			return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:bg-[var(--color-primary)]/20'
		case 'negotiating':
		case 'revised':
			return 'bg-black/[0.04] text-[var(--color-text-muted)] dark:bg-white/[0.06]'
		case 'accepted':
			return 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300'
		case 'declined':
		case 'expired':
			return 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
	}
}

function AutoSaveIndicator({ lastSavedAt }: { lastSavedAt: Date | null }) {
	const [, setTick] = useState(0)

	useEffect(() => {
		if (!lastSavedAt) return
		const interval = setInterval(() => setTick((t) => t + 1), 1000)
		return () => clearInterval(interval)
	}, [lastSavedAt])

	if (!lastSavedAt) return null

	const secondsAgo = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)
	const display =
		secondsAgo < 60
			? `Saved ${secondsAgo}s ago`
			: `Saved ${Math.floor(secondsAgo / 60)}m ago`

	return (
		<span className="text-[11px] text-[var(--color-text-subtle)] transition-opacity">
			{display}
		</span>
	)
}

function IconButton({
	onPress,
	label,
	children,
	variant = 'ghost',
}: {
	onPress: () => void
	label: string
	children: React.ReactNode
	variant?: 'ghost' | 'primary'
}) {
	return (
		<TooltipTrigger delay={3000}>
			<Button
				className={`rounded-lg p-2 outline-none transition-colors
          data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/50
          ${
						variant === 'primary'
							? 'bg-[var(--color-primary)] text-white data-[hovered]:bg-[var(--color-primary)]/90'
							: 'text-[var(--color-text-muted)] data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.06]'
					}`}
				onPress={onPress}
				aria-label={label}
			>
				{children}
			</Button>
			<Tooltip
				className="rounded-md bg-black/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg dark:bg-white/90 dark:text-black"
				offset={6}
			>
				{label}
			</Tooltip>
		</TooltipTrigger>
	)
}

export function QuoteBuilderHeader({
	quoteNumber,
	version,
	status,
	lastSavedAt,
	onSaveDraft,
	onPreviewPdf,
	onRequestApproval,
	onSendToCustomer,
}: QuoteBuilderHeaderProps) {
	return (
		<div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-2.5 dark:border-white/[0.06]">
			{/* Left: Quote identity */}
			<div className="flex items-center gap-3">
				<span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-semibold tabular-nums tracking-tight">
					{quoteNumber}
				</span>
				<span className="rounded bg-black/[0.04] px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] font-medium tabular-nums dark:bg-white/[0.06]">
					v{version}
				</span>
				<span
					className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusStyle(status)}`}
				>
					{STATUS_LABELS[status]}
				</span>
				<AutoSaveIndicator lastSavedAt={lastSavedAt} />
			</div>

			{/* Right: Icon-only action buttons */}
			<div className="flex items-center gap-1">
				{/* Save */}
				<IconButton onPress={onSaveDraft} label="Save draft">
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M3 13V3a1 1 0 011-1h6.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V13a1 1 0 01-1 1H4a1 1 0 01-1-1z"
							stroke="currentColor"
							strokeWidth="1.25"
						/>
						<path
							d="M6 2v3h4V2M6 14v-4h4v4"
							stroke="currentColor"
							strokeWidth="1.25"
						/>
					</svg>
				</IconButton>

				{/* Preview */}
				<IconButton onPress={onPreviewPdf} label="Preview PDF">
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M2 8s2.5-4.5 6-4.5S14 8 14 8s-2.5 4.5-6 4.5S2 8 2 8z"
							stroke="currentColor"
							strokeWidth="1.25"
						/>
						<circle
							cx="8"
							cy="8"
							r="2"
							stroke="currentColor"
							strokeWidth="1.25"
						/>
					</svg>
				</IconButton>

				{/* Approve */}
				<IconButton onPress={onRequestApproval} label="Request approval">
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M4 8.5l3 3 5-5.5"
							stroke="currentColor"
							strokeWidth="1.25"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</IconButton>

				{/* Send */}
				<IconButton
					onPress={onSendToCustomer}
					label="Send to customer"
					variant="primary"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						aria-hidden="true"
					>
						<path
							d="M14 2L7 9M14 2l-4.5 12L7 9 2 7.5 14 2z"
							stroke="currentColor"
							strokeWidth="1.25"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</IconButton>
			</div>
		</div>
	)
}
