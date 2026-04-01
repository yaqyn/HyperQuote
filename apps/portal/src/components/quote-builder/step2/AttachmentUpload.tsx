/**
 * Attachment upload for quote builder Step 2.
 * DropZone + FileTrigger for PDF/images.
 * Max 5 files, 10MB each. Chips with spring add / tween remove animations.
 */
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DropZone, FileTrigger, Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { Paperclip, X, Upload } from 'lucide-react'
import { useQuoteBuilderStore } from '../../../stores/quote-builder'

// ============================================================================
// Constants
// ============================================================================

const MAX_FILES = 5
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png'

// ============================================================================
// Component
// ============================================================================

export function AttachmentUpload() {
  const { t } = useTranslation('portal')
  const attachments = useQuoteBuilderStore((s) => s.attachments)
  const setAttachments = useQuoteBuilderStore((s) => s.setAttachments)

  const validateAndAdd = useCallback(
    (incoming: File[]) => {
      const current = attachments
      const remainingSlots = MAX_FILES - current.length

      if (remainingSlots <= 0) {
        // TODO: show toast t('quoteBuilder.maxFiles')
        return
      }

      const valid: File[] = []
      for (const file of incoming.slice(0, remainingSlots)) {
        if (file.size > MAX_SIZE_BYTES) {
          // TODO: show toast t('quoteBuilder.fileTooLarge')
          continue
        }
        if (!ACCEPTED_TYPES.includes(file.type)) {
          continue
        }
        valid.push(file)
      }

      if (valid.length > 0) {
        setAttachments([...current, ...valid])
      }
    },
    [attachments, setAttachments],
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
      <label className="text-xs font-medium text-[var(--color-text-muted)]">
        {t('quoteBuilder.attachmentsLabel', 'Attachments')}
        <span className="text-[var(--color-text-muted)] ms-1">
          ({t('quoteBuilder.attachmentsHint', 'Drawings, specs -- PDF or images, max 5 files, 10MB each')})
        </span>
      </label>

      {/* Drop zone */}
      <DropZone
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer text-center drop-target:border-[var(--color-primary)] drop-target:bg-[var(--color-primary)]/5"
      >
        <Upload size={20} className="text-[var(--color-text-muted)]" />
        <p className="text-sm text-[var(--color-text-muted)]">
          {t('quoteBuilder.dropFiles', 'Drop files here or')}
        </p>
        <FileTrigger
          acceptedFileTypes={ACCEPTED_EXTENSIONS.split(',')}
          allowsMultiple
          onSelect={handleSelect}
        >
          <Button className="text-sm text-[var(--color-primary)] font-medium hover:underline cursor-pointer outline-none">
            {t('quoteBuilder.browseFiles', 'browse')}
          </Button>
        </FileTrigger>
      </DropZone>

      {/* File chips */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {attachments.map((file, idx) => (
            <motion.div
              key={`${file.name}-${idx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={
                // Spring for enter, tween for exit
                { type: 'spring', stiffness: 300, damping: 25 }
              }
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--color-surface)] text-xs text-[var(--color-text)]"
            >
              <Paperclip size={12} className="text-[var(--color-text-muted)] shrink-0" />
              <span className="truncate max-w-[140px]">{file.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="shrink-0 p-0.5 rounded-full hover:bg-[var(--color-border)] transition-colors cursor-pointer"
                aria-label={t('quoteBuilder.removeFile', 'Remove {{name}}', { name: file.name })}
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* File count */}
      {attachments.length > 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          <span className="font-mono">{attachments.length}</span> / <span className="font-mono">{MAX_FILES}</span>{' '}
          {t('quoteBuilder.filesAttached', 'files')}
        </p>
      )}
    </div>
  )
}
