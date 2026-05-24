import { FileCheck2, Loader2, Upload, X } from 'lucide-react'
import { useId, useState } from 'react'
import {
	type ProofPanel,
	type ProofType,
	type UploadedProofDocument,
	uploadProofDocument,
} from '../../lib/server/proofs'

const maxProofBytes = 1024 * 1024
const imageMimeByExtension: Record<string, string> = {
	avif: 'image/avif',
	bmp: 'image/bmp',
	gif: 'image/gif',
	heic: 'image/heic',
	heif: 'image/heif',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png',
	tif: 'image/tiff',
	tiff: 'image/tiff',
	webp: 'image/webp',
}

interface ProofUploadFieldProps {
	disabled?: boolean
	label: string
	note?: string
	onChange: (proof: UploadedProofDocument | null) => void
	panel: ProofPanel
	proofType: ProofType
	relatedEntityId?: string
	relatedEntityType?: string
	title?: string
	value: UploadedProofDocument | null
}

export function ProofUploadField({
	disabled = false,
	label,
	note = 'PDF or image under 1 MB.',
	onChange,
	panel,
	proofType,
	relatedEntityId,
	relatedEntityType,
	title,
	value,
}: ProofUploadFieldProps) {
	const inputId = useId()
	const [error, setError] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)

	async function handleFile(file: File | null) {
		setError(null)
		if (!file) return
		if (file.size > maxProofBytes) {
			setError('Proof must be under 1 MB.')
			return
		}
		const mimeType = inferProofMimeType(file)
		if (!mimeType) {
			setError('Use a PDF or image proof.')
			return
		}

		setIsUploading(true)
		try {
			const base64 = await readFileAsDataUrl(file)
			const proof = await uploadProofDocument({
				data: {
					base64,
					fileName: file.name,
					mimeType,
					panel,
					proofType,
					relatedEntityId,
					relatedEntityType,
					sizeBytes: file.size,
					title: title ?? file.name,
				},
			})
			onChange(proof)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not upload proof.')
		} finally {
			setIsUploading(false)
		}
	}

	return (
		<div className="mt-6">
			<label
				htmlFor={inputId}
				className="flex items-center gap-2 font-[family-name:var(--font-archivo)] font-semibold uppercase"
				style={{
					color: 'var(--color-text-subtle)',
					fontSize: '11px',
					letterSpacing: '0.1em',
				}}
			>
				<Upload aria-hidden="true" size={14} strokeWidth={1.8} />
				{label}
			</label>

			<div className="mt-2 flex min-h-12 items-center gap-2 rounded-md border border-black/[0.1] bg-[var(--color-surface)] px-3 dark:border-white/[0.12]">
				{value ? (
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<FileCheck2
							aria-hidden="true"
							size={16}
							strokeWidth={1.8}
							className="shrink-0 text-[var(--color-primary)]"
						/>
						<span className="min-w-0 truncate font-[family-name:var(--font-bricolage)] text-[13px] font-semibold text-[var(--color-text)]">
							{value.fileName}
						</span>
					</div>
				) : (
					<input
						id={inputId}
						type="file"
						accept="application/pdf,image/*"
						disabled={disabled || isUploading}
						onChange={(event) => {
							void handleFile(event.currentTarget.files?.[0] ?? null)
							event.currentTarget.value = ''
						}}
						className="min-w-0 flex-1 font-[family-name:var(--font-bricolage)] text-[13px] text-[var(--color-text)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary)]/10 file:px-3 file:py-1.5 file:font-[family-name:var(--font-archivo)] file:text-[11px] file:font-semibold file:uppercase file:tracking-[0.08em] file:text-[var(--color-primary)]"
					/>
				)}

				{isUploading && (
					<Loader2
						aria-hidden="true"
						size={16}
						strokeWidth={1.8}
						className="shrink-0 animate-spin text-[var(--color-text-muted)]"
					/>
				)}
				{value && (
					<button
						type="button"
						disabled={disabled || isUploading}
						onClick={() => onChange(null)}
						className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--color-text-muted)] outline-none transition-colors hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
						aria-label="Remove proof"
					>
						<X aria-hidden="true" size={15} strokeWidth={1.8} />
					</button>
				)}
			</div>

			<p
				className="mt-2 font-[family-name:var(--font-bricolage)]"
				style={{
					color: error
						? 'var(--color-danger, #b42318)'
						: 'var(--color-text-muted)',
					fontSize: '11px',
					letterSpacing: '0.002em',
				}}
			>
				{error ?? note}
			</p>
		</div>
	)
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onerror = () => reject(new Error('Could not read proof file.'))
		reader.onload = () => {
			if (typeof reader.result !== 'string') {
				reject(new Error('Could not read proof file.'))
				return
			}
			resolve(reader.result)
		}
		reader.readAsDataURL(file)
	})
}

function inferProofMimeType(file: File): string | null {
	const browserType = file.type.trim().toLowerCase()
	if (browserType === 'application/pdf' || browserType.startsWith('image/')) {
		return browserType
	}
	const extension = file.name.split('.').pop()?.toLowerCase()
	if (!extension) return null
	if (extension === 'pdf') return 'application/pdf'
	return imageMimeByExtension[extension] ?? null
}
