import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
	normalizeDecimalInput,
	PRICE_PROOF_ESSAY_MIN,
	sanitizeCost,
} from '../../../lib/inputs'
import {
	getSupplierBatchPriceOptions,
	updateSupplierQuoteBatch,
} from '../../../lib/server/inventory'
import { EmployeeActionButton } from '../../shared/EmployeeControls'
import { formatDecimalEgp } from '../../shared/formatters'
import { SlidePanel } from '../../shared/SlidePanel'

interface SupplierBatchPricePanelProps {
	isOpen: boolean
	onClose: () => void
}

export function SupplierBatchPricePanel({
	isOpen,
	onClose,
}: SupplierBatchPricePanelProps) {
	const qc = useQueryClient()
	const [supplierId, setSupplierId] = useState('')
	const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
	const [draftPrices, setDraftPrices] = useState<Record<string, string>>({})
	const [proofEssay, setProofEssay] = useState('')
	const [saveError, setSaveError] = useState<string | null>(null)

	const { data: suppliers = [], isLoading } = useQuery({
		queryKey: ['supplier-batch-price-options'],
		queryFn: () => getSupplierBatchPriceOptions(),
		enabled: isOpen,
		staleTime: 30_000,
	})

	const selectedSupplier = useMemo(
		() =>
			suppliers.find((supplier) => supplier.supplierId === supplierId) ?? null,
		[supplierId, suppliers],
	)

	useEffect(() => {
		if (!isOpen) {
			setSupplierId('')
			setSelectedProductIds([])
			setDraftPrices({})
			setProofEssay('')
			setSaveError(null)
		}
	}, [isOpen])

	useEffect(() => {
		if (supplierId || suppliers.length === 0) return
		setSupplierId(suppliers[0].supplierId)
	}, [supplierId, suppliers])

	useEffect(() => {
		if (!selectedSupplier) return
		setSelectedProductIds([])
		setDraftPrices(
			Object.fromEntries(
				selectedSupplier.products.map((product) => [
					product.productId,
					String(product.rawCost),
				]),
			),
		)
		setProofEssay('')
		setSaveError(null)
	}, [selectedSupplier])

	const selectedUpdates = useMemo(() => {
		if (!selectedSupplier) return []
		return selectedProductIds
			.map((productId) => {
				const product = selectedSupplier.products.find(
					(candidate) => candidate.productId === productId,
				)
				const rawCost = sanitizeCost(draftPrices[productId] ?? '')
				if (
					!product ||
					rawCost === null ||
					rawCost <= 0 ||
					rawCost === product.rawCost
				) {
					return null
				}
				return { product, rawCost }
			})
			.filter((update): update is NonNullable<typeof update> => update !== null)
	}, [draftPrices, selectedProductIds, selectedSupplier])

	const selectedCount = selectedProductIds.length
	const proofOk = proofEssay.trim().length >= PRICE_PROOF_ESSAY_MIN
	const canSave =
		!!selectedSupplier &&
		selectedCount >= 2 &&
		selectedUpdates.length === selectedCount &&
		proofOk

	const mutation = useMutation({
		mutationFn: updateSupplierQuoteBatch,
		onSuccess: async (result) => {
			if (!result.success) {
				setSaveError(result.error)
				return
			}
			await Promise.all([
				qc.invalidateQueries({ queryKey: ['inventory-overview'] }),
				qc.invalidateQueries({ queryKey: ['supplier-batch-price-options'] }),
				qc.invalidateQueries({ queryKey: ['sales-outdated-prices'] }),
			])
			onClose()
		},
		onError: (error) => {
			setSaveError(
				error instanceof Error
					? error.message
					: 'Supplier call could not be saved.',
			)
		},
	})

	function toggleProduct(productId: string) {
		setSaveError(null)
		setSelectedProductIds((current) =>
			current.includes(productId)
				? current.filter((id) => id !== productId)
				: [...current, productId],
		)
	}

	function saveBatch() {
		if (!selectedSupplier || !canSave) return
		setSaveError(null)
		mutation.mutate({
			data: {
				supplierId: selectedSupplier.supplierId,
				updates: selectedUpdates.map((update) => ({
					productId: update.product.productId,
					rawCost: update.rawCost,
				})),
				proof: { kind: 'essay', text: proofEssay.trim() },
			},
		})
	}

	return (
		<SlidePanel
			isOpen={isOpen}
			onClose={onClose}
			maxWidth={680}
			panelKey="supplier-batch-price-panel"
			ariaLabel="Supplier call price update"
			scope="procurement"
			mobileTitle="Supplier call"
		>
			<div className="compendium-theme flex h-full flex-col bg-[var(--folio)] text-[var(--ink)]">
				<header className="shrink-0 border-b border-[var(--rule-soft)] px-4 py-5 sm:px-6">
					<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mid)]">
						Supplier call
					</p>
					<h2 className="mt-2 font-[family-name:var(--font-archivo)] text-[22px] font-semibold leading-6 text-[var(--ink)]">
						Update multiple prices
					</h2>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
					<label className="block">
						<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
							Supplier
						</span>
						<select
							aria-label="Supplier for batch price update"
							value={supplierId}
							onChange={(event) => setSupplierId(event.target.value)}
							className="mt-2 min-h-11 w-full rounded-md border border-[var(--rule-soft)] bg-[var(--folio)] px-3 font-[family-name:var(--font-archivo)] text-[13px] text-[var(--ink)] outline-none focus:border-[var(--color-primary)]/55"
						>
							{isLoading && <option value="">Loading suppliers</option>}
							{!isLoading && suppliers.length === 0 && (
								<option value="">No supplier with two items</option>
							)}
							{suppliers.map((supplier) => (
								<option key={supplier.supplierId} value={supplier.supplierId}>
									{supplier.supplierName} · {supplier.products.length} items
								</option>
							))}
						</select>
					</label>

					{selectedSupplier && (
						<div className="mt-5 overflow-hidden rounded-md border border-[var(--rule-soft)]">
							{selectedSupplier.products.map((product) => {
								const selected = selectedProductIds.includes(product.productId)
								const parsed = sanitizeCost(
									draftPrices[product.productId] ?? '',
								)
								const invalid = selected && (parsed === null || parsed <= 0)
								return (
									<div
										key={product.productId}
										className="grid gap-3 border-b border-[var(--rule-soft)] p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_10rem]"
									>
										<label className="flex min-w-0 items-start gap-3">
											<input
												type="checkbox"
												checked={selected}
												onChange={() => toggleProduct(product.productId)}
												className="mt-1 h-4 w-4"
											/>
											<span className="min-w-0">
												<span className="block break-words font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--ink)]">
													{product.name}
												</span>
												<span className="mt-1 block font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--ink-mid)]">
													{product.sku} · current{' '}
													{formatDecimalEgp(product.rawCost)} EGP/{product.unit}
												</span>
											</span>
										</label>
										<input
											type="text"
											value={draftPrices[product.productId] ?? ''}
											onChange={(event) =>
												setDraftPrices((current) => ({
													...current,
													[product.productId]: normalizeDecimalInput(
														event.target.value,
													),
												}))
											}
											onFocus={() => {
												if (!selected) toggleProduct(product.productId)
											}}
											aria-label={`New supplier cost for ${product.name}`}
											inputMode="decimal"
											className="min-h-10 rounded-md border bg-[var(--folio)] px-3 font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--ink)] outline-none focus:border-[var(--color-primary)]/55"
											style={{
												borderColor: invalid
													? 'var(--compendium-attention)'
													: 'var(--rule-soft)',
											}}
										/>
									</div>
								)
							})}
						</div>
					)}

					<label className="mt-5 block">
						<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
							Supplier call proof
						</span>
						<textarea
							value={proofEssay}
							onChange={(event) => {
								setProofEssay(event.target.value)
								setSaveError(null)
							}}
							rows={6}
							aria-label="Supplier call proof"
							placeholder="Record who confirmed the prices, where the prices came from, and why this call covers every selected item."
							className="mt-2 w-full resize-none rounded-md border border-[var(--rule-soft)] bg-[var(--folio)] px-3 py-2 font-[family-name:var(--font-archivo)] text-[13px] leading-5 text-[var(--ink)] outline-none placeholder:text-[var(--ink-ghost)] focus:border-[var(--color-primary)]/55"
						/>
						<span className="mt-1 block font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--ink-mid)]">
							{proofEssay.trim().length} / {PRICE_PROOF_ESSAY_MIN}
						</span>
					</label>
				</div>

				<footer className="shrink-0 border-t border-[var(--rule-soft)] bg-[var(--folio)] px-4 py-4 sm:px-6">
					{saveError ? (
						<p className="mb-3 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--compendium-attention)]">
							{saveError}
						</p>
					) : (
						<p className="mb-3 font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-mid)]">
							Select at least two changed items from the same supplier. Costs
							must be greater than zero.
						</p>
					)}
					<EmployeeActionButton
						leading={
							canSave ? (
								<CheckCircle2 size={14} strokeWidth={2.4} />
							) : (
								<FileText size={14} strokeWidth={2.4} />
							)
						}
						onClick={saveBatch}
						disabled={!canSave || mutation.isPending}
						aria-disabled={!canSave || mutation.isPending}
						fullWidthOnMobile
					>
						{mutation.isPending ? 'Saving supplier call' : 'Save supplier call'}
					</EmployeeActionButton>
				</footer>
			</div>
		</SlidePanel>
	)
}
