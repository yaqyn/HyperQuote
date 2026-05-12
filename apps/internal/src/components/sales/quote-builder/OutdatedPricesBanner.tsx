import { Check, Loader2 } from 'lucide-react'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../../shared/EmployeeControls'

interface OutdatedPricesBannerProps {
	outdatedCount: number
	urgentCount: number
	pendingRequest: number
	isRequesting: boolean
	allRequested: boolean
	onRequestAll: () => void
}

/**
 * Quote-level notice when a quote has line items whose supplier price has
 * gone stale. Rendered as a ruled strip — italic summary on the leading
 * edge, italic word-action on the trailing edge — with an amber signal
 * dot. Lives right above the line items table; the rep reads it without
 * losing their place in the list.
 */
export function OutdatedPricesBanner({
	outdatedCount,
	urgentCount,
	pendingRequest,
	isRequesting,
	allRequested,
	onRequestAll,
}: OutdatedPricesBannerProps) {
	const headline = `${outdatedCount} ${
		outdatedCount === 1 ? 'item has' : 'items have'
	} outdated prices`

	return (
		<div
			role="status"
			aria-live="polite"
			className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-4"
			style={{
				borderTop: '1px solid var(--color-border)',
				borderBottom: '1px solid var(--color-border)',
			}}
		>
			<span
				aria-hidden="true"
				className="shrink-0 self-center rounded-full"
				style={{
					width: 6,
					height: 6,
					backgroundColor: 'var(--color-signal-amber)',
				}}
			/>
			<p
				className="flex-1 font-[family-name:var(--font-archivo)] italic"
				style={{
					fontSize: '12px',
					color: 'var(--color-text)',
					letterSpacing: '-0.005em',
				}}
			>
				{headline}
				{urgentCount > 0 && (
					<>
						<span className="text-[var(--color-text-subtle)]"> · </span>
						<span style={{ color: 'var(--color-signal-red)' }}>
							{urgentCount} urgent (recently ordered)
						</span>
					</>
				)}
			</p>

			{allRequested ? (
				<EmployeeStatusPill
					tone="success"
					leading={<Check size={14} strokeWidth={2.25} aria-hidden="true" />}
				>
					Inventory notified
				</EmployeeStatusPill>
			) : (
				<EmployeeActionButton
					onClick={onRequestAll}
					disabled={isRequesting || pendingRequest === 0}
					tone="primary"
					size="sm"
					leading={
						isRequesting ? (
							<Loader2
								size={13}
								strokeWidth={2.25}
								className="animate-spin"
								aria-hidden="true"
							/>
						) : null
					}
					aria-label={
						isRequesting
							? 'Requesting updated prices'
							: `Request updated prices for ${pendingRequest} items`
					}
				>
					{isRequesting
						? 'Requesting prices'
						: `Request updated prices (${pendingRequest})`}
				</EmployeeActionButton>
			)}
		</div>
	)
}
