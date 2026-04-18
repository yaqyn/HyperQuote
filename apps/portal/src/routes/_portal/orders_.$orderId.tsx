/**
 * Order detail — day-book entry, opened.
 *
 * Same ledger language as the orders list:
 *   • Reference + date + status in a single ruled header
 *   • Items as ruled rows (no card chrome)
 *   • Timeline as horizontal step rule with mono captions
 *   • Documents as a clean ruled list
 * Inter throughout, Geist Mono for figures and reference codes.
 */

import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
	ArrowLeft,
	Check,
	Clock,
	Download,
	FileText,
	Truck,
} from 'lucide-react'
import { useMemo } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getOrderDetail } from '../../lib/server/deliveries'

export const Route = createFileRoute('/_portal/orders_/$orderId')({
	component: OrderDetailWrapper,
})

function OrderDetailWrapper() {
	const { orderId } = Route.useParams()
	return <OrderDetailPage key={orderId} orderId={orderId} />
}

function OrderDetailPage({ orderId }: { orderId: string }) {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const isAr = i18n.language === 'ar'

	const {
		data: orderData,
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: ['order-detail', orderId],
		queryFn: () => getOrderDetail({ data: { orderId } }),
		staleTime: 30_000,
	})

	const dateFmt = useMemo(
		() =>
			new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-GB', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
			}),
		[isAr],
	)
	const moneyFmt = useMemo(
		() =>
			new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
				maximumFractionDigits: 0,
			}),
		[isAr],
	)

	if (isLoading) return <DetailSkeleton />
	if (isError || !orderData) {
		return (
			<ErrorState
				onRetry={() => refetch()}
				message={t('tracking.errorState')}
				retryLabel={t('tracking.retry')}
			/>
		)
	}

	const { order, timeline, documents } = orderData

	const formattedDate = dateFmt.format(new Date(order.date))
	const total =
		order.amount != null ? `EGP ${moneyFmt.format(order.amount)}` : null
	const statusLabel = order.status
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase())
	const isSealed =
		order.status === 'order_confirmed' || order.status === 'delivered'

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--p-bg)]">
			{/* Top bar */}
			<div className="border-b border-[var(--p-border)] bg-[var(--p-bg)] px-6 py-3.5 lg:px-12">
				<div className="mx-auto flex w-full max-w-[980px] items-center gap-4">
					<button
						type="button"
						onClick={() => navigate({ to: '/orders' })}
						className="inline-flex items-center gap-2 text-[13px] text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)]"
					>
						<ArrowLeft size={14} className="rtl:rotate-180" />
						{t('tracking.backToOrders')}
					</button>
					<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
						/
					</span>
					<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)]">
						{statusLabel}
					</span>
				</div>
			</div>

			{/* Body */}
			<div className="mx-auto w-full max-w-[980px] px-6 py-10 lg:px-12 lg:py-14">
				{/* Reference header */}
				<div className="mb-10 flex items-baseline justify-between gap-4 border-b border-[var(--p-rule-strong)] pb-3">
					<div className="flex items-baseline gap-3">
						<span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text-faint)]">
							{t('tracking.reference')}
						</span>
						<h1
							className="font-mono text-[20px] font-medium text-[var(--p-text)]"
							style={{ fontVariantNumeric: 'tabular-nums' }}
						>
							{order.reference}
						</h1>
					</div>
					<div className="flex items-center gap-3">
						<span className="font-mono text-[11px] tracking-[0.06em] text-[var(--p-text-muted)]">
							{formattedDate}
						</span>
						{isSealed && (
							<span
								role="img"
								aria-label={t('orders.sealed')}
								className="inline-block h-2 w-2 rounded-full bg-[var(--p-text)]"
							/>
						)}
					</div>
				</div>

				{/* Items */}
				<section>
					<header className="mb-2 flex items-baseline justify-between border-b border-[var(--p-rule-strong)] pb-2">
						<h2 className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text)]">
							{t('orders.items', { count: order.itemCount })}
						</h2>
						<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
							{isAr
								? order.itemCount.toLocaleString('ar-EG')
								: String(order.itemCount).padStart(2, '0')}
						</span>
					</header>
					<ol>
						{order.items.map((item, i) => {
							const refNo = isAr
								? (i + 1).toLocaleString('ar-EG')
								: String(i + 1).padStart(2, '0')
							const lineTotal =
								item.lineTotal > 0
									? `EGP ${moneyFmt.format(item.lineTotal)}`
									: null
							return (
								<li
									key={item.id}
									className="grid grid-cols-[36px_1fr_auto] items-center gap-4 border-b border-[var(--p-rule)] py-4"
								>
									<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
										№ {refNo}
									</span>
									<div className="min-w-0">
										<p className="truncate text-[14px] text-[var(--p-text)]">
											{isAr ? item.productNameAr : item.productName}
										</p>
										<p
											className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--p-text-muted)]"
											style={{ fontVariantNumeric: 'tabular-nums' }}
										>
											{item.quantity} {item.unitOfMeasure}
											{item.unitPrice > 0 && (
												<>
													{'  ·  '}
													EGP {moneyFmt.format(item.unitPrice)}
												</>
											)}
										</p>
									</div>
									{lineTotal && (
										<span
											className="font-mono text-[13px] text-[var(--p-text)]"
											style={{ fontVariantNumeric: 'tabular-nums' }}
										>
											{lineTotal}
										</span>
									)}
								</li>
							)
						})}
					</ol>

					{/* Total */}
					{total && (
						<div className="mt-4 flex items-baseline justify-between border-t border-[var(--p-rule-strong)] pt-3">
							<span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text-muted)]">
								{t('tracking.amount')}
							</span>
							<span
								className="font-mono text-[18px] font-medium text-[var(--p-text)]"
								style={{ fontVariantNumeric: 'tabular-nums' }}
							>
								{total}
							</span>
						</div>
					)}
				</section>

				{/* Timeline */}
				<section className="mt-14">
					<header className="mb-4 flex items-baseline justify-between border-b border-[var(--p-rule-strong)] pb-2">
						<h2 className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text)]">
							{t('tracking.timeline')}
						</h2>
					</header>
					<ol className="space-y-0">
						{timeline.map((step, i) => {
							const isLast = i === timeline.length - 1
							const dotColor =
								step.status === 'completed'
									? 'bg-[var(--p-text)]'
									: step.status === 'current'
										? 'bg-[var(--p-text)] ring-2 ring-[var(--p-text)]/30'
										: 'bg-[var(--p-text-faint)]'
							const iconNode =
								step.status === 'completed' ? (
									<Check
										size={10}
										strokeWidth={2.5}
										className="text-[var(--p-bg)]"
									/>
								) : step.status === 'current' ? (
									<Truck
										size={10}
										strokeWidth={1.8}
										className="text-[var(--p-bg)]"
									/>
								) : (
									<Clock
										size={10}
										strokeWidth={1.5}
										className="text-[var(--p-bg)]"
									/>
								)
							return (
								<li key={step.key} className="flex gap-4">
									<div className="flex flex-col items-center">
										<span
											className={`flex h-5 w-5 items-center justify-center rounded-full ${dotColor}`}
										>
											{iconNode}
										</span>
										{!isLast && (
											<span className="my-1 w-px flex-1 bg-[var(--p-rule)]" />
										)}
									</div>
									<div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
										<p
											className={`text-[14px] ${
												step.status === 'future'
													? 'text-[var(--p-text-muted)]'
													: 'text-[var(--p-text)]'
											}`}
										>
											{step.label}
										</p>
										{step.timestamp && (
											<p
												className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]"
												style={{ fontVariantNumeric: 'tabular-nums' }}
											>
												{new Date(step.timestamp).toLocaleDateString(
													isAr ? 'ar-EG' : 'en-GB',
													{
														day: '2-digit',
														month: 'short',
														hour: '2-digit',
														minute: '2-digit',
													},
												)}
											</p>
										)}
									</div>
								</li>
							)
						})}
					</ol>
				</section>

				{/* Documents */}
				{documents.length > 0 && (
					<section className="mt-14">
						<header className="mb-2 flex items-baseline justify-between border-b border-[var(--p-rule-strong)] pb-2">
							<h2 className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text)]">
								{t('tracking.documents')}
							</h2>
							<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
								{isAr
									? documents.length.toLocaleString('ar-EG')
									: String(documents.length).padStart(2, '0')}
							</span>
						</header>
						<ul>
							{documents.map((doc) => (
								<li key={doc.id}>
									<a
										href={doc.url}
										target="_blank"
										rel="noopener noreferrer"
										className="group grid grid-cols-[24px_1fr_auto] items-center gap-4 border-b border-[var(--p-rule)] py-4"
									>
										<FileText
											size={14}
											strokeWidth={1.5}
											className="text-[var(--p-text-muted)]"
										/>
										<div className="min-w-0">
											<p className="truncate text-[14px] text-[var(--p-text)] group-hover:text-[var(--p-text)]">
												{doc.name}
											</p>
											<p
												className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]"
												style={{ fontVariantNumeric: 'tabular-nums' }}
											>
												{dateFmt.format(new Date(doc.createdAt))}
											</p>
										</div>
										<Download
											size={14}
											strokeWidth={1.5}
											className="text-[var(--p-text-faint)] opacity-0 transition-opacity group-hover:opacity-100"
										/>
									</a>
								</li>
							))}
						</ul>
					</section>
				)}
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Skeleton + error
// ---------------------------------------------------------------------------

