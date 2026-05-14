import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
	normalizeDecimalInput,
	normalizeIntegerInput,
} from '../../../lib/inputs'
import { createPurchaseOrder } from '../../../lib/server/procurement-po'
import { useProcurementStore } from '../../../stores/procurement'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchField,
	DispatchFooter,
	DispatchInputClass,
	DispatchSection,
} from '../../shared/DispatchDialog'

interface CreatePODialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

interface LineItem {
	/** Client-side stable id — lets us use it as a React key across edits/removals. */
	id: string
	productName: string
	quantity: number
	unitCost: number
}

let lineIdCounter = 0
function newLineId(): string {
	lineIdCounter += 1
	return `line-${lineIdCounter}`
}

const MOCK_SUPPLIERS = [
	{ id: 'sup-001', name: 'Cairo Steel Co.' },
	{ id: 'sup-002', name: 'Delta Cement Group' },
	{ id: 'sup-003', name: 'Nile Building Supplies' },
	{ id: 'sup-004', name: 'Alexandria Rebar Factory' },
	{ id: 'sup-007', name: 'Port Said Iron Works' },
]

function defaultDeliveryDate(): string {
	const d = new Date()
	d.setDate(d.getDate() + 14)
	return d.toISOString().slice(0, 10)
}

function formatEGP(value: number): string {
	return new Intl.NumberFormat('en-EG', {
		style: 'currency',
		currency: 'EGP',
		maximumFractionDigits: 2,
	}).format(value)
}

function makeEmptyLine(): LineItem {
	return { id: newLineId(), productName: '', quantity: 0, unitCost: 0 }
}

