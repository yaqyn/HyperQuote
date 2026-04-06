import { useCallback, useRef, useState } from 'react'
import { TextField, Label, Input } from 'react-aria-components'

interface ScanInputProps {
  label: string
  expectedValue?: string
  onScan: (value: string) => void
  onMismatch?: (scanned: string, expected: string) => void
  autoFocus?: boolean
  size?: 'default' | 'large'
}

/**
 * Barcode scan + manual entry component.
 * Detects rapid keystroke bursts (<100ms between chars + Enter) from hardware
 * scanner keyboard wedge devices vs normal manual typing.
 *
 * Green flash + vibrate(200) on match.
 * Red flash + vibrate([100,50,100]) on mismatch.
 */
export function ScanInput({
  label,
  expectedValue,
  onScan,
  onMismatch,
  autoFocus = false,
  size = 'default',
}: ScanInputProps) {
  const [value, setValue] = useState('')
  const [flash, setFlash] = useState<'none' | 'green' | 'red'>('none')
  const keystrokeTimestamps = useRef<number[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const triggerFeedback = useCallback(
    (matched: boolean) => {
      setFlash(matched ? 'green' : 'red')
      setTimeout(() => setFlash('none'), 400)

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (matched) {
          navigator.vibrate(200)
        } else {
          navigator.vibrate([100, 50, 100])
        }
      }
    },
    [],
  )

  const handleSubmit = useCallback(
    (scannedValue: string) => {
      const trimmed = scannedValue.trim()
      if (!trimmed) return

      if (expectedValue) {
        if (trimmed === expectedValue) {
          triggerFeedback(true)
          onScan(trimmed)
        } else {
          triggerFeedback(false)
          onMismatch?.(trimmed, expectedValue)
        }
      } else {
        triggerFeedback(true)
        onScan(trimmed)
      }

      setValue('')
      keystrokeTimestamps.current = []
    },
    [expectedValue, onScan, onMismatch, triggerFeedback],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Check if this was a scanner burst: all keystrokes within 100ms window
        const timestamps = keystrokeTimestamps.current
        const isScannerBurst =
          timestamps.length > 2 &&
          timestamps[timestamps.length - 1] - timestamps[0] < 100 * timestamps.length

        // Whether scanner burst or manual entry, submit on Enter
        handleSubmit(value)
        return
      }

      // Track keystroke timing for scanner detection
      keystrokeTimestamps.current.push(Date.now())
      // Keep only last 50 timestamps
      if (keystrokeTimestamps.current.length > 50) {
        keystrokeTimestamps.current = keystrokeTimestamps.current.slice(-50)
      }
    },
    [value, handleSubmit],
  )

  const heightClass = size === 'large' ? 'h-16' : 'h-12'

  const flashClass =
    flash === 'green'
      ? 'ring-2 ring-green-500 bg-green-50'
      : flash === 'red'
        ? 'ring-2 ring-red-500 bg-red-50'
        : ''

  return (
    <TextField
      value={value}
      onChange={setValue}
      autoFocus={autoFocus}
      className="flex flex-col gap-1"
    >
      <Label className="text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
      </Label>
      <Input
        ref={inputRef}
        onKeyDown={handleKeyDown}
        className={`${heightClass} rounded-lg border border-[var(--color-border)] px-3 text-base font-mono transition-all ${flashClass}`}
        placeholder={expectedValue ? `Scan or type: ${expectedValue}` : 'Scan barcode or type value...'}
      />
    </TextField>
  )
}
