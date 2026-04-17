/**
 * Upload input method for quote builder Step 1.
 * React Aria DropZone + FileTrigger for CSV/Excel file upload.
 * Parses client-side via file-parser, shows validation errors,
 * populates product list store.
 */

import { AlertCircle, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Button, DropZone, FileTrigger, Text } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import {
	detectFileType,
	type ParseError,
	type ParseResult,
	parseCSV,
	parseExcel,
} from '../../../lib/file-parser'
import {
	type QuoteItem,
	useQuoteBuilderStore,
} from '../../../stores/quote-builder'
import { UploadValidation } from './UploadValidation'

// ============================================================================
// Types
// ============================================================================

type UploadState = 'idle' | 'processing' | 'error' | 'validation' | 'success'

// ============================================================================
// Template generation
// ============================================================================

function downloadTemplate() {
	const headers = 'Product Name,SKU,Quantity,UOM,Notes'
	const arabicHeaders =
		'# \u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062a\u062c,\u0627\u0644\u0631\u0645\u0632,\u0627\u0644\u0643\u0645\u064a\u0629,\u0627\u0644\u0648\u062d\u062f\u0629,\u0645\u0644\u0627\u062d\u0638\u0627\u062a'
	const example =
		'Portland Cement OPC 42.5N,CEM-OPC-425,100,ton,Deliver to site A'
	const csv = `${headers}\n${arabicHeaders}\n${example}\n`

	const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'hyperquote-material-template.csv'
	a.click()
	URL.revokeObjectURL(url)
}

// ============================================================================
// Component
// ============================================================================

