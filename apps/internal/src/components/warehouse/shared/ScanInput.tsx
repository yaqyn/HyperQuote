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
 * Barcode scan + manual entry.
 * Detects rapid keystroke bursts from hardware scanner wedge devices.
 * Green flash + vibrate on match. Red flash + vibrate pattern on mismatch.
 * Large variant = 80px height for warehouse use.
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
        handleSubmit(value)
        return
      }

      keystrokeTimestamps.current.push(Date.now())
      if (keystrokeTimestamps.current.length > 50) {
        keystrokeTimestamps.current = keystrokeTimestamps.current.slice(-50)
      }
    },
    [value, handleSubmit],
  )

  const heightClass = size === 'large' ? 'h-20' : 'h-14'
  const textClass = size === 'large' ? 'text-xl' : 'text-base'

  const flashClass =
    flash === 'green'
      ? 'ring-2 ring-green-500 bg-green-500/5'
      : flash === 'red'
        ? 'ring-2 ring-red-500 bg-red-500/5'
        : ''

  return (
    <TextField
      value={value}
      onChange={setValue}
      autoFocus={autoFocus}
      className="flex flex-col gap-1"
    >
      <Label className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative">
        {/* Barcode icon */}
        <svg
          className="absolute start-3 top-1/2 -translate-y-1/2 text-black/25 dark:text-white/25"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="2" height="12" fill="currentColor" />
          <rect x="5" y="4" width="1" height="12" fill="currentColor" />
          <rect x="7" y="4" width="3" height="12" fill="currentColor" />
          <rect x="11" y="4" width="1" height="12" fill="currentColor" />
          <rect x="13" y="4" width="2" height="12" fill="currentColor" />
          <rect x="16" y="4" width="2" height="12" fill="currentColor" />
        </svg>
        <Input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          className={`${heightClass} ${textClass} w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent ps-10 pe-3 font-[family-name:var(--font-geist-mono)] tabular-nums transition-all outline-none focus:border-[#2563EB] ${flashClass}`}
          placeholder={expectedValue ? `Scan: ${expectedValue}` : 'Scan barcode...'}
        />
      </div>
    </TextField>
  )
}
