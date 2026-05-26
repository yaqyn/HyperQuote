/**
 * Order detail — customer-facing status summary.
 *
 * The live route map and delivery secret live on the Orders page incoming card.
 * This page keeps the order record, status, items, timeline, and documents.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import {
	ArrowLeft,
	Check,
	Clock,
	Download,
	FileText,
	Truck,
	UserRound,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import {
	customerDeliveryDestinationPlace,
	describeDriverLocationForCustomer,
} from '../../lib/delivery-location-copy'
import { portalHead } from '../../lib/page-meta'
import {
	getOrderDetail,
	type OrderDetailResult,
	type OrderReportSection,
} from '../../lib/server/deliveries'
import { saveOrderAsDraft } from '../../lib/server/orders'
import { toast } from '../../lib/toast'
import type { OrderStatus } from '../../types/order'

export const Route = createFileRoute('/_portal/orders_/$orderId')({
	head: ({ params }) =>
		portalHead({
			title: 'Order Detail — HyperQuote Portal',
			description:
				'Private HyperQuote order detail with status, items, timeline, documents, delivery tracking, and draft actions.',
			path: `/orders/${params.orderId}`,
		}),
	component: OrderDetailWrapper,
	errorComponent: OrderDetailError,
})

const DETAIL_LABEL_CLASS =
	'text-[11px] font-semibold text-[var(--p-text-faint)]'
const DETAIL_SECTION_LABEL_CLASS =
	'text-[12px] font-semibold text-[var(--p-text)]'
const DETAIL_VALUE_META_CLASS =
	'text-[12px] font-medium text-[var(--p-text-muted)]'

function OrderDetailError() {
	const { t } = useTranslation('portal')
	return (
		<ErrorState
			message={t('tracking.errorState')}
			retryLabel={t('tracking.retry')}
			onRetry={() => globalThis.location?.reload()}
		/>
	)
}

function OrderDetailWrapper() {
	const { orderId } = Route.useParams()
	return <OrderDetailPage key={orderId} orderId={orderId} />
}

function OrderDetailPage({ orderId }: { orderId: string }) {
	const { t, i18n } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const isAr = i18n.language === 'ar'
	const [savedDraftReference, setSavedDraftReference] = useState<string | null>(
		null,
	)

	const {
		data: orderData,
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: ['order-detail', orderId],
		queryFn: () => getOrderDetail({ data: { orderId } }),
		refetchInterval: 5_000,
		refetchIntervalInBackground: true,
		staleTime: 5_000,
	})

	const saveDraftMutation = useMutation({
		mutationFn: () => saveOrderAsDraft({ data: { orderId } }),
		onMutate: () => {
			setSavedDraftReference(null)
		},
		onSuccess: (result) => {
			setSavedDraftReference(result.reference)
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] })
			toast.success(t('orders.savedAsDraft', { ref: result.reference }))
		},
		onError: () => {
			toast.error(t('orders.saveDraftFailed'))
		},
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
					<span className="text-[12px] font-medium text-[var(--p-text-faint)]">
						/
					</span>
					<span className="min-w-0 truncate text-[12px] font-medium text-[var(--p-text-muted)]">
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
							<span className={DETAIL_VALUE_META_CLASS}>{formattedDate}</span>
							<button
								type="button"
								onClick={() =>
									downloadOrderReport(
										orderData,
										isAr ? 'ar-EG' : 'en-GB',
										moneyFmt,
									)
								}
								className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)]"
							>
								<Download size={13} strokeWidth={1.8} />
								{t('tracking.downloadReport')}
							</button>
							<button
								type="button"
								onClick={() => saveDraftMutation.mutate()}
								disabled={saveDraftMutation.isPending}
								className="h-9 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text)] transition-colors hover:bg-[var(--p-hover)] disabled:pointer-events-none disabled:opacity-60"
							>
								{saveDraftMutation.isPending
									? t('quoteBuilder.savingDraft')
									: t('orders.saveAsDraft')}
							</button>
							{savedDraftReference && (
								<span className="text-[12px] font-medium text-[var(--p-text-muted)]">
									{t('orders.savedAsDraft', { ref: savedDraftReference })}
								</span>
							)}
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

				<OrderStatusHero
					data={orderData}
					formattedDate={formattedDate}
					statusLabel={statusLabel}
					total={total}
				/>

				<OrderReportPanel
					data={orderData}
					dateFmt={dateFmt}
					moneyFmt={moneyFmt}
				/>

				{/* Items */}
				<section className={isSubmitted ? 'mt-8 sm:mt-10' : 'mt-12 sm:mt-14'}>
					<header className="mb-2 flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--p-rule-strong)] pb-2">
						<h2 className={DETAIL_SECTION_LABEL_CLASS}>
							{t('orders.items', { count: order.itemCount })}
						</h2>
						<span className={DETAIL_LABEL_CLASS}>
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
									<span
										className={`col-span-2 sm:col-span-1 ${DETAIL_LABEL_CLASS}`}
									>
										№ {refNo}
									</span>
									<div className="min-w-0">
										<p className="break-words text-[14px] text-[var(--p-text)] sm:truncate">
											{isAr ? item.productNameAr : item.productName}
										</p>
										<p
											className="mt-0.5 break-words text-[12px] font-medium text-[var(--p-text-muted)]"
											style={{ fontVariantNumeric: 'tabular-nums' }}
										>
											{item.quantity}{' '}
											{isAr && item.unitOfMeasureAr
												? item.unitOfMeasureAr
												: item.unitOfMeasure}
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
											className="text-end text-[13px] font-semibold text-[var(--p-text)]"
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
							<span className={DETAIL_LABEL_CLASS}>{t('tracking.amount')}</span>
							<span
								className="break-all text-[18px] font-semibold text-[var(--p-text)]"
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
							<h2 className={DETAIL_SECTION_LABEL_CLASS}>
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
													className="mt-1 break-words text-[12px] font-medium text-[var(--p-text-faint)]"
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
							<h2 className={DETAIL_SECTION_LABEL_CLASS}>
								{t('tracking.documents')}
							</h2>
							<span className={DETAIL_LABEL_CLASS}>
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
												className="mt-0.5 text-[12px] font-medium text-[var(--p-text-faint)]"
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

