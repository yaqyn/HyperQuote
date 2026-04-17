import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Clock, Loader2, Phone, ShieldAlert, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
	isValidProof,
	MIN_PROOF_LENGTH,
	sanitizeCost,
	sanitizeIntQty,
} from '../../../lib/inputs'
import {
	createDeal,
	getRefillProductDetail,
	getSupplierCatalog,
	type StockStatus,
	type StockSupplierOffer,
} from '../../../lib/server/stock'
import { SlidePanel } from '../../shared/SlidePanel'

interface RefillPanelProps {
	productSlug: string | null
	onClose: () => void
}

const STATUS_PILL: Record<StockStatus, { label: string; className: string }> = {
	healthy: {
		label: 'Healthy',
		className: 'bg-emerald-500/[0.1] text-emerald-700 dark:text-emerald-400',
	},
	low: {
		label: 'Low',
		className: 'bg-amber-500/[0.1] text-amber-700 dark:text-amber-400',
	},
	critical: {
		label: 'Critical',
		className: 'bg-orange-500/[0.1] text-orange-700 dark:text-orange-300',
	},
	out: {
		label: 'Out of stock',
		className: 'bg-red-500/[0.1] text-red-700 dark:text-red-300',
	},
}

const TIER_LABELS: Record<string, string> = {
	preferred: 'Preferred',
	approved: 'Approved',
	conditional: 'Conditional',
	new: 'New',
	blocked: 'Blocked',
}

function formatHours(hours: number): string {
	if (hours < 24) return `${hours}h ago`
	const days = Math.round(hours / 24)
	if (days < 30) return `${days}d ago`
	const months = Math.round(days / 30)
	return `${months}mo ago`
}

// ─── Main Panel ───────────────────────────────────────────

