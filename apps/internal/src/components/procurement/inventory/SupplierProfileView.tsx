import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { sanitizeCost } from '../../../lib/inputs'
import {
	getSupplierProfile,
	type QuoteFreshness,
	type SupplierTier,
	updateSupplierProfile,
	updateSupplierQuoteByRow,
} from '../../../lib/server/inventory'
import { PriceConfirmDialog } from './PriceConfirmDialog'

interface SupplierProfileViewProps {
	name: string
	onBack: () => void
}

const TIER_OPTIONS: { value: SupplierTier; label: string }[] = [
	{ value: 'preferred', label: 'preferred' },
	{ value: 'approved', label: 'approved' },
	{ value: 'conditional', label: 'conditional' },
	{ value: 'new', label: 'new' },
]

const QUOTE_LABEL: Record<QuoteFreshness, string> = {
	confirmed: 'confirmed',
	reconfirm: 're-confirm',
	needs_quote: 'needs quote',
}

const QUOTE_TONE: Record<QuoteFreshness, string> = {
	confirmed: 'var(--compendium-fresh)',
	reconfirm: 'var(--compendium-aging)',
	needs_quote: 'var(--compendium-stale)',
}

const SUGGESTED_BADGES = [
	'fast-delivery',
	'bulk-discounts',
	'quality-certified',
	'owner-account',
	'whatsapp-contact',
	'import-agent',
]

function formatRelative(iso: string): string {
	const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
	if (hours < 1) return `${Math.round(hours * 60)}m`
	if (hours < 24) return `${Math.round(hours)}h`
	return `${Math.floor(hours / 24)}d`
}