export function UploadMethod() {
	const { t } = useTranslation('portal')
	const setItems = useQuoteBuilderStore((s) => s.setItems)

	const [state, setState] = useState<UploadState>('idle')
	const [fileName, setFileName] = useState<string>('')
	const [progress, setProgress] = useState(0)
	const [parseResult, setParseResult] = useState<ParseResult | null>(null)
	const [errorMessage, setErrorMessage] = useState<string>('')
	const [isDragOver, setIsDragOver] = useState(false)
	const progressRef = useRef<HTMLDivElement>(null)

	const processFile = useCallback(
		async (file: File) => {
			setFileName(file.name)
			setState('processing')
			setProgress(0)
			setErrorMessage('')

			// Simulate progress for UX (parsing is usually fast)
			const progressInterval = setInterval(() => {
				setProgress((p) => Math.min(p + 15, 85))
			}, 100)

			try {
				const fileType = detectFileType(file)

				if (fileType === 'unknown') {
					clearInterval(progressInterval)
					setState('error')
					setErrorMessage(
						t(
							'quoteBuilder.uploadError',
							'Could not parse this file. Try CSV or Excel format.',
						),
					)
					return
				}

				const result =
					fileType === 'csv' ? await parseCSV(file) : await parseExcel(file)

				clearInterval(progressInterval)
				setProgress(100)
				setParseResult(result)

				if (result.errors.length > 0) {
					setState('validation')
				} else {
					// Success: populate store
					const items: QuoteItem[] = result.items.map((row, idx) => ({
						id: crypto.randomUUID(),
						productId: undefined,
						customerDescription: row.productName || row.sku || '',
						quantity: row.quantity ?? 0,
						unitOfMeasure: row.uom || 'piece',
						notes: row.notes,
						matchConfidence: undefined,
						sortOrder: idx,
						isUnmatched: !row.sku,
					}))
					setItems(items)
					setState('success')
				}
			} catch {
				clearInterval(progressInterval)
				setState('error')
				setErrorMessage(
					t(
						'quoteBuilder.uploadError',
						'Could not parse this file. Try CSV or Excel format.',
					),
				)
			}
		},
		[setItems, t],
	)

	const handleDrop = useCallback(
		async (e: {
			items: Array<{ kind: string; getFile?: () => Promise<File> }>
		}) => {
			setIsDragOver(false)
			const fileItem = e.items.find((i) => i.kind === 'file')
			if (fileItem?.getFile) {
				const file = await fileItem.getFile()
				processFile(file)
			}
		},
		[processFile],
	)

	const handleFileSelect = useCallback(
		(fileList: FileList | null) => {
			if (fileList && fileList.length > 0) {
				processFile(fileList[0])
			}
		},
		[processFile],
	)

	const handleReupload = useCallback(() => {
		setState('idle')
		setParseResult(null)
		setFileName('')
		setProgress(0)
		setErrorMessage('')
	}, [])

	const handleFixAndContinue = useCallback(
		(_fixedErrors: ParseError[], updatedResult: ParseResult) => {
			// Re-validate with fixed data
			const items: QuoteItem[] = updatedResult.items.map((row, idx) => ({
				id: crypto.randomUUID(),
				productId: undefined,
				customerDescription: row.productName || row.sku || '',
				quantity: row.quantity ?? 0,
				unitOfMeasure: row.uom || 'piece',
				notes: row.notes,
				matchConfidence: undefined,
				sortOrder: idx,
				isUnmatched: !row.sku,
			}))
			setItems(items)
			setState('success')
		},
		[setItems],
	)

	// ---- Render: Validation state ----
	if (state === 'validation' && parseResult) {
		return (
			<UploadValidation
				result={parseResult}
				onFixAndContinue={handleFixAndContinue}
				onReupload={handleReupload}
			/>
		)
	}

	// ---- Render: Processing state ----
	if (state === 'processing') {
		return (
			<div className="flex flex-col items-center gap-md rounded-xl border border-[var(--color-border)] p-lg">
				<FileSpreadsheet
					size={32}
					className="text-[var(--color-text-subtle)]"
				/>
				<Text className="text-sm font-medium">{fileName}</Text>
				<div className="w-full max-w-[300px]">
					<div className="h-2 w-full rounded-full bg-[var(--color-surface)]">
						<div
							ref={progressRef}
							className="h-2 rounded-full bg-[var(--color-primary)] transition-all duration-150"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<Text className="mt-xs block text-center font-[family-name:var(--font-geist-mono)] text-[13px] text-[var(--color-text-subtle)]">
						{progress}%
					</Text>
				</div>
				<Text className="text-[13px] text-[var(--color-text-subtle)]">
					{t('quoteBuilder.parsing', 'Parsing your file...')}
				</Text>
			</div>
		)
	}

	// ---- Render: Error state ----
	if (state === 'error') {
		return (
			<div className="flex flex-col items-center gap-md rounded-xl border border-[var(--color-error)] p-lg">
				<AlertCircle size={32} className="text-[var(--color-error)]" />
				<Text className="text-sm text-[var(--color-error)]">
					{errorMessage}
				</Text>
				<Button
					onPress={handleReupload}
					className="h-9 rounded-xl border border-[var(--color-border)] px-md text-[13px] font-semibold text-[var(--color-text)] outline-none hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
				>
					{t('quoteBuilder.reupload', 'Re-upload')}
				</Button>
			</div>
		)
	}

	// ---- Render: Success state ----
	if (state === 'success' && parseResult) {
		return (
			<div className="flex flex-col items-center gap-md rounded-xl border border-[var(--color-success)] p-lg">
				<FileSpreadsheet size={32} className="text-[var(--color-success)]" />
				<Text className="text-sm font-medium">
					{t(
						'quoteBuilder.uploadSuccess',
						'{{count}} items imported successfully',
						{
							count: parseResult.items.length,
						},
					)}
				</Text>
				<Button
					onPress={handleReupload}
					className="h-9 rounded-xl border border-[var(--color-border)] px-md text-[13px] font-semibold text-[var(--color-text)] outline-none hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
				>
					{t('quoteBuilder.uploadAnother', 'Upload another file')}
				</Button>
			</div>
		)
	}

	// ---- Render: Idle / Drop zone ----
	return (
		<div className="flex flex-col items-center gap-md">
			<DropZone
				onDropEnter={() => setIsDragOver(true)}
				onDropExit={() => setIsDragOver(false)}
				onDrop={handleDrop}
				className={`flex h-[200px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-150 ${
					isDragOver
						? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-info-bg)_50%,transparent)]'
						: 'border-[var(--color-border)]'
				}`}
			>
				<Upload size={32} className="mb-sm text-[var(--color-text-subtle)]" />
				<Text
					slot="label"
					className="text-center text-sm text-[var(--color-text)]"
				>
					{t(
						'quoteBuilder.uploadPrimary',
						'Drop your file here or click to browse',
					)}
				</Text>
				<Text className="mt-xs text-center text-[13px] text-[var(--color-text-subtle)]">
					{t(
						'quoteBuilder.uploadSecondary',
						'Supports: CSV, Excel (.xlsx), PDF',
					)}
				</Text>
				<FileTrigger
					acceptedFileTypes={['.csv', '.xlsx', '.xls']}
					onSelect={handleFileSelect}
				>
					<Button className="mt-md h-9 rounded-xl bg-[var(--color-primary)] px-md text-[13px] font-semibold text-white outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2">
						{t('quoteBuilder.browse', 'Browse Files')}
					</Button>
				</FileTrigger>
			</DropZone>

			<button
				type="button"
				onClick={downloadTemplate}
				className="flex items-center gap-xs text-[13px] font-normal text-[var(--color-primary)] hover:underline"
			>
				<Download size={14} />
				{t('quoteBuilder.downloadTemplate', 'Download Template')}
			</button>
		</div>
	)
}
