/**
 * Orders - compact responsive order index.
 *
 * Matches the current portal market language: centered top action, compact
 * summary controls, card grids on mobile/tablet, and no horizontal overflow.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { ParseKeys } from 'i18next'
import { ChevronDown, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { DraftQuoteTrigger } from '../../components/shared/DraftQuoteTrigger'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import { deleteOrder, getAllCustomerOrders } from '../../lib/server/orders'
import { useDraftQuoteStore } from '../../stores/draft-quote'
import { usePortalStore } from '../../stores/portal'
import type { Order, OrderStatus, OrderType } from '../../types/order'

const ordersSearchSchema = z.object({
	draft: z
		.preprocess(
			(value) =>
				value === true || value === 'true' || value === '1' || value === 1,
			z.boolean(),
		)
		.optional(),
})

export const Route = createFileRoute('/_portal/orders')({
	validateSearch: (search) => ordersSearchSchema.parse(search),
	component: OrdersPage,
})

const SECTION_META: Record<
	OrderType,
	{
		labelKey: 'orders.saved' | 'orders.submitted' | 'orders.confirmed'
	}
> = {
	saved: { labelKey: 'orders.saved' },
	submitted: { labelKey: 'orders.submitted' },
	confirmed: { labelKey: 'orders.confirmed' },
}

const ORDER_PREVIEW_SLOT_COUNT = 3
const ORDER_PREVIEW_SLOT_KEYS = ['slot-1', 'slot-2', 'slot-3'] as const
const ORDER_STATUS_LABEL_KEYS: Partial<
	Record<OrderStatus, ParseKeys<'portal'>>
> = {
	order_confirmed: 'tracking.confirmed',
	being_prepared: 'tracking.beingPrepared',
	out_for_delivery: 'tracking.outForDelivery',
	delivered: 'tracking.delivered',
	cancelled: 'tracking.cancelled',
	rejected: 'tracking.rejected',
}
type MarketDraftItem = ReturnType<
	typeof useDraftQuoteStore.getState
>['items'][number]

function OrdersPage() {
	const { t, i18n } = useTranslation('portal')
	const { draft } = Route.useSearch()
	const navigate = useNavigate()
	const isAr = i18n.language === 'ar'
	const savedSectionRef = useRef<HTMLElement | null>(null)
	const submittedSectionRef = useRef<HTMLElement | null>(null)
	const confirmedSectionRef = useRef<HTMLElement | null>(null)
	const draftItems = useDraftQuoteStore((s) => s.items)
	const setDraftQuoteOpen = usePortalStore((s) => s.setDraftQuoteOpen)
	const [collapsedSections, setCollapsedSections] = useState<
		Record<OrderType, boolean>
	>({
		saved: true,
		submitted: true,
		confirmed: true,
	})

	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ['customer-orders-all'],
		queryFn: () => getAllCustomerOrders(),
		staleTime: 30_000,
	})

	const grouped = useMemo(() => {
		if (!data?.orders) return { saved: [], submitted: [], confirmed: [] }
		return {
			saved: data.orders.filter((order) => order.type === 'saved'),
			submitted: data.orders.filter((order) => order.type === 'submitted'),
			confirmed: data.orders.filter((order) => order.type === 'confirmed'),
		}
	}, [data])

	const totalCount =
		grouped.saved.length + grouped.submitted.length + grouped.confirmed.length
	const hasDraft = draftItems.length > 0
	useEffect(() => {
		if (draft) {
			setDraftQuoteOpen(true)
			navigate({ to: '/orders', search: {}, replace: true })
		}
	}, [draft, navigate, setDraftQuoteOpen])

	const openDraft = () => {
		setDraftQuoteOpen(true)
	}
	const toggleSection = (type: OrderType) => {
		setCollapsedSections((current) => ({
			...current,
			[type]: !current[type],
		}))
	}
	const scrollToSection = (type: OrderType) => {
		setCollapsedSections((current) => ({
			...current,
			[type]: false,
		}))
		requestAnimationFrame(() => {
			const target =
				type === 'saved'
					? savedSectionRef.current
					: type === 'submitted'
						? submittedSectionRef.current
						: confirmedSectionRef.current

			target?.scrollIntoView({
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
					? 'auto'
					: 'smooth',
				block: 'start',
			})
		})
	}

	return (
		<div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-[var(--p-bg)]">
			<header className="sticky top-0 z-20 shrink-0 bg-[var(--p-bg)] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-12 lg:pb-6">
				<div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3">
					<PortalTitleRow title={t('sidebar.nav.orders')} className="flex-1" />
					<Link
						to="/market"
						className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 text-[13px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] sm:h-11 sm:px-5 sm:text-[14px]"
					>
						<Plus size={16} strokeWidth={1.8} />
						{t('orders.newQuote')}
					</Link>
				</div>
			</header>

			<section className="shrink-0 border-y border-[var(--p-border)] py-2.5 sm:py-3">
				<div className="mx-auto grid w-full max-w-[1400px] grid-cols-3 gap-2 px-4 sm:gap-3 sm:px-6 lg:px-12">
					<SummaryTile
						type="saved"
						count={grouped.saved.length}
						isAr={isAr}
						onSelect={() => scrollToSection('saved')}
					/>
					<SummaryTile
						type="submitted"
						count={grouped.submitted.length}
						isAr={isAr}
						onSelect={() => scrollToSection('submitted')}
					/>
					<SummaryTile
						type="confirmed"
						count={grouped.confirmed.length}
						isAr={isAr}
						onSelect={() => scrollToSection('confirmed')}
					/>
				</div>
			</section>

			<main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-8 lg:px-12">
				{isLoading && <OrdersSkeleton />}

				{isError && (
					<div className="flex flex-col items-center gap-4 px-4 py-20 text-center sm:py-24">
						<p className="text-[16px] font-medium text-[var(--p-text)]">
							{t('orders.error')}
						</p>
						<button
							type="button"
							onClick={() => refetch()}
							className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--p-border)] px-5 text-[14px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)]"
						>
							{t('orders.retry')}
						</button>
					</div>
				)}

				{!isLoading && !isError && totalCount === 0 && !hasDraft && (
					<OrdersEmpty />
				)}

				{!isLoading && !isError && (totalCount > 0 || hasDraft) && (
					<div className="space-y-8 sm:space-y-10 lg:space-y-12">
						{hasDraft && (
							<MarketDraftTile
								items={draftItems}
								isAr={isAr}
								onOpen={openDraft}
							/>
						)}
						<OrdersSection
							type="saved"
							orders={grouped.saved}
							isAr={isAr}
							isCollapsed={collapsedSections.saved}
							onToggle={() => toggleSection('saved')}
							sectionRef={savedSectionRef}
						/>
						<OrdersSection
							type="submitted"
							orders={grouped.submitted}
							isAr={isAr}
							isCollapsed={collapsedSections.submitted}
							onToggle={() => toggleSection('submitted')}
							sectionRef={submittedSectionRef}
						/>
						<OrdersSection
							type="confirmed"
							orders={grouped.confirmed}
							isAr={isAr}
							isCollapsed={collapsedSections.confirmed}
							onToggle={() => toggleSection('confirmed')}
							sectionRef={confirmedSectionRef}
						/>
					</div>
				)}
			</main>
		</div>
	)
}

function SummaryTile({
	type,
	count,
	isAr,
	onSelect,
}: {
	type: OrderType
	count: number
	isAr: boolean
	onSelect: () => void
}) {
	const { t } = useTranslation('portal')
	const meta = SECTION_META[type]

	return (
		<button
			type="button"
			onClick={onSelect}
			disabled={count === 0}
			className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-2 py-2 text-center transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] disabled:cursor-default disabled:opacity-45 sm:min-h-[52px] sm:flex-row sm:justify-start sm:gap-2 sm:px-4 sm:text-start"
		>
			<p
				className="shrink-0 font-mono text-[16px] font-semibold leading-none text-[var(--p-text)] sm:text-[17px]"
				style={{ fontVariantNumeric: 'tabular-nums' }}
			>
				{isAr ? count.toLocaleString('ar-EG') : count.toLocaleString('en-EG')}
			</p>
			<p className="min-w-0 truncate text-[11px] font-medium leading-tight text-[var(--p-text-muted)] sm:text-[12px]">
				{t(meta.labelKey)}
			</p>
		</button>
	)
}

function MarketDraftTile({
	items,
	isAr,
	onOpen,
}: {
	items: MarketDraftItem[]
	isAr: boolean
	onOpen: () => void
}) {
	const { t } = useTranslation('portal')
	const previewItems = items.slice(0, ORDER_PREVIEW_SLOT_COUNT)
	const extraItemCount = Math.max(0, items.length - previewItems.length)

	return (
		<section aria-label={t('market.draftQuote')}>
			<article className="flex min-w-0 flex-col rounded-xl border border-dashed border-[var(--p-border-strong)] bg-[var(--p-card)] p-3.5 sm:p-4">
				<DraftQuoteTrigger count={items.length} isAr={isAr} onClick={onOpen} />

				<div className="mt-3 grid gap-2">
					{previewItems.map((item) => {
						const itemName = isAr && item.nameAr ? item.nameAr : item.name
						return (
							<div
								key={item.productId}
								className="flex min-w-0 items-center gap-2.5"
							>
								<img
									src={item.imageUrl}
									alt={itemName}
									loading="lazy"
									decoding="async"
									className="h-9 w-9 shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)] sm:h-10 sm:w-10"
								/>
								<div className="min-w-0 flex-1">
									<p className="truncate text-[13px] font-medium text-[var(--p-text)]">
										{itemName}
									</p>
									<p
										className="font-mono text-[12px] text-[var(--p-text-muted)]"
										style={{ fontVariantNumeric: 'tabular-nums' }}
									>
										{formatQuantity(item.quantity, isAr)} {item.unitOfMeasure}
									</p>
								</div>
							</div>
						)
					})}
					{extraItemCount > 0 && (
						<p className="px-0.5 text-[12px] font-medium text-[var(--p-text-muted)]">
							+
							{t('market.cartItemCount', {
								count: formatQuantity(extraItemCount, isAr),
							})}
						</p>
					)}
				</div>
			</article>
		</section>
	)
}

function OrdersSection({
	type,
	orders,
	isAr,
	isCollapsed,
	onToggle,
	sectionRef,
}: {
	type: OrderType
	orders: Order[]
	isAr: boolean
	isCollapsed: boolean
	onToggle: () => void
	sectionRef: RefObject<HTMLElement | null>
}) {
	const { t } = useTranslation('portal')
	const meta = SECTION_META[type]

	if (orders.length === 0) return null

	return (
		<section aria-label={t(meta.labelKey)}>
			<header
				ref={sectionRef}
				className="scroll-mt-[76px] mb-3 border-b border-[var(--p-border)] pb-2.5 sm:scroll-mt-24 lg:scroll-mt-28"
			>
				<button
					type="button"
					aria-expanded={!isCollapsed}
					onClick={onToggle}
					className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 text-start transition-colors hover:bg-[var(--p-hover)] sm:px-3"
				>
					<span className="flex min-w-0 items-center gap-2">
						<ChevronDown
							size={17}
							strokeWidth={1.8}
							className={`shrink-0 text-[var(--p-text-muted)] transition-transform ${
								isCollapsed ? '-rotate-90 rtl:rotate-90' : ''
							}`}
						/>
						<span className="truncate text-[17px] font-semibold text-[var(--p-text)] sm:text-[18px]">
							{t(meta.labelKey)}
						</span>
					</span>
					<span
						className="shrink-0 font-mono text-[12px] text-[var(--p-text-muted)]"
						style={{ fontVariantNumeric: 'tabular-nums' }}
					>
						{isAr
							? orders.length.toLocaleString('ar-EG')
							: orders.length.toLocaleString('en-EG')}
					</span>
				</button>
			</header>
			{!isCollapsed &&
				(type === 'saved' ? (
					<SavedDraftList orders={orders} isAr={isAr} />
				) : (
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
						{orders.map((order) => (
							<OrderTile key={order.id} order={order} isAr={isAr} />
						))}
					</div>
				))}
		</section>
	)
}

function SavedDraftList({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
	const { t } = useTranslation('portal')

	return (
		<div className="space-y-3">
			<p className="px-1 text-[13px] leading-relaxed text-[var(--p-text-muted)]">
				{t('orders.savedDraftsHelp')}
			</p>
			<div className="grid gap-2">
				{orders.map((order) => (
					<SavedDraftRow key={order.id} order={order} isAr={isAr} />
				))}
			</div>
		</div>
	)
}

function SavedDraftRow({ order, isAr }: { order: Order; isAr: boolean }) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [confirmDelete, setConfirmDelete] = useState(false)
	const title = order.name ?? order.reference ?? order.id
	const dateLabel = formatDate(order.date, isAr)
	const sourceLabel =
		order.draftSource === 'lyon'
			? t('orders.lyonDraft')
			: t('orders.manualDraft')
	const previewItems = order.items.slice(0, ORDER_PREVIEW_SLOT_COUNT)
	const extraItemCount = Math.max(0, order.items.length - previewItems.length)

	const deleteMutation = useMutation({
		mutationFn: () => deleteOrder({ data: { orderId: order.id } }),
		onSuccess: () => {
			queryClient.setQueryData<{ orders: Order[] }>(
				['customer-orders-all'],
				(current) =>
					current
						? {
								orders: current.orders.filter((item) => item.id !== order.id),
							}
						: current,
			)
		},
	})

	function openEditor() {
		navigate({
			to: '/orders/edit/$orderId',
			params: { orderId: order.id },
		})
	}

	function duplicateDraft() {
		const duplicate: Order = {
			...order,
			id: `${order.id}-copy-${Date.now()}`,
			name: t('orders.copyName', { name: title }),
			draftSource: 'customer',
			date: new Date().toISOString(),
			items: order.items.map((item) => ({ ...item })),
		}
		queryClient.setQueryData<{ orders: Order[] }>(
			['customer-orders-all'],
			(current) =>
				current
					? { orders: [duplicate, ...current.orders] }
					: { orders: [duplicate] },
		)
	}

	return (
		<article className="grid min-w-0 gap-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-3.5 transition-colors hover:border-[var(--p-border-strong)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
			<div className="min-w-0">
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<span className="rounded-full border border-[var(--p-border)] bg-[var(--p-input)] px-2.5 py-1 text-[11px] font-medium text-[var(--p-text-muted)]">
						{sourceLabel}
					</span>
					<span className="font-mono text-[11px] text-[var(--p-text-faint)]">
						{t('orders.lastEdited', { date: dateLabel })}
					</span>
				</div>
				<h3 className="mt-2 truncate text-[16px] font-semibold text-[var(--p-text)] sm:text-[17px]">
					{title}
				</h3>
				<div className="mt-3 flex min-w-0 flex-wrap items-center gap-2.5">
					{previewItems.map((item) => {
						const itemName = isAr ? item.productNameAr : item.productName
						return (
							<div
								key={`${order.id}-${item.productId}`}
								className="flex max-w-full min-w-0 items-center gap-2 rounded-lg border border-[var(--p-border)] bg-[var(--p-bg)] py-1 pe-2 ps-1"
							>
								<img
									src={item.imageUrl}
									alt={itemName}
									loading="lazy"
									decoding="async"
									className="h-7 w-7 shrink-0 rounded-md bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)]"
								/>
								<span className="min-w-0 truncate text-[12px] text-[var(--p-text)]">
									{itemName}
								</span>
							</div>
						)
					})}
					{extraItemCount > 0 && (
						<span className="rounded-full border border-[var(--p-border)] px-2.5 py-1 text-[11px] text-[var(--p-text-muted)]">
							{t('orders.itemPreviewMore', { count: extraItemCount })}
						</span>
					)}
				</div>
				<p className="mt-2 text-[12px] text-[var(--p-text-muted)]">
					{t('orders.items', { count: order.itemCount })}
				</p>
			</div>

			{confirmDelete ? (
				<div className="grid gap-2 sm:w-[240px] sm:grid-cols-2">
					<button
						type="button"
						onClick={() => deleteMutation.mutate()}
						disabled={deleteMutation.isPending}
						className="h-10 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-error)] transition-colors hover:bg-[var(--p-hover)] disabled:opacity-50"
					>
						{t('orders.confirmDelete')}
					</button>
					<button
						type="button"
						onClick={() => setConfirmDelete(false)}
						className="h-10 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
					>
						{t('orders.cancel')}
					</button>
				</div>
			) : (
				<div className="grid grid-cols-[minmax(0,1fr)_40px_40px_40px] items-center gap-2 sm:w-[360px]">
					<button
						type="button"
						onClick={openEditor}
						className="inline-flex h-10 min-w-0 items-center justify-center rounded-xl bg-[var(--p-accent)] px-3 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
					>
						<span className="truncate">{t('orders.reviewSubmit')}</span>
					</button>
					<button
						type="button"
						onClick={openEditor}
						aria-label={t('orders.edit')}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)]"
					>
						<Pencil size={15} strokeWidth={1.8} />
					</button>
					<button
						type="button"
						onClick={duplicateDraft}
						aria-label={t('orders.duplicate')}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
					>
						<Copy size={15} strokeWidth={1.8} />
					</button>
					<button
						type="button"
						onClick={() => setConfirmDelete(true)}
						aria-label={t('orders.delete')}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--p-border)] text-[var(--p-text-muted)] transition-colors hover:border-[var(--p-error)] hover:bg-[var(--p-hover)] hover:text-[var(--p-error)]"
					>
						<Trash2 size={15} strokeWidth={1.8} />
					</button>
				</div>
			)}
		</article>
	)
}

function OrderTile({ order, isAr }: { order: Order; isAr: boolean }) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()

	const isSubmitted = order.type === 'submitted'
	const title = order.name ?? order.reference ?? order.id
	const statusKey = order.status ? ORDER_STATUS_LABEL_KEYS[order.status] : null
	const statusLabel =
		order.type === 'saved' && order.draftSource === 'lyon'
			? t('orders.lyon')
			: statusKey
				? t(statusKey)
				: t(SECTION_META[order.type].labelKey)
	const dateLabel = formatDate(order.date, isAr)
	const amountLabel = formatAmount(order, isAr)
	const previewItems = order.items.slice(0, ORDER_PREVIEW_SLOT_COUNT)
	const previewSlots = ORDER_PREVIEW_SLOT_KEYS.map((slotKey, index) => ({
		slotKey,
		item: previewItems[index],
	}))

	function openOrder() {
		navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
	}

	return (
		<article className="flex min-w-0 flex-col rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-3.5 sm:p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-[12px] font-medium text-[var(--p-text-muted)]">
						{statusLabel}
					</p>
					<h3 className="mt-0.5 line-clamp-2 break-words text-[16px] font-semibold leading-snug text-[var(--p-text)] sm:mt-1 sm:text-[17px]">
						{title}
					</h3>
				</div>
				<span className="shrink-0 rounded-full border border-[var(--p-border)] bg-[var(--p-input)] px-2.5 py-1 text-[11px] font-medium text-[var(--p-text-muted)]">
					{dateLabel}
				</span>
			</div>

			<div className="mt-3 grid gap-2">
				{previewSlots.map(({ slotKey, item }) => {
					if (!item) {
						return (
							<div
								key={`${order.id}-${slotKey}`}
								aria-hidden="true"
								className="flex h-9 min-w-0 items-center gap-2.5 sm:h-10"
							/>
						)
					}

					const itemName = isAr ? item.productNameAr : item.productName
					return (
						<div
							key={`${order.id}-${item.productId}`}
							className="flex min-w-0 items-center gap-2.5"
						>
							<img
								src={item.imageUrl}
								alt={itemName}
								loading="lazy"
								decoding="async"
								className="h-9 w-9 shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)] sm:h-10 sm:w-10"
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate text-[13px] font-medium text-[var(--p-text)]">
									{itemName}
								</p>
								<p
									className="font-mono text-[12px] text-[var(--p-text-muted)]"
									style={{ fontVariantNumeric: 'tabular-nums' }}
								>
									{formatQuantity(item.quantity, isAr)} {item.unitOfMeasure}
								</p>
							</div>
						</div>
					)
				})}
			</div>

			{isSubmitted && (
				<p className="mt-3 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2 text-[12px] leading-relaxed text-[var(--p-text-muted)]">
					{t('tracking.reviewingOrderMessage')}
				</p>
			)}

			<div className="mt-3 border-t border-[var(--p-border)] pt-3">
				<div className="grid grid-cols-[minmax(0,1fr)_minmax(108px,0.8fr)] items-center gap-2">
					<div className="min-w-0">
						<p className="truncate text-[12px] text-[var(--p-text-muted)]">
							{t('orders.items', { count: order.itemCount })}
						</p>
						{amountLabel && (
							<p
								className="mt-0.5 truncate font-mono text-[12px] font-semibold text-[var(--p-text)] sm:text-[13px]"
								style={{ fontVariantNumeric: 'tabular-nums' }}
							>
								{amountLabel}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={openOrder}
						className="inline-flex h-10 min-w-0 items-center justify-center rounded-xl bg-[var(--p-accent)] px-3 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
					>
						<span className="truncate">{t('orders.view')}</span>
					</button>
				</div>
			</div>
		</article>
	)
}

function OrdersEmpty() {
	const { t } = useTranslation('portal')
	return (
		<div className="flex flex-col items-center gap-4 px-4 py-20 text-center sm:py-24">
			<p className="text-[18px] font-semibold text-[var(--p-text)]">
				{t('orders.noOrders')}
			</p>
			<p className="max-w-sm text-[13px] leading-relaxed text-[var(--p-text-muted)]">
				{t('orders.noOrdersBody')}
			</p>
			<Link
				to="/market"
				className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-5 text-[14px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
			>
				<Plus size={16} strokeWidth={1.8} />
				{t('orders.newQuote')}
			</Link>
		</div>
	)
}

const SKELETON_SECTIONS = ['saved', 'submitted'] as const
const SKELETON_CARDS = ['a', 'b', 'c'] as const

function OrdersSkeleton() {
	return (
		<div className="space-y-10 sm:space-y-12">
			{SKELETON_SECTIONS.map((section) => (
				<section key={section}>
					<div className="mb-4 flex items-center justify-between border-b border-[var(--p-border)] pb-3">
						<div className="h-5 w-28 animate-pulse rounded bg-[var(--p-border)]" />
						<div className="h-4 w-6 animate-pulse rounded bg-[var(--p-border)]" />
					</div>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
						{SKELETON_CARDS.map((card) => (
							<div
								key={`${section}-${card}`}
								className="rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4"
							>
								<div className="flex justify-between gap-4">
									<div className="h-5 w-2/3 animate-pulse rounded bg-[var(--p-border)]" />
									<div className="h-5 w-14 animate-pulse rounded-full bg-[var(--p-border)]" />
								</div>
								<div className="mt-5 space-y-3">
									<div className="h-10 w-full animate-pulse rounded-lg bg-[var(--p-border)]" />
									<div className="h-10 w-full animate-pulse rounded-lg bg-[var(--p-border)]" />
									<div className="h-10 w-5/6 animate-pulse rounded-lg bg-[var(--p-border)]" />
								</div>
								<div className="mt-5 h-11 animate-pulse rounded-xl bg-[var(--p-border)]" />
							</div>
						))}
					</div>
				</section>
			))}
		</div>
	)
}

function formatQuantity(value: number, isAr: boolean): string {
	return value.toLocaleString(isAr ? 'ar-EG' : 'en-EG', {
		maximumFractionDigits: 0,
	})
}

function formatDate(iso: string, isAr: boolean): string {
	return new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-EG', {
		day: '2-digit',
		month: 'short',
	}).format(new Date(iso))
}

function formatAmount(order: Order, isAr: boolean): string | null {
	if (order.amount == null) return null
	const amount = order.amount.toLocaleString(isAr ? 'ar-EG' : 'en-EG', {
		maximumFractionDigits: 0,
	})
	return `${order.currency} ${amount}`
}
