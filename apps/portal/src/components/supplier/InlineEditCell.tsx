/**
 * InlineEditCell -- click-to-edit NumberField for inline table editing.
 * Uses standalone React Aria NumberField (NOT the RHF wrapper from @hyperquote/forms).
 * Saves on blur or Enter, flashes green on success, reverts + toasts on error.
 */
import { useState, useRef, useCallback } from 'react'
import { NumberField, Input } from 'react-aria-components'
import { toast } from '../../lib/toast'
import { useTranslation } from 'react-i18next'

interface InlineEditCellProps {
  value: number
  onSave: (newValue: number) => Promise<void>
  formatOptions?: Intl.NumberFormatOptions
  locale: 'ar' | 'en'
}

export function InlineEditCell({
  value,
  onSave,
  formatOptions,
  locale,
}: InlineEditCellProps) {
  const { t } = useTranslation('portal')
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)

  const formatter = new Intl.NumberFormat(
    locale === 'ar' ? 'ar-EG' : 'en-EG',
    formatOptions,
  )

  const handleCommit = useCallback(async () => {
    setIsEditing(false)
    if (localValue === value || isSaving) return
    setIsSaving(true)
    try {
      await onSave(localValue)
      // Flash success animation
      if (cellRef.current) {
        cellRef.current.animate(
          [
            { backgroundColor: 'var(--color-success-bg)' },
            { backgroundColor: 'transparent' },
          ],
          { duration: 500 },
        )
      }
    } catch {
      setLocalValue(value) // revert
      toast.success(t('supplier.updateFailed'))
    } finally {
      setIsSaving(false)
    }
  }, [localValue, value, isSaving, onSave, t])

  if (!isEditing) {
    return (
      <div
        ref={cellRef}
        onClick={() => {
          setLocalValue(value)
          setIsEditing(true)
        }}
        className="cursor-pointer px-2 py-1 rounded"
      >
        <span className="font-mono text-sm">{formatter.format(value)}</span>
      </div>
    )
  }

  return (
    <div ref={cellRef}>
      <NumberField
        value={localValue}
        onChange={(v) => setLocalValue(v)}
        onBlur={handleCommit}
        onKeyDown={(e) => {
          // Stop propagation to prevent React Aria Table row navigation
          e.stopPropagation()
          if (e.key === 'Enter') {
            handleCommit()
          }
        }}
        formatOptions={formatOptions}
        autoFocus
      >
        <Input className="font-mono text-sm w-24 px-2 py-1 rounded border border-[var(--color-primary)] bg-[var(--color-surface)] outline-none" />
      </NumberField>
    </div>
  )
}