export function RefillPanel({ productSlug, onClose }: RefillPanelProps) {
	const qc = useQueryClient()
	const isOpen = productSlug !== null

	const { data, isLoading } = useQuery({
		queryKey: ['refill-product', productSlug],
		queryFn: () =>
			getRefillProductDetail({ data: { slug: productSlug ?? '' } }),
		enabled: isOpen && !!productSlug,
	})

	// Currently-called supplier — opens the deal form for that row
	const [callingRowId, setCallingRowId] = useState<string | null>(null)

	// Reset the active call when the panel opens on a new product
	useEffect(() => {
		if (isOpen) setCallingRowId(null)
	}, [isOpen])

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={onClose}
			maxWidth={560}
			panelKey="refill-panel"
			ariaLabel="Refill product"
			scope="procurement"
		>
			{isLoading || !data ? (
				<div className="flex h-full items-center justify-center">
					<Loader2
						size={20}
						strokeWidth={1.5}
						className="animate-spin text-[var(--color-text-subtle)]"
					/>
				</div>
			) : (
				<>
					{/* Header */}
					<header className="border-b border-black/[0.06] px-6 pt-6 pb-5 dark:border-white/[0.06]">
						<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
							Refill · Call once, stock many
						</p>
						<h2 className="mt-1.5 text-[18px] font-semibold text-[var(--color-text)]">
							{data.name}
						</h2>
						<div className="mt-1 flex items-center gap-2 text-[11px]">
							<span
								className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_PILL[data.status].className}`}
							>
								{STATUS_PILL[data.status].label}
							</span>
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-subtle)]">
								{data.sku}
							</span>
						</div>

						{/* Stock summary strip */}
						<div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-black/[0.02] px-4 py-3 dark:bg-white/[0.03]">
							<div>
								<div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
									On hand
								</div>
								<div className="mt-1 font-[family-name:var(--font-geist-mono)] text-[20px] font-semibold leading-none tabular-nums text-[var(--color-text)]">
									{data.stockLevel.toLocaleString('en-EG')}
									<span className="ms-1 text-[11px] font-normal text-[var(--color-text-subtle)]">
										{data.unit}
									</span>
								</div>
							</div>
							<div>
								<div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
									Threshold
								</div>
								<div className="mt-1 font-[family-name:var(--font-geist-mono)] text-[20px] font-semibold leading-none tabular-nums text-[var(--color-text-muted)]">
									{data.lowStockThreshold.toLocaleString('en-EG')}
								</div>
							</div>
							<div>
								<div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
									Suggested refill
								</div>
								<div className="mt-1 font-[family-name:var(--font-geist-mono)] text-[20px] font-semibold leading-none tabular-nums text-[var(--color-primary)]">
									+{data.suggestedQty.toLocaleString('en-EG')}
								</div>
							</div>
						</div>
					</header>

					{/* Supplier list */}
					<div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
						<p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
							Who sells this · {data.suppliers.length}
						</p>
						{data.suppliers.length === 0 ? (
							<p className="text-[13px] text-[var(--color-text-muted)]">
								No suppliers carry this product yet. Add one from the
								Procurement tab first.
							</p>
						) : (
							<div className="flex flex-col gap-2">
								{data.suppliers.map((supplier) => (
									<SupplierRow
										key={supplier.rowId}
										supplier={supplier}
										unit={data.unit}
										suggestedQty={data.suggestedQty}
										isCalling={callingRowId === supplier.rowId}
										onOpenCall={() => setCallingRowId(supplier.rowId)}
										onCancelCall={() => setCallingRowId(null)}
										productSlug={data.slug}
										productName={data.name}
										onDealCreated={() => {
											setCallingRowId(null)
											qc.invalidateQueries({ queryKey: ['stock-overview'] })
											qc.invalidateQueries({
												queryKey: ['refill-product', productSlug],
											})
											qc.invalidateQueries({ queryKey: ['inventory-overview'] })
											qc.invalidateQueries({
												queryKey: ['inventory-top-suppliers'],
											})
											qc.invalidateQueries({ queryKey: ['finance-inbox'] })
										}}
									/>
								))}
							</div>
						)}
					</div>
				</>
			)}
		</SlidePanel>
	)
}

// ─── Supplier row + inline call form ─────────────────────

interface DealLineDraft {
	productSlug: string
	productName: string
	unit: string
	listedCost: number // original rawCost from supplier catalog — for price-drop detection
	agreedQty: number
	agreedRawCost: number
	minOrderQty: number
}

function SupplierRow({
	supplier,
	unit,
	suggestedQty,
	isCalling,
	onOpenCall,
	onCancelCall,
	productSlug,
	productName,
	onDealCreated,
}: {
	supplier: StockSupplierOffer
	unit: string
	suggestedQty: number
	isCalling: boolean
	onOpenCall: () => void
	onCancelCall: () => void
	productSlug: string
	productName: string
	onDealCreated: () => void
}) {
	// Multi-item draft — starts with the product the rep opened the
	// refill panel on. "+ Add item" lets them pile on more lines during
	// the same call, "two birds one rock" style.
	const [lines, setLines] = useState<DealLineDraft[]>([])
	const [notes, setNotes] = useState('')
	const [showPicker, setShowPicker] = useState(false)

	useEffect(() => {
		if (isCalling) {
			setLines([
				{
					productSlug,
					productName,
					unit,
					listedCost: supplier.rawCost,
					agreedQty: suggestedQty,
					agreedRawCost: supplier.rawCost,
					minOrderQty: supplier.minOrderQty,
				},
			])
			setNotes('')
			setShowPicker(false)
		}
	}, [
		isCalling,
		productSlug,
		productName,
		unit,
		suggestedQty,
		supplier.rawCost,
		supplier.minOrderQty,
	])

	const { data: catalog } = useQuery({
		queryKey: ['supplier-catalog', supplier.supplierName],
		queryFn: () =>
			getSupplierCatalog({ data: { supplierName: supplier.supplierName } }),
		enabled: isCalling,
		staleTime: 30_000,
	})

	const mutation = useMutation({
		mutationFn: createDeal,
		onSuccess: onDealCreated,
	})

	const total = lines.reduce((s, l) => s + l.agreedQty * l.agreedRawCost, 0)
	// Any line with a dropped price requires proof in the notes field.
	const anyPriceDropped = lines.some((l) => l.agreedRawCost < l.listedCost)
	const anyMOQViolation = lines.some(
		(l) => l.agreedQty > 0 && l.agreedQty < l.minOrderQty,
	)
	const everyLineValid = lines.every(
		(l) => l.agreedQty > 0 && l.agreedRawCost > 0,
	)

	const addItem = (
		p: {
			productSlug: string
			productName: string
			unit: string
			rawCost: number
			minOrderQty: number
		},
		initialQty: number,
	) => {
		if (lines.some((l) => l.productSlug === p.productSlug)) return
		setLines((prev) => [
			...prev,
			{
				productSlug: p.productSlug,
				productName: p.productName,
				unit: p.unit,
				listedCost: p.rawCost,
				agreedQty: initialQty,
				agreedRawCost: p.rawCost,
				minOrderQty: p.minOrderQty,
			},
		])
		setShowPicker(false)
	}

	const updateLine = (slug: string, patch: Partial<DealLineDraft>) => {
		setLines((prev) =>
			prev.map((l) => (l.productSlug === slug ? { ...l, ...patch } : l)),
		)
	}

	const removeLine = (slug: string) => {
		setLines((prev) => prev.filter((l) => l.productSlug !== slug))
	}

	// Products in the supplier's catalog that aren't already on the draft
	const availableToAdd = (catalog?.items ?? []).filter(
		(i) => !lines.some((l) => l.productSlug === i.productSlug),
	)

	return (
		<div
			className={`rounded-xl border transition-colors ${
				isCalling
					? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/[0.02]'
					: 'border-black/[0.06] bg-[var(--color-surface)] hover:border-black/15 dark:border-white/[0.08] dark:bg-[#0d0d0d] dark:hover:border-white/20'
			}`}
		>
			{/* Top row — supplier info + call action */}
			<div className="flex items-start justify-between gap-3 px-4 py-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<p className="text-[13px] font-semibold text-[var(--color-text)] truncate">
							{supplier.supplierName}
						</p>
						{supplier.isPrimary && (
							<span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-primary)]/[0.08] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
								Primary
							</span>
						)}
					</div>
					<div className="mt-1 flex items-center gap-2.5 text-[10px] text-[var(--color-text-subtle)]">
						<span className="font-medium uppercase tracking-wider">
							{TIER_LABELS[supplier.tier] ?? supplier.tier}
						</span>
						{supplier.rating > 0 && (
							<span className="inline-flex items-center gap-0.5">
								<Star
									size={9}
									strokeWidth={2}
									className="fill-current text-amber-500"
								/>
								<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
									{supplier.rating.toFixed(1)}
								</span>
							</span>
						)}
						<span className="inline-flex items-center gap-0.5">
							<Clock size={9} strokeWidth={2} />
							{formatHours(supplier.lastQuotedAtHoursAgo)}
						</span>
						<span>· {supplier.leadTimeDays}d lead</span>
					</div>
					{supplier.phone && (
						<p className="mt-1.5 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
							{supplier.phone}
						</p>
					)}
				</div>

				<div className="flex flex-col items-end gap-1">
					<div className="font-[family-name:var(--font-geist-mono)] text-[15px] font-semibold tabular-nums text-[var(--color-text)]">
						{supplier.rawCost.toLocaleString('en-EG')}
					</div>
					<div className="text-[9px] uppercase tracking-wider text-[var(--color-text-subtle)]">
						EGP / {unit}
					</div>
					{!isCalling && (
						<button
							type="button"
							onClick={onOpenCall}
							className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90"
						>
							<Phone size={11} strokeWidth={2.5} />
							Call & set deal
						</button>
					)}
				</div>
			</div>

			{/* Inline call form — multi-item */}
			{isCalling &&
				(() => {
					const notesOk = !anyPriceDropped || isValidProof(notes)
					const canSubmit =
						lines.length > 0 &&
						everyLineValid &&
						!anyMOQViolation &&
						notesOk &&
						!mutation.isPending

					return (
						<div className="border-t border-black/[0.06] px-4 py-4 dark:border-white/[0.08]">
							<p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
								Deal items · {lines.length}
							</p>

							{/* Line editor — one row per product in the draft */}
							<div className="flex flex-col gap-2">
								{lines.map((line, idx) => {
									const isPrimary = idx === 0
									const priceDropped = line.agreedRawCost < line.listedCost
									const qtyBelowMOQ =
										line.agreedQty > 0 && line.agreedQty < line.minOrderQty
									const lineTotal =
										Math.round(line.agreedQty * line.agreedRawCost * 100) / 100
									return (
										<div
											key={line.productSlug}
											className="rounded-lg border border-black/[0.08] bg-[var(--color-surface)] px-3 py-2.5 dark:border-white/[0.1] dark:bg-[#0d0d0d]"
										>
											<div className="flex items-start justify-between gap-2">
												<div className="min-w-0 flex-1">
													<p className="truncate text-[12px] font-semibold text-[var(--color-text)]">
														{line.productName}
													</p>
													{isPrimary && (
														<span className="mt-0.5 inline-block text-[9px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
															Primary refill
														</span>
													)}
												</div>
												{!isPrimary && (
													<button
														type="button"
														onClick={() => removeLine(line.productSlug)}
														className="shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-[var(--color-text-subtle)] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
													>
														Remove
													</button>
												)}
											</div>

											<div className="mt-2 grid grid-cols-[1fr,1fr,auto] items-end gap-2">
												<div>
													<span className="block text-[8px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
														Qty ({line.unit})
													</span>
													<div
														className={`mt-0.5 flex items-center rounded-md border px-2 py-1 ${
															qtyBelowMOQ
																? 'border-amber-500/40'
																: 'border-black/[0.08] dark:border-white/[0.1]'
														}`}
													>
														<input
															type="text"
															inputMode="numeric"
															value={line.agreedQty}
															onChange={(e) => {
																const n = sanitizeIntQty(e.target.value)
																updateLine(line.productSlug, {
																	agreedQty: n ?? 0,
																})
															}}
															className="w-full bg-transparent font-[family-name:var(--font-geist-mono)] text-[12px] font-medium tabular-nums outline-none"
														/>
													</div>
												</div>

												<div>
													<span className="block text-[8px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
														Cost EGP
													</span>
													<div className="mt-0.5 flex items-center rounded-md border border-black/[0.08] px-2 py-1 dark:border-white/[0.1]">
														<input
															type="text"
															inputMode="decimal"
															value={line.agreedRawCost}
															onChange={(e) => {
																const n = sanitizeCost(e.target.value)
																updateLine(line.productSlug, {
																	agreedRawCost: n ?? 0,
																})
															}}
															className="w-full bg-transparent font-[family-name:var(--font-geist-mono)] text-[12px] font-medium tabular-nums outline-none"
														/>
													</div>
												</div>

												<div className="text-end">
													<div className="text-[8px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
														Line
													</div>
													<div className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums text-[var(--color-text)]">
														{lineTotal.toLocaleString('en-EG')}
													</div>
												</div>
											</div>

											{(priceDropped || qtyBelowMOQ) && (
												<div className="mt-1 flex flex-wrap gap-x-3 text-[9px]">
													{priceDropped && (
														<span className="text-emerald-600 dark:text-emerald-400">
															↓ vs listed{' '}
															{line.listedCost.toLocaleString('en-EG')}
														</span>
													)}
													{qtyBelowMOQ && (
														<span className="text-amber-600 dark:text-amber-400">
															Below MOQ{' '}
															{line.minOrderQty.toLocaleString('en-EG')}
														</span>
													)}
												</div>
											)}
										</div>
									)
								})}
							</div>

							{/* + Add item picker */}
							{!showPicker ? (
								<button
									type="button"
									onClick={() => setShowPicker(true)}
									disabled={availableToAdd.length === 0}
									className="mt-2 w-full rounded-lg border border-dashed border-black/[0.12] py-2 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.14]"
								>
									{availableToAdd.length === 0
										? '— supplier catalog exhausted —'
										: `+ Add item (${availableToAdd.length} more from this supplier)`}
								</button>
							) : (
								<div className="mt-2 max-h-[180px] overflow-y-auto rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.03]">
									<div className="sticky top-0 flex items-center justify-between border-b border-black/[0.06] bg-[var(--color-surface)] px-3 py-2 dark:border-white/[0.08] dark:bg-[#0d0d0d]">
										<span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
											Add another item from {supplier.supplierName}
										</span>
										<button
											type="button"
											onClick={() => setShowPicker(false)}
											className="text-[10px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
										>
											Close
										</button>
									</div>
									<div className="flex flex-col">
										{availableToAdd.map((p) => (
											<button
												key={p.productSlug}
												type="button"
												onClick={() =>
													addItem(
														{
															productSlug: p.productSlug,
															productName: p.productName,
															unit: p.unit,
															rawCost: p.rawCost,
															minOrderQty: p.minOrderQty,
														},
														Math.max(
															p.minOrderQty,
															p.threshold || p.minOrderQty,
														),
													)
												}
												className="flex items-center justify-between gap-3 border-b border-black/[0.04] px-3 py-2 text-start transition-colors hover:bg-[var(--color-primary)]/[0.06] dark:border-white/[0.05] last:border-b-0"
											>
												<div className="min-w-0 flex-1">
													<p className="truncate text-[12px] font-medium text-[var(--color-text)]">
														{p.productName}
													</p>
													<p className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
														{p.sku} · MOQ {p.minOrderQty} {p.unit} ·{' '}
														{p.leadTimeDays}d lead
													</p>
												</div>
												<div className="text-end">
													<div className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums text-[var(--color-text)]">
														{p.rawCost.toLocaleString('en-EG')}
													</div>
													{p.needsRefill && (
														<div className="text-[9px] font-semibold uppercase text-amber-600 dark:text-amber-400">
															Low stock
														</div>
													)}
												</div>
											</button>
										))}
									</div>
								</div>
							)}

							{/* Call notes */}
							<div className="mt-3">
								<span className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
									Call notes{' '}
									{anyPriceDropped ? (
										<span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
											<ShieldAlert size={10} strokeWidth={2.5} />
											required — dropped price needs proof
										</span>
									) : (
										<span>(optional)</span>
									)}
								</span>
								<textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									placeholder={
										anyPriceDropped
											? 'Paste the supplier message, name the rep, or describe the negotiation…'
											: 'Confirmed with Ahmed — can deliver in 3 days…'
									}
									rows={2}
									className={`w-full rounded-lg border bg-[var(--color-surface)] px-3 py-2 text-[12px] outline-none placeholder:text-black/30 focus:border-[var(--color-primary)]/40 dark:bg-[#0d0d0d] dark:placeholder:text-white/20 ${
										anyPriceDropped && !notesOk
											? 'border-amber-500/40'
											: 'border-black/[0.08] dark:border-white/[0.1]'
									}`}
								/>
								{anyPriceDropped && (
									<div className="mt-1 flex items-center justify-end text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
										<span
											className={`font-[family-name:var(--font-geist-mono)] tabular-nums ${
												isValidProof(notes)
													? 'text-emerald-600 dark:text-emerald-400'
													: ''
											}`}
										>
											{notes.trim().length} / {MIN_PROOF_LENGTH}
										</span>
									</div>
								)}
							</div>

							{/* Deal total */}
							<div className="mt-4 flex items-baseline justify-between border-t border-black/[0.06] pt-3 dark:border-white/[0.08]">
								<div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
									Deal total · {lines.length} item
									{lines.length !== 1 ? 's' : ''}
								</div>
								<div className="font-[family-name:var(--font-geist-mono)] text-[18px] font-semibold tabular-nums text-[var(--color-text)]">
									{total.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
									<span className="ms-1 text-[11px] font-normal text-[var(--color-text-subtle)]">
										EGP
									</span>
								</div>
							</div>

							{/* Actions */}
							<div className="mt-4 flex items-center gap-2">
								<button
									type="button"
									onClick={onCancelCall}
									className="flex-1 rounded-lg border border-black/[0.08] py-2 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-black/[0.03] dark:border-white/[0.1] dark:hover:bg-white/[0.04]"
								>
									Hang up
								</button>
								<button
									type="button"
									disabled={!canSubmit}
									onClick={() =>
										mutation.mutate({
											data: {
												supplierName: supplier.supplierName,
												items: lines.map((l) => ({
													productSlug: l.productSlug,
													agreedQty: l.agreedQty,
													agreedRawCost: l.agreedRawCost,
												})),
												notes: notes.trim() || undefined,
											},
										})
									}
									className="flex flex-[2] items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-40"
								>
									{mutation.isPending ? (
										<Loader2
											size={12}
											strokeWidth={2.5}
											className="animate-spin"
										/>
									) : (
										<Check size={12} strokeWidth={2.5} />
									)}
									Seal deal & ship to finance
								</button>
							</div>
						</div>
					)
				})()}
		</div>
	)
}