export function SupplierProfileView({
	name,
	onBack,
}: SupplierProfileViewProps) {
	const qc = useQueryClient()
	const queryKey = ['inventory-supplier-profile', name]

	const { data, isLoading } = useQuery({
		queryKey,
		queryFn: () => getSupplierProfile({ data: { name } }),
		staleTime: 10_000,
	})

	const profileMutation = useMutation({
		mutationFn: updateSupplierProfile,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey })
			qc.invalidateQueries({ queryKey: ['inventory-overview'] })
			qc.invalidateQueries({ queryKey: ['inventory-top-suppliers'] })
		},
	})

	const priceMutation = useMutation({
		mutationFn: updateSupplierQuoteByRow,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey })
			qc.invalidateQueries({ queryKey: ['inventory-overview'] })
			qc.invalidateQueries({ queryKey: ['inventory-top-suppliers'] })
			qc.invalidateQueries({ queryKey: ['inventory-product-detail'] })
			qc.invalidateQueries({ queryKey: ['sales-outdated-prices'] })
		},
	})

	const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
	const [quoteDraft, setQuoteDraft] = useState('')
	const [addBadgeOpen, setAddBadgeOpen] = useState(false)
	const [pendingEdit, setPendingEdit] = useState<{
		slug: string
		supplierRowId: string
		productName: string
		unit: string
		oldCost: number
		newCost: number
	} | null>(null)

	if (isLoading || !data) {
		return (
			<div className="compendium-theme flex items-center justify-center py-32 text-[var(--ink-mid)]">
				<p
					className="font-[family-name:var(--font-fraunces)] italic"
					style={{ fontSize: '13px' }}
				>
					opening the dossier…
				</p>
			</div>
		)
	}

	const {
		supplier,
		quotes,
		quoteCount,
		primaryForCount,
		confirmedCount,
		reconfirmCount,
		staleCount,
	} = data

	const setTier = (tier: SupplierTier) => {
		profileMutation.mutate({ data: { name, tier } })
	}

	const addBadge = (badge: string) => {
		profileMutation.mutate({ data: { name, addBadge: badge } })
		setAddBadgeOpen(false)
	}

	const removeBadge = (badge: string) => {
		profileMutation.mutate({ data: { name, removeBadge: badge } })
	}

	const savePrice = (
		slug: string,
		supplierRowId: string,
		productName: string,
		oldCost: number,
		unit: string,
	) => {
		const v = sanitizeCost(quoteDraft)
		if (v !== null && v !== oldCost) {
			setPendingEdit({
				slug,
				supplierRowId,
				productName,
				unit,
				oldCost,
				newCost: v,
			})
		}
		setEditingQuoteId(null)
		setQuoteDraft('')
	}

	const commitPendingEdit = (_proof?: string) => {
		if (!pendingEdit) return
		priceMutation.mutate({
			data: {
				slug: pendingEdit.slug,
				supplierRowId: pendingEdit.supplierRowId,
				rawCost: pendingEdit.newCost,
			},
		})
		setPendingEdit(null)
	}

	const availableBadges = SUGGESTED_BADGES.filter(
		(b) => !supplier.customBadges.includes(b),
	)

	return (
		<div className="compendium-theme flex max-h-[85vh] flex-col bg-[var(--folio)] text-[var(--ink)]">
			<SupplierMasthead
				name={supplier.name}
				rating={supplier.rating}
				phone={supplier.phone}
				paymentTerms={supplier.paymentTerms}
				quoteCount={quoteCount}
				primaryForCount={primaryForCount}
				confirmedCount={confirmedCount}
				reconfirmCount={reconfirmCount}
				staleCount={staleCount}
			/>

			<div className="flex-1 min-h-0 overflow-y-auto px-8 pb-6">
				<SectionRule label="Tier" />
				<div className="mt-2 flex items-baseline gap-6">
					{TIER_OPTIONS.map((opt) => {
						const active = supplier.tier === opt.value
						return (
							<button
								key={opt.value}
								type="button"
								onClick={() => setTier(opt.value)}
								aria-pressed={active}
								className="group inline-flex items-baseline gap-1.5 outline-none"
							>
								<span
									aria-hidden="true"
									className="h-[5px] w-[5px] rounded-full transition-colors"
									style={{
										background: active
											? 'var(--compendium-brand)'
											: 'var(--ink-ghost)',
									}}
								/>
								<span
									className="font-[family-name:var(--font-fraunces)] transition-colors"
									style={{
										fontSize: '13px',
										fontWeight: active ? 600 : 400,
										fontStyle: active ? 'normal' : 'italic',
										color: active ? 'var(--ink)' : 'var(--ink-soft)',
										letterSpacing: active ? '-0.005em' : '0',
									}}
								>
									{opt.label}
								</span>
							</button>
						)
					})}
				</div>

				<SectionRule label="Badges" />
				<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
					{supplier.customBadges.map((badge) => (
						<span
							key={badge}
							className="group inline-flex items-baseline gap-1"
						>
							<span
								className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink)]"
								style={{ fontSize: '12.5px' }}
							>
								{badge}
							</span>
							<button
								type="button"
								onClick={() => removeBadge(badge)}
								aria-label={`Remove ${badge}`}
								className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)] opacity-0 transition-opacity hover:text-[var(--compendium-stale)] group-hover:opacity-100"
								style={{ fontSize: '10px' }}
							>
								×
							</button>
						</span>
					))}

					{addBadgeOpen ? (
						<div className="inline-flex items-baseline gap-3">
							{availableBadges.length === 0 ? (
								<span
									className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
									style={{ fontSize: '11px' }}
								>
									no more suggested badges
								</span>
							) : (
								availableBadges.map((badge) => (
									<button
										key={badge}
										type="button"
										onClick={() => addBadge(badge)}
										className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)] transition-colors hover:text-[var(--compendium-brand)]"
										style={{ fontSize: '11.5px' }}
									>
										+ {badge}
									</button>
								))
							)}
							<button
								type="button"
								onClick={() => setAddBadgeOpen(false)}
								className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)] hover:text-[var(--ink)]"
								style={{ fontSize: '10.5px' }}
								aria-label="Close badge picker"
							>
								close
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setAddBadgeOpen(true)}
							className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)] transition-colors hover:text-[var(--compendium-brand)]"
							style={{ fontSize: '11.5px' }}
						>
							+ add a badge
						</button>
					)}
				</div>

				<SectionRule
					label={`All quotes · ${quoteCount}`}
					hint="click a price to update"
				/>

				{quotes.length === 0 ? (
					<div className="mt-6 border-y border-dashed border-[var(--rule-soft)] py-10 text-center">
						<p
							className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
							style={{ fontSize: '13px' }}
						>
							this supplier isn't quoting any catalog product yet.
						</p>
					</div>
				) : (
					<ol className="mt-2 flex flex-col">
						{quotes.map((q) => {
							const isEditing = editingQuoteId === q.supplierRowId
							const isSavingThis =
								priceMutation.isPending &&
								priceMutation.variables?.data.supplierRowId === q.supplierRowId
							return (
								<li
									key={q.supplierRowId}
									className="grid items-baseline border-t border-[var(--rule-soft)] py-3"
									style={{
										gridTemplateColumns: '1fr auto',
										columnGap: '20px',
									}}
								>
									<div className="min-w-0">
										<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
											<span
												className="font-[family-name:var(--font-fraunces)] leading-[1.12] text-[var(--ink)]"
												style={{
													fontSize: '14px',
													fontWeight: 500,
													letterSpacing: '-0.008em',
												}}
											>
												{q.productName}
											</span>
											{q.isPrimary && (
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
											className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--ink-mid)]"
											style={{ fontSize: '10.5px' }}
										>
											<span className="font-[family-name:var(--font-fraunces)] italic">
												{q.productCategory}
											</span>
											<span className="opacity-60">·</span>
											<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
												quoted {formatRelative(q.lastQuotedAt)} ago
											</span>
											<span className="opacity-60">·</span>
											<span
												className="font-[family-name:var(--font-fraunces)] italic"
												style={{ color: QUOTE_TONE[q.quoteFreshness] }}
											>
												{QUOTE_LABEL[q.quoteFreshness]}
											</span>
										</p>
									</div>

									<div className="flex flex-col items-end">
										{isEditing ? (
											<input
												value={quoteDraft}
												onChange={(e) => setQuoteDraft(e.target.value)}
												onBlur={() =>
													savePrice(
														q.productSlug,
														q.supplierRowId,
														q.productName,
														q.rawCost,
														q.unit,
													)
												}
												onKeyDown={(e) => {
													if (e.key === 'Enter') {
														e.preventDefault()
														e.stopPropagation()
														savePrice(
															q.productSlug,
															q.supplierRowId,
															q.productName,
															q.rawCost,
															q.unit,
														)
													}
													if (e.key === 'Escape') {
														setEditingQuoteId(null)
														setQuoteDraft('')
													}
												}}
												// biome-ignore lint/a11y/noAutofocus: intentional focus on inline edit open
												autoFocus
												className="w-28 bg-transparent text-end font-[family-name:var(--font-fraunces)] tabular-nums text-[var(--ink)] outline-none"
												style={{
													fontSize: '18px',
													fontWeight: 500,
													letterSpacing: '-0.015em',
													borderBottom: '1px solid var(--compendium-brand)',
													paddingBottom: '1px',
												}}
											/>
										) : (
											<button
												type="button"
												disabled={isSavingThis}
												onClick={() => {
													setEditingQuoteId(q.supplierRowId)
													setQuoteDraft(String(q.rawCost))
												}}
												className="group inline-flex items-baseline gap-1 outline-none disabled:cursor-wait"
											>
												<span
													className="compendium-numeral font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)]"
													style={{
														fontSize: '18px',
														fontWeight: 500,
														letterSpacing: '-0.015em',
													}}
												>
													{isSavingThis
														? '…'
														: q.rawCost.toLocaleString('en-EG', {
																minimumFractionDigits: 2,
															})}
												</span>
												<span
													aria-hidden="true"
													className="text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
													style={{ color: 'var(--ink-mid)' }}
												>
													✎
												</span>
											</button>
										)}
										<span
											className="mt-0.5 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
											style={{ fontSize: '10px' }}
										>
											EGP / {q.unit}
										</span>
									</div>
								</li>
							)
						})}
					</ol>
				)}
			</div>

			{/* Footer */}
			<div className="shrink-0 border-t border-[var(--rule)] px-8 py-3">
				<div className="flex items-baseline justify-between">
					<span
						className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '11px' }}
					>
						{profileMutation.isPending
							? 'saving the dossier…'
							: 'dossier up to date'}
					</span>
					<button
						type="button"
						onClick={onBack}
						className="group inline-flex items-baseline gap-1.5 outline-none"
					>
						<span
							aria-hidden="true"
							className="transition-transform group-hover:-translate-x-[3px]"
							style={{
								fontFamily: 'var(--font-fraunces)',
								fontStyle: 'italic',
								fontSize: '13px',
								color: 'var(--compendium-brand)',
							}}
						>
							←
						</span>
						<span
							className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)] transition-colors group-hover:text-[var(--ink)]"
							style={{ fontSize: '12px' }}
						>
							back to the product
						</span>
					</button>
				</div>
			</div>

			<PriceConfirmDialog
				isOpen={pendingEdit !== null}
				productName={pendingEdit?.productName ?? ''}
				supplierName={name}
				unit={pendingEdit?.unit ?? ''}
				oldCost={pendingEdit?.oldCost ?? 0}
				newCost={pendingEdit?.newCost ?? 0}
				onConfirm={commitPendingEdit}
				onCancel={() => setPendingEdit(null)}
			/>
		</div>
	)
}

