/**
 * Attachment upload for quote builder Step 2.
 * DropZone + FileTrigger for PDF/images.
 * Max 5 files, 10MB each. Chips with spring add / tween remove animations.
 */

import { Paperclip, Upload, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useState } from 'react'
import { Button, DropZone, FileTrigger } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuoteBuilderStore } from '../../../stores/quote-builder'

// ============================================================================
// Constants
// ============================================================================

const MAX_FILES = 5
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png'
const ACCEPTED_FILE_NAME_PATTERN = /\.(pdf|jpe?g|png)$/i

// ============================================================================
// Component
// ============================================================================

export function AttachmentUpload() {
	const { t } = useTranslation('portal')
	const attachments = useQuoteBuilderStore((s) => s.attachments)
	const setAttachments = useQuoteBuilderStore((s) => s.setAttachments)
	const [validationMessage, setValidationMessage] = useState<string | null>(
		null,
	)

	const validateAndAdd = useCallback(
		(incoming: File[]) => {
			const current = attachments
			const remainingSlots = MAX_FILES - current.length

			if (remainingSlots <= 0) {
				setValidationMessage(t('quoteBuilder.maxFiles'))
				return
			}

			const valid: File[] = []
			let rejectedMessage =
				incoming.length > remainingSlots ? t('quoteBuilder.maxFiles') : null
			for (const file of incoming.slice(0, remainingSlots)) {
				if (file.size > MAX_SIZE_BYTES) {
					rejectedMessage ??= t('quoteBuilder.fileTooLarge')
					continue
				}
				if (
					!ACCEPTED_TYPES.includes(file.type) &&
					!ACCEPTED_FILE_NAME_PATTERN.test(file.name)
				) {
					rejectedMessage ??= t('quoteBuilder.invalidFileType')
					continue
				}
				valid.push(file)
			}

			if (valid.length > 0) {
				setAttachments([...current, ...valid])
			}
			setValidationMessage(rejectedMessage)
		},
		[attachments, setAttachments, t],
	)

	const handleRemove = useCallback(
		(index: number) => {
			setAttachments(attachments.filter((_, i) => i !== index))
		},
		[attachments, setAttachments],
	)

	const handleDrop = useCallback(
		(e: { items: Array<{ kind: string; getFile?: () => Promise<File> }> }) => {
			const files: Promise<File>[] = []
			for (const item of e.items) {
				if (item.kind === 'file' && item.getFile) {
					files.push(item.getFile())
				}
			}
			Promise.all(files).then(validateAndAdd)
		},
		[validateAndAdd],
	)

	const handleSelect = useCallback(
		(e: FileList | null) => {
			if (!e) return
			validateAndAdd(Array.from(e))
		},
		[validateAndAdd],
	)

	return (
		<div className="space-y-3">
			<span className="text-[13px] font-medium text-[var(--color-text-muted)]">
				{t('quoteBuilder.attachmentsLabel')}
				<span className="text-[var(--color-text-muted)] ms-1">
					({t('quoteBuilder.attachmentsHint')})
				</span>
			</span>

			{/* Drop zone */}
			<DropZone
				onDrop={handleDrop}
				className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer text-center drop-target:border-[var(--color-primary)] drop-target:bg-[var(--color-primary)]/5"
			>
				<Upload size={20} className="text-[var(--color-text-muted)]" />
				<p className="text-sm text-[var(--color-text-muted)]">
					{t('quoteBuilder.dropFiles')}
				</p>
				<FileTrigger
					acceptedFileTypes={ACCEPTED_EXTENSIONS.split(',')}
					allowsMultiple
					onSelect={handleSelect}
				>
					<Button className="text-sm text-[var(--color-primary)] font-medium hover:underline cursor-pointer outline-none">
						{t('quoteBuilder.browseFiles')}
					</Button>
				</FileTrigger>
			</DropZone>
			{validationMessage && (
				<p role="alert" className="text-[13px] text-[#B91C1C]">
					{validationMessage}
				</p>
			)}

			{/* File chips */}
			<div className="flex flex-wrap gap-2">
				<AnimatePresence mode="popLayout">
					{attachments.map((file, idx) => (
						<motion.div
							key={`${file.name}-${file.size}-${file.lastModified}`}
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={
								// Spring for enter, tween for exit
								{ type: 'spring', stiffness: 300, damping: 25 }
							}
							className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--color-surface)] text-[13px] text-[var(--color-text)]"
						>
							<Paperclip
								size={12}
								className="text-[var(--color-text-muted)] shrink-0"
							/>
							<span className="truncate max-w-[140px]">{file.name}</span>
							<button
								type="button"
								onClick={() => handleRemove(idx)}
								className="shrink-0 p-0.5 rounded-full hover:bg-[var(--color-border)] transition-colors cursor-pointer"
								aria-label={t('quoteBuilder.removeFile', {
									name: file.name,
								})}
							>
								<X size={12} />
							</button>
						</motion.div>
					))}
				</AnimatePresence>
			</div>

			{/* File count */}
			{attachments.length > 0 && (
				<p className="text-[13px] text-[var(--color-text-muted)]">
					<span className="font-mono">{attachments.length}</span> /{' '}
					<span className="font-mono">{MAX_FILES}</span>{' '}
					{t('quoteBuilder.filesAttached')}
				</p>
			)}
		</div>
	)
}
