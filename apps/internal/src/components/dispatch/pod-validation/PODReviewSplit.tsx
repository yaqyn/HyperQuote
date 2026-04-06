/**
 * POD review split-view: left panel (40%) = PODMiniMap, right panel (60%) = POD details.
 * Right panel: photos, signature, GPS/timestamp, item table, driver notes, duration.
 * Checklist and Actions at bottom.
 */
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ClientOnly } from '@tanstack/react-start'
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

/** Haversine distance in meters */
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

  // Auto-populate checklist from POD data
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

  // Build item comparison rows
  const allItems = new Set([...Object.keys(expectedQty), ...Object.keys(pod.deliveredQty)])
  const itemRows = Array.from(allItems).map((key) => {
    const expected = expectedQty[key] ?? 0
    const delivered = pod.deliveredQty[key] ?? 0
    const status = delivered === expected ? 'match' : delivered < expected ? 'short' : 'over'
    return { key, expected, delivered, status }
  })

  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      <div className="px-6 py-3 border-b border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          {t('pod.backToList', 'Back to delivery list')}
        </button>
      </div>

      {/* Split layout */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left panel: Mini-map (40%) */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
              <ClientOnly fallback={<MapSkeleton className="h-[280px]" />}>
                {() => (
                  <PODMiniMap
                    actualLat={pod.gpsLat}
                    actualLng={pod.gpsLng}
                    expectedLat={stop.lat}
                    expectedLng={stop.lng}
                  />
                )}
              </ClientOnly>
              <div className="p-3 text-xs text-black/50 dark:text-white/50">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> {t('pod.map.actual', 'Actual GPS')}
                </span>
                <span className="inline-flex items-center gap-1 ms-4">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> {t('pod.map.expected', 'Expected')}
                </span>
              </div>
            </div>
          </div>

          {/* Right panel: POD details (60%) */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            {/* Photo thumbnails */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
              <h4 className="text-sm font-semibold mb-3">{t('pod.photos', 'Photos')}</h4>
              {pod.photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {pod.photos.map((url, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-lg bg-black/5 dark:bg-white/5 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#2563EB] transition-shadow"
                    >
                      <img
                        src={url}
                        alt={`${t('pod.photo', 'Delivery photo')} ${i + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-black/40 dark:text-white/40">
                  {t('pod.noPhotos', 'No photos available')}
                </p>
              )}
            </div>

            {/* Signature */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
              <h4 className="text-sm font-semibold mb-3">{t('pod.signature', 'Signature')}</h4>
              {pod.signatureUrl ? (
                <div className="w-48 h-24 rounded-lg bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 overflow-hidden">
                  <img
                    src={pod.signatureUrl}
                    alt={t('pod.digitalSignature', 'Digital signature')}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <p className="text-sm text-red-500">
                  {t('pod.noSignature', 'No signature captured')}
                </p>
              )}
            </div>

            {/* GPS + Timestamp + Duration */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-black/50 dark:text-white/50 block mb-1">{t('pod.gpsCoords', 'GPS Coordinates')}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
                    {pod.gpsLat.toFixed(4)}, {pod.gpsLng.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-black/50 dark:text-white/50 block mb-1">{t('pod.timestamp', 'Timestamp')}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
                    {podTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-black/50 dark:text-white/50 block mb-1">{t('pod.duration', 'Duration')}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm">
                    {pod.durationMinutes} {t('pod.min', 'min')}
                  </span>
                </div>
              </div>
            </div>

            {/* Item table */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
              <h4 className="text-sm font-semibold mb-3">{t('pod.items', 'Items')}</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10">
                    <th className="py-2 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('pod.item', 'Item')}</th>
                    <th className="py-2 text-end text-xs text-black/50 dark:text-white/50 font-medium">{t('pod.expected', 'Expected')}</th>
                    <th className="py-2 text-end text-xs text-black/50 dark:text-white/50 font-medium">{t('pod.delivered', 'Delivered')}</th>
                    <th className="py-2 text-end text-xs text-black/50 dark:text-white/50 font-medium">{t('pod.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {itemRows.map((row) => (
                    <tr
                      key={row.key}
                      className={`border-b border-black/5 dark:border-white/5 ${row.status !== 'match' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                    >
                      <td className="py-2">{row.key}</td>
                      <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.expected}</td>
                      <td className="py-2 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">{row.delivered}</td>
                      <td className="py-2 text-end">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.status === 'match'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : row.status === 'short'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {row.status === 'match'
                            ? t('pod.match', 'Match')
                            : row.status === 'short'
                              ? t('pod.short', 'Short')
                              : t('pod.over', 'Over')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Driver notes */}
            {pod.driverNotes && (
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
                <h4 className="text-sm font-semibold mb-2">{t('pod.driverNotes', 'Driver Notes')}</h4>
                <p className="text-sm text-black/70 dark:text-white/70">{pod.driverNotes}</p>
              </div>
            )}

            {/* Checklist */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
              <PODChecklist checklist={checklist} onChange={setChecklist} />
            </div>

            {/* Actions */}
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
              <PODActions
                deliveryId={pod.deliveryId}
                checklist={checklist}
                onActionComplete={onActionComplete}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
