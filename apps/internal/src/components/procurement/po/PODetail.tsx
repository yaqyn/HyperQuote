import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getPODetail, updatePOStatus } from '../../../lib/server/procurement-po'
import type { POItem } from '../../../types/procurement'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'
import { Button as UiButton } from '../../ui'
import { PODocuments } from './PODocuments'
import { POStatusFlow } from './POStatusFlow'
import { ReceiveGoodsDialog } from './ReceiveGoodsDialog'
import { ThreeWayMatch } from './ThreeWayMatch'

// ─── Formatting ───────────────────────────────────────────

function formatEGP(value: number, locale: string): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: 'EGP',
		maximumFractionDigits: 0,
	}).format(value)
}

function formatDate(isoDate: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	}).format(new Date(isoDate))
}

function formatDateTime(isoDate: string, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(isoDate))
}

// ─── Confirmation Dialog ──────────────────────────────────

function ConfirmDialog({
	title,
	description,
	confirmLabel,
	onConfirm,
	isDestructive,
	children,
}: {
	title: string
	description: string
	confirmLabel: string
	onConfirm: () => void
	isDestructive?: boolean
	children: React.ReactNode
}) {
	const [isOpen, setIsOpen] = useState(false)
	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="contents"
			>
				{children}
			</button>
			<DispatchDialog
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				size="sm"
				eyebrow="Confirm action"
				title={title}
				caption={description}
			>
				<DispatchBody>
					<p className="font-[family-name:var(--font-archivo)] italic text-[13.5px] text-[var(--color-text-muted)]">
						{isDestructive
							? 'This action cannot be undone.'
							: 'Please confirm to proceed.'}
					</p>
				</DispatchBody>
				<DispatchFooter>
					<DispatchAction tone="ghost" onPress={() => setIsOpen(false)}>
						Cancel
					</DispatchAction>
					<DispatchAction
						tone={isDestructive ? 'danger' : 'primary'}
						onPress={() => {
							onConfirm()
							setIsOpen(false)
						}}
					>
						{confirmLabel}
					</DispatchAction>
				</DispatchFooter>
			</DispatchDialog>
		</>
	)
}

// ─── Activity Timeline (collapsible) ─────────────────────

