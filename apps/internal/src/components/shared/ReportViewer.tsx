import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { OrderReportStage } from '../../lib/db/types'
import {
	getOrderReport,
	type ResolvedReport,
} from '../../lib/server/order-reports'
import { DispatchBody, DispatchDialog, DispatchSection } from './DispatchDialog'

const STAGE_ORDER: OrderReportStage[] = [
	'submitted',
	'evaluated',
	'finance_partial',
	'inventory_orders',
	'finance_full',
	'warehouse',
	'dispatch',
	'delivered',
]

const DECLINE_REASON_LABEL: Record<string, string> = {
	outside_service_area: 'Outside service area',
	cannot_source: 'Cannot source',
	customer_blacklisted: 'Blacklisted',
	expired: 'Expired',
}

const STAGE_LABEL: Record<OrderReportStage, string> = {
	submitted: 'Submitted',
	evaluated: 'Evaluated',
	finance_partial: 'Partial payment',
	inventory_orders: 'Sourced',
	finance_full: 'Paid',
	warehouse: 'Warehouse',
	dispatch: 'Dispatched',
	delivered: 'Delivered',
	canceled: 'Canceled',
	returned: 'Returned',
}

interface ReportViewerModalProps {
	rfqId: string | null
	onClose: () => void
}

export function ReportViewerModal({ rfqId, onClose }: ReportViewerModalProps) {
	const { data, isLoading } = useQuery({
		queryKey: ['order-report', rfqId],
		queryFn: () => getOrderReport({ data: { rfqId: rfqId ?? '' } }),
		enabled: !!rfqId,
		staleTime: 30_000,
	})

	const show = !!rfqId && !!data && !isLoading
	if (!show || !data) return null

	const sub = data.sections.submitted
	const title = sub?.customerName ?? 'Order Report'
	const isCanceled = data.currentStage === 'canceled'
	const stageLabel = isCanceled
		? ((data.canceledReason && DECLINE_REASON_LABEL[data.canceledReason]) ??
			'Canceled')
		: STAGE_LABEL[data.currentStage]

	const eyebrow = (
		<span className="inline-flex items-center gap-2">
			<span>{data.rfqId.toUpperCase()}</span>
			<span aria-hidden>·</span>
			<span className={isCanceled ? 'text-[#B3261E] dark:text-[#E46B63]' : ''}>
				{stageLabel}
			</span>
			{sub?.customerTier && (
				<>
					<span aria-hidden>·</span>
					<span>Tier {sub.customerTier}</span>
				</>
			)}
		</span>
	)

	return (
		<DispatchDialog
			isOpen={show}
			onClose={onClose}
			size="lg"
			title={title}
			eyebrow={eyebrow}
		>
			<ReportContent report={data} />
		</DispatchDialog>
	)
}

function formatRelative(iso: string | null): string {
	if (!iso) return '—'
	const ms = Date.now() - new Date(iso).getTime()
	const h = Math.abs(ms) / 3_600_000
	if (h < 1) return `${Math.round(h * 60)}m ago`
	if (h < 24) return `${Math.round(h)}h ago`
	return `${Math.floor(h / 24)}d ago`
}

function formatMoney(n: number): string {
	return n.toLocaleString('en-EG')
}

