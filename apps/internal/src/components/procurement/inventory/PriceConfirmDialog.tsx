import { FileText, Upload } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { PRICE_PROOF_ESSAY_MIN } from '../../../lib/inputs'
import type { PriceProofInput } from '../../../lib/server/inventory'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../../shared/DispatchDialog'

interface PriceConfirmDialogProps {
	isOpen: boolean
	productName: string
	supplierName?: string
	unit: string
	oldCost: number
	newCost: number
	onConfirm: (proof: PriceProofInput) => void
	onCancel: () => void
}

type ProofMethod = 'pdf' | 'essay'

export function PriceConfirmDialog({
	isOpen,
	productName,
	supplierName,
	unit,
	oldCost,
	newCost,
	onConfirm,
	onCancel,
}: PriceConfirmDialogProps) {
	const [proofMethod, setProofMethod] = useState<ProofMethod>('pdf')
	const [proofPdfName, setProofPdfName] = useState('')
	const [proofEssay, setProofEssay] = useState('')
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		if (!isOpen) return
		setProofMethod('pdf')
		setProofPdfName('')
		setProofEssay('')
	}, [isOpen])

	const [armed, setArmed] = useState(false)
	useEffect(() => {
		if (!isOpen) {
			setArmed(false)
			return
		}
		const timer = setTimeout(() => setArmed(true), 250)
		return () => clearTimeout(timer)
	}, [isOpen])

	const proofEssayLength = proofEssay.trim().length
	const pdfOk = proofPdfName.trim().toLowerCase().endsWith('.pdf')
	const essayOk = proofEssayLength >= PRICE_PROOF_ESSAY_MIN
	const proofOk = proofMethod === 'pdf' ? pdfOk : essayOk

	const handleConfirm = () => {
		if (!proofOk) return
		const proof: PriceProofInput =
			proofMethod === 'pdf'
				? { kind: 'pdf', fileName: proofPdfName.trim() }
				: { kind: 'essay', text: proofEssay.trim() }
		onConfirm(proof)
	}

	const delta = newCost - oldCost
	const deltaPct = oldCost > 0 ? (delta / oldCost) * 100 : 0
	const isIncrease = delta > 0

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={onCancel}
			size="sm"
			eyebrow="Compendium · Price proof"
			title={productName}
			caption={supplierName ? `via ${supplierName}` : undefined}
		>
			<div className="bg-[var(--color-surface)] text-[var(--color-text)]">
				<DispatchBody>
					<div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 rounded-md border border-black/[0.08] bg-black/[0.015] p-3 dark:border-white/[0.1] dark:bg-white/[0.025]">
						<PriceColumn
							label="Current"
							value={
								oldCost > 0
									? oldCost.toLocaleString('en-EG', {
											minimumFractionDigits: 2,
										})
									: '—'
							}
							muted
						/>
						<span
							aria-hidden="true"
							className="pb-1 font-[family-name:var(--font-plex-mono)] text-[14px] text-[var(--color-text-muted)]"
						>
							→
						</span>
						<PriceColumn
							label="New"
							value={newCost.toLocaleString('en-EG', {
								minimumFractionDigits: 2,
							})}
						/>
					</div>

					<div className="mt-3 rounded-md border border-black/[0.08] px-3 py-2 dark:border-white/[0.1]">
						<PriceColumn
							label="Change"
							value={
								oldCost === 0
									? 'new'
									: `${isIncrease ? '+' : ''}${deltaPct.toFixed(1)}%`
							}
							tone={oldCost === 0 ? 'muted' : isIncrease ? 'aging' : 'fresh'}
						/>
					</div>

					<p className="mt-3 font-[family-name:var(--font-archivo)] text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
						This price can only be saved after proof is attached. Use a supplier
						PDF or write a full note for finance and sales. EGP / {unit}.
					</p>

					<div className="mt-4 grid grid-cols-2 overflow-hidden rounded-md border border-black/[0.08] dark:border-white/[0.1]">
						<ProofModeButton
							active={proofMethod === 'pdf'}
							onClick={() => setProofMethod('pdf')}
							icon={<Upload size={14} strokeWidth={2.1} aria-hidden="true" />}
						>
							PDF
						</ProofModeButton>
						<ProofModeButton
							active={proofMethod === 'essay'}
							onClick={() => setProofMethod('essay')}
							icon={<FileText size={14} strokeWidth={2.1} aria-hidden="true" />}
							borderless
						>
							Essay
						</ProofModeButton>
					</div>

					{proofMethod === 'pdf' ? (
						<div className="mt-3 rounded-md border border-black/[0.08] p-3 dark:border-white/[0.1]">
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="flex min-h-20 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-black/[0.18] px-3 text-center font-[family-name:var(--font-archivo)] text-[12px] text-[var(--color-text-muted)] outline-none transition-colors hover:border-[var(--color-primary)]/45 hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 dark:border-white/[0.16]"
							>
								<Upload size={18} strokeWidth={2.1} aria-hidden="true" />
								<span className="font-semibold">
									{proofPdfName || 'Upload supplier PDF proof'}
								</span>
								<span className="text-[11px] text-[var(--color-text-subtle)]">
									PDF only. The selected filename is recorded with this update.
								</span>
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept="application/pdf,.pdf"
								className="hidden"
								onChange={(event) => {
									const file = event.currentTarget.files?.[0]
									setProofPdfName(file?.name ?? '')
									event.currentTarget.value = ''
								}}
							/>
						</div>
					) : (
						<div className="mt-3 rounded-md border border-black/[0.08] p-3 dark:border-white/[0.1]">
							<div className="mb-2 flex items-baseline justify-between gap-3">
								<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
									Written proof
								</span>
								<span
									className="font-[family-name:var(--font-geist-mono)] tabular-nums"
									style={{
										fontSize: '10.5px',
										color: essayOk
											? 'var(--color-primary)'
											: 'var(--color-text-subtle)',
									}}
								>
									{proofEssayLength} / {PRICE_PROOF_ESSAY_MIN}
								</span>
							</div>
							<textarea
								value={proofEssay}
								onChange={(event) => setProofEssay(event.target.value)}
								placeholder="Record the supplier contact, source of the price, commercial reason for the change, and anything finance should know before this reaches sales quotes."
								rows={5}
								className="w-full resize-none rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 py-2 font-[family-name:var(--font-archivo)] text-[13px] leading-5 text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 dark:border-white/[0.12]"
							/>
						</div>
					)}
				</DispatchBody>

				<DispatchFooter>
					<DispatchAction tone="ghost" onPress={onCancel}>
						Cancel
					</DispatchAction>
					<DispatchAction
						onPress={handleConfirm}
						isDisabled={!proofOk || !armed}
					>
						Submit proof
					</DispatchAction>
				</DispatchFooter>
			</div>
		</DispatchDialog>
	)
}

function ProofModeButton({
	active,
	icon,
	children,
	borderless,
	onClick,
}: {
	active: boolean
	icon: ReactNode
	children: ReactNode
	borderless?: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={`inline-flex min-h-11 items-center justify-center gap-2 px-3 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 ${
				borderless ? '' : 'border-e border-black/[0.08] dark:border-white/[0.1]'
			} ${
				active
					? 'bg-[var(--color-primary)]/[0.08] text-[var(--color-text)]'
					: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
			}`}
		>
			{icon}
			{children}
		</button>
	)
}

function PriceColumn({
	label,
	value,
	muted,
	tone,
}: {
	label: string
	value: string
	muted?: boolean
	tone?: 'muted' | 'aging' | 'fresh'
}) {
	const color =
		tone === 'aging'
			? '#D97706'
			: tone === 'fresh'
				? '#047857'
				: muted || tone === 'muted'
					? 'var(--color-text-muted)'
					: 'var(--color-text)'
	return (
		<div className="flex flex-col items-start">
			<span className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
				{label}
			</span>
			<span
				className="mt-1 font-[family-name:var(--font-geist-mono)] text-[22px] font-semibold leading-none tabular-nums"
				style={{ color }}
			>
				{value}
			</span>
		</div>
	)
}
