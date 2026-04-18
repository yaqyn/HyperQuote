import { Check, Loader2 } from 'lucide-react'
import { Button } from 'react-aria-components'

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
			className="flex items-baseline gap-4 py-2.5"
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
				<span
					className="inline-flex shrink-0 items-center gap-1 font-[family-name:var(--font-archivo)] italic"
					style={{
						fontSize: '11px',
						color: 'var(--color-primary)',
					}}
				>
					<Check size={11} strokeWidth={2} aria-hidden="true" />
					inventory notified
				</span>
			) : (
				<Button
					onPress={onRequestAll}
					isDisabled={isRequesting || pendingRequest === 0}
					className="group relative inline-flex shrink-0 items-baseline gap-1.5 font-[family-name:var(--font-archivo)] italic outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 rounded-sm data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
					style={{
						fontSize: '12px',
						color: 'var(--color-signal-red)',
					}}
					aria-label={
						isRequesting
							? 'Requesting updated prices'
							: `Request updated prices for ${pendingRequest} items`
					}
				>
					{isRequesting ? (
						<>
							<Loader2
								size={11}
								strokeWidth={2}
								className="animate-spin self-center"
								aria-hidden="true"
							/>
							<span>requesting…</span>
						</>
					) : (
						<span className="relative">
							request updated prices ({pendingRequest})
							<span
								aria-hidden="true"
								className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-current transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100"
							/>
						</span>
					)}
				</Button>
			)}
		</div>
	)
}
