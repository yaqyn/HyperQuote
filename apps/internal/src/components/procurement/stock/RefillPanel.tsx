import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

const STATUS_LABEL: Record<StockStatus, string> = {
	healthy: 'healthy',
	low: 'running low',
	critical: 'critical',
	out: 'out of stock',
}

const STATUS_TONE: Record<StockStatus, string> = {
	healthy: 'var(--compendium-fresh)',
	low: 'var(--compendium-aging)',
	critical: 'var(--compendium-aging)',
	out: 'var(--compendium-stale)',
}

const TIER_LABELS: Record<string, string> = {
	preferred: 'preferred',
	approved: 'approved',
	conditional: 'conditional',
	new: 'new',
	blocked: 'blocked',
}

function formatHours(hours: number): string {
	if (hours < 24) return `${hours}h ago`
	const days = Math.round(hours / 24)
	if (days < 30) return `${days}d ago`
	const months = Math.round(days / 30)
	return `${months}mo ago`
}

function toRoman(n: number): string {
	const map: [number, string][] = [
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I'],
	]
	let out = ''
	let rest = n
	for (const [val, letters] of map) {
		while (rest >= val) {
			out += letters
			rest -= val
		}
	}
	return out
}

// ─── Panel ────────────────────────────────────────────────

export function RefillPanel({ productSlug, onClose }: RefillPanelProps) {
	const qc = useQueryClient()
	const isOpen = productSlug !== null

	const { data, isLoading } = useQuery({
		queryKey: ['refill-product', productSlug],
		queryFn: () =>
			getRefillProductDetail({ data: { slug: productSlug ?? '' } }),
		enabled: isOpen && !!productSlug,
	})

	const [callingRowId, setCallingRowId] = useState<string | null>(null)

	useEffect(() => {
		if (isOpen) setCallingRowId(null)
	}, [isOpen])

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={onClose}
			maxWidth={580}
			panelKey="refill-panel"
			ariaLabel="Refill product"
			scope="procurement"
		>
			<div className="compendium-theme flex h-full flex-col bg-[var(--folio)] text-[var(--ink)]">
				{isLoading || !data ? (
					<div className="flex h-full items-center justify-center">
						<p
							className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
							style={{ fontSize: '13px' }}
						>
							pulling the refill…
						</p>
					</div>
				) : (
					<>
						<RefillMasthead data={data} />

						<div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
							<SectionRule
								label={`Who sells this · ${data.suppliers.length}`}
							/>

							{data.suppliers.length === 0 ? (
								<p
									className="mt-6 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
									style={{ fontSize: '13px' }}
								>
									no suppliers carry this product yet. add one from the Desk
									first.
								</p>
							) : (
								<ol className="flex flex-col">
									{data.suppliers.map((supplier, idx) => (
										<SupplierEntry
											key={supplier.rowId}
											index={idx}
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
												qc.invalidateQueries({
													queryKey: ['inventory-overview'],
												})
												qc.invalidateQueries({
													queryKey: ['inventory-top-suppliers'],
												})
												qc.invalidateQueries({ queryKey: ['finance-inbox'] })
											}}
										/>
									))}
								</ol>
							)}
						</div>
					</>
				)}
			</div>
		</SlidePanel>
	)
}

// ─── Masthead ────────────────────────────────────────────