function ActivityTimeline({
	timeline,
	locale,
}: {
	timeline: { timestamp: string; event: string; user: string }[]
	locale: string
}) {
	const [expanded, setExpanded] = useState(false)

	return (
		<section>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 outline-none transition-colors hover:text-black/50 dark:hover:text-white/50"
			>
				<svg
					aria-hidden="true"
					className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
					viewBox="0 0 16 16"
					fill="none"
				>
					<path
						d="M6 4L10 8L6 12"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				{expanded ? 'Hide activity' : `Show activity (${timeline.length})`}
			</button>
			{expanded && (
				<div className="mt-3 space-y-0">
					{timeline.length === 0 ? (
						<p className="text-[12px] text-black/40 dark:text-white/40">
							No activity yet
						</p>
					) : (
						timeline.map((entry, i) => (
							<div
								key={`${entry.timestamp}-${entry.event}`}
								className="flex items-start gap-3 py-1.5"
							>
								<div className="flex flex-col items-center pt-1.5">
									<div
										className={`size-1.5 rounded-full ${i === 0 ? 'bg-[#2563EB]' : 'bg-black/15 dark:bg-white/15'}`}
									/>
									{i < timeline.length - 1 && (
										<div className="w-px flex-1 mt-0.5 bg-black/[0.06] dark:bg-white/[0.06]" />
									)}
								</div>
								<div className="flex-1 min-w-0 pb-2">
									<p className="text-sm text-black/70 dark:text-white/70">
										{entry.event}
									</p>
									<div className="flex items-center gap-2 mt-0.5">
										<span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">
											{formatDateTime(entry.timestamp, locale)}
										</span>
										<span className="text-[12px] text-black/40 dark:text-white/40">
											{entry.user}
										</span>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			)}
		</section>
	)
}

// ─── Component ────────────────────────────────────────────

interface PODetailProps {
	poId: string
	onBack: () => void
}

export function PODetail({ poId, onBack }: PODetailProps) {
	const { i18n } = useTranslation('internal')
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'
	const queryClient = useQueryClient()

	const [receiveOpen, setReceiveOpen] = useState(false)

	const { data, isLoading } = useQuery({
		queryKey: ['po-detail', poId],
		queryFn: () => getPODetail({ data: { poId } }),
		staleTime: 30_000,
	})

	const statusMutation = useMutation({
		mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
			updatePOStatus({ data: { poId, status, reason } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['po-detail', poId] })
			queryClient.invalidateQueries({ queryKey: ['po-list'] })
		},
	})

	if (isLoading || !data) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-sm text-black/40 dark:text-white/40">Loading...</p>
			</div>
		)
	}

	const { po, timeline } = data

	return (
		<motion.div
			initial={{ opacity: 0, x: 12 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ type: 'spring', stiffness: 200, damping: 20 }}
			className="flex flex-col gap-10 px-6 py-6 overflow-auto"
		>
			{/* 1. Back */}
			<UiButton variant="ghost" className="self-start" onPress={onBack}>
				<span className="inline-flex items-center gap-1">
					<svg
						aria-hidden="true"
						className="h-3 w-3 rtl:rotate-180"
						viewBox="0 0 16 16"
						fill="none"
					>
						<path
							d="M10 4L6 8L10 12"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					Back
				</span>
			</UiButton>

			{/* 2. Document header */}
			<div className="flex items-start justify-between">
				<div>
					<h2 className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-black dark:text-white">
						{po.poNumber}
					</h2>
					<p className="mt-1 text-sm text-black/50 dark:text-white/50">
						{po.supplierName}
					</p>
					<p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/40 dark:text-white/40">
						{po.codedDeliveryReference}
					</p>
				</div>
				<div className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-black dark:text-white">
					{formatEGP(po.total, locale)}
				</div>
			</div>

			{/* 3. Status pipeline (moved up) */}
			<POStatusFlow currentStatus={po.status} />

			{/* 4. Action needed banner */}
			{(po.status === 'shipped' || po.status === 'partially_received') &&
				(() => {
					const shippedEntry = timeline.find((e: { event: string }) =>
						e.event.toLowerCase().includes('ship'),
					)
					const daysSinceShipped = shippedEntry
						? Math.round(
								(Date.now() - new Date(shippedEntry.timestamp).getTime()) /
									86_400_000,
							)
						: 0
					return (
						<div className="flex items-center gap-2.5 rounded-lg bg-[#2563EB]/[0.06] px-4 py-3">
							<svg
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="shrink-0 text-[#2563EB]"
							>
								<circle cx="12" cy="12" r="10" />
								<path d="M12 8v4" />
								<path d="M12 16h.01" />
							</svg>
							<span className="text-[13px] text-[#2563EB]">
								Action Required: Receive goods
								{daysSinceShipped > 0 && (
									<span className="ms-1 text-[12px] opacity-70">
										(shipped{' '}
										<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
											{daysSinceShipped}
										</span>{' '}
										day{daysSinceShipped !== 1 ? 's' : ''} ago)
									</span>
								)}
							</span>
						</div>
					)
				})()}

			{/* 5. Actions (contextual buttons) */}
			<div className="flex items-center gap-2">
				{/* Draft: Send to Supplier */}
				{po.status === 'draft' && (
					<ConfirmDialog
						title="Send to Supplier"
						description="This will send the purchase order to the supplier for confirmation."
						confirmLabel="Send PO"
						onConfirm={() => statusMutation.mutate({ status: 'sent' })}
					>
						<UiButton variant="primary">Send to Supplier</UiButton>
					</ConfirmDialog>
				)}

				{/* Shipped / Partially Received: Receive Goods */}
				{(po.status === 'shipped' || po.status === 'partially_received') && (
					<UiButton variant="primary" onPress={() => setReceiveOpen(true)}>
						Receive Goods
					</UiButton>
				)}

				{/* Received: Mark Inspected */}
				{po.status === 'received' && (
					<ConfirmDialog
						title="Mark Inspected"
						description="Mark this PO as quality inspection complete?"
						confirmLabel="Confirm Inspection"
						onConfirm={() => statusMutation.mutate({ status: 'inspected' })}
					>
						<UiButton variant="primary">Mark Inspected</UiButton>
					</ConfirmDialog>
				)}

				{/* Inspected: Close PO */}
				{po.status === 'inspected' && (
					<ConfirmDialog
						title="Close PO"
						description="Close this PO? This marks it as fully reconciled."
						confirmLabel="Close PO"
						onConfirm={() => statusMutation.mutate({ status: 'closed' })}
					>
						<UiButton variant="primary">Close PO</UiButton>
					</ConfirmDialog>
				)}

				{/* Cancel — available on all active statuses */}
				{!['closed', 'rejected', 'cancelled', 'inspected'].includes(
					po.status,
				) && (
					<ConfirmDialog
						title="Cancel Purchase Order"
						description="This action cannot be undone. The supplier will be notified."
						confirmLabel="Cancel PO"
						onConfirm={() =>
							statusMutation.mutate({
								status: 'cancelled',
								reason: 'Cancelled by procurement',
							})
						}
						isDestructive
					>
						<UiButton variant="ghost" className="text-red-500/70">
							Cancel PO
						</UiButton>
					</ConfirmDialog>
				)}
			</div>

			{/* 6. Line items */}
			<section>
				<h4 className="text-[12px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-3">
					Line Items
				</h4>
				<div className="space-y-px">
					{po.items.map((item: POItem) => (
						<div
							key={item.id}
							className="flex items-center gap-4 rounded-lg py-2.5 px-3 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
						>
							{/* Product */}
							<div className="flex-1 min-w-0">
								<span className="text-sm text-black/80 dark:text-white/80">
									{item.productName}
								</span>
							</div>

							{/* Qty */}
							<div className="text-end w-16">
								<span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/60 dark:text-white/60">
									{item.quantity.toLocaleString(locale)}
								</span>
							</div>

							{/* Unit cost */}
							<div className="text-end w-24">
								<span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/50 dark:text-white/50">
									{formatEGP(item.unitCost, locale)}
								</span>
							</div>

							{/* Received / Rejected */}
							<div className="text-end w-20">
								<span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-black/35 dark:text-white/35">
									{item.receivedQuantity.toLocaleString(locale)}
									{item.rejectedQuantity > 0 && (
										<span className="text-red-500/60">
											{' '}
											-{item.rejectedQuantity.toLocaleString(locale)}
										</span>
									)}
								</span>
							</div>

							{/* Line total */}
							<div className="text-end w-28">
								<span className="font-[family-name:var(--font-geist-mono)] text-sm font-medium tabular-nums text-black dark:text-white">
									{formatEGP(item.lineTotal, locale)}
								</span>
							</div>
						</div>
					))}
				</div>

				{/* Totals */}
				<div className="mt-3 flex flex-col items-end gap-0.5 pe-3">
					<div className="flex items-center gap-8">
						<span className="text-[12px] text-black/30 dark:text-white/30">
							Subtotal
						</span>
						<span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/60 dark:text-white/60">
							{formatEGP(po.subtotal, locale)}
						</span>
					</div>
					<div className="flex items-center gap-8">
						<span className="text-[12px] text-black/30 dark:text-white/30">
							VAT 14%
						</span>
						<span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/60 dark:text-white/60">
							{formatEGP(po.vatAmount, locale)}
						</span>
					</div>
					<div className="flex items-center gap-8 mt-1 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
						<span className="text-[12px] font-semibold text-black/50 dark:text-white/50">
							Total
						</span>
						<span className="font-[family-name:var(--font-geist-mono)] text-base font-semibold tabular-nums text-black dark:text-white">
							{formatEGP(po.total, locale)}
						</span>
					</div>
				</div>
			</section>

			{/* 7. Delivery info */}
			<section>
				<h4 className="text-[12px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30 mb-3">
					Delivery
				</h4>
				<div className="flex gap-8">
					<div>
						<span className="text-[12px] text-black/30 dark:text-white/30">
							Expected
						</span>
						<p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/70 dark:text-white/70 mt-0.5">
							{formatDate(po.expectedDeliveryDate, locale)}
						</p>
					</div>
					<div>
						<span className="text-[12px] text-black/30 dark:text-white/30">
							Reference
						</span>
						<p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/70 dark:text-white/70 mt-0.5">
							{po.codedDeliveryReference}
						</p>
					</div>
					<div>
						<span className="text-[12px] text-black/30 dark:text-white/30">
							Status
						</span>
						<p className="text-sm text-black/50 dark:text-white/50 mt-0.5">
							{['shipped', 'partially_received', 'received'].includes(po.status)
								? 'In transit'
								: 'Awaiting shipment'}
						</p>
					</div>
				</div>
			</section>

			{/* 8. Documents (moved up from below three-way match) */}
			<PODocuments />

			{/* 9. Three-Way Match (collapsed if matched) */}
			{po.threeWayMatch?.overall === 'matched' ? (
				<div className="flex items-center gap-2 text-[13px]">
					<span className="text-green-600">&#10003;</span>
					<span className="text-black/50 dark:text-white/50">
						Three-way match verified
					</span>
				</div>
			) : (
				<ThreeWayMatch match={po.threeWayMatch} />
			)}

			{/* 10. Activity timeline (collapsed by default) */}
			<ActivityTimeline timeline={timeline} locale={locale} />
			{/* Receive Goods Dialog */}
			<ReceiveGoodsDialog
				poId={poId}
				items={po.items}
				isOpen={receiveOpen}
				onOpenChange={setReceiveOpen}
			/>
		</motion.div>
	)
}
