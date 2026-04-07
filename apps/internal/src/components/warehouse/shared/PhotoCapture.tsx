import { useCallback, useRef, useState } from 'react'
import { Button } from 'react-aria-components'

interface PhotoCaptureProps {
  label: string
  required?: boolean
  onCapture: (file: File) => void
  preview?: boolean
}

/**
 * Camera viewfinder + capture button + thumbnail grid.
 * Uses rear camera on mobile via capture="environment".
 * Large 56px touch target for gloved hands.
 */
export function PhotoCapture({
  label,
  required = false,
  onCapture,
  preview = true,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [thumbnails, setThumbnails] = useState<string[]>([])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      onCapture(file)

      if (preview) {
        const url = URL.createObjectURL(file)
        setThumbnails((prev) => [...prev, url])
      }
    },
    [onCapture, preview],
  )

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-black/50 dark:text-white/50 uppercase tracking-wider">
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
        className="flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-black/15 dark:border-white/15 text-sm font-medium text-black/50 dark:text-white/50 cursor-pointer hover:border-[#2563EB]/40 hover:text-[#2563EB] transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7 3L5.5 5H3C2.45 5 2 5.45 2 6V15C2 15.55 2.45 16 3 16H17C17.55 16 18 15.55 18 15V6C18 5.45 17.55 5 17 5H14.5L13 3H7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        {thumbnails.length > 0 ? 'Add Photo' : 'Take Photo'}
      </Button>

      {/* Thumbnail grid */}
      {preview && thumbnails.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {thumbnails.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={`${label} ${i + 1}`}
              className="h-16 w-16 rounded-lg object-cover border border-black/10 dark:border-white/10"
            />
          ))}
        </div>
      )}
    </div>
  )
}