const REPORT_SECTION_LABEL_KEYS: Record<
	OrderReportSection['id'],
	ParseKeys<'portal'>
> = {
	confirmed: 'tracking.reportConfirmed',
	delivered: 'tracking.reportDelivered',
	dispatch: 'tracking.reportDispatch',
	payment: 'tracking.reportPayment',
	processing: 'tracking.reportProcessing',
	stopped: 'tracking.reportStopped',
	submitted: 'tracking.reportSubmitted',
}

const REPORT_STATUS_LABEL_KEYS: Record<
	OrderReportSection['status'],
	ParseKeys<'portal'>
> = {
	completed: 'tracking.reportCompleted',
	current: 'tracking.reportCurrent',
	future: 'tracking.reportFuture',
	stopped: 'tracking.reportStopped',
}

function OrderReportPanel({
	data,
	dateFmt,
	moneyFmt,
}: {
	data: OrderDetailResult
	dateFmt: Intl.DateTimeFormat
	moneyFmt: Intl.NumberFormat
}) {
	const { t } = useTranslation('portal')
	const sections = data.report.sections
	return (
		<section className="mt-8 sm:mt-10">
			<div className="overflow-hidden rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)]">
				<header className="border-b border-[var(--p-border)] px-4 py-4 sm:px-5 lg:px-6">
					<p className={DETAIL_LABEL_CLASS}>{t('tracking.orderReport')}</p>
					<div className="mt-2 flex flex-wrap items-center justify-between gap-3">
						<h2 className="text-[22px] font-semibold leading-tight text-[var(--p-text)] sm:text-[26px]">
							{data.order.reference}
						</h2>
						<span className="rounded-full border border-[var(--p-border)] px-3 py-1 text-[12px] font-medium text-[var(--p-text-muted)]">
							{t('tracking.reportGenerated', {
								date: formatReportDate(data.report.generatedAt, dateFmt),
							})}
						</span>
					</div>
				</header>
				<div className="divide-y divide-[var(--p-border)]">
					{sections.map((section) => (
						<LifecycleBlock
							key={section.id}
							icon={reportSectionIcon(section)}
							title={t(REPORT_SECTION_LABEL_KEYS[section.id])}
							eyebrow={t(REPORT_STATUS_LABEL_KEYS[section.status])}
							body={section.summary}
							facts={section.facts.map((fact) => ({
								label: fact.label,
								value: formatReportFact(fact, dateFmt, moneyFmt),
							}))}
							lines={section.lines}
							linesLabel={
								section.lines.length > 0
									? t('tracking.reportDetails')
									: undefined
							}
						/>
					))}
				</div>
			</div>
		</section>
	)
}