export function CreatePODialog({ isOpen, onOpenChange }: CreatePODialogProps) {
	const queryClient = useQueryClient()

	const [supplierSearch, setSupplierSearch] = useState('')
	const [selectedSupplier, setSelectedSupplier] = useState<{
		id: string
		name: string
	} | null>(null)
	const [lines, setLines] = useState<LineItem[]>(() => [makeEmptyLine()])
	const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate)

	const filteredSuppliers = useMemo(() => {
		if (!supplierSearch) return MOCK_SUPPLIERS
		const q = supplierSearch.toLowerCase()
		return MOCK_SUPPLIERS.filter((s) => s.name.toLowerCase().includes(q))
	}, [supplierSearch])

	const subtotal = useMemo(
		() => lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0),
		[lines],
	)
	const vatAmount = Math.round(subtotal * 14) / 100
	const total = subtotal + vatAmount

	const updateLine = (
		i: number,
		field: keyof LineItem,
		value: string | number,
	) => {
		setLines((prev) => {
			const next = [...prev]
			next[i] = { ...next[i], [field]: value }
			return next
		})
	}

	const removeLine = (i: number) => {
		setLines((prev) =>
			prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i),
		)
	}

	const resetForm = () => {
		setSupplierSearch('')
		setSelectedSupplier(null)
		setLines([makeEmptyLine()])
		setDeliveryDate(defaultDeliveryDate())
	}

	const mutation = useMutation({
		mutationFn: () => {
			if (!selectedSupplier) throw new Error('Supplier not selected')
			return createPurchaseOrder({
				data: {
					supplierId: selectedSupplier.id,
					lines: lines
						.filter((l) => l.productName && l.quantity > 0 && l.unitCost > 0)
						.map((l) => ({
							productId: l.productName.toLowerCase().replace(/\s+/g, '-'),
							quantity: l.quantity,
							unitCost: l.unitCost,
						})),
					deliveryDate,
				},
			})
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ['po-list'] })
			useProcurementStore.getState().setSelectedPOId(result.poId)
			resetForm()
			onOpenChange(false)
		},
	})

	const canSubmit =
		selectedSupplier &&
		lines.some((l) => l.productName && l.quantity > 0 && l.unitCost > 0) &&
		!mutation.isPending

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={() => {
				resetForm()
				onOpenChange(false)
			}}
			size="md"
			eyebrow="Procurement · Form No. 003"
			title="New purchase order"
			caption="Assemble the order, confirm the supplier, schedule delivery."
			dismissDisabled={mutation.isPending}
		>
			<DispatchBody>
				<DispatchSection label="Supplier" />
				{selectedSupplier ? (
					<div className="flex items-center justify-between border border-black/[0.14] dark:border-white/[0.16] px-3 py-2.5">
						<span className="font-[family-name:var(--font-archivo)] text-[14px] font-medium text-[var(--color-text)]">
							{selectedSupplier.name}
						</span>
						<button
							type="button"
							onClick={() => setSelectedSupplier(null)}
							className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
						>
							change →
						</button>
					</div>
				) : (
					<>
						<input
							value={supplierSearch}
							onChange={(e) => setSupplierSearch(e.target.value)}
							placeholder="Search suppliers…"
							className={DispatchInputClass()}
						/>
						<ul className="mt-2 max-h-40 overflow-auto">
							{filteredSuppliers.map((s) => (
								<li key={s.id}>
									<button
										type="button"
										onClick={() => {
											setSelectedSupplier(s)
											setSupplierSearch('')
										}}
										className="w-full text-start px-2 py-2 font-[family-name:var(--font-archivo)] text-[13.5px] text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
									>
										{s.name}
									</button>
								</li>
							))}
							{filteredSuppliers.length === 0 && (
								<li className="px-2 py-2 font-[family-name:var(--font-archivo)] italic text-[12px] text-[var(--color-text-subtle)]">
									No suppliers found.
								</li>
							)}
						</ul>
					</>
				)}

				<DispatchSection label="Line items" />
				<div className="grid grid-cols-[1fr_80px_100px_90px_28px] gap-3 font-[family-name:var(--font-plex-mono)] text-[9.5px] uppercase tracking-[0.18em] text-[var(--color-text-subtle)] mb-2">
					<span>Product</span>
					<span>Qty</span>
					<span>Unit cost</span>
					<span className="text-end">Total</span>
					<span />
				</div>
				{lines.map((line, i) => {
					const lineTotal = line.quantity * line.unitCost
					return (
						<div
							key={line.id}
							className="grid grid-cols-[1fr_80px_100px_90px_28px] gap-3 items-center mb-2"
						>
							<input
								value={line.productName}
								onChange={(e) => updateLine(i, 'productName', e.target.value)}
								placeholder="Product"
								className={DispatchInputClass()}
							/>
							<input
								type="text"
								inputMode="numeric"
								pattern="[0-9]*"
								min={0}
								value={line.quantity || ''}
								onChange={(e) =>
									updateLine(
										i,
										'quantity',
										Number(normalizeIntegerInput(e.target.value)) || 0,
									)
								}
								placeholder="0"
								className={`${DispatchInputClass()} font-[family-name:var(--font-plex-mono)] tabular-nums`}
							/>
							<input
								type="text"
								inputMode="decimal"
								min={0}
								value={line.unitCost || ''}
								onChange={(e) =>
									updateLine(
										i,
										'unitCost',
										Number(normalizeDecimalInput(e.target.value)) || 0,
									)
								}
								placeholder="0.00"
								className={`${DispatchInputClass()} font-[family-name:var(--font-plex-mono)] tabular-nums`}
							/>
							<span className="font-[family-name:var(--font-plex-mono)] text-[12.5px] tabular-nums text-end text-[var(--color-text-muted)]">
								{lineTotal > 0 ? formatEGP(lineTotal) : '—'}
							</span>
							<button
								type="button"
								onClick={() => removeLine(i)}
								className={`font-[family-name:var(--font-plex-mono)] text-[16px] text-[var(--color-text-subtle)] hover:text-[#B3261E] transition-colors ${
									lines.length <= 1 ? 'invisible' : ''
								}`}
								aria-label={`Remove line ${i + 1}`}
							>
								×
							</button>
						</div>
					)
				})}
				<button
					type="button"
					onClick={() => setLines((prev) => [...prev, makeEmptyLine()])}
					className="mt-2 font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-primary)] hover:text-[var(--color-text)]"
				>
					+ add item
				</button>

				<DispatchSection label="Totals" />
				<div className="space-y-1.5">
					<TotalsRow label="Subtotal" value={formatEGP(subtotal)} />
					<TotalsRow label="VAT (14%)" value={formatEGP(vatAmount)} />
					<div className="flex justify-between border-t border-black/80 dark:border-white/85 pt-2">
						<span className="font-[family-name:var(--font-archivo-black)] text-[13px] uppercase text-[var(--color-text)]">
							Total
						</span>
						<span className="font-[family-name:var(--font-plex-mono)] text-[16px] font-semibold tabular-nums text-[var(--color-text)]">
							{formatEGP(total)}
						</span>
					</div>
				</div>

				<DispatchSection label="Delivery" />
				<DispatchField label="Expected delivery date">
					<input
						type="date"
						value={deliveryDate}
						onChange={(e) => setDeliveryDate(e.target.value)}
						className={`${DispatchInputClass()} font-[family-name:var(--font-plex-mono)] tabular-nums`}
					/>
				</DispatchField>

				{mutation.isError && (
					<p className="mt-4 font-[family-name:var(--font-archivo)] italic text-[12px] text-[#B3261E]">
						Failed to create PO. Please try again.
					</p>
				)}
			</DispatchBody>

			<DispatchFooter>
				<DispatchAction
					tone="ghost"
					onPress={() => {
						resetForm()
						onOpenChange(false)
					}}
					isDisabled={mutation.isPending}
				>
					Cancel
				</DispatchAction>
				<DispatchAction
					onPress={() => mutation.mutate()}
					isDisabled={!canSubmit}
				>
					{mutation.isPending ? 'Creating…' : 'Create draft'}
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}

function TotalsRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between font-[family-name:var(--font-archivo)] text-[12.5px]">
			<span className="text-[var(--color-text-muted)]">{label}</span>
			<span className="font-[family-name:var(--font-plex-mono)] tabular-nums text-[var(--color-text-muted)]">
				{value}
			</span>
		</div>
	)
}