const SK_ITEMS = ['i1', 'i2', 'i3'] as const
const SK_TIMELINE = ['t1', 't2', 't3', 't4'] as const

function DetailSkeleton() {
	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--p-bg)]">
			<div className="border-b border-[var(--p-border)] px-6 py-3.5 lg:px-12">
				<div className="mx-auto h-3 w-32 max-w-[980px] animate-pulse bg-[var(--p-border)]" />
			</div>
			<div className="mx-auto w-full max-w-[980px] px-6 py-10 lg:px-12 lg:py-14">
				<div className="mb-10 flex items-baseline justify-between border-b border-[var(--p-rule-strong)] pb-3">
					<div className="h-5 w-40 animate-pulse bg-[var(--p-border)]" />
					<div className="h-3 w-24 animate-pulse bg-[var(--p-border)]" />
				</div>
				<div className="space-y-4">
					{SK_ITEMS.map((i) => (
						<div
							key={i}
							className="grid grid-cols-[36px_1fr_auto] items-center gap-4 border-b border-[var(--p-rule)] py-4"
						>
							<div className="h-3 w-8 animate-pulse bg-[var(--p-border)]" />
							<div className="space-y-2">
								<div className="h-4 w-2/3 animate-pulse bg-[var(--p-border)]" />
								<div className="h-3 w-1/3 animate-pulse bg-[var(--p-border)]" />
							</div>
							<div className="h-4 w-20 animate-pulse bg-[var(--p-border)]" />
						</div>
					))}
				</div>
				<div className="mt-14 space-y-4">
					{SK_TIMELINE.map((t) => (
						<div key={t} className="flex gap-4">
							<div className="h-5 w-5 animate-pulse rounded-full bg-[var(--p-border)]" />
							<div className="h-4 w-32 animate-pulse bg-[var(--p-border)]" />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

function ErrorState({
	message,
	retryLabel,
	onRetry,
}: {
	message: string
	retryLabel: string
	onRetry: () => void
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--p-bg)] px-6 text-center">
			<p className="text-[14px] text-[var(--p-text-muted)]">{message}</p>
			<Button
				onPress={onRetry}
				className="rounded-sm bg-[var(--p-text)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-bg)] hover:opacity-90"
			>
				{retryLabel}
			</Button>
		</div>
	)
}