function reportSectionIcon(section: OrderReportSection): ReactNode {
	if (section.status === 'stopped')
		return <FileText size={16} strokeWidth={1.8} />
	switch (section.id) {
		case 'submitted':
			return <UserRound size={16} strokeWidth={1.8} />
		case 'confirmed':
		case 'payment':
			return <FileText size={16} strokeWidth={1.8} />
		case 'dispatch':
			return <Truck size={16} strokeWidth={1.8} />
		case 'delivered':
			return <Check size={16} strokeWidth={2.2} />
		default:
			return <Clock size={16} strokeWidth={1.8} />
	}
}

function formatReportDate(
	value: string | null | undefined,
	dateFmt: Intl.DateTimeFormat,
) {
	if (!value) return ''
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return dateFmt.format(date)
}

function formatReportFact(
	fact: LifecycleFact,
	dateFmt: Intl.DateTimeFormat,
	moneyFmt: Intl.NumberFormat,
) {
	const lower = fact.label.toLowerCase()
	if (
		/(at|date|eta|updated|submitted|delivered|generated)/.test(lower) &&
		/^\d{4}-\d{2}-\d{2}/.test(fact.value)
	) {
		return formatReportDate(fact.value, dateFmt)
	}
	const numericValue = Number(fact.value)
	if (
		Number.isFinite(numericValue) &&
		/(total|vat|fee|discount|paid|remaining|subtotal|amount)/.test(lower)
	) {
		return `EGP ${moneyFmt.format(numericValue)}`
	}
	return fact.value.replaceAll('_', ' ')
}

