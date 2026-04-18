/**
 * Stops list. Reads the warehouse loading queue. Tapping a row sets
 * it as the active order. Header summarises load counts.
 *
 * Used both as a standalone screen on phone and as the rail content on
 * tablet/desktop landscape (`embedded` mode trims the header padding).
 */

import { useQuery } from '@tanstack/react-query'
import type { ParseKeys, TFunction } from 'i18next'
import { Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../../lib/format'
import { getOrderQueue } from '../../lib/mock'
import type { OrderStage, OrderSummary } from '../../lib/types'
import { useApp } from '../../stores/cockpit'

interface StopsScreenProps {
	embedded?: boolean
}

export function StopsScreen({ embedded }: StopsScreenProps = {}) {
	const { t } = useTranslation()
	const lang = useApp((s) => s.lang)
	const activeOrderId = useApp((s) => s.activeOrderId)
	const setActiveOrderId = useApp((s) => s.setActiveOrderId)

	const { data } = useQuery({
		queryKey: ['orders-queue'],
		queryFn: getOrderQueue,
	})

	const orders = data ?? []
	const loading = orders.filter((o) => o.stage === 'loading').length
	const sealed = orders.filter((o) => o.stage === 'sealed').length

	return (
		<div className="flex h-full flex-col">
			<header
				className={`flex shrink-0 items-end justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-5 ${
					embedded ? 'pb-3 pt-4' : 'pb-4 pt-5'
				}`}
			>
				<div>
					<h2 className="t-title">{t('stops.title')}</h2>
					<p className="t-meta mt-0.5">
						{formatNumber(orders.length, lang)} {t('stops.atDock')}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{loading > 0 ? (
						<span className="pill pill--accent">
							<span className="pill__dot" />
							{formatNumber(loading, lang)} {t('stops.loading')}
						</span>
					) : null}
					{sealed > 0 ? (
						<span className="pill">
							{formatNumber(sealed, lang)} {t('stops.ready')}
						</span>
					) : null}
				</div>
			</header>

			<ul className="flex-1 overflow-y-auto">
				{orders.map((o, i) => (
					<li key={o.id}>
						<StopRow
							order={o}
							index={i + 1}
							active={o.id === activeOrderId}
							onSelect={() => setActiveOrderId(o.id)}
							lang={lang}
							t={t}
						/>
					</li>
				))}
			</ul>
		</div>
	)
}

interface StopRowProps {
	order: OrderSummary
	index: number
	active: boolean
	onSelect: () => void
	lang: string
	t: TFunction<'driver'>
}

function StopRow({ order, index, active, onSelect, lang, t }: StopRowProps) {
	const stageKey = `active.stage.${order.stage}` as ParseKeys<'driver'>
	return (
		<button
			type="button"
			data-active={active}
			onClick={onSelect}
			className="stop-row rise"
			style={{ animationDelay: `${index * 25}ms` }}
		>
			<span className="stop-row__index">{String(index).padStart(2, '0')}</span>
			<span className="flex min-w-0 flex-col gap-1">
				<span className="flex items-center gap-2">
					<span className="t-num text-[12px] text-[var(--ink-3)]">
						{order.displayId}
					</span>
					<StageDot stage={order.stage} />
					<span className="text-[12px] text-[var(--ink-3)]">{t(stageKey)}</span>
				</span>
				<span className="truncate text-[15px] font-medium text-[var(--ink)]">
					{lang === 'ar' ? order.customerNameAr : order.customerName}
				</span>
				<span className="flex items-center gap-2 text-[12.5px] text-[var(--ink-3)]">
					<Building2 size={12} strokeWidth={1.6} />
					<span className="t-num">{formatNumber(order.weightTons, lang)}t</span>
					<span aria-hidden>·</span>
					<span>
						{formatNumber(order.itemCount, lang)} {t('stops.lines')}
					</span>
					<span aria-hidden>·</span>
					<span>{order.dockBay}</span>
				</span>
				{order.stage === 'loading' ? (
					<span
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(order.loadingProgress * 100)}
						aria-label={`loading ${Math.round(order.loadingProgress * 100)}%`}
						className="mt-1 block h-[3px] w-full bg-[var(--surface-3)]"
					>
						<span
							className="block h-full bg-[var(--accent)] transition-all duration-500"
							style={{ width: `${order.loadingProgress * 100}%` }}
						/>
					</span>
				) : null}
			</span>
			<span className="t-meta">{order.deliveryCity}</span>
		</button>
	)
}

function StageDot({ stage }: { stage: OrderStage }) {
	const color =
		stage === 'loading'
			? 'var(--accent)'
			: stage === 'sealed' || stage === 'arrived' || stage === 'delivered'
				? 'var(--good)'
				: stage === 'in_transit'
					? 'var(--info)'
					: 'var(--ink-4)'
	return (
		<span
			aria-hidden
			className="inline-block h-1.5 w-1.5 rounded-full"
			style={{ background: color }}
		/>
	)
}
