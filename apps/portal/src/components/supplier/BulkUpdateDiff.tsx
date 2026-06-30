/**
 * BulkUpdateDiff -- CSV download, upload, diff preview, and bulk apply.
 * Two phases: upload phase and diff preview phase.
 * Uses PapaParse for CSV parse/unparse.
 * Sends array-based { updates[] } to server (NOT fileUrl).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Papa from 'papaparse'
import { useCallback, useRef, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Dialog, Heading } from 'react-aria-components/Dialog'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { useTranslation } from 'react-i18next'

import {
	bulkUpdatePrices,
	getSupplierProducts,
} from '../../lib/server/supplier-stock'
import { toast } from '../../lib/toast'

interface DiffRow {
	productId: string
	productName: string
	field: 'price' | 'quantity'
	oldValue: number
	newValue: number
}

interface BulkUpdateDiffProps {
	isOpen: boolean
	onClose: () => void
	locale: 'ar' | 'en'
}

export default function BulkUpdateDiff({
	isOpen,
	onClose,
	locale,
}: BulkUpdateDiffProps) {
	const { t } = useTranslation('portal')
	const queryClient = useQueryClient()
	const fileInputRef = useRef<HTMLInputElement>(null)

	const [phase, setPhase] = useState<'upload' | 'diff'>('upload')
	const [diffs, setDiffs] = useState<DiffRow[]>([])
	const [showConfirm, setShowConfirm] = useState(false)

	// Fetch current products for CSV generation and diff comparison
	const { data: productsData } = useQuery({
		queryKey: ['supplier-products', 1],
		queryFn: () => getSupplierProducts({ data: { page: 1, limit: 500 } }),
		staleTime: 60_000,
	})

	const applyMutation = useMutation({
		mutationFn: () => {
			const updates = diffs.map((d) => ({
				productId: d.productId,
				...(d.field === 'price' ? { price: d.newValue } : {}),
				...(d.field === 'quantity' ? { quantity: d.newValue } : {}),
			}))
			return bulkUpdatePrices({ data: { updates } })
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ['supplier-products'] })
			toast.success(
				locale === 'ar'
					? `تم تحديث ${result.updatedCount} عنصر`
					: `Updated ${result.updatedCount} items`,
			)
			onClose()
		},
	})

	const handleDownload = useCallback(() => {
		if (!productsData?.products) return
		const csvData = productsData.products.map((p) => ({
			id: p.id,
			name: p.name,
			sku: p.sku,
			price: p.currentPrice,
			quantity: p.stockQuantity,
		}))
		const csv = Papa.unparse(csvData)
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = 'current-prices.csv'
		link.click()
		URL.revokeObjectURL(url)
	}, [productsData])

	const handleFileUpload = useCallback(
		(file: File) => {
			Papa.parse(file, {
				header: true,
				dynamicTyping: true,
				complete: (result) => {
					if (!productsData?.products) return

					// Index current products by ID for O(1) lookup
					const productMap = new Map(
						productsData.products.map((p) => [p.id, p]),
					)

					const diffResults: DiffRow[] = []

					for (const row of result.data as Array<{
						id: string
						name: string
						price: number
						quantity: number
					}>) {
						if (!row.id) continue
						const current = productMap.get(row.id)
						if (!current) continue

						if (row.price != null && row.price !== current.currentPrice) {
							diffResults.push({
								productId: row.id,
								productName: current.name,
								field: 'price',
								oldValue: current.currentPrice,
								newValue: row.price,
							})
						}

						if (
							row.quantity != null &&
							row.quantity !== current.stockQuantity
						) {
							diffResults.push({
								productId: row.id,
								productName: current.name,
								field: 'quantity',
								oldValue: current.stockQuantity,
								newValue: row.quantity,
							})
						}
					}

					setDiffs(diffResults)
					setPhase('diff')
				},
			})
		},
		[productsData],
	)

	const priceCount = diffs.filter((d) => d.field === 'price').length
	const qtyCount = diffs.filter((d) => d.field === 'quantity').length

	const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG')

	if (!isOpen) return null

	return (
		<ModalOverlay
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			isKeyboardDismissDisabled
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50"
		>
			<Modal className="w-[600px] max-w-[95vw] max-h-[85vh] flex flex-col">
				<Dialog className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[var(--p-card)] rounded-2xl border border-[var(--color-border)] flex flex-col max-h-[85vh] outline-none">
					{() => (
						<>
							{/* Header */}
							<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
								<Heading
									slot="title"
									className="text-lg font-semibold text-[var(--color-text)]"
								>
									{locale === 'ar' ? 'تحديث مجمع للأسعار' : 'Bulk Price Update'}
								</Heading>
								<Button
									onPress={onClose}
									className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer transition-colors"
								>
									{locale === 'ar' ? 'إغلاق' : 'Close'}
								</Button>
							</div>

							{/* Content */}
							<div className="flex-1 overflow-auto p-6">
								{phase === 'upload' ? (
									<div className="flex flex-col gap-4">
										{/* Download current prices */}
										<Button
											onPress={handleDownload}
											className="text-sm text-[var(--color-primary)] hover:underline cursor-pointer text-start"
										>
											{t('supplier.downloadPrices')}
										</Button>

										{/* Upload area */}
										<button
											type="button"
											className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 flex flex-col items-center gap-3 hover:border-[var(--color-primary)] transition-colors cursor-pointer bg-transparent w-full"
											onClick={() => fileInputRef.current?.click()}
										>
											<p className="text-sm text-[var(--color-text-muted)]">
												{t('supplier.uploadModifiedCSV')}
											</p>
											<input
												ref={fileInputRef}
												type="file"
												accept=".csv"
												className="hidden"
												onChange={(e) => {
													const file = e.target.files?.[0]
													if (file) handleFileUpload(file)
												}}
											/>
										</button>
									</div>
								) : (
									<div className="flex flex-col gap-3">
										{diffs.length === 0 ? (
											<p className="text-sm text-[var(--color-text-muted)] text-center py-8">
												{t('supplier.unchanged')}
											</p>
										) : (
											diffs.map((diff) => (
												<div
													key={`${diff.productId}-${diff.field}`}
													className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[var(--color-surface)]"
												>
													<div className="flex-1">
														<span className="text-sm text-[var(--color-text)]">
															{diff.productName}
														</span>
														<span className="text-[13px] text-[var(--color-text-muted)] ms-2">
															(
															{diff.field === 'price'
																? t('supplier.price')
																: t('supplier.stockQty')}
															)
														</span>
													</div>
													<span className="font-mono text-sm text-red-600 line-through">
														{formatter.format(diff.oldValue)}
													</span>
													<span className="text-[var(--color-text-muted)]">
														&rarr;
													</span>
													<span className="font-mono text-sm text-green-600">
														{formatter.format(diff.newValue)}
													</span>
												</div>
											))
										)}
									</div>
								)}
							</div>

							{/* Footer */}
							<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] shrink-0">
								{phase === 'diff' && diffs.length > 0 && (
									<>
										<Button
											onPress={() => {
												setPhase('upload')
												setDiffs([])
											}}
											className="h-[44px] px-6 text-sm text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] transition-colors"
										>
											{locale === 'ar' ? 'رجوع' : 'Back'}
										</Button>
										<Button
											onPress={() => setShowConfirm(true)}
											className="flex items-center justify-center h-[44px] rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold px-6 cursor-pointer hover:opacity-90 transition-opacity"
										>
											{t('supplier.applyChanges')}
										</Button>
									</>
								)}
							</div>

							{/* Confirmation modal */}
							{showConfirm && (
								<div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30">
									<div className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[var(--p-card)] rounded-2xl border border-[var(--color-border)] p-6 max-w-sm">
										<p className="text-sm text-[var(--color-text)] mb-4">
											{t('supplier.bulkConfirm', { priceCount, qtyCount })}
										</p>
										<div className="flex items-center justify-end gap-3">
											<Button
												onPress={() => setShowConfirm(false)}
												className="h-[44px] px-6 text-sm text-[var(--color-text-muted)] cursor-pointer"
											>
												{locale === 'ar' ? 'إلغاء' : 'Cancel'}
											</Button>
											<Button
												onPress={() => {
													setShowConfirm(false)
													applyMutation.mutate()
												}}
												isDisabled={applyMutation.isPending}
												className="flex items-center justify-center h-[44px] rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold px-6 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
											>
												{t('supplier.applyChanges')}
											</Button>
										</div>
									</div>
								</div>
							)}
						</>
					)}
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}
