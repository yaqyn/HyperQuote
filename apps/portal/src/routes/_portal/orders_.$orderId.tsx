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
import {
	type DeliveryInfo,
	type DeliveryStage,
	getOrderDetail,
	getPODDetails,
	type PODDetails,
} from '../../lib/server/deliveries'

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
	const statusLabel = order.status
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase())
	const isSealed =
		order.status === 'order_confirmed' || order.status === 'delivered'

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--p-bg)]">
			{/* Top bar */}
			<div className="border-b border-[var(--p-border)] bg-[var(--p-bg)] px-4 pb-3.5 pt-[calc(env(safe-area-inset-top)+4.25rem)] sm:px-6 sm:pt-8 lg:px-12 lg:py-3.5">
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
				<div className="mb-8 flex flex-col gap-3 border-b border-[var(--p-rule-strong)] pb-3 sm:mb-10 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
					<div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
						<span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--p-text-faint)]">
							{t('tracking.reference')}
						</span>
						<h1
							className="break-all font-mono text-[18px] font-medium text-[var(--p-text)] sm:text-[20px]"
							style={{ fontVariantNumeric: 'tabular-nums' }}
						>
							{order.reference}
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-3">
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

				{/* Delivery tracking */}
				{delivery && <DeliveryTrackingSection delivery={delivery} pod={pod} />}

				{/* Items */}
				<section className={delivery ? 'mt-12 sm:mt-14' : undefined}>
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
				<section className="mt-12 sm:mt-14">
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
											{step.label}
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

const DELIVERY_STAGE_KEYS: Record<DeliveryStage, ParseKeys<'portal'>> = {
	confirmed: 'tracking.confirmed',
	being_prepared: 'tracking.beingPrepared',
	out_for_delivery: 'tracking.outForDelivery',
	delivered: 'tracking.delivered',
	invoice_generated: 'tracking.invoiceGenerated',
}

const DELIVERY_STAGES = [
	'confirmed',
	'being_prepared',
	'out_for_delivery',
	'delivered',
	'invoice_generated',
] as const satisfies readonly DeliveryStage[]

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
								<span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--p-text)] text-[var(--p-bg)]">
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
						<DeliveryStageGrid currentStage={delivery.currentStage} />
					</div>

					<aside className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
						<dl className="grid gap-3">
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
								label={t('tracking.vehicle')}
								value={delivery.vehiclePlate}
							/>
						</dl>
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
			<ol className="grid gap-2 sm:grid-cols-5">
				{DELIVERY_STAGES.map((stage, i) => {
					const isCompleted = i < currentIndex
					const isCurrent = i === currentIndex
					const stateClass = isCompleted
						? 'border-[var(--p-text)] bg-[var(--p-text)] text-[var(--p-bg)]'
						: isCurrent
							? 'border-[var(--p-text)] bg-[var(--p-bg)] text-[var(--p-text)] ring-2 ring-[var(--p-text)]/10'
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
			<div className="border-b border-[var(--p-border)] px-4 pb-3.5 pt-[calc(env(safe-area-inset-top)+4.25rem)] sm:px-6 sm:pt-8 lg:px-12 lg:py-3.5">
				<div className="mx-auto h-3 w-32 max-w-[980px] animate-pulse bg-[var(--p-border)]" />
			</div>
			<div className="mx-auto w-full max-w-[980px] px-4 py-6 sm:px-6 sm:py-10 lg:px-12 lg:py-14">
				<div className="mb-8 flex items-baseline justify-between border-b border-[var(--p-rule-strong)] pb-3 sm:mb-10">
					<div className="h-5 w-40 animate-pulse bg-[var(--p-border)]" />
					<div className="h-3 w-24 animate-pulse bg-[var(--p-border)]" />
				</div>
				<div className="mb-12 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4 sm:mb-14 sm:p-5">
					<div className="grid gap-3 sm:grid-cols-5">
						{[1, 2, 3, 4, 5].map((i) => (
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
				className="min-h-10 rounded-sm bg-[var(--p-text)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-bg)] hover:opacity-90"
			>
				{retryLabel}
			</Button>
		</div>
	)
}
