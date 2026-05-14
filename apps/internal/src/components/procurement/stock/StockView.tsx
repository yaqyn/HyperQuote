import { useQuery } from '@tanstack/react-query'
import { PackagePlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
	getStockOverview,
	type StockProductView,
	type StockStatus,
} from '../../../lib/server/stock'
import { useProcurementStore } from '../../../stores/procurement'
import {
	EmployeeActionButton,
	EmployeeSearchField,
} from '../../shared/EmployeeControls'
import { RefillPanel } from './RefillPanel'

const STATUS_COPY: Record<StockStatus, string> = {
	healthy: 'in stock',
	low: 'running low',
	critical: 'critical',
	out: 'out of stock',
}

const STATUS_ACCENT: Record<StockStatus, string> = {
	healthy: 'var(--compendium-fresh)',
	low: 'var(--compendium-attention)',
	critical: 'var(--compendium-attention)',
	out: 'var(--compendium-attention)',
}

const STATUS_WEIGHT: Record<StockStatus, number> = {
	out: 0,
	critical: 1,
	low: 2,
	healthy: 3,
}

// ─── View ────────────────────────────────────────────────

export function StockView() {
	const activeCategory = useProcurementStore((s) => s.activeCategory)

	const { data, isLoading, isError } = useQuery({
		queryKey: ['stock-overview'],
		queryFn: () => getStockOverview({ data: {} }),
		staleTime: 30_000,
	})

	const [search, setSearch] = useState('')
	const [refillSlug, setRefillSlug] = useState<string | null>(null)

	const filtered = useMemo(() => {
		if (!data) return []
		let list: StockProductView[] = data.products
		if (activeCategory !== 'all') {
			list = list.filter((p) => p.broadCategory === activeCategory)
		}
		if (search.trim()) {
			const q = search.trim().toLowerCase()
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.sku.toLowerCase().includes(q) ||
					p.primarySupplierName.toLowerCase().includes(q),
			)
		}
		return [...list].sort((a, b) => {
			if (STATUS_WEIGHT[a.status] !== STATUS_WEIGHT[b.status]) {
				return STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status]
			}
			return a.stockRatio - b.stockRatio
		})
	}, [data, activeCategory, search])

	if (isError) {
		return (
			<div className="flex h-full items-center justify-center px-6 text-center">
				<div className="max-w-sm rounded-md border border-red-600/20 bg-red-600/[0.04] px-4 py-3">
					<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-red-700 dark:text-red-300">
						Stock could not load.
					</p>
					<p className="mt-1 text-[12px] text-[var(--color-text-subtle)]">
						Refresh the panel before approving or refilling inventory.
					</p>
				</div>
			</div>
		)
	}

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '13px' }}
				>
					opening the atlas…
				</p>
			</div>
		)
	}

	return (
		<div className="animate-folio-turn relative h-full overflow-y-auto">
			<div className="mx-auto flex max-w-[1040px] flex-col px-4 pt-4 pb-16 sm:px-6 lg:px-8">
				<DeskToolbar search={search} setSearch={setSearch} />

				{filtered.length > 0 ? (
					<ol className="-mx-4 mt-4 overflow-hidden border-y border-[var(--rule-soft)] bg-[var(--folio)] sm:mx-0 sm:rounded-md sm:border">
						{filtered.map((product, idx) => (
							<StockPlate
								key={product.slug}
								index={idx}
								product={product}
								onRefill={setRefillSlug}
							/>
						))}
					</ol>
				) : (
					<EmptyState />
				)}
			</div>

			<RefillPanel
				productSlug={refillSlug}
				onClose={() => setRefillSlug(null)}
			/>
		</div>
	)
}

// ─── Toolbar ─────────────────────────────────────────────

function DeskToolbar({
	search,
	setSearch,
}: {
	search: string
	setSearch: (s: string) => void
}) {
	return (
		<div className="flex flex-col gap-3 pb-2 lg:flex-row lg:items-center lg:gap-4">
			<EmployeeSearchField
				value={search}
				onChange={setSearch}
				label="Search stock"
				placeholder="Search material, SKU, or supplier"
				className="lg:flex-1"
			/>
		</div>
	)
}