function downloadOrderReport(
	data: OrderDetailResult,
	locale: string,
	moneyFmt: Intl.NumberFormat,
) {
	const generated = new Intl.DateTimeFormat(locale, {
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date(data.report.generatedAt))
	const reportDocument = document.implementation.createHTMLDocument(
		`${data.order.reference} order report`,
	)
	reportDocument.documentElement.lang = locale.startsWith('ar') ? 'ar' : 'en'
	const meta = reportDocument.createElement('meta')
	meta.setAttribute('charset', 'utf-8')
	reportDocument.head.append(meta)
	const style = reportDocument.createElement('style')
	style.textContent = `
		body{font-family:Inter,Arial,sans-serif;margin:40px;color:#151515;line-height:1.45}
		header{border-bottom:2px solid #151515;margin-bottom:28px;padding-bottom:14px}
		h1{font-size:28px;margin:0 0 8px}
		h2{font-size:18px;margin:28px 0 8px}
		h2 span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-left:8px}
		p{color:#444;margin:0 0 12px}
		table{width:100%;border-collapse:collapse;margin:12px 0}
		th,td{border-top:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
		th{width:220px;color:#555}
		ul{margin:12px 0 0;padding-left:20px}
		li{margin:4px 0}
	`
	reportDocument.head.append(style)

	const header = reportDocument.createElement('header')
	appendReportText(reportDocument, header, 'h1', data.order.reference)
	appendReportText(reportDocument, header, 'p', `Generated ${generated}`)
	reportDocument.body.append(header)

	for (const section of data.report.sections) {
		const sectionElement = reportDocument.createElement('section')
		const heading = appendReportText(
			reportDocument,
			sectionElement,
			'h2',
			section.label,
		)
		appendReportText(reportDocument, heading, 'span', section.status)
		appendReportText(reportDocument, sectionElement, 'p', section.summary)

		const table = reportDocument.createElement('table')
		const tableBody = reportDocument.createElement('tbody')
		for (const fact of section.facts) {
			const row = reportDocument.createElement('tr')
			appendReportText(reportDocument, row, 'th', fact.label)
			appendReportText(
				reportDocument,
				row,
				'td',
				formatExportFact(fact, moneyFmt),
			)
			tableBody.append(row)
		}
		table.append(tableBody)
		sectionElement.append(table)

		if (section.lines.length > 0) {
			const list = reportDocument.createElement('ul')
			for (const line of section.lines) {
				appendReportText(reportDocument, list, 'li', line)
			}
			sectionElement.append(list)
		}

		reportDocument.body.append(sectionElement)
	}

	const blob = new Blob(
		[`<!doctype html>\n${reportDocument.documentElement.outerHTML}`],
		{ type: 'text/html;charset=utf-8' },
	)
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = data.report.exportFileName
	document.body.append(anchor)
	anchor.click()
	anchor.remove()
	window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function formatExportFact(fact: LifecycleFact, moneyFmt: Intl.NumberFormat) {
	const lower = fact.label.toLowerCase()
	const numericValue = Number(fact.value)
	if (
		Number.isFinite(numericValue) &&
		/(total|vat|fee|discount|paid|remaining|subtotal|amount)/.test(lower)
	) {
		return `EGP ${moneyFmt.format(numericValue)}`
	}
	return fact.value.replaceAll('_', ' ')
}

function appendReportText<K extends keyof HTMLElementTagNameMap>(
	reportDocument: Document,
	parent: Node,
	tagName: K,
	text: string,
) {
	const element = reportDocument.createElement(tagName)
	element.textContent = text
	parent.appendChild(element)
	return element
}

function OrderStatusHero({
	data,
	formattedDate,
	statusLabel,
	total,
}: {
	data: OrderDetailResult
	formattedDate: string
	statusLabel: string
	total: string | null
}) {
	const { t, i18n } = useTranslation('portal')
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-GB'
	const { order, delivery, timeline } = data
	const driverPlaceLabel = delivery
		? describeDriverLocationForCustomer(delivery)
		: null
	const destinationLabel = delivery
		? (customerDeliveryDestinationPlace(delivery) ?? delivery.route.destination)
		: null
	const currentStep =
		timeline.find((step) => step.status === 'current') ?? timeline[0]
	const currentStepLabel = currentStep
		? t(getTimelineStepLabelKey(currentStep.key) ?? 'tracking.orderStatus')
		: statusLabel
	const eta =
		delivery && order.status === 'out_for_delivery'
			? formatEta(delivery.estimatedArrival, locale)
			: null
	const updated =
		delivery && order.status === 'out_for_delivery'
			? formatUpdateTime(delivery.lastUpdated, locale)
			: null
	const statusIcon =
		order.status === 'out_for_delivery' ? (
			<Truck size={20} strokeWidth={2} />
		) : order.status === 'delivered' ? (
			<Check size={20} strokeWidth={2.3} />
		) : (
			<Clock size={20} strokeWidth={1.9} />
		)

	return (
		<section className="mt-8 overflow-hidden rounded-[28px] border border-[var(--p-border)] bg-[var(--p-card)] shadow-[0_24px_70px_rgba(15,23,42,0.06)] sm:mt-10">
			<div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
				<div className="relative px-5 py-6 sm:px-6 sm:py-7 lg:px-8">
					<div className="absolute inset-y-0 start-0 w-1 bg-[var(--p-accent)]" />
					<p className={DETAIL_LABEL_CLASS}>{t('tracking.orderStatus')}</p>
					<div className="mt-4 flex min-w-0 flex-wrap items-center gap-4">
						<span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--p-accent)] text-[var(--p-accent-contrast)]">
							{statusIcon}
						</span>
						<div className="min-w-0">
							<h2 className="break-words text-[25px] font-semibold leading-tight text-[var(--p-text)] sm:text-[32px]">
								{statusLabel}
							</h2>
							<p className="mt-1 text-[13px] leading-relaxed text-[var(--p-text-muted)]">
								{currentStepLabel}
							</p>
						</div>
					</div>

					<div className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
						<HeroMetric
							label={t('tracking.reference')}
							value={order.reference}
						/>
						<HeroMetric
							label={t('tracking.submittedAt')}
							value={formattedDate}
						/>
						<HeroMetric
							label={t('tracking.itemsOrdered')}
							value={t('orders.items', { count: order.itemCount })}
						/>
						{total && <HeroMetric label={t('tracking.amount')} value={total} />}
					</div>
				</div>

				<aside className="border-t border-[var(--p-border)] bg-[var(--p-surface)]/45 px-5 py-6 sm:px-6 lg:border-s lg:border-t-0 lg:px-7">
					<div className="flex items-center gap-2">
						<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--p-hover)] text-[var(--p-text-muted)]">
							<Truck size={16} strokeWidth={1.8} />
						</span>
						<p className={DETAIL_LABEL_CLASS}>
							{t('tracking.deliveryDetails')}
						</p>
					</div>
					{delivery ? (
						<div className="mt-5 grid gap-y-4">
							<HeroMetric
								label={t('tracking.driver')}
								value={delivery.driverName || delivery.deliveryNumber}
							/>
							{driverPlaceLabel && (
								<HeroMetric
									label={t('tracking.driverLocation')}
									value={driverPlaceLabel}
								/>
							)}
							<HeroMetric
								label={t('tracking.destination')}
								value={destinationLabel ?? delivery.route.destination}
							/>
							{eta && <HeroMetric label={t('tracking.etaLabel')} value={eta} />}
							{updated && (
								<HeroMetric
									label={t('tracking.updatedLabel')}
									value={updated}
								/>
							)}
						</div>
					) : (
						<p className="mt-3 text-[13px] leading-relaxed text-[var(--p-text-muted)]">
							{t('tracking.reviewingOrderMessage')}
						</p>
					)}
				</aside>
			</div>
		</section>
	)
}

function HeroMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0 border-b border-[var(--p-border)] pb-3">
			<p className={DETAIL_LABEL_CLASS}>{label}</p>
			<p className="mt-1 break-words text-[13px] font-medium text-[var(--p-text)]">
				{value}
			</p>
		</div>
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
					<p className="min-w-0 break-words text-[12px] font-medium text-[var(--p-text-faint)] sm:text-end">
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
							<dt className={DETAIL_LABEL_CLASS}>{fact.label}</dt>
							<dd className="mt-1 break-words text-[13px] text-[var(--p-text)]">
								{fact.value}
							</dd>
						</div>
					))}
				</dl>
				{lines && lines.length > 0 && (
					<div className="mt-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-3">
						{linesLabel && <p className={DETAIL_LABEL_CLASS}>{linesLabel}</p>}
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

function formatEta(estimatedArrival: string | null, locale: string) {
	const unavailable = locale.startsWith('ar') ? 'غير متاح' : 'ETA unavailable'
	if (!estimatedArrival) return unavailable
	const diffMinutes = Math.round(
		(new Date(estimatedArrival).getTime() - Date.now()) / 60_000,
	)
	if (!Number.isFinite(diffMinutes)) return unavailable
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
				className="min-h-10 rounded-xl bg-[var(--p-accent)] px-4 py-2 text-[13px] font-semibold text-[var(--p-accent-contrast)] hover:opacity-90"
			>
				{retryLabel}
			</Button>
		</div>
	)
}