// ─── Masthead ────────────────────────────────────────────

function SupplierMasthead({
	name,
	rating,
	phone,
	paymentTerms,
	quoteCount,
	primaryForCount,
	confirmedCount,
	reconfirmCount,
	staleCount,
}: {
	name: string
	rating: number
	phone: string | null
	paymentTerms: string
	quoteCount: number
	primaryForCount: number
	confirmedCount: number
	reconfirmCount: number
	staleCount: number
}) {
	return (
		<header className="shrink-0 border-b border-[var(--rule)] px-8 pt-7 pb-6">
			<div className="flex items-baseline gap-2">
				<span
					className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--compendium-brand)]"
					style={{ fontSize: '11px', letterSpacing: '0.02em' }}
				>
					Dossier
				</span>
				<span
					className="font-[family-name:var(--font-fraunces)] italic leading-none text-[var(--ink-mid)]"
					style={{ fontSize: '10.5px' }}
				>
					· a supplier on the telephone
				</span>
			</div>

			<h2
				className="mt-2 font-[family-name:var(--font-fraunces)] leading-[1.06] text-[var(--ink)]"
				style={{
					fontSize: '30px',
					fontWeight: 500,
					letterSpacing: '-0.022em',
				}}
			>
				{name}
			</h2>

			<p
				className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--ink-mid)]"
				style={{ fontSize: '11.5px' }}
			>
				{rating > 0 && (
					<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
						★ {rating.toFixed(1)}
					</span>
				)}
				{phone && (
					<>
						<span className="opacity-60">·</span>
						<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
							{phone}
						</span>
					</>
				)}
				{paymentTerms && (
					<>
						<span className="opacity-60">·</span>
						<span className="font-[family-name:var(--font-fraunces)] italic">
							{paymentTerms}
						</span>
					</>
				)}
			</p>

			<div className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-[var(--rule-soft)] pt-4">
				<Stat label="quotes" value={quoteCount} />
				<Stat label="primary for" value={primaryForCount} tone="brand" />
				<Stat label="confirmed" value={confirmedCount} tone="fresh" />
				<Stat label="re-confirm" value={reconfirmCount} tone="aging" />
				<Stat label="stale" value={staleCount} tone="stale" />
			</div>
		</header>
	)
}

