import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button as AriaButton } from 'react-aria-components'
import { capturePhoto } from '../../lib/camera'
import { getCurrentPosition } from '../../lib/geofence'

export interface PhotoEntry {
  uri: string
  lat: number
  lng: number
  accuracy: number
  timestamp: string
}

interface PODPhotosProps {
  photos: PhotoEntry[]
  onPhotosChange: (photos: PhotoEntry[]) => void
  maxPhotos?: number
}

const MAX_DEFAULT = 6

export function PODPhotos({
  photos,
  onPhotosChange,
  maxPhotos = MAX_DEFAULT,
}: PODPhotosProps) {
  const { t } = useTranslation('driver')
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null)

  const handleCapture = useCallback(async () => {
    if (photos.length >= maxPhotos) return

    const uri = await capturePhoto()
    if (!uri) return

    // Auto-tag with GPS + timestamp
    let lat = 0
    let lng = 0
    let accuracy = 0
    try {
      const pos = await getCurrentPosition()
      lat = pos.lat
      lng = pos.lng
      accuracy = pos.accuracy
    } catch {
      // GPS may be unavailable — still allow photo
    }

    const entry: PhotoEntry = {
      uri,
      lat,
      lng,
      accuracy,
      timestamp: new Date().toISOString(),
    }

    onPhotosChange([...photos, entry])
  }, [photos, maxPhotos, onPhotosChange])

  const handleRemove = useCallback(
    (index: number) => {
      const updated = photos.filter((_, i) => i !== index)
      onPhotosChange(updated)
      setConfirmRemoveIdx(null)
    },
    [photos, onPhotosChange]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {t('pod.photos')}
        </h3>
        <span className="font-mono text-sm text-[var(--text-secondary)]">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      {photos.length === 0 && (
        <p className="text-sm text-[var(--color-danger,#ef4444)]">
          {t('pod.photosRequired')}
        </p>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div key={photo.timestamp + index} className="relative aspect-square">
            <img
              src={photo.uri}
              alt={`${t('pod.photos')} ${index + 1}`}
              className="h-full w-full rounded-xl object-cover"
            />
            {confirmRemoveIdx === index ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/60">
                <AriaButton
                  onPress={() => handleRemove(index)}
                  className="min-h-[var(--touch-min)] rounded-lg bg-[var(--color-danger,#ef4444)] px-4 py-2 text-sm font-medium text-white"
                >
                  {t('common.confirm')}
                </AriaButton>
                <AriaButton
                  onPress={() => setConfirmRemoveIdx(null)}
                  className="min-h-[var(--touch-min)] rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white"
                >
                  {t('common.cancel')}
                </AriaButton>
              </div>
            ) : (
              <AriaButton
                onPress={() => setConfirmRemoveIdx(index)}
                className="absolute end-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label={`Remove photo ${index + 1}`}
              >
                &times;
              </AriaButton>
            )}
          </div>
        ))}

        {/* Add photo button */}
        {photos.length < maxPhotos && (
          <AriaButton
            onPress={handleCapture}
            className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors hover:border-[var(--color-blue)] hover:text-[var(--color-blue)]"
            aria-label={t('pod.photos')}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </AriaButton>
        )}
      </div>
    </div>
  )
}
