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
import type { ParseKeys } from 'i18next'
import {
	ArrowLeft,
	Check,
	Clock,
	Download,
	FileText,
	Navigation,
	Phone,
	Truck,
	UserRound,
} from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { PODConfirmFlow } from '../../components/orders/PODConfirmFlow'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import {
	type DeliveryContact,
	type DeliveryInfo,
	type DeliveryStage,
	getOrderDetail,
	getPODDetails,
	type OrderDetailResult,
	type OrderReviewInfo,
	type PODDetails,
} from '../../lib/server/deliveries'
import type { OrderStatus } from '../../types/order'

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

	const deliveryId = orderData?.delivery?.id ?? ''
	const { data: pod } = useQuery({
		queryKey: ['pod-details', deliveryId],
		queryFn: () => getPODDetails({ data: { deliveryId } }),
		enabled: Boolean(orderData?.delivery?.hasActivePOD && deliveryId),
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

	const { order, timeline, documents, delivery } = orderData

	const formattedDate = dateFmt.format(new Date(order.date))
	const total =
		order.amount != null ? `EGP ${moneyFmt.format(order.amount)}` : null
	const statusLabel = t(getOrderStatusLabelKey(order.status))
	const isSealed =
		order.status === 'order_confirmed' || order.status === 'delivered'
	const isSubmitted = order.status === 'submitted'

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--p-bg)]">
			{/* Top bar */}
			<div className="sticky top-0 z-30 border-b border-[var(--p-border)] bg-[var(--p-bg)] px-4 pb-3.5 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-12 lg:py-3.5">
				<div className="mx-auto flex w-full max-w-[980px] items-center gap-4">
					<button
						type="button"
						onClick={() => navigate({ to: '/orders' })}
						className="inline-flex min-h-10 items-center gap-2 text-[13px] text-[var(--p-text-muted)] transition-colors hover:text-[var(--p-text)] sm:min-h-0"
					>
						<ArrowLeft size={14} className="rtl:rotate-180" />
						{t('tracking.backToOrders')}
					</button>
					<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)]">
						/
					</span>
					<span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-muted)]">
						{statusLabel}
					</span>
				</div>
			</div>

			{/* Body */}
			<div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 sm:py-10 lg:px-12 lg:py-14">
				{/* Reference header */}
				<PortalTitleRow
					title={order.reference}
					subtitle={t('tracking.reference')}
					fixed
					className="-mx-4 mb-8 border-b border-[var(--p-rule-strong)] px-4 sm:-mx-6 sm:mb-10 sm:px-6 lg:-mx-12 lg:px-12"
					action={
						<div className="flex flex-wrap items-center gap-3">
							<span className="font-mono text-[11px] tracking-[0.06em] text-[var(--p-text-muted)]">
								{formattedDate}
							</span>
							{isSealed && (
								<span
									role="img"
									aria-label={t('orders.sealed')}
									className="inline-block h-2 w-2 rounded-full bg-[var(--p-accent)]"
								/>
							)}
						</div>
					}
				/>

				{isSubmitted && orderData.review ? (
					<SubmittedReviewSummary
						review={orderData.review}
						dateFmt={dateFmt}
						itemCount={order.itemCount}
					/>
				) : (
					<OrderLifecycleSummary
						data={orderData}
						dateFmt={dateFmt}
						moneyFmt={moneyFmt}
					/>
				)}

				{/* Delivery tracking */}
				{delivery && order.status === 'out_for_delivery' && (
					<DeliveryTrackingSection delivery={delivery} pod={pod} />
				)}

				{/* Items */}
				<section className={isSubmitted ? 'mt-8 sm:mt-10' : 'mt-12 sm:mt-14'}>
					<header className="mb-2 flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--p-rule-strong)] pb-2">
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
									className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 border-b border-[var(--p-rule)] py-4 sm:grid-cols-[36px_1fr_auto] sm:items-center"
								>
									<span className="col-span-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-text-faint)] sm:col-span-1">
										№ {refNo}
									</span>
									<div className="min-w-0">
										<p className="break-words text-[14px] text-[var(--p-text)] sm:truncate">
											{isAr ? item.productNameAr : item.productName}
										</p>
										<p
											className="mt-0.5 break-words font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--p-text-muted)] sm:tracking-[0.18em]"
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
											className="font-mono text-end text-[13px] text-[var(--p-text)]"
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
						<div className="mt-4 flex flex-wrap items-baseline justify-between gap-3 border-t border-[var(--p-rule-strong)] pt-3">
							<span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text-muted)]">
								{t('tracking.amount')}
							</span>
							<span
								className="break-all font-mono text-[18px] font-medium text-[var(--p-text)]"
								style={{ fontVariantNumeric: 'tabular-nums' }}
							>
								{total}
							</span>
						</div>
					)}
				</section>

				{/* Timeline */}
				{!isSubmitted && (
					<section className="mt-12 sm:mt-14">
						<header className="mb-4 flex items-baseline justify-between border-b border-[var(--p-rule-strong)] pb-2">
							<h2 className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text)]">
								{t('tracking.timeline')}
							</h2>
						</header>
						<ol className="space-y-0">
							{timeline.map((step, i) => {
								const isLast = i === timeline.length - 1
								const stepLabelKey = getTimelineStepLabelKey(step.key)
								const dotColor =
									step.status === 'completed'
										? 'bg-[var(--p-accent)]'
										: step.status === 'current'
											? 'bg-[var(--p-accent)] ring-2 ring-[var(--p-accent)]/30'
											: 'bg-[var(--p-text-faint)]'
								const iconNode =
									step.status === 'completed' ? (
										<Check size={10} strokeWidth={2.5} className="text-white" />
									) : step.status === 'current' ? (
										<Truck size={10} strokeWidth={1.8} className="text-white" />
									) : (
										<Clock size={10} strokeWidth={1.5} className="text-white" />
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
										<div
											className={`min-w-0 flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}
										>
											<p
												className={`break-words text-[14px] ${
													step.status === 'future'
														? 'text-[var(--p-text-muted)]'
														: 'text-[var(--p-text)]'
												}`}
											>
												{stepLabelKey ? t(stepLabelKey) : step.label}
											</p>
											{step.timestamp && (
												<p
													className="mt-1 break-words font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)] sm:tracking-[0.22em]"
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
				)}

				{/* Documents */}
				{documents.length > 0 && (
					<section className="mt-12 sm:mt-14">
						<header className="mb-2 flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--p-rule-strong)] pb-2">
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
										className="group grid min-h-14 grid-cols-[24px_1fr_auto] items-center gap-4 border-b border-[var(--p-rule)] py-4"
									>
										<FileText
											size={14}
											strokeWidth={1.5}
											className="text-[var(--p-text-muted)]"
										/>
										<div className="min-w-0">
											<p className="break-words text-[14px] text-[var(--p-text)] group-hover:text-[var(--p-text)] sm:truncate">
												{doc.name}
											</p>
											<p
												className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)] sm:tracking-[0.22em]"
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

type LifecycleFact = {
	label: string
	value: string
}

function SubmittedReviewSummary({
	review,
	dateFmt,
	itemCount,
}: {
	review: OrderReviewInfo
	dateFmt: Intl.DateTimeFormat
	itemCount: number
}) {
	const { t } = useTranslation('portal')

	return (
		<section className="mt-8 sm:mt-10">
			<div className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] px-4 py-4 sm:px-5 lg:px-6">
				<p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--p-text-faint)]">
					{t('tracking.reviewingOrder')}
				</p>
				<h2 className="mt-2 text-[22px] font-semibold leading-tight text-[var(--p-text)] sm:text-[26px]">
					{t('tracking.submitted')}
				</h2>
				<p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--p-text-muted)]">
					{review.message}
				</p>
				<dl className="mt-4 grid gap-2 sm:grid-cols-2">
					<div className="rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2">
						<dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-text-faint)]">
							{t('tracking.submittedAt')}
						</dt>
						<dd className="mt-1 text-[13px] text-[var(--p-text)]">
							{dateFmt.format(new Date(review.submittedAt))}
						</dd>
					</div>
					<div className="rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2">
						<dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-text-faint)]">
							{t('tracking.itemsOrdered')}
						</dt>
						<dd className="mt-1 text-[13px] text-[var(--p-text)]">
							{t('orders.items', { count: itemCount })}
						</dd>
					</div>
				</dl>
			</div>
		</section>
	)
}

function OrderLifecycleSummary({
	data,
	dateFmt,
	moneyFmt,
}: {
	data: OrderDetailResult
	dateFmt: Intl.DateTimeFormat
	moneyFmt: Intl.NumberFormat
}) {
	const { t } = useTranslation('portal')
	const { order, acceptance, payment, delivery, completion, closure } = data
	const statusLabel = t(getOrderStatusLabelKey(order.status))
	if (!acceptance) return null

	return (
		<section className="mt-8 sm:mt-10">
			<div className="overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)]">
				<header className="border-b border-[var(--p-border)] px-4 py-4 sm:px-5 lg:px-6">
					<p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--p-text-faint)]">
						{t('tracking.orderStatus')}
					</p>
					<div className="mt-2 flex flex-wrap items-center justify-between gap-3">
						<h2 className="text-[22px] font-semibold leading-tight text-[var(--p-text)] sm:text-[26px]">
							{statusLabel}
						</h2>
						<span className="rounded-full border border-[var(--p-border)] px-3 py-1 font-mono text-[11px] text-[var(--p-text-muted)]">
							{order.description}
						</span>
					</div>
				</header>

				<div className="divide-y divide-[var(--p-border)]">
					<LifecycleBlock
						icon={<UserRound size={16} strokeWidth={1.8} />}
						title={t('tracking.requestAccepted')}
						eyebrow={`${acceptance.employeeName} · ${acceptance.employeeRole}`}
						body={acceptance.message}
						facts={[
							{
								label: t('tracking.acceptedAt'),
								value: dateFmt.format(new Date(acceptance.acceptedAt)),
							},
							{
								label: t('tracking.itemsOrdered'),
								value: t('orders.items', { count: order.itemCount }),
							},
						]}
					/>

					{payment && (
						<LifecycleBlock
							icon={<FileText size={16} strokeWidth={1.8} />}
							title={t('tracking.paymentAccepted')}
							eyebrow={`${payment.method} · ${payment.reference}`}
							facts={[
								{ label: t('tracking.bankName'), value: payment.bankName },
								{
									label: t('tracking.amount'),
									value: `EGP ${moneyFmt.format(payment.paidAmount)}`,
								},
								{
									label: t('tracking.paidAt'),
									value: dateFmt.format(new Date(payment.paidAt)),
								},
								{ label: t('tracking.reviewedBy'), value: payment.reviewedBy },
							]}
							lines={payment.reportLines}
							linesLabel={t('tracking.preparationReport')}
						/>
					)}

					{delivery && (
						<LifecycleBlock
							icon={<Truck size={16} strokeWidth={1.8} />}
							title={t('tracking.loadedForDelivery')}
							eyebrow={`${delivery.driverName} · ${delivery.truckNumber}`}
							facts={[
								{ label: t('tracking.driverId'), value: delivery.driverId },
								{
									label: t('tracking.driverPhone'),
									value: delivery.driverPhone,
								},
								{
									label: t('tracking.truckNumber'),
									value: delivery.truckNumber,
								},
								{ label: t('tracking.vehicle'), value: delivery.vehiclePlate },
								{
									label: t('tracking.route'),
									value: `${delivery.route.origin} / ${delivery.route.destination}`,
								},
								{
									label: t('tracking.distance'),
									value: t('tracking.distanceKm', {
										count: delivery.route.distanceKm,
									}),
								},
							]}
						/>
					)}

					{completion && (
						<LifecycleBlock
							icon={<Check size={16} strokeWidth={2.2} />}
							title={t('tracking.deliveryComplete')}
							eyebrow={completion.proofOfDelivery}
							body={completion.message}
							facts={[
								{
									label: t('tracking.deliveredAt'),
									value: dateFmt.format(new Date(completion.deliveredAt)),
								},
								{
									label: t('tracking.receivedBy'),
									value: completion.receivedBy,
								},
								{
									label: t('tracking.proofOfDelivery'),
									value: completion.proofOfDelivery,
								},
							]}
							lines={completion.summaryLines}
							linesLabel={t('tracking.finalSummary')}
						/>
					)}

					{closure && (
						<LifecycleBlock
							icon={<FileText size={16} strokeWidth={1.8} />}
							title={t(
								closure.type === 'cancelled'
									? 'tracking.cancelled'
									: 'tracking.rejected',
							)}
							eyebrow={closure.reason}
							body={closure.note}
							facts={[
								{ label: t('tracking.handledBy'), value: closure.handledBy },
								{
									label: t('tracking.handledAt'),
									value: dateFmt.format(new Date(closure.handledAt)),
								},
								{
									label: t('tracking.reachedStage'),
									value: t(DELIVERY_STAGE_KEYS[closure.reachedStage]),
								},
							]}
						/>
					)}
				</div>
			</div>
		</section>
	)
}

function LifecycleBlock({
	icon,
	title,
	eyebrow,
	body,
	facts,
	lines,
	linesLabel,
}: {
	icon: ReactNode
	title: string
	eyebrow: string
	body?: string
	facts: LifecycleFact[]
	lines?: string[]
	linesLabel?: string
}) {
	return (
		<article className="grid gap-4 px-4 py-4 sm:grid-cols-[40px_1fr] sm:px-5 lg:px-6">
			<span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--p-hover)] text-[var(--p-text-muted)]">
				{icon}
			</span>
			<div className="min-w-0">
				<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
					<h3 className="text-[15px] font-semibold text-[var(--p-text)]">
						{title}
					</h3>
					<p className="min-w-0 break-words font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-text-faint)] sm:text-end">
						{eyebrow}
					</p>
				</div>
				{body && (
					<p className="mt-2 text-[13px] leading-relaxed text-[var(--p-text-muted)]">
						{body}
					</p>
				)}
				<dl className="mt-3 grid gap-2 sm:grid-cols-2">
					{facts.map((fact) => (
						<div
							key={`${fact.label}-${fact.value}`}
							className="min-w-0 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2"
						>
							<dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-text-faint)]">
								{fact.label}
							</dt>
							<dd className="mt-1 break-words text-[13px] text-[var(--p-text)]">
								{fact.value}
							</dd>
						</div>
					))}
				</dl>
				{lines && lines.length > 0 && (
					<div className="mt-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-3">
						{linesLabel && (
							<p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-text-faint)]">
								{linesLabel}
							</p>
						)}
						<ul className="mt-2 space-y-1.5">
							{lines.map((line) => (
								<li
									key={line}
									className="text-[13px] leading-relaxed text-[var(--p-text)]"
								>
									{line}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</article>
	)
}

const DELIVERY_STAGE_KEYS: Record<DeliveryStage, ParseKeys<'portal'>> = {
	confirmed: 'tracking.confirmed',
	being_prepared: 'tracking.beingPrepared',
	out_for_delivery: 'tracking.outForDelivery',
	delivered: 'tracking.delivered',
	invoice_generated: 'tracking.invoiceGenerated',
}

function getOrderStatusLabelKey(status: OrderStatus): ParseKeys<'portal'> {
	if (status === 'submitted') return 'tracking.submitted'
	if (status === 'being_prepared') return 'tracking.beingPrepared'
	if (status === 'out_for_delivery') return 'tracking.outForDelivery'
	if (status === 'delivered') return 'tracking.delivered'
	if (status === 'cancelled') return 'tracking.cancelled'
	if (status === 'rejected') return 'tracking.rejected'
	return 'tracking.confirmed'
}

function getTimelineStepLabelKey(key: string): ParseKeys<'portal'> | null {
	if (key === 'submitted') return 'tracking.submitted'
	if (key === 'confirmed') return 'tracking.confirmed'
	if (key === 'being_prepared') return 'tracking.beingPrepared'
	if (key === 'out_for_delivery') return 'tracking.outForDelivery'
	if (key === 'delivered') return 'tracking.delivered'
	if (key === 'cancelled') return 'tracking.cancelled'
	if (key === 'rejected') return 'tracking.rejected'
	if (key === 'invoice_generated') return 'tracking.invoiceGenerated'
	return null
}

const DELIVERY_STAGES: readonly DeliveryStage[] = [
	'confirmed',
	'being_prepared',
	'out_for_delivery',
	'delivered',
] as const

function formatEta(estimatedArrival: string, locale: string) {
	const diffMinutes = Math.round(
		(new Date(estimatedArrival).getTime() - Date.now()) / 60_000,
	)
	const safeMinutes = Math.max(0, diffMinutes)
	const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

	if (safeMinutes < 60) {
		return formatter.format(safeMinutes, 'minute')
	}

	return formatter.format(Math.round(safeMinutes / 60), 'hour')
}

function formatUpdateTime(value: string, locale: string) {
	return new Date(value).toLocaleTimeString(locale, {
		hour: '2-digit',
		minute: '2-digit',
	})
}

function DeliveryTrackingSection({
	delivery,
	pod,
}: {
	delivery: DeliveryInfo
	pod?: PODDetails
}) {
	const { t, i18n } = useTranslation('portal')
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-GB'
	const currentStageLabel = t(DELIVERY_STAGE_KEYS[delivery.currentStage])
	const eta = formatEta(delivery.estimatedArrival, locale)
	const lastUpdated = formatUpdateTime(delivery.lastUpdated, locale)

	return (
		<section className="mt-10 sm:mt-12">
			<div className="overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)]">
				<header className="border-b border-[var(--p-border)] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
					<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div className="min-w-0">
							<p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--p-text-faint)]">
								{t('tracking.deliveryDetails')}
							</p>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--p-accent)] text-[var(--p-accent-contrast)]">
									<Truck size={16} strokeWidth={1.8} />
								</span>
								<h2 className="break-words text-[22px] font-semibold leading-tight text-[var(--p-text)] sm:text-[26px]">
									{currentStageLabel}
								</h2>
							</div>
						</div>

						<div className="grid gap-2 min-[420px]:grid-cols-2 md:w-[360px]">
							<StatusMetric
								icon={<Navigation size={15} strokeWidth={1.8} />}
								value={t('tracking.eta', { time: eta })}
							/>
							<StatusMetric
								icon={<Clock size={15} strokeWidth={1.8} />}
								value={t('tracking.lastUpdated', { time: lastUpdated })}
							/>
						</div>
					</div>
				</header>

				<div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
					<div className="border-b border-[var(--p-border)] px-4 py-4 sm:px-5 sm:py-5 lg:border-b-0 lg:border-e lg:px-6">
						<DeliveryRouteMap delivery={delivery} />
						<div className="mt-4">
							<DeliveryStageGrid currentStage={delivery.currentStage} />
						</div>
					</div>

					<aside className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
						<dl className="grid gap-3">
							<TrackingFact
								icon={<Navigation size={15} strokeWidth={1.7} />}
								label={t('tracking.driverId')}
								value={delivery.driverId}
							/>
							<TrackingFact
								icon={<UserRound size={15} strokeWidth={1.7} />}
								label={t('tracking.driver')}
								value={delivery.driverName}
							/>
							<TrackingFact
								icon={<Phone size={15} strokeWidth={1.7} />}
								label={t('tracking.driverPhone')}
								value={delivery.driverPhone}
							/>
							<TrackingFact
								icon={<Truck size={15} strokeWidth={1.7} />}
								label={t('tracking.truckNumber')}
								value={delivery.truckNumber}
							/>
							<TrackingFact
								icon={<Truck size={15} strokeWidth={1.7} />}
								label={t('tracking.vehicle')}
								value={delivery.vehiclePlate}
							/>
						</dl>

						{delivery.dispatchContacts.length > 0 && (
							<div className="mt-4 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] p-3">
								<h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)]">
									{t('tracking.dispatchTeam')}
								</h3>
								<div className="mt-3 grid gap-2">
									{delivery.dispatchContacts.map((contact) => (
										<DispatchContactLink key={contact.id} contact={contact} />
									))}
								</div>
							</div>
						)}
					</aside>
				</div>

				{pod && (
					<div className="border-t border-[var(--p-border)] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
						<PODConfirmFlow deliveryId={delivery.id} pod={pod} />
					</div>
				)}
			</div>
		</section>
	)
}

function DeliveryRouteMap({ delivery }: { delivery: DeliveryInfo }) {
	const { t } = useTranslation('portal')
	const map = buildOpenStreetMapTileView(delivery.route)
	return (
		<figure className="relative h-44 overflow-hidden rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] sm:h-52">
			<svg
				aria-label={t('tracking.driverMap')}
				role="img"
				viewBox={`0 0 ${OSM_MAP_WIDTH} ${OSM_MAP_HEIGHT}`}
				className="absolute inset-0 h-full w-full"
				preserveAspectRatio="xMidYMid slice"
			>
				<title>{t('tracking.driverMap')}</title>
				<rect width={OSM_MAP_WIDTH} height={OSM_MAP_HEIGHT} fill="#eef2f6" />
				{map.tiles.map((tile) => (
					<image
						key={tile.key}
						href={tile.href}
						x={tile.x}
						y={tile.y}
						width={OSM_TILE_SIZE}
						height={OSM_TILE_SIZE}
						preserveAspectRatio="none"
					/>
				))}
				<circle
					cx={map.origin.x}
					cy={map.origin.y}
					r="7"
					fill="#111827"
					stroke="white"
					strokeWidth="3"
				/>
				<circle
					cx={map.destination.x}
					cy={map.destination.y}
					r="7"
					fill="#111827"
					stroke="white"
					strokeWidth="3"
				/>
				<circle
					cx={map.driver.x}
					cy={map.driver.y}
					r="11"
					fill="#2563eb"
					stroke="white"
					strokeWidth="4"
				/>
			</svg>
			<div className="absolute start-3 top-3 max-w-[60%] rounded-full bg-[var(--p-accent)] px-3 py-1 font-mono text-[11px] font-semibold text-[var(--p-accent-contrast)] shadow-sm">
				{delivery.driverId}
			</div>
			<div className="absolute end-3 top-3 rounded-full border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-1 font-mono text-[11px] text-[var(--p-text)] shadow-sm">
				{t('tracking.distanceKm', { count: delivery.route.distanceKm })}
			</div>
			<div className="absolute start-3 bottom-3 max-w-[46%] rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-2 shadow-sm">
				<p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--p-text-faint)]">
					{t('tracking.origin')}
				</p>
				<p className="mt-0.5 truncate text-[12px] text-[var(--p-text)]">
					{delivery.route.origin}
				</p>
			</div>
			<div className="absolute bottom-3 end-3 max-w-[46%] rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-2 text-end shadow-sm">
				<p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--p-text-faint)]">
					{t('tracking.destination')}
				</p>
				<p className="mt-0.5 truncate text-[12px] text-[var(--p-text)]">
					{delivery.route.destination}
				</p>
			</div>
		</figure>
	)
}

const OSM_MAP_WIDTH = 420
const OSM_MAP_HEIGHT = 220
const OSM_TILE_SIZE = 256
const OSM_MIN_ZOOM = 10
const OSM_MAX_ZOOM = 13
const OSM_FIT_PADDING = 72

type ProjectedMapPoint = {
	x: number
	y: number
}

type OsmTile = {
	key: string
	href: string
	x: number
	y: number
}

function buildOpenStreetMapTileView(route: DeliveryInfo['route']): {
	tiles: OsmTile[]
	origin: ProjectedMapPoint
	driver: ProjectedMapPoint
	destination: ProjectedMapPoint
} {
	const zoom = chooseOpenStreetMapZoom(route)
	const origin = projectOpenStreetMapPoint(route.originLocation, zoom)
	const driver = projectOpenStreetMapPoint(route.driverLocation, zoom)
	const destination = projectOpenStreetMapPoint(route.destinationLocation, zoom)
	const minX = Math.min(origin.x, driver.x, destination.x)
	const maxX = Math.max(origin.x, driver.x, destination.x)
	const minY = Math.min(origin.y, driver.y, destination.y)
	const maxY = Math.max(origin.y, driver.y, destination.y)
	const left = (minX + maxX - OSM_MAP_WIDTH) / 2
	const top = (minY + maxY - OSM_MAP_HEIGHT) / 2

	return {
		tiles: buildOpenStreetMapTiles(left, top, zoom),
		origin: toSvgMapPoint(origin, left, top),
		driver: toSvgMapPoint(driver, left, top),
		destination: toSvgMapPoint(destination, left, top),
	}
}

function chooseOpenStreetMapZoom(route: DeliveryInfo['route']): number {
	for (let zoom = OSM_MAX_ZOOM; zoom >= OSM_MIN_ZOOM; zoom--) {
		const origin = projectOpenStreetMapPoint(route.originLocation, zoom)
		const driver = projectOpenStreetMapPoint(route.driverLocation, zoom)
		const destination = projectOpenStreetMapPoint(
			route.destinationLocation,
			zoom,
		)
		const spanX =
			Math.max(origin.x, driver.x, destination.x) -
			Math.min(origin.x, driver.x, destination.x)
		const spanY =
			Math.max(origin.y, driver.y, destination.y) -
			Math.min(origin.y, driver.y, destination.y)

		if (
			spanX <= OSM_MAP_WIDTH - OSM_FIT_PADDING &&
			spanY <= OSM_MAP_HEIGHT - OSM_FIT_PADDING
		) {
			return zoom
		}
	}

	return OSM_MIN_ZOOM
}

function buildOpenStreetMapTiles(
	left: number,
	top: number,
	zoom: number,
): OsmTile[] {
	const tiles: OsmTile[] = []
	const tileCount = 2 ** zoom
	const startX = Math.floor(left / OSM_TILE_SIZE)
	const endX = Math.floor((left + OSM_MAP_WIDTH) / OSM_TILE_SIZE)
	const startY = Math.floor(top / OSM_TILE_SIZE)
	const endY = Math.floor((top + OSM_MAP_HEIGHT) / OSM_TILE_SIZE)

	for (let tileX = startX; tileX <= endX; tileX++) {
		for (let tileY = startY; tileY <= endY; tileY++) {
			if (tileY < 0 || tileY >= tileCount) continue
			const wrappedX = ((tileX % tileCount) + tileCount) % tileCount
			tiles.push({
				key: `${zoom}-${wrappedX}-${tileY}`,
				href: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
				x: tileX * OSM_TILE_SIZE - left,
				y: tileY * OSM_TILE_SIZE - top,
			})
		}
	}

	return tiles
}

function projectOpenStreetMapPoint(
	point: { lat: number; lng: number },
	zoom: number,
): ProjectedMapPoint {
	const sinLat = Math.sin((point.lat * Math.PI) / 180)
	const mapSize = OSM_TILE_SIZE * 2 ** zoom

	return {
		x: ((point.lng + 180) / 360) * mapSize,
		y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * mapSize,
	}
}

function toSvgMapPoint(
	point: ProjectedMapPoint,
	left: number,
	top: number,
): ProjectedMapPoint {
	return {
		x: point.x - left,
		y: point.y - top,
	}
}

function DispatchContactLink({ contact }: { contact: DeliveryContact }) {
	const { t } = useTranslation('portal')
	const isExternal = contact.href.startsWith('http')
	return (
		<a
			href={contact.href}
			target={isExternal ? '_blank' : undefined}
			rel={isExternal ? 'noopener noreferrer' : undefined}
			className="grid min-w-0 grid-cols-[28px_1fr] items-center gap-2 rounded-lg border border-[var(--p-border)] bg-[var(--p-card)] px-2 py-2 transition-colors hover:border-[var(--p-border-strong)]"
		>
			<span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--p-hover)] text-[var(--p-text-muted)]">
				<Phone size={13} strokeWidth={1.8} />
			</span>
			<span className="min-w-0">
				<span className="block truncate text-[12px] font-medium text-[var(--p-text)]">
					{t(getDispatchContactLabelKey(contact.id))}
				</span>
				<span className="block truncate font-mono text-[10px] text-[var(--p-text-muted)]">
					{contact.value}
				</span>
			</span>
		</a>
	)
}

function getDispatchContactLabelKey(id: string): ParseKeys<'portal'> {
	if (id === 'dispatch-hotline') return 'tracking.dispatchHotline'
	if (id === 'dispatch-whatsapp') return 'tracking.dispatchWhatsApp'
	if (id === 'dispatch-email') return 'tracking.dispatchEmail'
	return 'tracking.dispatchTeam'
}

function DeliveryStageGrid({ currentStage }: { currentStage: DeliveryStage }) {
	const { t } = useTranslation('portal')
	const currentIndex = DELIVERY_STAGES.indexOf(currentStage)

	return (
		<div
			role="progressbar"
			aria-valuenow={currentIndex + 1}
			aria-valuemin={1}
			aria-valuemax={DELIVERY_STAGES.length}
		>
			<ol className="grid gap-2 sm:grid-cols-4">
				{DELIVERY_STAGES.map((stage, i) => {
					const isCompleted = i < currentIndex
					const isCurrent = i === currentIndex
					const stateClass = isCompleted
						? 'border-[var(--p-accent)] bg-[var(--p-accent)] text-[var(--p-accent-contrast)]'
						: isCurrent
							? 'border-[var(--p-accent)] bg-[var(--p-bg)] text-[var(--p-text)] ring-2 ring-[var(--p-accent)]/10'
							: 'border-[var(--p-border)] bg-[var(--p-bg)] text-[var(--p-text-muted)]'

					return (
						<li
							key={stage}
							className={[
								'grid min-h-16 grid-cols-[32px_1fr] items-center gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-3 sm:min-h-28 sm:grid-cols-1 sm:content-start sm:gap-2',
								isCurrent ? 'border-[var(--p-border-strong)]' : '',
							].join(' ')}
						>
							<span
								className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-semibold ${stateClass}`}
							>
								{isCompleted ? <Check size={14} strokeWidth={2.4} /> : i + 1}
							</span>
							<span
								className={[
									'min-w-0 break-words text-[13px] leading-snug sm:text-[12px]',
									isCurrent
										? 'font-semibold text-[var(--p-text)]'
										: isCompleted
											? 'font-medium text-[var(--p-text)]'
											: 'text-[var(--p-text-muted)]',
								].join(' ')}
							>
								{t(DELIVERY_STAGE_KEYS[stage])}
							</span>
						</li>
					)
				})}
			</ol>
		</div>
	)
}