function Stat({
	label,
	value,
	tone = 'neutral',
}: {
	label: string
	value: number
	tone?: 'neutral' | 'brand' | 'fresh' | 'aging' | 'stale'
}) {
	const color = {
		neutral: 'var(--ink)',
		brand: 'var(--compendium-brand)',
		fresh: 'var(--compendium-fresh)',
		aging: 'var(--compendium-aging)',
		stale: 'var(--compendium-stale)',
	}[tone]
	return (
		<div className="flex flex-col items-start">
			<dt
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
				style={{ fontSize: '10.5px', letterSpacing: '0.02em' }}
			>
				{label}
			</dt>
			<dd
				className="font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold tabular-nums leading-none"
				style={{ color: value > 0 ? color : 'var(--ink-ghost)' }}
			>
				{value.toString().padStart(2, '0')}
			</dd>
		</div>
	)
}

// ─── Section rule ────────────────────────────────────────

function SectionRule({ label, hint }: { label: string; hint?: string }) {
	return (
		<div className="mt-6 flex items-baseline gap-2">
			<span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-mid)]">
				{label}
			</span>
			<span aria-hidden="true" className="h-px flex-1 bg-[var(--rule-soft)]" />
			{hint && (
				<span
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '10.5px' }}
				>
					{hint}
				</span>
			)}
		</div>
	)
}
