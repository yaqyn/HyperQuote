import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, History } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../../lib/internal-live-query'
import {
	getInventoryOverview,
	type InventoryProductView,
	markProductPriceOutdated,
} from '../../../lib/server/inventory'
import { useProcurementStore } from '../../../stores/procurement'
import {
	EmployeeActionButton,
	EmployeeSearchField,
} from '../../shared/EmployeeControls'
import { formatCompactHours } from '../../shared/formatters'
import { ProductDetailModal } from './ProductDetailModal'
import { SupplierBatchPricePanel } from './SupplierBatchPricePanel'

// Freshness tone drives the right-gutter mark on each entry.
function toneFor(
	hours: number,
	isUrgent: boolean,
): 'fresh' | 'aging' | 'stale' {
	if (isUrgent) return 'stale'
	if (hours < 24) return 'fresh'
	if (hours < 72) return 'aging'
	return 'stale'
}

// ─── View ────────────────────────────────────────────────

export function InventoryView() {
	const activeCategory = useProcurementStore((s) => s.activeCategory)
	const queryClient = useQueryClient()

	const { data, isLoading, isError } = useQuery({
		queryKey: ['inventory-overview'],
		queryFn: () => getInventoryOverview({ data: {} }),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})

	const [search, setSearch] = useState('')
	const [detailSlug, setDetailSlug] = useState<string | null>(null)
	const [batchPanelOpen, setBatchPanelOpen] = useState(false)
	const [priceActionError, setPriceActionError] = useState<string | null>(null)

	const markOutdatedMutation = useMutation({
		mutationFn: markProductPriceOutdated,
		onMutate: () => {
			setPriceActionError(null)
		},
		onSuccess: (result) => {
			if (!result.success) {
				setPriceActionError(result.error)
				return
			}
			queryClient.invalidateQueries({ queryKey: ['inventory-overview'] })
			queryClient.invalidateQueries({ queryKey: ['inventory-product-detail'] })
			queryClient.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
			queryClient.invalidateQueries({ queryKey: ['product-catalog'] })
			queryClient.invalidateQueries({ queryKey: ['quote-builder-data'] })
		},
		onError: () => {
			setPriceActionError(
				'Price could not be marked outdated. Add an active supplier or refresh.',
			)
		},
	})

	const filtered = useMemo(() => {
		if (!data) return []
		let list: InventoryProductView[] = data.products
		if (activeCategory !== 'all') {
			list = list.filter((p) => p.broadCategory === activeCategory)
		}
		if (search.trim()) {
			const q = search.trim().toLowerCase()
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.sku.toLowerCase().includes(q) ||
					p.supplierName.toLowerCase().includes(q) ||
					(p.allSupplierNames ?? []).some((s) => s.toLowerCase().includes(q)),
			)
		}
		return [...list].sort((a, b) => {
			const aNeedsAttention =
				a.priceStatus === 'outdated' || a.isUrgent || a.pendingRequestCount > 0
			const bNeedsAttention =
				b.priceStatus === 'outdated' || b.isUrgent || b.pendingRequestCount > 0
			if (aNeedsAttention !== bNeedsAttention) {
				return aNeedsAttention ? -1 : 1
			}
			const aRequested = a.pendingRequestCount > 0 ? 1 : 0
			const bRequested = b.pendingRequestCount > 0 ? 1 : 0
			if (aRequested !== bRequested) return bRequested - aRequested
			if (aRequested && a.pendingRequestCount !== b.pendingRequestCount) {
				return b.pendingRequestCount - a.pendingRequestCount
			}
			if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1
			if (a.priceStatus !== b.priceStatus) {
				return a.priceStatus === 'outdated' ? -1 : 1
			}
			return b.hoursSinceUpdate - a.hoursSinceUpdate
		})
	}, [data, activeCategory, search])

	if (isError) {
		return (
			<div className="flex h-full items-center justify-center px-6 text-center">
				<div className="max-w-sm rounded-md border border-red-600/20 bg-red-600/[0.04] px-4 py-3">
					<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-red-700 dark:text-red-300">
						Prices could not load.
					</p>
					<p className="mt-1 text-[12px] text-[var(--color-text-subtle)]">
						Refresh before confirming supplier prices.
					</p>
				</div>
			</div>
		)
	}

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="font-[family-name:var(--font-archivo)] text-[13px] text-[var(--ink-mid)]">
					Loading prices...
				</p>
			</div>
		)
	}

	return (
		<div className="animate-folio-turn relative h-full overflow-y-auto">
			<div className="mx-auto flex max-w-[1040px] flex-col px-4 pt-4 pb-16 sm:px-6 lg:px-8">
				<DeskToolbar
					search={search}
					setSearch={setSearch}
					onOpenBatch={() => setBatchPanelOpen(true)}
				/>
				{priceActionError && (
					<div className="mt-3 rounded-md border border-red-600/20 bg-red-600/[0.04] px-3 py-2 font-[family-name:var(--font-archivo)] text-[12px] text-red-700 dark:text-red-300">
						{priceActionError}
					</div>
				)}

				{filtered.length > 0 ? (
					<div className="-mx-4 mt-4 overflow-hidden border-y border-[var(--rule-soft)] bg-[var(--folio)] sm:mx-0 sm:rounded-md sm:border">
						<PriceListHeader />
						<ol>
							{filtered.map((product, idx) => (
								<PriceEntry
									key={product.slug}
									index={idx}
									product={product}
									onOpenDetail={setDetailSlug}
									onMarkOutdated={(slug) =>
										markOutdatedMutation.mutate({ data: { slug } })
									}
									outdating={
										markOutdatedMutation.isPending &&
										markOutdatedMutation.variables?.data.slug === product.slug
									}
								/>
							))}
						</ol>
					</div>
				) : (
					<DeskEmpty />
				)}
			</div>

			<ProductDetailModal
				slug={detailSlug}
				onClose={() => setDetailSlug(null)}
			/>
			<SupplierBatchPricePanel
				isOpen={batchPanelOpen}
				onClose={() => setBatchPanelOpen(false)}
			/>
		</div>
	)
}