function RefillMasthead({
	data,
}: {
	data: {
		name: string
		sku: string
		unit: string
		stockLevel: number
		lowStockThreshold: number
		status: StockStatus
		suggestedQty: number
	}
}) {
	const tone = STATUS_TONE[data.status]
	return (
		<header className="shrink-0 border-b border-[var(--rule)] px-8 pt-7 pb-6">
			<div className="flex items-baseline gap-2">
				<span
					className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--compendium-brand)]"
					style={{ fontSize: '11px', letterSpacing: '0.02em' }}
				>
					Refill
				</span>
				<span
					className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--ink-mid)]"
					style={{ fontSize: '10.5px' }}
				>
					· call once, stock many
				</span>
			</div>

			<h2
				className="mt-2 font-[family-name:var(--font-fraunces)] leading-[1.08] text-[var(--ink)]"
				style={{
					fontSize: '24px',
					fontWeight: 500,
					letterSpacing: '-0.018em',
				}}
			>
				{data.name}
			</h2>

			<div
				className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--ink-mid)]"
				style={{ fontSize: '11px' }}
			>
				<span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.1em]">
					{data.sku}
				</span>
				<span className="opacity-60">·</span>
				<span
					className="font-[family-name:var(--font-fraunces)] italic"
					style={{ color: tone }}
				>
					{STATUS_LABEL[data.status]}
				</span>
			</div>

			{/* Editorial stock tally — three numbers on one baseline. */}
			<div className="mt-6 flex items-end justify-between gap-6">
				<TallyNumeral
					value={data.stockLevel}
					label={`on hand · ${data.unit}`}
					tone={tone}
					hero
				/>
				<TallyNumeral
					value={data.lowStockThreshold}
					label="threshold"
					tone="var(--ink-mid)"
				/>
				<TallyNumeral
					value={data.suggestedQty}
					label="suggested refill"
					prefix="+"
					tone="var(--compendium-brand)"
				/>
			</div>
		</header>
	)
}

function TallyNumeral({
	value,
	label,
	tone,
	prefix,
	hero,
}: {
	value: number
	label: string
	tone: string
	prefix?: string
	hero?: boolean
}) {
	return (
		<div className="flex flex-col">
			<span
				className="compendium-numeral font-[family-name:var(--font-fraunces)] leading-none"
				style={{
					fontSize: hero ? '44px' : '28px',
					fontWeight: 500,
					letterSpacing: hero ? '-0.035em' : '-0.025em',
					color: tone,
				}}
			>
				{prefix ?? ''}
				{value.toLocaleString('en-EG')}
			</span>
			<span
				className="mt-1 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
				style={{ fontSize: '10.5px', letterSpacing: '0.005em' }}
			>
				{label}
			</span>
		</div>
	)
}

// ─── Section rule ────────────────────────────────────────

function SectionRule({ label }: { label: string }) {
	return (
		<div className="mt-6 mb-2 flex items-baseline gap-2">
			<span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-mid)]">
				{label}
			</span>
			<span aria-hidden="true" className="h-px flex-1 bg-[var(--rule-soft)]" />
		</div>
	)
}

// ─── Supplier entry + inline call form ───────────────────

interface DealLineDraft {
	productSlug: string
	productName: string
	unit: string
	listedCost: number
	agreedQty: number
	agreedRawCost: number
	minOrderQty: number
}

