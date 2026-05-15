/**
 * Orders - compact responsive order index.
 *
 * Matches the current portal market language: centered top action, compact
 * summary controls, card grids on mobile/tablet, and no horizontal overflow.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
	Clock3,
	FileText,
	PackageCheck,
	Pencil,
	Plus,
	Send,
	Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PortalTitleRow } from '../../components/shell/PortalTitleRow'
import {
	deleteOrder,
	getAllCustomerOrders,
	submitOrder,
} from '../../lib/server/orders'
import type { Order, OrderType } from '../../types/order'

export const Route = createFileRoute('/_portal/orders')({
	component: OrdersPage,
})

const SECTION_META: Record<
	OrderType,
	{
		labelKey: 'orders.saved' | 'orders.submitted' | 'orders.confirmed'
		icon: typeof FileText
	}
> = {
	saved: { labelKey: 'orders.saved', icon: FileText },
	submitted: { labelKey: 'orders.submitted', icon: Clock3 },
	confirmed: { labelKey: 'orders.confirmed', icon: PackageCheck },
}

function OrdersPage() {
	const { t, i18n } = useTranslation('portal')
	const isAr = i18n.language === 'ar'

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

	return (
		<div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-[var(--p-bg)]">
			<header className="sticky top-0 z-20 shrink-0 bg-[var(--p-bg)] px-4 pb-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-5 lg:px-12 lg:pb-6">
				<div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<PortalTitleRow title={t('sidebar.nav.orders')} className="flex-1" />
					<Link
						to="/market"
						className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-5 text-[14px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)] sm:w-auto"
					>
						<Plus size={17} strokeWidth={1.8} />
						{t('orders.newQuote')}
					</Link>
				</div>
			</header>

			<section className="shrink-0 border-y border-[var(--p-border)] py-3">
				<div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-3 px-4 min-[440px]:grid-cols-3 sm:px-6 lg:px-12">
					<SummaryTile type="saved" count={grouped.saved.length} isAr={isAr} />
					<SummaryTile
						type="submitted"
						count={grouped.submitted.length}
						isAr={isAr}
					/>
					<SummaryTile
						type="confirmed"
						count={grouped.confirmed.length}
						isAr={isAr}
					/>
				</div>
			</section>

			<main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-12">
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

				{!isLoading && !isError && totalCount === 0 && <OrdersEmpty />}

				{!isLoading && !isError && totalCount > 0 && (
					<div className="space-y-10 sm:space-y-12">
						<OrdersSection type="saved" orders={grouped.saved} isAr={isAr} />
						<OrdersSection
							type="submitted"
							orders={grouped.submitted}
							isAr={isAr}
						/>
						<OrdersSection
							type="confirmed"
							orders={grouped.confirmed}
							isAr={isAr}
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
}: {
	type: OrderType
	count: number
	isAr: boolean
}) {
	const { t } = useTranslation('portal')
	const meta = SECTION_META[type]
	const Icon = meta.icon

	return (
		<div className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] px-3 py-3 text-center sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-start">
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--p-input)] text-[var(--p-text-muted)] sm:h-9 sm:w-9">
				<Icon size={16} strokeWidth={1.7} />
			</div>
			<div className="min-w-0">
				<p
					className="font-mono text-[18px] font-semibold leading-none text-[var(--p-text)]"
					style={{ fontVariantNumeric: 'tabular-nums' }}
				>
					{isAr ? count.toLocaleString('ar-EG') : count.toLocaleString('en-EG')}
				</p>
				<p className="mt-1 break-words text-[11px] font-medium leading-tight text-[var(--p-text-muted)] sm:text-[12px]">
					{t(meta.labelKey)}
				</p>
			</div>
		</div>
	)
}

function OrdersSection({
	type,
	orders,
	isAr,
}: {
	type: OrderType
	orders: Order[]
	isAr: boolean
}) {
	const { t } = useTranslation('portal')
	const meta = SECTION_META[type]

	if (orders.length === 0) return null

	return (
		<section aria-label={t(meta.labelKey)}>
			<header className="mb-4 flex items-center justify-between gap-3 border-b border-[var(--p-border)] pb-3">
				<h2 className="text-[18px] font-semibold text-[var(--p-text)]">
					{t(meta.labelKey)}
				</h2>
				<span
					className="font-mono text-[12px] text-[var(--p-text-muted)]"
					style={{ fontVariantNumeric: 'tabular-nums' }}
				>
					{isAr
						? orders.length.toLocaleString('ar-EG')
						: orders.length.toLocaleString('en-EG')}
				</span>
			</header>
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
				{orders.map((order) => (
					<OrderTile key={order.id} order={order} isAr={isAr} />
				))}
			</div>
		</section>
	)
}

function OrderTile({ order, isAr }: { order: Order; isAr: boolean }) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [confirmDelete, setConfirmDelete] = useState(false)

	const deleteMutation = useMutation({
		mutationFn: () => deleteOrder({ data: { orderId: order.id } }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] }),
	})

	const submitMutation = useMutation({
		mutationFn: () => submitOrder({ data: { orderId: order.id } }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ['customer-orders-all'] }),
	})

	const isSaved = order.type === 'saved'
	const title = order.name ?? order.reference ?? order.id
	const statusLabel = t(SECTION_META[order.type].labelKey)
	const dateLabel = formatDate(order.date, isAr)
	const amountLabel = formatAmount(order, isAr)
	const visibleItems = order.items.slice(0, 3)
	const extraCount = Math.max(0, order.items.length - visibleItems.length)

	function openOrder() {
		if (isSaved) return
		navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
	}

	return (
		<article className="flex min-w-0 flex-col rounded-xl border border-[var(--p-border)] bg-[var(--p-card)] p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-[12px] font-medium text-[var(--p-text-muted)]">
						{statusLabel}
					</p>
					<h3 className="mt-1 line-clamp-2 break-words text-[17px] font-semibold leading-snug text-[var(--p-text)]">
						{title}
					</h3>
				</div>
				<span className="shrink-0 rounded-full border border-[var(--p-border)] bg-[var(--p-input)] px-2.5 py-1 text-[11px] font-medium text-[var(--p-text-muted)]">
					{dateLabel}
				</span>
			</div>

			<div className="mt-4 grid gap-2">
				{visibleItems.map((item) => {
					const itemName = isAr ? item.productNameAr : item.productName
					return (
						<div
							key={`${order.id}-${item.productId}`}
							className="flex min-w-0 items-center gap-3"
						>
							<img
								src={item.imageUrl}
								alt={itemName}
								loading="lazy"
								decoding="async"
								className="h-10 w-10 shrink-0 rounded-lg bg-[var(--p-surface)] object-cover ring-1 ring-inset ring-[var(--p-border)]"
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
				{extraCount > 0 && (
					<p className="rounded-lg bg-[var(--p-input)] px-3 py-2 text-[12px] font-medium text-[var(--p-text-muted)]">
						+{formatQuantity(extraCount, isAr)} {t('orders.more')}
					</p>
				)}
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--p-border)] pt-4">
				<p className="text-[12px] text-[var(--p-text-muted)]">
					{t('orders.items', { count: order.itemCount })}
				</p>
				{amountLabel && (
					<p
						className="font-mono text-[14px] font-semibold text-[var(--p-text)]"
						style={{ fontVariantNumeric: 'tabular-nums' }}
					>
						{amountLabel}
					</p>
				)}
			</div>

			<div className="mt-4 grid grid-cols-2 gap-2">
				{isSaved ? (
					<>
						<button
							type="button"
							onClick={() =>
								navigate({
									to: '/orders/edit/$orderId',
									params: { orderId: order.id },
								})
							}
							className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--p-border)] bg-[var(--p-input)] px-3 text-[13px] font-semibold text-[var(--p-text)] transition-colors hover:border-[var(--p-border-strong)] hover:bg-[var(--p-hover)]"
						>
							<Pencil size={15} strokeWidth={1.8} />
							{t('orders.edit')}
						</button>
						<button
							type="button"
							onClick={() => submitMutation.mutate()}
							disabled={submitMutation.isPending}
							className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--p-accent)] px-3 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							<Send size={15} strokeWidth={1.8} />
							{t('orders.submit')}
						</button>
						{confirmDelete ? (
							<>
								<button
									type="button"
									onClick={() => deleteMutation.mutate()}
									disabled={deleteMutation.isPending}
									className="col-span-1 h-10 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-error)] transition-colors hover:bg-[var(--p-hover)] disabled:opacity-50"
								>
									{t('orders.confirmDelete')}
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									className="col-span-1 h-10 rounded-xl border border-[var(--p-border)] px-3 text-[12px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)]"
								>
									{t('orders.cancel')}
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={() => setConfirmDelete(true)}
								className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl text-[12px] font-semibold text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-error)]"
							>
								<Trash2 size={14} strokeWidth={1.8} />
								{t('orders.delete')}
							</button>
						)}
					</>
				) : (
					<button
						type="button"
						onClick={openOrder}
						className="col-span-2 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--p-accent)] px-4 text-[13px] font-semibold text-[var(--p-accent-contrast)] transition-opacity hover:opacity-90"
					>
						{t('orders.view')}
					</button>
				)}
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
