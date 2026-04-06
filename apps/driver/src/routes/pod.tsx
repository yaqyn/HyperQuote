import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeliveryStore } from '../stores/delivery'
import { useRouteStore } from '../stores/route'
import { db } from '../lib/powersync'
import { getCurrentPosition } from '../lib/geofence'
import { queuePhotoUpload } from '../lib/upload-queue'
import { PODPhotos, type PhotoEntry } from '../components/pod/PODPhotos'
import { SignaturePad, type SignaturePadRef } from '../components/pod/SignaturePad'
import { ConditionSelect } from '../components/pod/ConditionSelect'
import { SwipeToComplete } from '../components/pod/SwipeToComplete'

export const Route = createFileRoute('/pod/$deliveryId')({
  component: PODScreen,
})

function PODScreen() {
  const { t } = useTranslation('driver')
  const navigate = useNavigate()
  const { deliveryId } = useParams({ from: '/pod/$deliveryId' })

  // Delivery store for items
  const items = useDeliveryStore((s) => s.items)
  const activeDelivery = useDeliveryStore((s) => s.activeDelivery)
  const loadDelivery = useDeliveryStore((s) => s.loadDelivery)

  // Route store for stop status
  const updateStopStatus = useRouteStore((s) => s.updateStopStatus)
  const stops = useRouteStore((s) => s.stops)

  // POD state
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [condition, setCondition] = useState<'good' | 'damaged' | ''>('')
  const [conditionNotes, setConditionNotes] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signerRole, setSignerRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [hasSignature, setHasSignature] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  const signaturePadRef = useRef<SignaturePadRef>(null)

  // Load delivery data if not already loaded
  useEffect(() => {
    if (!activeDelivery || activeDelivery.id !== deliveryId) {
      loadDelivery(deliveryId)
    }
  }, [deliveryId, activeDelivery, loadDelivery])

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Prerequisites check for swipe-to-complete
  const canComplete =
    photos.length >= 1 &&
    hasSignature &&
    signerName.trim().length > 0 &&
    signerRole.length > 0 &&
    (signerRole !== 'other' || customRole.trim().length > 0) &&
    condition !== ''

  const handleComplete = useCallback(async () => {
    const sigData = signaturePadRef.current?.getSignatureData()
    if (!sigData) return

    const now = new Date().toISOString()
    const podId = crypto.randomUUID()

    // Get GPS
    let lat = 0
    let lng = 0
    let accuracy = 0
    try {
      const pos = await getCurrentPosition()
      lat = pos.lat
      lng = pos.lng
      accuracy = pos.accuracy
    } catch {
      // GPS unavailable — still allow POD
    }

    const conditionStatus = condition === 'good' ? 'good' : 'damaged'
    const photoUris = photos.map((p) => p.uri)

    // Write proof_of_delivery to PowerSync
    await db.execute(
      `INSERT INTO proof_of_delivery (id, delivery_id, signer_name, signer_role, signature_url, photos, gps_lat, gps_lng, gps_accuracy_meters, condition_notes, condition_status, offline_captured, captured_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        podId,
        deliveryId,
        sigData.signerName,
        sigData.signerRole,
        sigData.signatureDataUrl,
        JSON.stringify(photoUris),
        lat,
        lng,
        accuracy,
        condition === 'damaged' ? conditionNotes : '',
        conditionStatus,
        isOffline ? 'true' : 'false',
        now,
        now,
      ]
    )

    // Queue photos for background upload
    for (const photo of photos) {
      await queuePhotoUpload(photo.uri, {
        type: 'pod',
        entityId: podId,
      })
    }

    // Queue signature for upload (data URL stored as file URI)
    await queuePhotoUpload(sigData.signatureDataUrl, {
      type: 'pod',
      entityId: podId,
    })

    // Update delivery status to 'delivered'
    await db.execute(
      "UPDATE deliveries SET status = 'delivered', pod_signature_url = ?, pod_photos = ? WHERE id = ?",
      [sigData.signatureDataUrl, JSON.stringify(photoUris), deliveryId]
    )

    // Find the stop for this delivery and mark completed
    const stop = stops.find((s) => s.delivery_id === deliveryId)
    if (stop) {
      await updateStopStatus(stop.id, 'completed')
    }

    // Navigate back to route overview
    navigate({ to: '/route-overview' })
  }, [
    photos,
    condition,
    conditionNotes,
    deliveryId,
    isOffline,
    stops,
    updateStopStatus,
    navigate,
  ])

  // Quantity confirmation items with shortage detection
  const hasShortages = items.some(
    (item) => item.quantity_delivered < item.quantity_expected
  )

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <header className="bg-[var(--bg-primary)] px-4 py-4 border-b border-[var(--border-color)]">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          {t('pod.title')}
        </h1>
      </header>

      {/* Offline banner */}
      {isOffline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <p className="text-sm text-amber-800">
            {t('pod.savedOffline')} — {t('pod.willSync')}
          </p>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Section A: Photos */}
        <section className="rounded-2xl bg-[var(--bg-primary)] p-4 shadow-sm">
          <PODPhotos photos={photos} onPhotosChange={setPhotos} />
        </section>

        {/* Section B: Quantity Confirmation */}
        <section className="rounded-2xl bg-[var(--bg-primary)] p-4 shadow-sm">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
            {t('pod.quantityConfirmation')}
          </h3>
          <div className="space-y-2">
            {items.map((item) => {
              const isShortage = item.quantity_delivered < item.quantity_expected
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                    isShortage
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {item.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-mono text-sm font-medium ${
                        isShortage
                          ? 'text-red-600'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {item.quantity_delivered}
                    </span>
                    {isShortage && (
                      <span className="text-xs text-red-500">
                        ({t('pod.shortage')})
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Section C: Condition */}
        <section className="rounded-2xl bg-[var(--bg-primary)] p-4 shadow-sm">
          <ConditionSelect
            condition={condition}
            onConditionChange={setCondition}
            notes={conditionNotes}
            onNotesChange={setConditionNotes}
          />
        </section>

        {/* Section D: Signature */}
        <section className="rounded-2xl bg-[var(--bg-primary)] p-4 shadow-sm">
          <SignaturePad
            ref={signaturePadRef}
            signerName={signerName}
            onSignerNameChange={setSignerName}
            signerRole={signerRole}
            onSignerRoleChange={setSignerRole}
            customRole={customRole}
            onCustomRoleChange={setCustomRole}
            onSignatureChange={setHasSignature}
          />
        </section>
      </div>

      {/* Footer: Swipe to complete */}
      <div className="bg-[var(--bg-primary)] px-4 py-4 border-t border-[var(--border-color)] safe-area-bottom">
        {!canComplete && (
          <p className="text-center text-xs text-[var(--text-secondary)] mb-2">
            {t('pod.requiredField')}
          </p>
        )}
        <SwipeToComplete
          onComplete={handleComplete}
          isDisabled={!canComplete}
        />
      </div>
    </div>
  )
}
