/**
 * POD review split — evidence (photos/signature) on left, checklist on right.
 * Photo gallery + delivery details side by side.
 */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ClientOnly } from '../../../lib/client-only'
import { MapSkeleton } from '../shared/MapSkeleton'
import { PODMiniMap } from './PODMiniMap'
import { PODChecklist } from './PODChecklist'
import { PODActions } from './PODActions'
import type { PODRecord, PODValidationChecklist, RouteStop } from '../../../types/dispatch'

interface PODReviewSplitProps {
  pod: PODRecord
  stop: RouteStop
  expectedQty: Record<string, number>
  onBack: () => void
  onActionComplete: () => void
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function PODReviewSplit({
  pod,
  stop,
  expectedQty,
  onBack,
  onActionComplete,
}: PODReviewSplitProps) {
  const { t } = useTranslation('dispatch')

  const gpsDistance = haversineMeters(pod.gpsLat, pod.gpsLng, stop.lat, stop.lng)
  const gpsOk = gpsDistance <= 500

  const quantitiesMatch = useMemo(() => {
    for (const [key, expected] of Object.entries(expectedQty)) {
      if ((pod.deliveredQty[key] ?? 0) !== expected) return false
    }
    return true
  }, [pod.deliveredQty, expectedQty])

  const [checklist, setChecklist] = useState<PODValidationChecklist>({
    photosOk: pod.photos.length > 0 && pod.autoChecksPassed,
    signatureOk: !!pod.signatureUrl,
    quantitiesOk: quantitiesMatch,
    gpsOk,
    noDamage: pod.autoChecksPassed,
  })

  const podTime = new Date(pod.timestamp)
  const allItems = new Set([...Object.keys(expectedQty), ...Object.keys(pod.deliveredQty)])
  const itemRows = Array.from(allItems).map((key) => {
    const expected = expectedQty[key] ?? 0
    const delivered = pod.deliveredQty[key] ?? 0
    const status = delivered === expected ? 'match' : delivered < expected ? 'short' : 'over'
    return { key, expected, delivered, status }
  })

  return (
    <div className="flex h-full flex-col">
      {/* Back */}
      <div className="border-b border-black/[0.06] px-6 py-3 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-black/50 transition-colors hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          <svg className="h-4 w-4 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          {t('pod.backToList', 'Back to delivery list')}
        </button>
      </div>

      {/* Split */}
      <div className="flex min-h-0 flex-1 overflow-auto">
        {/* Left: evidence */}
        <div className="w-2/5 shrink-0 overflow-y-auto border-e border-black/[0.06] p-6 dark:border-white/[0.06]">
          {/* Mini map */}
          <div className="mb-4 overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
            <ClientOnly fallback={<MapSkeleton className="h-[220px]" />}>
              {() => (
                <PODMiniMap
                  actualLat={pod.gpsLat}
                  actualLng={pod.gpsLng}
                  expectedLat={stop.lat}
                  expectedLng={stop.lng}
                />
              )}
            </ClientOnly>
          </div>

          {/* Photos */}
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
            {t('pod.photos', 'Photos')}
          </h4>
          {pod.photos.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {pod.photos.map((url, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg bg-black/[0.04] dark:bg-white/[0.04]"
                >
                  <img
                    src={url}
                    alt={`${t('pod.photo', 'Delivery photo')} ${i + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-4 text-sm text-black/30 dark:text-white/30">
              {t('pod.noPhotos', 'No photos available')}
            </p>
          )}

          {/* Signature */}
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
            {t('pod.signature', 'Signature')}
          </h4>
          {pod.signatureUrl ? (
            <div className="mb-4 h-20 w-40 overflow-hidden rounded-lg border border-black/[0.06] bg-white dark:border-white/[0.06] dark:bg-white/10">
              <img
                src={pod.signatureUrl}
                alt={t('pod.digitalSignature', 'Digital signature')}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <p className="mb-4 text-sm text-red-500">{t('pod.noSignature', 'No signature captured')}</p>
          )}

          {/* Driver notes */}
          {pod.driverNotes && (
            <>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
                {t('pod.driverNotes', 'Driver Notes')}
              </h4>
              <p className="text-sm text-black/60 dark:text-white/60">{pod.driverNotes}</p>
            </>
          )}
        </div>

        {/* Right: checklist + data */}
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          {/* GPS + Timestamp + Duration */}
          <div className="mb-4 flex gap-6">
            <div>
              <span className="text-[11px] text-black/40 dark:text-white/40">{t('pod.gpsCoords', 'GPS')}</span>
              <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                {pod.gpsLat.toFixed(4)}, {pod.gpsLng.toFixed(4)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-black/40 dark:text-white/40">{t('pod.timestamp', 'Time')}</span>
              <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                {podTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-black/40 dark:text-white/40">{t('pod.duration', 'Duration')}</span>
              <p className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
                {pod.durationMinutes} {t('pod.min', 'min')}
              </p>
            </div>
          </div>

          {/* Item table */}
          <div className="mb-6 rounded-xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
              {t('pod.items', 'Items')}
            </h4>
            <div className="flex flex-col">
              {itemRows.map((row) => (
                <div
                  key={row.key}
                  className={`flex items-center gap-3 border-b border-black/[0.04] py-2 last:border-0 dark:border-white/[0.04] ${
                    row.status !== 'match' ? 'bg-red-50/30 dark:bg-red-900/5' : ''
                  }`}
                >
                  <span className="min-w-0 flex-1 text-sm">{row.key}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-black/50 dark:text-white/50">
                    {row.expected}
                  </span>
                  <svg className="h-3 w-3 text-black/20 dark:text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                  <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums font-medium">
                    {row.delivered}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      row.status === 'match' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="mb-4">
            <PODChecklist checklist={checklist} onChange={setChecklist} />
          </div>

          {/* Actions */}
          <PODActions
            deliveryId={pod.deliveryId}
            checklist={checklist}
            onActionComplete={onActionComplete}
          />
        </div>
      </div>
    </div>
  )
}