function StatusMetric({ icon, value }: { icon: ReactNode; value: string }) {
	return (
		<div className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2">
			<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--p-hover)] text-[var(--p-text-muted)]">
				{icon}
			</span>
			<span className="min-w-0 break-words font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--p-text)]">
				{value}
			</span>
		</div>
	)
}

function TrackingFact({
	icon,
	label,
	value,
}: {
	icon: ReactNode
	label: string
	value: string
}) {
	return (
		<div className="grid min-w-0 grid-cols-[32px_1fr] gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-3">
			<span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--p-hover)] text-[var(--p-text-muted)]">
				{icon}
			</span>
			<div className="min-w-0">
				<dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-text-faint)]">
					{label}
				</dt>
				<dd className="mt-1 break-words text-[14px] text-[var(--p-text)]">
					{value}
				</dd>
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
			<div className="border-b border-[var(--p-border)] px-4 pb-3.5 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-12 lg:py-3.5">
				<div className="mx-auto h-3 w-32 max-w-[980px] animate-pulse bg-[var(--p-border)]" />
			</div>
			<div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 sm:py-10 lg:px-12 lg:py-14">
				<div className="mb-8 flex items-baseline justify-between border-b border-[var(--p-rule-strong)] pb-3 sm:mb-10">
					<div className="h-5 w-40 animate-pulse bg-[var(--p-border)]" />
					<div className="h-3 w-24 animate-pulse bg-[var(--p-border)]" />
				</div>
				<div className="mb-12 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4 sm:mb-14 sm:p-5">
					<div className="grid gap-3 sm:grid-cols-4">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="flex items-center gap-3 sm:flex-col">
								<div className="h-8 w-8 animate-pulse rounded-full bg-[var(--p-border)]" />
								<div className="h-3 w-28 animate-pulse bg-[var(--p-border)] sm:w-16" />
							</div>
						))}
					</div>
					<div className="mt-5 border-t border-[var(--p-border)] pt-4">
						<div className="h-4 w-48 animate-pulse bg-[var(--p-border)]" />
					</div>
				</div>
				<div className="space-y-4">
					{SK_ITEMS.map((i) => (
						<div
							key={i}
							className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--p-rule)] py-4 sm:grid-cols-[36px_1fr_auto]"
						>
							<div className="col-span-2 h-3 w-8 animate-pulse bg-[var(--p-border)] sm:col-span-1" />
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
		<div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--p-bg)] px-4 text-center sm:px-6">
			<p className="text-[14px] text-[var(--p-text-muted)]">{message}</p>
			<Button
				onPress={onRetry}
				className="min-h-10 rounded-sm bg-[var(--p-accent)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-accent-contrast)] hover:opacity-90"
			>
				{retryLabel}
			</Button>
		</div>
	)
}