// ─── Plate ───────────────────────────────────────────────

function StockPlate({
	index,
	product,
	onRefill,
}: {
	index: number
	product: StockProductView
	onRefill: (slug: string) => void
}) {
	const accent = STATUS_ACCENT[product.status]
	const hasAttention = product.status !== 'healthy'
	const gaugePct = Math.min(product.stockRatio / 2, 1) * 100
	const rowTone = index % 2 === 0 ? 'bg-[var(--folio)]' : 'bg-black/[0.018]'

	return (
		<li
			className={`grid gap-4 border-x border-b border-x-transparent border-b-[var(--rule-soft)] p-4 transition-colors hover:border-x-[var(--ink-ghost)] last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center ${rowTone}`}
		>
			<div className="flex items-center gap-2 sm:block">
				<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--ink-mid)]">
					{(index + 1).toString().padStart(2, '0')}
				</span>
				{hasAttention && (
					<span
						aria-hidden="true"
						className="h-2 w-2 rounded-full sm:mt-2 sm:block"
						style={{ background: accent }}
					/>
				)}
			</div>

			<div className="min-w-0">
				<h3 className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[15px] font-semibold leading-5 text-[var(--ink)]">
					{product.name}
				</h3>

				<div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
					<div className="min-w-0">
						<div
							className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"
							aria-hidden="true"
							title={`Stock at ${Math.round(product.stockRatio * 100)}% of threshold · ${STATUS_COPY[product.status]}`}
						>
							<span
								className="block h-full rounded-full transition-[width]"
								style={{ width: `${gaugePct}%`, background: accent }}
							/>
						</div>
						<div className="mt-3 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-x-6 sm:gap-y-2">
							<StockLevelMetric
								label="Available"
								value={product.availableLevel}
								unit={product.unit}
								tone={accent}
							/>
							<StockLevelMetric
								label="Minimum"
								value={product.lowStockThreshold}
								unit={product.unit}
							/>
							{product.reservedLevel > 0 && (
								<div className="col-span-2 self-end font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-mid)] sm:col-span-1">
									Reserved{' '}
									<strong className="font-[family-name:var(--font-geist-mono)] text-[14px] font-semibold text-[var(--ink)]">
										{product.reservedLevel.toLocaleString('en-EG')}
									</strong>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-end">
				<EmployeeActionButton
					size="sm"
					tone={hasAttention ? 'primary' : 'neutral'}
					leading={<PackagePlus size={13} strokeWidth={2.4} />}
					onClick={() => onRefill(product.slug)}
					fullWidthOnMobile
					className="md:w-auto"
				>
					{hasAttention ? 'Refill' : 'Review'}
				</EmployeeActionButton>
			</div>
		</li>
	)
}

function StockLevelMetric({
	label,
	value,
	unit,
	tone,
}: {
	label: string
	value: number
	unit: string
	tone?: string
}) {
	return (
		<div className="min-w-[7rem]">
			<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-mid)]">
				{label}
			</span>
			<div className="mt-1 flex min-w-0 items-baseline gap-1.5">
				<strong
					className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold leading-none tabular-nums text-[var(--ink)]"
					style={tone ? { color: tone } : undefined}
				>
					{value.toLocaleString('en-EG')}
				</strong>
				<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--ink-mid)]">
					{unit}
				</span>
			</div>
		</div>
	)
}

// ─── Empty state ────────────────────────────────────────

function EmptyState() {
	return (
		<div className="mt-16 flex flex-col items-center gap-2 border-y border-dashed border-[var(--rule-soft)] py-14">
			<span className="font-[family-name:var(--font-archivo)] text-[18px] font-semibold text-[var(--ink)]">
				No materials found
			</span>
			<span className="font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-soft)]">
				Adjust the category or clear the search.
			</span>
		</div>
	)
}
