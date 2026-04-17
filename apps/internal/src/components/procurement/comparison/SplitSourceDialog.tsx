import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Input, Label, NumberField } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import type { RankedSupplier, SplitSource } from '../../../types/procurement'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'

interface SplitSourceDialogProps {
	productId: string
	requestedQty: number
	uom: string
	suppliers: RankedSupplier[]
	onConfirm: (split: SplitSource) => void
	trigger: React.ReactNode
}

export function SplitSourceDialog({
	productId,
	requestedQty,
	uom,
	suppliers,
	onConfirm,
	trigger,
}: SplitSourceDialogProps) {
	const { i18n } = useTranslation()
	const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

	const [isOpen, setIsOpen] = useState(false)
	const [allocations, setAllocations] = useState<Record<string, number>>(() => {
		const init: Record<string, number> = {}
		for (const s of suppliers) init[s.supplierId] = 0
		return init
	})

	const totalAllocated = useMemo(
		() => Object.values(allocations).reduce((sum, q) => sum + q, 0),
		[allocations],
	)

	const isValid = totalAllocated === requestedQty
	const remaining = requestedQty - totalAllocated
	const fillPercent = Math.min((totalAllocated / requestedQty) * 100, 100)

	const fmtPrice = (n: number) =>
		new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: 'EGP',
			maximumFractionDigits: 0,
		}).format(n)

	const fmtQty = (n: number) => new Intl.NumberFormat(locale).format(n)

	function handleConfirm() {
		if (!isValid) return
		const splitAllocations = suppliers
			.filter((s) => (allocations[s.supplierId] ?? 0) > 0)
			.map((s) => ({
				supplierId: s.supplierId,
				quantity: allocations[s.supplierId],
				unitPrice: s.unitPrice,
			}))

		onConfirm({ productId, allocations: splitAllocations })
		setIsOpen(false)
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="contents"
			>
				{trigger}
			</button>
			<DispatchDialog
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				size="md"
				eyebrow="Procurement · Split source"
				title="Split sourcing"
				caption={`Allocate ${fmtQty(requestedQty)} ${uom} across suppliers.`}
			>
				<DispatchBody>
					{/* Fill bar */}
					<div className="h-[3px] w-full overflow-hidden bg-black/[0.06] dark:bg-white/[0.08]">
						<motion.div
							className={`h-full ${
								isValid
									? 'bg-[var(--color-primary)]'
									: remaining < 0
										? 'bg-[#B3261E]'
										: 'bg-[var(--color-text)]/20'
							}`}
							animate={{ width: `${fillPercent}%` }}
							transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						/>
					</div>

					{/* Allocation rows */}
					<ul className="mt-4 divide-y divide-black/[0.08] dark:divide-white/[0.1]">
						{suppliers.map((s) => {
							const qty = allocations[s.supplierId] ?? 0
							const sliderPercent =
								requestedQty > 0 ? (qty / requestedQty) * 100 : 0
							return (
								<li key={s.supplierId} className="flex items-center gap-4 py-3">
									<div className="min-w-0 flex-1">
										<div className="font-[family-name:var(--font-archivo)] text-[14px] font-medium text-[var(--color-text)]">
											{s.supplierName}
										</div>
										<div className="mt-1 font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
											{fmtPrice(s.unitPrice)}/{uom}
											<span className="mx-2">·</span>
											<span className="tabular-nums">
												{fmtQty(s.availableQty)} avail
											</span>
										</div>
									</div>

									<div className="w-20 h-[3px] bg-black/[0.06] dark:bg-white/[0.08]">
										<div
											className="h-full bg-[var(--color-primary)]/50 transition-all"
											style={{ width: `${Math.min(sliderPercent, 100)}%` }}
										/>
									</div>

									<NumberField
										value={qty}
										onChange={(val) =>
											setAllocations((prev) => ({
												...prev,
												[s.supplierId]: val,
											}))
										}
										minValue={0}
										maxValue={s.availableQty}
										className="w-24"
									>
										<Label className="sr-only">
											Quantity for {s.supplierName}
										</Label>
										<Input className="w-full bg-transparent px-2 py-1.5 text-end font-[family-name:var(--font-plex-mono)] text-[13px] tabular-nums text-[var(--color-text)] outline-none border-b border-black/[0.14] dark:border-white/[0.16] focus:border-[var(--color-primary)]" />
									</NumberField>
								</li>
							)
						})}
					</ul>

					{/* Status line */}
					<div className="mt-4 flex items-center justify-between font-[family-name:var(--font-plex-mono)] text-[11px] uppercase tracking-[0.16em]">
						<span className="tabular-nums text-[var(--color-text-muted)]">
							{fmtQty(totalAllocated)} / {fmtQty(requestedQty)} {uom}
						</span>
						{remaining !== 0 && (
							<span
								className={remaining > 0 ? 'text-[#D97706]' : 'text-[#B3261E]'}
							>
								{remaining > 0
									? `${fmtQty(remaining)} remaining`
									: `${fmtQty(Math.abs(remaining))} over`}
							</span>
						)}
						{isValid && (
							<span className="text-[var(--color-primary)]">Balanced</span>
						)}
					</div>
				</DispatchBody>

				<DispatchFooter>
					<DispatchAction tone="ghost" onPress={() => setIsOpen(false)}>
						Cancel
					</DispatchAction>
					<DispatchAction onPress={handleConfirm} isDisabled={!isValid}>
						Confirm split
					</DispatchAction>
				</DispatchFooter>
			</DispatchDialog>
		</>
	)
}
