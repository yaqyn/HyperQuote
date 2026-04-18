/**
 * Orders — "The Day Book"
 * Lyon's daybook: an open ledger spread, three folios stacked.
 *   • Pencilled  — drafts, still in graphite, can be amended or struck.
 *   • In flight  — submitted requests awaiting reply.
 *   • Sealed     — confirmed orders, marked with a wax seal in the margin.
 * Every entry is a typed line — date in margin, materials inline, amount
 * in mono on the right. No cards. No thumbnails. Hairline rules between.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
	deleteOrder,
	getAllCustomerOrders,
	submitOrder,
} from '../../lib/server/orders'
import type { Order, OrderType } from '../../types/order'

export const Route = createFileRoute('/_portal/orders')({
	component: DayBookPage,
})

const ROMAN_MONTH = [
	'I',
	'II',
	'III',
	'IV',
	'V',
	'VI',
	'VII',
	'VIII',
	'IX',
	'X',
	'XI',
	'XII',
] as const

function todayFolio(isAr: boolean): string {
	const now = new Date()
	if (isAr) {
		const fmt = new Intl.DateTimeFormat('ar-EG', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
		})
		return fmt.format(now)
	}
	const day = String(now.getDate()).padStart(2, '0')
	const month = ROMAN_MONTH[now.getMonth()] ?? '—'
	const year = now.getFullYear()
	return `${year} · ${month} · ${day}`
}

function formatEntryDate(iso: string, isAr: boolean): string {
	const d = new Date(iso)
	if (isAr) {
		return new Intl.DateTimeFormat('ar-EG', {
			day: '2-digit',
			month: 'short',
		}).format(d)
	}
	const day = String(d.getDate()).padStart(2, '0')
	const month = ROMAN_MONTH[d.getMonth()] ?? '—'
	return `${day} · ${month}`
}

function DayBookPage() {
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
			saved: data.orders.filter((o) => o.type === 'saved'),
			submitted: data.orders.filter((o) => o.type === 'submitted'),
			confirmed: data.orders.filter((o) => o.type === 'confirmed'),
		}
	}, [data])

	const totalCount =
		grouped.saved.length + grouped.submitted.length + grouped.confirmed.length
	const sealedTotal = useMemo(
		() => grouped.confirmed.reduce((sum, o) => sum + (o.amount ?? 0), 0),
		[grouped.confirmed],
	)

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--p-bg)]">
			<div className="ledger-folio relative px-6 pt-12 pb-24 lg:px-12">
				<MastheadDayBook
					folio={todayFolio(isAr)}
					sealedTotal={sealedTotal}
					sealedCount={grouped.confirmed.length}
					isAr={isAr}
				/>

				{isLoading && <DayBookSkeleton />}

				{isError && (
					<div className="py-20 text-center">
						<p className="voice-serif italic text-[16px] text-[var(--p-text-muted)]">
							{t('orders.error')}
						</p>
						<button
							type="button"
							onClick={() => refetch()}
							className="ledger-verb mt-6 mx-auto"
						>
							{t('orders.retry')}
						</button>
					</div>
				)}

				{!isLoading && !isError && totalCount === 0 && <EmptyDayBook />}

				{!isLoading && !isError && totalCount > 0 && (
					<div className="space-y-16">
						<DayBookSection
							type="saved"
							label={t('orders.pencilled')}
							orders={grouped.saved}
							isAr={isAr}
						/>
						<DayBookSection
							type="submitted"
							label={t('orders.inFlight')}
							orders={grouped.submitted}
							isAr={isAr}
						/>
						<DayBookSection
							type="confirmed"
							label={t('orders.sealed')}
							orders={grouped.confirmed}
							isAr={isAr}
						/>
					</div>
				)}
			</div>
		</div>
	)
}

// ---------------------------------------------------------------------------
// Masthead — title + folio number + sealed-total tally
// ---------------------------------------------------------------------------

function MastheadDayBook({
	folio,
	sealedTotal,
	sealedCount,
	isAr,
}: {
	folio: string
	sealedTotal: number
	sealedCount: number
	isAr: boolean
}) {
	const { t } = useTranslation('portal')
	const fmt = useMemo(
		() =>
			new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
				maximumFractionDigits: 0,
			}),
		[isAr],
	)
	const dayBookTitle = t('orders.dayBook')
	const titleParts = dayBookTitle.split(' ')
	const lastWord = titleParts.pop() ?? dayBookTitle
	const leadWords = titleParts.join(' ')

	return (
		<header className="mb-14">
			<div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
				<div>
					<h1 className="ledger-title">
						{leadWords ? <>{leadWords} </> : null}
						<em>{lastWord}</em>
					</h1>
					<p className="ledger-title-caption mt-3">
						{t('orders.folio')} · {folio}
					</p>
				</div>

				{sealedCount > 0 && (
					<aside className="text-end">
						<p className="office-meta">{t('orders.sealed')}</p>
						<p
							className="voice-mono mt-2 text-[28px] font-light text-[var(--p-text)]"
							style={{ fontVariantNumeric: 'tabular-nums' }}
						>
							EGP {fmt.format(sealedTotal)}
						</p>
					</aside>
				)}
			</div>
			<div className="office-rule-strong mt-10" />
		</header>
	)
}

// ---------------------------------------------------------------------------
// Section — one folio (saved / submitted / confirmed)
// ---------------------------------------------------------------------------

function DayBookSection({
	type,
	label,
	orders,
	isAr,
}: {
	type: OrderType
	label: string
	orders: Order[]
	isAr: boolean
}) {
	if (orders.length === 0) return null
	return (
		<section aria-label={label}>
			<header className="ledger-section-head">
				<span className="ledger-section-label">{label}</span>
				<span className="ledger-section-count">
					{isAr
						? orders.length.toLocaleString('ar-EG')
						: String(orders.length).padStart(2, '0')}
				</span>
			</header>
			<ol className="mt-2">
				{orders.map((order) => (
					<DayBookEntry key={order.id} order={order} type={type} isAr={isAr} />
				))}
			</ol>
		</section>
	)
}

// ---------------------------------------------------------------------------
// Entry — one ruled row in the day-book
// ---------------------------------------------------------------------------

function DayBookEntry({
	order,
	type,
	isAr,
}: {
	order: Order
	type: OrderType
	isAr: boolean
}) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [confirmStrike, setConfirmStrike] = useState(false)

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

	const dateLabel = formatEntryDate(order.date, isAr)
	const title =
		type === 'saved' ? (order.name ?? '—') : (order.reference ?? '—')

	const inlineItems = useMemo(() => {
		const head = order.items.slice(0, 3).map((item) => {
			const name = isAr ? item.productNameAr : item.productName
			const qty = isAr
				? item.quantity.toLocaleString('ar-EG')
				: String(item.quantity)
			return `${qty} ${item.unitOfMeasure} ${name}`
		})
		if (order.items.length > 3) {
			const extra = order.items.length - 3
			head.push(
				`+${isAr ? extra.toLocaleString('ar-EG') : extra} ${t('orders.more')}`,
			)
		}
		return head.join('  ·  ')
	}, [order.items, isAr, t])

	const amountLabel = useMemo(() => {
		if (order.amount == null) return null
		const fmt = new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-EG', {
			maximumFractionDigits: 0,
		})
		return `EGP ${fmt.format(order.amount)}`
	}, [order.amount, isAr])

	const isClickable = type !== 'saved'

	function openEntry() {
		if (!isClickable) return
		navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
	}

	return (
		<li className="ledger-row grid grid-cols-[64px_1fr_auto] gap-x-5 gap-y-2 md:grid-cols-[88px_1fr_auto]">
			<span className="ledger-margin-no self-center">{dateLabel}</span>

			<button
				type="button"
				onClick={openEntry}
				disabled={!isClickable}
				className={[
					'min-w-0 text-start',
					isClickable ? 'cursor-pointer' : 'cursor-default',
				].join(' ')}
				aria-label={isClickable ? t('orders.openEntry') : undefined}
			>
				<p
					className={[
						'truncate text-[18px] leading-snug text-[var(--p-text)]',
						type === 'saved' ? 'voice-serif' : 'voice-mono',
					].join(' ')}
				>
					{title}
				</p>
				<p className="mt-1 truncate text-[12px] leading-relaxed text-[var(--p-text-muted)]">
					{inlineItems}
				</p>
			</button>

			<div className="flex flex-col items-end gap-1.5 self-center ps-4">
				{amountLabel && (
					<p
						className="voice-mono text-[15px] text-[var(--p-text)]"
						style={{ fontVariantNumeric: 'tabular-nums' }}
					>
						{amountLabel}
					</p>
				)}
				{type === 'confirmed' && (
					<span
						role="img"
						className="ledger-seal mt-1"
						aria-label={t('orders.sealed')}
						title={t('orders.sealed')}
					/>
				)}
			</div>

			{/* Action row — full-width, sits beneath the title row */}
			<div className="col-span-3 flex items-center gap-6 ps-[64px] md:ps-[88px]">
				{type === 'saved' && (
					<>
						<button
							type="button"
							onClick={() =>
								navigate({
									to: '/orders/edit/$orderId',
									params: { orderId: order.id },
								})
							}
							className="ledger-verb"
						>
							{t('orders.amend')}
						</button>
						<button
							type="button"
							onClick={() => submitMutation.mutate()}
							disabled={submitMutation.isPending}
							className="ledger-verb ledger-verb-strong"
						>
							{submitMutation.isPending
								? `${t('orders.dispatch')}…`
								: t('orders.dispatch')}
						</button>
						<div className="flex-1" />
						{confirmStrike ? (
							<div className="flex items-center gap-4">
								<button
									type="button"
									onClick={() => deleteMutation.mutate()}
									disabled={deleteMutation.isPending}
									className="ledger-verb ledger-verb-warn"
								>
									{t('orders.strikeConfirm')}
								</button>
								<button
									type="button"
									onClick={() => setConfirmStrike(false)}
									className="ledger-verb"
								>
									{t('orders.keep')}
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setConfirmStrike(true)}
								className="ledger-verb"
							>
								{t('orders.strike')}
							</button>
						)}
					</>
				)}

				{isClickable && (
					<>
						<div className="flex-1" />
						<button type="button" onClick={openEntry} className="ledger-verb">
							{t('orders.openEntry')}
						</button>
					</>
				)}
			</div>
		</li>
	)
}