function ReportContent({ report }: { report: ResolvedReport }) {
	const isCanceled = report.currentStage === 'canceled'
	const currentIdx = STAGE_ORDER.indexOf(
		report.currentStage as OrderReportStage,
	)
	const sub = report.sections.submitted
	const ev = report.sections.evaluated
	const unfilled = STAGE_ORDER.filter(
		(s) => !report.sections[s] && s !== 'canceled',
	)

	return (
		<DispatchBody>
			{/* Stage ruler — thin perforated dashes that fill left-to-right */}
			<ol className="flex items-center gap-[3px] mb-7">
				{STAGE_ORDER.map((stage, i) => {
					const filled = !!report.sections[stage]
					const isPast = i < currentIdx || (i === currentIdx && !isCanceled)
					const on = filled || isPast
					return (
						<li
							key={stage}
							aria-label={STAGE_LABEL[stage]}
							className={`h-[3px] flex-1 transition-colors ${
								on
									? isCanceled
										? 'bg-[#B3261E]/70 dark:bg-[#E46B63]/80'
										: 'bg-[var(--color-text)]'
									: 'bg-black/[0.1] dark:bg-white/[0.12]'
							}`}
						/>
					)
				})}
			</ol>

			{/* Stage labels strip — mono, uppercase, wrap naturally */}
			<div className="flex flex-wrap gap-x-5 gap-y-1 mb-7 font-[family-name:var(--font-plex-mono)] text-[9.5px] uppercase tracking-[0.18em]">
				{STAGE_ORDER.map((stage, i) => {
					const on =
						!!report.sections[stage] ||
						i < currentIdx ||
						(i === currentIdx && !isCanceled)
					return (
						<span
							key={stage}
							className={
								on
									? isCanceled
										? 'text-[#B3261E] dark:text-[#E46B63]'
										: 'text-[var(--color-text)]'
									: 'text-[var(--color-text-subtle)]/60'
							}
						>
							{STAGE_LABEL[stage]}
						</span>
					)
				})}
			</div>

			{/* Rejected reason — first block if canceled */}
			{isCanceled && (
				<section>
					<DispatchSection label="Rejected" />
					<Grid>
						<Detail label="Reason">
							<Strong>
								{(report.canceledReason &&
									DECLINE_REASON_LABEL[report.canceledReason]) ??
									report.canceledReason?.replace(/_/g, ' ') ??
									'No reason provided'}
							</Strong>
						</Detail>
						{report.canceledAt && (
							<Detail label="Rejected at">
								<Mono>{formatRelative(report.canceledAt)}</Mono>
							</Detail>
						)}
					</Grid>
					{report.canceledNote && (
						<p className="mt-3 font-[family-name:var(--font-archivo)] italic text-[13px] text-[var(--color-text-muted)] leading-relaxed">
							{report.canceledNote}
						</p>
					)}
				</section>
			)}

			{/* Submitted — contact + delivery + items */}
			{sub && (
				<section>
					<DispatchSection label="Submitted" />
					<Grid>
						<Detail label="Contact">
							<Strong>{sub.contactName}</Strong>
						</Detail>
						<Detail label="Delivery">
							<Strong>{sub.deliveryAddress}</Strong>
						</Detail>
						<Detail label="Phone">
							<Mono>{sub.phone}</Mono>
						</Detail>
						<Detail label="City">{sub.deliveryCity}</Detail>
						<Detail label="Urgency">
							<Mono>{sub.deliveryUrgencyDays}d</Mono>
						</Detail>
					</Grid>

					{sub.items.length > 0 && (
						<div className="mt-6">
							<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
								Items requested
							</span>
							<ul className="mt-3 border border-black/[0.1] dark:border-white/[0.12]">
								{sub.items.map((item, i) => (
									<li
										key={item.productSlug}
										className={`flex items-baseline justify-between px-4 py-3 ${
											i < sub.items.length - 1
												? 'border-b border-black/[0.08] dark:border-white/[0.1]'
												: ''
										}`}
									>
										<span className="font-[family-name:var(--font-archivo)] text-[14px] text-[var(--color-text)]">
											{item.productName}
										</span>
										<span className="font-[family-name:var(--font-plex-mono)] text-[14px] font-medium tabular-nums text-[var(--color-text)]">
											{item.quantity.toLocaleString('en-EG')}
											<span className="ms-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
												{item.unit}
											</span>
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</section>
			)}

			{/* Evaluated — quote figures */}
			{ev && (
				<section>
					<DispatchSection label="Evaluated" />
					<div className="flex items-end justify-between gap-8">
						<div className="space-y-4 flex-1 min-w-0">
							<Detail label="Quote">
								<Mono>{ev.quoteNumber}</Mono>
							</Detail>
							<div className="flex items-start gap-6">
								<Detail label="Subtotal">
									<Mono>{formatMoney(ev.subtotal)}</Mono>
								</Detail>
								{ev.vatAmount > 0 && (
									<Detail label="VAT">
										<Mono>{formatMoney(ev.vatAmount)}</Mono>
									</Detail>
								)}
								<Detail label="Margin">
									<Mono>{ev.marginPercent.toFixed(1)}%</Mono>
								</Detail>
							</div>
							{ev.sentVia && (
								<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
									Sent via {ev.sentVia} · {formatRelative(ev.sentAt)}
								</p>
							)}
						</div>
						<div className="text-end shrink-0">
							<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
								Total
							</span>
							<div
								className="mt-2 font-[family-name:var(--font-archivo-black)] text-[34px] leading-none tabular-nums uppercase"
								style={{ letterSpacing: '-0.01em' }}
							>
								{formatMoney(ev.total)}
							</div>
							<span className="mt-1 block font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.24em] text-[var(--color-text-subtle)]">
								EGP
							</span>
						</div>
					</div>
				</section>
			)}

			{/* Pending stages — still to come */}
			{unfilled.length > 0 && (
				<section className="mt-8 pt-5 border-t border-dashed border-black/[0.12] dark:border-white/[0.14]">
					<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">
						Pending
					</p>
					<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 font-[family-name:var(--font-plex-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]/80">
						{unfilled.map((s) => (
							<span key={s}>· {STAGE_LABEL[s]}</span>
						))}
					</div>
				</section>
			)}
		</DispatchBody>
	)
}

function Grid({ children }: { children: ReactNode }) {
	return <div className="grid grid-cols-2 gap-x-8 gap-y-4">{children}</div>
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div>
			<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
				{label}
			</span>
			<div className="mt-1">{children}</div>
		</div>
	)
}

function Strong({ children }: { children: ReactNode }) {
	return (
		<span className="font-[family-name:var(--font-archivo)] text-[15px] font-medium text-[var(--color-text)]">
			{children}
		</span>
	)
}

function Mono({ children }: { children: ReactNode }) {
	return (
		<span className="font-[family-name:var(--font-plex-mono)] text-[13.5px] tabular-nums text-[var(--color-text)]">
			{children}
		</span>
	)
}
