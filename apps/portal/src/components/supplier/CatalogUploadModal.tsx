/**
 * CatalogUploadModal -- 4-step catalog upload flow.
 * Step 1: Drag-and-drop file upload (PDF/Excel/CSV)
 * Step 2: AI processing with skeleton loader
 * Step 3: Side-by-side review with CatalogReview
 * Step 4: Success confirmation
 *
 * Uses React Aria DropZone + FileTrigger (matching UploadMethod pattern).
 */

import { useNavigate } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { DropZone } from 'react-aria-components/DropZone'
import { FileTrigger } from 'react-aria-components/FileTrigger'
import { useTranslation } from 'react-i18next'
import { uploadCatalog } from '../../lib/server/supplier-catalog'
import type { CatalogParsedItem } from '../../types/supplier'
import { CatalogReview } from './CatalogReview'

// ============================================================================
// Types
// ============================================================================

interface CatalogUploadModalProps {
	locale: 'ar' | 'en'
}

// ============================================================================
// Component
// ============================================================================

export function CatalogUploadModal({ locale }: CatalogUploadModalProps) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()
	const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
	const [isDragOver, setIsDragOver] = useState(false)
	const [parsedItems, setParsedItems] = useState<CatalogParsedItem[]>([])
	const [uploadError, setUploadError] = useState<string | null>(null)

	const handleFileUpload = useCallback(async (file: File) => {
		setUploadError(null)
		setStep(2)
		try {
			await uploadCatalog({
				data: { fileUrl: URL.createObjectURL(file), fileType: file.type },
			})
			setParsedItems([])
			setStep(3)
		} catch (error) {
			setUploadError(
				error instanceof Error
					? error.message
					: 'Catalog upload is not configured',
			)
			setStep(1)
		}
	}, [])

	const handleDrop = useCallback(
		async (e: {
			items: Array<{ kind: string; getFile?: () => Promise<File> }>
		}) => {
			setIsDragOver(false)
			const fileItem = e.items.find((i) => i.kind === 'file')
			if (fileItem?.getFile) {
				const file = await fileItem.getFile()
				handleFileUpload(file)
			}
		},
		[handleFileUpload],
	)

	const handleFileSelect = useCallback(
		(fileList: FileList | null) => {
			if (fileList && fileList.length > 0) {
				handleFileUpload(fileList[0])
			}
		},
		[handleFileUpload],
	)

	const handleSubmitReview = useCallback(() => {
		setStep(4)
	}, [])

	// ---- Step 1: Upload ----
	if (step === 1) {
		return (
			<div className="p-6">
				<div className="backdrop-blur-2xl bg-[rgba(255,255,255,0.90)] dark:bg-[var(--p-card)] rounded-2xl border border-[var(--color-border)]/50 p-8">
					<DropZone
						onDropEnter={() => setIsDragOver(true)}
						onDropExit={() => setIsDragOver(false)}
						onDrop={handleDrop}
						className={`flex h-[240px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-150 ${
							isDragOver
								? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-info-bg)_50%,transparent)]'
								: 'border-[var(--color-border)]'
						}`}
					>
						<Upload size={48} className="mb-4 text-[var(--color-text-muted)]" />
						<p className="text-sm font-medium text-[var(--color-text)]">
							{t('supplier.dragDrop')}
						</p>
						<FileTrigger
							acceptedFileTypes={['.pdf', '.xlsx', '.xls', '.csv']}
							onSelect={handleFileSelect}
						>
							<Button className="mt-3 text-sm font-medium text-[var(--color-primary)] hover:underline cursor-pointer outline-none">
								{t('supplier.browseFiles')}
							</Button>
						</FileTrigger>
						<p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
							{t('supplier.maxFileSize')}
						</p>
						{uploadError ? (
							<p className="mt-3 max-w-sm text-center text-[13px] text-[var(--color-danger)]">
								{uploadError}
							</p>
						) : null}
					</DropZone>
				</div>
			</div>
		)
	}

	// ---- Step 2: Processing ----
	if (step === 2) {
		return (
			<div className="flex flex-col items-center justify-center p-16 gap-6">
				{/* Skeleton loader */}
				<div className="space-y-3 w-full max-w-md">
					<div className="h-4 rounded-full bg-[var(--color-surface)] animate-pulse" />
					<div className="h-4 rounded-full bg-[var(--color-surface)] animate-pulse w-3/4" />
					<div className="h-4 rounded-full bg-[var(--color-surface)] animate-pulse w-1/2" />
					<div className="h-4 rounded-full bg-[var(--color-surface)] animate-pulse w-5/6" />
				</div>
				<p className="text-sm text-[var(--color-text-muted)]">
					{t('supplier.aiParsing')}
				</p>
			</div>
		)
	}

	// ---- Step 3: Review ----
	if (step === 3) {
		return (
			<CatalogReview
				items={parsedItems}
				onSubmit={handleSubmitReview}
				locale={locale}
			/>
		)
	}

	// ---- Step 4: Submitted ----
	return (
		<div className="flex flex-col items-center justify-center p-16 gap-6">
			<div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
				<svg
					aria-hidden="true"
					className="w-8 h-8 text-green-600 dark:text-green-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M5 13l4 4L19 7"
					/>
				</svg>
			</div>
			<p className="text-lg font-semibold text-[var(--color-text)]">
				{t('supplier.submitForReview')}
			</p>
			<button
				type="button"
				onClick={() => navigate({ to: '/supplier/stock' })}
				className="text-sm text-[var(--color-primary)] hover:underline cursor-pointer"
			>
				{t('supplier.stockTitle')}
			</button>
		</div>
	)
}
