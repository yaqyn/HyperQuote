import { useCallback, useRef, useState } from 'react'
import { Button } from 'react-aria-components'

interface PhotoCaptureProps {
  label: string
  required?: boolean
  onCapture: (file: File) => void
  preview?: boolean
}

/**
 * Photo capture component.
 * Uses `<input type="file" accept="image/*" capture="environment">` on mobile
 * for rear camera, standard file input on desktop.
 * Shows thumbnail preview after capture.
 */
export function PhotoCapture({
  label,
  required = false,
  onCapture,
  preview = true,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      onCapture(file)

      if (preview) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      }
    },
    [onCapture, preview],
  )

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      <Button
        onPress={handleClick}
        className="h-12 min-h-[48px] rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-text-secondary)] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors cursor-pointer"
      >
        {previewUrl ? 'Retake Photo' : 'Take Photo'}
      </Button>

      {preview && previewUrl && (
        <img
          src={previewUrl}
          alt={label}
          className="h-24 w-24 rounded-lg object-cover border border-[var(--color-border)]"
        />
      )}
    </div>
  )
}
