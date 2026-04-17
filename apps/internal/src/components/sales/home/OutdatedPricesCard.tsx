import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import {
	getOutdatedPricesSummary,
	requestInventoryPriceUpdate,
} from '../../../lib/server/sales-quotes'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'
import { PriceStatusBadge } from '../quote-builder/PriceStatusBadge'

const POLL_INTERVAL_MS = 60_000

export function OutdatedPricesCard() {
	const [isOpen, setIsOpen] = useState(false)
	const [requestedProducts, setRequestedProducts] = useState<Set<string>>(
		new Set(),
	)

	const summary = useQuery({
		queryKey: ['sales-outdated-prices'],
		queryFn: () => getOutdatedPricesSummary({ data: {} }),
		refetchInterval: POLL_INTERVAL_MS,
		refetchIntervalInBackground: false,
		staleTime: 0,
	})

	const qc = useQueryClient()
	const notifyMutation = useMutation({
		mutationFn: requestInventoryPriceUpdate,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['inventory-overview'] })
			qc.invalidateQueries({ queryKey: ['inventory-top-suppliers'] })
			qc.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
		},
	})

	const items = summary.data?.items ?? []
	const totalUrgent = summary.data?.totalUrgent ?? 0
	const affectedRfqCount = summary.data?.affectedRfqCount ?? 0

	const formatTime = (iso?: string) =>
		!iso
			? '—'
			: new Date(iso).toLocaleTimeString('en-EG', {
					hour: '2-digit',
					minute: '2-digit',
				})

	const notifyOne = (productName: string, supplierName: string) => {
		notifyMutation.mutate({
			data: { items: [{ productId: productName, productName, supplierName }] },
		})
		setRequestedProducts((prev) => new Set(prev).add(productName))
	}

	const notifyAll = () => {
		const pending = items.filter((i) => !requestedProducts.has(i.productName))
		if (pending.length === 0) return
		notifyMutation.mutate({
			data: {
				items: pending.map((i) => ({
					productId: i.productName,
					productName: i.productName,
					supplierName: i.supplierName,
				})),
			},
		})
		setRequestedProducts((prev) => {
			const next = new Set(prev)
			for (const it of pending) next.add(it.productName)
			return next
		})
	}

	const pendingCount = items.filter(
		(i) => !requestedProducts.has(i.productName),
	).length

	return (
		<>
			<div className="inline-flex items-center gap-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] pe-1 ps-3 py-1">
				<AriaButton
					onPress={() => setIsOpen(true)}
					className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text)] outline-none cursor-pointer"
				>
					<AlertTriangle
						size={13}
						strokeWidth={2}
						className="text-black/50 dark:text-white/50"
					/>
					<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
						{totalUrgent}
					</span>
					<span className="text-black/55 dark:text-white/55">urgent</span>
					{affectedRfqCount > 0 && (
						<span className="text-[11px] text-black/35 dark:text-white/35">
							· {affectedRfqCount} RFQ{affectedRfqCount === 1 ? '' : 's'}
						</span>
					)}
				</AriaButton>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation()
						summary.refetch()
					}}
					aria-label="Refresh now"
					title={`Auto-refresh every minute · last checked ${formatTime(summary.data?.generatedAt)}`}
					className="shrink-0 rounded-md p-1 text-black/40 dark:text-white/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-black/70 dark:hover:text-white/70 transition-colors outline-none"
				>
					<RefreshCw
						size={12}
						strokeWidth={2}
						className={summary.isFetching ? 'animate-spin' : ''}
					/>
				</button>
			</div>

			<DispatchDialog
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				size="md"
				eyebrow={
					<span>
						Sales · {totalUrgent} urgent · last checked{' '}
						{formatTime(summary.data?.generatedAt)}
					</span>
				}
				title="Urgent price updates"
				caption={
					affectedRfqCount > 0
						? `${totalUrgent} item${totalUrgent === 1 ? '' : 's'} with outdated prices affecting ${affectedRfqCount} RFQ${affectedRfqCount === 1 ? '' : 's'}.`
						: `${totalUrgent} item${totalUrgent === 1 ? '' : 's'} with outdated prices.`
				}
			>
				<DispatchBody>
					{items.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-10 gap-2">
							<Check
								size={22}
								strokeWidth={2}
								className="text-[var(--color-primary)]"
							/>
							<p className="font-[family-name:var(--font-archivo)] italic text-[14px] text-[var(--color-text-muted)]">
								No urgent price updates.
							</p>
							<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
								every actively-ordered item has a fresh price
							</p>
						</div>
					) : (
						<ul className="divide-y divide-black/[0.08] dark:divide-white/[0.1]">
							{items.map((item) => {
								const alreadyRequested = requestedProducts.has(item.productName)
								return (
									<li
										key={item.productName}
										className="py-3 flex items-start gap-3"
									>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-[family-name:var(--font-archivo)] text-[14px] font-semibold text-[var(--color-text)] truncate">
													{item.productName}
												</span>
												<PriceStatusBadge
													priceStatus="outdated"
													recentlyOrdered={item.recentlyOrdered}
													size="xs"
												/>
											</div>
											<p className="mt-1 font-[family-name:var(--font-plex-mono)] text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)] truncate">
												{item.specification} · {item.supplierName}
											</p>
											<p className="mt-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
												{item.affectedRfqs.length} RFQ
												{item.affectedRfqs.length === 1 ? '' : 's'}
												{' · '}
												{item.affectedRfqs
													.map((r) => r.customerName)
													.join(', ')}
												{' · '}
												<span className="tabular-nums">
													{item.totalQuantity.toLocaleString('en-EG')}{' '}
													{item.unit}
												</span>
											</p>
										</div>

										{alreadyRequested ? (
											<span className="inline-flex items-center gap-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-primary)]">
												<Check size={12} strokeWidth={2.5} />
												Notified
											</span>
										) : (
											<AriaButton
												onPress={() =>
													notifyOne(item.productName, item.supplierName)
												}
												className="shrink-0 font-[family-name:var(--font-inter)] text-[12px] font-medium text-[var(--color-primary)] border-b border-transparent hover:border-[var(--color-primary)] outline-none transition-colors"
											>
												Notify →
											</AriaButton>
										)}
									</li>
								)
							})}
						</ul>
					)}
				</DispatchBody>

				{items.length > 0 && (
					<DispatchFooter leading="Inventory will push fresh prices back">
						<DispatchAction
							tone="ghost"
							onPress={() => summary.refetch()}
							isDisabled={summary.isFetching}
						>
							{summary.isFetching ? 'Refreshing…' : 'Refresh'}
						</DispatchAction>
						<DispatchAction
							onPress={notifyAll}
							isDisabled={notifyMutation.isPending || pendingCount === 0}
							tone={pendingCount === 0 ? 'ghost' : 'danger'}
						>
							{notifyMutation.isPending ? (
								<span className="inline-flex items-center gap-1.5">
									<Loader2
										size={12}
										strokeWidth={2.5}
										className="animate-spin"
									/>
									Notifying…
								</span>
							) : pendingCount === 0 ? (
								'All notified'
							) : (
								`Notify inventory · ${pendingCount}`
							)}
						</DispatchAction>
					</DispatchFooter>
				)}
			</DispatchDialog>
		</>
	)
}
