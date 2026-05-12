import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'
import { Button } from '../../ui'

interface DocumentsTabProps {
	customerId: string
	enabled: boolean
}

interface UploadedFile {
	id: string
	name: string
	size: number
	type: string
}

const DOC_TYPE_LABELS: Record<string, string> = {
	quote: 'QT',
	invoice: 'INV',
	delivery_note: 'DN',
	contract: 'CTR',
	certificate: 'CRT',
}

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
	if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	return `${Math.round(bytes / 1024)} KB`
}

function processFiles(fileList: FileList): UploadedFile[] {
	const results: UploadedFile[] = []
	for (let i = 0; i < fileList.length; i++) {
		const file = fileList[i]
		if (!ACCEPTED_TYPES.includes(file.type)) continue
		if (file.size > MAX_FILE_SIZE) continue
		results.push({
			id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
			name: file.name,
			size: file.size,
			type: file.type,
		})
	}
	return results
}

export function DocumentsTab({ customerId, enabled }: DocumentsTabProps) {
	const { t } = useTranslation('internal')
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
	const [isDragOver, setIsDragOver] = useState(false)

	const { data, isLoading } = useQuery({
		queryKey: ['customer-360', 'documents', customerId],
		queryFn: () => getCustomer360({ data: { customerId } }),
		staleTime: 120_000,
		enabled,
		select: (d) => d.documents,
	})

	if (!enabled) return null
	if (isLoading) return <TabSkeleton />

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault()
		e.stopPropagation()
		setIsDragOver(true)
	}

	function handleDragLeave(e: React.DragEvent) {
		e.preventDefault()
		e.stopPropagation()
		setIsDragOver(false)
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault()
		e.stopPropagation()
		setIsDragOver(false)
		if (e.dataTransfer.files.length > 0) {
			// TODO: Upload to Cloudflare R2
			const newFiles = processFiles(e.dataTransfer.files)
			setUploadedFiles((prev) => [...prev, ...newFiles])
		}
	}

	function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		if (e.target.files && e.target.files.length > 0) {
			// TODO: Upload to Cloudflare R2
			const newFiles = processFiles(e.target.files)
			setUploadedFiles((prev) => [...prev, ...newFiles])
			e.target.value = '' // reset so same file can be re-selected
		}
	}

	function removeFile(id: string) {
		setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
	}

	return (
		<div className="p-6 space-y-5">
			{/* Upload area -- drag-and-drop + click */}
			<button
				type="button"
				onClick={() => {
					fileInputRef.current?.click()
				}}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={`w-full flex flex-col items-center justify-center gap-1 py-6 rounded-lg border border-dashed transition-colors cursor-pointer ${
					isDragOver
						? 'border-[#2563EB]/40 bg-[#2563EB]/[0.03]'
						: 'border-black/[0.08] dark:border-white/[0.08] hover:border-[#2563EB]/30'
				}`}
			>
				<span className="text-[13px] text-black/25 dark:text-white/25">
					{t('sales.customer360.documents.dragDrop')}
				</span>
				<span className="text-[11px] text-black/20 dark:text-white/20">
					PDF, JPG, PNG up to 10MB
				</span>
			</button>
			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf,.jpg,.jpeg,.png"
				multiple
				className="hidden"
				onChange={handleFileSelect}
			/>

			{/* Uploaded files list */}
			{uploadedFiles.length > 0 && (
				<div className="flex flex-col gap-1">
					{uploadedFiles.map((file) => (
						<div
							key={file.id}
							className="flex items-center gap-3 rounded-lg px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02]"
						>
							{/* File icon */}
							<svg
								aria-hidden="true"
								className="size-4 shrink-0 text-black/40 dark:text-white/40"
								viewBox="0 0 20 20"
								fill="none"
							>
								<rect
									x="4"
									y="2"
									width="12"
									height="16"
									rx="2"
									stroke="currentColor"
									strokeWidth="1.2"
								/>
								<path
									d="M8 7h4M8 10h4M8 13h2"
									stroke="currentColor"
									strokeWidth="1"
									strokeLinecap="round"
								/>
							</svg>

							{/* Name */}
							<span className="text-[12px] text-black/60 dark:text-white/60 truncate flex-1 min-w-0">
								{file.name}
							</span>

							{/* Size (mono) */}
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px] text-black/40 dark:text-white/40 shrink-0">
								{formatFileSize(file.size)}
							</span>

							{/* Remove */}
							<Button
								variant="ghost"
								onPress={() => {
									removeFile(file.id)
								}}
							>
								×
							</Button>
						</div>
					))}
				</div>
			)}

			{/* Existing documents file grid */}
			{data && data.length > 0 && (
				<div className="grid grid-cols-1 gap-2 lg:grid-cols-4">
					{data.map((doc) => (
						<div
							key={doc.id}
							className="group relative p-3 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
						>
							{/* Type badge */}
							<div className="w-8 h-8 rounded bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mb-2">
								<span className="font-[family-name:var(--font-geist-mono)] text-[9px] font-bold text-black/35 dark:text-white/35 tabular-nums">
									{DOC_TYPE_LABELS[doc.type] ?? 'DOC'}
								</span>
							</div>

							{/* Filename */}
							<p className="text-[13px] font-medium text-[var(--color-text)] dark:text-white truncate leading-tight">
								{doc.name}
							</p>

							{/* Type + date */}
							<div className="flex items-center gap-2 mt-1">
								<span className="text-[10px] px-1.5 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.04] text-black/35 dark:text-white/35 capitalize">
									{doc.type.replace(/_/g, ' ')}
								</span>
								<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-black/20 dark:text-white/20">
									{new Date(doc.uploadedAt).toLocaleDateString()}
								</span>
							</div>

							{/* Download action -- visible on hover */}
							<div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<AriaButton
									className="text-[10px] font-medium text-[#2563EB] px-2 py-1 rounded bg-white dark:bg-[var(--color-bg)] shadow-sm outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40"
									onPress={() => {
										const link = document.createElement('a')
										link.href = doc.url
										link.download = doc.name
										link.click()
									}}
								>
									{t('sales.customer360.documents.download')}
								</AriaButton>
							</div>
						</div>
					))}
				</div>
			)}

			{(!data || data.length === 0) && uploadedFiles.length === 0 && (
				<div className="flex items-center justify-center h-16 text-[13px] text-black/30 dark:text-white/30">
					{t('sales.customer360.documents.noDocuments')}
				</div>
			)}
		</div>
	)
}

function TabSkeleton() {
	return (
		<div className="p-6 space-y-4 animate-pulse">
			<div className="h-12 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
			<div className="grid grid-cols-4 gap-2">
				{Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((key) => (
					<div
						key={key}
						className="h-20 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]"
					/>
				))}
			</div>
		</div>
	)
}