// ---------------------------------------------------------------------------
// Empty + skeleton
// ---------------------------------------------------------------------------

function EmptyDayBook() {
	const { t } = useTranslation('portal')
	return (
		<div className="flex flex-col items-center gap-4 py-24 text-center">
			<p className="voice-display text-[32px] italic text-[var(--p-text)]">
				{t('orders.openBookEmpty')}
			</p>
			<p className="voice-serif italic text-[15px] text-[var(--p-text-muted)]">
				{t('orders.openBookEmptyBody')}
			</p>
		</div>
	)
}

const SK_SECTIONS = ['s1', 's2'] as const
const SK_ROWS = ['r1', 'r2'] as const

function DayBookSkeleton() {
	return (
		<div className="space-y-16">
			{SK_SECTIONS.map((sec) => (
				<div key={sec}>
					<div className="ledger-section-head">
						<div className="h-3 w-24 animate-pulse bg-[var(--p-border)]" />
						<div className="h-3 w-6 animate-pulse bg-[var(--p-border)]" />
					</div>
					<ol className="mt-2">
						{SK_ROWS.map((row) => (
							<li
								key={row}
								className="grid grid-cols-[64px_1fr_auto] items-center gap-5 py-5 border-b border-[var(--p-rule)] md:grid-cols-[88px_1fr_auto]"
							>
								<div className="h-3 w-12 animate-pulse bg-[var(--p-border)]" />
								<div className="space-y-2">
									<div className="h-4 w-2/3 animate-pulse bg-[var(--p-border)]" />
									<div className="h-3 w-3/4 animate-pulse bg-[var(--p-border)]" />
								</div>
								<div className="h-4 w-24 animate-pulse bg-[var(--p-border)]" />
							</li>
						))}
					</ol>
				</div>
			))}
		</div>
	)
}