// ─── Toolbar ─────────────────────────────────────────────

function DeskToolbar({
	search,
	setSearch,
	onOpenBatch,
}: {
	search: string
	setSearch: (s: string) => void
	onOpenBatch: () => void
}) {
	return (
		<div className="flex flex-col gap-3 pb-2 lg:flex-row lg:items-center">
			<EmployeeSearchField
				value={search}
				onChange={setSearch}
				label="Search prices"
				placeholder="Search product, SKU, or supplier"
				className="max-w-3xl lg:flex-1"
			/>
			<EmployeeActionButton tone="neutral" size="sm" onClick={onOpenBatch}>
				Supplier call
			</EmployeeActionButton>
		</div>
	)
}

// ─── Price entry ────────────────────────────────────────

function PriceListHeader() {
	return (
		<div className="hidden grid-cols-[2rem_minmax(0,1fr)_9rem_10rem] gap-4 border-b border-[var(--rule-soft)] px-4 py-2 md:grid">
			<span aria-hidden="true" />
			<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				Title
			</span>
			<span className="text-end font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				Last quoted
			</span>
			<span className="text-end font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				Price
			</span>
		</div>
	)
}

function PriceEntry({
	index,
	product,
	onOpenDetail,
	onMarkOutdated,
	outdating,
}: {
	index: number
	product: InventoryProductView
	onOpenDetail: (slug: string) => void
	onMarkOutdated: (slug: string) => void
	outdating: boolean
}) {
	const tone = toneFor(product.hoursSinceUpdate, product.isUrgent)
	const toneColor =
		tone === 'fresh' ? 'var(--compendium-fresh)' : 'var(--compendium-attention)'
	const hasAttention = tone !== 'fresh' || product.pendingRequestCount > 0
	const hasSalesPriceRequest = product.pendingRequestCount > 0
	const rowTone = index % 2 === 0 ? 'bg-[var(--folio)]' : 'bg-black/[0.018]'

	return (
		<li
			className={`border-b border-b-[var(--rule-soft)] last:border-b-0 ${rowTone}`}
		>
			<div className="grid w-full gap-3 border-x border-x-transparent p-4 transition-colors hover:border-x-[var(--ink-ghost)] md:grid-cols-[2rem_minmax(0,1fr)_9rem_10rem] md:items-center">
				<button
					type="button"
					onClick={() => onOpenDetail(product.slug)}
					className="flex items-center gap-2 text-start outline-none md:block"
				>
					<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--ink-mid)]">
						{(index + 1).toString().padStart(2, '0')}
					</span>
					{hasAttention && (
						<span
							aria-hidden="true"
							className="h-2 w-2 rounded-full md:mt-2 md:block"
							style={{ background: toneColor }}
						/>
					)}
				</button>

				<button
					type="button"
					onClick={() => onOpenDetail(product.slug)}
					className="min-w-0 text-start outline-none"
				>
					<span className="md:hidden font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						Title
					</span>
					<h3
						className={`min-w-0 break-words font-[family-name:var(--font-archivo)] text-[15px] font-semibold leading-5 ${
							hasSalesPriceRequest
								? 'text-red-700 dark:text-red-300'
								: 'text-[var(--ink)]'
						}`}
					>
						{product.name}
					</h3>
					<p
						className={`mt-1 min-w-0 truncate font-[family-name:var(--font-archivo)] text-[11px] ${
							hasSalesPriceRequest
								? 'text-red-700/80 dark:text-red-300/80'
								: 'text-[var(--ink-mid)]'
						}`}
					>
						{product.supplierName}
						{product.allSupplierNames.length > 1
							? ` +${product.allSupplierNames.length - 1} suppliers`
							: ''}
					</p>
					{hasSalesPriceRequest && (
						<p className="mt-1 font-[family-name:var(--font-archivo)] text-[11px] font-semibold text-red-700 dark:text-red-300">
							Sales waiting · {product.pendingRequestCount}
						</p>
					)}
				</button>

				<button
					type="button"
					onClick={() => onOpenDetail(product.slug)}
					className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-start outline-none md:flex-col md:items-end md:gap-1"
				>
					<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						last quoted
					</span>
					<span
						className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums"
						style={{ color: toneColor }}
					>
						{formatCompactHours(product.hoursSinceUpdate)} ago
					</span>
					<span
						className="rounded-sm px-1.5 py-0.5 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.08em]"
						style={{
							backgroundColor:
								product.priceStatus === 'updated'
									? 'rgba(10,92,46,0.08)'
									: 'rgba(204,51,0,0.08)',
							color: toneColor,
						}}
					>
						{product.priceStatus}
					</span>
				</button>

				<div className="flex flex-col items-start md:items-end">
					<span className="md:hidden font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						Price
					</span>
					<div className="flex w-full items-center justify-between gap-3 md:justify-end">
						<span className="font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold leading-none tabular-nums text-[var(--ink)]">
							{product.rawCost > 0
								? product.rawCost.toLocaleString('en-EG', {
										minimumFractionDigits: 2,
									})
								: '—'}
						</span>
						<button
							type="button"
							onClick={() => {
								if (product.priceStatus === 'updated') {
									onMarkOutdated(product.slug)
									return
								}
								onOpenDetail(product.slug)
							}}
							disabled={outdating}
							aria-label={
								product.priceStatus === 'updated'
									? `Mark ${product.name} price outdated`
									: `Update price for ${product.name}`
							}
							title={
								product.priceStatus === 'updated'
									? 'Mark outdated'
									: 'Update with proof'
							}
							className="shrink-0 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] outline-none transition-colors hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
						>
							<span className="inline-flex items-center gap-1.5">
								{product.priceStatus === 'updated' ? (
									<History size={12} strokeWidth={2.3} aria-hidden="true" />
								) : (
									<FileText size={12} strokeWidth={2.3} aria-hidden="true" />
								)}
								{outdating
									? 'Saving'
									: product.priceStatus === 'updated'
										? 'Outdate'
										: 'Update'}
							</span>
						</button>
					</div>
					<span className="mt-1 font-[family-name:var(--font-archivo)] text-[11px] text-[var(--ink-mid)]">
						EGP / {product.unit}
					</span>
				</div>
			</div>
		</li>
	)
}

// ─── Empty ──────────────────────────────────────────────

function DeskEmpty() {
	return (
		<div className="mt-16 flex flex-col items-center gap-2 border-y border-dashed border-[var(--rule-soft)] py-14">
			<span className="font-[family-name:var(--font-archivo)] text-[18px] font-semibold text-[var(--ink)]">
				No prices found
			</span>
			<span className="font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-soft)]">
				Adjust the category or clear the search.
			</span>
		</div>
	)
}