function SupplierEntry({
	index,
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
	index: number
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

	const availableToAdd = (catalog?.items ?? []).filter(
		(i) => !lines.some((l) => l.productSlug === i.productSlug),
	)

	return (
		<li
			className="relative grid border-t border-[var(--rule-soft)] py-5"
			style={{
				gridTemplateColumns: '22px 1fr',
				columnGap: '20px',
			}}
		>
			<div className="pt-1">
				<span
					className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--ink-ghost)]"
					style={{ fontSize: '11px' }}
				>
					{toRoman(index + 1)}
				</span>
			</div>

			<div className="min-w-0">
				{/* Supplier line */}
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
							<span
								className="font-[family-name:var(--font-fraunces)] leading-[1.12] text-[var(--ink)]"
								style={{
									fontSize: '17px',
									fontWeight: 500,
									letterSpacing: '-0.012em',
								}}
							>
								{supplier.supplierName}
							</span>
							{supplier.isPrimary && (
								<span
									className="font-[family-name:var(--font-fraunces)] italic"
									style={{
										fontSize: '10.5px',
										color: 'var(--compendium-brand)',
									}}
								>
									· primary
								</span>
							)}
						</div>
						<p
							className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--ink-mid)]"
							style={{ fontSize: '10.5px' }}
						>
							<span className="font-[family-name:var(--font-fraunces)] italic">
								{TIER_LABELS[supplier.tier] ?? supplier.tier}
							</span>
							{supplier.rating > 0 && (
								<>
									<span className="opacity-60">·</span>
									<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
										★ {supplier.rating.toFixed(1)}
									</span>
								</>
							)}
							<span className="opacity-60">·</span>
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
								quoted {formatHours(supplier.lastQuotedAtHoursAgo)}
							</span>
							<span className="opacity-60">·</span>
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
								{supplier.leadTimeDays}d lead
							</span>
						</p>
						{supplier.phone && (
							<p
								className="mt-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--ink-mid)]"
								style={{ fontSize: '11px' }}
							>
								{supplier.phone}
							</p>
						)}
					</div>

					<div className="flex flex-col items-end gap-1.5">
						<div className="flex flex-col items-end">
							<span
								className="compendium-numeral font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)]"
								style={{
									fontSize: '22px',
									fontWeight: 500,
									letterSpacing: '-0.02em',
								}}
							>
								{supplier.rawCost.toLocaleString('en-EG')}
							</span>
							<span
								className="mt-0.5 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
								style={{ fontSize: '10px' }}
							>
								EGP / {unit}
							</span>
						</div>
						{!isCalling && (
							<button
								type="button"
								onClick={onOpenCall}
								className="group inline-flex items-baseline gap-1.5 outline-none"
							>
								<span
									className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--ink)]"
									style={{
										fontSize: '13px',
										fontWeight: 500,
										letterSpacing: '-0.005em',
									}}
								>
									call & set deal
								</span>
								<span
									aria-hidden="true"
									className="transition-transform group-hover:translate-x-[3px]"
									style={{
										fontFamily: 'var(--font-fraunces)',
										fontStyle: 'italic',
										fontSize: '14px',
										color: 'var(--compendium-brand)',
									}}
								>
									→
								</span>
							</button>
						)}
					</div>
				</div>

				{/* Inline call form */}
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
							<div className="mt-4 border-l-2 border-[var(--compendium-brand)] pl-4">
								<div className="mb-3 flex items-baseline justify-between">
									<span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-mid)]">
										at the telephone · {lines.length} item
										{lines.length === 1 ? '' : 's'}
									</span>
								</div>

								<div className="flex flex-col gap-3">
									{lines.map((line, idx) => {
										const isPrimary = idx === 0
										const priceDropped = line.agreedRawCost < line.listedCost
										const qtyBelowMOQ =
											line.agreedQty > 0 && line.agreedQty < line.minOrderQty
										const lineTotal =
											Math.round(line.agreedQty * line.agreedRawCost * 100) /
											100

										return (
											<div
												key={line.productSlug}
												className="border-b border-[var(--rule-soft)] pb-3 last:border-b-0 last:pb-0"
											>
												<div className="flex items-baseline justify-between gap-2">
													<p
														className="font-[family-name:var(--font-fraunces)] text-[var(--ink)]"
														style={{
															fontSize: '14px',
															fontWeight: 500,
															letterSpacing: '-0.008em',
														}}
													>
														{line.productName}
														{isPrimary && (
															<span
																className="ms-1.5 font-[family-name:var(--font-fraunces)] italic"
																style={{
																	fontSize: '10.5px',
																	color: 'var(--compendium-brand)',
																}}
															>
																· primary refill
															</span>
														)}
													</p>
													{!isPrimary && (
														<button
															type="button"
															onClick={() => removeLine(line.productSlug)}
															className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)] hover:text-[var(--compendium-stale)]"
															style={{ fontSize: '11px' }}
														>
															remove
														</button>
													)}
												</div>

												<div
													className="mt-2 grid items-end gap-3"
													style={{
														gridTemplateColumns: '1fr 1fr auto',
													}}
												>
													<FieldStack
														label={`qty · ${line.unit}`}
														error={qtyBelowMOQ}
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
															className="w-full bg-transparent font-[family-name:var(--font-fraunces)] tabular-nums text-[var(--ink)] outline-none"
															style={{
																fontSize: '16px',
																fontWeight: 500,
																letterSpacing: '-0.01em',
															}}
														/>
													</FieldStack>

													<FieldStack label="cost · EGP">
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
															className="w-full bg-transparent font-[family-name:var(--font-fraunces)] tabular-nums text-[var(--ink)] outline-none"
															style={{
																fontSize: '16px',
																fontWeight: 500,
																letterSpacing: '-0.01em',
															}}
														/>
													</FieldStack>

													<div className="flex flex-col items-end">
														<span
															className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
															style={{
																fontSize: '9.5px',
																letterSpacing: '0.01em',
															}}
														>
															line
														</span>
														<span
															className="compendium-numeral font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)]"
															style={{
																fontSize: '16px',
																fontWeight: 500,
																letterSpacing: '-0.015em',
															}}
														>
															{lineTotal.toLocaleString('en-EG')}
														</span>
													</div>
												</div>

												{(priceDropped || qtyBelowMOQ) && (
													<div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
														{priceDropped && (
															<span
																className="font-[family-name:var(--font-fraunces)] italic"
																style={{
																	fontSize: '10px',
																	color: 'var(--compendium-fresh)',
																}}
															>
																↓ dropped from{' '}
																{line.listedCost.toLocaleString('en-EG')}
															</span>
														)}
														{qtyBelowMOQ && (
															<span
																className="font-[family-name:var(--font-fraunces)] italic"
																style={{
																	fontSize: '10px',
																	color: 'var(--compendium-aging)',
																}}
															>
																below MOQ of{' '}
																{line.minOrderQty.toLocaleString('en-EG')}
															</span>
														)}
													</div>
												)}
											</div>
										)
									})}
								</div>

								{/* + Add item */}
								{!showPicker ? (
									<button
										type="button"
										onClick={() => setShowPicker(true)}
										disabled={availableToAdd.length === 0}
										className="mt-4 w-full border-t border-dashed border-[var(--rule)] pt-3 text-start font-[family-name:var(--font-fraunces)] italic transition-colors disabled:cursor-not-allowed disabled:opacity-40"
										style={{
											fontSize: '12px',
											color: 'var(--ink-soft)',
										}}
									>
										{availableToAdd.length === 0
											? '— supplier catalog exhausted —'
											: `+ pile on another item (${availableToAdd.length} more from this supplier) →`}
									</button>
								) : (
									<div className="mt-4 max-h-[220px] overflow-y-auto border-t border-[var(--rule)] pt-3">
										<div className="mb-2 flex items-baseline justify-between">
											<span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-mid)]">
												from {supplier.supplierName}
											</span>
											<button
												type="button"
												onClick={() => setShowPicker(false)}
												className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)] hover:text-[var(--ink)]"
												style={{ fontSize: '11px' }}
											>
												close
											</button>
										</div>
										<ul className="flex flex-col">
											{availableToAdd.map((p) => (
												<li key={p.productSlug}>
													<button
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
														className="group flex w-full items-baseline gap-3 border-b border-[var(--rule-soft)] py-2 text-start last:border-b-0"
													>
														<span
															className="flex-1 truncate font-[family-name:var(--font-fraunces)] italic text-[var(--ink)] transition-colors group-hover:text-[var(--compendium-brand)]"
															style={{ fontSize: '12.5px' }}
														>
															{p.productName}
														</span>
														{p.needsRefill && (
															<span
																className="font-[family-name:var(--font-fraunces)] italic"
																style={{
																	fontSize: '9.5px',
																	color: 'var(--compendium-aging)',
																}}
															>
																low
															</span>
														)}
														<span
															className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--ink-mid)]"
															style={{ fontSize: '11px' }}
														>
															{p.rawCost.toLocaleString('en-EG')}
														</span>
													</button>
												</li>
											))}
										</ul>
									</div>
								)}

								{/* Call notes */}
								<div className="mt-4 border-t border-[var(--rule)] pt-3">
									<div className="mb-1 flex items-baseline justify-between">
										<span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-mid)]">
											call notes
										</span>
										{anyPriceDropped ? (
											<span
												className="font-[family-name:var(--font-fraunces)] italic"
												style={{
													fontSize: '10.5px',
													color: 'var(--compendium-aging)',
												}}
											>
												required — dropped price needs a paper trail
											</span>
										) : (
											<span
												className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
												style={{ fontSize: '10.5px' }}
											>
												optional
											</span>
										)}
									</div>
									<textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder={
											anyPriceDropped
												? 'paste the supplier message, name the rep, or describe the negotiation'
												: 'confirmed with Ahmed — can deliver in 3 days'
										}
										rows={2}
										className="w-full resize-none bg-transparent font-[family-name:var(--font-fraunces)] text-[var(--ink)] outline-none"
										style={{
											fontSize: '13px',
											borderBottom: `1px solid ${anyPriceDropped && !notesOk ? 'var(--compendium-aging)' : 'var(--rule)'}`,
											paddingBottom: '6px',
										}}
									/>
									{anyPriceDropped && (
										<div className="mt-1 flex justify-end">
											<span
												className="font-[family-name:var(--font-geist-mono)] tabular-nums"
												style={{
													fontSize: '9.5px',
													color: isValidProof(notes)
														? 'var(--compendium-fresh)'
														: 'var(--ink-mid)',
												}}
											>
												{notes.trim().length} / {MIN_PROOF_LENGTH}
											</span>
										</div>
									)}
								</div>

								{/* Total + actions */}
								<div className="mt-5 flex items-baseline justify-between border-t border-[var(--rule)] pt-3">
									<span
										className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
										style={{ fontSize: '11px' }}
									>
										deal total · {lines.length} item
										{lines.length === 1 ? '' : 's'}
									</span>
									<span
										className="compendium-numeral font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)]"
										style={{
											fontSize: '22px',
											fontWeight: 500,
											letterSpacing: '-0.02em',
										}}
									>
										{total.toLocaleString('en-EG', {
											minimumFractionDigits: 2,
										})}
										<span
											className="ms-1 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
											style={{ fontSize: '11px', fontWeight: 400 }}
										>
											EGP
										</span>
									</span>
								</div>

								<div className="mt-5 flex items-center gap-4">
									<button
										type="button"
										onClick={onCancelCall}
										className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)] hover:text-[var(--ink)]"
										style={{ fontSize: '13px' }}
									>
										hang up
									</button>
									<div
										aria-hidden="true"
										className="h-4 w-px bg-[var(--rule)]"
									/>
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
										className="group ms-auto inline-flex items-baseline gap-2 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<span
											className="font-[family-name:var(--font-fraunces)] text-[var(--ink)]"
											style={{
												fontSize: '13.5px',
												fontWeight: 500,
												letterSpacing: '-0.005em',
											}}
										>
											{mutation.isPending
												? 'sealing…'
												: 'seal deal & ship to finance'}
										</span>
										<span
											aria-hidden="true"
											className="transition-transform group-hover:translate-x-[3px]"
											style={{
												fontFamily: 'var(--font-fraunces)',
												fontStyle: 'italic',
												fontSize: '14px',
												color: 'var(--compendium-brand)',
											}}
										>
											→
										</span>
									</button>
								</div>
							</div>
						)
					})()}
			</div>
		</li>
	)
}

// ─── Field stack ─────────────────────────────────────────

function FieldStack({
	label,
	error,
	children,
}: {
	label: string
	error?: boolean
	children: React.ReactNode
}) {
	return (
		<div className="flex flex-col">
			<span
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
				style={{ fontSize: '9.5px', letterSpacing: '0.01em' }}
			>
				{label}
			</span>
			<div
				className="mt-0.5 pb-0.5"
				style={{
					borderBottom: `1px solid ${error ? 'var(--compendium-aging)' : 'var(--rule)'}`,
				}}
			>
				{children}
			</div>
		</div>
	)
}
